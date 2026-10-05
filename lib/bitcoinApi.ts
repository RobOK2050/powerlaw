import { DAY_MS, dateKey, parseDate, utcDay } from './dates';
import type { PricePoint, PriceQuote } from '@/types';

export const HISTORY_DAYS = 364; // Stay inside the free API's rolling 365-day limit.
export const API_TIMEOUT_MS = 10_000;
const API = 'https://api.coingecko.com/api/v3';

export class PriceApiError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

export async function fetchCoinGecko(path: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(API_TIMEOUT_MS);
  try {
    const key = process.env.COINGECKO_API_KEY;
    const response = await fetch(`${API}${path}`, {
      headers: { Accept: 'application/json', ...(key ? { 'x-cg-demo-api-key': key } : {}) },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      if (response.status === 429) throw new PriceApiError('CoinGecko rate limit reached. Please retry shortly.', 429);
      throw new PriceApiError('The price provider is unavailable.');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof PriceApiError) throw error;
    if (timeout.aborted) throw new PriceApiError('The price provider timed out.', 504);
    throw new PriceApiError('Could not retrieve price data.');
  }
}

export function historyBounds(from: string | null, to: string | null, now = new Date()) {
  const start = from ? parseDate(from) : null;
  const end = to ? parseDate(to) : null;
  const today = utcDay(now);
  const earliest = new Date(today.getTime() - HISTORY_DAYS * DAY_MS);
  if (!start || !end || start > end || start < earliest || end > today) {
    throw new PriceApiError(`Use dates from ${dateKey(earliest)} to ${dateKey(today)}, with from no later than to.`, 400);
  }
  return { start, end, days: Math.max(1, Math.ceil((today.getTime() - start.getTime()) / DAY_MS) + 1) };
}

export function parseDailyPrices(data: unknown, start: Date, end: Date, now = new Date()): PricePoint[] {
  const rows = (data as { prices?: unknown } | null)?.prices;
  if (!Array.isArray(rows) || rows.length === 0) throw new PriceApiError('The provider returned no daily prices.');
  const byDate = new Map<string, { timestamp: number; price: number }>();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2 || !Number.isFinite(row[0]) || !Number.isFinite(row[1]) || row[1] <= 0) {
      throw new PriceApiError('The provider returned invalid daily prices.');
    }
    const timestamp = row[0] as number;
    if (timestamp < 0 || timestamp > now.getTime() + 60_000) throw new PriceApiError('The provider returned an invalid observation time.');
    const date = dateKey(new Date(timestamp));
    // Current-day intraday samples are quotes, not completed daily observations.
    if (date < dateKey(start) || date > dateKey(end) || date >= dateKey(now)) continue;
    const previous = byDate.get(date);
    if (!previous || timestamp > previous.timestamp) byDate.set(date, { timestamp, price: row[1] });
  }
  if (byDate.size === 0) throw new PriceApiError('The provider returned no completed daily prices for this range.');
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, point]) => ({ date, price: point.price }));
}

export function parseQuote(data: unknown, now = new Date()): PriceQuote {
  const value = (data as { bitcoin?: { usd?: unknown; last_updated_at?: unknown } } | null)?.bitcoin;
  const price = value?.usd;
  const timestamp = value?.last_updated_at;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp * 1000 > now.getTime() + 60_000) {
    throw new PriceApiError('The provider returned an invalid price or observation time.');
  }
  return { price, observedAt: new Date(timestamp * 1000).toISOString() };
}

export function apiErrorResponse(error: unknown): Response {
  const failure = error instanceof PriceApiError ? error : new PriceApiError('Could not retrieve price data.');
  return Response.json({ error: failure.message }, {
    status: failure.status,
    headers: { 'Cache-Control': 'no-store', ...(failure.status === 429 ? { 'Retry-After': '60' } : {}) },
  });
}
