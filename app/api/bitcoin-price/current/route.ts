import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export async function GET() {
  try {
    // Simple price endpoint works without API key
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.bitcoin?.usd;

    if (!price) {
      throw new Error('No price data returned');
    }

    const today = new Date().toISOString().split('T')[0];

    return NextResponse.json({
      date: today,
      price: price,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch current Bitcoin price:', error);
    return NextResponse.json({ error: 'Failed to fetch current price' }, { status: 500 });
  }
}
