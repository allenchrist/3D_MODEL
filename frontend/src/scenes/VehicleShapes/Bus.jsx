/**
 * Bus — A low-poly bus built from Three.js primitives.
 *
 * Components:
 *   - Long rectangular body
 *   - Higher roof/cabin
 *   - 6 wheels (3 axles)
 *   - Windows along the side
 *   - Headlights + taillights
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

const WHEEL_POSITIONS = [
  [-1.35, 0.15, 2.2], [1.35, 0.15, 2.2],
  [-1.35, 0.15, 0.0], [1.35, 0.15, 0.0],
  [-1.35, 0.15, -2.2], [1.35, 0.15, -2.2],
];

const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);

const Bus = memo(() => {
  const wheels = useMemo(() =>
    WHEEL_POSITIONS.map((pos, i) => (
      <mesh key={i} position={pos} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>
    )),
  []);

  return (
    <group>
      {/* ── Main body ────────────────────────────────────── */}
      <mesh position={[0, 0.6, 0]} geometry={new THREE.BoxGeometry(2.4, 1.2, 7.0)}>
        <meshStandardMaterial color="#FF9800" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* ── Roof (slightly wider) ────────────────────────── */}
      <mesh position={[0, 1.3, 0]} geometry={new THREE.BoxGeometry(2.5, 0.2, 6.8)}>
        <meshStandardMaterial color="#E65100" roughness={0.7} />
      </mesh>

      {/* ── Cabin / windshield area ──────────────────────── */}
      <mesh position={[0, 0.9, 3.3]} geometry={new THREE.BoxGeometry(2.2, 0.8, 0.6)}>
        <meshStandardMaterial color="#E65100" roughness={0.5} />
      </mesh>

      {/* Front windshield */}
      <mesh position={[0, 0.9, 3.65]} geometry={new THREE.BoxGeometry(2.0, 0.6, 0.05)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.5} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.85, -3.55]} geometry={new THREE.BoxGeometry(2.0, 0.6, 0.05)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.5} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* ── Side windows (6 windows, 3 per side) ─────────── */}
      <mesh position={[-1.25, 0.85, 1.5]} geometry={new THREE.BoxGeometry(0.05, 0.5, 1.2)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[-1.25, 0.85, 0.0]} geometry={new THREE.BoxGeometry(0.05, 0.5, 1.2)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[-1.25, 0.85, -1.5]} geometry={new THREE.BoxGeometry(0.05, 0.5, 1.2)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[1.25, 0.85, 1.5]} geometry={new THREE.BoxGeometry(0.05, 0.5, 1.2)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[1.25, 0.85, 0.0]} geometry={new THREE.BoxGeometry(0.05, 0.5, 1.2)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[1.25, 0.85, -1.5]} geometry={new THREE.BoxGeometry(0.05, 0.5, 1.2)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* ── Wheels (3 axles, 2 per axle = 6 wheels) ─────── */}
      {wheels}

      {/* ── Headlights ───────────────────────────────────── */}
      <mesh position={[-0.7, 0.4, 3.55]} geometry={new THREE.SphereGeometry(0.15, 8, 8)}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.7, 0.4, 3.55]} geometry={new THREE.SphereGeometry(0.15, 8, 8)}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>

      {/* ── Taillights ───────────────────────────────────── */}
      <mesh position={[-0.7, 0.4, -3.55]} geometry={new THREE.SphereGeometry(0.12, 8, 8)}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.7, 0.4, -3.55]} geometry={new THREE.SphereGeometry(0.12, 8, 8)}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>

      {/* ── Bumpers ──────────────────────────────────────── */}
      <mesh position={[0, 0.15, 3.55]} geometry={new THREE.BoxGeometry(2.2, 0.15, 0.2)}>
        <meshStandardMaterial color="#424242" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.15, -3.55]} geometry={new THREE.BoxGeometry(2.2, 0.15, 0.2)}>
        <meshStandardMaterial color="#424242" roughness={0.8} />
      </mesh>
    </group>
  );
});

Bus.displayName = 'Bus';
export default Bus;
