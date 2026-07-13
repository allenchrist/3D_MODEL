# 3D Models

Drop your `.glb` files here. Vite serves this folder at `/models/*.glb`.

## Required files

| File               | Class in YOLO     | Scale |
|--------------------|-------------------|-------|
| car.glb            | car               | 0.8   |
| truck.glb          | truck             | 1.5   |
| bus.glb            | bus               | 2.0   |
| person.glb         | person            | 0.4   |
| motorcycle.glb     | motorcycle        | 0.6   |
| traffic_light.glb  | traffic light     | 0.5   |

## Free GLB sources

- https://sketchfab.com  (filter: downloadable, glTF)
- https://market.pmnd.rs (React Three Fiber community assets)
- https://poly.pizza     (low-poly, free)

## Notes

- Keep poly count low (< 10k triangles per model) for real-time performance.
- Models are placed with Y = half their estimated height so the base sits on the road.
- Rotation Y = 0 means the model faces +Z (away from camera). Adjust `rotY` in
  `ModelManager.jsx → MODEL_CONFIG` per model if it faces the wrong direction.
- If a GLB is missing the scene falls back to a wireframe bounding box automatically.
