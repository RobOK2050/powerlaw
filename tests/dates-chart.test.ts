import { describe, expect, it } from 'vitest';
import { changeRangeYear, dateKey, DAY_MS, parseDate, presetRange } from '@/lib/dates';
import { generatePowerLawData, daysSinceGenesis } from '@/lib/powerLaw';
import { mergeDataForChart } from '@/lib/dataTransformers';
import { DEFAULT_COEFFICIENT, DEFAULT_EXPONENT } from '@/lib/constants';

const now = new Date('2026-10-05T16:00:00Z');
const makeChart = (start: string, end: string, prices = [{ date: '2026-10-05', price: 100_000 }]) => {
  const range = { start: new Date(start), end: new Date(end) };
  return mergeDataForChart(generatePowerLawData(range.start, range.end), prices, DEFAULT_COEFFICIENT, DEFAULT_EXPONENT, range, now);
};

describe('UTC date ranges', () => {
  it('preserves calendar years and increments in New York as well as UTC', () => {
    const range = presetRange('2020+', now);
    expect(dateKey(range.start)).toBe('2020-01-01');
    expect(range.start.getUTCFullYear()).toBe(2020);
    expect(dateKey(changeRangeYear(range, 'start', 2021).start)).toBe('2021-01-01');
  });
  it('Last 5 Years ends today, and Next 10 Years starts today', () => {
    expect(dateKey(presetRange('last5', now).start)).toBe('2021-10-05');
    expect(dateKey(presetRange('last5', now).end)).toBe('2026-10-05');
    expect(dateKey(presetRange('next10', now).end)).toBe('2036-10-05');
  });
  it('clamps leap days and rejects reversed or impossible years', () => {
    expect(dateKey(presetRange('last5', new Date('2024-02-29')).start)).toBe('2019-02-28');
    const range = presetRange('future', now);
    expect(changeRangeYear(range, 'start', 2041)).toBe(range);
    expect(changeRangeYear(range, 'end', 2029)).toBe(range);
    expect(changeRangeYear(range, 'start', 2030.1)).toBe(range);
    expect(parseDate('2026-02-30')).toBeNull();
    expect(parseDate('garbage')).toBeNull();
  });
  it('counts genesis days independently of local daylight savings', () => {
    expect(daysSinceGenesis(new Date('2009-01-04T00:00:00Z'))).toBe(1);
    expect(daysSinceGenesis(new Date('2026-03-09')) - daysSinceGenesis(new Date('2026-03-08'))).toBe(1);
  });
});

describe('chart observations', () => {
  it.each([['2020-01-01', '2021-12-31'], ['2030-01-01', '2040-12-31']])('honors the complete range %s through %s', (start, end) => {
    const chart = makeChart(start, end);
    expect(chart.length).toBeGreaterThan(0);
    expect(chart.every((p) => p.date >= start && p.date <= end)).toBe(true);
    expect(chart.every((p) => p.actualPrice === null)).toBe(true);
    expect(chart.at(-1)?.date).toBe(end);
  });
  it('does not invent nearby observations and explicitly breaks missing days', () => {
    const chart = makeChart('2020-01-01', '2021-12-31', [{ date: '2020-01-10', price: 8000 }, { date: '2020-03-01', price: 9000 }]);
    expect(chart.filter((p) => p.actualPrice !== null).map((p) => p.date)).toEqual(['2020-01-10', '2020-03-01']);
    expect(chart.find((p) => p.date === '2020-01-11')?.actualPrice).toBeNull();
    expect(new Set(chart.map((p) => p.timestamp)).size).toBe(chart.length);
  });
  it('keeps the model even when no recent prices exist', () => {
    const chart = makeChart('2026-09-01', '2026-10-05', []);
    expect(chart).toHaveLength(35);
    expect(chart.every((p) => p.fairPrice > 0 && p.actualPrice === null)).toBe(true);
  });
  it('retains every observed day instead of sampling away peaks', () => {
    const prices = Array.from({ length: 1000 }, (_, i) => ({ date: dateKey(new Date(Date.UTC(2020, 0, 1) + i * DAY_MS)), price: i === 499 ? 100_000 : 10_000 }));
    const chart = makeChart('2009-01-03', '2040-12-31', prices);
    expect(chart.filter((p) => p.actualPrice !== null)).toHaveLength(1000);
    expect(chart.find((p) => p.date === prices[499].date)?.actualPrice).toBe(100_000);
  });
  it('rejects a reversed range without injecting current prices', () => {
    expect(makeChart('2040-01-01', '2030-12-31')).toEqual([]);
  });
});
