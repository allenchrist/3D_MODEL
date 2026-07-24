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
import React, { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Car } from './VehicleShapes';

/* ── Constants ──────────────────────────────────────────────── */
const LERP_POSITION = 0.12;   // Position smoothing factor
const LERP_ROTATION = 0.10;   // Rotation smoothing factor
const HEIGHT_OFFSET = 0.3;    // Lift car above ground slightly
const INITIAL_POS   = new THREE.Vector3(0, HEIGHT_OFFSET, 0);

/**
 * EgoVehicle — The user's car, driven by camera-estimated motion.
 */
export const EgoVehicle = memo(({
  velocityRef,
  positionRef,
  rotationRef,
  carRef,
  updatePosition,
}) => {
  const groupRef = useRef(null);

  // Smooth interpolated position/rotation
  const smoothPos = useRef(INITIAL_POS.clone());
  const smoothRot = useRef(0);

  // Expose groupRef to parent for camera following
  if (carRef) carRef.current = groupRef;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Update target position from motion source
    if (updatePosition) {
      updatePosition(delta);
    }

    if (!positionRef || !rotationRef) return;

    // Target values from the ego motion system
    const targetPos = positionRef.current;
    const targetRot = rotationRef.current;

    // Smoothly interpolate position (only X and Z, Y is fixed to ground level)
    smoothPos.current.x += (targetPos.x - smoothPos.current.x) * LERP_POSITION;
    smoothPos.current.z += (targetPos.z - smoothPos.current.z) * LERP_POSITION;
    // Y is always fixed to ground level + small offset so car sits on road
    smoothPos.current.y = HEIGHT_OFFSET;

    // Smoothly interpolate rotation
    smoothRot.current += (targetRot - smoothRot.current) * LERP_ROTATION;

    // Apply to Three.js group
    group.position.copy(smoothPos.current);
    group.rotation.y = smoothRot.current;

    // Update velocity ref for other systems that may read it
    if (velocityRef) {
      // No-op: velocity is maintained by useEgoMotion
    }
  });

  return (
    <group ref={groupRef} name="ego-vehicle" position={INITIAL_POS}>
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
