/**
 * Road — Static road with procedural texture.
 *
 * Renders a fixed road plane with lane markings.
 * The texture does NOT scroll — the road stays in place
 * while the ego vehicle moves through world space.
 *
 * ╔══════════════════════════════════════════════════╗
 * ║  Road is now COMPLETELY STATIC. No scrolling.   ║
 * ╚══════════════════════════════════════════════════╝
 */
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';

/* ── Road constants ─────────────────────────────────────────── */
const ROAD_LENGTH = 500;
const ROAD_WIDTH  = 30;
const LANE_WIDTH  = 3.5;
const LANE_COUNT  = 4;
const DASH_LEN    = 3.0;
const DASH_GAP    = 3.0;

/* ── Exported boundary constants for position clamping ──────── */
export const ROAD_BOUNDS = {
  minX: -ROAD_WIDTH / 2 + 1.5,   // leave 1.5m margin from edge
  maxX: ROAD_WIDTH / 2 - 1.5,
  minZ: -ROAD_LENGTH / 2 + 2,
  maxZ: ROAD_LENGTH / 2 - 2,
};

/* ── Canvas texture dimensions (power-of-2 for perf) ────────── */
const TEX_W = 1024;
const TEX_H = 2048;

/**
 * Generate a static road-markings texture onto a 2D canvas.
 */
function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width  = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');

  const pxW = TEX_W;
  const pxH = TEX_H;

  // -- Dark asphalt background (high contrast vs ground) --
  ctx.fillStyle = '#2f3338';
  ctx.fillRect(0, 0, pxW, pxH);

  const pxPerMx = pxW / ROAD_WIDTH;
  const pxPerMz = pxH / ROAD_LENGTH;

  // -- Left edge line (bright) --
  ctx.fillStyle = '#f2f4f7';
  const leftX = (-ROAD_WIDTH / 2 + 0.1) * pxPerMx + pxW / 2;
  ctx.fillRect(leftX, 0, 0.2 * pxPerMx, pxH);

  // -- Right edge line (bright) --
  const rightX = (ROAD_WIDTH / 2 - 0.1 - 0.2) * pxPerMx + pxW / 2;
  ctx.fillRect(rightX, 0, 0.2 * pxPerMx, pxH);

  // -- Centre yellow line (brighter) --
  ctx.fillStyle = '#ffd24a';
  const cx = pxW / 2;
  ctx.fillRect(cx - 0.25 * pxPerMx, 0, 0.15 * pxPerMx, pxH);

  // -- Lane dashed dividers (bright white) --
  ctx.fillStyle = '#e9edf2';
  const dashPx  = DASH_LEN * pxPerMz;
  const gapPx   = DASH_GAP * pxPerMz;
  const stepPx  = dashPx + gapPx;
  const dashW   = 0.12 * pxPerMx;

  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const xPos = (-ROAD_WIDTH / 2 + lane * LANE_WIDTH) * pxPerMx + pxW / 2;
    for (let y = 0; y < pxH; y += stepPx) {
      ctx.fillRect(xPos, y, dashW, dashPx);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  return texture;
}

/* ── Road component ─────────────────────────────────────────── */
export const Road = memo(() => {
  // Create static texture + material once
  const material = useMemo(() => {
    const tex = createRoadTexture();
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: tex,
      roughness: 0.85,
      metalness: 0.03,
      emissive: '#1a1a1a',
      emissiveIntensity: 0.12,
    });
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.03, 0]}
      receiveShadow
      material={material}
    >
      <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
    </mesh>
  );
});

Road.displayName = 'Road';
