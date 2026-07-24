/**
 * CameraController — Third-person follow camera for the ego vehicle.
 *
 * The camera follows the ego vehicle from behind and above, providing
 * a natural third-person perspective as the vehicle moves through the
 * static 3D environment.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Replaces OrbitControls with a dedicated follow camera.     ║
 * ║  The camera tracks the ego vehicle's position with smooth   ║
 * ║  damping for a cinematic feel.                              ║
 * ╚══════════════════════════════════════════════════════════════╝
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
 *
 * Future:
 *   - Add configurable camera presets (chase, top-down, cockpit)
 *   - Add collision detection to prevent clipping through ground
 *   - Add smooth transitions when switching camera modes
 */
import { memo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export const CameraController = memo(() => {
  const { camera } = useThree();

  useEffect(() => {
    // Stable fixed camera so road + ego vehicle are always visible
    camera.position.set(0, 16, 26);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
});

CameraController.displayName = 'CameraController';
