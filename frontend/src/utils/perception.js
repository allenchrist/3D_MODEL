/**
 * perception.js — Pure utility functions for perception data processing.
 * Used by hooks, components, and the Scene3D rendering layer.
 */

/* ── Constants ──────────────────────────────────────────────── */
export const RISK_DISTANCE  = { HIGH: 20,   MEDIUM: 45   };
export const CONF_THRESHOLD = { HIGH: 0.85, MEDIUM: 0.65 };

// YOLO COCO class name → UI display type
const CLASS_TYPE_MAP = {
  car:        'Car',
  truck:      'Truck',
  bus:        'Bus',
  motorcycle: 'Motorcycle',
  bicycle:    'Cyclist',
  person:     'Pedestrian',
};

// Approximate pixel-to-metre scale for the road video.
// A typical car (~1.8 m wide) spans ~80 px at 30 m distance.
// Future: replace with MiDaS depth map values.
const PIXELS_PER_METRE = 2.8;

// Cardinal directions cycled per object index
const DIRECTIONS = [
  'North', 'North-East', 'East', 'South-East',
  'South', 'South-West', 'West', 'North-West',
];

/* ── General helpers ────────────────────────────────────────── */
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function classifyRisk(distanceM, confidence) {
  if (distanceM < RISK_DISTANCE.HIGH || confidence < CONF_THRESHOLD.MEDIUM) return 'high';
  if (distanceM < RISK_DISTANCE.MEDIUM) return 'medium';
  return 'low';
}

export function mpsToKmh(mps) {
  return mps * 3.6;
}

export function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${meters.toFixed(1)} m`;
}

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

export function generateObjectId(type, index) {
  const prefix = type.slice(0, 3).toLowerCase();
  return `${prefix}-${String(index).padStart(2, '0')}`;
}

/**
 * transformApiFrame — Convert one YOLO FrameDetection from the FastAPI
 * response into the array of UI object shapes that ObjectPanel and
 * Scene3D consume.
 *
 * YOLO gives us:  { class, confidence, bbox: { x1, y1, x2, y2 } }
 * UI needs:       { id, type, name, distanceM, speedMps, direction,
 *                   confidence, status, bbox, rawClass }
 *
 * Distance is estimated from bbox height (taller bbox = closer object).
 * Speed is estimated from confidence as a proxy until ByteTrack is added.
 *
 * @param {object} frame — FrameDetection from API ({ frame, objects })
 * @returns {Array}      — Array of UI-ready object descriptors
 */
export function transformApiFrame(frame) {
  if (!frame?.objects?.length) return [];

  const frameW = frame.frame_w ?? 640;
  const frameH = frame.frame_h ?? 480;

  return frame.objects.map((det, idx) => {
    // API serialises "class" as "class" in JSON; Pydantic alias keeps it
    const rawClass = det.class ?? det.cls ?? 'unknown';
    const type     = CLASS_TYPE_MAP[rawClass.toLowerCase()] ?? 'Unknown';

    const { x1, y1, x2, y2 } = det.bbox;

    // Estimate distance from bbox height: taller = closer
    const bboxHeight = Math.abs(y2 - y1);
    const distanceM  = clamp(
      bboxHeight > 0 ? 1000 / (bboxHeight * PIXELS_PER_METRE) : 50,
      1,
      120
    );

    // Rough speed proxy from confidence until ByteTrack velocity is available
    const speedMps = clamp(det.confidence * 12, 0, 30);

    const status =
      det.confidence >= CONF_THRESHOLD.HIGH   ? 'Tracking'    :
      det.confidence >= CONF_THRESHOLD.MEDIUM ? 'Caution'     :
                                                'Lost Signal';

    return {
      id:         `${rawClass}-f${frame.frame}-${idx}`,
      type,
      name:       `${type} ${String(idx + 1).padStart(2, '0')}`,
      distanceM,
      speedMps,
      direction:  DIRECTIONS[idx % DIRECTIONS.length],
      confidence: det.confidence,
      status,
      // Raw YOLO bbox preserved for Scene3D 3D box rendering
      bbox:       { x1, y1, x2, y2, frameW, frameH },
      rawClass,
    };
  });
}
