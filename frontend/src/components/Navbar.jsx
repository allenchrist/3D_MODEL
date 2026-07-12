/**
 * Navbar — Top automotive HMI navigation bar.
 * Displays project identity, connection status, datetime, and action controls.
 * Architecture note: connectionStatus prop is designed to receive live Socket.IO
 * state in future integration (Connected | Connecting | Disconnected).
 */
import React, { memo } from 'react';
import '../styles/navbar.css';

const CONNECTION_STATES = {
  Connected:    'connected',
  Connecting:   'connecting',
  Disconnected: 'disconnected',
};

const NavbarIconButton = memo(({ icon, label, hasBadge, onClick }) => (
  <button
    className="navbarIconBtn"
    aria-label={label}
    title={label}
    onClick={onClick}
    type="button"
  >
    <span aria-hidden="true">{icon}</span>
    {hasBadge && <span className="navbarBadge" aria-label="Notification" />}
  </button>
));

NavbarIconButton.displayName = 'NavbarIconButton';

export const Navbar = memo(({
  projectName = 'Perception HUD',
  logoText = '⚡',
  currentDateTime = '',
  connectionStatus = 'Connected',
}) => {
  const connClass = CONNECTION_STATES[connectionStatus] ?? 'disconnected';

  return (
    <header className="navbar" role="banner">
      {/* ── Left: Identity ──────────────────────────────────── */}
      <div className="navbarLeft">
        <div className="navbarLogo" aria-hidden="true">{logoText}</div>
        <div>
          <div className="navbarProjectName">{projectName}</div>
          <div className="navbarProjectSub">Collaborative Perception · V2V</div>
        </div>
      </div>

      {/* ── Center: Status + DateTime ────────────────────────── */}
      <div className="navbarCenter">
        <div className="navbarConnStatus" role="status" aria-live="polite">
          <span className={`navbarConnDot ${connClass}`} aria-hidden="true" />
          <span className={`navbarConnLabel ${connClass}`}>{connectionStatus}</span>
        </div>
        <div className="navbarDivider" aria-hidden="true" />
        <time className="navbarDateTime" aria-label="Current date and time">
          {currentDateTime}
        </time>
      </div>

      {/* ── Right: Actions ───────────────────────────────────── */}
      <div className="navbarRight">
        <NavbarIconButton icon="🔔" label="Notifications" hasBadge />
        <NavbarIconButton icon="⚙️" label="Settings" />
        <div className="navbarAvatar" role="button" tabIndex={0} aria-label="User profile">
          AV
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
