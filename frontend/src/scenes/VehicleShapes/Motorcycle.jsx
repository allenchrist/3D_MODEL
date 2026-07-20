/**
 * Motorcycle — A low-poly motorcycle built from Three.js primitives.
 *
 * Components:
 *   - Main frame/body
 *   - 2 wheels
 *   - Handlebars
 *   - Seat
 *   - Headlight
 *   - Exhaust pipe
 *   - Front fork
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 12);

const Motorcycle = memo(() => {
  return (
    <group rotation={[0, 0, 0]}>
      {/* ── Main body / frame ─────────────────────────────── */}
      <mesh position={[0, 0.3, 0.0]} geometry={new THREE.BoxGeometry(0.3, 0.2, 1.2)}>
        <meshStandardMaterial color="#00E676" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Engine block */}
      <mesh position={[0, 0.15, 0.2]} geometry={new THREE.BoxGeometry(0.35, 0.18, 0.4)}>
        <meshStandardMaterial color="#424242" roughness={0.7} metalness={0.6} />
      </mesh>

      {/* ── Fuel tank ─────────────────────────────────────── */}
      <mesh position={[0, 0.45, 0.25]} geometry={new THREE.BoxGeometry(0.3, 0.2, 0.3)}>
        <meshStandardMaterial color="#00C853" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* ── Seat ──────────────────────────────────────────── */}
      <mesh position={[0, 0.48, -0.15]} geometry={new THREE.BoxGeometry(0.25, 0.1, 0.35)}>
        <meshStandardMaterial color="#212121" roughness={0.8} />
      </mesh>

      {/* ── Handlebars ────────────────────────────────────── */}
      {/* Handlebar stem */}
      <mesh position={[0, 0.55, 0.65]} geometry={new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6)}>
        <meshStandardMaterial color="#9E9E9E" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Handlebar grips */}
      <mesh position={[-0.25, 0.65, 0.7]} geometry={new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6)} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#757575" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.25, 0.65, 0.7]} geometry={new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6)} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#757575" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Handlebar ends */}
      <mesh position={[-0.35, 0.65, 0.7]} geometry={new THREE.SphereGeometry(0.04, 6, 6)}>
        <meshStandardMaterial color="#212121" />
      </mesh>
      <mesh position={[0.35, 0.65, 0.7]} geometry={new THREE.SphereGeometry(0.04, 6, 6)}>
        <meshStandardMaterial color="#212121" />
      </mesh>

      {/* ── Front fork ────────────────────────────────────── */}
      <mesh position={[-0.12, 0.2, 0.65]} geometry={new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6)}>
        <meshStandardMaterial color="#BDBDBD" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.2, 0.65]} geometry={new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6)}>
        <meshStandardMaterial color="#BDBDBD" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* ── Swing arm (rear) ──────────────────────────────── */}
      <mesh position={[-0.1, 0.15, -0.35]} geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6)} rotation={[0, 0, Math.PI / 3]}>
        <meshStandardMaterial color="#9E9E9E" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.1, 0.15, -0.35]} geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6)} rotation={[0, 0, -Math.PI / 3]}>
        <meshStandardMaterial color="#9E9E9E" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* ── Wheels ────────────────────────────────────────── */}
      {/* Front wheel */}
      <mesh position={[0, 0.15, 0.7]} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>
      {/* Rear wheel */}
      <mesh position={[0, 0.15, -0.55]} geometry={wheelGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#212121" roughness={0.9} />
      </mesh>

      {/* Wheel rims */}
      <mesh position={[0, 0.15, 0.7]} geometry={new THREE.TorusGeometry(0.2, 0.025, 8, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#757575" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.15, -0.55]} geometry={new THREE.TorusGeometry(0.2, 0.025, 8, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#757575" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* ── Headlight ─────────────────────────────────────── */}
      <mesh position={[0, 0.4, 0.85]} geometry={new THREE.SphereGeometry(0.08, 8, 8)}>
        <meshStandardMaterial color="#FFF9C4" emissive="#FFEB3B" emissiveIntensity={0.5} />
      </mesh>

      {/* ── Taillight ─────────────────────────────────────── */}
      <mesh position={[0, 0.35, -0.65]} geometry={new THREE.SphereGeometry(0.05, 6, 6)}>
        <meshStandardMaterial color="#FF1744" emissive="#FF1744" emissiveIntensity={0.3} />
      </mesh>

      {/* ── Exhaust pipe ──────────────────────────────────── */}
      <mesh position={[0.22, 0.1, -0.2]} geometry={new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6)} rotation={[0, 0, 0.2]}>
        <meshStandardMaterial color="#9E9E9E" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* ── Mirrors ───────────────────────────────────────── */}
      <mesh position={[-0.25, 0.6, 0.6]} geometry={new THREE.SphereGeometry(0.035, 6, 6)}>
        <meshStandardMaterial color="#BBDEFB" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0.25, 0.6, 0.6]} geometry={new THREE.SphereGeometry(0.035, 6, 6)}>
        <meshStandardMaterial color="#BBDEFB" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  );
});

Motorcycle.displayName = 'Motorcycle';
export default Motorcycle;
