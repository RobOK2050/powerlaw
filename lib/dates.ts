import type { DateRange } from '@/types';

export const DAY_MS = 86_400_000;

export function utcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value ? date : null;
}

export function formatDate(date: Date | number, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', ...options, timeZone: 'UTC' }).format(date);
}

export function isValidRange(range: DateRange): boolean {
  return Number.isFinite(range.start.getTime()) && Number.isFinite(range.end.getTime()) && range.start <= range.end;
}

export type PresetKey = 'all' | '2020+' | 'last5' | 'next10' | 'future';
export const PRESET_LABELS: Record<PresetKey, string> = {
  all: 'All Time', '2020+': '2020+', last5: 'Last 5 Years', next10: 'Next 10 Years', future: '2030–2040',
};

function shiftYears(date: Date, years: number): Date {
  const year = date.getUTCFullYear() + years;
  const lastDay = new Date(Date.UTC(year, date.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, date.getUTCMonth(), Math.min(date.getUTCDate(), lastDay)));
}

export function presetRange(key: PresetKey, now = new Date()): DateRange {
  const today = utcDay(now);
  switch (key) {
    case 'all': return { start: new Date('2009-01-03T00:00:00Z'), end: new Date('2040-12-31T00:00:00Z') };
    case '2020+': return { start: new Date('2020-01-01T00:00:00Z'), end: new Date('2040-12-31T00:00:00Z') };
    case 'last5': return { start: shiftYears(today, -5), end: today };
    case 'next10': return { start: today, end: shiftYears(today, 10) };
    case 'future': return { start: new Date('2030-01-01T00:00:00Z'), end: new Date('2040-12-31T00:00:00Z') };
  }
}

export function changeRangeYear(range: DateRange, edge: 'start' | 'end', year: number): DateRange {
  if (!Number.isInteger(year) || year < 2009 || year > 2100) return range;
  const next = { ...range, [edge]: new Date(Date.UTC(year, edge === 'start' ? 0 : 11, edge === 'start' ? (year === 2009 ? 3 : 1) : 31)) };
  return isValidRange(next) ? next : range;
}
