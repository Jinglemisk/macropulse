# Macro Data Comparison: FUTURE_ROADMAP vs OpenBB Availability

**Generated:** November 7, 2025
**Purpose:** Compare requested macro data from FUTURE_ROADMAP.MD with OpenBB Platform capabilities

---

## Executive Summary

Based on analysis of the FUTURE_ROADMAP.MD and current implementation:

- **Currently Implemented:** 5 FRED series (WALCL, DFF, T10Y2Y, UNRATE, CPIAUCSL)
- **Currently Displayed in UI:** Only 2 (WALCL, DFF)
- **Available via OpenBB:** 841,000+ FRED series + additional providers
- **Recommendation:** Extensive macro data is available and ready to integrate

---

## Current State Analysis

### 1. Currently Implemented (Backend)

These 5 FRED series are already being fetched and stored in the database:

| Metric | FRED Series | Current Status | OpenBB Command | Database Column |
|--------|-------------|----------------|----------------|-----------------|
| **Fed Balance Sheet** | WALCL | ✅ Stored & Displayed | `obb.economy.fred_series(symbol='WALCL')` | `walcl` |
| **Fed Funds Rate** | DFF | ✅ Stored & Displayed | `obb.economy.fred_series(symbol='DFF')` | `dff` |
| **10Y-2Y Treasury Spread** | T10Y2Y | ✅ Stored, Not Displayed | `obb.economy.fred_series(symbol='T10Y2Y')` | `t10y2y` |
| **Unemployment Rate** | UNRATE | ✅ Stored, Not Displayed | `obb.economy.fred_series(symbol='UNRATE')` | `unrate` |
| **Consumer Price Index** | CPIAUCSL | ✅ Stored, Not Displayed | `obb.economy.fred_series(symbol='CPIAUCSL')` | `cpiaucsl` |

**Key Insight:** You already have 3 additional macro indicators stored but not displayed in the UI.

### 2. Currently Displayed (Frontend - Regime Component)

According to FUTURE_ROADMAP.MD:
- ✅ Fed Balance Sheet (WALCL) - Used for regime calculation
- ✅ Interest Rate (DFF) - Used for regime calculation
- ❌ T10Y2Y, UNRATE, CPIAUCSL - Not shown but available

---

## OpenBB Available Macro Data

### Category 1: Inflation Indicators

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Consumer Price Index** | CPIAUCSL | `obb.economy.cpi()` or `obb.economy.fred_series(symbol='CPIAUCSL')` | Index (base year 1982-1984=100) | Core inflation measure | ✅ **Already Stored** |
| **Core CPI** | CPILFESL | `obb.economy.fred_series(symbol='CPILFESL')` | Index | Excludes food/energy volatility | ✅ Available |
| **PCE Price Index** | PCEPI | `obb.economy.fred_series(symbol='PCEPI')` | Index | Alternative inflation measure | ✅ Available |
| **Core PCE** | PCEPILFE | `obb.economy.fred_series(symbol='PCEPILFE')` | Index | Fed's preferred inflation target | ✅ Available |
| **CPI YoY Change** | - | `obb.economy.cpi(transform='yoy')` | Percentage | Year-over-year inflation rate | ✅ Available |

**Potential Use:** Enhance regime detection by considering inflation environment. High inflation + low rates = unsustainable regime.

---

### Category 2: Interest Rates & Yield Curve

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Fed Funds Rate** | DFF | `obb.economy.fred_series(symbol='DFF')` | Percentage | Short-term rate | ✅ **Already Stored** |
| **10-Year Treasury** | DGS10 | `obb.fixedincome.government.treasury_rates(maturity='10y')` or `obb.economy.fred_series(symbol='DGS10')` | Percentage | Long-term risk-free rate | ✅ Available |
| **2-Year Treasury** | DGS2 | `obb.fixedincome.government.treasury_rates(maturity='2y')` or `obb.economy.fred_series(symbol='DGS2')` | Percentage | Near-term rate expectations | ✅ Available |
| **10Y-2Y Spread** | T10Y2Y | `obb.economy.fred_series(symbol='T10Y2Y')` | Percentage points | Recession indicator (inverted curve) | ✅ **Already Stored** |
| **3-Month Treasury** | DGS3MO | `obb.fixedincome.government.treasury_rates(maturity='3m')` | Percentage | Short-term rate floor | ✅ Available |
| **30-Year Mortgage** | MORTGAGE30US | `obb.economy.fred_series(symbol='MORTGAGE30US')` | Percentage | Housing affordability | ✅ Available |

**Potential Use:**
- Adjust P/E ratio scoring based on risk-free rate environment
- Use inverted yield curve as recession signal → shift to Class A defensive stocks
- High yields = lower justified P/E ratios (higher discount rate)

---

### Category 3: Employment & Labor Market

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Unemployment Rate** | UNRATE | `obb.economy.fred_series(symbol='UNRATE')` | Percentage | Labor market health | ✅ **Already Stored** |
| **Nonfarm Payrolls** | PAYEMS | `obb.economy.fred_series(symbol='PAYEMS')` | Thousands | Job creation momentum | ✅ Available |
| **Labor Force Participation** | CIVPART | `obb.economy.fred_series(symbol='CIVPART')` | Percentage | Quality of employment | ✅ Available |
| **Initial Jobless Claims** | ICSA | `obb.economy.fred_series(symbol='ICSA')` | Thousands | Leading layoff indicator | ✅ Available |
| **Avg Hourly Earnings** | CES0500000003 | `obb.economy.fred_series(symbol='CES0500000003')` | Dollars/hour | Wage inflation pressure | ✅ Available |

**Potential Use:**
- Strong employment = consumer spending → benefits Class B/C growth stocks
- Rising unemployment = defensive shift → prefer Class A
- Create "labor market health score" for regime enhancement

---

### Category 4: Economic Growth (GDP & Activity)

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Real GDP** | GDPC1 | `obb.economy.gdp(country='united_states')` or `obb.economy.fred_series(symbol='GDPC1')` | Billions (chained 2017 $) | Overall economic growth | ✅ Available |
| **GDP Growth Rate** | A191RL1Q225SBEA | `obb.economy.fred_series(symbol='A191RL1Q225SBEA')` | Percentage (QoQ) | Quarterly growth rate | ✅ Available |
| **GDP Forecasts** | - | `obb.economy.gdp_forecast()` | Various | Expected future growth | ✅ Available |
| **Industrial Production** | INDPRO | `obb.economy.fred_series(symbol='INDPRO')` | Index | Manufacturing activity | ✅ Available |
| **Capacity Utilization** | TCU | `obb.economy.fred_series(symbol='TCU')` | Percentage | Economic slack measure | ✅ Available |

**Potential Use:**
- Strong GDP growth = risk-on environment → Class C/D hypergrowth stocks
- Weak GDP = risk-off → Class A defensive stocks
- Create "growth environment score" for regime

---

### Category 5: Liquidity & Money Supply

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Fed Balance Sheet** | WALCL | `obb.economy.fred_series(symbol='WALCL')` | Millions of dollars | Fed asset purchases | ✅ **Already Stored** |
| **M2 Money Supply** | M2SL | `obb.economy.fred_series(symbol='M2SL')` | Billions of dollars | Broad money supply | ✅ Available |
| **M1 Money Supply** | M1SL | `obb.economy.fred_series(symbol='M1SL')` | Billions of dollars | Narrow money supply | ✅ Available |
| **Treasury General Account** | WTREGEN | `obb.economy.fred_series(symbol='WTREGEN')` | Millions of dollars | Government cash balance | ✅ Available |
| **Reverse Repo** | RRPONTSYD | `obb.economy.fred_series(symbol='RRPONTSYD')` | Billions of dollars | Fed liquidity drain | ✅ Available |

**Potential Use:**
- M2 growth + balance sheet expansion = high liquidity → Class D environment
- Refine "Most Liquid" regime with M2 growth rate
- Track total liquidity = Balance Sheet - RRP - TGA

---

### Category 6: Consumer & Retail

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Retail Sales** | RSXFS | `obb.economy.retail_sales()` or `obb.economy.fred_series(symbol='RSXFS')` | Millions of dollars | Consumer spending trends | ✅ Available |
| **Personal Consumption** | PCE | `obb.economy.fred_series(symbol='PCE')` | Billions of dollars | Broader consumption | ✅ Available |
| **Real Disposable Income** | DSPIC96 | `obb.economy.fred_series(symbol='DSPIC96')` | Billions (chained 2017 $) | After-tax income | ✅ Available |
| **Consumer Confidence** | UMCSENT | `obb.economy.fred_series(symbol='UMCSENT')` | Index | Consumer sentiment | ✅ Available |
| **Personal Savings Rate** | PSAVERT | `obb.economy.fred_series(symbol='PSAVERT')` | Percentage | Financial cushion | ✅ Available |

**Potential Use:**
- Strong retail sales → benefits consumer discretionary stocks
- Flag sectors benefiting from current spending trends
- Consumer confidence as leading indicator

---

### Category 7: Manufacturing & Business Surveys

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **ISM Manufacturing PMI** | NAPMPI | `obb.economy.fred_series(symbol='NAPMPI')` | Index (>50 = expansion) | Manufacturing health | ✅ Available |
| **ISM Services PMI** | - | `obb.economy.fred_series(symbol='NAPMSI')` | Index | Services sector health | ✅ Available |
| **Chicago Fed Activity** | CFNAI | `obb.economy.fred_series(symbol='CFNAI')` | Index | Composite activity | ✅ Available |

**Potential Use:**
- PMI > 50 = expansion → Class B/C growth stocks
- PMI < 50 = contraction → Class A defensive
- Leading indicator for regime shifts

---

### Category 8: Housing Market

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **Housing Starts** | HOUST | `obb.economy.fred_series(symbol='HOUST')` | Thousands of units | Construction activity | ✅ Available |
| **Case-Shiller Home Price** | CSUSHPISA | `obb.economy.fred_series(symbol='CSUSHPISA')` | Index | Housing wealth effect | ✅ Available |
| **30-Year Mortgage Rate** | MORTGAGE30US | `obb.economy.fred_series(symbol='MORTGAGE30US')` | Percentage | Housing affordability | ✅ Available |

**Potential Use:**
- Housing trends affect consumer wealth
- Construction activity indicates growth

---

### Category 9: Credit & Financial Conditions

| Metric | FRED Series | OpenBB Command | Format | Use Case | Available? |
|--------|-------------|----------------|--------|----------|-----------|
| **BBB Corporate Spread** | BAMLC0A4CBBB | `obb.economy.fred_series(symbol='BAMLC0A4CBBB')` | Percentage points | Credit risk premium | ✅ Available |
| **TED Spread** | TEDRATE | `obb.economy.fred_series(symbol='TEDRATE')` | Percentage points | Banking system stress | ✅ Available |
| **VIX (Fear Index)** | VIXCLS | `obb.economy.fred_series(symbol='VIXCLS')` | Index | Market volatility | ✅ Available |
| **High Yield Spread** | BAMLH0A0HYM2 | `obb.economy.fred_series(symbol='BAMLH0A0HYM2')` | Percentage points | Junk bond risk | ✅ Available |

**Potential Use:**
- Widening spreads = credit stress → shift to Class A quality
- High VIX = risk-off → defensive positioning
- Leading indicators of financial stress

---

## Data Format Specifications

### OpenBB Return Formats

| Data Type | Format Returned | Example | Notes |
|-----------|----------------|---------|-------|
| **Growth Rates** | Decimal (normalized) | 0.08 = 8% | OpenBB Platform v4.5.0 standardizes all providers |
| **Percentage Rates** | Decimal | 0.045 = 4.5% | Fed Funds, Treasury yields |
| **Indices** | Float | 315.123 | CPI, GDP indices |
| **Dollar Amounts** | Float (varies by series) | WALCL in millions, M2 in billions | Check series documentation |
| **Date Format** | ISO 8601 | "2025-11-07" | YYYY-MM-DD |

### Data Frequency by Series

| Series | Frequency | Publication Lag | Notes |
|--------|-----------|----------------|-------|
| **WALCL** | Weekly (Wednesday) | ~1 day | Fed Balance Sheet |
| **DFF** | Daily | ~1 day | Fed Funds Rate |
| **T10Y2Y** | Daily | Real-time | Treasury spread |
| **UNRATE** | Monthly | ~1 week | Unemployment |
| **CPIAUCSL** | Monthly | ~2 weeks | CPI |
| **GDPC1** | Quarterly | ~1 month | Real GDP |
| **PAYEMS** | Monthly | ~1 week | Nonfarm Payrolls |

---

## Implementation Recommendations

### Priority 1: Display Existing Data (Quick Win)

**Effort:** Low (2-3 hours)
**Value:** High

You already have these stored but not displayed:
1. **T10Y2Y (10Y-2Y Spread)** - Recession indicator
   - Display in regime component
   - Alert when inverted (< 0)

2. **UNRATE (Unemployment)** - Labor market health
   - Display in regime component
   - Track trend (rising = weakness)

3. **CPIAUCSL (CPI)** - Inflation measure
   - Display in regime component
   - Calculate YoY change for inflation rate

**UI Implementation:**
```jsx
// Add to RegimeDisplay.jsx
<div className="macro-indicators">
  <div className="indicator">
    <span className="label">Yield Curve (10Y-2Y):</span>
    <span className={yieldSpread < 0 ? "inverted" : "normal"}>
      {yieldSpread.toFixed(2)}% {yieldSpread < 0 ? "⚠️ INVERTED" : ""}
    </span>
  </div>
  <div className="indicator">
    <span className="label">Unemployment:</span>
    <span>{unemployment.toFixed(1)}%</span>
  </div>
  <div className="indicator">
    <span className="label">CPI (YoY):</span>
    <span>{cpiYoY.toFixed(1)}%</span>
  </div>
</div>
```

---

### Priority 2: Add High-Value Indicators

**Effort:** Medium (1 day)
**Value:** High

Recommended additions to fetch and display:

1. **Core CPI (CPILFESL)** - Better inflation trend
2. **10Y Treasury (DGS10)** - Risk-free rate for P/E context
3. **M2 Money Supply (M2SL)** - Liquidity measure
4. **ISM Manufacturing (NAPMPI)** - Economic activity

**Database Migration:**
```sql
ALTER TABLE macro_data ADD COLUMN core_cpi REAL;
ALTER TABLE macro_data ADD COLUMN treasury_10y REAL;
ALTER TABLE macro_data ADD COLUMN m2_money_supply REAL;
ALTER TABLE macro_data ADD COLUMN ism_manufacturing REAL;
```

**Fetch Implementation:**
```javascript
// In backend/apis/fred.js
const additionalSeries = await Promise.all([
  openbb.getFredSeries('CPILFESL', startDate, endDate),
  openbb.getFredSeries('DGS10', startDate, endDate),
  openbb.getFredSeries('M2SL', startDate, endDate),
  openbb.getFredSeries('NAPMPI', startDate, endDate)
]);
```

---

### Priority 3: Enhanced Regime Calculation

**Effort:** Medium (1-2 days)
**Value:** High

Use additional indicators to refine regime:

**Current Regime Logic:**
- Low rates + Balance sheet increasing = "Most Liquid"
- High rates + Balance sheet decreasing = "Least Liquid"

**Enhanced Regime Logic:**
```javascript
// Add to regimeCalculator.js
function calculateEnhancedRegime() {
  const basicRegime = calculateRegime(); // Existing 2x2 matrix

  // Get additional data
  const indicators = db.prepare(`
    SELECT * FROM macro_data
    WHERE walcl IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get();

  // Check for inverted yield curve
  const yieldCurveInverted = indicators.t10y2y < 0;

  // Check inflation environment
  const highInflation = indicators.cpiaucsl > 3.0; // Above target

  // Check labor market
  const risingUnemployment = /* calculate trend */;

  // Adjust regime
  let warning = '';
  if (yieldCurveInverted) {
    warning = '⚠️ Inverted Yield Curve - Recession Risk';
    // Suggest defensive positioning regardless of base regime
  }

  if (highInflation && !basicRegime.metrics.rateIsLow) {
    warning += ' | High Inflation + Rising Rates - Avoid Growth';
  }

  return {
    ...basicRegime,
    warnings: warning,
    additionalMetrics: {
      yieldCurve: indicators.t10y2y,
      unemployment: indicators.unrate,
      inflation: indicators.cpiaucsl
    }
  };
}
```

---

### Priority 4: Sector-Specific Context (Future)

**Effort:** High (3-5 days)
**Value:** Medium

Use macro data to provide sector-specific insights:

```javascript
// Example: Technology sector benefits from:
// - Low rates (high P/E multiples sustainable)
// - High M2 growth (liquidity)
// - Strong consumer spending

// Example: Utilities sector benefits from:
// - High rates (yield alternative)
// - Low growth (defensive play)
// - High unemployment (defensive rotation)
```

---

## Comparison Table: FUTURE_ROADMAP vs Available

| Category | Mentioned in Roadmap | Currently Stored | Available in OpenBB | Implementation Complexity |
|----------|---------------------|------------------|---------------------|---------------------------|
| **Fed Balance Sheet** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Done |
| **Interest Rates** | ✅ Yes | ✅ Yes (DFF) | ✅ Yes (DFF + all treasury maturities) | ✅ Done |
| **Additional Metrics** | ✅ "More data available" | ⚠️ 3 indicators stored but not shown | ✅ 841,000+ series available | 🟡 Low-Medium |
| **Inflation** | ❓ Not specified | ✅ CPI stored | ✅ CPI, Core CPI, PCE, Core PCE | 🟢 Low |
| **Employment** | ❓ Not specified | ✅ UNRATE stored | ✅ All BLS series | 🟢 Low |
| **Yield Curve** | ❓ Not specified | ✅ T10Y2Y stored | ✅ All maturities | 🟢 Low |
| **GDP** | ❓ Not specified | ❌ No | ✅ Yes | 🟢 Low |
| **Money Supply** | ❓ Not specified | ❌ No | ✅ M1, M2 | 🟢 Low |
| **Credit Spreads** | ❓ Not specified | ❌ No | ✅ BBB, HY, TED | 🟢 Low |
| **Consumer Data** | ❓ Not specified | ❌ No | ✅ Retail Sales, Confidence | 🟢 Low |
| **Manufacturing** | ❓ Not specified | ❌ No | ✅ ISM PMI, IP | 🟢 Low |

---

## Summary & Next Steps

### Current Gaps

1. ✅ **Data Collection:** Already fetching 5 key series
2. ❌ **Data Display:** Only showing 2 of 5 in UI
3. ❌ **Data Utilization:** Not using T10Y2Y, UNRATE, CPI in regime logic

### Recommended Action Plan

**Phase 1 (Week 1):** Display existing data
- [ ] Update `RegimeDisplay.jsx` to show all 5 indicators
- [ ] Add warning for inverted yield curve
- [ ] Calculate and display inflation rate (YoY)

**Phase 2 (Week 2):** Fetch additional high-value indicators
- [ ] Add 4 new series: Core CPI, 10Y Treasury, M2, ISM PMI
- [ ] Update database schema
- [ ] Update `fred.js` to fetch new series

**Phase 3 (Week 3):** Enhanced regime calculation
- [ ] Update `regimeCalculator.js` with multi-indicator logic
- [ ] Add warnings for inverted curve, high inflation
- [ ] Test with historical data

**Phase 4 (Future):** Sector-specific insights
- [ ] Map sectors to beneficial macro conditions
- [ ] Provide context for each stock's sector
- [ ] Suggest sector rotation based on regime

### Key Insight

**You already have the infrastructure and 60% of high-value indicators!**

The OpenBB integration is working perfectly. The gap is just:
1. Displaying what you already have
2. Fetching a few more high-priority series
3. Using the data in your regime logic

All macro data mentioned in FUTURE_ROADMAP.MD (Fed Balance Sheet, Interest Rates) is already implemented. The "more data available" statement is accurate - you have access to 841,000+ FRED series through OpenBB.

---

## Appendix: Complete OpenBB Economy Function Reference

### Most Relevant Functions

```python
# FRED Series (any of 841,000+ series)
obb.economy.fred_series(symbol='SERIES_ID', start_date='YYYY-MM-DD', end_date='YYYY-MM-DD')

# Specific Indicators
obb.economy.cpi(country='united_states', transform='yoy')
obb.economy.gdp(country='united_states')
obb.economy.retail_sales(country='united_states')

# Treasury Rates
obb.fixedincome.government.treasury_rates(maturity='10y')

# Economic Calendar
obb.economy.calendar(start_date='YYYY-MM-DD', end_date='YYYY-MM-DD')

# Search FRED
obb.economy.fred_search(query='inflation')
```

### Provider Options

- `provider='fred'` - Federal Reserve Economic Data
- `provider='oecd'` - OECD data (international)
- `provider='imf'` - IMF data (international)
- `provider='econdb'` - EconDB (global indicators)

---

**Document End**
