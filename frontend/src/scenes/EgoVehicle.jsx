/**
 * EgoVehicle — The user's vehicle that moves on the static road.
 *
 * Represents the laptop as the ego vehicle in the 3D scene.
 * Position is driven by the useEgoMotion hook, which reads from
 * the active motion source (camera-based visual odometry, device motion,
 * or simulated keyboard input).
 *
 * Key behaviors:
 *   - Renders on top of the static road (no texture scrolling needed)
 *   - Moves in world space based on camera motion estimation
 *   - Smooth interpolation (lerp) for natural, realistic movement
 *   - Exposes carRef so CameraController can follow it
 *   - When laptop stops moving, ego vehicle stops immediately
 *
 * Architecture:
 *   - Reads velocityRef and positionRef from useEgoMotion
 *   - Uses useFrame to smoothly interpolate towards target position
 *   - Renders the Car shape with shadow casting
 *   - Mounted inside RoadAnimationController's group (which no longer scrolls)
 *
 * Props:
 *   - velocityRef: shared ref from useEgoMotion
 *   - positionRef: shared ref with target position
 *   - rotationRef: shared ref with target rotation
 *   - carRef: ref exposed to parent for camera following
 *   - updatePosition: function to call each frame to update position refs
 */
import React, { memo, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Car } from './VehicleShapes';

/* ── Constants ──────────────────────────────────────────────── */
const LERP_POSITION = 0.12;   // Position smoothing factor
const LERP_ROTATION = 0.10;   // Rotation smoothing factor
const HEIGHT_OFFSET = 0.3;    // Lift car above ground slightly
const INITIAL_POS   = new THREE.Vector3(0, HEIGHT_OFFSET, 0);

/* ── Road boundary constants (must match Road.jsx) ──────────── */
const ROAD_BOUNDS = {
  minX: -30 / 2 + 1.5,   // -13.5
  maxX: 30 / 2 - 1.5,    //  13.5
  minZ: -500 / 2 + 2,    // -248
  maxZ: 500 / 2 - 2,     //  248
};

/* ── Auto-reset safety constants ────────────────────────────── */
const AUTO_RESET_DISTANCE = 45;  // If car exceeds this distance from origin, force reset
const RESET_LERP = 0.06;         // Smoothness of auto-reset slide back to origin

/** Clamp a value between min and max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * EgoVehicle — The user's car, driven by camera-estimated motion.
 */
export const EgoVehicle = memo(({
  velocityRef,
  positionRef,
  rotationRef,
  carRef,
  updatePosition,
  egoPose = null,
}) => {
  const groupRef = useRef(null);

  // Smooth interpolated position/rotation
  const smoothPos = useRef(INITIAL_POS.clone());
  const smoothRot = useRef(0);

  // Expose the actual Three.js group to parent for camera following
  // Use a callback ref to ensure carRef.current is the Three.js group, not the React ref wrapper
  const setGroupRef = useCallback((node) => {
    groupRef.current = node;
    if (carRef) carRef.current = node;
  }, [carRef]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // ── AUTO-RESET CHECK: If car is too far from origin, slide back ──
    const distFromOrigin = Math.sqrt(
      smoothPos.current.x * smoothPos.current.x + 
      smoothPos.current.z * smoothPos.current.z
    );
    
    if (distFromOrigin > AUTO_RESET_DISTANCE) {
      console.warn(`[EgoVehicle] AUTO-RESET: ${distFromOrigin.toFixed(1)} units from origin — sliding back`);
      // Smoothly slide back toward origin
      smoothPos.current.x *= (1 - RESET_LERP);
      smoothPos.current.z *= (1 - RESET_LERP);
      
      // Hard reset if still too far after lerp
      const newDist = Math.sqrt(
        smoothPos.current.x * smoothPos.current.x + 
        smoothPos.current.z * smoothPos.current.z
      );
      if (newDist > AUTO_RESET_DISTANCE * 1.5) {
        console.warn(`[EgoVehicle] HARD RESET: Forcing position to origin`);
        smoothPos.current.set(0, HEIGHT_OFFSET, 0);
        smoothRot.current = 0;
        // Also reset the position refs so motion system syncs
        if (positionRef) {
          positionRef.current.set(0, 0, 0);
        }
        if (rotationRef) {
          rotationRef.current = 0;
        }
      }
      
      group.position.copy(smoothPos.current);
      group.rotation.y = smoothRot.current;
      return; // Skip normal position update during reset
    }

    // Backend-driven ego pose path (Visual Odometry)
    // Only use if pose has meaningful non-zero movement (VO is actually producing data)
    const hasValidPose = egoPose &&
      Number.isFinite(egoPose.x) && Number.isFinite(egoPose.z) &&
      (Math.abs(egoPose.x) > 0.001 || Math.abs(egoPose.z) > 0.001 || Math.abs(egoPose.yaw ?? 0) > 0.1);

    if (hasValidPose) {
      // Clamp VO pose to road bounds
      const clampedX = clamp(egoPose.x, ROAD_BOUNDS.minX, ROAD_BOUNDS.maxX);
      const clampedZ = clamp(egoPose.z, ROAD_BOUNDS.minZ, ROAD_BOUNDS.maxZ);
      const targetYawRad = (Number(egoPose.yaw ?? 0) * Math.PI) / 180;

      smoothPos.current.x += (clampedX - smoothPos.current.x) * LERP_POSITION;
      smoothPos.current.z += (clampedZ - smoothPos.current.z) * LERP_POSITION;
      smoothPos.current.y = HEIGHT_OFFSET;

      smoothRot.current += (targetYawRad - smoothRot.current) * LERP_ROTATION;

      group.position.copy(smoothPos.current);
      group.rotation.y = smoothRot.current;
      return;
    }

    // Fallback path: frontend motion hook
    if (updatePosition) {
      updatePosition(delta);
    }

    if (!positionRef || !rotationRef) return;

    const targetPos = positionRef.current;
    const targetRot = rotationRef.current;

    // Clamp target position to road bounds before interpolating
    const clampedTargetX = clamp(targetPos.x, ROAD_BOUNDS.minX, ROAD_BOUNDS.maxX);
    const clampedTargetZ = clamp(targetPos.z, ROAD_BOUNDS.minZ, ROAD_BOUNDS.maxZ);

    smoothPos.current.x += (clampedTargetX - smoothPos.current.x) * LERP_POSITION;
    smoothPos.current.z += (clampedTargetZ - smoothPos.current.z) * LERP_POSITION;
    smoothPos.current.y = HEIGHT_OFFSET;

    smoothRot.current += (targetRot - smoothRot.current) * LERP_ROTATION;

    // Final safety clamp on smooth position (catches any edge cases)
    smoothPos.current.x = clamp(smoothPos.current.x, ROAD_BOUNDS.minX, ROAD_BOUNDS.maxX);
    smoothPos.current.z = clamp(smoothPos.current.z, ROAD_BOUNDS.minZ, ROAD_BOUNDS.maxZ);

    group.position.copy(smoothPos.current);
    group.rotation.y = smoothRot.current;

    if (velocityRef) {
      // No-op: velocity is maintained by useEgoMotion
    }
  });

  return (
    <group ref={setGroupRef} name="ego-vehicle" position={INITIAL_POS}>
      {/* Car shape scaled to size */}
      <group scale={[1, 1, 1]} rotation={[0, Math.PI, 0]}>
        <Car />
      </group>

      {/* Shadow indicator (small dark ellipse under car) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -HEIGHT_OFFSET + 0.01, 0]}
      >
        <circleGeometry args={[1.2, 16]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

EgoVehicle.displayName = 'EgoVehicle';

export default EgoVehicle;
