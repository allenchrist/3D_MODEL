/**
 * Car — A low-poly car built from Three.js primitives.
 *
 * Components:
 *   - Rounded body (beveled box)
 *   - Cabin/roof (smaller box on top)
 *   - 4 wheels (cylinder)
 *   - Headlights (small spheres)
 *   - Taillights (small spheres)
 *   - Windshield (tinted box on front)
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

/* ── Shared geometries (reused across instances) ────────────── */
const bodyGeom   = new THREE.BoxGeometry(2.0, 0.6, 4.0);
const cabinGeom  = new THREE.BoxGeometry(1.6, 0.5, 2.0);
// We approximate rounded edges by chamfering with smaller boxes
const hoodGeom   = new THREE.BoxGeometry(1.8, 0.15, 1.0);
const trunkGeom  = new THREE.BoxGeometry(1.8, 0.15, 0.8);
const wheelGeom  = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
const lightGeom  = new THREE.SphereGeometry(0.12, 8, 8);
const windowGeom = new THREE.BoxGeometry(1.4, 0.4, 1.6);

const Car = memo(() => {
  return (
    <group>
      {/* ── Body ──────────────────────────────────────────── */}
      {/* Main body */}
      <mesh position={[0, 0.3, 0]} geometry={bodyGeom}>
        <meshStandardMaterial color="#2196F3" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Hood slope - small wedge shape */}
      <mesh position={[0, 0.42, 1.25]} geometry={hoodGeom}>
        <meshStandardMaterial color="#1976D2" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Trunk */}
      <mesh position={[0, 0.42, -1.35]} geometry={trunkGeom}>
        <meshStandardMaterial color="#1976D2" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* ── Cabin (roof) ─────────────────────────────────── */}
      <mesh position={[0, 0.8, 0]} geometry={cabinGeom}>
        <meshStandardMaterial color="#1565C0" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Windshield (front window) */}
      <mesh position={[0, 0.8, 1.05]} geometry={windowGeom} rotation={[0.15, 0, 0]}>
        <meshStandardMaterial
          color="#64B5F6"
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.8, -1.05]} geometry={windowGeom} rotation={[-0.15, 0, 0]}>
        <meshStandardMaterial
          color="#64B5F6"
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* ── Wheels ───────────────────────────────────────── */}
      {/* Front left */}
      <mesh position={[-1.1, 0.15, 1.2]} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>
      {/* Front right */}
      <mesh position={[1.1, 0.15, 1.2]} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>
      {/* Rear left */}
      <mesh position={[-1.1, 0.15, -1.2]} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>
      {/* Rear right */}
      <mesh position={[1.1, 0.15, -1.2]} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>

      {/* Wheel arches (subtle dark arcs) */}
      <mesh position={[-1.05, 0.2, 1.2]} geometry={new THREE.TorusGeometry(0.35, 0.04, 8, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[1.05, 0.2, 1.2]} geometry={new THREE.TorusGeometry(0.35, 0.04, 8, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-1.05, 0.2, -1.2]} geometry={new THREE.TorusGeometry(0.35, 0.04, 8, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[1.05, 0.2, -1.2]} geometry={new THREE.TorusGeometry(0.35, 0.04, 8, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* ── Headlights ───────────────────────────────────── */}
      <mesh position={[-0.6, 0.25, 2.05]} geometry={lightGeom}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.6, 0.25, 2.05]} geometry={lightGeom}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>

      {/* ── Taillights ───────────────────────────────────── */}
      <mesh position={[-0.6, 0.25, -2.05]} geometry={lightGeom}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.6, 0.25, -2.05]} geometry={lightGeom}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>

      {/* ── Bumpers ──────────────────────────────────────── */}
      <mesh position={[0, 0.1, 2.08]} geometry={new THREE.BoxGeometry(1.8, 0.1, 0.15)}>
        <meshStandardMaterial color="#424242" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, -2.08]} geometry={new THREE.BoxGeometry(1.8, 0.1, 0.15)}>
        <meshStandardMaterial color="#424242" roughness={0.8} />
      </mesh>
    </group>
  );
});

Car.displayName = 'Car';
export default Car;
