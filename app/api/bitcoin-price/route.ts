import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing required parameters: from, to' }, { status: 400 });
  }

  try {
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to).getTime() / 1000);

    const response = await fetch(
      `${COINGECKO_API}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 300 } }
    );

    if (!response.ok) {
      if (response.status === 429) return NextResponse.json({ error: 'Rate limited', useCache: true }, { status: 429 });
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
