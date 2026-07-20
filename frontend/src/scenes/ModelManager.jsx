import React, { memo, useRef, Component } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHAPE_REGISTRY, DEFAULT_SHAPE } from './VehicleShapes';

/* ── Per-type colours (for labels only; shapes have their own colours) ── */
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

/* ── Coordinate mapper (shared with PerceptionObjects) ───────── */
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

/* ── Single detected object ─────────────────────────────────── */
const DetectedObject = memo(({ object }) => {
  const { type, name, confidence, bbox, status } = object;
  const cfg   = SHAPE_REGISTRY[type] ?? DEFAULT_SHAPE;
  const { Component: ShapeComponent, scale, rotY } = cfg;
  const color = TYPE_COLORS[type]  ?? TYPE_COLORS.Unknown;
  const tgt   = bboxToWorld(bbox, type);

  const groupRef = useRef(null);
  const curPos   = useRef(new THREE.Vector3(tgt.x, tgt.y, tgt.z));
  const tgtPos   = useRef(new THREE.Vector3(tgt.x, tgt.y, tgt.z));

  // Always update target to latest position
  tgtPos.current.set(tgt.x, tgt.y, tgt.z);

  useFrame(() => {
    if (!groupRef.current) return;
    curPos.current.lerp(tgtPos.current, LERP);
    groupRef.current.position.copy(curPos.current);
  });

  return (
    <group ref={groupRef}>
      {/* Code-generated 3D shape — no GLB loading, no cloning bugs */}
      <group scale={scale} rotation={[0, rotY, 0]}>
        <ShapeComponent />
      </group>

      {/* Floating label above the object */}
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

/* ── Per-object error boundary ──────────────────────────────── */
class ObjectErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ── ModelManager ───────────────────────────────────────────── */
export const ModelManager = memo(({ objects = [] }) => {
  return (
    <group name="model-manager">
      {objects.map((obj) => (
        <ObjectErrorBoundary key={obj.id}>
          <DetectedObject object={obj} />
        </ObjectErrorBoundary>
      ))}
    </group>
  );
});
ModelManager.displayName = 'ModelManager';
