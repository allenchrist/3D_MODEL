# TODO: Fix Road Disappearing Issue

## Root Causes Identified
1. Car can drive infinitely - no automatic position reset
2. Camera follows car away from static road at origin
3. Fog too aggressive for large road
4. Shadow camera bounds too tight
5. Ground/road sizes insufficient

## Implementation Plan

### ✅ Done - Previously Implemented
- [x] Road.jsx: ROAD_LENGTH 300→500, ROAD_WIDTH 14→30, exported ROAD_BOUNDS
- [x] Ground.jsx: GROUND_SIZE 300→600, GRID_DIVS 60→120
- [x] Environment.jsx: Fog (40,130)→(80,350)
- [x] Lighting.jsx: Shadow camera (-60,60)→(-200,200), far 200→500, map 2048→4096
- [x] useEgoMotion.js: Added ROAD_BOUNDS constants, clampPosition() called at end of updatePosition()
- [x] EgoVehicle.jsx: Added ROAD_BOUNDS, clamp on target position + final smooth position + VO pose
- [x] CameraController.jsx: MAX_CAMERA_DISTANCE_FROM_ORIGIN=180, ORIGIN_PULLBACK_THRESHOLD=120

### ✅ Completed - All Fixes Verified
- [x] **useEgoMotion.js: Add AUTO-RESET when position exceeds safe distance**
  - Added SAFE_DISTANCE_FROM_ORIGIN=40, RESET_LERP_SPEED=0.08
  - In clampPosition(): if distance > 40, smooth lerp back to origin
  - If distance > 60 (1.5x), hard reset to origin + reset rotation
- [x] **EgoVehicle.jsx: Add auto-reset trigger**
  - Added AUTO_RESET_DISTANCE=45, RESET_LERP=0.06
  - Check distance from origin at start of every useFrame
  - If >45, smooth slide back; if >67.5, hard reset + sync position/rotation refs
- [x] **CameraController.jsx: Strengthen origin lock**
  - Hard limit: camera NEVER exceeds 150 units from origin
  - Pullback threshold reduced from 120 to 60 units
  - When car >120 units (0.8*150), camera looks at origin directly
  - When car 60-120 units, camera blends look-at between car and origin
- [x] **Road.jsx** - Already had ROAD_LENGTH=500, ROAD_WIDTH=30, exported ROAD_BOUNDS
- [x] **Ground.jsx** - Already had GROUND_SIZE=600, GRID_DIVS=120
- [x] **Environment.jsx** - Already had fog (80, 350)
- [x] **Lighting.jsx** - Already had expanded shadow camera bounds

- [x] **CameraController.jsx**: Added type guard `isValidCar` check — prevents `getWorldPosition is not a function` crash
- [x] **EgoVehicle.jsx**: Added `useCallback` import + callback ref pattern — ensures Three.js group is properly exposed

## Progress
- Previous implementation: Good position clamping within road bounds
- Missing piece: No automatic behavior to bring car/camera back to road center
- This means car CAN still reach road edge and stop, but if VO pushes beyond, road disappears

## Final Solution
Add **AUTO-RESET** mechanism:
1. When car exceeds 45 units from origin → smoothly slide back toward origin
2. Camera always within 150 units of origin → road always visible
3. Fog and shadows properly configured for large road
4. Position clamped to road bounds as last safety net
