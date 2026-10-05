import { DAY_MS, dateKey, isValidRange, parseDate, utcDay } from './dates';
import { daysSinceGenesis, calculatePowerLawPrice, calculateSupportPrice, calculateResistancePrice } from './powerLaw';
import type { HistoricalPricePoint, ChartDataPoint, PowerLawDataPoint, PricePoint, DateRange } from '@/types';

export function transformRawPrices(prices: PricePoint[]): HistoricalPricePoint[] {
  return prices.map((p) => ({ ...p, daysSinceGenesis: daysSinceGenesis(new Date(`${p.date}T00:00:00Z`)) }));
}

export function mergeHistoricalData(...sources: PricePoint[][]): PricePoint[] {
  const points = new Map<string, PricePoint>();
  for (const source of sources) for (const p of source) {
    if (parseDate(p.date) && Number.isFinite(p.price) && p.price > 0) points.set(p.date, p);
  }
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeDataForChart(
  model: PowerLawDataPoint[], prices: PricePoint[], coefficient: number, exponent: number,
  range: DateRange, now = new Date(),
): ChartDataPoint[] {
  if (!isValidRange(range)) return [];
  const start = utcDay(range.start).getTime();
  const end = utcDay(range.end).getTime();
  const today = utcDay(now).getTime();
  const observations = mergeHistoricalData(prices).filter((p) => {
    const time = new Date(p.date).getTime();
    return time >= start && time <= end && time <= today;
  });
  const priceMap = new Map(observations.map((p) => [p.date, p.price]));
  const times = new Set(model.map((p) => p.timestamp));
  times.add(start);
  times.add(end);
  if (today >= start && today <= end) times.add(today);
  for (const p of observations) {
    const time = new Date(p.date).getTime();
    times.add(time);
    // Explicit nulls break missing periods even between sparse model points.
    if (time + DAY_MS <= end) times.add(time + DAY_MS);
  }
  return [...times].filter((time) => time >= start && time <= end && daysSinceGenesis(new Date(time)) > 0)
    .sort((a, b) => a - b).map((timestamp) => {
      const date = dateKey(new Date(timestamp));
      const days = daysSinceGenesis(new Date(timestamp));
      const fairPrice = calculatePowerLawPrice(days, coefficient, exponent);
      const supportPrice = calculateSupportPrice(fairPrice);
      const resistancePrice = calculateResistancePrice(fairPrice);
      return { date, timestamp, days, fairPrice, supportPrice, resistancePrice,
        bandBase: supportPrice, bandWidth: resistancePrice - supportPrice,
        actualPrice: priceMap.get(date) ?? null };
    });
}

export function getLatestPrice(prices: PricePoint[]): PricePoint | null {
  return prices.reduce<PricePoint | null>((latest, p) => !latest || p.date > latest.date ? p : latest, null);
}
