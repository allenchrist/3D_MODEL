import { memo, useRef, Suspense } from 'react';
import { useGLTF, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Model registry ─────────────────────────────────────────── */
const MODEL_CONFIG = {
  Car:        { path: '/models/car.glb',        scale: 0.8, rotY: 0 },
  Truck:      { path: '/models/truck.glb',      scale: 1.5, rotY: 0 },
  Bus:        { path: '/models/bus.glb',        scale: 2.0, rotY: 0 },
  Pedestrian: { path: '/models/person.glb',     scale: 0.4, rotY: 0 },
  Motorcycle: { path: '/models/motorcycle.glb', scale: 0.6, rotY: 0 },
  Cyclist:    { path: '/models/motorcycle.glb', scale: 0.5, rotY: 0 },
};

Object.values(MODEL_CONFIG).forEach(({ path }) => useGLTF.preload(path));

const DEFAULT_CONFIG = { scale: 1.0, rotY: 0 };

const TYPE_COLORS = {
  Car:        '#00D4FF',
  Truck:      '#FFC107',
  Bus:        '#FF9800',
  Motorcycle: '#00FF99',
  Cyclist:    '#00FF99',
  Pedestrian: '#FF4D4F',
  Unknown:    '#9AA4B2',
};

const TYPE_HEIGHTS = {
  Car:        1.5,
  Truck:      3.2,
  Bus:        3.0,
  Motorcycle: 1.2,
  Cyclist:    1.8,
  Pedestrian: 1.75,
  Unknown:    1.5,
};

const ROAD_W = 14;
const ROAD_L = 160;
const LERP   = 0.15;

/* ── Coordinate mapper ──────────────────────────────────────── */
function bboxToWorld(bbox, type) {
  const { x1, y1, x2, y2 } = bbox;
  const vw = bbox.frameW ?? 640;
  const vh = bbox.frameH ?? 480;

  if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2) || vw === 0 || vh === 0) {
    const h = TYPE_HEIGHTS[type] ?? 1.5;
    return { x: 0, y: h / 2, z: 0, w: 1, h, d: 0.6 };
  }

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const bw = Math.abs(x2 - x1);
  const h  = TYPE_HEIGHTS[type] ?? 1.5;
  const ww = Math.max((bw / vw) * ROAD_W, 0.8);

  return {
    x: Math.max(-ROAD_W,     Math.min(ROAD_W,     (cx / vw - 0.5) * ROAD_W)),
    y: h / 2,
    z: Math.max(-ROAD_L / 2, Math.min(ROAD_L / 2, (cy / vh - 0.5) * -ROAD_L * 0.6)),
    w: ww,
    h,
    d: ww * 0.6,
  };
}

/* ── Fallback wireframe box ─────────────────────────────────── */
function FallbackBox({ w, h, d, color }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}

/* ── GLB inner ───────────────────────────────────────────────── */
/*
  FIX for "only one object visible":
  Each GlbInner instance gets a unique clone by storing it in a ref
  that is keyed to THIS component instance — not shared across instances.
  useGLTF returns the same cached scene for the same path, so we must
  clone it independently for every mounted instance.
  The clone is created once (ref guard) and disposed on unmount.
*/
function GlbInner({ path, scale, rotY }) {
  const { scene } = useGLTF(path);
  const cloneRef  = useRef(null);

  // Create clone once per mount
  if (!cloneRef.current) {
    cloneRef.current = scene.clone(true);
  }

  // NOTE:
  // Do NOT manually dispose geometries/materials here.
  // GLTF scenes can share underlying GPU resources across clones/materials.
  // Disposing them on unmount can break rendering globally,
  // which matches the "scene goes blank when a new object comes in" symptom.
  // We rely on three/r3f lifecycle + browser/GPU pressure instead.

  return (
    <primitive
      object={cloneRef.current}
      scale={scale}
      rotation={[0, rotY, 0]}
    />
  );
}

/* ── Single detected object ─────────────────────────────────── */
/*
  FIX for "model doesn't follow me":
  Removed the over-strict memo comparator entirely.
  React.memo with no comparator does a shallow prop comparison —
  since `object` is a new reference every poll (new array from useState),
  DetectedObject will re-render on every poll, which is correct.
  tgtPos.current.set() will always receive the latest bbox values.
  useFrame lerps toward the updated target every animation frame.
*/
const DetectedObject = memo(({ object }) => {
  const { type, name, confidence, bbox, status } = object;
  const cfg   = MODEL_CONFIG[type] ?? DEFAULT_CONFIG;
  const color = TYPE_COLORS[type]  ?? TYPE_COLORS.Unknown;
  const tgt   = bboxToWorld(bbox, type);

  const groupRef = useRef(null);
  const curPos   = useRef(new THREE.Vector3(tgt.x, tgt.y, tgt.z));
  const tgtPos   = useRef(new THREE.Vector3(tgt.x, tgt.y, tgt.z));

  // Always update target to latest position — runs on every re-render
  tgtPos.current.set(tgt.x, tgt.y, tgt.z);

  useFrame(() => {
    if (!groupRef.current) return;
    curPos.current.lerp(tgtPos.current, LERP);
    groupRef.current.position.copy(curPos.current);
  });

  return (
    <group ref={groupRef}>
      <Suspense fallback={<FallbackBox w={tgt.w} h={tgt.h} d={tgt.d} color={color} />}>
        <GlbInner path={cfg.path} scale={cfg.scale} rotY={cfg.rotY} />
      </Suspense>
      <Text
        position={[0, tgt.h / 2 + 0.6, 0]}
        fontSize={0.45}
        color={color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.04}
        outlineColor="#0B0F14"
        fillOpacity={status === 'Lost Signal' ? 0.4 : 1}
      >
        {`${name}  ${(confidence * 100).toFixed(0)}%`}
      </Text>
    </group>
  );
});
DetectedObject.displayName = 'DetectedObject';

/* ── ModelManager ───────────────────────────────────────────── */
export const ModelManager = memo(({ objects = [] }) => {
  // IMPORTANT: Keep the container mounted so the scene never "goes blank".
  // React will still unmount individual object instances when `objects` drops them.
  return (
    <group name="model-manager">
      {objects.map((obj) => (
        <DetectedObject key={obj.id} object={obj} />
      ))}
    </group>
  );
});
ModelManager.displayName = 'ModelManager';
