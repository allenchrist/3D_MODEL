import React, { memo, useCallback, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Environment }              from './Environment';
import { Lighting }                 from './Lighting';
import { RoadAnimationController }  from './RoadAnimationController';
import { CameraController }         from './CameraController';
import { ModelManager }             from './ModelManager';
import { EgoVehicle }               from './EgoVehicle';
import { useEgoMotion }             from '../hooks/useEgoMotion';
import '../styles/scene.css';

/* ── Loading fallback for ModelManager (suspense) ───────────── */
const ModelManagerFallback = memo(() => (
  <group name="model-manager-fallback">
    {/* No objects rendered while models load — prevents blank road */}
  </group>
));
ModelManagerFallback.displayName = 'ModelManagerFallback';

/* ── Canvas config — defined outside component so reference is stable ── */
const CAMERA = { fov: 55, near: 0.1, far: 500, position: [0, 14, 28] };
const GL     = { antialias: true, powerPreference: 'high-performance', alpha: false };

/* ── Scene content — inside Canvas so it can use hooks ──────── */
const SceneContent = memo(({
  detectedObjects,
  egoMotion,
  carRef,
  egoPose,
}) => {
  const { velocityRef, positionRef, rotationRef, updatePosition } = egoMotion;

  return (
    <>
      {/* Static environment — never re-renders */}
      <Environment />
      <Lighting />

      {/* Third-person camera that follows the ego vehicle */}
      <CameraController carRef={carRef} />

      {/* Static road + ground — NEVER inside suspense, always visible */}
      <RoadAnimationController>
        {/* Perception objects — individually wrapped in Suspense so loading
            one model doesn't blank the entire scene */}
        <Suspense fallback={<ModelManagerFallback />}>
          <ModelManager objects={detectedObjects} />
        </Suspense>
      </RoadAnimationController>

      {/* Ego vehicle — moves on static road based on camera motion */}
      <EgoVehicle
        velocityRef={velocityRef}
        positionRef={positionRef}
        rotationRef={rotationRef}
        carRef={carRef}
        updatePosition={updatePosition}
        egoPose={egoPose}
      />
    </>
  );
});
SceneContent.displayName = 'SceneContent';

/* ── HUD overlay ────────────────────────────────────────────── */
const HudOverlay = memo(({ objectCount, isLive, motionSource }) => (
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
      <div className="sceneInfoChip">
        Ego: {motionSource === 'simulated' ? 'Keyboard' : motionSource === 'camera' ? 'Camera' : motionSource === 'device' ? 'Motion' : motionSource}
      </div>
    </div>
  </div>
));
HudOverlay.displayName = 'HudOverlay';


/* ── Scene3D ────────────────────────────────────────────────── */
export const Scene3D = memo(({
  detectedObjects = [],
  egoPose         = null,
  isLive          = false,
  showStats       = false,
}) => {
  // Ego vehicle motion system — modular motion source abstraction
  // Defaults to 'device' (accelerometer) for automatic real-time movement
  const egoMotion = useEgoMotion();
  const carRef = useRef(null);

  const onCreated = useCallback(({ gl, scene, camera }) => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type    = 2; // PCFSoftShadowMap
    
    // Diagnostic: log the scene setup
    console.log('[Scene3D] Canvas initialized:', {
      renderer: !!gl,
      scene: !!scene,
      camera: !!camera,
      shadowMap: gl.shadowMap.enabled,
    });
    
    // Ensure initial camera position
    camera.position.set(0, 14, 28);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, []);

  // Add a DOM-based error catch for Three.js
  const onError = useCallback((e) => {
    console.error('[Scene3D] Canvas render error:', e);
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
        onError={onError}
      >
        <SceneContent
          detectedObjects={detectedObjects}
          egoMotion={egoMotion}
          carRef={carRef}
          egoPose={egoPose}
        />

        {showStats && <Stats />}
      </Canvas>

      <HudOverlay
        objectCount={detectedObjects.length}
        isLive={isLive}
        motionSource={egoMotion.motionSource}
      />
    </div>
  );
});

Scene3D.displayName = 'Scene3D';
