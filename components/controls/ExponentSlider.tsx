'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { formatPrice, getCurrentFairPrice } from '@/lib/powerLaw';
import { EXPONENT_MIN, EXPONENT_MAX, EXPONENT_STEP, DEFAULT_EXPONENT, DEFAULT_COEFFICIENT } from '@/lib/constants';

interface ExponentSliderProps {
  value: number;
  onChange: (value: number) => void;
  coefficient?: number;
}

export function ExponentSlider({ value, onChange, coefficient = DEFAULT_COEFFICIENT }: ExponentSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => setLocalValue(value), [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) onChange(localValue);
    }, 50);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(parseFloat(e.target.value));
  }, []);

  const handleReset = useCallback(() => {
    setLocalValue(DEFAULT_EXPONENT);
    onChange(DEFAULT_EXPONENT);
  }, [onChange]);

  const fairPrice = useMemo(() => getCurrentFairPrice(coefficient, localValue), [coefficient, localValue]);
  const percentFromDefault = useMemo(() => ((localValue - DEFAULT_EXPONENT) / DEFAULT_EXPONENT * 100).toFixed(1), [localValue]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Power Law Exponent</label>
        <button onClick={handleReset} className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Reset</button>
      </div>
      <div className="flex items-center gap-4">
        <input type="range" min={EXPONENT_MIN} max={EXPONENT_MAX} step={EXPONENT_STEP} value={localValue} onChange={handleChange} className="flex-1" />
        <div className="w-20 text-right">
          <span className="font-mono text-lg text-white">{localValue.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-500">Fair value today: <span className="text-orange-400 font-medium">{formatPrice(fairPrice)}</span></div>
        <div className={`text-xs ${parseFloat(percentFromDefault) > 0 ? 'text-green-400' : parseFloat(percentFromDefault) < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
          {parseFloat(percentFromDefault) > 0 ? '+' : ''}{percentFromDefault}% from default
        </div>
      </div>
      <div className="flex justify-between text-xs text-zinc-600">
        <span>{EXPONENT_MIN}</span>
        <span className="text-zinc-500">Default: {DEFAULT_EXPONENT}</span>
        <span>{EXPONENT_MAX}</span>
      </div>
    </div>
  );
}
