"use client";

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── 데이터 ───────────────────────────────────
const SCORE = 62;
const PREV_SCORE = 58;
const MONTH_AGO = 52;

const INDICATORS = [
  {
    category: '금융 지표',
    icon: 'ti-chart-line',
    items: [
      { name: 'VIX 변동성지수',  value: '18.4',     note: '낮을수록 탐욕',      level: 'greed'   },
      { name: '하이일드 스프레드', value: '3.24%',    note: '낮을수록 탐욕',      level: 'neutral' },
      { name: '장단기 금리차',    value: '+0.42%p',  note: '양수 = 정상 수익률곡선', level: 'greed' },
      { name: '외국인 순매수',    value: '+2,340억', note: '5거래일 누적',       level: 'greed'   },
    ],
  },
  {
    category: '경기 지표',
    icon: 'ti-building-factory',
    items: [
      { name: '제조업 PMI',      value: '51.8',   note: '50 초과 = 확장 국면',     level: 'greed'   },
      { name: '소비자심리지수',   value: '103.2',  note: '100 = 장기 평균',        level: 'neutral' },
      { name: '실업률',          value: '3.2%',   note: '낮을수록 경기 호황',      level: 'greed'   },
      { name: '기업이익 증가율',  value: '+8.3%',  note: 'YoY · S&P500 기준',     level: 'greed'   },
    ],
  },
  {
    category: '특별 사이클',
    icon: 'ti-refresh',
    items: [
      { name: '버핏 지수',    value: '178%',  note: '시총 ÷ GDP · 100% 초과 과열', level: 'fear'    },
      { name: '실러 CAPE',   value: '34.2x', note: '역사적 평균 16x',            level: 'fear'    },
      { name: 'M2 증가율',   value: '+4.1%', note: 'YoY 통화공급 증가',          level: 'neutral' },
    ],
  },
];

const CHART_DATA = {
  '1년': {
    labels: ['5월','6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월','5월'],
    values: [57, 60, 63, 65, 62, 55, 52, 58, 60, 62, 65, 68, 62],
  },
  '3년': {
    labels: ["'23Q2","'23Q3","'23Q4","'24Q1","'24Q2","'24Q3","'24Q4","'25Q1","'25Q2","'25Q3","'25Q4","'26Q1","'26Q2"],
    values: [55, 52, 62, 68, 65, 55, 52, 58, 60, 62, 58, 62, 62],
  },
  '5년': {
    labels: ["'21Q2","'21Q3","'21Q4","'22Q1","'22Q2","'22Q3","'22Q4","'23Q1","'23Q2","'23Q3","'23Q4","'24Q1","'24Q2","'24Q3","'24Q4","'25Q1","'25Q2","'25Q3","'25Q4","'26Q1","'26Q2"],
    values: [82, 78, 72, 45, 22, 30, 38, 48, 55, 52, 62, 68, 65, 55, 52, 58, 60, 62, 58, 62, 62],
  },
  '전체': {
    labels: ["'16Q1","'16Q3","'17Q1","'17Q3","'18Q1","'18Q3","'18Q4","'19Q2","'19Q4","'20Q1","'20Q2","'20Q4","'21Q2","'21Q4","'22Q2","'22Q4","'23Q2","'23Q4","'24Q2","'24Q4","'25Q2","'25Q4","'26Q2"],
    values: [45, 52, 65, 72, 78, 55, 28, 62, 68, 12, 38, 65, 82, 72, 22, 38, 55, 62, 65, 52, 60, 58, 62],
  },
};

const ZONE_COLORS = [
  { from: 0,  to: 20,  color: '#E24B4A', label: '극단적 공포' },
  { from: 20, to: 40,  color: '#E2844A', label: '공포'       },
  { from: 40, to: 60,  color: '#EF9F27', label: '중립'       },
  { from: 60, to: 80,  color: '#1D9E75', label: '탐욕'       },
  { from: 80, to: 100, color: '#0f7a5c', label: '극단적 탐욕' },
];

const SEG_COLORS = ZONE_COLORS.map((z) => z.color);
const SEGS = ZONE_COLORS.map((z) => [z.from, z.to]);
const PERIODS = ['1년', '3년', '5년', '전체'];

// ─── 유틸 ───────────────────────────────────
function getLevel(score) {
  return ZONE_COLORS.findLast((z) => score >= z.from) ?? ZONE_COLORS[0];
}

function getLevelBadge(level) {
  switch (level) {
    case 'fear':    return { label: '공포', color: '#E24B4A', bg: '#2a1010' };
    case 'neutral': return { label: '중립', color: '#EF9F27', bg: '#2a2010' };
    case 'greed':   return { label: '탐욕', color: '#1D9E75', bg: '#0a2a18' };
    default:        return { label: '–',    color: '#555',    bg: '#222'    };
  }
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

// ─── 게이지 SVG ────────────────────────────
function Gauge({ score }) {
  const cx = 130, cy = 118, r = 92, sw = 14;
  const { color } = getLevel(score);

  const needleAngle = Math.PI * (1 - score / 100);
  const nx = (cx + (r - 16) * Math.cos(needleAngle)).toFixed(2);
  const ny = (cy - (r - 16) * Math.sin(needleAngle)).toFixed(2);

  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%' }}>
      {/* 트랙 (흐린 배경) */}
      {SEGS.map(([f, t], i) => (
        <path key={i} d={arcD(cx, cy, r, f, t)} fill="none" stroke={SEG_COLORS[i] + '2a'} strokeWidth={sw} />
      ))}
      {/* 채워진 아크 */}
      {SEGS.map(([f, t], i) => {
        if (score <= f) return null;
        return (
          <path
            key={i}
            d={arcD(cx, cy, r, f, Math.min(score, t))}
            fill="none"
            stroke={SEG_COLORS[i]}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        );
      })}
      {/* 내부 트랙 테두리 */}
      <path d={arcD(cx, cy, r - sw / 2 - 2, 0, 100)} fill="none" stroke="#1a1a26" strokeWidth={1} />
      {/* 바늘 */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
      <circle cx={cx} cy={cy} r={6}   fill="#ffffff" opacity={0.9} />
      <circle cx={cx} cy={cy} r={3.5} fill="#0f1117" />
      {/* 점수 텍스트 */}
      <text x={cx} y={cy - 30} textAnchor="middle" fill="#ffffff" fontSize="34" fontWeight="500" letterSpacing="-1">{score}</text>
      <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize="12">{getLevel(score).label}</text>
      {/* 끝단 레이블 */}
      <text x={18}  y={cy + 18} textAnchor="middle" fill={SEG_COLORS[0]} fontSize="8.5">극단적</text>
      <text x={18}  y={cy + 28} textAnchor="middle" fill={SEG_COLORS[0]} fontSize="8.5">공포</text>
      <text x={242} y={cy + 18} textAnchor="middle" fill={SEG_COLORS[4]} fontSize="8.5">극단적</text>
      <text x={242} y={cy + 28} textAnchor="middle" fill={SEG_COLORS[4]} fontSize="8.5">탐욕</text>
    </svg>
  );
}

// ─── 히스토리컬 차트 ──────────────────────
function HistoryChart({ period }) {
  const { labels, values } = CHART_DATA[period];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: '#7F77DD',
        borderWidth: 2,
        pointRadius: values.length > 15 ? 0 : 3,
        pointBackgroundColor: '#7F77DD',
        pointBorderColor: '#181820',
        pointBorderWidth: 1.5,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const { chartArea, ctx: c } = ctx.chart;
          if (!chartArea) return '#7F77DD11';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, '#7F77DD44');
          g.addColorStop(1, '#7F77DD00');
          return g;
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => `패닉-붐: ${ctx.parsed.y}` },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
        grid: { display: false },
        border: { color: '#2a2a35' },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          font: { size: 9 },
          color: '#555',
          stepSize: 20,
          callback: (v) => v,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: '#2a2a35' },
      },
    },
  };

  return (
    <div style={{ height: 130, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────
export default function PanicBoomScreen({ onBack }) {
  const [period, setPeriod] = useState('1년');
  const { color } = getLevel(SCORE);
  const diff = SCORE - PREV_SCORE;

  return (
    <div style={S.wrap}>

      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" />
          시장지표
        </button>
        <span style={S.headerTitle}>패닉 · 붐 지수</span>
        <div style={{ width: 64 }} />
      </div>

      <div style={S.scroll}>

        {/* 게이지 카드 */}
        <div style={S.gaugeCard}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
            <Gauge score={SCORE} />
          </div>
          <div style={S.scoreSummary}>
            <div style={S.summaryCell}>
              <div style={S.summaryLabel}>종합 점수</div>
              <div style={{ ...S.summaryValue, color }}>{SCORE}<span style={{ fontSize: 11, color: '#444', fontWeight: 400 }}>/100</span></div>
            </div>
            <div style={S.summaryDivider} />
            <div style={S.summaryCell}>
              <div style={S.summaryLabel}>전일 대비</div>
              <div style={{ ...S.summaryValue, color: diff >= 0 ? '#1D9E75' : '#E24B4A' }}>
                {diff >= 0 ? '+' : ''}{diff}<span style={{ fontSize: 11, fontWeight: 400 }}>pt</span>
              </div>
            </div>
            <div style={S.summaryDivider} />
            <div style={S.summaryCell}>
              <div style={S.summaryLabel}>1개월 전</div>
              <div style={{ ...S.summaryValue, color: '#7F77DD' }}>{MONTH_AGO}</div>
            </div>
          </div>
        </div>

        {/* 존 범례 */}
        <div style={S.legendRow}>
          {ZONE_COLORS.map((z, i) => (
            <div key={i} style={S.legendItem}>
              <div style={{ ...S.legendDot, background: z.color }} />
              <span style={S.legendLabel}>{z.label}</span>
            </div>
          ))}
        </div>

        {/* 세부 지표 카테고리 */}
        {INDICATORS.map((section, si) => (
          <div key={si} style={S.indCard}>
            <div style={S.indHeader}>
              <i className={`ti ${section.icon}`} style={{ color: '#7F77DD', fontSize: 13, marginRight: 6 }} />
              <span style={S.indTitle}>{section.category}</span>
            </div>
            {section.items.map((item, ii) => {
              const badge = getLevelBadge(item.level);
              return (
                <div
                  key={ii}
                  style={{
                    ...S.indRow,
                    borderBottom: ii < section.items.length - 1 ? '0.5px solid #151520' : 'none',
                  }}
                >
                  <div style={S.indLeft}>
                    <div style={S.indName}>{item.name}</div>
                    <div style={S.indNote}>{item.note}</div>
                  </div>
                  <div style={S.indRight}>
                    <div style={S.indValue}>{item.value}</div>
                    <div style={{ ...S.indBadge, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 히스토리컬 차트 */}
        <div style={S.chartCard}>
          <div style={S.chartHeader}>
            <span style={S.indTitle}>히스토리컬 차트</span>
            <div style={S.periodRow}>
              {PERIODS.map((p) => (
                <button
                  key={p}
                  style={{ ...S.pBtn, ...(period === p ? S.pBtnActive : {}) }}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <HistoryChart period={period} />
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', background: '#0f1117', height: '100%' },
  header: {
    padding: '10px 14px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0,
  },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: '#fff' },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 },

  gaugeCard: { background: '#181820', borderRadius: 14, padding: '14px 14px 16px' },
  scoreSummary: { display: 'flex', justifyContent: 'space-around', marginTop: 14, borderTop: '0.5px solid #1e1e28', paddingTop: 14 },
  summaryCell: { textAlign: 'center', flex: 1 },
  summaryDivider: { width: 1, background: '#1e1e28', alignSelf: 'stretch' },
  summaryLabel: { fontSize: 10, color: '#555', marginBottom: 5 },
  summaryValue: { fontSize: 18, fontWeight: 500 },

  legendRow: { display: 'flex', flexWrap: 'wrap', gap: '6px 10px', paddingLeft: 2 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: '50%' },
  legendLabel: { fontSize: 9, color: '#555' },

  indCard: { background: '#181820', borderRadius: 12, overflow: 'hidden' },
  indHeader: { padding: '10px 14px', borderBottom: '0.5px solid #151520', display: 'flex', alignItems: 'center' },
  indTitle: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  indRow: { display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10 },
  indLeft: { flex: 1 },
  indName: { fontSize: 12, color: '#ccc' },
  indNote: { fontSize: 9, color: '#3a3a4a', marginTop: 2 },
  indRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  indValue: { fontSize: 13, fontWeight: 500, color: '#fff' },
  indBadge: { fontSize: 9, padding: '2px 8px', borderRadius: 5 },

  chartCard: { background: '#181820', borderRadius: 12, padding: 14 },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  periodRow: { display: 'flex', gap: 4 },
  pBtn: { fontSize: 10, padding: '3px 10px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  pBtnActive: { background: '#EEEDFE', color: '#3C3489', border: 'none' },
};
