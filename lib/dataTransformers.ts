import { format, parseISO, subDays, isAfter, startOfDay } from 'date-fns';
import { daysSinceGenesis, calculatePowerLawPrice, calculateSupportPrice, calculateResistancePrice } from './powerLaw';
import type { HistoricalPricePoint, ChartDataPoint, PowerLawDataPoint } from '@/types';

export function transformRawPrices(prices: Array<{ date: string; price: number }>): HistoricalPricePoint[] {
  return prices.map((p) => ({
    date: p.date,
    price: p.price,
    daysSinceGenesis: daysSinceGenesis(parseISO(p.date)),
  }));
}

export function createPriceMap(prices: HistoricalPricePoint[]): Map<string, number> {
  const map = new Map<string, number>();
  prices.forEach((p) => map.set(p.date, p.price));
  return map;
}

export function mergeDataForChart(
  powerLawData: PowerLawDataPoint[],
  historicalPrices: HistoricalPricePoint[],
  coefficient?: number,
  exponent?: number
): ChartDataPoint[] {
  const priceMap = createPriceMap(historicalPrices);
  const today = startOfDay(new Date());
  const thirtyDaysAgo = subDays(today, 30);

  // Build base chart data from power law data (excludes last 30 days)
  const baseData: ChartDataPoint[] = powerLawData
    .filter((point) => !isAfter(startOfDay(point.date), thirtyDaysAgo))
    .map((point) => {
      const dateStr = format(point.date, 'yyyy-MM-dd');
      const actualPrice = priceMap.get(dateStr) ?? findNearestPrice(dateStr, priceMap);
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

  // Add daily data points for last 30 days
  const dailyData: ChartDataPoint[] = [];
  const coef = coefficient ?? 1.0117e-17;
  const exp = exponent ?? 5.82;

  for (let i = 30; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const days = daysSinceGenesis(date);
    const fairPrice = calculatePowerLawPrice(days, coef, exp);
    const actualPrice = priceMap.get(dateStr) ?? null;

    // Only add if we have actual price data for this day
    if (actualPrice !== null) {
      dailyData.push({
        date: dateStr,
        timestamp: date.getTime(),
        days,
        fairPrice,
        supportPrice: calculateSupportPrice(fairPrice),
        resistancePrice: calculateResistancePrice(fairPrice),
        bandBase: calculateSupportPrice(fairPrice),
        bandWidth: calculateResistancePrice(fairPrice) - calculateSupportPrice(fairPrice),
        actualPrice,
      });
    }
  }

  // Add future data points (after today)
  const futureData: ChartDataPoint[] = powerLawData
    .filter((point) => isAfter(startOfDay(point.date), today))
    .map((point) => {
      const dateStr = format(point.date, 'yyyy-MM-dd');
      return {
        date: dateStr,
        timestamp: point.timestamp,
        days: point.days,
        fairPrice: point.fairPrice,
        supportPrice: point.supportPrice,
        resistancePrice: point.resistancePrice,
        bandBase: point.supportPrice,
        bandWidth: point.resistancePrice - point.supportPrice,
        actualPrice: null,
      };
    });

  // Combine and sort by date
  return [...baseData, ...dailyData, ...futureData].sort((a, b) => a.date.localeCompare(b.date));
}

function findNearestPrice(dateStr: string, priceMap: Map<string, number>): number | null {
  const targetDate = parseISO(dateStr);
  const dates = Array.from(priceMap.keys()).map((d) => ({
    date: d,
    diff: Math.abs(parseISO(d).getTime() - targetDate.getTime()),
  }));
  if (dates.length === 0) return null;
  dates.sort((a, b) => a.diff - b.diff);
  const nearest = dates[0];
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (nearest.diff <= fifteenDays) return priceMap.get(nearest.date) ?? null;
  return null;
}

export function sampleDataPoints<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const sampled: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(data[Math.floor(i * step)]);
  }
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  return sampled;
}

export function getLatestPrice(prices: HistoricalPricePoint[]): number | null {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0].price;
}
