/**
 * useDeviceMotion — Reads laptop accelerometer via DeviceMotion API
 * and converts tilt (pitch/roll) into car movement.
 *
 * Returns:
 *   - velocityX: left/right steering (-1 to 1)
 *   - velocityZ: forward/backward speed (-1 to 1)
 *   - isActive:  whether device motion is currently enabled
 *   - error:     any permission/API error message
 *   - requestPermission: call on user gesture to enable (iOS 13+)
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const DEADZONE = 0.05; // ignore tiny tilts
const MAX_TILT = 0.3;  // radians for full speed

export function useDeviceMotion() {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const velocityRef = useRef({ x: 0, z: 0 });
  const listenerRef = useRef(null);

  const handleMotion = useCallback((event) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    // Normalize to get tilt angles
    // On a laptop: 
    //   - Tilting forward/backward = pitch (rotation around X axis)
    //   - Tilting left/right = roll (rotation around Z axis)
    const { x, y, z } = accelerationIncludingGravity;

    // Calculate pitch (forward/backward tilt) and roll (left/right tilt)
    // When laptop is flat: x≈0, y≈0, z≈-9.8
    const pitch = Math.atan2(-x, -z);
    const roll  = Math.atan2(y, -z);

    // Map to velocity with deadzone
    let vz = -pitch / MAX_TILT; // forward = negative pitch
    let vx = roll / MAX_TILT;   // right = positive roll

    // Apply deadzone
    if (Math.abs(vz) < DEADZONE) vz = 0;
    if (Math.abs(vx) < DEADZONE) vx = 0;

    // Clamp to [-1, 1]
    vz = Math.max(-1, Math.min(1, vz));
    vx = Math.max(-1, Math.min(1, vx));

    velocityRef.current = { x: vx, z: vz };
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires permission request
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        if (result !== 'granted') {
          setError('Device motion permission denied');
          return;
        }
      } catch (err) {
        setError('Failed to request permission: ' + err.message);
        return;
      }
    }

    // Start listening
    if (!window.DeviceMotionEvent) {
      setError('DeviceMotion API not supported on this device');
      return;
    }

    window.addEventListener('devicemotion', handleMotion);
    listenerRef.current = handleMotion;
    setIsActive(true);
    setError(null);
  }, [handleMotion]);

  const stop = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('devicemotion', listenerRef.current);
      listenerRef.current = null;
    }
    velocityRef.current = { x: 0, z: 0 };
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener('devicemotion', listenerRef.current);
      }
    };
  }, []);

  return {
    velocityRef,
    isActive,
    error,
    requestPermission,
    stop,
  };
}
