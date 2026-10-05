'use client';

import { useId, useState } from 'react';
import { changeRangeYear, formatDate, PRESET_LABELS, presetRange, type PresetKey } from '@/lib/dates';
import type { DateRange } from '@/types';

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

function YearInput({ label, year, min, max, onYearChange }: {
  label: string; year: number; min: number; max: number; onYearChange: (year: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ key: string; message: string } | null>(null);
  const validationKey = `${year}:${min}:${max}`;
  const error = validation?.key === validationKey ? validation.message : '';
  const clearError = () => setValidation(null);
  const commit = () => {
    if (draft !== null) {
      const parsed = Number(draft);
      if (/^\d{4}$/.test(draft) && parsed >= min && parsed <= max) {
        onYearChange(parsed);
        clearError();
      } else setValidation({ key: validationKey, message: `Enter a year from ${min} to ${max}.` });
    }
    setDraft(null);
  };
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-xs text-zinc-400">{label}</label>
      <div className="flex">
        <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={year <= min}
          onClick={() => { clearError(); onYearChange(year - 1); }}
          className="rounded-l-lg border border-white/10 bg-zinc-700 px-2 py-2 text-zinc-300 disabled:opacity-30">−</button>
        <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" value={draft ?? year.toString()}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setDraft(null); clearError(); } }}
          className="min-w-0 w-full border-y border-white/10 bg-zinc-800/50 px-1 py-2 text-center text-sm text-white focus:outline-orange-500" />
        <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={year >= max}
          onClick={() => { clearError(); onYearChange(year + 1); }}
          className="rounded-r-lg border border-white/10 bg-zinc-700 px-2 py-2 text-zinc-300 disabled:opacity-30">+</button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-amber-400">{error}</p>}
    </div>
  );
}

export function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  const startYear = dateRange.start.getUTCFullYear();
  const endYear = dateRange.end.getUTCFullYear();
  const now = new Date();
  const activePreset = (Object.keys(PRESET_LABELS) as PresetKey[]).find((key) => {
    const range = presetRange(key, now);
    return range.start.getTime() === dateRange.start.getTime() && range.end.getTime() === dateRange.end.getTime();
  });
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Date Range</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(PRESET_LABELS) as [PresetKey, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => onChange(presetRange(key))} aria-pressed={activePreset === key}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activePreset === key ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'border border-white/5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-2">
        <YearInput label="Start Year" year={startYear} min={2009} max={endYear}
          onYearChange={(year) => onChange(changeRangeYear(dateRange, 'start', year))} />
        <div className="pt-7 text-zinc-500">to</div>
        <YearInput label="End Year" year={endYear} min={startYear} max={2100}
          onYearChange={(year) => onChange(changeRangeYear(dateRange, 'end', year))} />
      </div>
      <p className="text-xs text-zinc-400">Showing {formatDate(dateRange.start)} to {formatDate(dateRange.end)} (UTC)</p>
    </fieldset>
  );
}
