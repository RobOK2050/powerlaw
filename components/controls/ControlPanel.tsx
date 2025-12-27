'use client';

import { ExponentSlider } from './ExponentSlider';
import { ScaleToggle } from './ScaleToggle';
import { DateRangeSelector } from './DateRangeSelector';
import type { DateRange } from '@/types';

interface ControlPanelProps {
  exponent: number;
  onExponentChange: (value: number) => void;
  isLogScale: boolean;
  onScaleToggle: () => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  isUsingFallback?: boolean;
}

export function ControlPanel({ exponent, onExponentChange, isLogScale, onScaleToggle, dateRange, onDateRangeChange, isUsingFallback }: ControlPanelProps) {
  return (
    <div className="control-panel space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Controls</h2>
        {isUsingFallback && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Using cached data
          </span>
        )}
      </div>
      <div className="space-y-6">
        <ExponentSlider value={exponent} onChange={onExponentChange} />
        <div className="border-t border-white/5 pt-6"><ScaleToggle isLogScale={isLogScale} onToggle={onScaleToggle} /></div>
        <div className="border-t border-white/5 pt-6"><DateRangeSelector dateRange={dateRange} onChange={onDateRangeChange} /></div>
      </div>
      <div className="border-t border-white/5 pt-4">
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400 transition-colors">About the Power Law Model</summary>
          <div className="mt-3 space-y-2 text-xs text-zinc-500">
            <p>The Bitcoin Power Law model was proposed by <span className="text-zinc-400">Giovanni Santostasi</span> in 2015.</p>
            <p>Formula: <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-orange-400">Price = A × days^n</code></p>
            <p>Where <code className="font-mono">n ≈ 5.82</code> and <code className="font-mono">A ≈ 10^-17</code></p>
            <p className="text-zinc-600">The orange band shows historical support (0.42×) and resistance (2.4×) levels.</p>
          </div>
        </details>
      </div>
    </div>
  );
}
