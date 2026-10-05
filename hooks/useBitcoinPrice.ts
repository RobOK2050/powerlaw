'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { mergeHistoricalData } from '@/lib/dataTransformers';
import { readCache, saveCache, refreshPrices, REFRESH_MS, type PriceCache } from '@/lib/priceCache';
import type { UseBitcoinPriceReturn } from '@/types';
import staticData from '@/data/bitcoin-historical.json';

const initialCache: PriceCache = { version: 1, prices: staticData.prices, quote: null };

export function useBitcoinPrice(): UseBitcoinPriceReturn {
  const [state, setState] = useState({ cache: initialCache, isLoading: true, error: null as string | null, isUsingFallback: true, now: 0 });
  const refreshRef = useRef<() => void>(() => {});
  const refetch = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    const controller = new AbortController();
    let cache = initialCache;
    let running = false;
    const refresh = async () => {
      if (running || controller.signal.aborted) return;
      running = true;
      const now = new Date();
      // Defers initial state updates until after the effect, including cached data.
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setState((s) => ({ ...s, cache, isLoading: true, now: now.getTime() }));
      try {
        const result = await refreshPrices(cache, controller.signal, now);
        if (controller.signal.aborted) return;
        cache = result.cache;
        try { saveCache(window.localStorage, cache); } catch { /* Storage may be unavailable. */ }
        setState({ ...result, isLoading: false, now: Date.now() });
      } catch {
        if (!controller.signal.aborted) setState((s) => ({ ...s, isLoading: false, isUsingFallback: true,
          error: 'Prices could not be refreshed. Saved observations are still shown.', now: Date.now() }));
      } finally { running = false; }
    };
    try {
      const saved = readCache(window.localStorage);
      if (saved) cache = { ...saved, prices: mergeHistoricalData(initialCache.prices, saved.prices) };
    } catch { /* Use the bundled snapshot when browser storage is blocked. */ }
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, REFRESH_MS);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      refreshRef.current = () => {};
    };
  }, []);

  return { data: state.cache.prices, quote: state.cache.quote, isLoading: state.isLoading, error: state.error,
    isUsingFallback: state.isUsingFallback, refetch, now: state.now };
}
