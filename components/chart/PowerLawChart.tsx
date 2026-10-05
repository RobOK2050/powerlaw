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
import { formatDate, utcDay } from '@/lib/dates';
import { ChartTooltip } from './ChartTooltip';
import type { ChartDataPoint } from '@/types';

interface PowerLawChartProps {
  data: ChartDataPoint[];
  isLogScale: boolean;
  isLoading?: boolean;
}


export function PowerLawChart({ data, isLogScale, isLoading }: PowerLawChartProps) {
  const formatYAxis = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    if (value >= 1) return `$${value.toFixed(0)}`;
    if (value >= 0.01) return `$${value.toFixed(2)}`;
    return `$${value.toExponential(0)}`;
  };

  const formatXAxis = (timestamp: number): string => new Date(timestamp).getUTCFullYear().toString();

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
      return [logMin, Math.max(logMax, logMin * 10)];
    }

    return [0, max * 1.1];
  }, [data, isLogScale]);

  const yTicks = useMemo(() => {
    if (!isLogScale) return undefined;
    const first = Math.round(Math.log10(yDomain[0]));
    const last = Math.round(Math.log10(yDomain[1]));
    return Array.from({ length: last - first + 1 }, (_, i) => 10 ** (first + i));
  }, [isLogScale, yDomain]);

  const xTicks = useMemo(() => {
    if (data.length === 0) return [];
    const start = data[0].timestamp;
    const end = data[data.length - 1].timestamp;
    const firstYear = new Date(start).getUTCFullYear();
    const lastYear = new Date(end).getUTCFullYear();
    if (firstYear === lastYear) return [start, start + (end - start) / 2, end];
    const step = Math.max(1, Math.ceil((lastYear - firstYear) / 8));
    const ticks: number[] = [];
    for (let year = firstYear; year <= lastYear; year += step) {
      const timestamp = Date.UTC(year, 0, 1);
      if (timestamp >= start && timestamp <= end) ticks.push(timestamp);
    }
    return ticks;
  }, [data]);

  const today = utcDay().getTime();
  const sameYear = data.length > 0 && new Date(data[0].timestamp).getUTCFullYear() === new Date(data[data.length - 1].timestamp).getUTCFullYear();

  if (isLoading && data.length === 0) {
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
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={sameYear ? (time) => formatDate(time, { day: 'numeric', year: undefined }) : formatXAxis}
            ticks={xTicks}
            interval="preserveStartEnd"
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={{ stroke: '#71717a' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.05)' }}
            minTickGap={30}
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
            allowDataOverflow={true}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: '#71717a', strokeDasharray: '4 4' }}
          />

          {/* A range area leaves the grid visible below support. */}
          <Area
            type="linear"
            dataKey={(point: ChartDataPoint) => [point.supportPrice, point.resistancePrice]}
            stroke="rgba(251, 146, 60, 0.4)"
            strokeWidth={1}
            fill="url(#bandGradient)"
            isAnimationActive={false}
          />

          {/* Power Law fair value line */}
          <Line
            type="linear"
            dataKey="fairPrice"
            stroke="#f7931a"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* Actual Bitcoin price */}
          <Line
            type="linear"
            dataKey="actualPrice"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 1, strokeWidth: 0, fill: '#22c55e' }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Today reference line */}
          {data.length > 0 && today >= data[0].timestamp && today <= data[data.length - 1].timestamp && <ReferenceLine
            x={today}
            stroke="#71717a"
            strokeDasharray="4 4"
            label={{
              value: 'Today',
              fill: '#71717a',
              fontSize: 10,
              position: 'top',
            }}
          />}
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-center text-xs text-zinc-400">Daily observations use UTC dates. Breaks in the green line indicate missing data.</p>

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
