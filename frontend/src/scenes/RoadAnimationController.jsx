﻿import React, { memo } from 'react';
import { Road }   from './Road';
import { Ground } from './Ground';

/**
 * RoadAnimationController
 *
 * Renders a completely STATIC road and ground with no texture scrolling.
 * The ego vehicle moves in world space on this static road, driven by
 * camera motion estimation (visual odometry / optical flow).
 *
 * Previously this component scrolled road textures to simulate movement,
 * but the requirement now is that the road stays fixed while the
 * ego vehicle (laptop/camera) moves through the world.
 *
 * World elements remain fixed:
 *  - Road, lane markings, ground grid
 *  - All static environment elements
 *
 * Dynamic elements (perception objects) continue to update independently.
 */
export const RoadAnimationController = memo(({ children }) => {
  return (
    <group name="road-animation-controller">
      <Ground />
      <Road />
      {children}
    </group>
  );
});

