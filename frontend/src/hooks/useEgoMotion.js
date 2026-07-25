/**
 * useEgoMotion — Modular motion source abstraction for ego vehicle movement.
 *
 * Provides a unified interface for consuming motion data from various sources:
 *   - Camera-based visual odometry / optical flow (default)
 *   - DeviceMotion API (accelerometer/gyroscope)
 *   - GPS + IMU data
 *   - Wheel encoder data
 *   - V2V localization
 *   - Simulated motion (for development/testing)
 *
 * Usage:
 *   const { velocityRef, positionRef, motionSource, setMotionSource, isActive } = useEgoMotion();
 *
 * Architecture:
 *   - The hook manages a registry of motion sources.
 *   - Each source implements the same interface: { velocityRef, isActive, start(), stop() }
 *   - The active source can be switched at runtime without disrupting the ego vehicle.
 *   - velocityRef is a shared ref so Three.js useFrame can read it without re-renders.
 *   - positionRef accumulates position over time based on velocity.
 *
 * Future:
 *   - Add sensor fusion layer that combines multiple sources
 *   - Add Kalman filter for smoother position estimation
 *   - Add dead reckoning fallback when primary source drops out
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

/* ── Motion source registry ─────────────────────────────────── */
const MOTION_SOURCES = {
  camera:   'camera',    // Visual odometry / optical flow via webcam
  device:   'device',    // DeviceMotion API (accelerometer)
  simulated: 'simulated', // Keyboard/simulated for development
  gps:      'gps',       // Future: GPS + IMU
  encoder:  'encoder',   // Future: wheel encoders
  v2v:      'v2v',       // Future: V2V localization
};

/* ── Default motion source ──────────────────────────────────── */
const DEFAULT_SOURCE = 'simulated';

/* ── Road boundary constants (must match Road.jsx) ──────────── */
const ROAD_BOUNDS = {
  minX: -30 / 2 + 1.5,   // -13.5
  maxX: 30 / 2 - 1.5,    //  13.5
  minZ: -500 / 2 + 2,    // -248
  maxZ: 500 / 2 - 2,     //  248
};

/* ── Auto-reset safety constants ────────────────────────────── */
const SAFE_DISTANCE_FROM_ORIGIN = 40; // If car exceeds this distance from origin, auto-reset
const RESET_LERP_SPEED = 0.08;        // How fast to slide back to origin (lower = smoother)

/** Clamp a value between min and max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Simulated motion source — keyboard-driven for development.
 * Arrow keys / WASD control the ego vehicle.
 */
function createSimulatedSource() {
  const velocityRef = { current: { x: 0, z: 0 } };
  const keys = { forward: false, backward: false, left: false, right: false };
  let active = false;

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': keys.forward  = true; e.preventDefault(); break;
      case 'ArrowDown':  case 's': case 'S': keys.backward = true; e.preventDefault(); break;
      case 'ArrowLeft':  case 'a': case 'A': keys.left     = true; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': keys.right    = true; e.preventDefault(); break;
    }
  };

  const handleKeyUp = (e) => {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': keys.forward  = false; e.preventDefault(); break;
      case 'ArrowDown':  case 's': case 'S': keys.backward = false; e.preventDefault(); break;
      case 'ArrowLeft':  case 'a': case 'A': keys.left     = false; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': keys.right    = false; e.preventDefault(); break;
    }
  };

  // Update velocity each frame via animation loop
  let animFrame = null;
  const update = () => {
    if (!active) return;
    let vz = 0, vx = 0;
    if (keys.forward)  vz = -0.8;
    if (keys.backward) vz = 0.6;
    if (keys.left)     vx = -0.6;
    if (keys.right)    vx = 0.6;
    velocityRef.current = { x: vx, z: vz };
    animFrame = requestAnimationFrame(update);
  };

  return {
    velocityRef,
    get isActive() { return active; },
    start() {
      if (active) return;
      active = true;
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      animFrame = requestAnimationFrame(update);
    },
    stop() {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animFrame) cancelAnimationFrame(animFrame);
      velocityRef.current = { x: 0, z: 0 };
    },
  };
}

/**
 * Camera motion source — uses webcam-based visual odometry.
 * Delegates to useCameraMotion for the actual frame processing.
 */
function createCameraSource(cameraMotionHook) {
  const velocityRef = { current: { x: 0, z: 0 } };
  let active = false;
  let cameraSource = null;

  return {
    velocityRef,
    get isActive() { return active; },
    async start() {
      if (active) return;
      active = true;
      // Camera source is created lazily — the hook manages its own lifecycle
      if (cameraMotionHook) {
        cameraSource = cameraMotionHook;
        cameraSource.start();
      }
    },
    stop() {
      active = false;
      if (cameraSource) {
        cameraSource.stop();
        cameraSource = null;
      }
      velocityRef.current = { x: 0, z: 0 };
    },
    // Allow external update of velocity from camera processing
    updateVelocity(v) {
      if (active) velocityRef.current = v;
    },
  };
}

/**
 * Device motion source — uses laptop accelerometer.
 * Wraps the existing useDeviceMotion hook.
 */
function createDeviceSource(deviceMotionHook) {
  const velocityRef = { current: { x: 0, z: 0 } };
  let active = false;
  let pollInterval = null;

  return {
    velocityRef,
    get isActive() { return active; },
    start() {
      if (active) return;
      active = true;
      // Poll the device motion hook's velocity ref periodically
      if (deviceMotionHook) {
        deviceMotionHook.requestPermission();
        pollInterval = setInterval(() => {
          if (deviceMotionHook.velocityRef) {
            velocityRef.current = { ...deviceMotionHook.velocityRef.current };
          }
        }, 16); // ~60fps polling
      }
    },
    stop() {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
      if (deviceMotionHook) deviceMotionHook.stop();
      velocityRef.current = { x: 0, z: 0 };
    },
  };
}

/* ── useEgoMotion hook ──────────────────────────────────────── */
export function useEgoMotion(options = {}) {
  const { initialSource = DEFAULT_SOURCE } = options;

  // Ego vehicle position in world space (accumulated from velocity)
  const positionRef = useRef(new THREE.Vector3(0, 0, 0));
  const rotationRef = useRef(0);

  // Current motion source
  const [motionSource, setMotionSourceState] = useState(initialSource);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  // Store source instances — lazy initialization pattern
  // Using conditional assignment in useRef ensures it's called only once
  const sourcesRef = useRef(null);
  const activeSourceRef = useRef(null);

  // Shared velocity ref that Three.js components read from
  const velocityRef = useRef({ x: 0, z: 0 });

  if (!sourcesRef.current) {
    sourcesRef.current = {
      [MOTION_SOURCES.simulated]: createSimulatedSource(),
      [MOTION_SOURCES.camera]: createCameraSource(null), // Will be wired when camera hook is available
      [MOTION_SOURCES.device]: createDeviceSource(null),  // Will be wired when device hook is available
    };
  }

  // Switch motion source
  const setMotionSource = useCallback((source) => {
    // Use a function to handle state updates to avoid stale closures
    setError(null);
    
    if (!MOTION_SOURCES[source]) {
      setError(`Unknown motion source: ${source}`);
      return;
    }

    // Stop current source using a local variable from the ref
    const currentActive = activeSourceRef.current;
    if (currentActive) {
      currentActive.stop();
    }

    // Start new source
    const sourceInstance = sourcesRef.current[source];
    if (sourceInstance) {
      sourceInstance.start();
      activeSourceRef.current = sourceInstance;
      setMotionSourceState(source);
      setIsActive(true);
    }
  }, []);

  // Initialize with default source
  useEffect(() => {
    setMotionSource(initialSource);
    return () => {
      const currentActive = activeSourceRef.current;
      if (currentActive) {
        currentActive.stop();
      }
    };
  }, [initialSource, setMotionSource]);

  // Reset position to origin
  const resetPosition = useCallback(() => {
    positionRef.current.set(0, 0, 0);
    rotationRef.current = 0;
    velocityRef.current = { x: 0, z: 0 };
  }, []);

  // Apply boundary clamping — prevents car from driving off the road
  const clampPosition = useCallback(() => {
    const pos = positionRef.current;
    
    // First: clamp to road bounds
    const clampedX = clamp(pos.x, ROAD_BOUNDS.minX, ROAD_BOUNDS.maxX);
    const clampedZ = clamp(pos.z, ROAD_BOUNDS.minZ, ROAD_BOUNDS.maxZ);

    if (clampedX !== pos.x || clampedZ !== pos.z) {
      console.warn(`[useEgoMotion] Position clamped: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) → (${clampedX.toFixed(1)}, ${clampedZ.toFixed(1)})`);
      pos.x = clampedX;
      pos.z = clampedZ;
    }

    // Second: AUTO-RESET if too far from origin (this is the CRITICAL safety net)
    const distFromOrigin = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (distFromOrigin > SAFE_DISTANCE_FROM_ORIGIN) {
      console.warn(`[useEgoMotion] AUTO-RESET: Car ${distFromOrigin.toFixed(1)} units from origin — resetting to center`);
      // Smoothly lerp back toward origin
      pos.x *= (1 - RESET_LERP_SPEED);
      pos.z *= (1 - RESET_LERP_SPEED);
      
      // If still too far after lerp, hard reset
      const newDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (newDist > SAFE_DISTANCE_FROM_ORIGIN * 1.5) {
        pos.x = 0;
        pos.z = 0;
        rotationRef.current = 0;
        console.warn(`[useEgoMotion] HARD RESET: Position forced to origin`);
      }
    }
  }, []);

  // Each frame, read velocity from active source and update position
  // This is called from useFrame in the EgoVehicle component
  // After updating position, immediately clamp to road bounds
  const updatePosition = useCallback((deltaTime = 1/60) => {
    if (!activeSourceRef.current || !activeSourceRef.current.isActive) return;

    const vel = activeSourceRef.current.velocityRef.current;
    if (!vel) return;

    const { x: vx, z: vz } = vel;

    // Update velocity ref for external consumers
    velocityRef.current = { x: vx, z: vz };

    // Only update position if there's meaningful movement
    if (Math.abs(vz) > 0.001 || Math.abs(vx) > 0.001) {
      const speed = 5.0; // world units per second at full velocity
      const dt = Math.min(deltaTime, 0.05); // cap delta time

      // Calculate movement in local space (forward = -Z in Three.js)
      const forward = -vz * speed * dt;
      const lateral = vx * speed * dt;

      // Apply rotation from lateral movement (steering)
      rotationRef.current += vx * 0.5 * dt;

      // Move forward in the direction the car is facing
      const angle = rotationRef.current;
      const moveX = Math.sin(angle) * forward + Math.cos(angle) * lateral;
      const moveZ = Math.cos(angle) * forward - Math.sin(angle) * lateral;

      positionRef.current.x += moveX;
      positionRef.current.z += moveZ;
    }

    // CLAMP position to road bounds — THIS prevents the road from disappearing
    clampPosition();
  }, [clampPosition]);

  return {
    velocityRef,
    positionRef,
    rotationRef,
    motionSource,
    setMotionSource,
    isActive,
    error,
    updatePosition,
    resetPosition,
    clampPosition,
    MOTION_SOURCES,
  };
}

export default useEgoMotion;
