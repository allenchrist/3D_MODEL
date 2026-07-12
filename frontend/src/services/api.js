/**
 * api.js — REST API service layer.
 * Prepared for future integration with the Python perception backend.
 *
 * Endpoints are designed to receive:
 *   - YOLO detection results
 *   - MiDaS depth estimation
 *   - ByteTrack tracking data
 *   - Shared scene intelligence payloads
 *   - V2V collaborative perception data
 *   - Risk prediction scores
 *   - Vehicle telemetry
 */
import axios from 'axios';

/* ── Base configuration ─────────────────────────────────────── */
const BASE_URL     = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_TIMEOUT  = 8000;
const API_VERSION  = '/api/v1';

const apiClient = axios.create({
  baseURL: `${BASE_URL}${API_VERSION}`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

/* ── Request interceptor (future: attach auth token) ────────── */
apiClient.interceptors.request.use(
  (config) => {
    // Future: config.headers.Authorization = `Bearer ${getToken()}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor (future: global error handling) ───── */
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? 'API error';
    return Promise.reject(new Error(message));
  }
);

/* ── Perception endpoints ───────────────────────────────────── */
export const perceptionApi = {
  /** Fetch latest YOLO + ByteTrack detection frame */
  getDetections:    () => apiClient.get('/perception/detections'),

  /** Fetch MiDaS depth estimation for current frame */
  getDepthMap:      () => apiClient.get('/perception/depth'),

  /** Fetch risk prediction scores for detected objects */
  getRiskScores:    () => apiClient.get('/perception/risk'),

  /** Fetch full shared scene intelligence payload */
  getSharedScene:   () => apiClient.get('/perception/scene'),
};

/* ── Vehicle endpoints ──────────────────────────────────────── */
export const vehicleApi = {
  /** Fetch ego vehicle telemetry (speed, GPS, heading) */
  getTelemetry:     () => apiClient.get('/vehicle/telemetry'),

  /** Fetch sensor health status */
  getSensorStatus:  () => apiClient.get('/vehicle/sensors'),
};

/* ── V2V / Collaborative endpoints ─────────────────────────── */
export const v2vApi = {
  /** Fetch collaborative objects shared by peer vehicles */
  getCollaborativeObjects: () => apiClient.get('/v2v/objects'),

  /** Fetch V2V network status and peer list */
  getNetworkStatus:        () => apiClient.get('/v2v/status'),

  /** Post ego vehicle's perception data to the shared scene */
  publishPerception: (payload) => apiClient.post('/v2v/publish', payload),
};

/* ── Analytics endpoints ────────────────────────────────────── */
export const analyticsApi = {
  /** Fetch historical detection statistics */
  getHistory:       (params) => apiClient.get('/analytics/history', { params }),

  /** Fetch aggregated scene intelligence metrics */
  getMetrics:       () => apiClient.get('/analytics/metrics'),
};

export default apiClient;
