"use client";

import React from 'react';

const NAV_ICONS = {
  market: 'ti-chart-line',
  technical: 'ti-list-search',
  portfolio: 'ti-briefcase',
  company: 'ti-building-skyscraper',
};

export default function DesktopShell({ tabs, activeTab, onTabChange, children }) {
  return (
    <div style={S.wrap}>
      <aside style={S.sidebar}>
        <div style={S.logoRow}>
          <span style={S.logoText}>Herencia</span>
        </div>
        <div style={S.liveBadge}>
          <span style={S.liveDot} />
          <span>실시간</span>
        </div>

        <nav style={S.nav}>
          {tabs.map(t => (
            <button
              key={t.key}
              style={{ ...S.navBtn, ...(activeTab === t.key ? S.navBtnActive : {}) }}
              onClick={() => onTabChange(t.key)}
            >
              <i className={`ti ${NAV_ICONS[t.key] ?? 'ti-circle'}`} style={{ fontSize: 15 }} />
              {t.label}
            </button>
          ))}
        </nav>

        <div style={S.sidebarFooter}>© 2026 Herencia Inc.</div>
      </aside>

      <main style={S.main}>{children}</main>
    </div>
  );
}

const S = {
  wrap: { display: 'flex', minHeight: '100vh', width: '100%', background: '#0a0a10' },

  sidebar: {
    width: 232, flexShrink: 0, display: 'flex', flexDirection: 'column',
    padding: '22px 16px', borderRight: '0.5px solid #1e1e28', background: '#0f1117',
    position: 'sticky', top: 0, height: '100vh',
  },
  logoRow: { padding: '0 6px', marginBottom: 4 },
  logoText: { fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' },
  liveBadge: {
    display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#5DCAA5',
    padding: '0 6px', marginBottom: 24,
  },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: '#1D9E75' },

  nav: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 9, border: 'none', background: 'transparent',
    color: '#777', fontSize: 13.5, fontWeight: 500, textAlign: 'left', cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  },
  navBtnActive: { background: '#7F77DD1a', color: '#a29dff' },

  sidebarFooter: { fontSize: 10, color: '#2a2a35', padding: '0 6px' },

  main: { flex: 1, minWidth: 0, padding: '28px 36px 60px', maxWidth: 1400, margin: '0 auto', width: '100%' },
};
