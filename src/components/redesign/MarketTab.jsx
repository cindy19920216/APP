"use client";

import React, { useState, useEffect } from 'react';
import PanicBoomScreen from './PanicBoomScreen';
import InstrumentChartScreen from './InstrumentChartScreen';

const FALLBACK_INDICES = [
  { name: 'S&P500',    value: '—', change: '—', up: true },
  { name: 'NASDAQ',    value: '—', change: '—', up: true },
  { name: 'KOSPI',     value: '—', change: '—', up: true },
  { name: 'KOSDAQ',    value: '—', change: '—', up: true },
  { name: '니케이225', value: '—', change: '—', up: true },
  { name: 'DAX',       value: '—', change: '—', up: true },
  { name: '항셍',      value: '—', change: '—', up: true },
];
const FALLBACK_FX = [
  { pair: 'USD / KRW', value: '—', change: '—', up: true, flag: '🇺🇸' },
  { pair: 'EUR / KRW', value: '—', change: '—', up: true, flag: '🇪🇺' },
  { pair: 'JPY / KRW', value: '—', change: '—', up: true, flag: '🇯🇵' },
  { pair: 'GBP / KRW', value: '—', change: '—', up: true, flag: '🇬🇧' },
  { pair: 'CNY / KRW', value: '—', change: '—', up: true, flag: '🇨🇳' },
  { pair: 'AUD / KRW', value: '—', change: '—', up: true, flag: '🇦🇺' },
  { pair: 'CAD / KRW', value: '—', change: '—', up: true, flag: '🇨🇦' },
  { pair: 'CHF / KRW', value: '—', change: '—', up: true, flag: '🇨🇭' },
  { pair: 'HKD / KRW', value: '—', change: '—', up: true, flag: '🇭🇰' },
  { pair: 'SGD / KRW', value: '—', change: '—', up: true, flag: '🇸🇬' },
];
const FALLBACK_COMMODITIES = [
  { name: '금',        value: '—', change: '—', up: true, icon: 'ti-coin',             bg: '#2a2010', ic: '#EF9F27' },
  { name: '원유(WTI)', value: '—', change: '—', up: true, icon: 'ti-droplet-filled',   bg: '#1a1a2a', ic: '#7F77DD' },
  { name: '은',        value: '—', change: '—', up: true, icon: 'ti-medal',            bg: '#1e2626', ic: '#5DCAA5' },
  { name: 'BTC',       value: '—', change: '—', up: true, icon: 'ti-currency-bitcoin', bg: '#251a10', ic: '#EF9F27' },
];

const SEG_COLORS = ['#E24B4A', '#E2844A', '#EF9F27', '#7FBF9A', '#1D9E75'];
const SEGS = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 100]];

function getLevel(score) {
  if (score <= 20) return { label: 'PANIC', color: '#E24B4A' };
  if (score <= 40) return { label: 'COLD',  color: '#E2844A' };
  if (score <= 60) return { label: 'MILD',  color: '#EF9F27' };
  if (score <= 80) return { label: 'WARM',  color: '#1D9E75' };
  return               { label: 'BOOM',  color: '#0f7a5c' };
}

function getSummaryMsg(score) {
  if (score <= 20) return { emoji: '😱', text: 'PANIC 구간이에요. 지금은 시장을 멀리하고 현금을 지키세요.' };
  if (score <= 40) return { emoji: '😨', text: 'COLD 구간이에요. 오늘은 주식을 하면 위험한 날이에요.' };
  if (score <= 60) return { emoji: '😐', text: 'MILD 구간이에요. 신중하게 분할 매수 전략을 고려해보세요.' };
  if (score <= 80) return { emoji: '🤑', text: 'WARM 구간이에요. 시장이 달아오르고 있어요. 과열에 주의하세요.' };
  return               { emoji: '🚀', text: 'BOOM 구간이에요. 고점 신호일 수 있으니 분할 매도를 고려하세요.' };
}

function arcD(cx, cy, r, from, to) {
  const a1 = Math.PI * (1 - from / 100);
  const a2 = Math.PI * (1 - to / 100);
  const x1 = (cx + r * Math.cos(a1)).toFixed(2);
  const y1 = (cy - r * Math.sin(a1)).toFixed(2);
  const x2 = (cx + r * Math.cos(a2)).toFixed(2);
  const y2 = (cy - r * Math.sin(a2)).toFixed(2);
  const large = (to - from) > 50 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`;
}

function MiniGauge({ score }) {
  const cx = 44, cy = 40, r = 28;
  return (
    <svg width={88} height={48} viewBox="0 0 88 48">
      {SEGS.map(([f, t], i) => (
        <path key={i} d={arcD(cx, cy, r, f, t)} fill="none" stroke={SEG_COLORS[i] + '33'} strokeWidth={5} />
      ))}
      {SEGS.map(([f, t], i) => {
        if (score <= f) return null;
        return <path key={i} d={arcD(cx, cy, r, f, Math.min(score, t))} fill="none" stroke={SEG_COLORS[i]} strokeWidth={5} strokeLinecap="round" />;
      })}
    </svg>
  );
}

export default function MarketTab() {
  const [showPanicBoom,      setShowPanicBoom]      = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [bbScore,            setBbScore]            = useState(null);
  const [marketData,         setMarketData]         = useState(null);
  const [marketLoading,      setMarketLoading]      = useState(true);

  useEffect(() => {
    fetch('/api/boom-burst')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBbScore(d.compositeScore); })
      .catch(() => {});
    fetch('/api/market')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setMarketData(d); })
      .catch(() => {})
      .finally(() => setMarketLoading(false));
  }, []);

  if (showPanicBoom) return <PanicBoomScreen onBack={() => setShowPanicBoom(false)} />;

  if (selectedInstrument) {
    return (
      <InstrumentChartScreen
        instrumentKey={selectedInstrument.key}
        currentValue={selectedInstrument.value}
        currentChange={selectedInstrument.change}
        onBack={() => setSelectedInstrument(null)}
      />
    );
  }

  const score   = bbScore ?? 50;
  const { label, color } = getLevel(score);
  const msg     = getSummaryMsg(score);
  const indices = marketData?.indices     ?? FALLBACK_INDICES;
  const fx      = marketData?.fx          ?? FALLBACK_FX;
  const commod  = marketData?.commodities ?? FALLBACK_COMMODITIES;

  return (
    <div className="tab-wrap">

      {/* ① 공포·탐욕 지수 (최상단) */}
      <button style={S.fgCard} onClick={() => setShowPanicBoom(true)}>
        <div style={S.fgLeft}>
          <div style={S.fgTopRow}>
            <span style={S.fgTag}>BOOM-BURST 지수</span>
            <i className="ti ti-chevron-right" style={{ color: '#444', fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginTop: 8 }}>
            {bbScore === null
              ? <span style={{ fontSize: 22, color: '#444' }}>로딩 중…</span>
              : <>
                  <span style={{ fontSize: 38, fontWeight: 500, color, lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: 15, color, marginBottom: 3 }}>{label}</span>
                </>
            }
          </div>
          <div style={S.fgSub}>실시간 FRED 데이터 · 탭해서 상세보기</div>
        </div>
        <MiniGauge score={score} />
      </button>

      {/* 한 줄 요약 */}
      {bbScore !== null && (
        <div style={{ ...S.msgCard, borderColor: color + '44' }}>
          <span style={S.msgEmoji}>{msg.emoji}</span>
          <span style={S.msgText}>{msg.text}</span>
        </div>
      )}

      {/* ② 주요 지수 */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>주요 지수</span>
          <span style={S.cardSub}>{marketLoading ? '로딩 중…' : '15분 지연 · 탭해서 차트 보기'}</span>
        </div>
        {indices.map((idx, i) => (
          <button
            key={i}
            style={{ ...S.listRow, borderBottom: i < indices.length - 1 ? '0.5px solid #151520' : 'none' }}
            onClick={() => setSelectedInstrument({ key: idx.name, value: idx.value, change: idx.change })}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.listName}>{idx.name}</div>
              <div style={S.summary}>{idx.summary || '데이터 로딩 중…'}</div>
            </div>
            <div style={S.listRight}>
              <span style={S.listValue}>{idx.value}</span>
              <span style={{ ...S.listChange, color: idx.up ? '#1D9E75' : '#E24B4A' }}>
                {idx.value !== '—' ? (idx.up ? '▲' : '▼') : ''} {idx.change}
              </span>
            </div>
            <i className="ti ti-chevron-right" style={S.rowChevron} />
          </button>
        ))}
      </div>

      {/* ③ 환율 */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>환율</span>
          <span style={S.cardSub}>KRW 기준 · 탭해서 차트 보기</span>
        </div>
        {fx.map((f, i) => (
          <button
            key={i}
            style={{ ...S.fxRow, borderBottom: i < fx.length - 1 ? '0.5px solid #151520' : 'none' }}
            onClick={() => setSelectedInstrument({ key: f.pair, value: f.value, change: f.change })}
          >
            <span style={S.fxFlag}>{f.flag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.fxPair}>{f.pair}</div>
              {f.country && <div style={S.fxCountry}>{f.country}</div>}
            </div>
            <div style={S.fxRight}>
              <span style={S.fxValue}>{f.value}</span>
              <span style={{ ...S.fxChange, color: f.up ? '#1D9E75' : '#E24B4A' }}>
                {f.value !== '—' ? (f.up ? '▲' : '▼') : ''} {f.change}
              </span>
            </div>
            <i className="ti ti-chart-line" style={{ fontSize: 11, color: '#333', marginLeft: 6 }} />
          </button>
        ))}
      </div>

      {/* ④ 원자재 */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>원자재</span>
          <span style={S.cardSub}>USD 기준 · 탭해서 차트 보기</span>
        </div>
        {commod.map((c, i) => (
          <button
            key={i}
            style={{ ...S.listRow, borderBottom: i < commod.length - 1 ? '0.5px solid #151520' : 'none' }}
            onClick={() => setSelectedInstrument({ key: c.name, value: c.value, change: c.change })}
          >
            <div style={{ ...S.commodIc, background: c.bg, marginRight: 10, flexShrink: 0 }}>
              <i className={`ti ${c.icon}`} style={{ color: c.ic, fontSize: 14 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.listName}>{c.name}</div>
              <div style={S.summary}>{c.summary || '데이터 로딩 중…'}</div>
            </div>
            <div style={S.listRight}>
              <span style={S.listValue}>{c.value}</span>
              <span style={{ ...S.listChange, color: c.up ? '#1D9E75' : '#E24B4A' }}>
                {c.value !== '—' ? (c.up ? '▲' : '▼') : ''} {c.change}
              </span>
            </div>
            <i className="ti ti-chevron-right" style={S.rowChevron} />
          </button>
        ))}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}

const S = {
  card: { background: '#181820', borderRadius: 14, overflow: 'visible' },
  cardHeader: { padding: '10px 14px', borderBottom: '0.5px solid #151520', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '14px 14px 0 0' },
  cardTitle: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  cardSub: { fontSize: 9, color: '#444' },

  // ── 세로 리스트 공통 행 ──
  listRow: {
    display: 'flex', alignItems: 'center',
    padding: '10px 14px', gap: 8,
    width: '100%', background: 'transparent', border: 'none',
    textAlign: 'left', cursor: 'pointer',
  },
  listName:    { fontSize: 13, fontWeight: 500, color: '#ccc', display: 'block' },
  summary:     { fontSize: 10, color: '#888', marginTop: 3, lineHeight: 1.4 },
  listValue:   { fontSize: 15, fontWeight: 600, color: '#fff' },
  listChange:  { fontSize: 11, marginTop: 2 },
  listRight:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  rowChevron:  { fontSize: 11, color: '#333', flexShrink: 0, marginLeft: 4 },

  fxRow: { display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 10, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' },
  fxFlag: { fontSize: 18, flexShrink: 0 },
  fxPair:    { fontSize: 12, color: '#ccc', display: 'block' },
  fxCountry: { fontSize: 9,  color: '#555', marginTop: 2 },
  fxRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  fxValue: { fontSize: 14, fontWeight: 500, color: '#fff' },
  fxChange: { fontSize: 10 },

  commodIc: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  fgCard: {
    background: 'linear-gradient(135deg, #1c1c2e 0%, #181820 100%)',
    border: '0.5px solid #2a2a45', borderRadius: 14, padding: '14px 14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer', width: '100%', textAlign: 'left',
  },
  fgLeft: { flex: 1 },
  fgTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  fgTag: { fontSize: 10, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' },
  fgSub: { fontSize: 10, color: '#444', marginTop: 7 },

  msgCard: {
    background: '#181820', borderRadius: 12, padding: '12px 14px',
    display: 'flex', alignItems: 'flex-start', gap: 10,
    border: '0.5px solid',
  },
  msgEmoji: { fontSize: 20, flexShrink: 0, lineHeight: 1.3 },
  msgText: { fontSize: 12, color: '#ccc', lineHeight: 1.6 },
};
