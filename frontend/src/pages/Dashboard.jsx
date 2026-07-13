/**
 * Dashboard — Primary view of the Automotive Perception Platform.
 *
 * Data flow:
 *   FastAPI /detections
 *     → usePerceptionData (polls every 3 s, cycles frames)
 *       → objects        → ObjectPanel + Scene3D
 *       → connectionStatus → Navbar
 *
 * Simulated telemetry (speed, latency, health, V2V) remains on its own
 * interval and will be replaced by Socket.IO in a future phase.
 */
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Navbar }            from '../components/Navbar';
import { Sidebar }           from '../components/Sidebar';
import { ObjectPanel }       from '../components/ObjectPanel';
import { StatusBar }         from '../components/StatusBar';
import { usePerceptionData } from '../hooks/usePerceptionData';
import { useSystemMetrics }  from '../hooks/useSystemMetrics';
import { clamp }             from '../utils/perception';
import '../styles/dashboard.css';

const Scene3D = lazy(() =>
  import('../scenes/Scene3D').then((m) => ({ default: m.Scene3D }))
);

/* ── Constants ──────────────────────────────────────────────── */
const TELEMETRY_INTERVAL_MS      = 650;
const TELEMETRY_INTERVAL_REDUCED = 1200;
const INITIAL_SPEED_KMH          = 41.2;
const INITIAL_LATENCY_MS         = 12;

const NAV_ITEMS = [
  { key: 'Dashboard',  label: 'Dashboard',  icon: 'dashboard' },
  { key: 'Perception', label: 'Perception', icon: 'vision'    },
  { key: 'Vehicles',   label: 'Vehicles',   icon: 'vehicle'   },
  { key: 'Traffic',    label: 'Traffic',    icon: 'traffic'   },
  { key: 'Analytics',  label: 'Analytics',  icon: 'analytics' },
  { key: 'History',    label: 'History',    icon: 'history'   },
  { key: 'Settings',   label: 'Settings',   icon: 'settings'  },
];

/* ── Local hooks ────────────────────────────────────────────── */
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

function formatDateTime(d) {
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date}  ${time}`;
}

/* ── Dashboard ──────────────────────────────────────────────── */
export function Dashboard() {
  const now           = useNow();
  const reducedMotion = useReducedMotion();
  const fps           = useFps();
  const systemMetrics = useSystemMetrics();

  // ── Real perception data from FastAPI ──────────────────────
  const {
    objects,
    connectionStatus,
    totalFrames,
    currentFrame,
    isLive,
  } = usePerceptionData();

  // ── Simulated vehicle telemetry ────────────────────────────
  // Future: replace with Socket.IO vehicle telemetry stream
  const [activePage,   setActivePage]   = useState('Dashboard');
  const [latencyMs,    setLatencyMs]    = useState(INITIAL_LATENCY_MS);
  const [v2vStatus,    setV2vStatus]    = useState('Ready');
  const [systemHealth, setSystemHealth] = useState({ label: 'Nominal', level: 'success' });
  const [vehicleSpeed, setVehicleSpeed] = useState(INITIAL_SPEED_KMH);

  const interval = reducedMotion ? TELEMETRY_INTERVAL_REDUCED : TELEMETRY_INTERVAL_MS;

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
        v2vRoll < 0.03 ? 'Reconnecting'  :
        v2vRoll > 0.97 ? 'Message Delay' :
                         'Ready'
      );

      setVehicleSpeed((prev) => clamp(prev + (Math.random() - 0.5) * 1.2, 0, 120));
    }, interval);

    return () => window.clearInterval(id);
  }, [interval]);

  const sceneHealthPill = useMemo(() => systemHealth, [systemHealth]);

  // Frame counter label shown in the panel header
  const frameLabel = useMemo(() =>
    isLive && totalFrames > 0
      ? `Frame ${currentFrame} / ${totalFrames}`
      : null,
    [isLive, currentFrame, totalFrames]
  );

  return (
    <div className="dashRoot" role="application" aria-label="Automotive Perception Dashboard">

      {/* ── Top Navbar — connectionStatus reflects real API state ── */}
      <Navbar
        projectName="Perception HUD"
        logoText="⚡"
        currentDateTime={formatDateTime(now)}
        connectionStatus={connectionStatus}
      />

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
                <span className={`pill ${isLive ? 'success' : 'warning'}`}>
                  {isLive ? 'YOLO Live' : 'Connecting…'}
                </span>
                {frameLabel && (
                  <span className="pill neutral">{frameLabel}</span>
                )}
              </div>
            </div>

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
                isLive={isLive}
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
