/**
 * LoadingScreen — Full-screen boot sequence overlay.
 * Shown during initial application load or scene initialization.
 * Future: integrate with actual asset/model loading progress.
 */
import React, { memo } from 'react';

const STYLES = {
  root: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-root)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    zIndex: 9999,
  },
  logo: {
    fontSize: '40px',
    filter: 'drop-shadow(0 0 20px var(--primary))',
  },
  title: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-primary)',
  },
  sub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
  },
  track: {
    width: '200px',
    height: '2px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  fill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--primary), #0088cc)',
    borderRadius: '2px',
    animation: 'loadProgress 1.8s ease-in-out infinite',
  },
};

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('lsKeyframes')) {
  const style = document.createElement('style');
  style.id = 'lsKeyframes';
  style.textContent = `
    @keyframes loadProgress {
      0%   { width: 0%;   margin-left: 0; }
      50%  { width: 60%;  margin-left: 20%; }
      100% { width: 0%;   margin-left: 100%; }
    }
  `;
  document.head.appendChild(style);
}

export const LoadingScreen = memo(({ message = 'Initializing Perception Engine…' }) => (
  <div style={STYLES.root} role="status" aria-live="polite" aria-label="Loading">
    <div style={STYLES.logo} aria-hidden="true">⚡</div>
    <div style={STYLES.title}>Perception HUD</div>
    <div style={STYLES.sub}>{message}</div>
    <div style={STYLES.track}>
      <div style={STYLES.fill} />
    </div>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';
