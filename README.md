# Bitcoin Power Law

Interactive Next.js chart of Bitcoin observations and a configurable power-law model.

## Run locally

Requires Node.js 22.19+ (or a supported newer LTS).

```sh
npm ci
npm run dev
```

The project is linked to the Vercel project `powerlaw` and GitHub repository `RobOK2050/powerlaw`. Publishing is a separate step from local development.

## Prices and backfilling

- CoinGecko supplies daily USD prices and a separate quote with its provider observation timestamp.
- On each visit, the app restores observations saved in **this browser**, finds the earliest missing day within the free provider's rolling history window, and requests daily prices through today. Successful observations are merged and retained in local storage. Clearing browser storage removes that accumulated cache.
- Prices refresh every five minutes, on window focus, and via **Refresh prices**. The in-flight request is cancelled when the page closes. No scheduled process runs while the page is closed; the next visit recovers the missing days.
- The free API limits history to the previous 365 days. Requests use a 364-day buffer to avoid the moving boundary. Gaps older than that require a fuller licensed history source or a refreshed bundled snapshot. Browser caching is not a shared database or a cross-device archive.
- The bundled `data/bitcoin-historical.json` is a sparse fallback snapshot ending December 27, 2025. Those dates remain explicit. Missing observations break the green line; nearby dates are never substituted. All observed points are retained rather than sampled away.
- Only completed UTC daily observations are cached as history. An intraday quote is kept separately and uses the provider's `last_updated_at`. Quotes older than 15 minutes are marked stale and are excluded from today's valuation comparison.
- Partial provider failures preserve available data and display an error. A failed API request returns 400 (invalid range), 429 (rate limit), 502 (provider/data failure), or 504 (timeout). Upstream requests time out after 10 seconds; browser requests after 15 seconds.

Optional: configure `COINGECKO_API_KEY` as a **Demo API key** in `.env.local` or the Vercel project's environment settings. It is sent only from the server. The public endpoint can work without a key but remains subject to provider availability and rate limits. A paid Pro key requires the matching Pro API endpoint and is not interchangeable.

Provider documentation: [daily history](https://docs.coingecko.com/v3.0.1/reference/coins-id-market-chart), [quote timestamp](https://docs.coingecko.com/v3.0.1/reference/simple-price).

## Validation

```sh
npm run lint
npm run test:timezones
npx tsc --noEmit --incremental false
npm run build
npm audit --omit=dev
```

The regression suite covers UTC/DST dates, year controls, preset boundaries, real observation dates and gaps, backfilling between visits, cache failures, refresh/cancellation, malformed API responses, rate limits, and timeouts. `test:timezones` runs all tests in New York and repeats date/control tests in Tokyo.

The production build downloads Geist fonts from Google. It needs network access during the build.

The October 2026 dependency update resolves the production audit findings. The development audit still reports the unpatched `braces` nested-pattern denial of service through Next.js's ESLint plugin (`GHSA-vfj7-8cjw-p6xm`). Do not use `npm audit fix --force` to downgrade the framework's lint configuration to an incompatible major version.
