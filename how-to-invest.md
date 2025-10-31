How to Invest:

Purpose
A simple playbook that links macro conditions to stock selection using two axes and four stock classes.

Axes
• X-axis: interest rates, from low (left) to high (right).
• Y-axis: Federal Reserve balance sheet, from decreasing (bottom) to increasing (top).


Y-axis: Balance Sheet (↑ increasing / ↓ decreasing)
                                 ↑
+-------------------------------+-------------------------------+
| Most liquid: Stock D          | In between                    |
| Investment portion: 0-100%+   | Investment portion: 0-50%     |
|                               | Stock: B or C (prefer B)      |
+-------------------------------+-------------------------------+
| In between                    | Least liquid                  |
| Investment portion: 0-50%     | Investment portion: 0-20%     |
| Stock: B or C (prefer C)      | Stock: A                      |
+-------------------------------+-------------------------------+
                                 ↓
X-axis: Interest Rate (Low -> High)



What happens when the axes move
• Balance sheet increases and/or rates fall: borrowing becomes easier, borrowing costs drop, market valuations tend to rise (lower WACC, shift from bonds to stocks), debt burdens ease; high-growth and lower-profit companies benefit.
• Balance sheet decreases and/or rates rise: borrowing becomes harder, borrowing costs rise, market valuations tend to fall (higher WACC, shift from stocks to bonds), debt burdens worsen; strong profit and cash-flow businesses benefit.

Four macro regimes and how to tilt

1. Most liquid (top-left: low rates, balance sheet increasing)
   • Stance: aggressive.
   • Tilt: D only.

2. In between (bottom-left: low rates, balance sheet decreasing)
   • Stance: moderate, investment portion 0–50%.
   • Tilt: prefer C, consider B.

3. In between (top-right: high rates, balance sheet increasing)
   • Stance: moderate, investment portion 0–50%.
   • Tilt: prefer B, consider C.

4. Least liquid (bottom-right: high rates, balance sheet decreasing)
   • Stance: defensive, investment portion 0–20%.
   • Tilt: A.

Stock classes and the Core 4

| Class | Revenue growth | Earnings growth | P/E (next 12 months) | Debt/EBITDA      | Profile                                                                   |
| ----- | -------------- | --------------- | -------------------- | ---------------- | ------------------------------------------------------------------------- |
| A     | ~5%            | ~5%             | ~10x                 | ~1.0x            | Mature, cash-rich, low leverage, valuation discipline                     |
| B     | ~10%           | ~10%            | ~20x                 | ~3.0x            | Steady growers, reasonable profitability, moderate leverage               |
| C     | ~20%           | ~10%            | ~25x                 | ~5.0x            | Faster growth, higher multiple, higher leverage; needs liquidity support  |
| D     | >50%           | N/A             | N/A                  | Very high/“huge” | Hypergrowth, pre-profit or story-driven; maximally sensitive to liquidity |

How to apply

1. Identify the regime by observing the direction of rates and the Fed balance sheet.
2. Select the matching class tilt from the four regimes above.
3. Screen securities by the Core 4 metrics to confirm the class fit before sizing positions.


-------------


---

## Appendix: Automated Classification System

### Overview

This appendix specifies the fuzzy scoring system for automated stock classification. The system uses triangular closeness functions to handle edge cases gracefully, provides confidence scores, and remains stable as metrics update.

### Core Classification Formula

#### Inputs per Stock

- `rev_g` = revenue growth % (NTM or blended TTM+guidance)
- `eps_g` = EPS growth % (NTM)
- `pe` = forward P/E (NTM)
- `de` = net debt / EBITDA
- `flags` = {eps_positive, ebitda_positive, pe_available}

#### Triangular Closeness Function
```
Tri(x, center, halfwidth) = max(0, 1 − |x − center| / halfwidth)
```

This function returns 1.0 when `x` exactly matches the `center`, decreases linearly to 0.0 at the edges, and caps at 0 beyond the halfwidth range.

#### Example Classes

| Metric          | A    | B    | C    | D         |
| --------------- | ---- | ---- | ---- | --------- |
| Revenue Growth  | 5%   | 10%  | 20%  | >50%      |
| Earnings Growth | 5%   | 10%  | 10%  | N/A       |
| P/E (+1Y)       | 10x  | 20x  | 25x  | N/A       |
| Debt/EBITDA     | 1.0x | 3.0x | 5.0x | Huge debt |


*D revenue target is only used if the D gate is not already triggered.

#### Per-Class Scores (0–1 range)

**A_score** = average of non-blank:
- Tri(rev_g, 5, 5)
- Tri(eps_g, 5, 5)
- Tri(pe, 10, 6)
- Tri(de, 1, 1)

**B_score** = average of non-blank:
- Tri(rev_g, 10, 5)
- Tri(eps_g, 10, 7)
- Tri(pe, 20, 6)
- Tri(de, 3, 1.5)

**C_score** = average of non-blank:
- Tri(rev_g, 20, 10)
- Tri(eps_g, 10, 10)
- Tri(pe, 25, 10)
- Tri(de, 5, 2)

**D_score** = 
- IF (rev_g ≥ 50) OR (NOT eps_positive) OR (NOT ebitda_positive) OR (NOT pe_available) THEN 1.0
- ELSE Tri(rev_g, 60, 20)

#### Final Classification
```
scores = {A_score, B_score, C_score, D_score}
Class = argmax(scores) with tie-break priority: D > C > B > A
Confidence = max(scores) − second_max(scores)
```

---

### Dashboard Implementation Guide

#### Enhancement 1: Display Both Class and Breakdown

**What to show:**
```
Primary Display: "Class B"
Secondary Display: "Confidence: 0.65"
Detail View: A:0.15  B:0.78  C:0.13  D:0.00
```

**Implementation:**
- Main view shows the assigned class prominently
- Show confidence score as a percentage or decimal
- On hover/expand, show all four class scores as a horizontal bar chart or sparkline
- This transparency helps users understand borderline cases

**Example Visual:**
```
Stock XYZ: Class B (Confidence: 65%)
[████░░░░░░] A: 0.15
[████████░░] B: 0.78  ← Selected
[████░░░░░░] C: 0.13
[░░░░░░░░░░] D: 0.00
```

#### Enhancement 2: Color-Code Confidence Levels

**Confidence Tiers:**

| Tier | Confidence Range | Color Treatment | Interpretation |
|------|-----------------|-----------------|----------------|
| High | > 0.40 | Solid class color (100% opacity) | Clear classification; high certainty |
| Medium | 0.20 - 0.40 | Medium shade (70% opacity) | Reasonable fit; some overlap with other classes |
| Low | < 0.20 | Light shade (40% opacity) + ⚠️ icon | Borderline; may need manual review |

**Suggested Color Palette:**
- Class A: Blue (stable, mature)
- Class B: Green (steady growth)
- Class C: Orange (higher risk/reward)
- Class D: Red/Purple (hypergrowth/speculative)

**Implementation:**
```
IF Confidence > 0.40:
    background-color: class_color at 100% opacity
ELSE IF Confidence > 0.20:
    background-color: class_color at 70% opacity
ELSE:
    background-color: class_color at 40% opacity
    add warning badge: "Borderline"
```

#### Enhancement 3: Pure Class Filter

**Purpose:** Allow users to filter to only high-confidence stocks when they want clear-cut examples of each class.

**Filter Options:**
1. **All stocks** (default view)
2. **High confidence only** (confidence > 0.40)
3. **Medium+ confidence** (confidence > 0.20)
4. **Borderline cases** (confidence < 0.20) - useful for manual review

**Use Cases:**
- Building a teaching portfolio? Use "High confidence only"
- Looking for edge cases to research? Use "Borderline cases"
- General screening? Use "Medium+ confidence"

**Implementation:**
Add dropdown or toggle filter at the top of your dashboard:
```
☐ Show all stocks
☑ High confidence only (>0.40)
☐ Medium+ confidence (>0.20)
☐ Borderline cases (<0.20)
```

#### Enhancement 4: Metric Weighting (Optional)

**Default:** All four metrics are equally weighted (simple average).

**When to adjust weights:**
- **Prioritize growth:** Increase weight on revenue growth in high-liquidity regimes
- **Prioritize safety:** Increase weight on debt/EBITDA in low-liquidity regimes
- **De-emphasize P/E:** When valuations are distorted market-wide

**Example Weighted Formula:**
```
# Standard equal weighting
score = average(metric_scores)

# Custom weighting example for Class B in defensive regime
B_score_weighted = (
    0.15 * Tri(rev_g, 10, 5) +
    0.25 * Tri(eps_g, 10, 7) +
    0.20 * Tri(pe, 20, 6) +
    0.40 * Tri(de, 3, 1.5)
)
```

**Recommendation:** Start with equal weights and only adjust if you find systematic issues with classifications in your specific universe of stocks.

#### Enhancement 5: Halfwidth Tuning

**The halfwidth parameter controls classification sensitivity.**

**Tighter halfwidths (±3 instead of ±5):**
- Pros: More precise classifications; fewer borderline cases
- Cons: More stocks will score poorly on all classes; harder to classify

**Wider halfwidths (±8 instead of ±5):**
- Pros: More forgiving; most stocks will fit reasonably into at least one class
- Cons: More overlapping classifications; lower confidence scores

**Tuning Process:**
1. Start with the suggested halfwidths (shown in table above)
2. Run classification on your full stock universe
3. Check the distribution:
   - If >30% of stocks are low-confidence: widen halfwidths by 20-30%
   - If >60% of stocks are high-confidence: tighten halfwidths by 20-30%
   - Target: 40-50% high confidence, 30-40% medium confidence, 10-20% low confidence
4. Adjust per-metric as needed (e.g., P/E ranges might need wider halfwidths due to sector variation)

**Example Adjustment:**
```
# Original
B_pe_score = Tri(pe, 20, 6)  # accepts 14-26 range

# If you find too many stocks just outside this range
B_pe_score = Tri(pe, 20, 8)  # now accepts 12-28 range

# If you want to be more strict
B_pe_score = Tri(pe, 20, 4)  # only accepts 16-24 range
```

---

### Dashboard Views by Regime

#### Macro Regime Calculation

**Inputs:**
- `policy_rate` = current Federal Reserve policy rate
- `rate_low` = (policy_rate − min_1y) / (max_1y − min_1y) < 0.5
- `bs_up` = (FedAssets_current − FedAssets_12_weeks_ago) > 0

**Regime Logic:**
```
IF rate_low AND bs_up:
    Regime = "Most Liquid"
ELSE IF rate_low AND NOT bs_up:
    Regime = "In Between (prefer C)"
ELSE IF NOT rate_low AND bs_up:
    Regime = "In Between (prefer B)"
ELSE:
    Regime = "Least Liquid"
```

#### View Filtering and Sorting

**Most Liquid (0-100%+ position sizing):**
- Filter: Show only Class D stocks
- Sort: By D_score descending
- Highlight: Revenue growth rate (key driver)

**In Between - Prefer C (0-50% position sizing):**
- Filter: Show Class C and B stocks
- Sort: By C_score descending, then B_score
- Highlight: Stocks where C_score > B_score

**In Between - Prefer B (0-50% position sizing):**
- Filter: Show Class B and C stocks
- Sort: By B_score descending, then C_score
- Highlight: Stocks where B_score > C_score

**Least Liquid (0-20% position sizing):**
- Filter: Show only Class A stocks
- Sort: By A_score descending
- Highlight: Debt/EBITDA and P/E (safety metrics)

---

### Example Dashboard Row Display
```
┌─────────────────────────────────────────────────────────────┐
│ AAPL - Apple Inc.                          Class: B (76%)   │
│                                                              │
│ Rev Growth: 8%    EPS Growth: 9%    P/E: 22x    D/E: 2.8x  │
│                                                              │
│ Scores:  A: 0.42  [████████░░] 
│          B: 0.76  [███████████████] ← Selected              │
│          C: 0.28  [█████░░░░░]                              │
│          D: 0.00  [░░░░░░░░░░]                              │
│                                                              │
│ Position Band: 0-50% (Regime: In Between - prefer B)        │
└─────────────────────────────────────────────────────────────┘
```

---

### Handling Special Cases

#### Case 1: Negative or Missing Metrics

**Revenue Growth is negative:**
- Still calculate all scores normally
- Tri() will return 0 for large deviations, which is correct
- May trigger D_gate if other flags are set

**P/E is unavailable (pre-profit):**
- Sets `pe_available = FALSE`
- Automatically triggers D_gate → D_score = 1.0
- Correct classification for pre-profit hypergrowth

**Debt is negative (net cash position):**
- Treat as de = 0 for scoring purposes
- Scores well for Class A (target is de = 1.0 ± 1.0)

#### Case 2: Extreme Outliers

**Revenue growth >200%:**
- D_score will be 1.0 (due to gate)
- Other scores will be ~0 (far from targets)
- Correct: classified as D

**P/E >100:**
- Indicates speculation or very low earnings
- Will score poorly on all classes except D
- If EPS is positive, check if stock is misclassified; may need manual review

#### Case 3: Sector-Specific Adjustments

**REITs, Utilities, Financials:**
- May need separate classification models
- These sectors have structurally different metrics (e.g., high leverage is normal)
- Consider: either exclude from automation or create sector-specific targets

**Commodities/Cyclicals:**
- Metrics can swing wildly quarter-to-quarter
- Consider: using trailing 3-year averages instead of NTM estimates

---

### Quality Checks and Validation

Before going live with your dashboard, validate the classification system:

1. **Spot Check 20-30 Stocks:**
   - Pick well-known stocks you already understand
   - Verify their assigned classes match your intuition
   - Review low-confidence classifications

2. **Test Edge Cases:**
   - Pre-profit high-growth (should be D)
   - Mature low-growth with low debt (should be A)
   - High-growth, high-profit, high-valuation (should be C)

3. **Monitor Classification Stability:**
   - Track how often stocks change classes week-over-week
   - If >20% of stocks flip classes weekly, widen your halfwidths
   - Goal: <10% weekly class changes in stable markets

4. **Cross-Reference with Regime:**
   - In "Most Liquid" regime, are you seeing more D classifications?
   - In "Least Liquid" regime, are you seeing more A classifications?
   - The system should naturally surface the right classes for the environment

---

### Implementation Checklist

- [ ] Set up data pipeline for rev_g, eps_g, pe, de inputs
- [ ] Implement Tri() function in your spreadsheet/code
- [ ] Calculate A/B/C/D scores for all stocks
- [ ] Implement classification logic (argmax with confidence)
- [ ] Add color-coding based on confidence tiers
- [ ] Create regime calculator with Fed data
- [ ] Build filtered views for each regime
- [ ] Add "pure class" filter toggle
- [ ] Validate with known stocks
- [ ] Document any custom halfwidth adjustments
- [ ] Set up weekly review process for borderline cases

---

**Remember:** The fuzzy scoring system is designed to handle ambiguity gracefully. When in doubt, rely on the confidence score—low confidence means the stock deserves a deeper manual review before position sizing.
