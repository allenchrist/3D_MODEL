/**
 * Scene3D — Core 3D rendering engine for the Collaborative Perception Platform.
 *
 * Data flow:
 *   Dashboard → usePerceptionData → objects → Scene3D → PerceptionObjects
 *
 * Each detected object from the FastAPI /detections endpoint is rendered
 * as a colour-coded 3D bounding box on the road plane.
 *
 * Future integration points (prepared):
 *   - GLTF vehicle models replacing box geometry
 *   - MiDaS depth mesh overlay
 *   - ByteTrack trajectory trails
 *   - Risk heatmap layer
 *   - V2V collaborative objects
 *   - Digital Twin
 */
import React, { memo, Suspense, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Environment }        from './Environment';
import { Lighting }           from './Lighting';
import { Ground }             from './Ground';
import { Road }               from './Road';
import { CameraController }   from './CameraController';
import { ModelManager }       from './ModelManager';
import '../styles/scene.css';

/* ── Canvas configuration ───────────────────────────────────── */
const CANVAS_CONFIG = {
  camera: {
    fov:      55,
    near:     0.1,
    far:      500,
    position: [0, 18, 32],
  },
  gl: {
    antialias:       true,
    powerPreference: 'high-performance',
    alpha:           false,
  },
  shadows: true,
  dpr: [1, 2],
};

/* ── Scene fallback ─────────────────────────────────────────── */
const SceneFallback = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color="#00D4FF" wireframe />
  </mesh>
);

/* ── HUD overlay ────────────────────────────────────────────── */
const SceneHudOverlay = memo(({ objectCount, isLive }) => (
  <div className="sceneHudOverlay" aria-hidden="true">
    <div className="sceneCorner tl" />
    <div className="sceneCorner tr" />
    <div className="sceneCorner bl" />
    <div className="sceneCorner br" />
    <div className="sceneInfoStrip">
      <div className="sceneInfoChip">
        <span className="dot" />
        {isLive ? 'YOLO Live' : 'Scene Active'}
      </div>
      <div className="sceneInfoChip">3D Perception View</div>
      {objectCount > 0 && (
        <div className="sceneInfoChip">{objectCount} Objects</div>
      )}
    </div>
  </div>
));

SceneHudOverlay.displayName = 'SceneHudOverlay';

/* ── Scene3D ────────────────────────────────────────────────── */
export const Scene3D = memo(({
  detectedObjects = [],   // UI-ready objects from usePerceptionData
  depthMap        = null, // eslint-disable-line no-unused-vars — future MiDaS
  riskHeatmap     = null, // eslint-disable-line no-unused-vars — future risk layer
  v2vObjects      = [],   // eslint-disable-line no-unused-vars — future V2V
  sharedScene     = null, // eslint-disable-line no-unused-vars — future shared intelligence
  isLive          = false,
  showStats       = false,
}) => {
  const canvasRef = useRef(null);

  const onCreated = useCallback(({ gl }) => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type    = 2; // THREE.PCFSoftShadowMap
  }, []);

  return (
    <div className="sceneCanvasWrap" ref={canvasRef}>
      <Canvas
        className="sceneCanvas"
        camera={CANVAS_CONFIG.camera}
        gl={CANVAS_CONFIG.gl}
        shadows={CANVAS_CONFIG.shadows}
        dpr={CANVAS_CONFIG.dpr}
        onCreated={onCreated}
      >
        <Environment />
        <Lighting />

        <Suspense fallback={<SceneFallback />}>
          <Ground />
          <Road />

          {/* ── Live YOLO detections rendered as GLB models ── */}
          <ModelManager objects={detectedObjects} />
        </Suspense>

        <CameraController />
        {showStats && <Stats />}
      </Canvas>

      <SceneHudOverlay
        objectCount={detectedObjects.length}
        isLive={isLive}
      />
    </div>
  );
});

Scene3D.displayName = 'Scene3D';
