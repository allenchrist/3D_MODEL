import React, { useEffect, useMemo, useState } from 'react';
import { Navbar }            from '../components/Navbar';
import { Sidebar }           from '../components/Sidebar';
import { ObjectPanel }       from '../components/ObjectPanel';
import { StatusBar }         from '../components/StatusBar';
import { usePerceptionData } from '../hooks/usePerceptionData';
import { useSystemMetrics }  from '../hooks/useSystemMetrics';
import { Scene3D }           from '../scenes/Scene3D';
import { clamp }             from '../utils/perception';
import '../styles/dashboard.css';

const TELEMETRY_MS      = 650;
const TELEMETRY_MS_LOW  = 1200;
const INITIAL_SPEED     = 41.2;
const INITIAL_LATENCY   = 12;

const NAV_ITEMS = [
  { key: 'Dashboard',  label: 'Dashboard',  icon: 'dashboard' },
  { key: 'Perception', label: 'Perception', icon: 'vision'    },
  { key: 'Vehicles',   label: 'Vehicles',   icon: 'vehicle'   },
  { key: 'Traffic',    label: 'Traffic',    icon: 'traffic'   },
  { key: 'Analytics',  label: 'Analytics',  icon: 'analytics' },
  { key: 'History',    label: 'History',    icon: 'history'   },
  { key: 'Settings',   label: 'Settings',   icon: 'settings'  },
];

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
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
    let raf = 0, last = performance.now(), frames = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      frames++;
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
  return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
    + '  '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function Dashboard() {
  const now           = useNow();
  const reducedMotion = useReducedMotion();
  const fps           = useFps();
  const systemMetrics = useSystemMetrics();

  const { objects, connectionStatus, currentFrame, isLive } = usePerceptionData();

  const [activePage,   setActivePage]   = useState('Dashboard');
  const [latencyMs,    setLatencyMs]    = useState(INITIAL_LATENCY);
  const [v2vStatus,    setV2vStatus]    = useState('Ready');
  const [systemHealth, setSystemHealth] = useState({ label: 'Nominal', level: 'success' });
  const [vehicleSpeed, setVehicleSpeed] = useState(INITIAL_SPEED);

  const interval = reducedMotion ? TELEMETRY_MS_LOW : TELEMETRY_MS;

  useEffect(() => {
    const id = window.setInterval(() => {
      setLatencyMs((p) => clamp(Math.round(p + (Math.random() - 0.5) * 6), 5, 58));
      const h = Math.random();
      setSystemHealth(
        h < 0.02  ? { label: 'Degraded', level: 'warning' } :
        h > 0.985 ? { label: 'Fault',    level: 'danger'  } :
                    { label: 'Nominal',  level: 'success' }
      );
      const v = Math.random();
      setV2vStatus(v < 0.03 ? 'Reconnecting' : v > 0.97 ? 'Message Delay' : 'Ready');
      setVehicleSpeed((p) => clamp(p + (Math.random() - 0.5) * 1.2, 0, 120));
    }, interval);
    return () => window.clearInterval(id);
  }, [interval]);

  const frameLabel = useMemo(
    () => isLive && currentFrame > 0 ? `Frame ${currentFrame}` : null,
    [isLive, currentFrame]
  );

  return (
    <div className="dashRoot" role="application" aria-label="Automotive Perception Dashboard">

      <Navbar
        projectName="Perception HUD"
        logoText="⚡"
        currentDateTime={formatDateTime(now)}
        connectionStatus={connectionStatus}
      />

      <div className="dashMain">

        <aside className="dashSidebarWrap" aria-label="Navigation sidebar">
          <Sidebar items={NAV_ITEMS} activeKey={activePage} onChange={setActivePage} />
        </aside>

        <section className="dashCenter" aria-label="3D Visualization">
          <div className="panelGlass dashCenterCard">
            <div className="panelHeader">
              <div className="panelHeaderTitle">
                <span className="panelHeaderGlow" aria-hidden="true" />
                <h2 className="panelHeaderText">3D Environment</h2>
              </div>
              <div className="panelHeaderMeta">
                <span className={`pill ${systemHealth.level}`}>{systemHealth.label}</span>
                <span className={`pill ${isLive ? 'success' : 'warning'}`}>
                  {isLive ? 'YOLO Live' : 'Connecting…'}
                </span>
                {frameLabel && <span className="pill neutral">{frameLabel}</span>}
              </div>
            </div>

            {/*
              Scene3D is imported directly — NOT lazy loaded.
              This means the Canvas is mounted once on page load
              and NEVER unmounted, even when objects state changes.
            */}
            <Scene3D
              detectedObjects={objects}
              isLive={isLive}
            />
          </div>
        </section>

        <aside className="dashRightWrap" aria-label="Detected objects panel">
          <ObjectPanel objects={objects} />
        </aside>
      </div>

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
