import { memo, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Environment }      from './Environment';
import { Lighting }         from './Lighting';
import { Ground }           from './Ground';
import { Road }             from './Road';
import { CameraController } from './CameraController';
import { ModelManager }     from './ModelManager';
import '../styles/scene.css';

/* ── Canvas config — defined outside component so reference is stable ── */
const CAMERA = { fov: 55, near: 0.1, far: 500, position: [0, 18, 32] };
const GL     = { antialias: true, powerPreference: 'high-performance', alpha: false };

/* ── Static scene — never re-renders when detections change ─── */
const StaticScene = memo(() => (
  <>
    <Environment />
    <Lighting />
    <Suspense fallback={null}>
      <Ground />
      <Road />
    </Suspense>
    <CameraController />
  </>
));
StaticScene.displayName = 'StaticScene';

/* ── HUD overlay ────────────────────────────────────────────── */
const HudOverlay = memo(({ objectCount, isLive }) => (
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
HudOverlay.displayName = 'HudOverlay';

/* ── Scene3D ────────────────────────────────────────────────── */
export const Scene3D = memo(({
  detectedObjects = [],
  isLive          = false,
  showStats       = false,
  // future props — accepted but unused until implemented
  depthMap    = null,   // eslint-disable-line no-unused-vars
  riskHeatmap = null,   // eslint-disable-line no-unused-vars
  v2vObjects  = [],     // eslint-disable-line no-unused-vars
  sharedScene = null,   // eslint-disable-line no-unused-vars
}) => {
  const onCreated = useCallback(({ gl }) => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type    = 2; // PCFSoftShadowMap
  }, []);

  return (
    <div className="sceneCanvasWrap">
      {/*
        Canvas is mounted once and never remounts.
        detectedObjects is NOT passed into Canvas props — it goes
        directly to ModelManager inside, so Canvas itself never
        sees a prop change and never re-evaluates.
      */}
      <Canvas
        className="sceneCanvas"
        camera={CAMERA}
        gl={GL}
        shadows
        dpr={[1, 2]}
        onCreated={onCreated}
      >
        {/* Road, ground, lights, camera — mounted once, never touched again */}
        <StaticScene />

        {/* Detection objects — update position only, never recreate Canvas */}
        <ModelManager objects={detectedObjects} />

        {showStats && <Stats />}
      </Canvas>

      <HudOverlay objectCount={detectedObjects.length} isLive={isLive} />
    </div>
  );
});

Scene3D.displayName = 'Scene3D';
