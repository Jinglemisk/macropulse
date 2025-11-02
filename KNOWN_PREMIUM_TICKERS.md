# Known Premium-Only Tickers on FMP Free Tier

Some stocks require a paid Financial Modeling Prep (FMP) subscription to access their detailed fundamental data on the `/quote`, `/key-metrics-ttm`, and `/financial-growth` endpoints.

## Confirmed Premium-Only Tickers

These tickers return **HTTP 402: Payment Required** on the FMP free tier:

- **SMCI** (Super Micro Computer, Inc.)
  - Error: "Premium Query Parameter: Special Endpoint: This value set for 'symbol' is not available under your current subscription"

## Workarounds

1. **Use different stocks**: Most major stocks (AAPL, MSFT, NVDA, TSLA, AMZN, META, etc.) work fine on the free tier
2. **Upgrade FMP plan**: Visit https://financialmodelingprep.com/pricing
3. **Use alternative data sources**: Consider Yahoo Finance or other APIs for premium-only stocks

## How to Identify Premium-Only Stocks

The error message will contain:
- HTTP status code: 402
- Message: "Premium Query Parameter" or "Special Endpoint"
- Reference to subscription upgrade

## Updated Error Handling

The backend now provides a user-friendly error message when attempting to add premium-only stocks:

```
"This stock requires a premium FMP subscription. The free tier doesn't include detailed data for this ticker. Consider upgrading at https://financialmodelingprep.com/pricing or try a different stock."
```

## Testing Other Tickers

To test if a ticker is premium-only, try adding it through the dashboard. If it fails with the message above, it's a premium-only ticker.

---

*Last updated: November 2, 2025*
