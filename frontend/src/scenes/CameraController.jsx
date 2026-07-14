import { memo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export const CameraController = memo(() => {
  const controlsRef = useRef(null);
  const { camera }  = useThree();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;   // run exactly once
    initialised.current = true;
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={5}
      maxDistance={120}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.05}
      panSpeed={0.8}
      rotateSpeed={0.6}
      zoomSpeed={1.0}
    />
  );
});

CameraController.displayName = 'CameraController';
