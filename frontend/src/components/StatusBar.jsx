/**
 * StatusBar — Bottom automotive telemetry strip.
 * Displays real-time system metrics, sensor states, and network health.
 *
 * Architecture note: All props are designed to be driven by live telemetry
 * from the vehicle ECU or simulation backend via Socket.IO in future integration.
 */
import React, { memo, useMemo } from 'react';
import '../styles/statusBar.css';

/* ── Constants ──────────────────────────────────────────────── */
const USAGE_THRESHOLDS = { HIGH: 80, MEDIUM: 55 };

/* ── Helpers ────────────────────────────────────────────────── */
function getUsageClass(pct) {
  if (pct >= USAGE_THRESHOLDS.HIGH)   return 'high';
  if (pct >= USAGE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

function getSensorClass(state) {
  if (state === 'Online')  return 'online';
  if (state === 'Offline') return 'offline';
  return 'standby';
}

/* ── Sub-components ─────────────────────────────────────────── */
const StatusItem = memo(({ label, value, valueClass = '', icon }) => (
  <div className="statusItem">
    {icon && <span className="statusItemIcon" aria-hidden="true">{icon}</span>}
    <span className="statusItemLabel">{label}</span>
    <span className={`statusItemValue ${valueClass}`}>{value}</span>
  </div>
));

StatusItem.displayName = 'StatusItem';

const SensorItem = memo(({ label, state }) => {
  const cls = getSensorClass(state);
  return (
    <div className="statusItem">
      <span className={`statusDot ${cls}`} aria-hidden="true" />
      <span className="statusItemLabel">{label}</span>
      <span className={`statusItemValue ${cls === 'online' ? 'success' : cls === 'offline' ? 'danger' : 'warning'}`}>
        {state}
      </span>
    </div>
  );
});

SensorItem.displayName = 'SensorItem';

const UsageItem = memo(({ label, pct }) => {
  const cls = useMemo(() => getUsageClass(pct), [pct]);
  return (
    <div className="statusItem">
      <span className="statusItemLabel">{label}</span>
      <div className="statusUsageBar">
        <div className="statusUsageTrack">
          <div
            className={`statusUsageFill ${cls}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className={`statusItemValue ${cls === 'high' ? 'danger' : cls === 'medium' ? 'warning' : 'success'}`}>
          {pct}%
        </span>
      </div>
    </div>
  );
});

UsageItem.displayName = 'UsageItem';

/* ── StatusBar ──────────────────────────────────────────────── */
export const StatusBar = memo(({
  fps            = 60,
  detectedCount  = 0,
  vehicleSpeed   = 0,
  gps            = '—',
  sensors        = {},
  v2vStatus      = 'Ready',
  latencyMs      = 0,
  cpuPct         = 34,
  gpuPct         = 51,
  memPct         = 42,
  systemHealth   = { label: 'Nominal', level: 'success' },
}) => {
  const speedKmh = vehicleSpeed.toFixed(1);
  const fpsClass = fps >= 50 ? 'success' : fps >= 30 ? 'warning' : 'danger';
  const latClass = latencyMs <= 20 ? 'success' : latencyMs <= 50 ? 'warning' : 'danger';
  const v2vClass = v2vStatus === 'Ready' ? 'success' : v2vStatus === 'Reconnecting' ? 'warning' : 'danger';

  return (
    <footer className="statusBar" role="contentinfo" aria-label="System status">
      <StatusItem label="FPS"     value={fps}           valueClass={fpsClass}  icon="◈" />
      <StatusItem label="Objects" value={detectedCount} valueClass="primary"   icon="◉" />
      <StatusItem label="Speed"   value={`${speedKmh} km/h`} valueClass="primary" icon="⬡" />
      <StatusItem label="GPS"     value={gps}           valueClass=""          icon="⊕" />

      <SensorItem label="Camera"    state={sensors.camera    ?? 'Online'} />
      <SensorItem label="Radar"     state={sensors.radar     ?? 'Online'} />
      <SensorItem label="LiDAR"     state={sensors.lidar     ?? 'Online'} />
      <SensorItem label="Ultrasonic" state={sensors.ultrasonic ?? 'Online'} />

      <StatusItem label="V2V"     value={v2vStatus}     valueClass={v2vClass}  icon="⬢" />
      <StatusItem label="Latency" value={`${latencyMs} ms`} valueClass={latClass} icon="◷" />

      <UsageItem label="CPU" pct={cpuPct} />
      <UsageItem label="GPU" pct={gpuPct} />
      <UsageItem label="MEM" pct={memPct} />

      {/* ── System health (pinned right) ─────────────────── */}
      <div className="statusHealth" role="status" aria-live="polite">
        <span className={`statusDot ${getSensorClass(systemHealth.level === 'success' ? 'Online' : systemHealth.level === 'warning' ? 'Standby' : 'Offline')}`} aria-hidden="true" />
        <span className={`statusHealthLabel ${systemHealth.level}`}>
          {systemHealth.label}
        </span>
      </div>
    </footer>
  );
});

StatusBar.displayName = 'StatusBar';
