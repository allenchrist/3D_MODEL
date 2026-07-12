from ultralytics import YOLO
import cv2
import json
import os


class VideoDetector:

    def __init__(self, model_path="yolo11n.pt"):
        self.model = YOLO(model_path)

    def detect(self, input_video, output_video, output_json):

        cap = cv2.VideoCapture(input_video)

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))

        all_frames = []
        frame_number = 0

        while True:

            ret, frame = cap.read()

            if not ret:
                break

            frame_number += 1

            results = self.model(frame, conf=0.25)

            annotated = results[0].plot()

            out.write(annotated)

            frame_objects = []

            for box in results[0].boxes:

                cls = int(box.cls[0])

                confidence = float(box.conf[0])

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                frame_objects.append({
                    "class": self.model.names[cls],
                    "confidence": round(confidence, 3),
                    "bbox": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                })

            all_frames.append({
                "frame": frame_number,
                "objects": frame_objects
            })

            print(f"Processed Frame {frame_number}")

        cap.release()
        out.release()

        os.makedirs(os.path.dirname(output_json), exist_ok=True)

        with open(output_json, "w") as f:
            json.dump(all_frames, f, indent=4)

        print("\nVideo Processing Completed.")