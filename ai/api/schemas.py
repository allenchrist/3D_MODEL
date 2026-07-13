"""
------------------------------------------------------------
schemas.py — Pydantic Data Models
------------------------------------------------------------
Project : Collaborative 3D Environmental Perception Framework
Author  : Allen Christ

Defines the request/response schemas for the API layer.
These models mirror the exact JSON structure produced by
VideoDetector and YOLODetector so the frontend receives
a fully typed, validated payload.

Future extensions:
    - Add schemas for real-time Socket.IO payloads
    - Add schemas for V2V collaborative perception objects
    - Add schemas for risk prediction scores
    - Add schemas for shared scene intelligence
------------------------------------------------------------
"""

from pydantic import BaseModel, Field
from typing import List


# ── Bounding Box ─────────────────────────────────────────────
class BoundingBox(BaseModel):
    """
    Pixel-space bounding box produced by YOLO.
    Coordinates are in (x1, y1) top-left → (x2, y2) bottom-right format.
    """
    x1: float = Field(..., description="Left edge of the bounding box (pixels)")
    y1: float = Field(..., description="Top edge of the bounding box (pixels)")
    x2: float = Field(..., description="Right edge of the bounding box (pixels)")
    y2: float = Field(..., description="Bottom edge of the bounding box (pixels)")


# ── Single Detection ─────────────────────────────────────────
class Detection(BaseModel):
    """
    A single object detection result from YOLO.
    Matches the structure written by both detector.py and video_detector.py.
    """
    cls: str = Field(..., alias="class", description="COCO class label (e.g. 'car', 'person')")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score [0, 1]")
    bbox: BoundingBox = Field(..., description="Bounding box coordinates in pixel space")

    class Config:
        # Allow population by field name AND alias ("class")
        populate_by_name = True


# ── Single Video Frame ───────────────────────────────────────
class FrameDetection(BaseModel):
    """
    All detections for a single video frame.
    Matches the per-frame structure written by VideoDetector.
    """
    frame: int = Field(..., ge=1, description="1-based frame index")
    objects: List[Detection] = Field(default_factory=list, description="Detected objects in this frame")


# ── API Response Wrapper ─────────────────────────────────────
class DetectionsResponse(BaseModel):
    """
    Top-level API response envelope for GET /detections.
    Wraps the raw frame list with metadata useful to the frontend.
    """
    source: str = Field(..., description="Path of the JSON file that was read")
    total_frames: int = Field(..., description="Total number of frames in the detection file")
    total_detections: int = Field(..., description="Total number of individual detections across all frames")
    frames: List[FrameDetection] = Field(..., description="Per-frame detection data")


# ── Live (webcam) response ──────────────────────────────────
class LiveDetectionsResponse(BaseModel):
    """
    Response schema for GET /detections/live.
    Returns the single latest frame from the webcam DetectionStore.
    """
    frame:   int             = Field(..., description="Monotonically increasing frame counter")
    frame_w: int             = Field(640, description="Webcam frame width in pixels")
    frame_h: int             = Field(480, description="Webcam frame height in pixels")
    objects: List[Detection] = Field(default_factory=list, description="Detected objects in the latest frame")


# ── Health Check Response ────────────────────────────────────
class HealthResponse(BaseModel):
    """
    Response schema for GET /health.
    Used by the frontend and monitoring tools to verify the API is alive.
    """
    status: str = Field(default="ok", description="Service health status")
    service: str = Field(default="Perception API", description="Service name")
