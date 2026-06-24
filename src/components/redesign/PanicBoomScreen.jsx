"use client";

import React, { useState, useEffect } from 'react';
import IndicatorDetailScreen from './IndicatorDetailScreen';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── 상수 ────────────────────────────────────────────────
// COMPOSITE_BOUNDS = [31, 47, 59, 68] (step4_check_dist 기준)
const ZONE_COLORS = [
  { from: 0,  to: 31, color: '#E24B4A', label: '위기' },
  { from: 31, to: 47, color: '#E2844A', label: '둔화' },
  { from: 47, to: 59, color: '#EF9F27', label: '중립' },
  { from: 59, to: 68, color: '#1D9E75', label: '호조' },
  { from: 68, to: 100, color: '#0f7a5c', label: '과열' },
];
const SEG_COLORS = ZONE_COLORS.map(z => z.color);
const SEGS       = ZONE_COLORS.map(z => [z.from, z.to]);
const PERIODS    = ['1년', '3년', '5년', '전체'];

const STATUS_COLORS = {
  '과열': '#22c55e',
  '호조': '#84cc16',
  '중립': '#eab308',
  '둔화': '#f97316',
  '위기': '#ef4444',
};
const STATUS_BG = {
  '과열': '#0a2a10',
  '호조': '#1a2a05',
  '중립': '#2a2000',
  '둔화': '#2a1500',
  '위기': '#2a0808',
};

// ─── 유틸 ────────────────────────────────────────────────
function getZone(score) {
  return ZONE_COLORS.findLast(z => score >= z.from) ?? ZONE_COLORS[0];
}


function getSummaryMsg(score) {
  if (score <= 31) return { emoji: '😱', text: '위기 구간이에요. 시장을 멀리하고 현금을 지키세요.' };
  if (score <= 47) return { emoji: '😨', text: '둔화 구간이에요. 신중한 접근이 필요한 시점입니다.' };
  if (score <= 59) return { emoji: '😐', text: '중립 구간이에요. 신중하게 분할 매수 전략을 고려해보세요.' };
  if (score <= 68) return { emoji: '🤑', text: '호조 구간이에요. 시장이 달아오르고 있어요. 과열에 주의하세요.' };
  return               { emoji: '🚀', text: '과열 구간이에요. 고점 신호일 수 있으니 분할 매도를 고려하세요.' };
}

function arcD(cx, cy, r, from, to) {
  const a1 = Math.PI * (1 - from / 100);
  const a2 = Math.PI * (1 - to / 100);
  const x1 = (cx + r * Math.cos(a1)).toFixed(2);
  const y1 = (cy - r * Math.sin(a1)).toFixed(2);
  const x2 = (cx + r * Math.cos(a2)).toFixed(2);
  const y2 = (cy - r * Math.sin(a2)).toFixed(2);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${(to - from) > 50 ? 1 : 0} 0 ${x2} ${y2}`;
}

// ─── 게이지 SVG ──────────────────────────────────────────
function Gauge({ score }) {
  const cx = 130, cy = 104, r = 76, sw = 11;
  const { color } = getZone(score);
  const angle = Math.PI * (1 - score / 100);
  const nx = (cx + (r - 13) * Math.cos(angle)).toFixed(2);
  const ny = (cy - (r - 13) * Math.sin(angle)).toFixed(2);

  return (
    <svg viewBox="0 0 260 120" style={{ width: '100%' }}>
      {SEGS.map(([f, t], i) => (
        <path key={i} d={arcD(cx, cy, r, f, t)} fill="none" stroke={SEG_COLORS[i] + '2a'} strokeWidth={sw} />
      ))}
      {SEGS.map(([f, t], i) => {
        if (score <= f) return null;
        return <path key={i} d={arcD(cx, cy, r, f, Math.min(score, t))} fill="none" stroke={SEG_COLORS[i]} strokeWidth={sw} strokeLinecap="round" />;
      })}
      <path d={arcD(cx, cy, r - sw / 2 - 2, 0, 100)} fill="none" stroke="#1a1a26" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      <circle cx={cx} cy={cy} r={5}   fill="#fff" opacity={0.9} />
      <circle cx={cx} cy={cy} r={3}   fill="#0f1117" />
      <text x={cx} y={cy - 24} textAnchor="middle" fill="#fff"  fontSize="30" fontWeight="500" letterSpacing="-1">{score}</text>
      <text x={cx} y={cy - 7}  textAnchor="middle" fill={color} fontSize="11">{getZone(score).label}</text>
      <text x={8}   y={cy + 13} textAnchor="start" fill={SEG_COLORS[0]} fontSize="9" fontWeight="700">위기</text>
      <text x={252} y={cy + 13} textAnchor="end"   fill={SEG_COLORS[4]} fontSize="9" fontWeight="700">과열</text>
    </svg>
  );
}

// ─── 히스토리 차트 임계선 라벨 플러그인 ─────────────────
const histZoneLabelPlugin = {
  id: 'histZoneLabels',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea: ca } = chart;
    if (!ca) return;
    chart.data.datasets.forEach((ds, i) => {
      if (!ds._zoneLabel) return;
      const meta = chart.getDatasetMeta(i);
      if (!meta.data.length) return;
      const y = meta.data[meta.data.length - 1]?.y;
      if (y == null || y < ca.top || y > ca.bottom) return;
      ctx.save();
      ctx.fillStyle = ds._zoneColor;
      ctx.font = '700 8px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(ds._zoneLabel, ca.right - 2, y - 3);
      ctx.restore();
    });
  },
};

// ─── 히스토리 차트 ───────────────────────────────────────
function HistoryChart({ chartData, period }) {
  const cutMap = { '1년': 12, '3년': 36, '5년': 60, '전체': 9999 };
  const sliced = chartData.slice(-(cutMap[period] ?? 9999));

  const step   = Math.ceil(sliced.length / 7);
  const labels = sliced.map((d, i) => i % step === 0 ? d.label.slice(0, 7) : '');
  const values = sliced.map(d => d.value);

  // 패닉-붐 구간 임계선 (COMPOSITE_BOUNDS 기준)
  const threshLines = [
    { y: 31, label: '둔화', color: SEG_COLORS[1] },
    { y: 47, label: '중립', color: SEG_COLORS[2] },
    { y: 59, label: '호조', color: SEG_COLORS[3] },
    { y: 68, label: '과열', color: SEG_COLORS[4] },
  ];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: '#7F77DD',
        borderWidth: 2,
        pointRadius: values.length > 30 ? 0 : 3,
        pointBackgroundColor: '#7F77DD',
        tension: 0.4,
        fill: true,
        order: 1,
        backgroundColor: (ctx) => {
          const { chartArea, ctx: c } = ctx.chart;
          if (!chartArea) return '#7F77DD11';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, '#7F77DD44');
          g.addColorStop(1, '#7F77DD00');
          return g;
        },
      },
      ...threshLines.map(t => ({
        data:        sliced.map(() => t.y),
        borderColor: t.color + 'bb',
        borderWidth: 1,
        borderDash:  [5, 3],
        pointRadius: 0,
        fill:        false,
        tension:     0,
        order:       2,
        _zoneLabel:  t.label,
        _zoneColor:  t.color,
      })),
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ctx.datasetIndex > 0 ? null : `패닉-붐 지수: ${ctx.parsed.y.toFixed(1)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: false },
        grid: { display: false },
        border: { color: '#2a2a35' },
      },
      y: {
        min: 0, max: 100,
        ticks: { font: { size: 9 }, color: '#555', stepSize: 20 },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: '#2a2a35' },
      },
    },
  };

  return (
    <div style={{ height: 150, position: 'relative' }}>
      <Line data={data} options={options} plugins={[histZoneLabelPlugin]} />
    </div>
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: '#1e1e28', animation: 'pulse 1.5s ease-in-out infinite' }} />;
}

// ─── 메인 ────────────────────────────────────────────────
export default function PanicBoomScreen({ onBack }) {
  const [period,            setPeriod]            = useState('전체');
  const [apiData,           setApiData]           = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);

  useEffect(() => {
    fetch('/api/boom-burst')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(d => { setApiData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const score = apiData?.compositeScore ?? 50;
  const { color } = getZone(score);
  const msg = getSummaryMsg(score);

  if (selectedIndicator) {
    return (
      <IndicatorDetailScreen
        item={selectedIndicator}
        onBack={() => setSelectedIndicator(null)}
      />
    );
  }

  return (
    <div style={S.wrap}>
      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" /> 시장지표
        </button>
        <span style={S.headerTitle}>패닉-붐 경기 사이클 지수</span>
        <div style={{ width: 64 }} />
      </div>

      <div style={S.scroll}>
        <div style={S.scrollContent}>

          {/* 게이지 카드 */}
          <div style={S.gaugeCard}>
            {loading ? (
              <div style={{ padding: 20 }}>
                <Skeleton h={120} r={12} />
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-around' }}>
                  {[0,1,2].map(i => <Skeleton key={i} h={40} w={70} r={8} />)}
                </div>
              </div>
            ) : error ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#E24B4A', fontSize: 12 }}>
                데이터 로드 실패: {error}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                  <Gauge score={score} />
                </div>
                <div style={S.scoreSummary}>
                  <div style={S.summaryCell}>
                    <div style={S.summaryLabel}>종합 점수</div>
                    <div style={{ ...S.summaryValue, color }}>
                      {score}<span style={{ fontSize: 11, color: '#444', fontWeight: 400 }}>/100</span>
                    </div>
                  </div>
                  <div style={S.summaryDivider} />
                  <div style={S.summaryCell}>
                    <div style={S.summaryLabel}>구성 지표</div>
                    <div style={{ ...S.summaryValue, color: '#7F77DD' }}>
                      {apiData?.indicators?.reduce((a, c) => a + c.items.length, 0) ?? 0}
                      <span style={{ fontSize: 11, fontWeight: 400 }}>개</span>
                    </div>
                  </div>
                  <div style={S.summaryDivider} />
                  <div style={S.summaryCell}>
                    <div style={S.summaryLabel}>기준일</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {apiData?.updatedAt ?? '-'}
                    </div>
                  </div>
                </div>
              </>
            )}
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

          {/* 요약 메시지 */}
          {!loading && !error && (
            <div style={{ ...S.msgCard, borderColor: color + '44' }}>
              <span style={S.msgEmoji}>{msg.emoji}</span>
              <span style={S.msgText}>{msg.text}</span>
            </div>
          )}

          {/* 히스토리컬 차트 */}
          <div style={S.chartCard}>
            <div style={S.chartHeader}>
              <span style={S.indTitle}>히스토리컬 차트</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: '#3a3a4a' }}>7개 지표 가중 합성</span>
                <div style={S.periodRow}>
                  {PERIODS.map(p => (
                    <button key={p} style={{ ...S.pBtn, ...(period === p ? S.pBtnActive : {}) }} onClick={() => setPeriod(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {loading ? (
              <Skeleton h={130} r={8} />
            ) : !error && apiData?.chartData?.length > 0 ? (
              <HistoryChart chartData={apiData.chartData} period={period} />
            ) : (
              <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 11 }}>
                차트 데이터 없음
              </div>
            )}
          </div>

          {/* 세부 지표 카테고리 */}
          {loading ? (
            [0,1,2].map(i => (
              <div key={i} style={S.indCard}>
                <div style={{ ...S.indHeader, gap: 8 }}>
                  <Skeleton h={12} w={80} />
                </div>
                {[0,1,2].map(j => (
                  <div key={j} style={{ ...S.indRow, borderBottom: '0.5px solid #151520' }}>
                    <div style={{ flex: 1 }}><Skeleton h={12} w="70%" /></div>
                    <Skeleton h={16} w={50} />
                  </div>
                ))}
              </div>
            ))
          ) : !error && apiData?.indicators?.map((section, si) => (
            <div key={si} style={S.indCard}>
              <div style={S.indHeader}>
                <i className={`ti ${section.icon}`} style={{ color: '#7F77DD', fontSize: 13, marginRight: 6 }} />
                <span style={S.indTitle}>{section.category}</span>
              </div>
              {section.items.map((item, ii) => {
                const sColor = STATUS_COLORS[item.status] ?? '#888';
                const sBg    = STATUS_BG[item.status]    ?? '#222';
                return (
                  <button
                    key={ii}
                    style={{ ...S.indRow, borderBottom: ii < section.items.length - 1 ? '0.5px solid #151520' : 'none', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    onClick={() => setSelectedIndicator(item)}
                  >
                    <div style={S.indLeft}>
                      <div style={S.indName}>{item.name}</div>
                      <div style={S.indNote}>{item.note}</div>
                    </div>
                    <div style={S.indRight}>
                      <div style={S.indValue}>{item.value}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <div style={{ ...S.indBadge, background: sBg, color: sColor, fontSize: 8 }}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ fontSize: 11, color: '#333', marginLeft: 6, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          ))}

          <div style={{ height: 24 }} />
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}

// ─── 스타일 ──────────────────────────────────────────────
const S = {
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden' },
  header: { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: '#fff' },
  scroll: { flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  scrollContent: { padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 },

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

  msgCard: { background: '#181820', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, border: '0.5px solid' },
  msgEmoji: { fontSize: 20, flexShrink: 0, lineHeight: 1.3 },
  msgText: { fontSize: 12, color: '#ccc', lineHeight: 1.6 },

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
