/**
 * VehicleShapes — Registry of code-generated 3D vehicle shapes.
 *
 * Each shape is a React component built entirely from Three.js primitives
 * (boxes, cylinders, spheres) — no external GLB files needed.
 *
 * Benefits:
 *   - Zero loading time
 *   - No GLB cloning bugs
 *   - Unlimited instances
 *   - Very fast rendering
 *   - Fully customizable
 */
import Car from './Car';
import Bus from './Bus';
import Truck from './Truck';
import Motorcycle from './Motorcycle';
import Pedestrian from './Pedestrian';

/**
 * Shape registry — maps YOLO detection types to their 3D components.
 *
 * Each entry has:
 *   - Component: The React component to render
 *   - scale:     Base scale factor (applied on top of bbox-derived size)
 *   - rotY:      Y-axis rotation offset (radians)
 */
export const SHAPE_REGISTRY = {
  Car:        { Component: Car,        scale: 0.8, rotY: 0 },
  Truck:      { Component: Truck,      scale: 1.5, rotY: 0 },
  Bus:        { Component: Bus,        scale: 2.0, rotY: 0 },
  Pedestrian: { Component: Pedestrian, scale: 0.4, rotY: 0 },
  Motorcycle: { Component: Motorcycle, scale: 0.6, rotY: 0 },
  Cyclist:    { Component: Motorcycle, scale: 0.5, rotY: 0 },
};

export const DEFAULT_SHAPE = { Component: Car, scale: 1.0, rotY: 0 };

export { Car, Bus, Truck, Motorcycle, Pedestrian };
