# Enhanced Categorization System - OpenBB Integration

> **Comprehensive enhancement plan for both Macro Regime and Stock Classification frameworks**
>
> **Date:** November 2, 2025

---

## Table of Contents

1. [Current System Overview](#current-system-overview)
2. [Part 1: Macro Regime Enhancements](#part-1-macro-regime-enhancements)
3. [Part 2: Stock Classification Enhancements](#part-2-stock-classification-enhancements)
4. [Part 3: Implementation Guide](#part-3-implementation-guide)
5. [Part 4: Database & API Changes](#part-4-database--api-changes)

---

# Current System Overview

## Stock Classification Framework (4 Variables)
Each stock is scored against 4 classes (A/B/C/D) using:
- **Revenue Growth** (%)
- **EPS Growth** (%)
- **P/E Forward** (next 12-month forecast)
- **Debt/EBITDA** (leverage ratio)

Uses triangular closeness function: `Tri(x, center, halfwidth)`

## Macro Regime Framework (2 Variables)
Overall market regime determined by:
- **DFF** (Fed Funds Rate) - position in 1-year range
- **WALCL** (Fed Balance Sheet) - 12-week slope direction

Creates 4 regimes:
- Most Liquid (Low rates + QE)
- Least Liquid (High rates + QT)
- In Between (prefer B) - High rates + QE
- In Between (prefer C) - Low rates + QT

---

# Part 1: Macro Regime Enhancements

## Overview
Add **10 key economic indicators** to complement the existing DFF + WALCL framework.

For each indicator, we track:
- **Current Value** - Latest reading
- **Expected/Consensus** - Market expectations (when available)
- **Previous Period** - Last month or last quarter comparison
- **Regime Impact** - How it modifies regime confidence/allocation

---

## 1. CPI (Consumer Price Index)

### What It Measures
Inflation at consumer level - key Fed policy driver

### OpenBB Endpoint
```python
# Current CPI
current_cpi = obb.economy.cpi(
    countries="united_states",
    frequency="monthly",
    provider="fred"
).to_df()

# Year-over-year calculation
cpi_yoy = ((current_cpi['value'].iloc[-1] / current_cpi['value'].iloc[-13]) - 1) * 100
```

### Alternative FRED Series
```python
# Direct YoY inflation rate
cpi_data = obb.economy.fred_series(
    symbol="CPIAUCSL",  # CPI All Urban Consumers
    provider="fred"
).to_df()
```

### Getting Current vs Expected vs Previous
```python
# Current (latest month)
current_value = cpi_data['value'].iloc[-1]

# Previous month
previous_month = cpi_data['value'].iloc[-2]

# Previous quarter (3 months ago)
previous_quarter = cpi_data['value'].iloc[-4]

# Expected value from Economic Calendar
expected_cpi = obb.economy.calendar(
    start_date="2025-11-01",
    end_date="2025-11-30",
    group="inflation",
    importance="High",
    provider="fmp"
).to_df()
# Filter for CPI release, get 'estimate' field
```

### Regime Impact Thresholds
```javascript
// In backend/services/regimeCalculator.js
const cpiThresholds = {
    deflationary: 0.0,     // YoY < 0%
    belowTarget: 2.0,      // Fed target
    targetRange: 3.0,      // Acceptable
    elevated: 4.0,         // Concerning
    dangerous: 5.0         // Crisis level
};

function assessInflationRegime(cpi_yoy) {
    if (cpi_yoy < 2.0) return { status: 'Below Target', impact: 'dovish' };
    if (cpi_yoy <= 3.0) return { status: 'At Target', impact: 'neutral' };
    if (cpi_yoy <= 4.0) return { status: 'Elevated', impact: 'hawkish_moderate' };
    return { status: 'High', impact: 'hawkish_aggressive' };
}
```

### Regime Adjustment Logic
```javascript
// Most Liquid regime BUT high CPI = unstable, reduce confidence
if (baseRegime === 'Most Liquid' && cpi_yoy > 4.0) {
    regimeConfidence -= 30;  // Reduce from 100%
    allocationAdjustment = {
        D: 'reduce by 20-30%',
        C: 'increase by 20-30%',
        reasoning: 'Fed likely to tighten despite current low rates'
    };
}

// Least Liquid regime BUT low CPI = pivot incoming
if (baseRegime === 'Least Liquid' && cpi_yoy < 2.0) {
    regimeConfidence -= 20;
    allocationAdjustment = {
        A: 'reduce allocation',
        B: 'increase allocation',
        reasoning: 'Fed likely to cut rates soon'
    };
}
```

---

## 2. 10Y-2Y Treasury Yield Spread

### What It Measures
Yield curve shape - inverted curve (negative spread) predicts recession

### OpenBB Endpoint
```python
# Get Treasury rates
treasury_rates = obb.fixedincome.government.treasury_rates(
    provider="fred"
).to_df()

# Calculate spread
latest_rates = treasury_rates.iloc[-1]
spread_10y_2y = latest_rates['10Y'] - latest_rates['2Y']
```

### Alternative: Direct Spread Series
```python
# FRED has pre-calculated spread
spread_data = obb.economy.fred_series(
    symbol="T10Y2Y",  # 10-Year minus 2-Year
    provider="fred"
).to_df()

current_spread = spread_data['value'].iloc[-1]
previous_month = spread_data['value'].iloc[-30]  # ~30 days ago
```

### Getting Current vs Expected vs Previous
```python
# Current
current_spread = spread_data['value'].iloc[-1]

# Previous month
previous_month_spread = spread_data['value'].iloc[-30]

# Previous quarter
previous_quarter_spread = spread_data['value'].iloc[-90]

# Trend direction
spread_trend = 'steepening' if current_spread > previous_month_spread else 'flattening'
```

### Regime Impact Thresholds
```javascript
const yieldCurveThresholds = {
    deeplyInverted: -0.5,    // Strong recession signal
    inverted: 0.0,           // Recession warning
    flat: 0.25,              // Neutral/concerning
    normal: 0.75,            // Healthy
    steep: 1.5               // Very expansionary
};

function assessYieldCurve(spread) {
    if (spread < -0.5) return { status: 'Deeply Inverted', recession_risk: 'high' };
    if (spread < 0) return { status: 'Inverted', recession_risk: 'elevated' };
    if (spread < 0.25) return { status: 'Flat', recession_risk: 'moderate' };
    if (spread < 1.5) return { status: 'Normal', recession_risk: 'low' };
    return { status: 'Steep', recession_risk: 'very_low' };
}
```

### Regime Adjustment Logic
```javascript
// Inverted curve overrides bullish regime signals
if (spread_10y_2y < 0) {
    regimeConfidence -= 40;  // Major warning

    if (baseRegime === 'Most Liquid') {
        allocationAdjustment = {
            D: 'reduce to 0-30%',
            C: 'reduce to 20-40%',
            B: 'increase to 30-50%',
            A: 'increase to 20-30%',
            reasoning: 'Yield curve inversion signals recession despite liquidity'
        };
    }
}

// Steep curve confirms expansionary regime
if (spread_10y_2y > 1.5 && baseRegime === 'Most Liquid') {
    regimeConfidence += 20;  // High confidence
    allocationAdjustment = {
        D: 'increase to 60-100%',
        reasoning: 'Strong growth signals confirm liquidity conditions'
    };
}
```

---

## 3. Unemployment Rate

### What It Measures
Labor market health - lagging indicator but critical for Fed policy

### OpenBB Endpoint
```python
# US Unemployment Rate
unemployment = obb.economy.unemployment(
    country="united_states",
    provider="oecd"
).to_df()

current_rate = unemployment['value'].iloc[-1]
```

### Alternative FRED Series
```python
# UNRATE - more frequently updated
unrate_data = obb.economy.fred_series(
    symbol="UNRATE",
    provider="fred"
).to_df()

current_unrate = unrate_data['value'].iloc[-1]
previous_month = unrate_data['value'].iloc[-2]
previous_quarter = unrate_data['value'].iloc[-4]
```

### Getting Current vs Expected vs Previous
```python
# Current
current = unrate_data['value'].iloc[-1]

# Previous month
prev_month = unrate_data['value'].iloc[-2]

# Previous quarter (3 months ago)
prev_quarter = unrate_data['value'].iloc[-4]

# Year ago (for annual comparison)
year_ago = unrate_data['value'].iloc[-13]

# Direction
unemployment_trend = 'rising' if current > prev_month else 'falling'

# Expected from calendar
expected_unrate = obb.economy.calendar(
    group="labour",
    importance="High",
    provider="fmp"
).to_df()
# Filter for unemployment release
```

### Regime Impact Thresholds
```javascript
const unemploymentThresholds = {
    veryLow: 3.5,      // Full employment
    healthy: 4.0,      // Normal
    elevated: 5.0,     // Concerning
    high: 6.0,         // Recessionary
    crisis: 8.0        // Deep recession
};

function assessLaborMarket(unrate, previous) {
    const trend = unrate > previous ? 'deteriorating' : 'improving';

    if (unrate < 3.5) return { status: 'Very Tight', risk: 'inflation' };
    if (unrate < 4.5) return { status: 'Healthy', risk: 'low' };
    if (unrate < 6.0) return { status: 'Weakening', risk: 'moderate' };
    return { status: 'Weak', risk: 'recession' };
}
```

### Regime Adjustment Logic
```javascript
// Rising unemployment = recession risk
const unemploymentChange = current_unrate - unrate_3months_ago;

if (unemploymentChange > 0.5) {  // Rising by 0.5% in 3 months
    regimeConfidence -= 30;

    if (baseRegime === 'Most Liquid' || baseRegime === 'In Between (prefer C)') {
        allocationAdjustment = {
            D: 'reduce significantly',
            C: 'reduce moderately',
            B: 'increase to defensive growth',
            A: 'increase to defensive value',
            reasoning: 'Rising unemployment signals economic slowdown'
        };
    }
}

// Very low unemployment = inflation risk
if (current_unrate < 3.5 && baseRegime === 'Most Liquid') {
    allocationAdjustment = {
        note: 'Labor market too tight - inflation risk - Fed likely to tighten',
        confidence_reduction: 15
    };
}
```

---

## 4. Labor Force Participation Rate

### What It Measures
Percentage of working-age population employed or seeking work - quality of employment recovery

### OpenBB Endpoint
```python
# FRED series for labor force participation
lfpr_data = obb.economy.fred_series(
    symbol="CIVPART",  # Civilian Labor Force Participation Rate
    provider="fred"
).to_df()

current_lfpr = lfpr_data['value'].iloc[-1]
previous_month = lfpr_data['value'].iloc[-2]
```

### Getting Current vs Expected vs Previous
```python
# Current
current = lfpr_data['value'].iloc[-1]

# Previous month
prev_month = lfpr_data['value'].iloc[-2]

# Previous quarter
prev_quarter = lfpr_data['value'].iloc[-4]

# Pre-pandemic baseline (Feb 2020)
pre_pandemic = lfpr_data[lfpr_data['date'] == '2020-02-01']['value'].iloc[0]

# Recovery progress
recovery_pct = (current - lfpr_data['value'].min()) / (pre_pandemic - lfpr_data['value'].min())
```

### Regime Impact Thresholds
```javascript
const lfprThresholds = {
    crisis: 60.0,          // Deep recession
    low: 62.0,             // Weak
    recovering: 63.0,      // Improving
    healthy: 63.5,         // Normal (pre-2020)
    strong: 64.0           // Very strong
};

function assessLaborParticipation(lfpr, previous) {
    const trend = lfpr > previous ? 'improving' : 'weakening';

    if (lfpr < 62.0) return { status: 'Very Weak', economic_health: 'poor' };
    if (lfpr < 63.0) return { status: 'Weak', economic_health: 'below_normal' };
    if (lfpr < 63.5) return { status: 'Recovering', economic_health: 'improving' };
    return { status: 'Healthy', economic_health: 'strong' };
}
```

### Regime Adjustment Logic
```javascript
// Falling LFPR = weak labor market despite low unemployment
if (current_lfpr < previous_quarter_lfpr - 0.2) {
    regimeNote = 'Labor force participation declining - hidden weakness in employment';

    // Don't fully trust low unemployment if LFPR is falling
    if (current_unrate < 4.0 && lfpr_trend === 'weakening') {
        allocationAdjustment = {
            note: 'Low unemployment may be misleading - workers leaving labor force',
            confidence_reduction: 10
        };
    }
}
```

---

## 5. Real GDP Growth Rate

### What It Measures
Inflation-adjusted economic output growth - the ultimate measure of economic health

### OpenBB Endpoint
```python
# Real GDP data
real_gdp = obb.economy.gdp.real(
    country="usa",
    provider="oecd"
).to_df()

# Calculate quarter-over-quarter growth rate (annualized)
current_gdp = real_gdp['value'].iloc[-1]
previous_quarter = real_gdp['value'].iloc[-2]
gdp_growth_qoq = ((current_gdp / previous_quarter) ** 4 - 1) * 100  # Annualized

# Year-over-year
year_ago = real_gdp['value'].iloc[-5]  # 4 quarters ago
gdp_growth_yoy = ((current_gdp / year_ago) - 1) * 100
```

### Alternative FRED Series
```python
# Direct GDP data
gdp_data = obb.economy.fred_series(
    symbol="GDPC1",  # Real Gross Domestic Product
    provider="fred"
).to_df()
```

### Getting Current vs Expected vs Previous
```python
# Current quarter (latest)
current = gdp_data['value'].iloc[-1]

# Previous quarter
prev_quarter = gdp_data['value'].iloc[-2]

# Quarter-over-quarter annualized growth
qoq_growth = ((current / prev_quarter) ** 4 - 1) * 100

# Expected GDP from Economic Calendar
expected_gdp = obb.economy.calendar(
    group="gdp",
    importance="High",
    provider="fmp"
).to_df()
# Look for "GDP Growth Rate QoQ" release
```

### Regime Impact Thresholds
```javascript
const gdpGrowthThresholds = {
    recession: 0.0,        // Negative growth
    stagnant: 1.0,         // Very weak
    belowTrend: 2.0,       // Below potential
    trend: 2.5,            // Trend growth
    strong: 3.5,           // Above trend
    boom: 5.0              // Overheating
};

function assessGDPGrowth(gdp_growth_rate) {
    if (gdp_growth_rate < 0) return { status: 'Recession', risk: 'high' };
    if (gdp_growth_rate < 1.0) return { status: 'Stagnant', risk: 'elevated' };
    if (gdp_growth_rate < 2.0) return { status: 'Below Trend', risk: 'moderate' };
    if (gdp_growth_rate < 3.5) return { status: 'Trend Growth', risk: 'low' };
    if (gdp_growth_rate < 5.0) return { status: 'Strong', risk: 'low' };
    return { status: 'Booming', risk: 'overheating' };
}
```

### Regime Adjustment Logic
```javascript
// Negative GDP growth = recession
if (gdp_growth_qoq < 0) {
    regimeConfidence -= 50;  // Major impact

    allocationAdjustment = {
        D: 'reduce to 0-10%',
        C: 'reduce to 10-20%',
        B: 'reduce to 20-40%',
        A: 'increase to 50-70%',
        reasoning: 'Negative GDP growth - recession confirmed'
    };
}

// Strong GDP growth confirms Most Liquid regime
if (gdp_growth_qoq > 3.5 && baseRegime === 'Most Liquid') {
    regimeConfidence += 25;

    allocationAdjustment = {
        D: 'increase to 60-100%',
        C: 'moderate allocation 20-30%',
        reasoning: 'Strong GDP growth supports hypergrowth stocks'
    };
}

// GDP growth decelerating = early warning
const gdp_momentum = gdp_growth_qoq - gdp_growth_previous_quarter;
if (gdp_momentum < -1.0) {  // Slowing by >1% point
    regimeNote = 'GDP growth decelerating - monitor closely';
    regimeConfidence -= 15;
}
```

---

## 6. GDP Forecasts

### What It Measures
Forward-looking economic growth expectations

### OpenBB Endpoint
```python
# GDP forecasts from OECD
gdp_forecast = obb.economy.gdp.forecast(
    country="usa",
    provider="oecd"
).to_df()

# Get next year's forecast
next_year_forecast = gdp_forecast[gdp_forecast['period'] == 'next_year']['value'].iloc[0]
```

### Alternative: Economic Calendar Consensus
```python
# Upcoming GDP releases with consensus
gdp_calendar = obb.economy.calendar(
    start_date="2025-11-01",
    end_date="2026-12-31",
    group="gdp",
    importance="High",
    provider="fmp"
).to_df()

# Extract consensus forecasts
consensus_forecast = gdp_calendar['estimate'].mean()
```

### Getting Current vs Forecast vs Revision
```python
# Current actual
current_gdp_growth = 2.8  # From Real GDP calculation above

# Consensus forecast for next quarter
next_quarter_forecast = gdp_calendar['estimate'].iloc[0]

# Forecast error (actual vs expected)
forecast_miss = current_gdp_growth - previous_quarter_forecast

# Trend in forecasts (are they being revised up or down?)
forecast_trend = 'upgrading' if next_quarter_forecast > current_quarter_forecast else 'downgrading'
```

### Regime Impact Logic
```javascript
// Positive surprises = stronger regime confidence
if (actual_gdp > forecast_gdp + 0.5) {
    regimeNote = 'GDP beating expectations - economy stronger than anticipated';
    regimeConfidence += 10;
}

// Negative surprises = weaken regime confidence
if (actual_gdp < forecast_gdp - 0.5) {
    regimeNote = 'GDP missing expectations - economy weaker than anticipated';
    regimeConfidence -= 15;
}

// Forecast downgrades = early warning
if (next_quarter_forecast < current_quarter_forecast) {
    regimeNote = 'GDP forecasts being revised down - slowing expected';
    allocationAdjustment = {
        D: 'reduce allocation by 10-15%',
        reasoning: 'Deteriorating growth outlook'
    };
}
```

---

## 7. M2 Money Supply

### What It Measures
Broad money supply - captures liquidity in the financial system beyond bank reserves

### OpenBB Endpoint
```python
# M2 Money Stock
m2_data = obb.economy.fred_series(
    symbol="M2SL",  # M2 Money Stock (Seasonally Adjusted)
    provider="fred"
).to_df()

current_m2 = m2_data['value'].iloc[-1]
previous_month = m2_data['value'].iloc[-2]
year_ago = m2_data['value'].iloc[-13]

# Year-over-year growth rate
m2_growth_yoy = ((current_m2 / year_ago) - 1) * 100
```

### Alternative: M2 Velocity
```python
# M2 Velocity of Money (GDP / M2)
m2_velocity = obb.economy.fred_series(
    symbol="M2V",
    provider="fred"
).to_df()

# Rising velocity = inflation risk
# Falling velocity = deflationary/stagnant
```

### Getting Current vs Expected vs Previous
```python
# Current
current = m2_data['value'].iloc[-1]

# Previous month
prev_month = m2_data['value'].iloc[-2]

# Previous quarter
prev_quarter = m2_data['value'].iloc[-4]

# 3-month growth rate (annualized)
m2_growth_3m = ((current / prev_quarter) ** 4 - 1) * 100

# Year-over-year
m2_growth_yoy = ((current / m2_data['value'].iloc[-13]) - 1) * 100
```

### Regime Impact Thresholds
```javascript
const m2GrowthThresholds = {
    contraction: 0.0,      // M2 shrinking (very rare, deflationary)
    low: 2.0,              // Below normal
    normal: 6.0,           // Historical average
    elevated: 10.0,        // High growth
    excessive: 15.0        // Inflation risk
};

function assessMoneySupply(m2_growth_yoy) {
    if (m2_growth_yoy < 0) return { status: 'Contracting', risk: 'deflation' };
    if (m2_growth_yoy < 2.0) return { status: 'Low Growth', risk: 'tight_conditions' };
    if (m2_growth_yoy < 10.0) return { status: 'Normal', risk: 'low' };
    if (m2_growth_yoy < 15.0) return { status: 'Elevated', risk: 'inflation' };
    return { status: 'Excessive', risk: 'high_inflation' };
}
```

### Regime Adjustment Logic
```javascript
// M2 growth complements WALCL (Fed balance sheet)
// High M2 growth + expanding WALCL = very liquid
// Low/negative M2 growth + shrinking WALCL = very tight

if (m2_growth_yoy > 10.0 && balanceSheetIncreasing) {
    regimeNote = 'Broad money supply expanding rapidly - highly liquid conditions';
    regimeConfidence += 15;

    if (baseRegime === 'Most Liquid') {
        allocationAdjustment = {
            D: 'increase to maximum allocation',
            reasoning: 'Both narrow (Fed) and broad (M2) money expanding'
        };
    }
}

// M2 contracting despite Fed expansion = credit transmission broken
if (m2_growth_yoy < 0 && balanceSheetIncreasing) {
    regimeNote = 'WARNING: M2 contracting despite Fed QE - credit system impaired';
    regimeConfidence -= 30;

    allocationAdjustment = {
        D: 'reduce significantly',
        A: 'increase to defensive',
        reasoning: 'Fed liquidity not reaching broader economy'
    };
}
```

---

## 8. RRP (Reverse Repo)

### What It Measures
Overnight reverse repurchase agreements - excess liquidity parked at Fed, indicates money market conditions

### OpenBB Endpoint
```python
# Reverse Repo Operations
rrp_data = obb.economy.fred_series(
    symbol="RRPONTSYD",  # Overnight Reverse Repo (billions)
    provider="fred"
).to_df()

current_rrp = rrp_data['value'].iloc[-1]
previous_week = rrp_data['value'].iloc[-7]
peak_rrp = rrp_data['value'].max()
```

### Getting Current vs Previous
```python
# Current
current = rrp_data['value'].iloc[-1]

# Previous week
prev_week = rrp_data['value'].iloc[-7]

# Previous month
prev_month = rrp_data['value'].iloc[-30]

# Trend (draining or building?)
rrp_trend = 'draining' if current < prev_month else 'building'

# Distance from peak
peak = rrp_data['value'].max()
pct_from_peak = ((current / peak) - 1) * 100
```

### Regime Impact Thresholds
```javascript
const rrpThresholds = {
    minimal: 100,          // < $100B (normal)
    moderate: 500,         // $100-500B (some excess)
    elevated: 1000,        // $500B-1T (significant excess)
    high: 2000,            // $1-2T (very high excess)
    extreme: 2500          // > $2.5T (extreme excess liquidity)
};

function assessRRP(rrp_billions) {
    if (rrp_billions < 100) return { status: 'Minimal', liquidity: 'tight' };
    if (rrp_billions < 500) return { status: 'Moderate', liquidity: 'normal' };
    if (rrp_billions < 1000) return { status: 'Elevated', liquidity: 'ample' };
    if (rrp_billions < 2000) return { status: 'High', liquidity: 'excess' };
    return { status: 'Extreme', liquidity: 'flooded' };
}
```

### Regime Adjustment Logic
```javascript
// High RRP = excess liquidity (but parked, not deployed)
// Draining RRP = liquidity being deployed into markets (bullish)
// Building RRP = liquidity being withdrawn from markets (bearish)

if (rrp_trend === 'draining' && current_rrp > 500) {
    regimeNote = 'RRP draining - liquidity flowing into markets';

    if (baseRegime === 'Most Liquid') {
        regimeConfidence += 10;
        allocationAdjustment = {
            D: 'favor - liquidity deployment supports risk assets',
            reasoning: 'Cash moving from Fed RRP into productive assets'
        };
    }
}

if (rrp_trend === 'building' && current_rrp < peak_rrp * 0.5) {
    regimeNote = 'RRP building despite low levels - money market stress signal';
    regimeConfidence -= 15;
    allocationAdjustment = {
        note: 'Money market participants seeking Fed facility safety',
        reasoning: 'Potential credit market concern'
    };
}

// Extreme RRP = QE effectiveness limited
if (current_rrp > 2000 && balanceSheetIncreasing) {
    regimeNote = 'Very high RRP - Fed liquidity not reaching real economy';
    regimeConfidence -= 10;
}
```

---

## 9. Consumer Confidence (University of Michigan)

### What It Measures
Consumer sentiment and expectations - leading indicator of consumer spending (70% of GDP)

### OpenBB Endpoint
```python
# University of Michigan Consumer Sentiment
consumer_sentiment = obb.economy.survey.university_of_michigan(
    provider="fred"
).to_df()

current_sentiment = consumer_sentiment['value'].iloc[-1]
previous_month = consumer_sentiment['value'].iloc[-2]
```

### Alternative FRED Series
```python
# UMCSENT - University of Michigan Consumer Sentiment Index
umcsent_data = obb.economy.fred_series(
    symbol="UMCSENT",
    provider="fred"
).to_df()

current = umcsent_data['value'].iloc[-1]
```

### Getting Current vs Expected vs Previous
```python
# Current (latest month)
current = umcsent_data['value'].iloc[-1]

# Previous month
prev_month = umcsent_data['value'].iloc[-2]

# Previous quarter
prev_quarter = umcsent_data['value'].iloc[-4]

# Year ago
year_ago = umcsent_data['value'].iloc[-13]

# Trend
sentiment_trend = 'improving' if current > prev_month else 'deteriorating'

# Expected from economic calendar
expected_umich = obb.economy.calendar(
    group="consumer",
    importance="High",
    provider="fmp"
).to_df()
# Filter for "Michigan Consumer Sentiment"
```

### Regime Impact Thresholds
```javascript
const consumerSentimentThresholds = {
    crisis: 55,            // Extreme pessimism (2008, 2020)
    pessimistic: 65,       // Weak sentiment
    neutral: 75,           // Mixed
    optimistic: 85,        // Healthy
    euphoric: 95           // Very strong
};

function assessConsumerSentiment(sentiment) {
    if (sentiment < 60) return { status: 'Very Weak', spending_outlook: 'poor' };
    if (sentiment < 70) return { status: 'Weak', spending_outlook: 'below_average' };
    if (sentiment < 80) return { status: 'Moderate', spending_outlook: 'average' };
    if (sentiment < 90) return { status: 'Strong', spending_outlook: 'good' };
    return { status: 'Very Strong', spending_outlook: 'excellent' };
}
```

### Regime Adjustment Logic
```javascript
// Consumer sentiment drives consumer spending (70% of GDP)
// Weak sentiment = forward-looking recession risk

if (current_sentiment < 65) {
    regimeNote = 'Consumer sentiment very weak - recession risk elevated';
    regimeConfidence -= 20;

    allocationAdjustment = {
        D: 'reduce allocation by 20-30%',
        C: 'reduce allocation by 10-20%',
        B: 'maintain or increase',
        A: 'increase allocation',
        reasoning: 'Weak consumer spending outlook threatens growth'
    };
}

// Rapidly deteriorating sentiment = early warning
const sentiment_change = current_sentiment - sentiment_3months_ago;
if (sentiment_change < -10) {  // Falling by 10+ points
    regimeNote = 'Consumer sentiment deteriorating rapidly - early recession warning';
    regimeConfidence -= 25;
}

// High sentiment confirms Most Liquid regime
if (current_sentiment > 85 && baseRegime === 'Most Liquid') {
    regimeConfidence += 15;
    allocationAdjustment = {
        D: 'increase allocation',
        reasoning: 'Strong consumer confidence supports growth stocks'
    };
}
```

---

## 10. VIX (Fear Index / Volatility)

### What It Measures
Market implied volatility (S&P 500 options) - fear gauge and risk appetite

### OpenBB Endpoint
```python
# VIX is typically accessed via equity/index endpoints
# Alternative: Get VIX as index data
vix_data = obb.index.price.historical(
    symbol="^VIX",
    provider="yfinance"
).to_df()

current_vix = vix_data['close'].iloc[-1]
```

### Alternative: FRED Series
```python
# VIXCLS - CBOE Volatility Index (closing level)
vix_data = obb.economy.fred_series(
    symbol="VIXCLS",
    provider="fred"
).to_df()

current_vix = vix_data['value'].iloc[-1]
previous_week = vix_data['value'].iloc[-7]
```

### Getting Current vs Previous
```python
# Current
current = vix_data['value'].iloc[-1]

# Previous day
prev_day = vix_data['value'].iloc[-2]

# Previous week
prev_week = vix_data['value'].iloc[-7]

# Previous month
prev_month = vix_data['value'].iloc[-30]

# Trend
vix_trend = 'rising' if current > prev_week else 'falling'

# Spike detection
vix_spike = (current - prev_week) > 5  # 5-point jump = spike
```

### Regime Impact Thresholds
```javascript
const vixThresholds = {
    complacent: 12,        // Very low fear
    calm: 15,              // Low volatility
    normal: 20,            // Average
    elevated: 25,          // Concern
    fear: 30,              // Fear
    panic: 40,             // Panic
    crisis: 50             // Extreme crisis
};

function assessMarketFear(vix) {
    if (vix < 12) return { status: 'Complacent', risk: 'low_vol_regime' };
    if (vix < 15) return { status: 'Calm', risk: 'low' };
    if (vix < 20) return { status: 'Normal', risk: 'moderate' };
    if (vix < 30) return { status: 'Elevated', risk: 'high' };
    if (vix < 40) return { status: 'Fear', risk: 'very_high' };
    return { status: 'Panic', risk: 'extreme' };
}
```

### Regime Adjustment Logic
```javascript
// High VIX overrides bullish macro signals
if (current_vix > 30) {
    regimeNote = 'Market fear elevated (VIX > 30) - reduce risk exposure';
    regimeConfidence -= 30;

    allocationAdjustment = {
        D: 'reduce to 0-20%',
        C: 'reduce to 10-30%',
        B: 'increase to 30-50%',
        A: 'increase to 30-40%',
        reasoning: 'High volatility environment unfavorable for growth stocks'
    };
}

// VIX spike = crisis/panic selling
if (vix_spike && current_vix > 25) {
    regimeNote = '⚠️ VIX SPIKE DETECTED - Market stress event';
    regimeConfidence -= 40;

    allocationAdjustment = {
        immediate_action: 'Reduce growth exposure immediately',
        D: 'reduce to 0-10%',
        A: 'increase to 50-70%',
        reasoning: 'Volatility spike indicates potential systemic risk'
    };
}

// Low VIX confirms Most Liquid regime
if (current_vix < 15 && baseRegime === 'Most Liquid') {
    regimeConfidence += 10;
    allocationAdjustment = {
        D: 'favorable environment - low fear supports risk-on',
        reasoning: 'Low volatility supports hypergrowth allocations'
    };
}

// VIX falling from elevated levels = "buying the dip" opportunity
if (current_vix < 25 && prev_week_vix > 30) {
    regimeNote = 'VIX declining from elevated levels - fear subsiding';
    allocationAdjustment = {
        D: 'consider increasing allocation',
        reasoning: 'Volatility normalizing - opportunity to add risk'
    };
}
```

---

# Part 2: Stock Classification Enhancements

## Overview

Add **2 new fundamental metrics** to the existing 4-variable classification system:

**Existing Metrics:**
1. Revenue Growth (%)
2. EPS Growth (%)
3. P/E Forward (ratio)
4. Debt/EBITDA (ratio)

**NEW Metrics:**
5. **Operating Margin** (%) - Profitability quality
6. **Free Cash Flow Margin** (%) - Cash generation quality

---

## Rationale for New Metrics

### Why Operating Margin?
- **Validates Earnings Quality**: High EPS growth means nothing if margins are terrible
- **Business Model Strength**: High margins = pricing power, moats, efficiency
- **Sustainability Indicator**: Margin expansion = sustainable growth, contraction = unsustainable
- **Class Differentiation**:
  - Class A: Mature companies with stable, high margins
  - Class B: Growing companies maintaining margins
  - Class C: Fast growers potentially sacrificing margins for growth
  - Class D: Hypergrowth often has negative or improving margins

### Why Free Cash Flow Margin?
- **Validates Revenue Growth**: Revenue growth is meaningless if it doesn't convert to cash
- **Capital Efficiency**: High FCF margin = efficient growth, low capex requirements
- **Financial Health**: Positive FCF = self-funding growth, negative = reliant on financing
- **Class Differentiation**:
  - Class A: High, stable FCF - dividend/buyback capability
  - Class B: Moderate FCF - balanced growth + returns
  - Class C: Lower FCF - reinvesting for growth
  - Class D: Negative or minimal FCF - growth at all costs

---

## Metric 5: Operating Margin

### Definition
```
Operating Margin = (Operating Income / Revenue) × 100
```

Operating Income = Revenue - COGS - Operating Expenses (before interest and taxes)

### How to Source via OpenBB/FMP

```javascript
// In backend/apis/fmp.js

async function getFundamentals(ticker) {
    // ... existing code ...

    // Add income statement data
    const incomeStatement = await fetchJSON(
        `${FMP_BASE_URL}/income-statement/${ticker}?period=annual&limit=1&apikey=${API_KEY}`
    );

    // Calculate operating margin
    const revenue = incomeStatement[0]?.revenue;
    const operatingIncome = incomeStatement[0]?.operatingIncome;
    const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : null;

    return {
        // ... existing fundamentals ...
        operatingMargin: operatingMargin
    };
}
```

### Class Target Configurations

#### Class A: Mature Value
**Target:** High, stable margins (premium business model)
```javascript
A: {
    operatingMargin: {
        center: 25,      // 25% operating margin (high quality)
        halfwidth: 15    // Accept 10% to 40%
    }
}
```

**Reasoning:**
- Mature companies should have optimized operations
- Strong pricing power and brand moats
- Examples: AAPL (30%), MSFT (42%), KO (27%)

#### Class B: Steady Growth
**Target:** Good margins, room for improvement
```javascript
B: {
    operatingMargin: {
        center: 15,      // 15% operating margin (solid)
        halfwidth: 10    // Accept 5% to 25%
    }
}
```

**Reasoning:**
- Growing companies with proven profitability
- Balanced growth + efficiency
- Examples: Many S&P 500 companies average 10-15%

#### Class C: Higher Growth
**Target:** Moderate margins, growth > efficiency
```javascript
C: {
    operatingMargin: {
        center: 8,       // 8% operating margin (moderate)
        halfwidth: 8     // Accept 0% to 16%
    }
}
```

**Reasoning:**
- Fast-growing companies may sacrifice short-term margins
- Investing heavily in expansion
- Path to profitability visible

#### Class D: Hypergrowth
**Target:** Low/negative margins acceptable (growth at all costs)
```javascript
D: {
    operatingMargin: {
        center: -5,      // -5% (may be unprofitable)
        halfwidth: 15    // Accept -20% to +10%
    }
}
```

**Reasoning:**
- Hypergrowth companies often unprofitable
- Massive investment in R&D, sales, marketing
- Examples: Many pre-profit tech companies
- Note: Very high margins (>30%) can also fit D if combined with extreme growth

**Special Case:** Also score positively for exceptionally high margins (>40%) if company is hypergrowth:
```javascript
// In classifier.js
if (operatingMargin > 40 && revenueGrowth > 30) {
    // Premium hypergrowth - scores high in D
    d_margin_score = 1.0;
}
```

---

## Metric 6: Free Cash Flow Margin

### Definition
```
FCF Margin = (Free Cash Flow / Revenue) × 100

Free Cash Flow = Operating Cash Flow - Capital Expenditures
```

### How to Source via OpenBB/FMP

```javascript
// In backend/apis/fmp.js

async function getFundamentals(ticker) {
    // ... existing code ...

    // Add cash flow statement data
    const cashFlow = await fetchJSON(
        `${FMP_BASE_URL}/cash-flow-statement/${ticker}?period=annual&limit=1&apikey=${API_KEY}`
    );

    // Get revenue from income statement (already fetched above)
    const revenue = incomeStatement[0]?.revenue;

    // Calculate FCF margin
    const operatingCashFlow = cashFlow[0]?.operatingCashFlow;
    const capex = cashFlow[0]?.capitalExpenditure;  // Note: usually negative
    const freeCashFlow = operatingCashFlow + capex;  // capex is negative, so we add
    const fcfMargin = revenue > 0 ? (freeCashFlow / revenue) * 100 : null;

    return {
        // ... existing fundamentals ...
        fcfMargin: fcfMargin
    };
}
```

### Class Target Configurations

#### Class A: Mature Value
**Target:** High, consistent FCF generation
```javascript
A: {
    fcfMargin: {
        center: 15,      // 15% FCF margin (cash cow)
        halfwidth: 10    // Accept 5% to 25%
    }
}
```

**Reasoning:**
- Mature companies should convert earnings to cash efficiently
- Low capex requirements (mature business model)
- Can return cash to shareholders
- Examples: KO, PEP, PG - stable FCF generators

#### Class B: Steady Growth
**Target:** Positive FCF, moderate levels
```javascript
B: {
    fcfMargin: {
        center: 10,      // 10% FCF margin (solid)
        halfwidth: 8     // Accept 2% to 18%
    }
}
```

**Reasoning:**
- Growing companies need capex but should generate cash
- Balanced reinvestment + shareholder returns
- Self-sustaining growth model

#### Class C: Higher Growth
**Target:** Lower FCF acceptable (reinvesting)
```javascript
C: {
    fcfMargin: {
        center: 3,       // 3% FCF margin (minimal)
        halfwidth: 8     // Accept -5% to 11%
    }
}
```

**Reasoning:**
- Fast-growing companies reinvest heavily
- Slight negative FCF acceptable if offset by strong growth
- Capital-intensive expansion phase

#### Class D: Hypergrowth
**Target:** Negative FCF acceptable (growth requires funding)
```javascript
D: {
    fcfMargin: {
        center: -10,     // -10% FCF margin (cash burner)
        halfwidth: 15    // Accept -25% to +5%
    }
}
```

**Reasoning:**
- Hypergrowth requires massive capital investment
- Revenue growth > cash flow concerns
- Acceptable if company has funding runway
- Many pre-profit SaaS, tech companies

---

## Updated Classification Logic

### File: `backend/services/classifier.js`

```javascript
const { tri } = require('../utils/formulas');
const config = require('../config');

/**
 * Calculate class scores for a stock (ENHANCED WITH 6 METRICS)
 * @param {Object} fundamentals - All fundamental metrics
 * @returns {Object} - { A, B, C, D, finalClass, confidence }
 */
function classifyStock(fundamentals) {
    const {
        revenueGrowth,
        epsGrowth,
        peForward,
        debtEbitda,
        operatingMargin,      // NEW
        fcfMargin,            // NEW
        epsPositive,
        ebitdaPositive,
        peAvailable
    } = fundamentals;

    const targets = config.classTargets;

    // --- Class A Score (6 metrics) ---
    const aScores = [
        tri(revenueGrowth, targets.A.revenueGrowth.center, targets.A.revenueGrowth.halfwidth),
        tri(epsGrowth, targets.A.epsGrowth.center, targets.A.epsGrowth.halfwidth),
        tri(peForward, targets.A.peForward.center, targets.A.peForward.halfwidth),
        tri(debtEbitda, targets.A.debtEbitda.center, targets.A.debtEbitda.halfwidth),
        tri(operatingMargin, targets.A.operatingMargin.center, targets.A.operatingMargin.halfwidth),
        tri(fcfMargin, targets.A.fcfMargin.center, targets.A.fcfMargin.halfwidth)
    ].filter(score => score !== null);

    const A = aScores.length > 0 ? average(aScores) : 0;

    // --- Class B Score (6 metrics) ---
    const bScores = [
        tri(revenueGrowth, targets.B.revenueGrowth.center, targets.B.revenueGrowth.halfwidth),
        tri(epsGrowth, targets.B.epsGrowth.center, targets.B.epsGrowth.halfwidth),
        tri(peForward, targets.B.peForward.center, targets.B.peForward.halfwidth),
        tri(debtEbitda, targets.B.debtEbitda.center, targets.B.debtEbitda.halfwidth),
        tri(operatingMargin, targets.B.operatingMargin.center, targets.B.operatingMargin.halfwidth),
        tri(fcfMargin, targets.B.fcfMargin.center, targets.B.fcfMargin.halfwidth)
    ].filter(score => score !== null);

    const B = bScores.length > 0 ? average(bScores) : 0;

    // --- Class C Score (6 metrics) ---
    const cScores = [
        tri(revenueGrowth, targets.C.revenueGrowth.center, targets.C.revenueGrowth.halfwidth),
        tri(epsGrowth, targets.C.epsGrowth.center, targets.C.epsGrowth.halfwidth),
        tri(peForward, targets.C.peForward.center, targets.C.peForward.halfwidth),
        tri(debtEbitda, targets.C.debtEbitda.center, targets.C.debtEbitda.halfwidth),
        tri(operatingMargin, targets.C.operatingMargin.center, targets.C.operatingMargin.halfwidth),
        tri(fcfMargin, targets.C.fcfMargin.center, targets.C.fcfMargin.halfwidth)
    ].filter(score => score !== null);

    const C = cScores.length > 0 ? average(cScores) : 0;

    // --- Class D Score (with gate logic + 5 metrics in fallback) ---
    let D = 0;

    // D gate triggers (unchanged)
    const dGateTrigger =
        (revenueGrowth !== null && revenueGrowth >= targets.D.revenueGrowthThreshold) ||
        !epsPositive ||
        !ebitdaPositive ||
        !peAvailable;

    if (dGateTrigger) {
        D = 1.0;
    } else {
        // Fallback scoring using 5 metrics (no debt/EBITDA for D)
        const dScores = [
            tri(revenueGrowth, targets.D.revenueGrowth.center, targets.D.revenueGrowth.halfwidth),
            tri(epsGrowth, targets.D.epsGrowth.center, targets.D.epsGrowth.halfwidth),
            tri(peForward, targets.D.peForward.center, targets.D.peForward.halfwidth),
            tri(operatingMargin, targets.D.operatingMargin.center, targets.D.operatingMargin.halfwidth),
            tri(fcfMargin, targets.D.fcfMargin.center, targets.D.fcfMargin.halfwidth)
        ].filter(score => score !== null);

        D = dScores.length > 0 ? average(dScores) : 0;

        // Special case: Premium hypergrowth with exceptional margins
        if (operatingMargin > 40 && revenueGrowth > 30) {
            D = Math.max(D, 0.8);  // Boost D score for premium hypergrowth
        }
    }

    // --- Final Classification ---
    const scores = { A, B, C, D };
    const sortedClasses = ['D', 'C', 'B', 'A'];  // Tie-break priority

    let maxScore = Math.max(A, B, C, D);
    let finalClass = sortedClasses.find(cls => scores[cls] === maxScore);

    // Calculate confidence (gap between 1st and 2nd place)
    const sortedScores = [A, B, C, D].sort((a, b) => b - a);
    const confidence = sortedScores[0] - sortedScores[1];

    return {
        scores: { A, B, C, D },
        finalClass,
        confidence: Math.max(0, Math.min(1, confidence))
    };
}

function average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

module.exports = { classifyStock };
```

---

## Updated Configuration

### File: `backend/config.js`

```javascript
module.exports = {
    // Enhanced class targets with 6 metrics
    classTargets: {
        A: {
            revenueGrowth: { center: 5, halfwidth: 5 },
            epsGrowth: { center: 5, halfwidth: 5 },
            peForward: { center: 10, halfwidth: 6 },
            debtEbitda: { center: 1.0, halfwidth: 1.0 },
            operatingMargin: { center: 25, halfwidth: 15 },      // NEW
            fcfMargin: { center: 15, halfwidth: 10 }             // NEW
        },
        B: {
            revenueGrowth: { center: 10, halfwidth: 5 },
            epsGrowth: { center: 10, halfwidth: 7 },
            peForward: { center: 20, halfwidth: 6 },
            debtEbitda: { center: 3.0, halfwidth: 1.5 },
            operatingMargin: { center: 15, halfwidth: 10 },      // NEW
            fcfMargin: { center: 10, halfwidth: 8 }              // NEW
        },
        C: {
            revenueGrowth: { center: 20, halfwidth: 10 },
            epsGrowth: { center: 10, halfwidth: 10 },
            peForward: { center: 25, halfwidth: 10 },
            debtEbitda: { center: 5.0, halfwidth: 2.0 },
            operatingMargin: { center: 8, halfwidth: 8 },        // NEW
            fcfMargin: { center: 3, halfwidth: 8 }               // NEW
        },
        D: {
            revenueGrowthThreshold: 50,  // Gate trigger
            // Fallback scoring (if gates don't trigger)
            revenueGrowth: { center: 60, halfwidth: 30 },
            epsGrowth: { center: 80, halfwidth: 40 },
            peForward: { center: 150, halfwidth: 100 },
            operatingMargin: { center: -5, halfwidth: 15 },      // NEW
            fcfMargin: { center: -10, halfwidth: 15 }            // NEW
        }
    },

    // ... rest of config unchanged ...
};
```

---

# Part 3: Implementation Guide

## Phase 1: Database Updates

### Update `fundamentals` Table

```sql
-- Add new columns to fundamentals table
ALTER TABLE fundamentals ADD COLUMN operating_margin REAL;
ALTER TABLE fundamentals ADD COLUMN fcf_margin REAL;

-- Add columns for macro regime indicators
CREATE TABLE IF NOT EXISTS macro_indicators (
    date TEXT PRIMARY KEY,

    -- Core indicators (existing)
    walcl REAL,
    dff REAL,

    -- New indicators
    cpi_yoy REAL,
    treasury_spread_10y2y REAL,
    unemployment_rate REAL,
    labor_force_participation REAL,
    gdp_growth_real_qoq REAL,
    gdp_forecast_next_quarter REAL,
    m2_growth_yoy REAL,
    rrp_billions REAL,
    consumer_sentiment REAL,
    vix_level REAL,

    -- Metadata
    fetched_at TEXT
);

-- Index for fast lookups
CREATE INDEX idx_macro_indicators_date ON macro_indicators(date);
```

---

## Phase 2: API Integration

### New File: `backend/apis/openbb.js`

```javascript
/**
 * OpenBB API Integration
 * Centralized access to economic data via OpenBB Platform
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Execute OpenBB Python command
 * @param {string} command - Python OpenBB command
 * @returns {Object} - Parsed JSON result
 */
async function executeOpenBB(command) {
    try {
        const { stdout, stderr } = await execPromise(`python3 -c "${command}"`);
        if (stderr) console.warn('OpenBB warning:', stderr);
        return JSON.parse(stdout);
    } catch (error) {
        console.error('OpenBB execution error:', error);
        throw error;
    }
}

/**
 * Fetch macro indicators for regime calculation
 * @returns {Object} - All macro indicators
 */
async function fetchMacroIndicators() {
    const pythonScript = `
from openbb import obb
import json

# Fetch all indicators
data = {}

# CPI
cpi = obb.economy.fred_series(symbol="CPIAUCSL", provider="fred").to_df()
data['cpi_current'] = cpi['value'].iloc[-1]
data['cpi_prev_year'] = cpi['value'].iloc[-13]
data['cpi_yoy'] = ((data['cpi_current'] / data['cpi_prev_year']) - 1) * 100

# Treasury Spread
spread = obb.economy.fred_series(symbol="T10Y2Y", provider="fred").to_df()
data['treasury_spread_10y2y'] = spread['value'].iloc[-1]

# Unemployment
unrate = obb.economy.fred_series(symbol="UNRATE", provider="fred").to_df()
data['unemployment_rate'] = unrate['value'].iloc[-1]

# Labor Force Participation
lfpr = obb.economy.fred_series(symbol="CIVPART", provider="fred").to_df()
data['labor_force_participation'] = lfpr['value'].iloc[-1]

# Real GDP (quarterly, need to calculate growth)
gdp = obb.economy.fred_series(symbol="GDPC1", provider="fred").to_df()
current_gdp = gdp['value'].iloc[-1]
prev_quarter = gdp['value'].iloc[-2]
data['gdp_growth_real_qoq'] = ((current_gdp / prev_quarter) ** 4 - 1) * 100

# M2 Money Supply
m2 = obb.economy.fred_series(symbol="M2SL", provider="fred").to_df()
current_m2 = m2['value'].iloc[-1]
prev_year_m2 = m2['value'].iloc[-13]
data['m2_growth_yoy'] = ((current_m2 / prev_year_m2) - 1) * 100

# Reverse Repo
rrp = obb.economy.fred_series(symbol="RRPONTSYD", provider="fred").to_df()
data['rrp_billions'] = rrp['value'].iloc[-1]

# Consumer Sentiment
umich = obb.economy.fred_series(symbol="UMCSENT", provider="fred").to_df()
data['consumer_sentiment'] = umich['value'].iloc[-1]

# VIX
vix = obb.economy.fred_series(symbol="VIXCLS", provider="fred").to_df()
data['vix_level'] = vix['value'].iloc[-1]

# Fed data (existing)
walcl = obb.economy.fred_series(symbol="WALCL", provider="fred").to_df()
data['walcl'] = walcl['value'].iloc[-1]

dff = obb.economy.fred_series(symbol="DFF", provider="fred").to_df()
data['dff'] = dff['value'].iloc[-1]

print(json.dumps(data))
    `;

    const result = await executeOpenBB(pythonScript);
    return result;
}

/**
 * Fetch stock fundamentals including new metrics
 * @param {string} ticker
 * @returns {Object} - Enhanced fundamentals
 */
async function getEnhancedFundamentals(ticker) {
    // Keep existing FMP logic for most metrics
    // Add operating margin and FCF margin from FMP income/cash flow statements

    // Implementation already shown in Part 2 above
    // This would be integrated into existing fmp.js

    return fundamentals;
}

module.exports = {
    fetchMacroIndicators,
    getEnhancedFundamentals
};
```

---

## Phase 3: Enhanced Regime Calculator

### File: `backend/services/enhancedRegimeCalculator.js`

```javascript
const db = require('../database');
const { fetchMacroIndicators } = require('../apis/openbb');

/**
 * Calculate enhanced regime with multi-factor analysis
 * @returns {Object} - Enhanced regime data
 */
async function calculateEnhancedRegime() {
    // Step 1: Get base regime (existing logic)
    const baseRegime = calculateBaseRegime();  // Your existing function

    // Step 2: Fetch additional indicators
    const indicators = await fetchMacroIndicators();

    // Step 3: Calculate adjustment factors
    const inflationScore = assessInflation(indicators.cpi_yoy, indicators.dff);
    const growthScore = assessGrowth(
        indicators.gdp_growth_real_qoq,
        indicators.unemployment_rate
    );
    const stressScore = assessFinancialStress(
        indicators.treasury_spread_10y2y,
        indicators.vix_level
    );
    const liquidityScore = assessLiquidity(
        indicators.m2_growth_yoy,
        indicators.rrp_billions,
        baseRegime.balanceSheetIncreasing
    );
    const sentimentScore = assessSentiment(indicators.consumer_sentiment);

    // Step 4: Calculate regime confidence
    let regimeConfidence = 100;  // Start at 100%
    const alerts = [];

    // Inflation adjustments
    if (inflationScore.impact === 'hawkish_aggressive') {
        regimeConfidence -= 30;
        alerts.push({
            type: 'warning',
            message: `High inflation (${indicators.cpi_yoy.toFixed(1)}%) threatens regime stability`
        });
    }

    // Yield curve adjustments
    if (indicators.treasury_spread_10y2y < 0) {
        regimeConfidence -= 40;
        alerts.push({
            type: 'critical',
            message: 'Yield curve inverted - recession risk elevated'
        });
    }

    // VIX adjustments
    if (indicators.vix_level > 30) {
        regimeConfidence -= 30;
        alerts.push({
            type: 'warning',
            message: `High volatility (VIX: ${indicators.vix_level.toFixed(1)}) - reduce risk exposure`
        });
    }

    // Growth adjustments
    if (indicators.gdp_growth_real_qoq < 0) {
        regimeConfidence -= 50;
        alerts.push({
            type: 'critical',
            message: 'Negative GDP growth - recession confirmed'
        });
    }

    // Consumer sentiment adjustments
    if (indicators.consumer_sentiment < 65) {
        regimeConfidence -= 20;
        alerts.push({
            type: 'warning',
            message: 'Consumer sentiment very weak - spending outlook poor'
        });
    }

    // Step 5: Generate adjusted allocation
    const allocation = adjustAllocation(
        baseRegime,
        regimeConfidence,
        {
            inflationScore,
            growthScore,
            stressScore,
            liquidityScore,
            sentimentScore
        }
    );

    // Step 6: Store in database
    await storeRegimeData(baseRegime, indicators, regimeConfidence, allocation);

    return {
        // Base regime info
        regime: baseRegime.regime,
        description: baseRegime.description,
        confidence: Math.max(0, Math.min(100, regimeConfidence)),

        // Indicator breakdown
        indicators: {
            cpi_yoy: indicators.cpi_yoy,
            treasury_spread: indicators.treasury_spread_10y2y,
            unemployment: indicators.unemployment_rate,
            gdp_growth: indicators.gdp_growth_real_qoq,
            vix: indicators.vix_level,
            consumer_sentiment: indicators.consumer_sentiment,
            m2_growth: indicators.m2_growth_yoy,
            rrp: indicators.rrp_billions
        },

        // Factor assessments
        factors: {
            inflation: inflationScore,
            growth: growthScore,
            stress: stressScore,
            liquidity: liquidityScore,
            sentiment: sentimentScore
        },

        // Allocation recommendations
        allocation: allocation,

        // Alerts and warnings
        alerts: alerts,

        // Timestamp
        asOf: new Date().toISOString()
    };
}

// Helper functions
function assessInflation(cpi_yoy, fed_funds_rate) {
    if (cpi_yoy < 2.0) return { status: 'Below Target', impact: 'dovish' };
    if (cpi_yoy <= 3.0) return { status: 'At Target', impact: 'neutral' };
    if (cpi_yoy <= 4.0) return { status: 'Elevated', impact: 'hawkish_moderate' };
    return { status: 'High', impact: 'hawkish_aggressive' };
}

function assessGrowth(gdp_growth, unemployment) {
    let score = 0;

    if (gdp_growth > 3.0) score += 2;
    else if (gdp_growth > 2.0) score += 1;
    else if (gdp_growth < 0) score -= 2;
    else score -= 1;

    if (unemployment < 4.0) score += 1;
    else if (unemployment > 6.0) score -= 1;

    return {
        score: score,
        status: score > 1 ? 'strong' : score < -1 ? 'weak' : 'moderate'
    };
}

function assessFinancialStress(yield_spread, vix) {
    let stress_level = 0;

    if (yield_spread < 0) stress_level += 40;  // Inverted curve
    if (vix > 30) stress_level += 30;          // High fear
    else if (vix > 20) stress_level += 10;     // Moderate fear

    return {
        level: stress_level,
        status: stress_level > 50 ? 'high' : stress_level > 20 ? 'moderate' : 'low'
    };
}

function assessLiquidity(m2_growth, rrp, balance_sheet_increasing) {
    let score = 0;

    if (m2_growth > 8) score += 2;
    else if (m2_growth < 0) score -= 2;

    if (balance_sheet_increasing) score += 2;
    else score -= 2;

    // RRP draining = liquidity entering markets (positive)
    // RRP building = liquidity exiting markets (negative)
    // This requires tracking RRP trend

    return {
        score: score,
        status: score > 2 ? 'very_liquid' : score < -2 ? 'tight' : 'moderate'
    };
}

function assessSentiment(consumer_sentiment) {
    if (consumer_sentiment < 60) return { status: 'very_weak', outlook: 'poor' };
    if (consumer_sentiment < 70) return { status: 'weak', outlook: 'below_average' };
    if (consumer_sentiment < 80) return { status: 'moderate', outlook: 'average' };
    if (consumer_sentiment < 90) return { status: 'strong', outlook: 'good' };
    return { status: 'very_strong', outlook: 'excellent' };
}

function adjustAllocation(baseRegime, confidence, factors) {
    // Start with base allocation
    let allocation = { ...baseRegime.baseAllocation };

    // Adjust based on confidence and factors
    // (Implementation depends on your specific allocation logic)

    return allocation;
}

async function storeRegimeData(baseRegime, indicators, confidence, allocation) {
    const date = new Date().toISOString().split('T')[0];

    db.prepare(`
        INSERT OR REPLACE INTO macro_indicators (
            date,
            walcl, dff,
            cpi_yoy, treasury_spread_10y2y,
            unemployment_rate, labor_force_participation,
            gdp_growth_real_qoq, gdp_forecast_next_quarter,
            m2_growth_yoy, rrp_billions,
            consumer_sentiment, vix_level,
            fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        date,
        indicators.walcl,
        indicators.dff,
        indicators.cpi_yoy,
        indicators.treasury_spread_10y2y,
        indicators.unemployment_rate,
        indicators.labor_force_participation,
        indicators.gdp_growth_real_qoq,
        null,  // GDP forecast (implement separately)
        indicators.m2_growth_yoy,
        indicators.rrp_billions,
        indicators.consumer_sentiment,
        indicators.vix_level,
        new Date().toISOString()
    );
}

module.exports = { calculateEnhancedRegime };
```

---

# Part 4: Database & API Changes

## Updated Database Schema

```sql
-- Enhanced fundamentals table
CREATE TABLE IF NOT EXISTS fundamentals (
    ticker TEXT PRIMARY KEY,

    -- Existing metrics
    revenue_growth REAL,
    eps_growth REAL,
    pe_forward REAL,
    debt_ebitda REAL,
    eps_positive INTEGER,
    ebitda_positive INTEGER,
    pe_available INTEGER,
    latest_price REAL,
    price_timestamp TEXT,

    -- NEW METRICS
    operating_margin REAL,
    fcf_margin REAL,

    fetch_date TEXT NOT NULL,
    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
);

-- Enhanced macro indicators table
CREATE TABLE IF NOT EXISTS macro_indicators (
    date TEXT PRIMARY KEY,

    -- Existing (Fed data)
    walcl REAL,
    dff REAL,

    -- NEW: Inflation
    cpi_yoy REAL,

    -- NEW: Yield Curve
    treasury_spread_10y2y REAL,

    -- NEW: Employment
    unemployment_rate REAL,
    labor_force_participation REAL,

    -- NEW: Growth
    gdp_growth_real_qoq REAL,
    gdp_forecast_next_quarter REAL,

    -- NEW: Liquidity
    m2_growth_yoy REAL,
    rrp_billions REAL,

    -- NEW: Sentiment & Risk
    consumer_sentiment REAL,
    vix_level REAL,

    -- Metadata
    fetched_at TEXT
);

-- Regime history with confidence
CREATE TABLE IF NOT EXISTS regime_history (
    date TEXT PRIMARY KEY,
    regime TEXT NOT NULL,
    confidence REAL NOT NULL,

    -- Factor scores
    inflation_score TEXT,
    growth_score TEXT,
    stress_score TEXT,
    liquidity_score TEXT,
    sentiment_score TEXT,

    -- Allocation recommendations (JSON)
    allocation_json TEXT,

    -- Alerts (JSON array)
    alerts_json TEXT,

    recorded_at TEXT
);
```

---

## Updated API Endpoints

### Enhanced Regime Endpoint

**GET /api/regime**

New response structure:
```json
{
  "regime": "Most Liquid",
  "description": "Low Rates + Balance Sheet Increasing",
  "confidence": 72,

  "indicators": {
    "cpi_yoy": 2.8,
    "treasury_spread": -0.15,
    "unemployment": 3.8,
    "gdp_growth": 2.5,
    "vix": 18.5,
    "consumer_sentiment": 68.2,
    "m2_growth": 5.2,
    "rrp": 450.2
  },

  "factors": {
    "inflation": {
      "status": "Elevated",
      "impact": "hawkish_moderate"
    },
    "growth": {
      "score": 1,
      "status": "moderate"
    },
    "stress": {
      "level": 40,
      "status": "moderate"
    },
    "liquidity": {
      "score": 2,
      "status": "moderate"
    },
    "sentiment": {
      "status": "weak",
      "outlook": "below_average"
    }
  },

  "allocation": {
    "D": "20-40%",
    "C": "30-40%",
    "B": "20-30%",
    "A": "10-20%"
  },

  "alerts": [
    {
      "type": "warning",
      "message": "Yield curve inverted - recession risk elevated"
    },
    {
      "type": "warning",
      "message": "Consumer sentiment weak - spending outlook poor"
    }
  ],

  "asOf": "2025-11-02T08:00:00Z"
}
```

### Enhanced Stock Endpoint

**GET /api/stocks/:ticker**

Updated fundamentals section:
```json
{
  "ticker": "AAPL",
  "fundamentals": {
    "revenueGrowth": 8.2,
    "epsGrowth": 9.1,
    "peForward": 22.3,
    "debtEbitda": 2.8,
    "operatingMargin": 30.5,
    "fcfMargin": 25.3,
    "latestPrice": 182.45
  },
  "classification": {
    "class": "B",
    "confidence": 0.76,
    "scores": {
      "A": 0.42,
      "B": 0.76,
      "C": 0.28,
      "D": 0.00
    }
  }
}
```

---

## Summary of Enhancements

### Macro Regime Framework
**Before:** 2 indicators (DFF, WALCL)
**After:** 12 indicators across 5 categories

1. **Monetary Policy:** DFF, WALCL, M2, RRP
2. **Inflation:** CPI
3. **Growth:** GDP, Unemployment, Labor Participation
4. **Financial Stress:** 10Y-2Y Spread, VIX
5. **Sentiment:** Consumer Confidence

**Result:** Multi-dimensional regime confidence scoring with early warning system

### Stock Classification Framework
**Before:** 4 metrics (Revenue, EPS, P/E, Debt)
**After:** 6 metrics

Added:
5. **Operating Margin** - Profitability quality
6. **FCF Margin** - Cash generation quality

**Result:** More robust classification capturing earnings quality and cash flow sustainability

---

## Next Steps

1. **Test Enhanced Regime Calculator** with historical data
2. **Validate New Stock Metrics** on existing portfolio
3. **Build UI Components** to display enhanced regime data
4. **Create Alert System** for regime changes and warnings
5. **Backtest Allocation Adjustments** against historical periods

---

**End of Enhancement Documentation**
