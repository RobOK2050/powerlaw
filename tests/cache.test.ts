import { afterEach, describe, expect, it, vi } from 'vitest';
import { BACKFILL_DAYS, backfillStart, CACHE_KEY, isQuoteStale, readCache, refreshPrices, saveCache, type PriceCache } from '@/lib/priceCache';
import { DAY_MS, dateKey, utcDay } from '@/lib/dates';

const now = new Date('2026-10-05T16:00:00Z');
const complete = Array.from({ length: BACKFILL_DAYS }, (_, i) => ({ date: dateKey(new Date(utcDay(now).getTime() - (BACKFILL_DAYS - i) * DAY_MS)), price: 100 }));
const cache: PriceCache = { version: 1, prices: complete, quote: { price: 100, observedAt: '2026-10-05T15:59:00Z' } };
afterEach(() => vi.unstubAllGlobals());

describe('persistent price history', () => {
  it('starts from the first interior gap, not just the newest observation', () => {
    const withHole = complete.filter((_, i) => i !== 100);
    expect(backfillStart(withHole, now)).toBe(complete[100].date);
    expect(backfillStart(complete, now)).toBe('2026-10-04');
    expect(backfillStart([], now)).toBe(complete[0].date);
  });
  it('recovers dates between visits from a stored snapshot', async () => {
    const saved = { ...cache, prices: complete.filter((p) => p.date < '2026-10-01') };
    const storage = new Map<string, string>();
    saveCache({ setItem: (key, value) => storage.set(key, value) }, saved);
    const restored = readCache({ getItem: (key) => storage.get(key) ?? null }, now)!;
    const fetcher = vi.fn(async (url: string) => Response.json(url.includes('/current') ? { quote: cache.quote } : { prices: complete.filter((p) => p.date >= '2026-10-01') }));
    vi.stubGlobal('fetch', fetcher);
    const result = await refreshPrices(restored, new AbortController().signal, now);
    expect(result.cache.prices).toHaveLength(BACKFILL_DAYS);
    expect(result.error).toBeNull();
    expect(fetcher).toHaveBeenCalledWith('/api/bitcoin-price?from=2026-10-01&to=2026-10-05', expect.anything());
  });
  it('preserves saved observations and reports both failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Rate limited"}', { status: 429 })));
    const result = await refreshPrices(cache, new AbortController().signal, now);
    expect(result.cache).toEqual(cache);
    expect(result.isUsingFallback).toBe(true);
    expect(result.error).toContain('Daily history');
    expect(result.error).toContain('latest quote');
  });
  it('accepts a fresh quote independently of a failed backfill', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/current') ? Response.json({ quote: cache.quote }) : new Response('{}', { status: 500 })));
    const result = await refreshPrices({ ...cache, quote: null }, new AbortController().signal, now);
    expect(result.cache.quote).toEqual(cache.quote);
    expect(result.isUsingFallback).toBe(false);
    expect(result.error).toContain('Daily history');
  });
  it('marks old prices stale even when a request technically succeeded', () => {
    expect(isQuoteStale(cache.quote, now.getTime())).toBe(false);
    expect(isQuoteStale({ price: 100, observedAt: '2025-12-27' }, now.getTime())).toBe(true);
    expect(isQuoteStale(null, now.getTime())).toBe(true);
  });
  it('handles unavailable, malformed, and corrupt browser storage', () => {
    expect(readCache({ getItem: () => '{bad' }, now)).toBeNull();
    expect(readCache({ getItem: () => { throw new Error(); } }, now)).toBeNull();
    expect(readCache({ getItem: () => JSON.stringify({ ...cache, prices: [{ date: 'bad', price: 1 }] }) }, now)).toBeNull();
    expect(() => saveCache({ setItem: () => { throw new Error('quota'); } }, cache)).not.toThrow();
    const getter = vi.fn(() => JSON.stringify(cache));
    expect(readCache({ getItem: getter }, now)?.prices).toHaveLength(BACKFILL_DAYS);
    expect(getter).toHaveBeenCalledWith(CACHE_KEY);
  });
});
