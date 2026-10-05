'use client';

import { useId } from 'react';
import { formatPrice, calculatePowerLawPrice, daysSinceGenesis } from '@/lib/powerLaw';
import { EXPONENT_MIN, EXPONENT_MAX, EXPONENT_STEP, DEFAULT_EXPONENT, DEFAULT_COEFFICIENT } from '@/lib/constants';

interface ExponentSliderProps {
  value: number;
  onChange: (value: number) => void;
  coefficient?: number;
  now?: number;
}

export function ExponentSlider({ value, onChange, coefficient = DEFAULT_COEFFICIENT, now = 0 }: ExponentSliderProps) {
  const id = useId();
  const localValue = value;
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value));
  const handleReset = () => onChange(DEFAULT_EXPONENT);
  const fairPrice = now ? calculatePowerLawPrice(daysSinceGenesis(new Date(now)), coefficient, value) : null;
  const percentFromDefault = ((value - DEFAULT_EXPONENT) / DEFAULT_EXPONENT * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-zinc-500">Power Law Exponent</label>
        <button onClick={handleReset} className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Reset</button>
      </div>
      <div className="flex items-center gap-4">
        <input id={id} type="range" min={EXPONENT_MIN} max={EXPONENT_MAX} step={EXPONENT_STEP} value={localValue} onChange={handleChange} className="flex-1" />
        <div className="w-20 text-right">
          <span className="font-mono text-lg text-white">{localValue.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-500">Fair value today: <span className="text-orange-400 font-medium">{fairPrice === null ? '—' : formatPrice(fairPrice)}</span></div>
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
