/**
 * Sidebar — Icon-based automotive navigation sidebar.
 * Supports active page highlighting, hover tooltips, and animated transitions.
 * Settings item is pinned to the bottom via a spacer.
 */
import React, { memo, useCallback } from 'react';
import '../styles/sidebar.css';

/** Map icon keys to emoji/unicode glyphs.
 *  Future: replace with an SVG sprite sheet for production. */
const ICON_MAP = {
  dashboard: '◈',
  vision:    '◉',
  vehicle:   '⬡',
  traffic:   '⬢',
  analytics: '◫',
  history:   '◷',
  settings:  '⚙',
};

const SidebarItem = memo(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => onClick(item.key), [item.key, onClick]);
  const handleKey   = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item.key); }
  }, [item.key, onClick]);

  return (
    <button
      className={`sidebarItem${isActive ? ' active' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      data-tooltip={item.label}
      type="button"
    >
      <span className="sidebarIcon" aria-hidden="true">
        {ICON_MAP[item.icon] ?? '●'}
      </span>
      <span className="sidebarLabel">{item.label}</span>
    </button>
  );
});

SidebarItem.displayName = 'SidebarItem';

export const Sidebar = memo(({ items = [], activeKey, onChange }) => {
  // Separate settings from main nav items so it pins to the bottom
  const mainItems     = items.filter((i) => i.key !== 'Settings');
  const settingsItem  = items.find((i) => i.key === 'Settings');

  return (
    <nav className="sidebar" aria-label="Primary navigation">
      {mainItems.map((item) => (
        <SidebarItem
          key={item.key}
          item={item}
          isActive={activeKey === item.key}
          onClick={onChange}
        />
      ))}

      <div className="sidebarSpacer" aria-hidden="true" />
      <div className="sidebarDivider" aria-hidden="true" />

      {settingsItem && (
        <SidebarItem
          item={settingsItem}
          isActive={activeKey === settingsItem.key}
          onClick={onChange}
        />
      )}
    </nav>
  );
});

Sidebar.displayName = 'Sidebar';
