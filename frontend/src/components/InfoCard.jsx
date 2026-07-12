/**
 * InfoCard — Reusable metric/info tile component.
 * Used across Dashboard, Analytics, and future perception detail views.
 */
import React, { memo } from 'react';

const CARD_STYLES = {
  wrapper: {
    background: 'var(--bg-panel-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  label: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  },
  value: {
    fontFamily: 'var(--font-mono)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  sub: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
};

export const InfoCard = memo(({ label, value, sub, accent = 'primary', icon }) => {
  const accentColor = `var(--${accent})`;

  return (
    <div style={CARD_STYLES.wrapper} role="region" aria-label={label}>
      <div style={CARD_STYLES.label}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        {icon && <span aria-hidden="true" style={{ fontSize: '14px' }}>{icon}</span>}
        <span style={{ ...CARD_STYLES.value, color: accentColor }}>{value}</span>
      </div>
      {sub && <div style={CARD_STYLES.sub}>{sub}</div>}
    </div>
  );
});

InfoCard.displayName = 'InfoCard';
