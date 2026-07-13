/**
 * ModelManager — Loads and places a GLB model for each YOLO detection.
 *
 * Drop GLB files into:  frontend/src/assets/models/
 *   car.glb  truck.glb  bus.glb  person.glb  motorcycle.glb  traffic_light.glb
 *
 * If a GLB is missing the component falls back to a wireframe box so the
 * scene never crashes during development.
 */
import React, { memo, useMemo, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { Text }    from '@react-three/drei';
import * as THREE  from 'three';

/* ── Model registry ─────────────────────────────────────────── */
const MODEL_CONFIG = {
  Car:           { path: '/models/car.glb',           scale: 0.8,  rotY: 0 },
  Truck:         { path: '/models/truck.glb',         scale: 1.5,  rotY: 0 },
  Bus:           { path: '/models/bus.glb',           scale: 2.0,  rotY: 0 },
  Pedestrian:    { path: '/models/person.glb',        scale: 0.4,  rotY: 0 },
  Motorcycle:    { path: '/models/motorcycle.glb',    scale: 0.6,  rotY: 0 },
  Cyclist:       { path: '/models/motorcycle.glb',    scale: 0.5,  rotY: 0 },
  Traffic_Light: { path: '/models/traffic_light.glb', scale: 0.5,  rotY: 0 },
};

const DEFAULT_CONFIG = { scale: 1.0, rotY: 0 };

/* ── Type colours (label + fallback box) ────────────────────── */
const TYPE_COLORS = {
  Car:           '#00D4FF',
  Truck:         '#FFC107',
  Bus:           '#FF9800',
  Motorcycle:    '#00FF99',
  Cyclist:       '#00FF99',
  Pedestrian:    '#FF4D4F',
  Traffic_Light: '#FFFF00',
  Unknown:       '#9AA4B2',
};

/* ── Object height estimates (metres) ───────────────────────── */
const TYPE_HEIGHTS = {
  Car:           1.5,
  Truck:         3.2,
  Bus:           3.0,
  Motorcycle:    1.2,
  Cyclist:       1.8,
  Pedestrian:    1.75,
  Traffic_Light: 2.5,
  Unknown:       1.5,
};

/* ── Video / road constants (must match PerceptionObjects) ───── */
const ROAD_WORLD_W = 14;
const ROAD_WORLD_L = 160;

/* ── Coordinate mapper ──────────────────────────────────────── */
export function bboxToWorld(bbox, type) {
  const { x1, y1, x2, y2 } = bbox;
  const videoW = bbox.frameW ?? 640;
  const videoH = bbox.frameH ?? 480;

  const normX = ((x1 + x2) / 2) / videoW;
  const normZ = ((y1 + y2) / 2) / videoH;
  const normW = Math.abs(x2 - x1) / videoW;

  const worldX = (normX - 0.5) * ROAD_WORLD_W;
  const worldZ = (normZ - 0.5) * -ROAD_WORLD_L * 0.6;
  const worldW = Math.max(normW * ROAD_WORLD_W, 0.8);
  const worldH = TYPE_HEIGHTS[type] ?? 1.5;
  const worldD = worldW * 0.6;

  return { x: worldX, y: worldH / 2, z: worldZ, w: worldW, h: worldH, d: worldD };
}

/* ── Fallback box (shown while GLB loads or if file missing) ── */
const FallbackBox = memo(({ pos, color }) => {
  const args = useMemo(() => [pos.w, pos.h, pos.d], [pos.w, pos.h, pos.d]);
  return (
    <group>
      <mesh>
        <boxGeometry args={args} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
});
FallbackBox.displayName = 'FallbackBox';

/* ── GLB model inner (called only when file exists) ─────────── */
const GlbModel = memo(({ path, scale, rotY }) => {
  const { scene } = useGLTF(path);
  const cloned     = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} scale={scale} rotation={[0, rotY, 0]} />;
});
GlbModel.displayName = 'GlbModel';

/* ── Single detected object ─────────────────────────────────── */
const DetectedObject = memo(({ object }) => {
  const { type, name, confidence, bbox, status } = object;

  const cfg   = MODEL_CONFIG[type] ?? DEFAULT_CONFIG;
  const color = TYPE_COLORS[type]  ?? TYPE_COLORS.Unknown;
  const pos   = useMemo(() => bboxToWorld(bbox, type), [bbox, type]);

  const labelOpacity = status === 'Lost Signal' ? 0.4 : 1;

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <Suspense fallback={<FallbackBox pos={pos} color={color} />}>
        <GlbModel path={cfg.path} scale={cfg.scale} rotY={cfg.rotY} />
      </Suspense>

      {/* Floating label */}
      <Text
        position={[0, pos.h / 2 + 0.5, 0]}
        fontSize={0.45}
        color={color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.04}
        outlineColor="#0B0F14"
        fillOpacity={labelOpacity}
      >
        {`${name}  ${(confidence * 100).toFixed(0)}%`}
      </Text>
    </group>
  );
});
DetectedObject.displayName = 'DetectedObject';

/* ── ModelManager ───────────────────────────────────────────── */
export const ModelManager = memo(({ objects = [] }) => {
  if (!objects.length) return null;
  return (
    <group name="model-manager">
      {objects.map((obj) => (
        <DetectedObject key={obj.id} object={obj} />
      ))}
    </group>
  );
});
ModelManager.displayName = 'ModelManager';
