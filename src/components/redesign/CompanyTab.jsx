"use client";

import React, { useState } from 'react';
import { THEMES } from '@/data/companyData';
import CompanyDetailScreen from './CompanyDetailScreen';

// ─── 유틸 ─────────────────────────────────
function fmt(v) { return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; }
function pclr(v) { return v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#555'; }

// ─── 테마 행 ──────────────────────────────
function ThemeRow({ theme, isActive, onToggle }) {
  return (
    <button
      style={{
        ...S.themeRow,
        background: isActive ? theme.color + '10' : 'transparent',
        borderLeft: isActive ? `2.5px solid ${theme.color}` : '2.5px solid transparent',
      }}
      onClick={onToggle}
    >
      {/* 아이콘 + 이름 */}
      <div style={{ ...S.themeIcon, background: theme.color + '20' }}>
        <i className={`ti ${theme.icon}`} style={{ color: theme.color, fontSize: 13 }} />
      </div>
      <div style={S.themeInfo}>
        <div style={S.themeName}>{theme.name}</div>
        <div style={S.themeDesc}>{theme.desc}</div>
      </div>

      {/* 수익률 3열 */}
      <div style={S.themeReturns}>
        {[{ label: '일', v: theme.d }, { label: '주', v: theme.w }, { label: '월', v: theme.m }].map(({ label, v }) => (
          <div key={label} style={S.retCell}>
            <div style={S.retLabel}>{label}</div>
            <div style={{ ...S.retVal, color: pclr(v) }}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      <i className={`ti ${isActive ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11, color: '#444', flexShrink: 0 }} />
    </button>
  );
}

// ─── 종목 행 ──────────────────────────────
function StockRow({ stock, onSelect, isLast }) {
  return (
    <button
      style={{ ...S.stockRow, borderBottom: isLast ? 'none' : '0.5px solid #151520' }}
      onClick={() => onSelect(stock)}
    >
      <div style={S.stockLeft}>
        <div style={S.stockName}>{stock.name}</div>
        <div style={S.stockMeta}>{stock.ticker} · 시총 {stock.cap}</div>
      </div>
      <div style={S.stockReturns}>
        {[stock.d, stock.w, stock.m].map((v, i) => (
          <span key={i} style={{ ...S.stockRet, color: pclr(v) }}>{fmt(v)}</span>
        ))}
      </div>
      <i className="ti ti-chevron-right" style={{ fontSize: 11, color: '#333', marginLeft: 4 }} />
    </button>
  );
}

// ─── 메인 ─────────────────────────────────
export default function CompanyTab() {
  const [selectedTheme,   setSelectedTheme]   = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedThemeName, setSelectedThemeName] = useState('');

  if (selectedCompany) {
    return (
      <CompanyDetailScreen
        stock={selectedCompany}
        themeName={selectedThemeName}
        onBack={() => setSelectedCompany(null)}
      />
    );
  }

  const handleThemeToggle = (key) => {
    setSelectedTheme(prev => prev === key ? null : key);
  };

  const handleStockSelect = (stock, themeName) => {
    setSelectedThemeName(themeName);
    setSelectedCompany(stock);
  };

  const topTheme = THEMES[0];

  return (
    <div style={S.wrap}>

      {/* 상단 배너: 주목 테마 */}
      <div style={S.banner}>
        <div>
          <div style={S.bannerLabel}>이번 달 최강 테마</div>
          <div style={S.bannerRow}>
            <i className={`ti ${topTheme.icon}`} style={{ color: topTheme.color, fontSize: 18 }} />
            <span style={{ ...S.bannerName, color: topTheme.color }}>{topTheme.name}</span>
            <span style={S.bannerReturn}>월간 +{topTheme.m}%</span>
          </div>
          <div style={S.bannerSub}>{topTheme.desc}</div>
        </div>
        <div style={S.bannerSpark}>
          <i className="ti ti-flame" style={{ fontSize: 36, color: '#EF9F2740' }} />
          <span style={{ fontSize: 28, position: 'absolute' }}>🔥</span>
        </div>
      </div>

      {/* 테마 랭킹 */}
      <div style={S.card}>
        {/* 테이블 헤더 */}
        <div style={S.tableHeaderRow}>
          <span style={{ ...S.tHead, flex: 1 }}>테마</span>
          <span style={S.tHead}>1일</span>
          <span style={S.tHead}>1주</span>
          <span style={S.tHead}>1달</span>
          <span style={{ width: 24 }} />
        </div>

        {THEMES.map((theme, i) => {
          const isActive = selectedTheme === theme.key;
          return (
            <div key={theme.key}>
              {/* 구분선 */}
              {i > 0 && !isActive && selectedTheme !== THEMES[i - 1]?.key && (
                <div style={S.divider} />
              )}
              <ThemeRow
                theme={theme}
                isActive={isActive}
                onToggle={() => handleThemeToggle(theme.key)}
              />

              {/* 종목 리스트 아코디언 */}
              {isActive && (
                <div style={{ ...S.stockSection, borderColor: theme.color + '30' }}>
                  {/* 종목 테이블 헤더 */}
                  <div style={S.stockTableHead}>
                    <span style={{ ...S.sTh, flex: 1.4 }}>기업명</span>
                    <span style={S.sTh}>1일</span>
                    <span style={S.sTh}>1주</span>
                    <span style={S.sTh}>1달</span>
                    <span style={{ width: 22 }} />
                  </div>
                  {theme.stocks.map((stock, j) => (
                    <StockRow
                      key={stock.ticker}
                      stock={stock}
                      isLast={j === theme.stocks.length - 1}
                      onSelect={(s) => handleStockSelect(s, theme.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}

// ─── 스타일 ────────────────────────────────
const S = {
  wrap: { padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, minHeight: 0 },

  banner: {
    background: 'linear-gradient(135deg, #1c1c30 0%, #181820 100%)',
    border: '0.5px solid #2a2a45',
    borderRadius: 14, padding: '14px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  bannerLabel: { fontSize: 9, color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 7 },
  bannerRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  bannerName: { fontSize: 22, fontWeight: 600 },
  bannerReturn: { fontSize: 18, fontWeight: 500, color: '#1D9E75' },
  bannerSub: { fontSize: 10, color: '#555' },
  bannerSpark: { position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  card: { background: '#181820', borderRadius: 14, overflow: 'hidden' },

  tableHeaderRow: {
    display: 'flex', alignItems: 'center', padding: '8px 14px',
    borderBottom: '0.5px solid #151520', background: '#13131e',
  },
  tHead: { flex: 0.6, fontSize: 8.5, color: '#444', textAlign: 'right', textTransform: 'uppercase' },

  themeRow: {
    width: '100%', display: 'flex', alignItems: 'center',
    padding: '11px 14px', gap: 8,
    cursor: 'pointer', textAlign: 'left', border: 'none',
  },
  themeIcon: {
    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  themeInfo: { flex: 1, minWidth: 0 },
  themeName: { fontSize: 13, fontWeight: 500, color: '#fff' },
  themeDesc: { fontSize: 9, color: '#444', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  themeReturns: { display: 'flex', gap: 0 },
  retCell: { width: 44, textAlign: 'right', flexShrink: 0 },
  retLabel: { fontSize: 8, color: '#333', marginBottom: 2 },
  retVal: { fontSize: 10, fontWeight: 500 },

  divider: { height: '0.5px', background: '#151520', margin: '0 14px' },

  stockSection: {
    background: '#13131e',
    borderLeft: '3px solid',
    marginLeft: 14,
    borderRadius: '0 0 8px 8px',
    marginBottom: 4,
    overflow: 'hidden',
  },
  stockTableHead: {
    display: 'flex', alignItems: 'center', padding: '6px 12px',
    borderBottom: '0.5px solid #1e1e28',
  },
  sTh: { flex: 0.6, fontSize: 8, color: '#333', textAlign: 'right', textTransform: 'uppercase' },
  stockRow: {
    width: '100%', display: 'flex', alignItems: 'center',
    padding: '10px 12px', gap: 8,
    cursor: 'pointer', textAlign: 'left', border: 'none',
    background: 'transparent',
  },
  stockLeft: { flex: 1.4, minWidth: 0 },
  stockName: { fontSize: 12, color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  stockMeta: { fontSize: 8.5, color: '#3a3a4a', marginTop: 2 },
  stockReturns: { display: 'flex' },
  stockRet: { width: 44, fontSize: 10, fontWeight: 500, textAlign: 'right', flexShrink: 0 },
};
