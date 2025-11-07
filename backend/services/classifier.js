const { tri } = require('../utils/formulas');
const config = require('../config');

/**
 * Calculate class scores for a stock
 * @param {Object} fundamentals - { revenueGrowth, epsGrowth, peForward, debtEbitda, eps, ebitda, flags }
 * @returns {Object} - { scores: { A, B, C, D }, finalClass, confidence }
 */
function classifyStock(fundamentals) {
  const { revenueGrowth, epsGrowth, peForward, debtEbitda } = fundamentals;
  const { epsPositive, ebitdaPositive, peAvailable } = fundamentals;
  // ✅ NEW: Access raw eps and ebitda values to check for actual negative earnings
  const { eps, ebitda } = fundamentals;

  const targets = config.classTargets;

  // --- Class A Score ---
  const aScores = [
    tri(revenueGrowth, targets.A.revenueGrowth.center, targets.A.revenueGrowth.halfwidth),
    tri(epsGrowth, targets.A.epsGrowth.center, targets.A.epsGrowth.halfwidth),
    tri(peForward, targets.A.peForward.center, targets.A.peForward.halfwidth),
    tri(debtEbitda, targets.A.debtEbitda.center, targets.A.debtEbitda.halfwidth)
  ].filter(score => score !== null);

  const A = aScores.length > 0 ? average(aScores) : 0;

  // --- Class B Score ---
  const bScores = [
    tri(revenueGrowth, targets.B.revenueGrowth.center, targets.B.revenueGrowth.halfwidth),
    tri(epsGrowth, targets.B.epsGrowth.center, targets.B.epsGrowth.halfwidth),
    tri(peForward, targets.B.peForward.center, targets.B.peForward.halfwidth),
    tri(debtEbitda, targets.B.debtEbitda.center, targets.B.debtEbitda.halfwidth)
  ].filter(score => score !== null);

  const B = bScores.length > 0 ? average(bScores) : 0;

  // --- Class C Score ---
  const cScores = [
    tri(revenueGrowth, targets.C.revenueGrowth.center, targets.C.revenueGrowth.halfwidth),
    tri(epsGrowth, targets.C.epsGrowth.center, targets.C.epsGrowth.halfwidth),
    tri(peForward, targets.C.peForward.center, targets.C.peForward.halfwidth),
    tri(debtEbitda, targets.C.debtEbitda.center, targets.C.debtEbitda.halfwidth)
  ].filter(score => score !== null);

  const C = cScores.length > 0 ? average(cScores) : 0;

  // --- Class D Score (with gate logic) ---
  let D = 0;

  // ✅ FIXED: D gate triggers for hypergrowth or pre-profit companies
  // Only trigger if:
  // 1. Hypergrowth (revenue >= 50%), OR
  // 2. Actually losing money (eps or ebitda is NEGATIVE), OR
  // 3. Missing ALL earnings indicators (no P/E AND no EPS growth)
  const dGateTrigger =
    (revenueGrowth !== null && revenueGrowth >= targets.D.revenueGrowthThreshold) ||
    (eps !== null && eps !== undefined && eps < 0) ||
    (ebitda !== null && ebitda !== undefined && ebitda < 0) ||
    (!peAvailable && epsGrowth === null);

  if (dGateTrigger) {
    D = 1.0;
  } else {
    // Fallback scoring using multi-metric approach (like A/B/C)
    const dScores = [
      tri(revenueGrowth, targets.D.revenueGrowth.center, targets.D.revenueGrowth.halfwidth),
      tri(epsGrowth, targets.D.epsGrowth.center, targets.D.epsGrowth.halfwidth),
      tri(peForward, targets.D.peForward.center, targets.D.peForward.halfwidth)
    ].filter(score => score !== null);

    D = dScores.length > 0 ? average(dScores) : 0;
  }

  // --- Final Classification ---
  const scores = { A, B, C, D };
  const sortedClasses = ['D', 'C', 'B', 'A'];  // Tie-break priority

  // Find max score
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

/**
 * Calculate average of array
 */
function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

module.exports = { classifyStock };
