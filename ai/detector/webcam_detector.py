"""
webcam_detector.py — Live webcam perception.

Opens the default camera (index 0), runs YOLO on every frame,
and pushes detections into the shared DetectionStore.

The loop runs forever in a daemon thread started by server.py.
Stop it by setting the stop_event.

Usage (standalone test):
    cd ai
    python -m detector.webcam_detector
"""

import threading
import cv2
from ultralytics import YOLO


class WebcamDetector:
    def __init__(self, model_path: str = "yolo11n.pt", camera_index: int = 0) -> None:
        print(f"[DEBUG] Loading YOLO model: {model_path}")
        self.model        = YOLO(model_path)
        print("[DEBUG] YOLO model loaded")
        self.camera_index = camera_index
        self._thread: threading.Thread | None = None
        self._stop        = threading.Event()

    # ── Public API ───────────────────────────────────────────
    def start(self, store) -> None:
        """Start detection loop in a daemon thread."""
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop,
            args=(store,),
            daemon=True,
            name="webcam-detector",
        )
        self._thread.start()
        print("[WebcamDetector] started")

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3)
        print("[WebcamDetector] stopped")

    # ── Detection loop ───────────────────────────────────────
    def _loop(self, store) -> None:
        import time
        print("[DEBUG] Opening webcam...")
        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            print("[DEBUG] ERROR: Cannot open webcam")
            return

        w_cap = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h_cap = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"[DEBUG] Webcam opened successfully — resolution: {w_cap} x {h_cap}")

        frame_number = 0

        while not self._stop.is_set():
            ret, frame = cap.read()
            if not ret:
                print("[WebcamDetector] frame read failed — retrying")
                continue

            frame_number += 1
            print(f"[DEBUG] Frame {frame_number}")

            h, w = frame.shape[:2]

            t0 = time.perf_counter()
            results = self.model(frame, conf=0.25, verbose=False)
            inference_ms = (time.perf_counter() - t0) * 1000
            print(f"[DEBUG] YOLO inference completed — {inference_ms:.1f} ms")

            objects = []
            for box in results[0].boxes:
                cls        = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                objects.append({
                    "class":      self.model.names[cls],
                    "confidence": round(confidence, 3),
                    "bbox": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2),
                    },
                })

            print(f"[DEBUG] Objects detected: {len(objects)}")
            if objects:
                print("[DEBUG] Detected:")
                for obj in objects:
                    print(f"         {obj['class']}  conf={obj['confidence']}")

            store.update(objects, frame_number, frame_w=w, frame_h=h)
            print("[DEBUG] DetectionStore updated")

        cap.release()


# ── Standalone test ──────────────────────────────────────────
if __name__ == "__main__":
    import time
    import sys
    sys.path.insert(0, ".")          # run from ai/
    from api.store import store as _store

    detector = WebcamDetector()
    detector.start(_store)

    try:
        while True:
            data = _store.latest()
            print(f"frame={data['frame']}  objects={len(data['objects'])}")
            time.sleep(0.5)
    except KeyboardInterrupt:
        detector.stop()
