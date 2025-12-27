'use client';

import { useState, useCallback, useMemo } from 'react';
import { PowerLawChart } from '@/components/chart/PowerLawChart';
import { ControlPanel } from '@/components/controls/ControlPanel';
import { useChartData } from '@/hooks/useChartData';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { formatPrice, calculateDeviation } from '@/lib/powerLaw';
import { DEFAULT_EXPONENT, DEFAULT_COEFFICIENT, DEFAULT_START_DATE, DEFAULT_END_DATE } from '@/lib/constants';
import type { DateRange } from '@/types';

export default function Home() {
  const [exponent, setExponent] = useState(DEFAULT_EXPONENT);
  const [coefficient] = useState(DEFAULT_COEFFICIENT);
  const [isLogScale, setIsLogScale] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ start: DEFAULT_START_DATE, end: DEFAULT_END_DATE });

  const { isUsingFallback } = useBitcoinPrice();
  const { chartData, isLoading, currentPrice, currentFairPrice } = useChartData({ exponent, coefficient, dateRange });

  const handleScaleToggle = useCallback(() => setIsLogScale((prev) => !prev), []);
  const handleDateRangeChange = useCallback((range: DateRange) => setDateRange(range), []);

  const deviation = useMemo(() => currentPrice ? calculateDeviation(currentPrice, currentFairPrice) : null, [currentPrice, currentFairPrice]);

  const pricePosition = useMemo(() => {
    if (deviation === null) return null;
    if (deviation > 50) return { text: 'Well above fair value', color: 'text-red-400' };
    if (deviation > 20) return { text: 'Above fair value', color: 'text-amber-400' };
    if (deviation > -20) return { text: 'Near fair value', color: 'text-green-400' };
    if (deviation > -50) return { text: 'Below fair value', color: 'text-blue-400' };
    return { text: 'Well below fair value', color: 'text-purple-400' };
  }, [deviation]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-white/5 bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-gradient-orange">Bitcoin Power Law</span>
              </h1>
              <p className="mt-1 text-sm text-zinc-500">Price model by Giovanni Santostasi</p>
            </div>
            {currentPrice && (
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-white/10 bg-[var(--bg-card)] px-4 py-2">
                  <div className="text-xs text-zinc-500">Current BTC Price</div>
                  <div className="font-mono text-lg font-semibold text-green-400">{formatPrice(currentPrice)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[var(--bg-card)] px-4 py-2">
                  <div className="text-xs text-zinc-500">Fair Value</div>
                  <div className="font-mono text-lg font-semibold text-orange-400">{formatPrice(currentFairPrice)}</div>
                </div>
                {pricePosition && (
                  <div className="hidden rounded-xl border border-white/10 bg-[var(--bg-card)] px-4 py-2 lg:block">
                    <div className="text-xs text-zinc-500">Status</div>
                    <div className={`text-sm font-medium ${pricePosition.color}`}>
                      {pricePosition.text}
                      {deviation !== null && <span className="ml-1 text-zinc-500">({deviation > 0 ? '+' : ''}{deviation.toFixed(0)}%)</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="order-2 lg:order-1">
            <PowerLawChart data={chartData} isLogScale={isLogScale} isLoading={isLoading} />
          </div>
          <div className="order-1 lg:order-2">
            <ControlPanel exponent={exponent} onExponentChange={setExponent} isLogScale={isLogScale} onScaleToggle={handleScaleToggle} dateRange={dateRange} onDateRangeChange={handleDateRangeChange} isUsingFallback={isUsingFallback} />
          </div>
        </div>

        <footer className="mt-12 border-t border-white/5 pt-8">
          <div className="flex flex-col gap-4 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Power Law formula: <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-orange-400">Price = {coefficient.toExponential(4)} × days^{exponent.toFixed(2)}</code>
            </p>
            <div className="flex items-center gap-4">
              <a href="https://giovannisantostasi.medium.com/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">Learn More</a>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-700">Data from CoinGecko</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
