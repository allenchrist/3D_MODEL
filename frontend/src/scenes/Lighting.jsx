/**
 * Lighting — Scene lighting rig for the 3D perception environment.
 * Designed to support future PBR vehicle/object rendering.
 * Uses a combination of ambient, directional (sun), and accent fill lights.
 */
import React, { memo } from 'react';

export const Lighting = memo(() => (
  <>
    {/* Base ambient — prevents pure black shadows */}
    <ambientLight intensity={0.35} color="#1a2a3a" />

    {/* Primary directional — simulates overhead sun */}
    <directionalLight
      position={[30, 50, 20]}
      intensity={1.2}
      color="#e8f0ff"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={0.5}
      shadow-camera-far={200}
      shadow-camera-left={-60}
      shadow-camera-right={60}
      shadow-camera-top={60}
      shadow-camera-bottom={-60}
    />

    {/* Cyan accent fill — automotive HMI aesthetic, future: V2V highlight */}
    <pointLight position={[0, 8, 0]} intensity={0.6} color="#00D4FF" distance={60} decay={2} />

    {/* Rear fill — prevents harsh back-face darkness */}
    <directionalLight position={[-20, 10, -20]} intensity={0.25} color="#334466" />

    {/* Ground bounce — subtle warm fill from below */}
    <hemisphereLight skyColor="#1a2a3a" groundColor="#0a0f14" intensity={0.4} />
  </>
));

Lighting.displayName = 'Lighting';
