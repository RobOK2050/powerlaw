'use client';

import { useMemo } from 'react';
import { useBitcoinPrice } from './useBitcoinPrice';
import { generatePowerLawData, getCurrentFairPrice } from '@/lib/powerLaw';
import { mergeDataForChart, getLatestPrice, sampleDataPoints } from '@/lib/dataTransformers';
import { DEFAULT_COEFFICIENT, DEFAULT_EXPONENT } from '@/lib/constants';
import type { DateRange, UseChartDataReturn } from '@/types';

const MAX_CHART_POINTS = 800;

interface UseChartDataParams {
  exponent: number;
  coefficient: number;
  dateRange: DateRange;
}

export function useChartData({ exponent = DEFAULT_EXPONENT, coefficient = DEFAULT_COEFFICIENT, dateRange }: UseChartDataParams): UseChartDataReturn {
  const { data: historicalPrices, isLoading, error } = useBitcoinPrice();

  const chartData = useMemo(() => {
    const powerLawData = generatePowerLawData(dateRange.start, dateRange.end, coefficient, exponent);
    const mergedData = mergeDataForChart(powerLawData, historicalPrices ?? []);
    return sampleDataPoints(mergedData, MAX_CHART_POINTS);
  }, [dateRange, coefficient, exponent, historicalPrices]);

  const currentPrice = useMemo(() => {
    if (!historicalPrices) return null;
    return getLatestPrice(historicalPrices);
  }, [historicalPrices]);

  const currentFairPrice = useMemo(() => getCurrentFairPrice(coefficient, exponent), [coefficient, exponent]);

  return { chartData, isLoading, error, currentPrice, currentFairPrice };
}
