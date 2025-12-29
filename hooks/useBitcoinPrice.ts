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

  const fetchCurrentPrice = useCallback(async (): Promise<HistoricalPricePoint | null> => {
    try {
      const response = await fetch('/api/bitcoin-price/current');
      if (!response.ok) return null;
      const result = await response.json();
      if (result.error || !result.price) return null;
      return {
        date: result.date,
        price: result.price,
        daysSinceGenesis: calculateDaysSinceGenesis(result.date),
      };
    } catch {
      return null;
    }
  }, []);

  const loadDataWithCurrentPrice = useCallback(async () => {
    // Start with static data
    const staticTransformed = transformRawPrices(staticData.prices);

    // Fetch today's current price
    const currentPrice = await fetchCurrentPrice();

    // Merge current price if available
    if (currentPrice) {
      const merged = mergeHistoricalData(staticTransformed, [currentPrice]);
      setData(merged);
      setIsUsingFallback(false);
    } else {
      setData(staticTransformed);
      setIsUsingFallback(true);
    }

    setIsLoading(false);
  }, [fetchCurrentPrice]);

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
