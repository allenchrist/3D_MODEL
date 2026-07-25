/**
 * CameraController — Third-person follow camera for the ego vehicle.
 *
 * The camera follows the ego vehicle from behind and above, providing
 * a natural third-person perspective as the vehicle moves through the
 * static 3D environment.
 *
 * Behavior:
 *   - Camera stays behind and above the ego vehicle
 *   - Smoothly interpolates position for natural movement
 *   - Vehicle's forward direction is -Z in local space
 *   - Camera offset: behind (positive Z) and above (positive Y)
 *   - Uses useFrame to update every render cycle
 *
 * Props:
 *   - carRef: React ref to the ego vehicle's Three.js group
 *   - followDistance: distance behind the car (default: 20)
 *   - followHeight: height above the car (default: 12)
 *   - dampingFactor: smoothness of camera movement (default: 0.08)
 */
import { memo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DEFAULT_DISTANCE = 20;
const DEFAULT_HEIGHT   = 12;
const DAMPING          = 0.08;

/* ── Safety limits ──────────────────────────────────────────── */
const MAX_CAMERA_DISTANCE_FROM_ORIGIN = 150; // Hard limit: camera NEVER exceeds this distance
const ORIGIN_PULLBACK_THRESHOLD       = 60;  // Start pulling camera back toward origin at this distance

export const CameraController = memo(({
  carRef,
  followDistance = DEFAULT_DISTANCE,
  followHeight   = DEFAULT_HEIGHT,
  dampingFactor  = DAMPING,
}) => {
  const { camera } = useThree();
  const smoothPos = useRef(camera.position.clone());

  useFrame(() => {
    // ── SAFETY: Guard against carRef being null, undefined, or not a Three.js Object3D ──
    const carGroup = carRef?.current;
    const isValidCar = carGroup && 
      typeof carGroup.getWorldPosition === 'function' &&
      typeof carGroup.getWorldQuaternion === 'function';

    if (!isValidCar) {
      // No valid car yet — keep camera at default position looking at origin
      camera.position.set(0, followHeight, followDistance);
      camera.lookAt(0, 0, 0);
      return;
    }

    // Get the car's world position
    const carPos = new THREE.Vector3();
    carGroup.getWorldPosition(carPos);

    // Calculate desired camera position: behind and above the car
    // Car faces -Z by default, so "behind" is +Z relative to car's rotation
    const carQuat = new THREE.Quaternion();
    carGroup.getWorldQuaternion(carQuat);
    const behind = new THREE.Vector3(0, 0, followDistance).applyQuaternion(carQuat);
    const targetPos = new THREE.Vector3(
      carPos.x + behind.x,
      carPos.y + followHeight,
      carPos.z + behind.z
    );

    // ── SAFETY 1: Hard limit on camera distance from origin ──
    const camDistFromOrigin = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z);
    if (camDistFromOrigin > MAX_CAMERA_DISTANCE_FROM_ORIGIN) {
      // Force camera position to be at max distance from origin, in same direction
      const angle = Math.atan2(targetPos.x, targetPos.z);
      targetPos.x = Math.sin(angle) * MAX_CAMERA_DISTANCE_FROM_ORIGIN;
      targetPos.z = Math.cos(angle) * MAX_CAMERA_DISTANCE_FROM_ORIGIN;
      targetPos.y = followHeight;
    }

    // ── SAFETY 2: Pull camera look-at toward origin if car is far ──
    const carDistFromOrigin = Math.sqrt(carPos.x * carPos.x + carPos.z * carPos.z);

    if (carDistFromOrigin > MAX_CAMERA_DISTANCE_FROM_ORIGIN * 0.8) {
      // Car is very far — look at origin directly (guarantees road is visible)
      camera.lookAt(0, 0, 0);
    } else if (carDistFromOrigin > ORIGIN_PULLBACK_THRESHOLD) {
      // Car is moderately far — smoothly blend look-at between car and origin
      const blendFactor = (carDistFromOrigin - ORIGIN_PULLBACK_THRESHOLD) / 
                          (MAX_CAMERA_DISTANCE_FROM_ORIGIN * 0.8 - ORIGIN_PULLBACK_THRESHOLD);
      const lookTarget = new THREE.Vector3(
        carPos.x * (1 - blendFactor),
        carPos.y + 1,
        carPos.z * (1 - blendFactor)
      );
      camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
    } else {
      // Normal: look at the car
      camera.lookAt(carPos.x, carPos.y + 1, carPos.z);
    }

    // Smoothly interpolate camera position
    smoothPos.current.lerp(targetPos, dampingFactor);
    camera.position.copy(smoothPos.current);
  });

  return null;
});

CameraController.displayName = 'CameraController';
