/**
 * Dashboard — Primary view of the Automotive Perception Platform.
 *
 * Layout: CSS Grid → Navbar / (Sidebar + Scene3D + ObjectPanel) / StatusBar
 *
 * Architecture:
 *   - All telemetry state lives here and flows down as props (single source of truth)
 *   - Scene3D is isolated — receives only perception props, never re-renders from UI state
 *   - Future: replace setInterval simulation with Socket.IO subscriptions via usePerceptionData
 */
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Navbar }       from '../components/Navbar';
import { Sidebar }      from '../components/Sidebar';
import { ObjectPanel }  from '../components/ObjectPanel';
import { StatusBar }    from '../components/StatusBar';
import { LoadingScreen } from '../components/LoadingScreen';
import { useSystemMetrics } from '../hooks/useSystemMetrics';
import { clamp }        from '../utils/perception';
import '../styles/dashboard.css';

// Lazy-load the 3D scene to avoid blocking initial paint
const Scene3D = lazy(() =>
  import('../scenes/Scene3D').then((m) => ({ default: m.Scene3D }))
);

/* ── Constants ──────────────────────────────────────────────── */
const TELEMETRY_INTERVAL_MS  = 650;
const TELEMETRY_INTERVAL_REDUCED = 1200;
const INITIAL_SPEED_KMH      = 41.2;
const INITIAL_LATENCY_MS     = 12;

const INITIAL_OBJECTS = [
  {
    id: 'car-01', type: 'Car', name: 'Car 01',
    distanceM: 24.6, speedMps: 8.3, direction: 'East',
    confidence: 0.93, status: 'Tracking',
  },
  {
    id: 'ped-01', type: 'Pedestrian', name: 'Pedestrian 01',
    distanceM: 12.1, speedMps: 1.4, direction: 'North',
    confidence: 0.88, status: 'Tracking',
  },
  {
    id: 'truck-01', type: 'Truck', name: 'Truck 01',
    distanceM: 48.7, speedMps: 6.1, direction: 'West',
    confidence: 0.84, status: 'Caution',
  },
  {
    id: 'cyc-01', type: 'Cyclist', name: 'Cyclist 01',
    distanceM: 31.2, speedMps: 4.2, direction: 'North-East',
    confidence: 0.79, status: 'Tracking',
  },
  {
    id: 'bus-01', type: 'Bus', name: 'Bus 01',
    distanceM: 67.4, speedMps: 7.8, direction: 'South',
    confidence: 0.91, status: 'Tracking',
  },
];

const NAV_ITEMS = [
  { key: 'Dashboard',  label: 'Dashboard',  icon: 'dashboard' },
  { key: 'Perception', label: 'Perception', icon: 'vision'    },
  { key: 'Vehicles',   label: 'Vehicles',   icon: 'vehicle'   },
  { key: 'Traffic',    label: 'Traffic',    icon: 'traffic'   },
  { key: 'Analytics',  label: 'Analytics',  icon: 'analytics' },
  { key: 'History',    label: 'History',    icon: 'history'   },
  { key: 'Settings',   label: 'Settings',   icon: 'settings'  },
];

/* ── Hooks ──────────────────────────────────────────────────── */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const apply = () => setReduced(!!mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return reduced;
}

function useFps() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      frames += 1;
      const dt = performance.now() - last;
      if (dt >= 1000) {
        setFps(clamp(Math.round((frames * 1000) / dt), 1, 240));
        frames = 0;
        last = performance.now();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

/* ── Formatters ─────────────────────────────────────────────── */
function formatDateTime(d) {
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date}  ${time}`;
}

function updateObjectTelemetry(obj) {
  const conf   = clamp(obj.confidence + (Math.random() - 0.5) * 0.02, 0.55, 0.99);
  const dist   = clamp(obj.distanceM  + (Math.random() - 0.5) * 0.9,  1.0, 120);
  const speed  = clamp(obj.speedMps   + (Math.random() - 0.5) * 0.6,  0,   40);
  const status = conf > 0.9 && dist < 60 ? 'Tracking' : conf > 0.75 ? 'Caution' : 'Lost Signal';
  return { ...obj, confidence: conf, distanceM: dist, speedMps: speed, status };
}

/* ── Dashboard ──────────────────────────────────────────────── */
export function Dashboard() {
  const now          = useNow();
  const reducedMotion = useReducedMotion();
  const fps          = useFps();
  const systemMetrics = useSystemMetrics();

  const [activePage,       setActivePage]       = useState('Dashboard');
  const [connectionStatus, setConnectionStatus] = useState('Connected'); // eslint-disable-line no-unused-vars
  const [latencyMs,        setLatencyMs]        = useState(INITIAL_LATENCY_MS);
  const [v2vStatus,        setV2vStatus]        = useState('Ready');
  const [systemHealth,     setSystemHealth]     = useState({ label: 'Nominal', level: 'success' });
  const [vehicleSpeed,     setVehicleSpeed]     = useState(INITIAL_SPEED_KMH);
  const [objects,          setObjects]          = useState(INITIAL_OBJECTS);

  const interval = reducedMotion ? TELEMETRY_INTERVAL_REDUCED : TELEMETRY_INTERVAL_MS;

  // Simulated telemetry — replace with Socket.IO in future integration
  useEffect(() => {
    const id = window.setInterval(() => {
      setLatencyMs((prev) => clamp(Math.round(prev + (Math.random() - 0.5) * 6), 5, 58));

      const healthRoll = Math.random();
      setSystemHealth(
        healthRoll < 0.02  ? { label: 'Degraded', level: 'warning' } :
        healthRoll > 0.985 ? { label: 'Fault',    level: 'danger'  } :
                             { label: 'Nominal',  level: 'success' }
      );

      const v2vRoll = Math.random();
      setV2vStatus(
        v2vRoll < 0.03  ? 'Reconnecting'  :
        v2vRoll > 0.97  ? 'Message Delay' :
                          'Ready'
      );

      setVehicleSpeed((prev) => clamp(prev + (Math.random() - 0.5) * 1.2, 0, 120));
      setObjects((prev) => prev.map(updateObjectTelemetry));
    }, interval);

    return () => window.clearInterval(id);
  }, [interval]);

  const sceneHealthPill = useMemo(() => systemHealth, [systemHealth]);

  const FUTURE_TAGS = useMemo(() => [
    'YOLO', 'MiDaS Depth', 'ByteTrack', 'Socket.IO',
    'V2V Perception', 'Risk Prediction', 'Digital Twin',
  ], []);

  return (
    <div className="dashRoot" role="application" aria-label="Automotive Perception Dashboard">

      {/* ── Top Navbar ──────────────────────────────────────── */}
      <Navbar
        projectName="Perception HUD"
        logoText="⚡"
        currentDateTime={formatDateTime(now)}
        connectionStatus={connectionStatus}
      />

      {/* ── Main body ───────────────────────────────────────── */}
      <div className="dashMain">

        {/* ── Left Sidebar ──────────────────────────────────── */}
        <aside className="dashSidebarWrap" aria-label="Navigation sidebar">
          <Sidebar items={NAV_ITEMS} activeKey={activePage} onChange={setActivePage} />
        </aside>

        {/* ── Center: 3D Scene ──────────────────────────────── */}
        <section className="dashCenter" aria-label="3D Visualization">
          <div className="panelGlass dashCenterCard">
            <div className="panelHeader">
              <div className="panelHeaderTitle">
                <span className="panelHeaderGlow" aria-hidden="true" />
                <h2 className="panelHeaderText">3D Environment</h2>
              </div>
              <div className="panelHeaderMeta">
                <span className={`pill ${sceneHealthPill.level}`}>{sceneHealthPill.label}</span>
                <span className="pill primary">Live</span>
              </div>
            </div>

            {/* Three.js canvas — lazy loaded, isolated from UI state */}
            <Suspense
              fallback={
                <div className="scenePlaceholder">
                  <div className="scenePlaceholderInner">
                    <div className="scenePlaceholderIcon" aria-hidden="true">◈</div>
                    <div className="scenePlaceholderTitle">Initializing 3D Engine…</div>
                  </div>
                </div>
              }
            >
              <Scene3D
                detectedObjects={objects}
                showStats={false}
              />
            </Suspense>
          </div>
        </section>

        {/* ── Right: Object Panel ───────────────────────────── */}
        <aside className="dashRightWrap" aria-label="Detected objects panel">
          <ObjectPanel objects={objects} />
        </aside>
      </div>

      {/* ── Bottom Status Bar ─────────────────────────────────── */}
      <StatusBar
        fps={fps}
        detectedCount={objects.length}
        vehicleSpeed={vehicleSpeed}
        gps="37.7749, -122.4194"
        sensors={{ camera: 'Online', radar: 'Online', lidar: 'Online', ultrasonic: 'Online' }}
        v2vStatus={v2vStatus}
        latencyMs={latencyMs}
        cpuPct={systemMetrics.cpuPct}
        gpuPct={systemMetrics.gpuPct}
        memPct={systemMetrics.memPct}
        systemHealth={systemHealth}
      />
    </div>
  );
}

export default Dashboard;
