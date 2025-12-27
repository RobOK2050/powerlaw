'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ChartTooltip } from './ChartTooltip';
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
    try {
      return format(parseISO(dateStr), 'yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate domain for Y axis
  const yDomain = useMemo((): [number, number] => {
    if (data.length === 0) return [0.01, 10000000];

    const allValues = data.flatMap((d) => [
      d.supportPrice,
      d.resistancePrice,
      d.actualPrice,
      d.fairPrice,
    ]).filter((v): v is number => v !== null && v > 0);

    if (allValues.length === 0) return [0.01, 10000000];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    if (isLogScale) {
      const logMin = Math.pow(10, Math.floor(Math.log10(Math.max(min, 0.01))));
      const logMax = Math.pow(10, Math.ceil(Math.log10(max)));
      return [logMin, logMax];
    }

    return [0, max * 1.1];
  }, [data, isLogScale]);

  const yTicks = useMemo(() => {
    if (!isLogScale) return undefined;
    return LOG_TICKS.filter((t) => t >= yDomain[0] && t <= yDomain[1]);
  }, [isLogScale, yDomain]);

  const xTicks = useMemo(() => {
    const years = new Set<string>();
    data.forEach((d) => years.add(`${d.date.substring(0, 4)}-01-01`));
    const yearArray = Array.from(years);
    if (yearArray.length <= 15) return yearArray;
    if (yearArray.length <= 30) return yearArray.filter((_, i) => i % 2 === 0);
    return yearArray.filter((_, i) => i % 5 === 0);
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
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#fb923c" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            ticks={xTicks}
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={{ stroke: '#71717a' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.05)' }}
          />

          <YAxis
            scale={isLogScale ? 'log' : 'linear'}
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={formatYAxis}
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={{ stroke: '#71717a' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.05)' }}
            width={70}
            allowDataOverflow={false}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: '#71717a', strokeDasharray: '4 4' }}
          />

          {/* Resistance line (top of band) */}
          <Area
            type="monotone"
            dataKey="resistancePrice"
            stroke="rgba(251, 146, 60, 0.4)"
            strokeWidth={1}
            fill="url(#bandGradient)"
            fillOpacity={1}
            isAnimationActive={false}
          />

          {/* Support line (bottom of band) - fills over the resistance to create cutout effect */}
          <Area
            type="monotone"
            dataKey="supportPrice"
            stroke="rgba(251, 146, 60, 0.4)"
            strokeWidth={1}
            fill="#16161f"
            fillOpacity={1}
            isAnimationActive={false}
          />

          {/* Power Law fair value line */}
          <Line
            type="monotone"
            dataKey="fairPrice"
            stroke="#f7931a"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* Actual Bitcoin price */}
          <Line
            type="monotone"
            dataKey="actualPrice"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Today reference line */}
          <ReferenceLine
            x={today}
            stroke="#71717a"
            strokeDasharray="4 4"
            label={{
              value: 'Today',
              fill: '#71717a',
              fontSize: 10,
              position: 'top',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 rounded bg-orange-500" />
          <span className="text-zinc-400">Power Law Fair Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-6 rounded"
            style={{
              background: 'linear-gradient(180deg, rgba(251, 146, 60, 0.3) 0%, rgba(251, 146, 60, 0.05) 100%)',
              border: '1px solid rgba(251, 146, 60, 0.4)',
            }}
          />
          <span className="text-zinc-400">Support/Resistance Band</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 rounded bg-green-500" />
          <span className="text-zinc-400">Actual BTC Price</span>
        </div>
      </div>
    </div>
  );
}
