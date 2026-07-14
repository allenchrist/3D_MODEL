import { useEffect, useRef, useState } from 'react';
import { perceptionApi } from '../services/api';
import { transformApiFrame } from '../utils/perception';

const POLL_MS        = 500;
const RETRY_MS       = 3000;
const MAX_OBJECTS    = 8;
const CLEAR_AFTER_MS = 3000;

export function usePerceptionData() {
  const [objects,          setObjects]          = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const [currentFrame,     setCurrentFrame]     = useState(0);
  const [isLive,           setIsLive]           = useState(false);

  const mountedRef    = useRef(true);
  const timerRef      = useRef(null);
  const clearRef      = useRef(null);
  const runningRef    = useRef(false);
  // Track connection state in a ref so the poll closure always reads current value
  const connectedRef  = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      if (!mountedRef.current) return;
      if (runningRef.current)  return;
      runningRef.current = true;

      try {
        const data = await perceptionApi.getLiveDetections();
        if (!mountedRef.current) return;

        const uiObjects = transformApiFrame({
          frame:   data.frame,
          objects: data.objects,
          frame_w: data.frame_w ?? 640,
          frame_h: data.frame_h ?? 480,
        }).slice(0, MAX_OBJECTS);

        setCurrentFrame(data.frame);
        setConnectionStatus('Connected');
        setIsLive(true);
        connectedRef.current = true;

        if (uiObjects.length > 0) {
          if (clearRef.current) {
            clearTimeout(clearRef.current);
            clearRef.current = null;
          }
          setObjects(uiObjects);
        } else {
          if (!clearRef.current) {
            clearRef.current = setTimeout(() => {
              if (mountedRef.current) setObjects([]);
              clearRef.current = null;
            }, CLEAR_AFTER_MS);
          }
        }

      } catch {
        if (!mountedRef.current) return;
        setConnectionStatus('Disconnected');
        setIsLive(false);
        connectedRef.current = false;
      } finally {
        runningRef.current = false;
        if (mountedRef.current) {
          // Use ref — not stale closure — to pick correct interval
          timerRef.current = setTimeout(poll, connectedRef.current ? POLL_MS : RETRY_MS);
        }
      }
    }

    poll();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (clearRef.current) clearTimeout(clearRef.current);
    };
  }, []);

  return { objects, connectionStatus, currentFrame, totalFrames: currentFrame, isLive };
}
