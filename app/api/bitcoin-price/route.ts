import { apiErrorResponse, fetchCoinGecko, historyBounds, parseDailyPrices } from '@/lib/bitcoinApi';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const now = new Date();
    const { start, end, days } = historyBounds(params.get('from'), params.get('to'), now);
    const data = await fetchCoinGecko(`/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`, request.signal);
    return Response.json({ prices: parseDailyPrices(data, start, end, now), source: 'CoinGecko' });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
