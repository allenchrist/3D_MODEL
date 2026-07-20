/**
 * Truck — A low-poly truck built from Three.js primitives.
 *
 * Components:
 *   - Cabin (front cab)
 *   - Cargo trailer (long box behind)
 *   - 6 wheels (2 on cab, 4 on trailer)
 *   - Headlights + taillights
 *   - Bumpers
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

const WHEEL_POSITIONS = [
  [-1.2, 0.2, 1.8], [1.2, 0.2, 1.8],    // cab wheels
  [-1.2, 0.2, -0.6], [1.2, 0.2, -0.6],  // trailer front
  [-1.2, 0.2, -2.2], [1.2, 0.2, -2.2],  // trailer rear
];

const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);

const Truck = memo(() => {
  const wheels = useMemo(() =>
    WHEEL_POSITIONS.map((pos, i) => (
      <mesh key={i} position={pos} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>
    )),
  []);

  return (
    <group>
      {/* ── Cabin ────────────────────────────────────────── */}
      <mesh position={[0, 0.5, 1.8]} geometry={new THREE.BoxGeometry(1.8, 1.0, 1.6)}>
        <meshStandardMaterial color="#F44336" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Cabin roof */}
      <mesh position={[0, 1.05, 1.8]} geometry={new THREE.BoxGeometry(1.7, 0.1, 1.5)}>
        <meshStandardMaterial color="#D32F2F" roughness={0.6} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.75, 2.6]} geometry={new THREE.BoxGeometry(1.5, 0.5, 0.05)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.5} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.75, 1.0]} geometry={new THREE.BoxGeometry(1.5, 0.5, 0.05)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Side windows */}
      <mesh position={[-0.92, 0.75, 1.8]} geometry={new THREE.BoxGeometry(0.05, 0.45, 1.0)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0.92, 0.75, 1.8]} geometry={new THREE.BoxGeometry(0.05, 0.45, 1.0)}>
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* ── Cargo trailer ────────────────────────────────── */}
      <mesh position={[0, 0.6, -0.8]} geometry={new THREE.BoxGeometry(2.2, 1.2, 3.2)}>
        <meshStandardMaterial color="#FFC107" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Trailer roof */}
      <mesh position={[0, 1.25, -0.8]} geometry={new THREE.BoxGeometry(2.1, 0.1, 3.0)}>
        <meshStandardMaterial color="#FFA000" roughness={0.7} />
      </mesh>

      {/* Trailer connection to cab (fifth wheel) */}
      <mesh position={[0, 0.3, 0.85]} geometry={new THREE.BoxGeometry(0.6, 0.1, 0.4)}>
        <meshStandardMaterial color="#616161" roughness={0.8} />
      </mesh>

      {/* ── Wheels ───────────────────────────────────────── */}
      {wheels}

      {/* Wheel arches */}
      {WHEEL_POSITIONS.map((pos, i) => (
        <mesh
          key={`arch-${i}`}
          position={[pos[0] > 0 ? 1.15 : -1.15, 0.25, pos[2]]}
          geometry={new THREE.TorusGeometry(0.32, 0.03, 8, 10)}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}

      {/* ── Headlights ───────────────────────────────────── */}
      <mesh position={[-0.5, 0.4, 2.65]} geometry={new THREE.SphereGeometry(0.12, 8, 8)}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.5, 0.4, 2.65]} geometry={new THREE.SphereGeometry(0.12, 8, 8)}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>

      {/* ── Taillights ───────────────────────────────────── */}
      <mesh position={[-0.7, 0.5, -2.45]} geometry={new THREE.SphereGeometry(0.1, 8, 8)}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.7, 0.5, -2.45]} geometry={new THREE.SphereGeometry(0.1, 8, 8)}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>

      {/* ── Bumpers ──────────────────────────────────────── */}
      <mesh position={[0, 0.2, 2.65]} geometry={new THREE.BoxGeometry(1.6, 0.12, 0.12)}>
        <meshStandardMaterial color="#424242" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, -2.45]} geometry={new THREE.BoxGeometry(2.0, 0.12, 0.15)}>
        <meshStandardMaterial color="#424242" roughness={0.8} />
      </mesh>
    </group>
  );
});

Truck.displayName = 'Truck';
export default Truck;
