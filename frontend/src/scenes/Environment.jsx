import { memo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const BG_COLOR  = new THREE.Color('#0B0F14');
const FOG       = new THREE.Fog('#0B0F14', 40, 130);

export const Environment = memo(() => {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = BG_COLOR;
    scene.fog        = FOG;
    // No cleanup — these should persist for the lifetime of the canvas
  }, [scene]);

  return null;
});

Environment.displayName = 'Environment';
