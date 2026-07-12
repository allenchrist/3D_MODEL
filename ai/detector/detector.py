"""
------------------------------------------------------------
YOLO Detection Module
------------------------------------------------------------
Author  : Allen Christ
Project : Collaborative 3D Environmental Perception Framework

Responsibility:
    - Load YOLO model
    - Perform object detection
    - Save annotated image
    - Export detections as JSON
------------------------------------------------------------
"""

from ultralytics import YOLO
import json
import os


class YOLODetector:

    def __init__(self, model_path="yolo11n.pt"):
        """
        Initialize YOLO model
        """
        print("[INFO] Loading YOLO model...")
        self.model = YOLO(model_path)
        print("[SUCCESS] YOLO model loaded.\n")

    def detect(self, image_path, output_image_path, output_json_path):
        """
        Perform object detection
        """

        print(f"[INFO] Detecting objects in {image_path}")

        results = self.model(image_path)

        detections = []

        result = results[0]

        for box in result.boxes:

            cls = int(box.cls[0])

            confidence = float(box.conf[0])

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append(
                {
                    "class": self.model.names[cls],
                    "confidence": round(confidence, 3),
                    "bbox": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                }
            )

        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)

        with open(output_json_path, "w") as file:
            json.dump(detections, file, indent=4)

        print(f"[SUCCESS] JSON saved -> {output_json_path}")

        result.save(filename=output_image_path)

        print(f"[SUCCESS] Image saved -> {output_image_path}")

        print(f"[INFO] Objects detected : {len(detections)}")

        return detections