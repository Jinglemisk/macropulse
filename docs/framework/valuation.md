# Valuation

How Macropulse prices a company. Two multiples, one leverage gauge, and the mechanism
that ties every valuation back to interest rates. These are the inputs the classifier
uses to place a stock into an archetype (see [`../classification.md`](../classification.md)).

## P/E ratio
`Market cap ÷ Net income` — roughly how many years to earn back what you paid.

- **Low P/E is not automatically cheap.** Future earnings matter more than trailing.
- Use **forward** P/E (next-twelve-month estimate), not trailing — trailing earnings
  carry one-off distortions and equity investors are forward-looking.
- The classifier's `peForward` input is exactly this NTM figure.

## EV/EBITDA
`Enterprise Value ÷ EBITDA`, where
`EV = market cap + total debt + preferred + minority − cash` and
`EBITDA = operating income + D&A`.

- Values the whole business **independent of capital structure** — useful for
  leveraged, heavy-asset firms, and for money-losers with real cash flow.
- Not meaningful for banks/insurers.

## Debt / EBITDA
`Total debt ÷ EBITDA` — roughly how many years of cash flow to repay the debt; the
leverage gauge and one of the Core 4. Leverage sensitivity to Fed policy is why this
matters more each cycle: refinancing ability swings with rates.

## WACC — why rates move every multiple
Lower rates → lower **WACC** (whose risk-free component is the Treasury yield) →
future cash flows are worth more today → higher valuations and multiples. Lower rates
also rotate capital out of bonds into equities.

```
Lower rates → lower WACC → higher present value → higher multiples
```

**This is why the whole framework is Fed-centric** — the regime sets the discount rate
that prices everything. See [regime.md](regime.md).
