/**
 * useCameraMotion — Camera-based motion estimation for ego vehicle movement.
 *
 * Estimates camera motion using webcam video frames and optical flow analysis.
 * This is the primary motion source for detecting laptop movement in the real world.
 *
 * How it works:
 *   1. Accesses the laptop's webcam via getUserMedia
 *   2. Captures sequential video frames
 *   3. Tracks feature points between frames using optical flow
 *   4. Estimates camera translation/rotation from flow vectors
 *   5. Outputs velocity {x, z} for the ego vehicle
 *
 * Architecture:
 *   - Designed as a pluggable motion source for useEgoMotion
 *   - Uses off-screen canvas for frame processing
 *   - Feature tracking via Lucas-Kanade optical flow (simplified)
 *   - Future: replace with full visual odometry pipeline
 *     (e.g., OpenCV.js, ORB-SLAM, or TensorFlow.js PoseNet)
 *
 * Fallback behavior:
 *   - If webcam is unavailable, falls back to simulated motion
 *   - Can be toggled via setMotionSource('simulated')
 *
 * @returns {{
 *   velocityRef: React.MutableRefObject<{x: number, z: number}>,
 *   isActive: boolean,
 *   error: string|null,
 *   start: () => Promise<void>,
 *   stop: () => void,
 *   requestPermission: () => Promise<boolean>,
 * }}
 */
import { useState, useRef, useCallback, useEffect } from 'react';

/* ── Configuration ──────────────────────────────────────────── */
const CONFIG = {
  // Camera constraints
  CAMERA_WIDTH: 640,
  CAMERA_HEIGHT: 480,
  CAMERA_FPS: 30,

  // Optical flow settings
  FLOW_WINDOW_SIZE: 15,       // Lucas-Kanade window size
  FLOW_MAX_POINTS: 100,       // Max feature points to track
  FLOW_QUALITY_LEVEL: 0.01,   // Shi-Tomasi corner quality
  FLOW_MIN_DISTANCE: 10,      // Min distance between feature points

  // Motion estimation
  MOTION_SMOOTHING: 0.85,     // Exponential smoothing factor
  MOTION_THRESHOLD: 0.5,      // Minimum motion to register (pixels)
  MOTION_SCALE: 0.02,         // Pixels to world units conversion

  // Processing
  PROCESS_INTERVAL: 33,       // ms between frame processing (~30fps)
};

/* ── Image processing utilities ─────────────────────────────── */

/**
 * Convert canvas ImageData to grayscale Uint8Array.
 */
function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  return gray;
}

/**
 * Compute image gradient (Sobel approximation) at a point.
 */
function getGradient(gray, x, y, width) {
  const idx = y * width + x;
  const gx = (gray[idx + 1] - gray[idx - 1]) / 2;
  const gy = (gray[idx + width] - gray[idx - width]) / 2;
  return { gx, gy };
}

/**
 * Detect good features to track (Shi-Tomasi corners).
 * Simplified version — picks edges/high-contrast regions.
 */
function detectFeatures(gray, width, height, maxPoints = CONFIG.FLOW_MAX_POINTS) {
  const features = [];
  const minDist = CONFIG.FLOW_MIN_DISTANCE;
  const gridSize = Math.max(8, Math.floor(Math.sqrt((width * height) / maxPoints)));

  // Compute corner response (simplified Harris)
  for (let y = gridSize; y < height - gridSize; y += gridSize) {
    for (let x = gridSize; x < width - gridSize; x += gridSize) {
      let ix = 0, iy = 0, ixy = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const g = getGradient(gray, x + dx, y + dy, width);
          ix += g.gx * g.gx;
          iy += g.gy * g.gy;
          ixy += g.gx * g.gy;
          count++;
        }
      }

      if (count > 0) {
        ix /= count;
        iy /= count;
        ixy /= count;
      }

      const trace = ix + iy;
      const det = ix * iy - ixy * ixy;
      const response = det - 0.04 * trace * trace; // Harris response

      if (response > CONFIG.FLOW_QUALITY_LEVEL) {
        features.push({ x, y, response });
      }
    }
  }

  // Sort by response and take top N with minimum distance
  features.sort((a, b) => b.response - a.response);
  const selected = [];
  for (const f of features) {
    let tooClose = false;
    for (const s of selected) {
      const dx = f.x - s.x;
      const dy = f.y - s.y;
      if (dx * dx + dy * dy < minDist * minDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) selected.push(f);
    if (selected.length >= maxPoints) break;
  }

  return selected.map(f => ({ x: f.x, y: f.y }));
}

/**
 * Lucas-Kanade optical flow for a single point.
 * Searches for best match in small window.
 */
function trackPoint(prevGray, currGray, px, py, width, height) {
  const winSize = CONFIG.FLOW_WINDOW_SIZE;
  const halfWin = Math.floor(winSize / 2);
  let bestDx = 0, bestDy = 0;
  let bestError = Infinity;

  // Search in a small neighborhood
  const searchRadius = 3;
  for (let dy = -searchRadius; dy <= searchRadius; dy++) {
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      let error = 0;
      let count = 0;

      for (let wy = -halfWin; wy <= halfWin; wy++) {
        for (let wx = -halfWin; wx <= halfWin; wx++) {
          const prevX = Math.round(px + wx);
          const prevY = Math.round(py + wy);
          const currX = Math.round(px + dx + wx);
          const currY = Math.round(py + dy + wy);

          if (prevX >= 0 && prevX < width && prevY >= 0 && prevY < height &&
              currX >= 0 && currX < width && currY >= 0 && currY < height) {
            const diff = prevGray[prevY * width + prevX] - currGray[currY * width + currX];
            error += diff * diff;
            count++;
          }
        }
      }

      if (count > 0) {
        error /= count;
        if (error < bestError) {
          bestError = error;
          bestDx = dx;
          bestDy = dy;
        }
      }
    }
  }

  return { dx: bestDx, dy: bestDy, error: bestError };
}

/* ── useCameraMotion hook ───────────────────────────────────── */
export function useCameraMotion() {
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const velocityRef = useRef({ x: 0, z: 0 });
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevGrayRef = useRef(null);
  const prevFeaturesRef = useRef([]);
  const processTimerRef = useRef(null);
  const smoothedVelocityRef = useRef({ x: 0, z: 0 });

  // Flag to track if component is mounted
  const mountedRef = useRef(true);

  /**
   * Initialize camera and processing pipeline.
   */
  const initialize = useCallback(async () => {
    try {
      // Clean up any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CONFIG.CAMERA_WIDTH },
          height: { ideal: CONFIG.CAMERA_HEIGHT },
          frameRate: { ideal: CONFIG.CAMERA_FPS },
          facingMode: 'environment', // Use back camera if available (laptop = user-facing)
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      // Create hidden video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      videoRef.current = video;

      // Create off-screen canvas for frame processing
      const canvas = document.createElement('canvas');
      canvas.width = CONFIG.CAMERA_WIDTH;
      canvas.height = CONFIG.CAMERA_HEIGHT;
      canvasRef.current = canvas;

      setIsInitialized(true);
      setCameraReady(true);
      setError(null);

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
        // If already loaded
        if (video.readyState >= 2) resolve();
      });
    } catch (err) {
      if (mountedRef.current) {
        setError(`Camera access failed: ${err.message}`);
        console.warn('useCameraMotion: Camera not available, falling back to simulated motion.', err.message);
      }
    }
  }, []);

  /**
   * Process a single video frame to estimate motion.
   */
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !videoRef.current.readyState >= 2) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Convert to grayscale
    const currGray = toGrayscale(imageData);

    // If we have previous frame features, track them
    if (prevGrayRef.current && prevFeaturesRef.current.length > 0) {
      const features = prevFeaturesRef.current;
      let totalDx = 0, totalDy = 0;
      let trackedCount = 0;

      for (const f of features) {
        const result = trackPoint(
          prevGrayRef.current, currGray,
          f.x, f.y,
          canvas.width, canvas.height
        );

        if (result.error < 100) { // Reasonable match
          totalDx += result.dx;
          totalDy += result.dy;
          trackedCount++;
        }
      }

      if (trackedCount > 0) {
        const avgDx = totalDx / trackedCount;
        const avgDy = totalDy / trackedCount;

        // Filter out noise
        const motionMagnitude = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
        if (motionMagnitude > CONFIG.MOTION_THRESHOLD) {
          // Map optical flow to vehicle velocity:
          // - Horizontal flow (dx) → lateral movement (x)
          // - Vertical flow (dy) → forward/backward movement (z)
          // Invert: moving camera forward = flow expanding outward
          const rawVx = avgDx * CONFIG.MOTION_SCALE;
          const rawVz = -avgDy * CONFIG.MOTION_SCALE;

          // Exponential smoothing
          const smooth = CONFIG.MOTION_SMOOTHING;
          smoothedVelocityRef.current = {
            x: smoothedVelocityRef.current.x * smooth + rawVx * (1 - smooth),
            z: smoothedVelocityRef.current.z * smooth + rawVz * (1 - smooth),
          };

          // Clamp velocities
          const maxVel = 1.0;
          smoothedVelocityRef.current.x = Math.max(-maxVel, Math.min(maxVel, smoothedVelocityRef.current.x));
          smoothedVelocityRef.current.z = Math.max(-maxVel, Math.min(maxVel, smoothedVelocityRef.current.z));

          velocityRef.current = { ...smoothedVelocityRef.current };
        } else {
          // No significant motion → zero velocity
          smoothedVelocityRef.current.x *= 0.9;
          smoothedVelocityRef.current.z *= 0.9;

          if (Math.abs(smoothedVelocityRef.current.x) < 0.01 &&
              Math.abs(smoothedVelocityRef.current.z) < 0.01) {
            velocityRef.current = { x: 0, z: 0 };
            smoothedVelocityRef.current = { x: 0, z: 0 };
          } else {
            velocityRef.current = { ...smoothedVelocityRef.current };
          }
        }
      }
    }

    // Detect new features in current frame
    prevFeaturesRef.current = detectFeatures(currGray, canvas.width, canvas.height);
    prevGrayRef.current = currGray;
  }, []);

  /**
   * Start motion estimation.
   */
  const start = useCallback(async () => {
    if (isActive) return;

    try {
      await initialize();
      setIsActive(true);

      // Start periodic frame processing
      processTimerRef.current = setInterval(processFrame, CONFIG.PROCESS_INTERVAL);
    } catch (err) {
      setError(`Failed to start camera motion: ${err.message}`);
    }
  }, [isActive, initialize, processFrame]);

  /**
   * Stop motion estimation.
   */
  const stop = useCallback(() => {
    setIsActive(false);

    // Clear processing timer
    if (processTimerRef.current) {
      clearInterval(processTimerRef.current);
      processTimerRef.current = null;
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Clean up video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    // Reset processing state
    prevGrayRef.current = null;
    prevFeaturesRef.current = [];
    smoothedVelocityRef.current = { x: 0, z: 0 };
    velocityRef.current = { x: 0, z: 0 };
    setCameraReady(false);
    setIsInitialized(false);
  }, []);

  /**
   * Request camera permission (iOS 13+ / modern browsers).
   */
  const requestPermission = useCallback(async () => {
    try {
      // Modern browsers support navigator.mediaDevices.getUserMedia
      // which implicitly requests permission
      if (navigator.mediaDevices?.getUserMedia) {
        return true;
      }
      throw new Error('getUserMedia not supported');
    } catch (err) {
      setError(`Camera permission error: ${err.message}`);
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  return {
    velocityRef,
    isActive,
    error,
    isInitialized,
    cameraReady,
    start,
    stop,
    requestPermission,
  };
}

export default useCameraMotion;
