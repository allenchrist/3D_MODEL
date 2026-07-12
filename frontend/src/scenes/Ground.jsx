/**
 * Ground — Base ground plane for the 3D perception scene.
 * Uses a dark material with subtle grid overlay to simulate
 * an urban/highway environment floor.
 * Future: replace with textured asphalt + depth-estimated terrain mesh.
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

const GROUND_SIZE   = 200;
const GRID_SIZE     = 200;
const GRID_DIVS     = 40;
const GRID_COLOR_1  = new THREE.Color('#1a2535');
const GRID_COLOR_2  = new THREE.Color('#0d1520');

export const Ground = memo(() => {
  const groundMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a0e14',
        roughness: 0.85,
        metalness: 0.15,
      }),
    []
  );

  return (
    <group>
      {/* ── Base plane ──────────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        material={groundMaterial}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      </mesh>

      {/* ── Grid overlay ────────────────────────────────── */}
      <gridHelper
        args={[GRID_SIZE, GRID_DIVS, GRID_COLOR_1, GRID_COLOR_2]}
        position={[0, 0, 0]}
      />
    </group>
  );
});

Ground.displayName = 'Ground';
