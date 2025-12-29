import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface PricePoint {
  date: string;
  price: number;
}

export async function GET() {
  try {
    // Fetch last 30 days of daily data
    const recentPrices = await fetchLast30Days();

    // Also fetch current price to ensure we have today's latest
    const currentPrice = await fetchCurrentPrice();
    if (currentPrice) {
      // Add or update today's price
      const todayIndex = recentPrices.findIndex((p) => p.date === currentPrice.date);
      if (todayIndex >= 0) {
        recentPrices[todayIndex] = currentPrice;
      } else {
        recentPrices.push(currentPrice);
      }
    }

    // Sort by date
    recentPrices.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      prices: recentPrices,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch Bitcoin prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}

async function fetchLast30Days(): Promise<PricePoint[]> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error('Market chart API error:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.prices || !Array.isArray(data.prices)) {
      return [];
    }

    // Convert to daily prices, deduping by date
    const dateMap = new Map<string, number>();
    data.prices.forEach(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp).toISOString().split('T')[0];
      dateMap.set(date, price); // Later entries overwrite earlier ones for same date
    });

    return Array.from(dateMap.entries()).map(([date, price]) => ({ date, price }));
  } catch (error) {
    console.error('Failed to fetch last 30 days:', error);
    return [];
  }
}

async function fetchCurrentPrice(): Promise<PricePoint | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = data.bitcoin?.usd;
    if (!price) return null;

    const today = new Date().toISOString().split('T')[0];
    return { date: today, price };
  } catch {
    return null;
  }
}
