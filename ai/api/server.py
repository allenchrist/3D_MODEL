"""
------------------------------------------------------------
server.py — FastAPI Application Factory
------------------------------------------------------------
Project : Collaborative 3D Environmental Perception Framework
Author  : Allen Christ

Creates and configures the FastAPI application instance.
This module is the entry point for uvicorn:

    uvicorn api.server:app --reload

Responsibilities:
    - Instantiate the FastAPI app with metadata
    - Register CORS middleware for the React frontend
    - Mount the API router
    - Expose the app object for uvicorn

Architecture note:
    All route logic lives in routes.py.
    All data models live in schemas.py.
    This file only wires them together — keeping concerns separated
    so future modules (WebSocket, auth, rate-limiting) can be added
    without touching route or schema code.
------------------------------------------------------------
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router
from .store  import store
from detector.webcam_detector import WebcamDetector

_webcam: WebcamDetector | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _webcam
    print("[DEBUG] Starting WebcamDetector")
    _webcam = WebcamDetector()
    _webcam.start(store)
    print(f"[DEBUG] WebcamDetector thread alive: {_webcam._thread.is_alive()}")
    yield
    _webcam.stop()
    print("[DEBUG] WebcamDetector stopped")

# ── Allowed origins ──────────────────────────────────────────
# The React dev server runs on port 5173 (Vite default).
# Add additional origins here when deploying to staging/production.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# ── Application factory ──────────────────────────────────────
def create_app() -> FastAPI:
    """
    Build and configure the FastAPI application.

    Separating construction into a factory function makes the app
    easy to test (instantiate a fresh app per test) and easy to
    extend with lifespan events, dependency injection, etc.

    Returns:
        Configured FastAPI instance ready for uvicorn.
    """
    application = FastAPI(
        title="Collaborative Perception API",
        description=(
            "REST API for the Collaborative 3D Environmental Perception Framework. "
            "Serves YOLO detection results to the React frontend and is designed "
            "to later integrate real-time Socket.IO, V2V communication, "
            "shared scene intelligence, and risk prediction."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────
    # Required so the React app (localhost:5173) can call this API
    # (localhost:8000) without browser cross-origin errors.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routes ───────────────────────────────────────────────
    # All endpoints are registered under the root prefix.
    # Future versioning: use prefix="/api/v1" here.
    application.include_router(router)

    return application


# ── Application instance ─────────────────────────────────────
# uvicorn imports this object directly:
#   uvicorn api.server:app --reload
app: FastAPI = create_app()
