import { useEffect, useMemo, useRef, useState } from 'react';
import { perceptionApi } from '../services/api';
import { transformApiFrame } from '../utils/perception';

const POLL_MS = 160;           // 100–200ms target
const RETRY_MS_BASE = 600;    // exponential backoff base
const RETRY_MS_MAX = 3000;
const MAX_OBJECTS = 25;       // allow more than 8 so multiple people/cars render

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function bboxIoU(a, b) {
  if (!a || !b) return 0;

  const ax1 = Math.min(a.x1, a.x2);
  const ay1 = Math.min(a.y1, a.y2);
  const ax2 = Math.max(a.x1, a.x2);
  const ay2 = Math.max(a.y1, a.y2);

  const bx1 = Math.min(b.x1, b.x2);
  const by1 = Math.min(b.y1, b.y2);
  const bx2 = Math.max(b.x1, b.x2);
  const by2 = Math.max(b.y1, b.y2);

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = interX2 - interX1;
  const interH = interY2 - interY1;
  if (interW <= 0 || interH <= 0) return 0;

  const interArea = interW * interH;
  const aArea = Math.max(ax2 - ax1, 0) * Math.max(ay2 - ay1, 0);
  const bArea = Math.max(bx2 - bx1, 0) * Math.max(by2 - by1, 0);
  if (aArea <= 0 || bArea <= 0) return 0;

  return interArea / (aArea + bArea - interArea);
}

function bboxCenterDist(a, b) {
  if (!a || !b) return Infinity;
  const acx = (a.x1 + a.x2) / 2;
  const acy = (a.y1 + a.y2) / 2;
  const bcx = (b.x1 + b.x2) / 2;
  const bcy = (b.y1 + b.y2) / 2;
  const dx = acx - bcx;
  const dy = acy - bcy;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeDetForMatch(det) {
  // det.bbox is in pixels. Keep bbox-only for IoU.
  // Some objects use det.rawClass/type; matching should use type/class.
  return det;
}

// Greedy matching between previous instances and current detections.
// Key goals:
// - Stable instance keys across polls
// - Remove only instances that disappear
// - Works without track/id by using class + bbox overlap/position proximity
function matchDetections(prevInstances, currDetections, opts) {
  const {
    iouThreshold = 0.15,
    maxCenterDist = 220,
  } = opts ?? {};

  // prevInstances: Array of { instanceKey, object }
  // currDetections: Array of ui objects (no stable id yet)
  const usedPrev = new Set();
  const usedCurr = new Set();

  // Candidate scores for same type/class
  const candidates = [];
  for (let pi = 0; pi < prevInstances.length; pi++) {
    const p = prevInstances[pi];
    for (let ci = 0; ci < currDetections.length; ci++) {
      const c = currDetections[ci];
      if (p?.object?.rawClass !== c?.rawClass) continue;

      const iou = bboxIoU(p.object.bbox, c.bbox);
      const dist = bboxCenterDist(p.object.bbox, c.bbox);

      // Convert to a "score" where higher is better.
      // Penalize large distances.
      const distScore = dist === Infinity ? 0 : clamp(1 - dist / maxCenterDist, 0, 1);
      const score = iou * 0.75 + distScore * 0.25;

      if (iou >= iouThreshold || dist <= maxCenterDist) {
        candidates.push({ pi, ci, score, iou, dist });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const matches = new Map(); // ci -> pi

  for (const cand of candidates) {
    if (usedPrev.has(cand.pi) || usedCurr.has(cand.ci)) continue;

    const pObj = prevInstances[cand.pi]?.object;
    const cObj = currDetections[cand.ci];

    // Require same type/class again (already filtered, but keep safe)
    if (pObj?.rawClass !== cObj?.rawClass) continue;

    // Prefer IoU matches; allow distance-only matches when IoU low.
    const ok = cand.iou >= iouThreshold || cand.dist <= maxCenterDist * 0.75;
    if (!ok) continue;

    usedPrev.add(cand.pi);
    usedCurr.add(cand.ci);
    matches.set(cand.ci, cand.pi);
  }

  return matches;
}

export function usePerceptionData() {
  const [objects, setObjects] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const mountedRef = useRef(true);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const connectedRef = useRef(false);

  // Track previous instances for stable IDs across frames.
  // instanceKey -> object (ui shape)
  const instancesMapRef = useRef(new Map());

  const retryAttemptRef = useRef(0);
  const nextRetryMsRef = useRef(RETRY_MS_BASE);

  useEffect(() => {
    mountedRef.current = true;

    const scheduleNext = (fn, delay) => {
      if (!mountedRef.current) return;
      timerRef.current = setTimeout(fn, delay);
    };

    async function poll() {
      if (!mountedRef.current) return;
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const data = await perceptionApi.getLiveDetections();
        if (!mountedRef.current) return;

        retryAttemptRef.current = 0;
        nextRetryMsRef.current = RETRY_MS_BASE;

        const uiObjectsAll = transformApiFrame({
          frame: data.frame,
          objects: data.objects,
          frame_w: data.frame_w ?? 640,
          frame_h: data.frame_h ?? 480,
        });

        // Update stable instance keys
        const prevInstances = Array.from(instancesMapRef.current.entries()).map(([instanceKey, object]) => ({
          instanceKey,
          object,
        }));

        // Match on full set, then slice for rendering to reduce churn.
        const uiObjects = uiObjectsAll;
        const matches = matchDetections(prevInstances, uiObjects, {
          iouThreshold: 0.18,
          maxCenterDist: 260,
        });

        const nextMap = new Map();

        // Matched detections reuse instanceKey; unmatched detections get new instanceKey
        let newInstanceCounterStart = nextMap.size;

        for (let ci = 0; ci < uiObjects.length; ci++) {
          const det = normalizeDetForMatch(uiObjects[ci]);

          if (matches.has(ci)) {
            const pi = matches.get(ci);
            const reused = prevInstances[pi];
            if (reused?.instanceKey) {
              det.id = reused.instanceKey; // stable id expected by ModelManager
              nextMap.set(reused.instanceKey, det);
            }
          } else {
            // Create a new stable instanceKey
            // Use rawClass + an incrementing counter + bbox hash-ish
            const rawClass = det.rawClass ?? det.type ?? 'obj';
            const bbox = det.bbox;
            const approxKey = bbox ? `${Math.round((bbox.x1 + bbox.x2) / 2)}_${Math.round((bbox.y1 + bbox.y2) / 2)}` : 'na';
            const instanceKey = `${rawClass}-${Date.now()}-${newInstanceCounterStart}-${approxKey}`;
            det.id = instanceKey;
            nextMap.set(instanceKey, det);
            newInstanceCounterStart++;
          }
        }

        // Replace map; this automatically removes disappeared objects
        instancesMapRef.current = nextMap;

        // Commit UI objects (render cap applied after stable assignment)
        const renderObjects = Array.from(nextMap.values()).slice(0, MAX_OBJECTS);

        setCurrentFrame(data.frame);
        setConnectionStatus('Connected');
        setIsLive(true);
        connectedRef.current = true;

        setObjects(renderObjects);
      } catch {
        if (!mountedRef.current) return;

        setConnectionStatus('Disconnected');
        setIsLive(false);
        connectedRef.current = false;

        // Requirement: keep the scene alive during temporary backend failures.
        // So: do NOT clear objects on failure; just schedule a retry.
        retryAttemptRef.current += 1;
        nextRetryMsRef.current = clamp(
          RETRY_MS_BASE * Math.pow(1.5, retryAttemptRef.current),
          RETRY_MS_BASE,
          RETRY_MS_MAX
        );
      } finally {
        runningRef.current = false;
        if (!mountedRef.current) return;

        const delay = connectedRef.current ? POLL_MS : nextRetryMsRef.current;
        scheduleNext(poll, delay);
      }
    }

    poll();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const totalFrames = currentFrame;

  return useMemo(() => ({ objects, connectionStatus, currentFrame, totalFrames, isLive }), [objects, connectionStatus, currentFrame, totalFrames, isLive]);
}
