/**
 * Road — Multi-lane road geometry for the 3D perception scene.
 * Renders asphalt surface, lane dividers, and edge markings.
 * Future: extend with procedural road generation, intersections,
 * and dynamic lane occupancy from perception data.
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

/* ── Road constants ─────────────────────────────────────────── */
const ROAD_LENGTH     = 160;
const ROAD_WIDTH      = 14;
const LANE_WIDTH      = 3.5;
const LANE_COUNT      = 4;
const MARKING_HEIGHT  = 0.02;  // slightly above road surface
const DASH_LENGTH     = 3.0;
const DASH_GAP        = 3.0;
const DASH_COUNT      = 20;

export const Road = memo(() => {
  const roadMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#111820',
        roughness: 0.92,
        metalness: 0.05,
      }),
    []
  );

  const edgeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 }),
    []
  );

  const dashMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5, opacity: 0.7, transparent: true }),
    []
  );

  const centerMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFC107', roughness: 0.5, opacity: 0.85, transparent: true }),
    []
  );

  // Pre-compute dash positions along road length
  const dashPositions = useMemo(() => {
    const positions = [];
    const step = DASH_LENGTH + DASH_GAP;
    const start = -(ROAD_LENGTH / 2) + DASH_LENGTH / 2;
    for (let i = 0; i < DASH_COUNT; i++) {
      positions.push(start + i * step);
    }
    return positions;
  }, []);

  // Lane divider X positions (between lanes, excluding edges)
  const laneDividerXPositions = useMemo(() => {
    const positions = [];
    for (let i = 1; i < LANE_COUNT; i++) {
      positions.push(-ROAD_WIDTH / 2 + i * LANE_WIDTH);
    }
    return positions;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* ── Asphalt surface ───────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={roadMaterial}
      >
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
      </mesh>

      {/* ── Left edge marking ─────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-ROAD_WIDTH / 2 + 0.1, MARKING_HEIGHT, 0]}
        material={edgeMaterial}
      >
        <planeGeometry args={[0.2, ROAD_LENGTH]} />
      </mesh>

      {/* ── Right edge marking ────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[ROAD_WIDTH / 2 - 0.1, MARKING_HEIGHT, 0]}
        material={edgeMaterial}
      >
        <planeGeometry args={[0.2, ROAD_LENGTH]} />
      </mesh>

      {/* ── Center double-yellow line ─────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, MARKING_HEIGHT, 0]}
        material={centerMaterial}
      >
        <planeGeometry args={[0.15, ROAD_LENGTH]} />
      </mesh>

      {/* ── Lane dashed dividers ──────────────────────────── */}
      {laneDividerXPositions.map((xPos) =>
        dashPositions.map((zPos) => (
          <mesh
            key={`dash-${xPos}-${zPos}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[xPos, MARKING_HEIGHT, zPos]}
            material={dashMaterial}
          >
            <planeGeometry args={[0.12, DASH_LENGTH]} />
          </mesh>
        ))
      )}
    </group>
  );
});

Road.displayName = 'Road';
