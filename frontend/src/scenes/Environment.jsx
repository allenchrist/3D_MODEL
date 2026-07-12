/**
 * Environment — Atmospheric environment for the 3D perception scene.
 * Provides fog, background color, and ambient environmental effects.
 * Future: replace with HDR environment maps, dynamic weather simulation,
 * and time-of-day lighting for Digital Twin accuracy.
 */
import React, { memo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Environment constants ──────────────────────────────────── */
const ENV_CONFIG = {
  fogColor:   '#0B0F14',
  fogNear:    40,
  fogFar:     130,
  bgColor:    '#0B0F14',
};

export const Environment = memo(() => {
  const { scene } = useThree();

  // Apply scene-level settings imperatively (most reliable approach)
  scene.background = new THREE.Color(ENV_CONFIG.bgColor);
  scene.fog = new THREE.Fog(ENV_CONFIG.fogColor, ENV_CONFIG.fogNear, ENV_CONFIG.fogFar);

  return null;
});

Environment.displayName = 'Environment';
