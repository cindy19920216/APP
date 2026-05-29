"use client";

import React, { useState } from 'react';
import PanicBoomScreen from './PanicBoomScreen';
import InstrumentChartScreen from './InstrumentChartScreen';

const FEAR_GREED = { score: 62, prev: 58 };

const INDICES = [
  { name: 'KOSPI',   value: '2,748.32',  change: '+0.84%', up: true  },
  { name: 'KOSDAQ',  value: '854.17',    change: '-0.23%', up: false },
  { name: 'S&P500',  value: '5,304.72',  change: '+0.51%', up: true  },
  { name: 'NASDAQ',  value: '16,920.80', change: '+0.73%', up: true  },
];

const FX = [
  { pair: 'USD / KRW', value: '1,378.50', change: '-2.30', up: false, flag: '🇺🇸' },
  { pair: 'JPY / KRW', value: '9.14',     change: '+0.08', up: true,  flag: '🇯🇵' },
  { pair: 'CNY / KRW', value: '189.72',   change: '-0.45', up: false, flag: '🇨🇳' },
];

const COMMODITIES = [
  { name: '금',       value: '$2,338', change: '+0.42%', up: true,  icon: 'ti-coin',             bg: '#2a2010', ic: '#EF9F27' },
  { name: '원유(WTI)', value: '$78.24', change: '-1.12%', up: false, icon: 'ti-droplet-filled',   bg: '#1a1a2a', ic: '#7F77DD' },
  { name: '은',       value: '$29.87', change: '+0.88%', up: true,  icon: 'ti-medal',            bg: '#1e2626', ic: '#5DCAA5' },
  { name: 'BTC',      value: '$68,420',change: '+2.34%', up: true,  icon: 'ti-currency-bitcoin', bg: '#251a10', ic: '#EF9F27' },
];

const SEG_COLORS = ['#E24B4A', '#E2844A', '#EF9F27', '#7FBF9A', '#1D9E75'];
const SEGS = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 100]];

function getLevel(score) {
  if (score <= 20) return { label: '극단적 공포', color: '#E24B4A' };
  if (score <= 40) return { label: '공포',        color: '#E2844A' };
  if (score <= 60) return { label: '중립',        color: '#EF9F27' };
  if (score <= 80) return { label: '탐욕',        color: '#1D9E75' };
  return               { label: '극단적 탐욕',   color: '#0f7a5c' };
}

function getSummaryMsg(score) {
  if (score <= 20) return { emoji: '😱', text: '극단적 공포 구간이에요. 지금은 시장을 멀리하고 현금을 지키세요.' };
  if (score <= 40) return { emoji: '😨', text: '공포 구간이에요. 오늘은 주식을 하면 위험한 날이에요.' };
  if (score <= 60) return { emoji: '😐', text: '중립 구간이에요. 신중하게 분할 매수 전략을 고려해보세요.' };
  if (score <= 80) return { emoji: '🤑', text: '탐욕 구간이에요. 시장이 달아오르고 있어요. 과열에 주의하세요.' };
  return               { emoji: '🚀', text: '극단적 탐욕이에요. 고점 신호일 수 있으니 분할 매도를 고려하세요.' };
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
  const [showPanicBoom,     setShowPanicBoom]     = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null); // { key, value, change }

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

  const { label, color } = getLevel(FEAR_GREED.score);
  const diff = FEAR_GREED.score - FEAR_GREED.prev;
  const msg  = getSummaryMsg(FEAR_GREED.score);

  return (
    <div style={S.wrap}>

      {/* ① 공포·탐욕 지수 (최상단) */}
      <button style={S.fgCard} onClick={() => setShowPanicBoom(true)}>
        <div style={S.fgLeft}>
          <div style={S.fgTopRow}>
            <span style={S.fgTag}>공포 · 탐욕 지수</span>
            <i className="ti ti-chevron-right" style={{ color: '#444', fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginTop: 8 }}>
            <span style={{ fontSize: 38, fontWeight: 500, color, lineHeight: 1 }}>{FEAR_GREED.score}</span>
            <span style={{ fontSize: 15, color, marginBottom: 3 }}>{label}</span>
          </div>
          <div style={S.fgSub}>
            전일 대비 <span style={{ color: diff >= 0 ? '#1D9E75' : '#E24B4A' }}>{diff >= 0 ? '+' : ''}{diff}pt</span>
            &nbsp;· 탭해서 상세보기
          </div>
        </div>
        <MiniGauge score={FEAR_GREED.score} />
      </button>

      {/* 오늘의 한 줄 요약 */}
      <div style={{ ...S.msgCard, borderColor: color + '44' }}>
        <span style={S.msgEmoji}>{msg.emoji}</span>
        <span style={S.msgText}>{msg.text}</span>
      </div>

      {/* ② 주요 지수 (클릭 → 차트) */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>주요 지수</span>
          <span style={S.cardSub}>15분 지연 · 탭해서 차트 보기</span>
        </div>
        <div style={S.grid2}>
          {INDICES.map((idx, i) => (
            <button
              key={i}
              style={{
                ...S.indexCell,
                borderRight:  i % 2 === 0 ? '0.5px solid #151520' : 'none',
                borderBottom: i < 2       ? '0.5px solid #151520' : 'none',
              }}
              onClick={() => setSelectedInstrument({ key: idx.name, value: idx.value, change: idx.change })}
            >
              <div style={S.indexName}>{idx.name}</div>
              <div style={S.indexValue}>{idx.value}</div>
              <div style={{ ...S.indexChange, color: idx.up ? '#1D9E75' : '#E24B4A' }}>
                {idx.up ? '▲' : '▼'} {idx.change}
              </div>
              <i className="ti ti-chart-line" style={{ fontSize: 9, color: '#333', marginTop: 4 }} />
            </button>
          ))}
        </div>
      </div>

      {/* ② 환율 (클릭 → 차트) */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>환율</span>
          <span style={S.cardSub}>KRW 기준 · 탭해서 차트 보기</span>
        </div>
        {FX.map((f, i) => (
          <button
            key={i}
            style={{
              ...S.fxRow,
              borderBottom: i < FX.length - 1 ? '0.5px solid #151520' : 'none',
            }}
            onClick={() => setSelectedInstrument({ key: f.pair, value: f.value, change: (f.up ? '+' : '') + f.change })}
          >
            <span style={S.fxFlag}>{f.flag}</span>
            <span style={S.fxPair}>{f.pair}</span>
            <div style={S.fxRight}>
              <span style={S.fxValue}>{f.value}</span>
              <span style={{ ...S.fxChange, color: f.up ? '#1D9E75' : '#E24B4A' }}>
                {f.up ? '▲' : '▼'} {f.change}
              </span>
            </div>
            <i className="ti ti-chart-line" style={{ fontSize: 11, color: '#333', marginLeft: 6 }} />
          </button>
        ))}
      </div>

      {/* ③ 원자재 (클릭 → 차트) */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>원자재</span>
          <span style={S.cardSub}>USD 기준 · 탭해서 차트 보기</span>
        </div>
        <div style={S.grid2}>
          {COMMODITIES.map((c, i) => (
            <button
              key={i}
              style={{
                ...S.commodCell,
                borderRight:  i % 2 === 0 ? '0.5px solid #151520' : 'none',
                borderBottom: i < 2       ? '0.5px solid #151520' : 'none',
              }}
              onClick={() => setSelectedInstrument({ key: c.name, value: c.value, change: c.change })}
            >
              <div style={{ ...S.commodIc, background: c.bg }}>
                <i className={`ti ${c.icon}`} style={{ color: c.ic, fontSize: 15 }} />
              </div>
              <div style={S.commodName}>{c.name}</div>
              <div style={S.commodValue}>{c.value}</div>
              <div style={{ ...S.commodChange, color: c.up ? '#1D9E75' : '#E24B4A' }}>
                {c.up ? '▲' : '▼'} {c.change}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}

const S = {
  wrap: { padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, minHeight: 0 },

  card: { background: '#181820', borderRadius: 14, overflow: 'hidden' },
  cardHeader: { padding: '10px 14px', borderBottom: '0.5px solid #151520', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  cardSub: { fontSize: 9, color: '#444' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr' },
  indexCell: { padding: '12px 14px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' },
  indexName: { fontSize: 10, color: '#555', marginBottom: 4 },
  indexValue: { fontSize: 14, fontWeight: 500, color: '#fff' },
  indexChange: { fontSize: 10, marginTop: 3 },

  fxRow: { display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 10, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' },
  fxFlag: { fontSize: 18, flexShrink: 0 },
  fxPair: { flex: 1, fontSize: 12, color: '#ccc' },
  fxRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  fxValue: { fontSize: 14, fontWeight: 500, color: '#fff' },
  fxChange: { fontSize: 10 },

  commodCell: { padding: '12px 14px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' },
  commodIc: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  commodName: { fontSize: 10, color: '#555', marginBottom: 2 },
  commodValue: { fontSize: 14, fontWeight: 500, color: '#fff' },
  commodChange: { fontSize: 10, marginTop: 2 },

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
