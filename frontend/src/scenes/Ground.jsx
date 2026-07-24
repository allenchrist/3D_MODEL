/**
 * Ground — Static ground plane with grid texture.
 *
 * Renders a fixed ground with a procedural grid texture.
 * The texture does NOT scroll — the ground stays in place
 * while the ego vehicle moves through world space.
 *
 * ╔═══════════════════════════════════════════════════╗
 * ║  Ground is now COMPLETELY STATIC. No scrolling.  ║
 * ╚═══════════════════════════════════════════════════╝
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

/* ── Constants ──────────────────────────────────────────────── */
const GROUND_SIZE = 300;
const GRID_DIVS   = 60;
const TEX_W       = 1024;
const TEX_H       = 1024;

/**
 * Generate a static grid texture on a 2D canvas.
 */
function createGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width  = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');

  // Darker background so road stands out
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Grid lines
  const step = TEX_W / GRID_DIVS;
  ctx.strokeStyle = '#111a28';
  ctx.lineWidth = 1;

  for (let x = 0; x <= TEX_W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEX_H);
    ctx.stroke();
  }

  for (let y = 0; y <= TEX_H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TEX_W, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  return texture;
}

/* ── Ground component ───────────────────────────────────────── */
export const Ground = memo(() => {
  // Create static texture + material once
  const groundMaterial = useMemo(() => {
    const tex = createGridTexture();
    const mat = new THREE.MeshStandardMaterial({
      color: '#070a10',
      map: tex,
      roughness: 0.92,
      metalness: 0.08,
      emissive: '#05070b',
      emissiveIntensity: 0.08,
    });
    return mat;
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.03, 0]}
      receiveShadow
      material={groundMaterial}
    >
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
    </mesh>
  );
});

Ground.displayName = 'Ground';
