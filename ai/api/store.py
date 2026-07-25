"""
store.py — In-memory detection store.

webcam_detector  →  store.update(objects)
FastAPI          ←  store.latest()

Thread-safe: webcam thread writes, uvicorn worker threads read.
"""

import threading
from typing import List, Dict, Any


class DetectionStore:
    def __init__(self) -> None:
        self._lock    = threading.Lock()
        self._objects: List[Dict[str, Any]] = []
        self._frame:   int = 0
        self._frame_w: int = 640
        self._frame_h: int = 480
        self._ego_vehicle: Dict[str, Any] = {"x": 0.0, "y": 0.0, "z": 0.0, "yaw": 0.0}

    def update(
        self,
        objects: List[Dict[str, Any]],
        frame: int,
        frame_w: int = 640,
        frame_h: int = 480,
        ego_vehicle: Dict[str, Any] | None = None,
    ) -> None:
        with self._lock:
            self._objects  = objects
            self._frame    = frame
            self._frame_w  = frame_w
            self._frame_h  = frame_h
            if ego_vehicle is not None:
                self._ego_vehicle = {
                    "x": float(ego_vehicle.get("x", 0.0)),
                    "y": float(ego_vehicle.get("y", 0.0)),
                    "z": float(ego_vehicle.get("z", 0.0)),
                    "yaw": float(ego_vehicle.get("yaw", 0.0)),
                }
        print(
            f"[DEBUG] Store Updated | Frame: {frame} | Objects: {len(objects)} "
            f"| Ego: {self._ego_vehicle} | Resolution: {frame_w}x{frame_h}"
        )

    def latest(self) -> Dict[str, Any]:
        print("[DEBUG] FastAPI requested latest detections")
        with self._lock:
            return {
                "frame":    self._frame,
                "objects":  list(self._objects),
                "frame_w":  self._frame_w,
                "frame_h":  self._frame_h,
                "ego_vehicle": dict(self._ego_vehicle),
            }


# Module-level singleton — imported by both webcam_detector and routes
store = DetectionStore()
