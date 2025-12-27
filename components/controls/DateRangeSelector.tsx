'use client';

import { useCallback, useMemo } from 'react';
import { format, addYears } from 'date-fns';
import { GENESIS_BLOCK, DEFAULT_END_DATE } from '@/lib/constants';
import type { DateRange } from '@/types';

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'all' | '2020+' | 'last5' | 'next10' | 'future';

const PRESETS: Record<PresetKey, { label: string; getRange: () => DateRange }> = {
  all: { label: 'All Time', getRange: () => ({ start: GENESIS_BLOCK, end: DEFAULT_END_DATE }) },
  '2020+': { label: '2020+', getRange: () => ({ start: new Date('2020-01-01'), end: DEFAULT_END_DATE }) },
  last5: { label: 'Last 5 Years', getRange: () => ({ start: addYears(new Date(), -5), end: addYears(new Date(), 5) }) },
  next10: { label: 'Next 10 Years', getRange: () => ({ start: new Date(), end: addYears(new Date(), 10) }) },
  future: { label: '2030-2040', getRange: () => ({ start: new Date('2030-01-01'), end: new Date('2040-12-31') }) },
};

export function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  const handlePresetClick = useCallback((key: PresetKey) => onChange(PRESETS[key].getRange()), [onChange]);

  const handleStartYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value, 10);
    if (!isNaN(year) && year >= 2009 && year <= 2100) onChange({ ...dateRange, start: new Date(`${year}-01-01`) });
  }, [dateRange, onChange]);

  const handleEndYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value, 10);
    if (!isNaN(year) && year >= 2009 && year <= 2100) onChange({ ...dateRange, end: new Date(`${year}-12-31`) });
  }, [dateRange, onChange]);

  const activePreset = useMemo(() => {
    const startYear = dateRange.start.getFullYear();
    const endYear = dateRange.end.getFullYear();
    if (startYear === 2009 && endYear === 2040) return 'all';
    if (startYear === 2020 && endYear === 2040) return '2020+';
    if (startYear === 2030 && endYear === 2040) return 'future';
    return null;
  }, [dateRange]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Date Range</label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key as PresetKey)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activePreset === key ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-white/5'}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-zinc-600 mb-1 block">Start Year</label>
          <input type="number" min={2009} max={2100} value={dateRange.start.getFullYear()} onChange={handleStartYearChange} className="w-full rounded-lg border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <div className="text-zinc-500 pt-5">to</div>
        <div className="flex-1">
          <label className="text-xs text-zinc-600 mb-1 block">End Year</label>
          <input type="number" min={2009} max={2100} value={dateRange.end.getFullYear()} onChange={handleEndYearChange} className="w-full rounded-lg border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
      </div>
      <p className="text-xs text-zinc-500">Showing {format(dateRange.start, 'MMM yyyy')} to {format(dateRange.end, 'MMM yyyy')}</p>
    </div>
  );
}
