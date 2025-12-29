'use client';

import { useState, useEffect, useCallback } from 'react';
import { transformRawPrices } from '@/lib/dataTransformers';
import { GENESIS_BLOCK } from '@/lib/constants';
import type { HistoricalPricePoint, UseBitcoinPriceReturn } from '@/types';
import staticData from '@/data/bitcoin-historical.json';

function calculateDaysSinceGenesis(dateStr: string): number {
  const date = new Date(dateStr);
  const diffMs = date.getTime() - GENESIS_BLOCK.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function useBitcoinPrice(): UseBitcoinPriceReturn {
  const [data, setData] = useState<HistoricalPricePoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const fetchRecentPrices = useCallback(async (): Promise<HistoricalPricePoint[]> => {
    try {
      const response = await fetch('/api/bitcoin-price/current');
      if (!response.ok) return [];
      const result = await response.json();
      if (result.error || !result.prices || result.prices.length === 0) return [];
      return result.prices.map((p: { date: string; price: number }) => ({
        date: p.date,
        price: p.price,
        daysSinceGenesis: calculateDaysSinceGenesis(p.date),
      }));
    } catch {
      return [];
    }
  }, []);

  const loadDataWithCurrentPrice = useCallback(async () => {
    // Start with static data
    const staticTransformed = transformRawPrices(staticData.prices);

    // Fetch last 30 days of daily prices
    const recentPrices = await fetchRecentPrices();

    // Merge recent prices if available
    if (recentPrices.length > 0) {
      const merged = mergeHistoricalData(staticTransformed, recentPrices);
      setData(merged);
      setIsUsingFallback(false);
    } else {
      setData(staticTransformed);
      setIsUsingFallback(true);
    }

    setIsLoading(false);
  }, [fetchRecentPrices]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    loadDataWithCurrentPrice();
  }, [loadDataWithCurrentPrice]);

  useEffect(() => {
    loadDataWithCurrentPrice();
  }, [loadDataWithCurrentPrice]);

  return { data, isLoading, error, isUsingFallback, refetch };
}

function mergeHistoricalData(staticData: HistoricalPricePoint[], liveData: HistoricalPricePoint[]): HistoricalPricePoint[] {
  const dateMap = new Map<string, HistoricalPricePoint>();
  staticData.forEach((point) => dateMap.set(point.date, point));
  liveData.forEach((point) => dateMap.set(point.date, point));
  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
