/**
 * socket.js — Socket.IO client service layer.
 * Prepared for real-time integration with the Python perception backend.
 *
 * Event channels are designed to receive:
 *   - Live YOLO detection frames
 *   - ByteTrack trajectory updates
 *   - V2V collaborative object broadcasts
 *   - Shared scene intelligence updates
 *   - Risk prediction alerts
 *   - Sensor health events
 *   - Vehicle telemetry streams
 *
 * Usage (future):
 *   import { socketService } from './socket';
 *   socketService.connect();
 *   socketService.on(SOCKET_EVENTS.DETECTIONS, handler);
 */
import { io } from 'socket.io-client';

/* ── Configuration ──────────────────────────────────────────── */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8000';

const SOCKET_OPTIONS = {
  autoConnect:       false,   // Manual connect for controlled lifecycle
  reconnection:      true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  transports:        ['websocket'],
};

/* ── Event channel constants ────────────────────────────────── */
export const SOCKET_EVENTS = {
  // Connection lifecycle
  CONNECT:          'connect',
  DISCONNECT:       'disconnect',
  CONNECT_ERROR:    'connect_error',

  // Perception data streams
  DETECTIONS:       'perception:detections',
  DEPTH_MAP:        'perception:depth',
  RISK_SCORES:      'perception:risk',
  SCENE_UPDATE:     'perception:scene',

  // V2V collaborative perception
  V2V_OBJECTS:      'v2v:objects',
  V2V_STATUS:       'v2v:status',
  V2V_PEER_JOIN:    'v2v:peer_join',
  V2V_PEER_LEAVE:   'v2v:peer_leave',

  // Vehicle telemetry
  TELEMETRY:        'vehicle:telemetry',
  SENSOR_STATUS:    'vehicle:sensors',

  // Alerts
  RISK_ALERT:       'alert:risk',
  SYSTEM_ALERT:     'alert:system',
};

/* ── Socket service ─────────────────────────────────────────── */
class SocketService {
  constructor() {
    this._socket = null;
    this._listeners = new Map();
  }

  /** Initialize and connect the socket */
  connect() {
    if (this._socket?.connected) return;

    this._socket = io(SOCKET_URL, SOCKET_OPTIONS);

    this._socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.info('[Socket] Connected to perception backend');
    });

    this._socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this._socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    this._socket.connect();
  }

  /** Disconnect and clean up */
  disconnect() {
    if (!this._socket) return;
    this._socket.disconnect();
    this._socket = null;
    this._listeners.clear();
  }

  /** Subscribe to a socket event */
  on(event, handler) {
    if (!this._socket) return;
    this._socket.on(event, handler);
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
  }

  /** Unsubscribe from a socket event */
  off(event, handler) {
    if (!this._socket) return;
    this._socket.off(event, handler);
  }

  /** Emit an event to the backend */
  emit(event, payload) {
    if (!this._socket?.connected) {
      console.warn('[Socket] Cannot emit — not connected');
      return;
    }
    this._socket.emit(event, payload);
  }

  /** Check connection state */
  get isConnected() {
    return this._socket?.connected ?? false;
  }
}

// Singleton instance — shared across the application
export const socketService = new SocketService();
