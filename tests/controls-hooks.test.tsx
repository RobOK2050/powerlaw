// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateRangeSelector } from '@/components/controls/DateRangeSelector';
import { ExponentSlider } from '@/components/controls/ExponentSlider';
import { presetRange } from '@/lib/dates';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { useChartData } from '@/hooks/useChartData';
import { REFRESH_MS } from '@/lib/priceCache';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });

function Controls() {
  const [range, setRange] = useState(presetRange('all'));
  return <DateRangeSelector dateRange={range} onChange={setRange} />;
}

describe('controls', () => {
  it('increments the initial 2009 start year to 2010', () => {
    render(<Controls />);
    expect((screen.getByLabelText('Start Year') as HTMLInputElement).value).toBe('2009');
    const increment = screen.getByRole('button', { name: 'Increase start year' });
    increment.focus();
    fireEvent.click(increment);
    expect((screen.getByLabelText('Start Year') as HTMLInputElement).value).toBe('2010');
    expect(document.activeElement).toBe(increment);
  });
  it('increments 2020 to 2021 and back without a timezone shift', () => {
    render(<Controls />);
    fireEvent.click(screen.getByRole('button', { name: '2020+' }));
    expect((screen.getByLabelText('Start Year') as HTMLInputElement).value).toBe('2020');
    fireEvent.click(screen.getByRole('button', { name: 'Increase start year' }));
    expect((screen.getByLabelText('Start Year') as HTMLInputElement).value).toBe('2021');
    fireEvent.click(screen.getByRole('button', { name: 'Decrease start year' }));
    expect((screen.getByLabelText('Start Year') as HTMLInputElement).value).toBe('2020');
  });
  it('rejects reversed ranges and commits a valid typed year', () => {
    render(<Controls />);
    fireEvent.click(screen.getByRole('button', { name: '2030–2040' }));
    const start = screen.getByLabelText('Start Year');
    fireEvent.change(start, { target: { value: '2050' } }); fireEvent.blur(start);
    expect((start as HTMLInputElement).value).toBe('2030');
    expect(screen.getByRole('alert').textContent).toContain('2040');
    fireEvent.change(start, { target: { value: '2035' } }); fireEvent.keyDown(start, { key: 'Enter' }); fireEvent.blur(start);
    expect((screen.getByLabelText('Start Year') as HTMLInputElement).value).toBe('2035');
  });
  it('exposes and resets a controlled exponent without state-sync effects', () => {
    const onChange = vi.fn(); render(<ExponentSlider value={6} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: 'Power Law Exponent' }), { target: { value: '5.5' } });
    expect(onChange).toHaveBeenCalledWith(5.5);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenCalledWith(5.82);
  });
});

describe('one shared price load', () => {
  const mockFetch = () => vi.fn(async (url: string) => Response.json(url.includes('/current')
    ? { quote: { price: 100_000, observedAt: new Date().toISOString() } }
    : { prices: [{ date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), price: 99_000 }] }));
  it('requests history and quote once each and shares the result with the chart', async () => {
    const fetcher = mockFetch(); vi.stubGlobal('fetch', fetcher);
    const { result } = renderHook(() => {
      const prices = useBitcoinPrice();
      return useChartData({ coefficient: 1.0117e-17, exponent: 5.82, dateRange: presetRange('all'), prices });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.currentPrice).toBe(100_000);
    expect(result.current.isUsingFallback).toBe(false);
    expect(result.current.isStale).toBe(false);
  });
  it('refreshes periodically and stops its timer on unmount', async () => {
    vi.useFakeTimers();
    const fetcher = mockFetch(); vi.stubGlobal('fetch', fetcher);
    const { unmount } = renderHook(() => useBitcoinPrice());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS); });
    expect(fetcher).toHaveBeenCalledTimes(4);
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS); });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('aborts an in-flight request on unmount', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    }));
    const { unmount } = renderHook(() => useBitcoinPrice());
    await waitFor(() => expect(signals).toHaveLength(2));
    unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});
