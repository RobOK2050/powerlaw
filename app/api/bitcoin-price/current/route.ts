import { apiErrorResponse, fetchCoinGecko, parseQuote } from '@/lib/bitcoinApi';

export async function GET(request: Request) {
  try {
    const data = await fetchCoinGecko('/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true', request.signal);
    return Response.json({ quote: parseQuote(data), source: 'CoinGecko' });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
