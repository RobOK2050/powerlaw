'use client';

import { useState, useMemo, useEffect } from 'react';
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
  year,
  min,
  max,
  onYearChange
}: {
  label: string;
  year: number;
  min: number;
  max: number;
  onYearChange: (year: number) => void;
}) {
  const [inputValue, setInputValue] = useState(year.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync display when year prop changes (but not while user is typing)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(year.toString());
    }
  }, [year, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onYearChange(parsed);
    } else {
      setInputValue(year.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleIncrement = () => {
    const newYear = Math.min(year + 1, max);
    onYearChange(newYear);
  };

  const handleDecrement = () => {
    const newYear = Math.max(year - 1, min);
    onYearChange(newYear);
  };

  return (
    <div className="flex-1">
      <label className="text-xs text-zinc-600 mb-1 block">{label}</label>
      <div className="flex">
        <button
          type="button"
          onClick={handleDecrement}
          className="rounded-l-lg border border-r-0 border-white/10 bg-zinc-700 px-2 py-2 text-zinc-400 hover:bg-zinc-600 hover:text-white transition-colors select-none"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full border-y border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white text-center focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="rounded-r-lg border border-l-0 border-white/10 bg-zinc-700 px-2 py-2 text-zinc-400 hover:bg-zinc-600 hover:text-white transition-colors select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  // Local state for years - this is the source of truth while editing
  const [startYear, setStartYear] = useState(dateRange.start.getFullYear());
  const [endYear, setEndYear] = useState(dateRange.end.getFullYear());

  // Sync local state when dateRange prop changes (e.g., from presets)
  useEffect(() => {
    setStartYear(dateRange.start.getFullYear());
    setEndYear(dateRange.end.getFullYear());
  }, [dateRange]);

  // Update parent when local years change
  const handleStartYearChange = (year: number) => {
    setStartYear(year);
    onChange({
      start: new Date(`${year}-01-01`),
      end: dateRange.end
    });
  };

  const handleEndYearChange = (year: number) => {
    setEndYear(year);
    onChange({
      start: dateRange.start,
      end: new Date(`${year}-12-31`)
    });
  };

  const handlePresetClick = (key: PresetKey) => {
    onChange(PRESETS[key].getRange());
  };

  const activePreset = useMemo(() => {
    if (startYear === 2009 && endYear === 2040) return 'all';
    if (startYear === 2020 && endYear === 2040) return '2020+';
    if (startYear === 2030 && endYear === 2040) return 'future';
    return null;
  }, [startYear, endYear]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Date Range</label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePresetClick(key as PresetKey)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activePreset === key ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-white/5'}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <YearInput
          label="Start Year"
          year={startYear}
          min={2009}
          max={2100}
          onYearChange={handleStartYearChange}
        />
        <div className="text-zinc-500 pt-5">to</div>
        <YearInput
          label="End Year"
          year={endYear}
          min={2009}
          max={2100}
          onYearChange={handleEndYearChange}
        />
      </div>
      <p className="text-xs text-zinc-500">Showing {format(dateRange.start, 'MMM yyyy')} to {format(dateRange.end, 'MMM yyyy')}</p>
    </div>
  );
}
