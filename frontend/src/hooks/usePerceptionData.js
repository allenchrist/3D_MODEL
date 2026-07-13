/**
 * usePerceptionData — Polls GET /detections/live every POLL_INTERVAL_MS.
 *
 * Each response is the latest frame from the in-memory DetectionStore,
 * written by the webcam detector running in the FastAPI background thread.
 *
 * Response shape: { frame: int, objects: [{class, confidence, bbox}] }
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { perceptionApi } from '../services/api';
import { transformApiFrame } from '../utils/perception';

const POLL_INTERVAL_MS   = 150;   // ~6-7 polls/sec — fast enough for live feel
const RETRY_DELAY_MS     = 3000;
const MAX_OBJECTS        = 8;

export function usePerceptionData() {
  const [objects,          setObjects]          = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const [currentFrame,     setCurrentFrame]     = useState(0);
  const [isLive,           setIsLive]           = useState(false);

  const mountedRef  = useRef(true);
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      // { frame, objects: [{class, confidence, bbox}] }
      const data = await perceptionApi.getLiveDetections();
      if (!mountedRef.current) return;

      // Reuse transformApiFrame — wrap single frame into expected shape
      const uiObjects = transformApiFrame({
        frame:   data.frame,
        objects: data.objects,
        frame_w: data.frame_w ?? 640,
        frame_h: data.frame_h ?? 480,
      }).slice(0, MAX_OBJECTS);

      setObjects(uiObjects);
      setCurrentFrame(data.frame);
      setConnectionStatus('Connected');
      setIsLive(true);
    } catch {
      if (!mountedRef.current) return;
      setConnectionStatus('Disconnected');
      setIsLive(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [poll]);

  // Retry loop — if disconnected, keep trying every RETRY_DELAY_MS
  useEffect(() => {
    if (connectionStatus === 'Disconnected') {
      const t = setTimeout(() => {
        if (mountedRef.current) startPolling();
      }, RETRY_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [connectionStatus, startPolling]);

  useEffect(() => {
    mountedRef.current = true;
    startPolling();
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startPolling]);

  // totalFrames kept for API compatibility with Dashboard/ObjectPanel
  return { objects, connectionStatus, totalFrames: currentFrame, currentFrame, isLive };
}
