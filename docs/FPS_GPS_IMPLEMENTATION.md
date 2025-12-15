# FPS/GPS Enhanced Regime System
## Complete Implementation Guide

> **One-Stop-Shop Reference Document**
>
> **Version:** 2.0 | **Last Updated:** January 2025 | **Status:** ✅ Implementation Ready

---

## Executive Summary

### System Overview

This document specifies the complete implementation of the **FPS/GPS Enhanced Regime System** - an advanced macro allocation engine that combines:

1. **Existing regime framework** (2×2 matrix: Rates × Balance Sheet)
2. **Fed Pressure Score (FPS)** - Weighted composite predicting Fed policy direction
3. **Growth Pulse Score (GPS)** - Economic strength independent of inflation
4. **Dynamic tilting mechanism** - Allocation shifts based on macro momentum

**What Changes:** Data layer (2→13 indicators), calculation logic (add FPS/GPS overlay), UI (basic banner → comprehensive dashboard)

**What Stays:** Stock classification (A/B/C/D), regime definitions, class meanings, frontend table/filtering

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Indicator Specifications](#2-indicator-specifications)
3. [Score Calculation Logic](#3-score-calculation-logic)
4. [Allocation Engine](#4-allocation-engine)
5. [Database Schema](#5-database-schema)
6. [Backend Implementation](#6-backend-implementation)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Configuration Reference](#8-configuration-reference)
9. [API Documentation](#9-api-documentation)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Core Concepts

### 1.1 Fed Pressure Score (FPS)

**Definition:** Weighted composite measuring net pressure on the Federal Reserve to tighten or ease monetary policy.

**Formula:**
```
FPS = Σ(weight_i × score_i) / Σ(weight_i)
where score_i ∈ {-1, 0, +1} for each indicator
```

**Interpretation:**
- `FPS = +1.0`: Maximum contractionary pressure → Fed hikes/QT
- `FPS = +0.5`: Strong hawkish pressure
- `FPS = 0.0`: Neutral → Fed on hold
- `FPS = -0.5`: Strong dovish pressure
- `FPS = -1.0`: Maximum expansionary pressure → Fed cuts/QE

**Use Case:** 3-6 month forward policy direction signal

---

### 1.2 Growth Pulse Score (GPS)

**Definition:** Economic growth strength independent of inflation pressures.

**Formula:**
```
GPS = Σ(weight_i × score_i) / Σ(weight_i)
Excludes: CPI, Core CPI, PPI (inflation metrics)
```

**Interpretation:**
- `GPS = +1.0`: Very strong growth
- `GPS = +0.3`: Moderate growth (threshold for tie-break)
- `GPS = 0.0`: Neutral
- `GPS = -0.3`: Weak growth (threshold for tie-break)
- `GPS = -1.0`: Recession

**Use Case:** Tie-breaker for In-Between regimes when FPS is neutral

---

### 1.3 Indicator Classification

Each of 10 indicators is classified as **High/Normal/Low** based on threshold bands, then mapped to scores:

| Indicator | High | Normal | Low | FPS Mapping | GPS Mapping |
|-----------|------|--------|-----|-------------|-------------|
| **Unemployment** | >5.5% | 4.0-5.5% | <4.0% | High→-1, Norm→0, Low→+1 | High→-1, Norm→0, Low→+1 |
| **Jobless Claims** | >350k | 250-350k | <250k | High→-1, Norm→0, Low→+1 | High→-1, Norm→0, Low→+1 |
| **Nonfarm Payrolls** | >250k | 50-250k | <50k | High→+1, Norm→0, Low→-1 | High→+1, Norm→0, Low→-1 |
| **CPI (YoY)** | >3.0% | 2.0-3.0% | <2.0% | High→+1, Norm→0, Low→-1 | *(Not used)* |
| **Core CPI (YoY)** | >3.0% | 2.0-3.0% | <2.0% | High→+1, Norm→0, Low→-1 | *(Not used)* |
| **PPI (MoM)** | >0.2% | 0-0.2% | <0% | High→+1, Norm→0, Low→-1 | *(Not used)* |
| **CFNAI** | >0.35 | -0.7 to 0.35 | <-0.7 | High→+1, Norm→0, Low→-1 | High→+1, Norm→0, Low→-1 |
| **INDPRO (MoM%)** | >0.2% | 0 to 0.2% | <0% | High→+1, Norm→0, Low→-1 | High→+1, Norm→0, Low→-1 |
| **Retail Sales (MoM%)** | >0.4% | 0 to 0.4% | <0% | High→+1, Norm→0, Low→-1 | High→+1, Norm→0, Low→-1 |
| **Consumer Confidence** | >120 | 100-120 | <100 | High→+1, Norm→0, Low→-1 | High→+1, Norm→0, Low→-1 |

**Rationale Examples:**
- High Unemployment (>5.5%) → Weak economy → Fed eases → FPS = -1
- High CPI (>3%) → High inflation → Fed tightens → FPS = +1
- High Nonfarm Payrolls (>250k) → Strong job growth → Fed tightens → FPS = +1

---

### 1.4 Allocation Mechanism

**Base Allocation** (from regime):
```javascript
const BASE = {
  'Most Liquid':          { A:10, B:20, C:30, D:40 },
  'In Between (Low+Shr)': { A:15, B:25, C:40, D:20 },
  'In Between (High+Grow)':{ A:15, B:40, C:30, D:15 },
  'Least Liquid':         { A:60, B:30, C:10, D:0 }
};
```

**FPS Tilt** (k=0.25):
```
Tilt% = FPS × 25%

If FPS > 0 (contractionary):
  Shift Tilt% from D→C→B→A (defensive)

If FPS < 0 (expansionary):
  Shift |Tilt%| from A→B→C→D (growth)
```

**GPS Tie-Break** (only if |FPS| < 0.2 AND regime is In-Between):
```
If GPS > +0.3: Shift 5-10% toward C (growthier)
If GPS < -0.3: Shift 5-10% toward B (more defensive)
```

**Example:**
```
Regime: Most Liquid
Base: A:10, B:20, C:30, D:40

FPS = +0.6 (hawkish pressure)
Tilt% = 0.6 × 25% = 15%

Take 15% from D, distribute to A/B/C:
Result: A:17.5, B:24.5, C:33, D:25
```

---

## 2. Indicator Specifications

### 2.1 Complete Indicator Table

| # | Indicator | FRED Symbol | Frequency | Lag | High | Normal | Low | FPS Wt | GPS Wt | MA Win |
|---|-----------|-------------|-----------|-----|------|--------|-----|--------|--------|--------|
| 1 | Unemployment Rate | UNRATE | Monthly | 1wk | >5.5% | 4.0-5.5 | <4.0 | 1.5 | 1.5 | 6mo |
| 2 | Jobless Claims | ICSA | Weekly | 1wk | >350k | 250-350k | <250k | 1.0 | 1.0 | 12wk |
| 3 | Nonfarm Payrolls | PAYEMS | Monthly | 1wk | >250k | 50-250k | <50k | 1.5 | 2.0 | 9mo |
| 4 | CPI (YoY)* | CPIAUCSL | Monthly | 2wk | >3.0% | 2.0-3.0 | <2.0 | 1.5 | - | 9mo |
| 5 | Core CPI (YoY)* | CPILFESL | Monthly | 2wk | >3.0% | 2.0-3.0 | <2.0 | 2.0 | - | 9mo |
| 6 | PPI (MoM)* | PPIACO | Monthly | 2wk | >0.2% | 0-0.2 | <0% | 1.0 | - | 12mo |
| 7 | CFNAI | CFNAI | Monthly | 1mo | >0.35 | -0.7 to 0.35 | <-0.7 | 1.0 | 1.0 | 6mo |
| 8 | Industrial Production (MoM%) | INDPRO | Monthly | 1mo | >0.2% | 0 to 0.2% | <0% | 0.5 | 0.5 | 9mo |
| 9 | Retail Sales (MoM%) | RSXFS | Monthly | 2wk | >0.4% | 0 to 0.4% | <0% | 1.0 | 1.5 | 9mo |
| 10 | Consumer Confidence | UMCSENT | Monthly | 2wk | >120 | 100-120 | <100 | 0.5 | 1.0 | 12mo |

**Supporting Indicators** (used for regime, not scores):
| 11 | Fed Balance Sheet | WALCL | Weekly | 1d | - | - | - | - | - | - |
| 12 | Fed Funds Rate | DFF | Daily | 1d | - | - | - | - | - | - |
| 13 | 10Y-2Y Spread | T10Y2Y | Daily | Real-time | <0 (inv) | 0-1.0 | >1.0 | (Warning) | - | - |

*CPI/Core CPI/PPI: Requires YoY or MoM calculation from index values

**Totals:**
- FPS indicators: 10 (total weight: 11.5)
- GPS indicators: 7 (total weight: 9.5)
- Regime indicators: 2 (WALCL, DFF)

**⚠️ Note on Alternative Indicators:**
ISM PMI data (NAPMPI, NAPMSI) and Chicago PMI are proprietary and not available via FRED after 2016. This implementation uses free alternatives:
- **CFNAI** (Chicago Fed National Activity Index): Composite of 85 economic indicators, superior proxy for manufacturing activity
- **INDPRO** (Industrial Production Index): Direct measure of industrial output, broader than regional PMI
- **RSXFS** (Advance Retail Sales): Strong consumer spending proxy, replaces ISM Services PMI

---

### 2.2 Data Frequency & Smoothing

**Moving Average Windows:**
- **6 months:** Unemployment, CFNAI (low volatility indicators)
- **9 months (3 quarters):** CPI, Core CPI, Industrial Production, Retail Sales, Nonfarm Payrolls
- **12 months:** Jobless Claims, PPI, Consumer Confidence (high volatility)

**Rationale:** Use MA for classification (stable regime signals), keep spot for trend detection

---

## 3. Score Calculation Logic

### 3.1 Indicator Classification

```javascript
/**
 * File: backend/services/indicatorClassifier.js
 */

const THRESHOLDS = {
  unemployment: { low: 4.0, high: 5.5 },
  jobless_claims: { low: 250000, high: 350000 },
  nonfarm_payrolls: { low: 50000, high: 250000 },
  cpi_yoy: { low: 2.0, high: 3.0 },
  core_cpi_yoy: { low: 2.0, high: 3.0 },
  ppi: { low: 0, high: 0.2 },
  cfnai: { low: -0.7, high: 0.35 },
  indpro: { low: 0, high: 0.2 },
  retail_sales: { low: 0, high: 0.4 },
  consumer_confidence: { low: 100, high: 120 }
};

function classifyIndicator(name, value) {
  if (value === null) return { classification: 'Unknown', score: null };

  const t = THRESHOLDS[name];
  if (value < t.low) return { classification: 'Low', threshold_low: t.low, threshold_high: t.high };
  if (value > t.high) return { classification: 'High', threshold_low: t.low, threshold_high: t.high };
  return { classification: 'Normal', threshold_low: t.low, threshold_high: t.high };
}

// Mapping: Classification → FPS Score
const FPS_MAP = {
  unemployment: { High: -1, Normal: 0, Low: +1 },
  jobless_claims: { High: -1, Normal: 0, Low: +1 },
  nonfarm_payrolls: { High: +1, Normal: 0, Low: -1 },
  cpi_yoy: { High: +1, Normal: 0, Low: -1 },
  core_cpi_yoy: { High: +1, Normal: 0, Low: -1 },
  ppi: { High: +1, Normal: 0, Low: -1 },
  cfnai: { High: +1, Normal: 0, Low: -1 },
  indpro: { High: +1, Normal: 0, Low: -1 },
  retail_sales: { High: +1, Normal: 0, Low: -1 },
  consumer_confidence: { High: +1, Normal: 0, Low: -1 }
};

function mapToFPS(indicator, classification) {
  return FPS_MAP[indicator][classification] || 0;
}

module.exports = { classifyIndicator, mapToFPS, THRESHOLDS };
```

---

### 3.2 FPS Calculation

```javascript
/**
 * File: backend/services/scoreCalculator.js
 */

const WEIGHTS = {
  fps: {
    unemployment: 1.5,
    jobless_claims: 1.0,
    nonfarm_payrolls: 1.5,
    cpi_yoy: 1.5,
    core_cpi_yoy: 2.0,
    ppi: 1.0,
    cfnai: 1.0,
    indpro: 0.5,
    retail_sales: 1.0,
    consumer_confidence: 0.5
  },
  gps: {
    unemployment: 1.5,
    jobless_claims: 1.0,
    nonfarm_payrolls: 2.0,
    cfnai: 1.5,
    indpro: 0.5,
    retail_sales: 1.5,
    consumer_confidence: 1.0
  }
};

function calculateFPS(classifiedIndicators) {
  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown = [];

  for (const [name, data] of Object.entries(classifiedIndicators)) {
    if (!WEIGHTS.fps[name]) continue;  // Skip GPS-only indicators

    const weight = WEIGHTS.fps[name];
    const score = data.fps_score;  // -1, 0, or +1

    if (score !== null) {
      const contribution = score * weight;
      weightedSum += contribution;
      totalWeight += weight;

      breakdown.push({
        indicator: name,
        value: data.value,
        classification: data.classification,
        score: score,
        weight: weight,
        contribution: contribution
      });
    }
  }

  const fps = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    fps: fps,
    confidence: Math.abs(fps) * 100,  // |FPS| as confidence
    breakdown: breakdown,
    total_weight: totalWeight
  };
}

function calculateGPS(classifiedIndicators) {
  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown = [];

  for (const [name, data] of Object.entries(classifiedIndicators)) {
    if (!WEIGHTS.gps[name]) continue;  // Skip inflation indicators

    const weight = WEIGHTS.gps[name];
    const score = data.gps_score;

    if (score !== null) {
      const contribution = score * weight;
      weightedSum += contribution;
      totalWeight += weight;

      breakdown.push({
        indicator: name,
        value: data.value,
        classification: data.classification,
        score: score,
        weight: weight,
        contribution: contribution
      });
    }
  }

  const gps = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    gps: gps,
    interpretation: interpretGPS(gps),
    breakdown: breakdown,
    total_weight: totalWeight
  };
}

function interpretGPS(gps) {
  if (gps > 0.5) return 'Very Strong Growth';
  if (gps > 0.2) return 'Moderate Growth';
  if (gps > -0.2) return 'Neutral';
  if (gps > -0.5) return 'Weak Growth';
  return 'Recessionary';
}

module.exports = { calculateFPS, calculateGPS, WEIGHTS };
```

---

## 4. Allocation Engine

### 4.1 Base Allocations

```javascript
/**
 * File: backend/services/allocationEngine.js
 */

const BASE_ALLOCATIONS = {
  'Most Liquid': { A: 10, B: 20, C: 30, D: 40 },
  'In Between (prefer C)': { A: 15, B: 25, C: 40, D: 20 },
  'In Between (prefer B)': { A: 15, B: 40, C: 30, D: 15 },
  'Least Liquid': { A: 60, B: 30, C: 10, D: 0 }
};

function getBaseAllocation(regime) {
  return { ...BASE_ALLOCATIONS[regime] };
}
```

---

### 4.2 FPS Tilt Logic

```javascript
function applyFPSTilt(allocation, fps, tiltMagnitude = 0.25) {
  const result = { ...allocation };
  const tiltPercent = fps * tiltMagnitude * 100;

  if (tiltPercent > 0) {
    // Defensive tilt: D→C→B→A
    let remaining = tiltPercent;

    const fromD = Math.min(result.D, remaining);
    result.D -= fromD;
    remaining -= fromD;

    const fromC = Math.min(result.C, remaining);
    result.C -= fromC;
    remaining -= fromC;

    const fromB = Math.min(result.B, remaining);
    result.B -= fromB;
    remaining -= fromB;

    // Distribute (2:1:1 ratio)
    const totalShifted = tiltPercent - remaining;
    result.A += totalShifted * 0.5;
    result.B += (totalShifted * 0.25) + fromB;
    result.C += (totalShifted * 0.25) + fromC;

  } else if (tiltPercent < 0) {
    // Growth tilt: A→B→C→D
    let remaining = Math.abs(tiltPercent);

    const fromA = Math.min(result.A, remaining);
    result.A -= fromA;
    remaining -= fromA;

    const fromB = Math.min(result.B, remaining);
    result.B -= fromB;
    remaining -= fromB;

    const fromC = Math.min(result.C, remaining);
    result.C -= fromC;
    remaining -= fromC;

    const totalShifted = Math.abs(tiltPercent) - remaining;
    result.D += totalShifted * 0.5;
    result.C += (totalShifted * 0.25) + fromC;
    result.B += (totalShifted * 0.25) + fromB;
  }

  // Normalize to 100
  const total = result.A + result.B + result.C + result.D;
  if (Math.abs(total - 100) > 0.01) {
    const adj = (100 - total) / 4;
    result.A += adj; result.B += adj; result.C += adj; result.D += adj;
  }

  // Round
  result.A = Math.round(result.A * 10) / 10;
  result.B = Math.round(result.B * 10) / 10;
  result.C = Math.round(result.C * 10) / 10;
  result.D = Math.round(result.D * 10) / 10;

  return result;
}
```

---

### 4.3 GPS Tie-Break

```javascript
function applyGPSTieBreak(allocation, regime, fps, gps) {
  if (Math.abs(fps) > 0.2) return allocation;  // FPS dominates
  if (!regime.includes('In Between')) return allocation;

  const result = { ...allocation };
  const shiftAmount = 7.5;

  if (gps > 0.3) {
    // Strong growth → favor C
    const shift = Math.min(result.B * 0.2, shiftAmount);
    result.C += shift;
    result.B -= shift;
  } else if (gps < -0.3) {
    // Weak growth → favor B
    const shift = Math.min(result.C * 0.2, shiftAmount);
    result.B += shift;
    result.C -= shift;
  }

  result.A = Math.round(result.A * 10) / 10;
  result.B = Math.round(result.B * 10) / 10;
  result.C = Math.round(result.C * 10) / 10;
  result.D = Math.round(result.D * 10) / 10;

  return result;
}

module.exports = { getBaseAllocation, applyFPSTilt, applyGPSTieBreak, BASE_ALLOCATIONS };
```

---

## 5. Database Schema

### 5.1 Updated `macro_data` Table

```sql
-- Migration Script
ALTER TABLE macro_data ADD COLUMN jobless_claims REAL;
ALTER TABLE macro_data ADD COLUMN nonfarm_payrolls REAL;
ALTER TABLE macro_data ADD COLUMN core_cpi REAL;
ALTER TABLE macro_data ADD COLUMN ppi REAL;
ALTER TABLE macro_data ADD COLUMN cfnai REAL;
ALTER TABLE macro_data ADD COLUMN indpro REAL;
ALTER TABLE macro_data ADD COLUMN retail_sales REAL;
ALTER TABLE macro_data ADD COLUMN consumer_confidence REAL;

-- MA columns
ALTER TABLE macro_data ADD COLUMN unrate_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN jobless_claims_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN nonfarm_payrolls_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN cpi_yoy_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN core_cpi_yoy_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN ppi_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN cfnai_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN indpro_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN retail_sales_ma3 REAL;
ALTER TABLE macro_data ADD COLUMN consumer_confidence_ma3 REAL;

-- Complete schema
CREATE TABLE macro_data (
  date TEXT PRIMARY KEY,

  -- Core (existing)
  walcl REAL,
  dff REAL,
  t10y2y REAL,
  unrate REAL,
  cpiaucsl REAL,

  -- New spot values
  jobless_claims REAL,
  nonfarm_payrolls REAL,
  core_cpi REAL,
  ppi REAL,
  cfnai REAL,
  indpro REAL,
  retail_sales REAL,
  consumer_confidence REAL,

  -- Moving averages
  unrate_ma3 REAL,
  jobless_claims_ma3 REAL,
  nonfarm_payrolls_ma3 REAL,
  cpi_yoy_ma3 REAL,
  core_cpi_yoy_ma3 REAL,
  ppi_ma3 REAL,
  cfnai_ma3 REAL,
  indpro_ma3 REAL,
  retail_sales_ma3 REAL,
  consumer_confidence_ma3 REAL,

  fetched_at TEXT
);

CREATE INDEX idx_macro_data_date ON macro_data(date DESC);
```

---

### 5.2 New `regime_history` Table

```sql
CREATE TABLE regime_history (
  date TEXT PRIMARY KEY,
  regime TEXT NOT NULL,
  regime_confidence REAL NOT NULL,

  -- Scores
  fps REAL NOT NULL,
  gps REAL NOT NULL,
  fps_confidence REAL,
  overall_confidence REAL NOT NULL,

  -- Allocation
  allocation_a REAL NOT NULL,
  allocation_b REAL NOT NULL,
  allocation_c REAL NOT NULL,
  allocation_d REAL NOT NULL,

  -- Metadata (JSON)
  fps_breakdown TEXT,
  gps_breakdown TEXT,
  warnings TEXT,

  recorded_at TEXT NOT NULL
);

CREATE INDEX idx_regime_history_date ON regime_history(date DESC);
```

---

## 6. Backend Implementation

### 6.1 File Structure

```
backend/
├── services/
│   ├── indicatorClassifier.js     (NEW - 100 lines)
│   ├── scoreCalculator.js         (NEW - 150 lines)
│   ├── enhancedRegimeCalculator.js (NEW - 200 lines)
│   ├── allocationEngine.js        (NEW - 150 lines)
│   ├── classifier.js              (UNCHANGED)
│   └── regimeCalculator.js        (DEPRECATED - keep for reference)
├── apis/
│   ├── fred.js                    (EXPAND - add 8 series)
│   └── openbb.js                  (UNCHANGED)
├── routes/
│   └── regime.js                  (ENHANCE - add new endpoints)
├── database.js                    (UPDATE - add tables)
└── config.js                      (EXPAND - add FPS/GPS config)
```

### 6.2 Enhanced FRED Fetching

```javascript
/**
 * File: backend/apis/fred.js (enhanced)
 */

async function updateMacroData(days = 365) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`📊 Fetching 13 FRED series from ${startDate} to ${endDate}...`);

  const [
    walclData, dffData, t10y2yData, unreateData, cpiData,
    joblessData, payrollsData, coreCpiData, ppiData,
    cfnaiData, indproData, retailData, consConfData
  ] = await Promise.all([
    openbb.getFredSeries('WALCL', startDate, endDate),
    openbb.getFredSeries('DFF', startDate, endDate),
    openbb.getFredSeries('T10Y2Y', startDate, endDate),
    openbb.getFredSeries('UNRATE', startDate, endDate),
    openbb.getFredSeries('CPIAUCSL', startDate, endDate),
    openbb.getFredSeries('ICSA', startDate, endDate),
    openbb.getFredSeries('PAYEMS', startDate, endDate),
    openbb.getFredSeries('CPILFESL', startDate, endDate),
    openbb.getFredSeries('PPIACO', startDate, endDate),
    openbb.getFredSeries('CFNAI', startDate, endDate),      // Chicago Fed Activity Index (replaces ISM Mfg)
    openbb.getFredSeries('INDPRO', startDate, endDate),     // Industrial Production (replaces Chicago PMI)
    openbb.getFredSeries('RSXFS', startDate, endDate),      // Retail Sales (replaces ISM Services)
    openbb.getFredSeries('UMCSENT', startDate, endDate)
  ]);

  // Merge by date and insert (similar to existing logic)
  // ... (insert statement with 13 series)
}
```

---

### 6.3 Enhanced Regime Calculator

```javascript
/**
 * File: backend/services/enhancedRegimeCalculator.js
 */

const db = require('../database');
const { classifyIndicator, mapToFPS } = require('./indicatorClassifier');
const { calculateFPS, calculateGPS } = require('./scoreCalculator');
const { getBaseAllocation, applyFPSTilt, applyGPSTieBreak } = require('./allocationEngine');

function calculateEnhancedRegime() {
  // 1. Get latest macro data with MAs
  const latest = getLatestMacroDataWithMA();

  // 2. Classify base regime (unchanged logic)
  const baseRegime = classifyBaseRegime(latest);

  // 3. Classify indicators
  const classified = classifyAllIndicators(latest);

  // 4. Calculate FPS and GPS
  const fpsResult = calculateFPS(classified);
  const gpsResult = calculateGPS(classified);

  // 5. Get base allocation
  let allocation = getBaseAllocation(baseRegime.regime);

  // 6. Apply FPS tilt
  allocation = applyFPSTilt(allocation, fpsResult.fps);

  // 7. Apply GPS tie-break
  allocation = applyGPSTieBreak(allocation, baseRegime.regime, fpsResult.fps, gpsResult.gps);

  // 8. Generate interpretation
  const interpretation = generateInterpretation(baseRegime, fpsResult, gpsResult);

  // 9. Calculate confidence
  const confidence = calculateOverallConfidence(baseRegime, fpsResult, gpsResult);

  return {
    regime: baseRegime.regime,
    description: baseRegime.description,
    metrics: baseRegime.metrics,

    scores: {
      fps: fpsResult.fps,
      gps: gpsResult.gps,
      fps_confidence: fpsResult.confidence,
      gps_interpretation: gpsResult.interpretation
    },

    allocation: allocation,
    confidence: confidence,
    interpretation: interpretation,

    breakdown: {
      fps: fpsResult.breakdown,
      gps: gpsResult.breakdown
    },

    asOf: new Date().toISOString()
  };
}

function classifyBaseRegime(data) {
  // Use existing regimeCalculator logic
  // ... (percentile calculation, BS slope)
}

module.exports = { calculateEnhancedRegime };
```

---

## 7. Frontend Implementation

### 7.1 Component Structure

```
frontend/src/components/
├── RegimeDisplay.jsx              (ENHANCED - add child components)
├── ScoreGauge.jsx                 (NEW - FPS/GPS gauges)
├── IndicatorGrid.jsx              (NEW - 13 indicators table)
├── AllocationChart.jsx            (NEW - horizontal bar chart)
├── InterpretationPanel.jsx        (NEW - messages/warnings)
└── RegimeHistoryChart.jsx         (NEW - time series chart)
```

### 7.2 Enhanced RegimeDisplay

```jsx
/**
 * File: frontend/src/components/RegimeDisplay.jsx
 */

import React from 'react';
import ScoreGauge from './ScoreGauge';
import IndicatorGrid from './IndicatorGrid';
import AllocationChart from './AllocationChart';
import InterpretationPanel from './InterpretationPanel';

function RegimeDisplay({ data, loading, error }) {
  if (loading) return <div className="loading">Loading regime data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const { regime, scores, allocation, confidence, interpretation, breakdown } = data;

  return (
    <div className="enhanced-regime-display">
      {/* Regime Header */}
      <div className="regime-header">
        <h2>{regime}</h2>
        <span className="confidence-badge">{confidence}% confidence</span>
      </div>

      {/* Score Gauges */}
      <div className="score-gauges">
        <ScoreGauge
          label="Fed Pressure (FPS)"
          value={scores.fps}
          min={-1}
          max={1}
          thresholds={[
            { value: -0.5, label: 'Dovish', color: 'green' },
            { value: 0.5, label: 'Hawkish', color: 'red' }
          ]}
        />
        <ScoreGauge
          label="Growth Pulse (GPS)"
          value={scores.gps}
          min={-1}
          max={1}
          thresholds={[
            { value: -0.3, label: 'Weak', color: 'red' },
            { value: 0.3, label: 'Strong', color: 'green' }
          ]}
        />
      </div>

      {/* Allocation Chart */}
      <AllocationChart allocation={allocation} />

      {/* Indicator Grid */}
      <IndicatorGrid breakdown={breakdown} />

      {/* Interpretation */}
      <InterpretationPanel messages={interpretation} />
    </div>
  );
}

export default RegimeDisplay;
```

---

### 7.3 Score Gauge Component

```jsx
/**
 * File: frontend/src/components/ScoreGauge.jsx
 */

import React from 'react';
import './ScoreGauge.css';

function ScoreGauge({ label, value, min, max, thresholds }) {
  const percentage = ((value - min) / (max - min)) * 100;

  const getColor = () => {
    for (const t of thresholds) {
      if (value >= t.value) return t.color;
    }
    return 'gray';
  };

  return (
    <div className="score-gauge">
      <div className="gauge-label">{label}</div>
      <div className="gauge-value" style={{ color: getColor() }}>
        {value.toFixed(2)}
      </div>
      <div className="gauge-bar">
        <div
          className="gauge-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getColor()
          }}
        />
      </div>
      <div className="gauge-scale">
        <span>{min}</span>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default ScoreGauge;
```

---

## 8. Configuration Reference

### 8.1 Backend Config

```javascript
/**
 * File: backend/config.js (enhanced)
 */

module.exports = {
  // Existing class targets (unchanged)
  classTargets: { /* ... */ },

  // NEW: FPS/GPS Configuration
  fps: {
    weights: {
      unemployment: 1.5,
      jobless_claims: 1.0,
      nonfarm_payrolls: 1.5,
      cpi_yoy: 1.5,
      core_cpi_yoy: 2.0,
      ppi: 1.0,
      cfnai: 1.0,
      indpro: 0.5,
      retail_sales: 1.0,
      consumer_confidence: 0.5
    },
    tiltMagnitude: 0.25  // k parameter
  },

  gps: {
    weights: {
      unemployment: 1.5,
      jobless_claims: 1.0,
      nonfarm_payrolls: 2.0,
      cfnai: 1.5,
      indpro: 0.5,
      retail_sales: 1.5,
      consumer_confidence: 1.0
    },
    tieBreakThreshold: 0.2,  // |FPS| threshold for GPS to activate
    strongThreshold: 0.3     // GPS threshold for tie-break
  },

  // Indicator thresholds
  thresholds: {
    unemployment: { low: 4.0, high: 5.5 },
    jobless_claims: { low: 250000, high: 350000 },
    nonfarm_payrolls: { low: 50000, high: 250000 },
    cpi_yoy: { low: 2.0, high: 3.0 },
    core_cpi_yoy: { low: 2.0, high: 3.0 },
    ppi: { low: 0, high: 0.2 },
    cfnai: { low: -0.7, high: 0.35 },
    indpro: { low: 0, high: 0.2 },
    retail_sales: { low: 0, high: 0.4 },
    consumer_confidence: { low: 100, high: 120 }
  },

  // Base allocations
  baseAllocations: {
    'Most Liquid': { A: 10, B: 20, C: 30, D: 40 },
    'In Between (prefer C)': { A: 15, B: 25, C: 40, D: 20 },
    'In Between (prefer B)': { A: 15, B: 40, C: 30, D: 15 },
    'Least Liquid': { A: 60, B: 30, C: 10, D: 0 }
  }
};
```

---

## 9. API Documentation

### 9.1 Enhanced Regime Endpoint

**GET `/api/regime`**

**Response:**
```json
{
  "regime": "Most Liquid",
  "description": "Low Rates + Balance Sheet Increasing",
  "metrics": {
    "fedFundsRate": 2.35,
    "rateIsLow": true,
    "balanceSheetIncreasing": true,
    "asOf": "2025-01-15"
  },
  "scores": {
    "fps": 0.42,
    "gps": 0.18,
    "fps_confidence": 42,
    "gps_interpretation": "Moderate Growth"
  },
  "allocation": {
    "A": 12.5,
    "B": 22.0,
    "C": 32.5,
    "D": 33.0
  },
  "confidence": 68,
  "interpretation": [
    "Current Regime: Most Liquid",
    "Moderate contractionary pressure (FPS: +0.42)",
    "Moderate growth signals (GPS: +0.18)"
  ],
  "breakdown": {
    "fps": [
      {
        "indicator": "core_cpi_yoy",
        "value": 3.2,
        "classification": "High",
        "score": 1,
        "weight": 2.0,
        "contribution": 2.0
      },
      // ... all 10 FPS indicators
    ],
    "gps": [
      // ... all 7 GPS indicators
    ]
  }
}
```

---

## 10. Implementation Checklist

### Phase 1: Database (30 min)
- [ ] Backup database: `cp data/stocks.db data/stocks.db.backup`
- [ ] Run migration SQL
- [ ] Verify schema: `sqlite3 data/stocks.db ".schema macro_data"`

### Phase 2: Backend - Data Layer (2 hours)
- [ ] Update `backend/apis/fred.js` to fetch 8 new series
- [ ] Test: `node scripts/fetchMacroData.js`
- [ ] Verify data in database

### Phase 3: Backend - Logic (4 hours)
- [ ] Create `backend/services/indicatorClassifier.js`
- [ ] Create `backend/services/scoreCalculator.js`
- [ ] Create `backend/services/enhancedRegimeCalculator.js`
- [ ] Create `backend/services/allocationEngine.js`
- [ ] Update `backend/config.js`

### Phase 4: Backend - API (1 hour)
- [ ] Update `backend/routes/regime.js`
- [ ] Test: `curl http://localhost:8345/api/regime`

### Phase 5: Frontend (6 hours)
- [ ] Create `ScoreGauge.jsx`
- [ ] Create `IndicatorGrid.jsx`
- [ ] Create `AllocationChart.jsx`
- [ ] Create `InterpretationPanel.jsx`
- [ ] Update `RegimeDisplay.jsx`
- [ ] Update `App.jsx` to fetch enhanced data

### Phase 6: Testing (2 hours)
- [ ] Manual calculation verification
- [ ] Edge case testing (stagflation, etc.)
- [ ] UI responsive testing

### Phase 7: Deployment (30 min)
- [ ] Restart backend: `pm2 restart portfolio-backend`
- [ ] Rebuild frontend: `npm run build`
- [ ] Monitor logs

---

**Total Estimated Time:** 16-20 hours

**Document Status:** ✅ Complete Implementation Specification

**Next Steps:** Begin with Phase 1 (Database Migration)

---

*End of Document*
