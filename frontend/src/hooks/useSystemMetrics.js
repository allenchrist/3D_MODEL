/**
 * useSystemMetrics — Hook for system resource telemetry.
 * Currently simulates CPU/GPU/Memory usage with realistic drift.
 * Future: replace simulation with Socket.IO SOCKET_EVENTS.TELEMETRY
 * or REST polling from the vehicle ECU / backend.
 *
 * @returns {{ cpuPct, gpuPct, memPct }}
 */
import { useEffect, useState } from 'react';

const INITIAL_METRICS = { cpuPct: 34, gpuPct: 51, memPct: 42 };
const UPDATE_INTERVAL = 1800;
const DRIFT_RANGE     = 5;
const MIN_PCT         = 5;
const MAX_PCT         = 95;

function driftValue(current, range, min, max) {
  return Math.max(min, Math.min(max, Math.round(current + (Math.random() - 0.5) * range)));
}

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMetrics((prev) => ({
        cpuPct: driftValue(prev.cpuPct, DRIFT_RANGE, MIN_PCT, MAX_PCT),
        gpuPct: driftValue(prev.gpuPct, DRIFT_RANGE, MIN_PCT, MAX_PCT),
        memPct: driftValue(prev.memPct, DRIFT_RANGE / 2, MIN_PCT, MAX_PCT),
      }));
    }, UPDATE_INTERVAL);

    return () => window.clearInterval(id);
  }, []);

  return metrics;
}
