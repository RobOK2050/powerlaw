'use client';

import { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ChartTooltip } from './ChartTooltip';
import { COLORS } from '@/lib/constants';
import type { ChartDataPoint } from '@/types';

interface PowerLawChartProps {
  data: ChartDataPoint[];
  isLogScale: boolean;
  isLoading?: boolean;
}

const LOG_TICKS = [0.01, 0.1, 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000];

export function PowerLawChart({ data, isLogScale, isLoading }: PowerLawChartProps) {
  const formatYAxis = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    if (value >= 1) return `$${value.toFixed(0)}`;
    if (value >= 0.01) return `$${value.toFixed(2)}`;
    return `$${value.toExponential(0)}`;
  };

  const formatXAxis = (dateStr: string): string => {
    try { return format(parseISO(dateStr), 'yyyy'); } catch { return dateStr; }
  };

  const yDomain = useMemo(() => {
    if (data.length === 0) return [0.01, 10000000];
    const allValues = data.flatMap((d) => [d.supportPrice, d.resistancePrice, d.actualPrice]).filter((v): v is number => v !== null && v > 0);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    if (isLogScale) {
      return [Math.pow(10, Math.floor(Math.log10(min))), Math.pow(10, Math.ceil(Math.log10(max)))];
    }
    return [0, max * 1.1];
  }, [data, isLogScale]);

  const yTicks = useMemo(() => isLogScale ? LOG_TICKS.filter((t) => t >= yDomain[0] && t <= yDomain[1]) : undefined, [isLogScale, yDomain]);

  const xTicks = useMemo(() => {
    const years = new Set<string>();
    data.forEach((d) => years.add(`${d.date.substring(0, 4)}-01-01`));
    return Array.from(years).filter((_, i, arr) => arr.length <= 15 ? true : arr.length <= 30 ? i % 2 === 0 : i % 5 === 0);
  }, [data]);

  const today = format(new Date(), 'yyyy-MM-dd');

  if (isLoading) {
    return (
      <div className="chart-container flex h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span className="text-sm text-zinc-500">Loading chart data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.chartGrid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatXAxis} ticks={xTicks} stroke={COLORS.textTertiary} tick={{ fill: COLORS.textTertiary, fontSize: 11 }} tickLine={{ stroke: COLORS.textTertiary }} axisLine={{ stroke: COLORS.chartGrid }} />
          <YAxis scale={isLogScale ? 'log' : 'linear'} domain={yDomain} ticks={yTicks} tickFormatter={formatYAxis} stroke={COLORS.textTertiary} tick={{ fill: COLORS.textTertiary, fontSize: 11 }} tickLine={{ stroke: COLORS.textTertiary }} axisLine={{ stroke: COLORS.chartGrid }} width={70} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: COLORS.textTertiary, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="bandBase" stackId="band" stroke="none" fill="transparent" animationDuration={750} />
          <Area type="monotone" dataKey="bandWidth" stackId="band" stroke={COLORS.chartBandStroke} strokeWidth={1} fill={COLORS.chartBandFill} animationDuration={750} />
          <Line type="monotone" dataKey="fairPrice" stroke={COLORS.chartPowerLaw} strokeWidth={2} dot={false} animationDuration={750} />
          <Line type="monotone" dataKey="actualPrice" stroke={COLORS.chartActualPrice} strokeWidth={1.5} dot={false} connectNulls={false} animationDuration={750} />
          <ReferenceLine x={today} stroke={COLORS.textTertiary} strokeDasharray="4 4" label={{ value: 'Today', fill: COLORS.textTertiary, fontSize: 10, position: 'top' }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2"><div className="h-0.5 w-6 bg-orange-500" /><span className="text-zinc-400">Power Law Fair Value</span></div>
        <div className="flex items-center gap-2"><div className="h-4 w-6 rounded" style={{ background: COLORS.chartBandFill, border: `1px solid ${COLORS.chartBandStroke}` }} /><span className="text-zinc-400">Support/Resistance Band</span></div>
        <div className="flex items-center gap-2"><div className="h-0.5 w-6 bg-green-500" /><span className="text-zinc-400">Actual BTC Price</span></div>
      </div>
    </div>
  );
}
