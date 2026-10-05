'use client';

import { useMemo } from 'react';
import { generatePowerLawData, getCurrentFairPrice } from '@/lib/powerLaw';
import { mergeDataForChart, getLatestPrice, mergeHistoricalData } from '@/lib/dataTransformers';
import { dateKey } from '@/lib/dates';
import { isQuoteStale } from '@/lib/priceCache';
import type { DateRange, UseChartDataReturn, UseBitcoinPriceReturn } from '@/types';

interface UseChartDataParams {
  exponent: number;
  coefficient: number;
  dateRange: DateRange;
  prices: UseBitcoinPriceReturn;
}

export function useChartData({ exponent, coefficient, dateRange, prices }: UseChartDataParams): UseChartDataReturn {
  const { data, quote, now, isLoading, error, isUsingFallback, refetch } = prices;
  const chartData = useMemo(() => {
    const observations = quote ? mergeHistoricalData(data, [{ date: dateKey(new Date(quote.observedAt)), price: quote.price }]) : data;
    const model = generatePowerLawData(dateRange.start, dateRange.end, coefficient, exponent);
    return mergeDataForChart(model, observations, coefficient, exponent, dateRange, now ? new Date(now) : new Date());
  }, [dateRange, coefficient, exponent, data, quote, now]);
  const latest = getLatestPrice(data);
  const quoteIsLatest = quote && (!latest || dateKey(new Date(quote.observedAt)) >= latest.date);
  const currentPrice = quoteIsLatest ? quote.price : latest?.price ?? null;
  const observedAt = quoteIsLatest ? quote.observedAt : latest ? `${latest.date}T00:00:00Z` : null;
  const isStale = !quoteIsLatest || isQuoteStale(quote, now);
  const currentFairPrice = getCurrentFairPrice(coefficient, exponent);
  return { chartData, isLoading, error, currentPrice, currentFairPrice, observedAt, isStale, isUsingFallback, refetch };
}
