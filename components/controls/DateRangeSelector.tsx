'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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

function YearInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (year: number) => void;
}) {
  const [inputValue, setInputValue] = useState(value.toString());

  // Sync with external value changes (from presets)
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const applyValue = useCallback((val: string) => {
    const year = parseInt(val, 10);
    if (!isNaN(year) && year >= 2009 && year <= 2100) {
      onChange(year);
    } else {
      // Reset to current valid value
      setInputValue(value.toString());
    }
  }, [onChange, value]);

  const handleBlur = useCallback(() => {
    applyValue(inputValue);
  }, [inputValue, applyValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyValue(inputValue);
      (e.target as HTMLInputElement).blur();
    }
  }, [inputValue, applyValue]);

  const increment = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const newYear = Math.min(value + 1, 2100);
    setInputValue(newYear.toString());
    onChange(newYear);
  }, [value, onChange]);

  const decrement = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const newYear = Math.max(value - 1, 2009);
    setInputValue(newYear.toString());
    onChange(newYear);
  }, [value, onChange]);

  return (
    <div className="flex-1">
      <label className="text-xs text-zinc-600 mb-1 block">{label}</label>
      <div className="flex">
        <button
          onMouseDown={decrement}
          className="rounded-l-lg border border-r-0 border-white/10 bg-zinc-700 px-2 py-2 text-zinc-400 hover:bg-zinc-600 hover:text-white transition-colors select-none"
          type="button"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full border-y border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white text-center focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          onMouseDown={increment}
          className="rounded-r-lg border border-l-0 border-white/10 bg-zinc-700 px-2 py-2 text-zinc-400 hover:bg-zinc-600 hover:text-white transition-colors select-none"
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  const handlePresetClick = useCallback((key: PresetKey) => onChange(PRESETS[key].getRange()), [onChange]);

  const handleStartYearChange = useCallback((year: number) => {
    onChange({ ...dateRange, start: new Date(`${year}-01-01`) });
  }, [dateRange, onChange]);

  const handleEndYearChange = useCallback((year: number) => {
    onChange({ ...dateRange, end: new Date(`${year}-12-31`) });
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
        <YearInput label="Start Year" value={dateRange.start.getFullYear()} onChange={handleStartYearChange} />
        <div className="text-zinc-500 pt-5">to</div>
        <YearInput label="End Year" value={dateRange.end.getFullYear()} onChange={handleEndYearChange} />
      </div>
      <p className="text-xs text-zinc-500">Showing {format(dateRange.start, 'MMM yyyy')} to {format(dateRange.end, 'MMM yyyy')}</p>
    </div>
  );
}
