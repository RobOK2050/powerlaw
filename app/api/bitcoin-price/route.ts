import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing required parameters: from, to' }, { status: 400 });
  }

  // If no API key configured, return empty to use static fallback data
  if (!COINGECKO_API_KEY) {
    return NextResponse.json({ error: 'No API key configured', useCache: true }, { status: 200 });
  }

  try {
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to).getTime() / 1000);

    const response = await fetch(
      `${COINGECKO_API}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
      {
        headers: {
          Accept: 'application/json',
          'x-cg-demo-api-key': COINGECKO_API_KEY,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      if (response.status === 429) return NextResponse.json({ error: 'Rate limited', useCache: true }, { status: 429 });
      if (response.status === 401) return NextResponse.json({ error: 'Invalid API key', useCache: true }, { status: 200 });
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      price: price,
    }));

    return NextResponse.json({ prices, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to fetch Bitcoin prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices', useCache: true }, { status: 500 });
  }
}
