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

    def update(self, objects: List[Dict[str, Any]], frame: int, frame_w: int = 640, frame_h: int = 480) -> None:
        with self._lock:
            self._objects  = objects
            self._frame    = frame
            self._frame_w  = frame_w
            self._frame_h  = frame_h
        print(f"[DEBUG] Store Updated | Frame: {frame} | Objects: {len(objects)} | Resolution: {frame_w}x{frame_h}")

    def latest(self) -> Dict[str, Any]:
        print("[DEBUG] FastAPI requested latest detections")
        with self._lock:
            return {
                "frame":    self._frame,
                "objects":  list(self._objects),
                "frame_w":  self._frame_w,
                "frame_h":  self._frame_h,
            }


# Module-level singleton — imported by both webcam_detector and routes
store = DetectionStore()
