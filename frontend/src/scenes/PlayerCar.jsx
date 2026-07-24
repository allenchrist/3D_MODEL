/**
 * PlayerCar — The player's car controlled by laptop accelerometer.
 *
 * Reads from `velocityRef` (shared with useDeviceMotion) each frame
 * and updates position accordingly. The car moves on the road surface
 * while the road stays static (no scrolling).
 *
 * Camera follows this car from behind in third-person view.
 */
import React, { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Car } from './VehicleShapes';

const SPEED_FACTOR  = 0.3;   // world units per frame per velocity unit
const TURN_FACTOR   = 0.04;   // rotation speed per velocity x
const MAX_SPEED     = 0.5;    // max position delta per frame
const LERP_FACTOR   = 0.12;   // smoothing factor

export const PlayerCar = memo(({ velocityRef, carRef }) => {
  const groupRef = useRef(null);
  const curPos   = useRef(new THREE.Vector3(0, 0, 0));
  const curRot   = useRef(0);
  const targetRot = useRef(0);
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const forwardVec = useRef(new THREE.Vector3());

  // Expose groupRef to parent for camera following
  if (carRef) carRef.current = groupRef;

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !velocityRef) return;

    const { x: vx, z: vz } = velocityRef.current;

    if (Math.abs(vz) > 0.01 || Math.abs(vx) > 0.01) {
      // Calculate target rotation based on steering + movement direction
      targetRot.current += vx * TURN_FACTOR;

      // Move forward in the direction the car is facing
      const angle = curRot.current;
      const forward = forwardVec.current;
      forward.set(0, 0, -vz * SPEED_FACTOR);
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

      // Clamp speed
      const speed = Math.min(forward.length(), MAX_SPEED);
      forward.setLength(speed);

      targetPos.current.add(forward);
    }

    // Smoothly interpolate rotation
    curRot.current += (targetRot.current - curRot.current) * LERP_FACTOR;

    // Smoothly interpolate position toward target
    curPos.current.lerp(targetPos.current, LERP_FACTOR);

    // Apply to group
    group.position.copy(curPos.current);
    group.rotation.y = curRot.current;
  });

  return (
    <group ref={groupRef} name="player-car" position={[0, 0, 0]}>
      <Car />
    </group>
  );
});

PlayerCar.displayName = 'PlayerCar';
