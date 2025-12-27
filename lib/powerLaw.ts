import { differenceInDays, addDays, format } from 'date-fns';
import {
  GENESIS_BLOCK,
  DEFAULT_COEFFICIENT,
  DEFAULT_EXPONENT,
  SUPPORT_MULTIPLIER,
  RESISTANCE_MULTIPLIER,
  INTERVAL_THRESHOLDS,
} from './constants';
import type { PowerLawDataPoint, ChartDataPoint } from '@/types';

export function daysSinceGenesis(date: Date): number {
  return Math.max(0, differenceInDays(date, GENESIS_BLOCK));
}

export function calculatePowerLawPrice(
  days: number,
  coefficient: number = DEFAULT_COEFFICIENT,
  exponent: number = DEFAULT_EXPONENT
): number {
  if (days <= 0) return 0;
  return coefficient * Math.pow(days, exponent);
}

export function calculateSupportPrice(fairPrice: number, multiplier: number = SUPPORT_MULTIPLIER): number {
  return fairPrice * multiplier;
}

export function calculateResistancePrice(fairPrice: number, multiplier: number = RESISTANCE_MULTIPLIER): number {
  return fairPrice * multiplier;
}

export function calculateOptimalInterval(startDate: Date, endDate: Date): number {
  const daysDiff = differenceInDays(endDate, startDate);
  if (daysDiff > INTERVAL_THRESHOLDS.MONTHLY) return 30;
  if (daysDiff > INTERVAL_THRESHOLDS.BIWEEKLY) return 14;
  if (daysDiff > INTERVAL_THRESHOLDS.WEEKLY) return 7;
  if (daysDiff > INTERVAL_THRESHOLDS.EVERY_3_DAYS) return 3;
  return 1;
}

export function generatePowerLawData(
  startDate: Date,
  endDate: Date,
  coefficient: number = DEFAULT_COEFFICIENT,
  exponent: number = DEFAULT_EXPONENT,
  intervalDays?: number
): PowerLawDataPoint[] {
  const data: PowerLawDataPoint[] = [];
  const interval = intervalDays ?? calculateOptimalInterval(startDate, endDate);
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const days = daysSinceGenesis(currentDate);
    if (days > 0) {
      const fairPrice = calculatePowerLawPrice(days, coefficient, exponent);
      data.push({
        date: new Date(currentDate),
        timestamp: currentDate.getTime(),
        days,
        fairPrice,
        supportPrice: calculateSupportPrice(fairPrice),
        resistancePrice: calculateResistancePrice(fairPrice),
      });
    }
    currentDate = addDays(currentDate, interval);
  }

  // Include end date
  if (data.length > 0 && data[data.length - 1].date < endDate) {
    const days = daysSinceGenesis(endDate);
    if (days > 0) {
      const fairPrice = calculatePowerLawPrice(days, coefficient, exponent);
      data.push({
        date: new Date(endDate),
        timestamp: endDate.getTime(),
        days,
        fairPrice,
        supportPrice: calculateSupportPrice(fairPrice),
        resistancePrice: calculateResistancePrice(fairPrice),
      });
    }
  }

  return data;
}

export function toChartData(
  powerLawData: PowerLawDataPoint[],
  historicalPrices: Map<string, number> = new Map()
): ChartDataPoint[] {
  return powerLawData.map((point) => {
    const dateStr = format(point.date, 'yyyy-MM-dd');
    const actualPrice = historicalPrices.get(dateStr) ?? null;
    return {
      date: dateStr,
      timestamp: point.timestamp,
      days: point.days,
      fairPrice: point.fairPrice,
      supportPrice: point.supportPrice,
      resistancePrice: point.resistancePrice,
      bandBase: point.supportPrice,
      bandWidth: point.resistancePrice - point.supportPrice,
      actualPrice,
    };
  });
}

export function formatPrice(price: number): string {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toExponential(2)}`;
}

export function getCurrentFairPrice(
  coefficient: number = DEFAULT_COEFFICIENT,
  exponent: number = DEFAULT_EXPONENT
): number {
  const days = daysSinceGenesis(new Date());
  return calculatePowerLawPrice(days, coefficient, exponent);
}

export function calculateDeviation(actualPrice: number, fairPrice: number): number {
  if (fairPrice === 0) return 0;
  return ((actualPrice - fairPrice) / fairPrice) * 100;
}
