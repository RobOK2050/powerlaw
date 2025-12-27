'use client';

import { useState, useEffect, useCallback } from 'react';
import { transformRawPrices } from '@/lib/dataTransformers';
import type { HistoricalPricePoint, UseBitcoinPriceReturn } from '@/types';
import staticData from '@/data/bitcoin-historical.json';

export function useBitcoinPrice(): UseBitcoinPriceReturn {
  const [data, setData] = useState<HistoricalPricePoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const loadStaticData = useCallback(() => {
    const transformed = transformRawPrices(staticData.prices);
    setData(transformed);
    setIsUsingFallback(true);
    setIsLoading(false);
  }, []);

  const fetchLiveData = useCallback(async () => {
    try {
      const fromDate = '2010-07-01';
      const toDate = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/bitcoin-price?from=${fromDate}&to=${toDate}`);
      if (!response.ok) throw new Error('API request failed');
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      const transformed = transformRawPrices(result.prices);
      const staticTransformed = transformRawPrices(staticData.prices);
      const merged = mergeHistoricalData(staticTransformed, transformed);
      setData(merged);
      setIsUsingFallback(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      loadStaticData();
    } finally {
      setIsLoading(false);
    }
  }, [loadStaticData]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchLiveData();
  }, [fetchLiveData]);

  useEffect(() => {
    loadStaticData();
    fetchLiveData();
  }, [loadStaticData, fetchLiveData]);

  return { data, isLoading, error, isUsingFallback, refetch };
}

function mergeHistoricalData(staticData: HistoricalPricePoint[], liveData: HistoricalPricePoint[]): HistoricalPricePoint[] {
  const dateMap = new Map<string, HistoricalPricePoint>();
  staticData.forEach((point) => dateMap.set(point.date, point));
  liveData.forEach((point) => dateMap.set(point.date, point));
  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
