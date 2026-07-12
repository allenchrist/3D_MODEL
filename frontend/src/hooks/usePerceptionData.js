/**
 * usePerceptionData — Hook for consuming live perception data.
 * Currently returns static/simulated data.
 * Future: subscribe to Socket.IO SOCKET_EVENTS.DETECTIONS and
 * SOCKET_EVENTS.SCENE_UPDATE to receive live YOLO + ByteTrack output.
 *
 * @returns {{ objects, sceneData, isLive }}
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_STATE = {
  objects:   [],
  sceneData: null,
  isLive:    false,
};

export function usePerceptionData(initialObjects = []) {
  const [state, setState] = useState({ ...DEFAULT_STATE, objects: initialObjects });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /** Future: call this with Socket.IO handler to go live */
  const setLiveObjects = useCallback((objects) => {
    if (!mountedRef.current) return;
    setState((prev) => ({ ...prev, objects, isLive: true }));
  }, []);

  const setSceneData = useCallback((sceneData) => {
    if (!mountedRef.current) return;
    setState((prev) => ({ ...prev, sceneData }));
  }, []);

  return { ...state, setLiveObjects, setSceneData };
}
