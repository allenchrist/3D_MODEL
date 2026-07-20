/**
 * Pedestrian — A low-poly person built from Three.js primitives.
 *
 * Components:
 *   - Body (capsule/cylinder)
 *   - Head (sphere)
 *   - Arms (cylinders)
 *   - Legs (cylinders)
 */
import React, { memo } from 'react';
import * as THREE from 'three';

const Pedestrian = memo(() => {
  return (
    <group>
      {/* ── Body / Torso ──────────────────────────────────── */}
      <mesh position={[0, 0.8, 0]} geometry={new THREE.CylinderGeometry(0.2, 0.25, 0.6, 10)}>
        <meshStandardMaterial color="#1565C0" roughness={0.6} />
      </mesh>

      {/* ── Head ──────────────────────────────────────────── */}
      <mesh position={[0, 1.15, 0]} geometry={new THREE.SphereGeometry(0.14, 10, 10)}>
        <meshStandardMaterial color="#FFCCBC" roughness={0.5} />
      </mesh>

      {/* Hair (small dark cap on top) */}
      <mesh position={[0, 1.24, 0]} geometry={new THREE.SphereGeometry(0.1, 8, 8)} scale={[1.1, 0.3, 1.1]}>
        <meshStandardMaterial color="#3E2723" roughness={0.8} />
      </mesh>

      {/* ── Left arm ──────────────────────────────────────── */}
      <mesh position={[-0.28, 0.85, 0]} geometry={new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6)} rotation={[0, 0, 0.2]}>
        <meshStandardMaterial color="#1565C0" roughness={0.6} />
      </mesh>

      {/* Left hand */}
      <mesh position={[-0.42, 0.58, 0]} geometry={new THREE.SphereGeometry(0.04, 6, 6)}>
        <meshStandardMaterial color="#FFCCBC" roughness={0.5} />
      </mesh>

      {/* ── Right arm ─────────────────────────────────────── */}
      <mesh position={[0.28, 0.85, 0]} geometry={new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6)} rotation={[0, 0, -0.2]}>
        <meshStandardMaterial color="#1565C0" roughness={0.6} />
      </mesh>

      {/* Right hand */}
      <mesh position={[0.42, 0.58, 0]} geometry={new THREE.SphereGeometry(0.04, 6, 6)}>
        <meshStandardMaterial color="#FFCCBC" roughness={0.5} />
      </mesh>

      {/* ── Left leg ──────────────────────────────────────── */}
      <mesh position={[-0.1, 0.35, 0]} geometry={new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6)}>
        <meshStandardMaterial color="#37474F" roughness={0.7} />
      </mesh>

      {/* Left foot */}
      <mesh position={[-0.1, 0.1, 0.05]} geometry={new THREE.BoxGeometry(0.08, 0.06, 0.14)}>
        <meshStandardMaterial color="#212121" roughness={0.8} />
      </mesh>

      {/* ── Right leg ─────────────────────────────────────── */}
      <mesh position={[0.1, 0.35, 0]} geometry={new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6)}>
        <meshStandardMaterial color="#37474F" roughness={0.7} />
      </mesh>

      {/* Right foot */}
      <mesh position={[0.1, 0.1, 0.05]} geometry={new THREE.BoxGeometry(0.08, 0.06, 0.14)}>
        <meshStandardMaterial color="#212121" roughness={0.8} />
      </mesh>

      {/* ── Neck ──────────────────────────────────────────── */}
      <mesh position={[0, 0.98, 0]} geometry={new THREE.CylinderGeometry(0.04, 0.05, 0.08, 6)}>
        <meshStandardMaterial color="#FFCCBC" roughness={0.5} />
      </mesh>
    </group>
  );
});

Pedestrian.displayName = 'Pedestrian';
export default Pedestrian;
