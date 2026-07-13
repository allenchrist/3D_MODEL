"""
------------------------------------------------------------
routes.py — API Route Definitions
------------------------------------------------------------
Project : Collaborative 3D Environmental Perception Framework
Author  : Allen Christ

Registers all REST endpoints on a FastAPI APIRouter.
Keeping routes in a separate module from server.py ensures
the application remains modular and easy to extend.

Current endpoints:
    GET /health       — Liveness check
    GET /detections   — Latest video detection results

Future endpoints (prepared, not yet implemented):
    GET  /detections/image   — Latest image detection results
    GET  /detections/live    — Real-time frame stream (SSE)
    POST /detections/run     — Trigger a new detection job
    GET  /scene              — Shared scene intelligence payload
    GET  /v2v/objects        — Collaborative V2V objects
    GET  /risk               — Risk prediction scores
------------------------------------------------------------
"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from .schemas import DetectionsResponse, FrameDetection, HealthResponse, LiveDetectionsResponse
from .store   import store

# ── Router instance ──────────────────────────────────────────
router = APIRouter()

# ── Path to the YOLO video detection output ──────────────────
# Resolved relative to this file so the server can be started
# from any working directory.
_AI_ROOT = Path(__file__).resolve().parent.parent
VIDEO_DETECTIONS_PATH: Path = _AI_ROOT / "output" / "json" / "video_detections.json"


# ── Helper ───────────────────────────────────────────────────
def _load_detections(path: Path) -> list:
    """
    Read and parse the detection JSON file from disk.

    Raises HTTPException 404 if the file does not exist yet
    (i.e. the detector has not been run), and 500 if the file
    content is malformed.

    Args:
        path: Absolute path to the JSON detection file.

    Returns:
        Parsed list of frame detection dicts.
    """
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Detection file not found at '{path}'. "
                "Run the YOLO detector first: python main.py"
            ),
        )

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection file is not valid JSON: {exc}",
        ) from exc


# ── GET /health ──────────────────────────────────────────────
@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness check",
    tags=["System"],
)
def health_check() -> HealthResponse:
    """
    Returns a simple OK response to confirm the API is running.
    Used by the frontend connection status indicator and
    future load-balancer health probes.
    """
    return HealthResponse(status="ok", service="Perception API")


# ── GET /detections/live ─────────────────────────────────────
@router.get(
    "/detections/live",
    response_model=LiveDetectionsResponse,
    summary="Get latest live webcam detections",
    tags=["Perception"],
)
def get_live_detections() -> LiveDetectionsResponse:
    """
    Returns the most recent frame from the in-memory DetectionStore.
    The webcam detector updates this ~20-30 times per second.
    React polls this endpoint to drive the live 3D scene.
    """
    data = store.latest()
    print(f"[DEBUG] /detections/live | frame={data['frame']} | objects={len(data['objects'])}")
    print(f"[DEBUG] Response: {data}")
    return LiveDetectionsResponse(
        frame=data["frame"],
        frame_w=data["frame_w"],
        frame_h=data["frame_h"],
        objects=data["objects"],
    )


# ── GET /detections ──────────────────────────────────────────
@router.get(
    "/detections",
    response_model=DetectionsResponse,
    summary="Get latest video detection results",
    tags=["Perception"],
)
def get_detections() -> DetectionsResponse:
    """
    Read the latest YOLO video detection results from disk and
    return them as a structured JSON response.

    The frontend calls this endpoint to populate the 3D scene
    and the Object Panel with real perception data.

    Returns:
        DetectionsResponse containing all frame detections,
        total frame count, total detection count, and source path.

    Raises:
        404 — Detection file has not been generated yet.
        500 — Detection file exists but contains invalid JSON.
    """
    raw_frames: list = _load_detections(VIDEO_DETECTIONS_PATH)

    # Validate each frame through the Pydantic schema.
    # This ensures the frontend always receives well-typed data
    # even if the detector output format changes in future.
    validated_frames = [FrameDetection(**frame) for frame in raw_frames]

    # Compute aggregate statistics for the response envelope
    total_detections = sum(len(f.objects) for f in validated_frames)

    return DetectionsResponse(
        source=str(VIDEO_DETECTIONS_PATH),
        total_frames=len(validated_frames),
        total_detections=total_detections,
        frames=validated_frames,
    )
