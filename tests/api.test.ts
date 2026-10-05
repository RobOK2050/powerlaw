import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as historyGET } from '@/app/api/bitcoin-price/route';
import { GET as currentGET } from '@/app/api/bitcoin-price/current/route';
import { API_TIMEOUT_MS, historyBounds, parseQuote, parseDailyPrices } from '@/lib/bitcoinApi';

const now = new Date('2026-10-05T16:00:00Z');
const request = (query = 'from=2026-10-01&to=2026-10-05') => new Request(`http://localhost/api/bitcoin-price?${query}`);

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('price API routes', () => {
  it('requests an extra lookback day so the first requested UTC midnight is covered', () => {
    expect(historyBounds('2025-10-06', '2026-10-05', now).days).toBe(365);
    expect(historyBounds('2026-10-04', '2026-10-05', now).days).toBe(2);
  });
  it.each(['', 'from=bad&to=bad', 'from=2026-10-05&to=2026-10-01', 'from=2025-01-01&to=2026-10-01', 'from=2026-10-01&to=2030-01-01', 'from=2026-02-30&to=2026-10-01'])('rejects invalid ranges before contacting the provider: %s', async (query) => {
    expect((await historyGET(request(query))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requests daily prices and omits unfinished current-day samples', async () => {
    vi.stubEnv('COINGECKO_API_KEY', 'test-only');
    vi.mocked(fetch).mockResolvedValue(Response.json({ prices: [[Date.parse('2026-10-04'), 90_000], [now.getTime(), 91_000]] }));
    const response = await historyGET(request());
    expect(response.status).toBe(200);
    expect((await response.json()).prices).toEqual([{ date: '2026-10-04', price: 90_000 }]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('interval=daily'), expect.objectContaining({ signal: expect.any(AbortSignal), headers: expect.objectContaining({ 'x-cg-demo-api-key': 'test-only' }) }));
  });
  it('keeps the provider observation timestamp rather than stamping old data with now', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ bitcoin: { usd: 90_000, last_updated_at: Date.parse('2026-10-04T10:00:00Z') / 1000 } }));
    const response = await currentGET(request());
    expect((await response.json()).quote.observedAt).toBe('2026-10-04T10:00:00.000Z');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('include_last_updated_at=true'), expect.anything());
  });
  it.each([429, 401, 500])('reports upstream HTTP %s as an error', async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status }));
    const response = await currentGET(request());
    expect(response.status).toBe(status === 429 ? 429 : 502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).error).toBeTruthy();
  });
  it.each([{ prices: [] }, { prices: [['not a timestamp', 100]] }, { prices: [[Date.parse('2026-10-04'), -1]] }])('rejects empty or malformed history', async (data) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(data));
    expect((await historyGET(request())).status).toBe(502);
  });
  it('returns 504 on timeout', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('Timeout', 'TimeoutError'));
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    vi.mocked(fetch).mockRejectedValue(controller.signal.reason);
    expect((await currentGET(request())).status).toBe(504);
    expect(timeout).toHaveBeenCalledWith(API_TIMEOUT_MS);
  });
  it('rejects missing, non-finite or future quote timestamps', () => {
    expect(() => parseQuote({ bitcoin: { usd: 1 } }, now)).toThrow();
    expect(() => parseQuote({ bitcoin: { usd: 1, last_updated_at: now.getTime() } }, now)).toThrow();
    expect(() => parseQuote({ bitcoin: { usd: Infinity, last_updated_at: 1 } }, now)).toThrow();
  });
  it('deduplicates daily rows in timestamp order even if the response is unsorted', () => {
    const rows = [[Date.parse('2026-10-04T01:00:00Z'), 2], [Date.parse('2026-10-04'), 1]];
    expect(parseDailyPrices({ prices: rows }, new Date('2026-10-01'), now, now)).toEqual([{ date: '2026-10-04', price: 2 }]);
  });
});
