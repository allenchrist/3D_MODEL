/**
 * perception.js — Pure utility functions for perception data processing.
 * These are designed to be reused across components, hooks, and future
 * AI integration layers without side effects.
 */

/* ── Constants ──────────────────────────────────────────────── */
export const RISK_DISTANCE = { HIGH: 20, MEDIUM: 45 };
export const CONF_THRESHOLD = { HIGH: 0.85, MEDIUM: 0.65 };

/**
 * Classify risk level based on distance and confidence.
 * @param {number} distanceM
 * @param {number} confidence
 * @returns {'high'|'medium'|'low'}
 */
export function classifyRisk(distanceM, confidence) {
  if (distanceM < RISK_DISTANCE.HIGH || confidence < CONF_THRESHOLD.MEDIUM) return 'high';
  if (distanceM < RISK_DISTANCE.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Convert m/s to km/h.
 * @param {number} mps
 * @returns {number}
 */
export function mpsToKmh(mps) {
  return mps * 3.6;
}

/**
 * Format distance with appropriate unit.
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${meters.toFixed(1)} m`;
}

/**
 * Clamp a number between min and max.
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Compute a 2D direction unit vector from a cardinal label.
 * Prepared for future predictive trajectory rendering.
 * @param {string} label
 * @returns {{ x: number, y: number }}
 */
export function directionToVector(label) {
  const MAP = {
    'North':      { x:  0,     y: -1     },
    'South':      { x:  0,     y:  1     },
    'East':       { x:  1,     y:  0     },
    'West':       { x: -1,     y:  0     },
    'North-East': { x:  0.707, y: -0.707 },
    'North-West': { x: -0.707, y: -0.707 },
    'South-East': { x:  0.707, y:  0.707 },
    'South-West': { x: -0.707, y:  0.707 },
  };
  return MAP[label] ?? { x: 0, y: 0 };
}

/**
 * Generate a unique perception object ID.
 * Future: replace with backend-assigned ByteTrack IDs.
 * @param {string} type
 * @param {number} index
 * @returns {string}
 */
export function generateObjectId(type, index) {
  const prefix = type.slice(0, 3).toLowerCase();
  return `${prefix}-${String(index).padStart(2, '0')}`;
}
