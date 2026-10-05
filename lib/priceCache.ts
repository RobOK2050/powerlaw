import { DAY_MS, dateKey, parseDate, utcDay } from './dates';
import { mergeHistoricalData } from './dataTransformers';
import type { PricePoint, PriceQuote } from '@/types';

export const CACHE_KEY = 'powerlaw-prices-v1';
export const REFRESH_MS = 5 * 60_000;
export const STALE_MS = 15 * 60_000;
export const BACKFILL_DAYS = 364;
export interface PriceCache { version: 1; prices: PricePoint[]; quote: PriceQuote | null }

export function validPrices(value: unknown): value is PricePoint[] {
  return Array.isArray(value) && value.length <= 40_000 && value.every((p) =>
    p && typeof p.date === 'string' && parseDate(p.date) && typeof p.price === 'number' && Number.isFinite(p.price) && p.price > 0);
}

export function validQuote(value: unknown): value is PriceQuote {
  const q = value as PriceQuote | null;
  return !!q && typeof q.price === 'number' && Number.isFinite(q.price) && q.price > 0 &&
    typeof q.observedAt === 'string' && Number.isFinite(Date.parse(q.observedAt));
}

export function readCache(storage: Pick<Storage, 'getItem'>, now = new Date()): PriceCache | null {
  try {
    const cache = JSON.parse(storage.getItem(CACHE_KEY) ?? 'null');
    if (cache?.version !== 1 || !validPrices(cache.prices) || (cache.quote !== null && !validQuote(cache.quote))) return null;
    return { version: 1, prices: cache.prices.filter((p: PricePoint) => p.date < dateKey(now)),
      quote: cache.quote && Date.parse(cache.quote.observedAt) <= now.getTime() + 60_000 ? cache.quote : null };
  } catch { return null; }
}

export function saveCache(storage: Pick<Storage, 'setItem'>, cache: PriceCache): void {
  try { storage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* Private mode or a full cache must not block prices. */ }
}

export function backfillStart(prices: PricePoint[], now = new Date()): string {
  const today = utcDay(now).getTime();
  const available = new Set(prices.map((p) => p.date));
  for (let day = today - BACKFILL_DAYS * DAY_MS; day < today; day += DAY_MS) {
    const key = dateKey(new Date(day));
    if (!available.has(key)) return key;
  }
  // Refresh yesterday even if present: the provider may revise its daily sample.
  return dateKey(new Date(today - DAY_MS));
}

export function isQuoteStale(quote: PriceQuote | null, now = Date.now()): boolean {
  return !quote || now - Date.parse(quote.observedAt) > STALE_MS || Date.parse(quote.observedAt) > now + 60_000;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Price refresh failed.');
  return data;
}

export async function refreshPrices(cache: PriceCache, signal: AbortSignal, now = new Date()) {
  const from = backfillStart(cache.prices, now);
  const to = dateKey(now);
  const [history, current] = await Promise.allSettled([
    fetchJson(`/api/bitcoin-price?from=${from}&to=${to}`, signal).then((data) => {
      const prices = (data as { prices?: unknown } | null)?.prices;
      if (!validPrices(prices) || prices.length === 0) throw new Error('No valid daily prices were returned.');
      const completed = prices.filter((p) => p.date >= from && p.date < to);
      if (completed.length === 0) throw new Error('No completed daily prices were returned.');
      return completed;
    }),
    fetchJson('/api/bitcoin-price/current', signal).then((data) => {
      const quote = (data as { quote?: unknown } | null)?.quote;
      if (!validQuote(quote) || Date.parse(quote.observedAt) > now.getTime() + 60_000) throw new Error('No valid current price was returned.');
      return quote;
    }),
  ]);
  const errors: string[] = [];
  if (history.status === 'rejected') errors.push('Daily history could not be updated.');
  if (current.status === 'rejected') errors.push('The latest quote could not be updated.');
  return {
    cache: { version: 1 as const,
      prices: history.status === 'fulfilled' ? mergeHistoricalData(cache.prices, history.value) : cache.prices,
      quote: current.status === 'fulfilled' ? current.value : cache.quote },
    error: errors.length ? `${errors.join(' ')} Saved observations are still shown.` : null,
    isUsingFallback: current.status === 'rejected',
  };
}
