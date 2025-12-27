'use client';

import { format, parseISO } from 'date-fns';
import { formatPrice, calculateDeviation } from '@/lib/powerLaw';

interface TooltipPayload {
  date: string;
  fairPrice: number;
  supportPrice: number;
  resistancePrice: number;
  actualPrice: number | null;
  days: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
}

export function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const date = parseISO(data.date);
  const isHistorical = data.actualPrice !== null;
  const deviation = isHistorical ? calculateDeviation(data.actualPrice!, data.fairPrice) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-sm">
      <div className="mb-3 border-b border-white/5 pb-2">
        <div className="text-sm font-medium text-white">{format(date, 'MMMM d, yyyy')}</div>
        <div className="text-xs text-zinc-500">Day {data.days.toLocaleString()} since Genesis</div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-zinc-500">Fair Value</span>
          <span className="font-mono text-sm text-orange-400">{formatPrice(data.fairPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-zinc-500">Support</span>
          <span className="font-mono text-xs text-zinc-400">{formatPrice(data.supportPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-zinc-500">Resistance</span>
          <span className="font-mono text-xs text-zinc-400">{formatPrice(data.resistancePrice)}</span>
        </div>
      </div>
      {isHistorical && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-zinc-500">Actual Price</span>
            <span className="font-mono text-sm text-green-400">{formatPrice(data.actualPrice!)}</span>
          </div>
          {deviation !== null && (
            <div className="mt-1 flex items-center justify-between gap-6">
              <span className="text-xs text-zinc-500">Deviation</span>
              <span className={`font-mono text-xs ${deviation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
      {!isHistorical && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="text-xs text-zinc-500 italic">Projected future value</div>
        </div>
      )}
    </div>
  );
}
