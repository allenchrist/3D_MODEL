/**
 * ObjectPanel — Right-side detected objects panel.
 * Renders perception data cards for each tracked object.
 *
 * Architecture note: `objects` prop is designed to be fed directly from
 * future YOLO + ByteTrack JSON output via Socket.IO or REST polling.
 * Each object shape mirrors the expected AI perception payload.
 */
import React, { memo, useMemo } from 'react';
import '../styles/objectPanel.css';

/* ── Constants ──────────────────────────────────────────────── */
const TYPE_ICONS = {
  Car:         '🚗',
  Truck:       '🚛',
  Motorcycle:  '🏍',
  Pedestrian:  '🚶',
  Cyclist:     '🚴',
  Bus:         '🚌',
  Unknown:     '◈',
};

const CONF_THRESHOLDS = { HIGH: 0.85, MEDIUM: 0.65 };
const RISK_THRESHOLDS = { HIGH_DIST: 20, MED_DIST: 45 };
const SIGNAL_LEVELS   = 4;

/* ── Helpers ────────────────────────────────────────────────── */
function getConfClass(conf) {
  if (conf >= CONF_THRESHOLDS.HIGH)   return 'high';
  if (conf >= CONF_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

function getRiskLevel(distanceM, confidence) {
  if (distanceM < RISK_THRESHOLDS.HIGH_DIST || confidence < CONF_THRESHOLDS.MEDIUM) return 'high';
  if (distanceM < RISK_THRESHOLDS.MED_DIST)  return 'medium';
  return 'low';
}

function getSignalBars(confidence) {
  // Map confidence [0,1] → 0–4 active bars
  return Math.round(confidence * SIGNAL_LEVELS);
}

function getStatusPillClass(status) {
  if (status === 'Tracking')    return 'success';
  if (status === 'Caution')     return 'warning';
  if (status === 'Lost Signal') return 'danger';
  return 'neutral';
}

function formatSpeed(mps) {
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

function formatDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`;
}

function formatLastUpdate() {
  return new Date().toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ── Signal Strength Visual ─────────────────────────────────── */
const SignalStrength = memo(({ confidence }) => {
  const activeBars = getSignalBars(confidence);
  return (
    <div className="signalBars" aria-label={`Signal strength: ${activeBars} of ${SIGNAL_LEVELS}`}>
      {Array.from({ length: SIGNAL_LEVELS }, (_, i) => (
        <div
          key={i}
          className={`signalBar${i < activeBars ? ' active' : ''}`}
        />
      ))}
    </div>
  );
});

SignalStrength.displayName = 'SignalStrength';

/* ── Single Object Card ─────────────────────────────────────── */
const ObjectCard = memo(({ object }) => {
  const {
    id, type, name, distanceM, speedMps,
    direction, confidence, status,
  } = object;

  const confClass  = useMemo(() => getConfClass(confidence), [confidence]);
  const riskLevel  = useMemo(() => getRiskLevel(distanceM, confidence), [distanceM, confidence]);
  const statusPill = useMemo(() => getStatusPillClass(status), [status]);
  const confPct    = `${(confidence * 100).toFixed(0)}%`;

  return (
    <article className="objectCard" aria-label={`Detected object: ${name}`}>
      {/* ── Card top row ──────────────────────────────────── */}
      <div className="objectCardTop">
        <div className="objectCardId">
          <span className="objectTypeIcon" aria-hidden="true">
            {TYPE_ICONS[type] ?? TYPE_ICONS.Unknown}
          </span>
          <div>
            <div className="objectCardIdText">{name}</div>
            <div className="objectCardIdSub">{id}</div>
          </div>
        </div>
        <span className={`pill ${statusPill}`}>{status}</span>
      </div>

      {/* ── Confidence bar ────────────────────────────────── */}
      <div className="objectConfBar">
        <div className="objectConfLabel">
          <span>Confidence</span>
          <span className="objectConfValue">{confPct}</span>
        </div>
        <div className="objectConfTrack">
          <div
            className={`objectConfFill ${confClass}`}
            style={{ width: confPct }}
            role="progressbar"
            aria-valuenow={Math.round(confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* ── Data grid ─────────────────────────────────────── */}
      <div className="objectDataGrid">
        <div className="objectDataItem">
          <span className="objectDataLabel">Distance</span>
          <span className="objectDataValue highlight">{formatDistance(distanceM)}</span>
        </div>
        <div className="objectDataItem">
          <span className="objectDataLabel">Velocity</span>
          <span className="objectDataValue">{formatSpeed(speedMps)}</span>
        </div>
        <div className="objectDataItem">
          <span className="objectDataLabel">Direction</span>
          <span className="objectDataValue">{direction}</span>
        </div>
        <div className="objectDataItem">
          <span className="objectDataLabel">Signal</span>
          <SignalStrength confidence={confidence} />
        </div>
        <div className="objectDataItem">
          <span className="objectDataLabel">Type</span>
          <span className="objectDataValue">{type}</span>
        </div>
        <div className="objectDataItem">
          <span className="objectDataLabel">Updated</span>
          <span className="objectDataValue">{formatLastUpdate()}</span>
        </div>
      </div>

      {/* ── Risk badge ────────────────────────────────────── */}
      <div className={`objectRiskBadge ${riskLevel}`}>
        <span aria-hidden="true">
          {riskLevel === 'high' ? '⚠' : riskLevel === 'medium' ? '◈' : '✓'}
        </span>
        {riskLevel.toUpperCase()} RISK
      </div>
    </article>
  );
});

ObjectCard.displayName = 'ObjectCard';

/* ── Panel ──────────────────────────────────────────────────── */
export const ObjectPanel = memo(({ objects = [] }) => (
  <div className="objectPanel" role="region" aria-label="Detected objects">
    <div className="objectPanelHeader">
      <div className="objectPanelTitle">
        <span className="panelHeaderGlow" aria-hidden="true" />
        <span className="objectPanelTitleText">Detected Objects</span>
      </div>
      <span className="objectPanelCount" aria-label={`${objects.length} objects detected`}>
        {objects.length}
      </span>
    </div>

    <div className="objectPanelScroll" role="list">
      {objects.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '24px' }}>
          No objects detected
        </div>
      ) : (
        objects.map((obj) => (
          <div key={obj.id} role="listitem">
            <ObjectCard object={obj} />
          </div>
        ))
      )}
    </div>
  </div>
));

ObjectPanel.displayName = 'ObjectPanel';
