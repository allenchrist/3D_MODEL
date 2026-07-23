import React, { memo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Road }   from './Road';
import { Ground } from './Ground';

/**
 * RoadAnimationController
 *
 * Moves the road inversely to camera displacement from initial position.
 *
 * How it works:
 *  - On the very first frame, records camera start position.
 *  - Each frame, computes the difference between current camera and start position.
 *  - Translates the road group by the NEGATIVE of this displacement.
 *  - When the camera stops, displacement stops changing → road stops immediately.
 *  - Only operates in the XZ plane (ignores vertical camera changes).
 *
 * Render order dependency:
 *  - Must be mounted AFTER CameraController (OrbitControls) in the component tree.
 *  - OrbitControls uses useFrame(priority 0), we use useFrame(priority 0).
 *  - Same-priority callbacks execute in insertion order; since OrbitControls
 *    is mounted first, its callback runs first, updating the camera position
 *    before our callback reads it.
 *
 * Future extensibility:
 *  - The displacement source can be replaced with real motion data
 *    (speed, odometry, GPS, IMU, V2V) by providing a custom motionSource function.
 */
export const RoadAnimationController = memo(({
  children,
}) => {
  const { camera } = useThree();
  const groupRef   = useRef(null);
  const initCam    = useRef(new THREE.Vector3());
  const initRoad   = useRef(new THREE.Vector3());
  const ready      = useRef(false);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    if (!ready.current) {
      initCam.current.copy(camera.position);
      initRoad.current.copy(group.position);
      ready.current = true;
      return;
    }

    // Camera displacement from initial position
    const dx = camera.position.x - initCam.current.x;
    const dz = camera.position.z - initCam.current.z;

    // Only respond if displacement is meaningful (avoid floating-point jitter)
    if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) return;

    // Road moves inversely to camera: road = initialRoadPos - cameraDisplacement
    group.position.x = initRoad.current.x - dx;
    group.position.z = initRoad.current.z - dz;
  });

  return (
    <group ref={groupRef} name="road-animation-controller">
      {children ?? (
        <>
          <Ground />
          <Road />
        </>
      )}
    </group>
  );
});

RoadAnimationController.displayName = 'RoadAnimationController';
