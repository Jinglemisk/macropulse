/**
 * ✅ FPS/GPS Enhancement: Allocation Engine
 *
 * Applies dynamic allocation tilting based on FPS and GPS scores
 * - FPS Tilt: Shifts allocation along A→D ladder based on Fed policy direction
 * - GPS Tie-Break: Resolves B vs C ambiguity in In-Between regimes
 */

/**
 * Base allocation percentages by regime
 * Based on 2×2 matrix: Rates (Low/High) × Balance Sheet (Increasing/Decreasing)
 */
const BASE_ALLOCATIONS = {
  'Most Liquid': { A: 10, B: 20, C: 30, D: 40 },
  'In Between (prefer C)': { A: 15, B: 25, C: 40, D: 20 },
  'In Between (prefer B)': { A: 15, B: 40, C: 30, D: 15 },
  'Least Liquid': { A: 60, B: 30, C: 10, D: 0 }
};

/**
 * Get base allocation for a regime
 * @param {string} regime - Regime name
 * @returns {object} - { A, B, C, D } percentages
 */
function getBaseAllocation(regime) {
  const base = BASE_ALLOCATIONS[regime];
  if (!base) {
    console.warn(`Unknown regime: ${regime}, defaulting to neutral allocation`);
    return { A: 25, B: 25, C: 25, D: 25 };
  }
  return { ...base };
}

/**
 * Apply FPS tilt to allocation
 * @param {object} allocation - Current allocation { A, B, C, D }
 * @param {number} fps - FPS score (-1.0 to +1.0)
 * @param {number} tiltMagnitude - k parameter (default 0.25 = 25% max shift)
 * @returns {object} - Tilted allocation { A, B, C, D }
 */
function applyFPSTilt(allocation, fps, tiltMagnitude = 0.25) {
  const result = { ...allocation };
  const tiltPercent = fps * tiltMagnitude * 100;

  // No tilt if FPS is near zero
  if (Math.abs(tiltPercent) < 0.5) {
    return result;
  }

  if (tiltPercent > 0) {
    // Defensive tilt: D→C→B→A (shift away from growth)
    let remaining = tiltPercent;

    // Take from D, C, B in order
    const fromD = Math.min(result.D, remaining);
    result.D -= fromD;
    remaining -= fromD;

    const fromC = Math.min(result.C, remaining);
    result.C -= fromC;
    remaining -= fromC;

    const fromB = Math.min(result.B, remaining);
    result.B -= fromB;
    remaining -= fromB;

    // Distribute to A, B, C (2:1:1 ratio favoring A)
    const totalShifted = tiltPercent - remaining;
    result.A += totalShifted * 0.5;
    result.B += (totalShifted * 0.25) + fromB;
    result.C += (totalShifted * 0.25) + fromC;

  } else if (tiltPercent < 0) {
    // Growth tilt: A→B→C→D (shift toward growth)
    let remaining = Math.abs(tiltPercent);

    // Take from A, B, C in order
    const fromA = Math.min(result.A, remaining);
    result.A -= fromA;
    remaining -= fromA;

    const fromB = Math.min(result.B, remaining);
    result.B -= fromB;
    remaining -= fromB;

    const fromC = Math.min(result.C, remaining);
    result.C -= fromC;
    remaining -= fromC;

    // Distribute to D, C, B (2:1:1 ratio favoring D)
    const totalShifted = Math.abs(tiltPercent) - remaining;
    result.D += totalShifted * 0.5;
    result.C += (totalShifted * 0.25) + fromC;
    result.B += (totalShifted * 0.25) + fromB;
  }

  // Normalize to 100 and round
  return normalizeAllocation(result);
}

/**
 * Apply GPS tie-break to allocation
 * Only applies if:
 * - |FPS| < 0.2 (FPS is neutral)
 * - Regime is "In Between"
 * @param {object} allocation - Current allocation { A, B, C, D }
 * @param {string} regime - Regime name
 * @param {number} fps - FPS score
 * @param {number} gps - GPS score
 * @returns {object} - Adjusted allocation { A, B, C, D }
 */
function applyGPSTieBreak(allocation, regime, fps, gps) {
  // Only apply if FPS is neutral
  if (Math.abs(fps) > 0.2) {
    return allocation;
  }

  // Only apply to In-Between regimes
  if (!regime.includes('In Between')) {
    return allocation;
  }

  const result = { ...allocation };
  const shiftAmount = 7.5;  // 7.5% shift

  if (gps > 0.3) {
    // Strong growth → favor C over B
    const shift = Math.min(result.B * 0.2, shiftAmount);
    result.C += shift;
    result.B -= shift;
  } else if (gps < -0.3) {
    // Weak growth → favor B over C
    const shift = Math.min(result.C * 0.2, shiftAmount);
    result.B += shift;
    result.C -= shift;
  }

  return normalizeAllocation(result);
}

/**
 * Normalize allocation to sum to 100 and round to 1 decimal
 * @param {object} allocation - { A, B, C, D }
 * @returns {object} - Normalized allocation
 */
function normalizeAllocation(allocation) {
  const total = allocation.A + allocation.B + allocation.C + allocation.D;

  // Normalize to 100
  if (Math.abs(total - 100) > 0.01) {
    const factor = 100 / total;
    allocation.A *= factor;
    allocation.B *= factor;
    allocation.C *= factor;
    allocation.D *= factor;
  }

  // Round to 1 decimal
  allocation.A = Math.round(allocation.A * 10) / 10;
  allocation.B = Math.round(allocation.B * 10) / 10;
  allocation.C = Math.round(allocation.C * 10) / 10;
  allocation.D = Math.round(allocation.D * 10) / 10;

  // Handle rounding errors (ensure exactly 100)
  const roundedTotal = allocation.A + allocation.B + allocation.C + allocation.D;
  if (roundedTotal !== 100) {
    const diff = 100 - roundedTotal;
    allocation.A += diff;  // Add rounding error to A
    allocation.A = Math.round(allocation.A * 10) / 10;
  }

  return allocation;
}

/**
 * Calculate final allocation with all tilts applied
 * @param {string} regime - Base regime
 * @param {number} fps - FPS score
 * @param {number} gps - GPS score
 * @returns {object} - { allocation: { A, B, C, D }, steps: [...] }
 */
function calculateAllocation(regime, fps, gps) {
  const steps = [];

  // Step 1: Base allocation
  let allocation = getBaseAllocation(regime);
  steps.push({
    step: 'Base Allocation',
    regime: regime,
    allocation: { ...allocation }
  });

  // Step 2: FPS tilt
  const beforeFPS = { ...allocation };
  allocation = applyFPSTilt(allocation, fps);
  if (JSON.stringify(beforeFPS) !== JSON.stringify(allocation)) {
    steps.push({
      step: 'FPS Tilt',
      fps: fps,
      tilt: fps * 0.25 * 100,
      allocation: { ...allocation }
    });
  }

  // Step 3: GPS tie-break
  const beforeGPS = { ...allocation };
  allocation = applyGPSTieBreak(allocation, regime, fps, gps);
  if (JSON.stringify(beforeGPS) !== JSON.stringify(allocation)) {
    steps.push({
      step: 'GPS Tie-Break',
      gps: gps,
      allocation: { ...allocation }
    });
  }

  return {
    allocation: allocation,
    steps: steps
  };
}

module.exports = {
  getBaseAllocation,
  applyFPSTilt,
  applyGPSTieBreak,
  normalizeAllocation,
  calculateAllocation,
  BASE_ALLOCATIONS
};
