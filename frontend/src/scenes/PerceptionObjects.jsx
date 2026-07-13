/**
 * PerceptionObjects — Renders YOLO-detected objects as 3D boxes in the scene.
 *
 * Each detected object becomes:
 *   - A wireframe bounding box (colour-coded by type)
 *   - A solid semi-transparent fill box
 *   - A floating label showing class + confidence
 *
 * Coordinate mapping:
 *   YOLO gives pixel bbox (x1,y1,x2,y2) in a ~1920×1080 frame.
 *   We map those to Three.js world space on the road plane:
 *     - X axis: horizontal (left/right across road)
 *     - Z axis: depth (near/far along road)
 *     - Y axis: height above ground
 *
 * Future:
 *   - Replace box geometry with loaded GLTF vehicle models
 *   - Add trajectory trail lines from ByteTrack history
 *   - Add risk heatmap overlay from risk prediction scores
 */
import React, { memo, useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/* ── Constants ──────────────────────────────────────────────── */
// Source video dimensions (must match the video YOLO processed)
const VIDEO_W = 1920;
const VIDEO_H = 1080;

// Road world-space dimensions (must match Road.jsx)
const ROAD_WORLD_W = 14;   // metres wide
const ROAD_WORLD_L = 160;  // metres long

// Object height estimates by type (metres)
const TYPE_HEIGHTS = {
  Car:        1.5,
  Truck:      3.2,
  Bus:        3.0,
  Motorcycle: 1.2,
  Cyclist:    1.8,
  Pedestrian: 1.75,
  Unknown:    1.5,
};

// Wireframe colours by type
const TYPE_COLORS = {
  Car:        '#00D4FF',   // cyan  — primary
  Truck:      '#FFC107',   // amber — warning
  Bus:        '#FF9800',   // orange
  Motorcycle: '#00FF99',   // green — success
  Cyclist:    '#00FF99',   // green
  Pedestrian: '#FF4D4F',   // red   — danger (pedestrians = highest risk)
  Unknown:    '#9AA4B2',   // grey
};

/* ── Coordinate mapper ──────────────────────────────────────── */
/**
 * Map a YOLO pixel bbox to Three.js world-space position and size.
 *
 * YOLO pixel space:  origin top-left, x right, y down
 * Three.js road:     origin centre, x right, z forward (away from camera)
 *
 * @param {{ x1, y1, x2, y2 }} bbox  Pixel coordinates
 * @param {string}              type  Object type for height lookup
 * @returns {{ x, y, z, w, h, d }}   World-space centre + dimensions
 */
function bboxToWorld(bbox, type) {
  const { x1, y1, x2, y2 } = bbox;

  // Normalise to [0, 1]
  const normX  = ((x1 + x2) / 2) / VIDEO_W;
  const normZ  = ((y1 + y2) / 2) / VIDEO_H;
  const normW  = Math.abs(x2 - x1) / VIDEO_W;

  // Map to road world space
  const worldX = (normX - 0.5) * ROAD_WORLD_W;
  // Z: top of image (y=0) = far end of road, bottom (y=1) = near end
  const worldZ = (normZ - 0.5) * -ROAD_WORLD_L * 0.6;

  const worldW = Math.max(normW * ROAD_WORLD_W, 0.8);
  const worldH = TYPE_HEIGHTS[type] ?? 1.5;
  const worldD = worldW * 0.6;   // depth proportional to width

  return {
    x: worldX,
    y: worldH / 2,   // lift box so base sits on ground
    z: worldZ,
    w: worldW,
    h: worldH,
    d: worldD,
  };
}

/* ── Single detection box ───────────────────────────────────── */
const DetectionBox = memo(({ object }) => {
  const { type, name, confidence, bbox, status } = object;

  const color   = TYPE_COLORS[type] ?? TYPE_COLORS.Unknown;
  const pos     = useMemo(() => bboxToWorld(bbox, type), [bbox, type]);
  const opacity = status === 'Lost Signal' ? 0.25 : 0.12;

  // Reuse geometry/material instances across renders
  const boxArgs = useMemo(() => [pos.w, pos.h, pos.d], [pos.w, pos.h, pos.d]);

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Semi-transparent fill */}
      <mesh>
        <boxGeometry args={boxArgs} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
        <lineBasicMaterial color={color} linewidth={1} />
      </lineSegments>

      {/* Floating label above the box */}
      <Text
        position={[0, pos.h / 2 + 0.4, 0]}
        fontSize={0.45}
        color={color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.04}
        outlineColor="#0B0F14"
      >
        {`${name}  ${(confidence * 100).toFixed(0)}%`}
      </Text>
    </group>
  );
});

DetectionBox.displayName = 'DetectionBox';

/* ── PerceptionObjects ──────────────────────────────────────── */
/**
 * Renders all detected objects for the current frame.
 *
 * @param {{ objects: Array }} props
 *   objects — UI-ready object array from usePerceptionData / transformApiFrame
 */
export const PerceptionObjects = memo(({ objects = [] }) => {
  if (!objects.length) return null;

  return (
    <group name="perception-objects">
      {objects.map((obj) => (
        <DetectionBox key={obj.id} object={obj} />
      ))}
    </group>
  );
});

PerceptionObjects.displayName = 'PerceptionObjects';
