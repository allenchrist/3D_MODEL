/**
 * CameraController — Orbital camera rig for the 3D perception scene.
 * Configured with automotive-appropriate constraints:
 * - Prevents going below ground
 * - Limits zoom range for meaningful scene inspection
 * - Smooth damping for premium feel
 *
 * Future: extend with preset camera modes (Bird's Eye, Follow Vehicle,
 * Sensor POV, Collaborative Overview) driven by UI controls.
 */
import React, { memo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

/* ── Camera configuration constants ────────────────────────── */
const CAMERA_CONFIG = {
  initialPosition: [0, 18, 32],
  target:          [0, 0, 0],
  minDistance:     5,
  maxDistance:     120,
  minPolarAngle:   0.1,                // prevent going underground
  maxPolarAngle:   Math.PI / 2 - 0.05, // prevent going below horizon
  dampingFactor:   0.06,
  panSpeed:        0.8,
  rotateSpeed:     0.6,
  zoomSpeed:       1.0,
};

export const CameraController = memo(() => {
  const controlsRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    // Set initial camera position on mount
    camera.position.set(...CAMERA_CONFIG.initialPosition);
    camera.lookAt(...CAMERA_CONFIG.target);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={CAMERA_CONFIG.dampingFactor}
      minDistance={CAMERA_CONFIG.minDistance}
      maxDistance={CAMERA_CONFIG.maxDistance}
      minPolarAngle={CAMERA_CONFIG.minPolarAngle}
      maxPolarAngle={CAMERA_CONFIG.maxPolarAngle}
      panSpeed={CAMERA_CONFIG.panSpeed}
      rotateSpeed={CAMERA_CONFIG.rotateSpeed}
      zoomSpeed={CAMERA_CONFIG.zoomSpeed}
      makeDefault
    />
  );
});

CameraController.displayName = 'CameraController';
