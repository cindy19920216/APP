"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── 심볼 · 표시 메타 매핑 ────────────────────────────────
const SYMBOL_MAP = {
  'KOSPI':     '%5EKS11',
  'KOSDAQ':    '%5EKQ11',
  'S&P500':    '%5EGSPC',
  'NASDAQ':    '%5EIXIC',
  '니케이225': '%5EN225',
  'DAX':       '%5EGDAXI',
  '항셍':      '%5EHSI',
  'USD / KRW': 'USDKRW%3DX',
  'EUR / KRW': 'EURKRW%3DX',
  'JPY / KRW': 'JPYKRW%3DX',
  'CNY / KRW': 'CNYKRW%3DX',
  'GBP / KRW': 'GBPKRW%3DX',
  'AUD / KRW': 'AUDKRW%3DX',
  'CAD / KRW': 'CADKRW%3DX',
  'CHF / KRW': 'CHFKRW%3DX',
  'HKD / KRW': 'HKDKRW%3DX',
  'SGD / KRW': 'SGDKRW%3DX',
  '금':        'GC%3DF',
  '원유(WTI)': 'CL%3DF',
  '은':        'SI%3DF',
  'BTC':       'BTC-USD',
};

const pt = v => v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const META_MAP = {
  'KOSPI':     { color: '#7F77DD', unit: 'pt',    fmt: pt },
  'KOSDAQ':    { color: '#1D9E75', unit: 'pt',    fmt: pt },
  'S&P500':    { color: '#378ADD', unit: 'pt',    fmt: pt },
  'NASDAQ':    { color: '#EF9F27', unit: 'pt',    fmt: pt },
  '니케이225': { color: '#E24B4A', unit: 'pt',    fmt: pt },
  'DAX':       { color: '#5DCAA5', unit: 'pt',    fmt: pt },
  '항셍':      { color: '#EF9F27', unit: 'pt',    fmt: pt },
  'USD / KRW': { color: '#5DCAA5', unit: '원',    fmt: v => v.toFixed(2) },
  'EUR / KRW': { color: '#7F77DD', unit: '원',    fmt: v => v.toFixed(2) },
  'JPY / KRW': { color: '#5DCAA5', unit: '원',    fmt: v => v.toFixed(2) },
  'CNY / KRW': { color: '#5DCAA5', unit: '원',    fmt: v => v.toFixed(2) },
  'GBP / KRW': { color: '#1D9E75', unit: '원',    fmt: v => v.toFixed(2) },
  'AUD / KRW': { color: '#5DCAA5', unit: '원',    fmt: v => v.toFixed(2) },
  'CAD / KRW': { color: '#EF9F27', unit: '원',    fmt: v => v.toFixed(2) },
  'CHF / KRW': { color: '#7F77DD', unit: '원',    fmt: v => v.toFixed(2) },
  'HKD / KRW': { color: '#5DCAA5', unit: '원',    fmt: v => v.toFixed(2) },
  'SGD / KRW': { color: '#1D9E75', unit: '원',    fmt: v => v.toFixed(2) },
  '금':        { color: '#EF9F27', unit: '$/oz',  fmt: v => '$' + pt(v) },
  '원유(WTI)': { color: '#7F77DD', unit: '$/bbl', fmt: v => '$' + v.toFixed(1) },
  '은':        { color: '#5DCAA5', unit: '$/oz',  fmt: v => '$' + v.toFixed(2) },
  'BTC':       { color: '#EF9F27', unit: 'USD',   fmt: v => '$' + pt(v) },
};

// ─── 이동평균 계산 ────────────────────────────────────────
function calcMA(values, period) {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    return sum / period;
  });
}

const MA_LINES = [
  { period: 5,   color: '#FF6B6B99', label: 'MA5'   },
  { period: 20,  color: '#FFC10799', label: 'MA20'  },
  { period: 60,  color: '#4CAF5099', label: 'MA60'  },
  { period: 120, color: '#AB47BC99', label: 'MA120' },
];

// ─── 날짜 → 짧은 라벨 ────────────────────────────────────
function toLabel(dateStr) {
  const [y, m] = dateStr.split('-');
  return `${y.slice(2)}.${parseInt(m)}`;
}

// ─── 드래그 범위 바 ────────────────────────────────────────
function DragRangeBar({ values, labels, range, onChange }) {
  const barRef  = useRef(null);
  const dragRef = useRef(null);
  const total   = values.length;

  const relX = useCallback((clientX) => {
    if (!barRef.current) return 0;
    const r = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }, []);

  const startDrag = useCallback((clientX, type) => {
    dragRef.current = { type, startRelX: relX(clientX), startRange: { ...range } };
  }, [range, relX]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = relX(cx) - dragRef.current.startRelX;
      const dIdx = dx * (total - 1);
      const { startIdx, endIdx } = dragRef.current.startRange;
      const last = total - 1;

      if (dragRef.current.type === 'left') {
        onChange({ startIdx: Math.max(0, Math.min(Math.round(startIdx + dIdx), endIdx - 2)), endIdx });
      } else if (dragRef.current.type === 'right') {
        onChange({ startIdx, endIdx: Math.min(last, Math.max(Math.round(endIdx + dIdx), startIdx + 2)) });
      } else {
        let ns = Math.round(startIdx + dIdx), ne = Math.round(endIdx + dIdx);
        if (ns < 0)    { ne -= ns;         ns = 0; }
        if (ne > last) { ns -= (ne - last); ne = last; }
        onChange({ startIdx: Math.max(0, ns), endIdx: Math.min(last, ne) });
      }
    };
    const onEnd = () => { dragRef.current = null; };
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onEnd);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('touchend',   onEnd);
    return () => {
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseup',    onEnd);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('touchend',   onEnd);
    };
  }, [total, relX, onChange]);

  const W = 300, H = 36;
  const minV = Math.min(...values), maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const pts  = values.map((v, i) =>
    `${(i / (total - 1) * W).toFixed(1)},${(H - 4 - (v - minV) / span * (H - 8)).toFixed(1)}`
  ).join(' ');
  const sx = range.startIdx / (total - 1) * W;
  const ex = range.endIdx   / (total - 1) * W;
  const HW = 5;

  return (
    <div ref={barRef} style={S.dragWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}
           preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="#2e2e45" strokeWidth="1.5" />
        <rect x="0" y="0" width={sx}      height={H} fill="rgba(0,0,0,0.55)" />
        <rect x={ex} y="0" width={W - ex} height={H} fill="rgba(0,0,0,0.55)" />
        <polyline
          points={values.slice(range.startIdx, range.endIdx + 1).map((v, i) => {
            const ix = range.startIdx + i;
            return `${(ix / (total - 1) * W).toFixed(1)},${(H - 4 - (v - minV) / span * (H - 8)).toFixed(1)}`;
          }).join(' ')}
          fill="none" stroke="#7F77DD" strokeWidth="2"
        />
        <rect x={sx - HW} y="0" width={HW * 2} height={H} fill="#7F77DD" rx="3" opacity="0.9"
              style={{ cursor: 'ew-resize' }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e.clientX, 'left'); }}
              onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientX, 'left'); }} />
        <rect x={ex - HW} y="0" width={HW * 2} height={H} fill="#7F77DD" rx="3" opacity="0.9"
              style={{ cursor: 'ew-resize' }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e.clientX, 'right'); }}
              onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientX, 'right'); }} />
        <rect x={sx + HW} y="0" width={ex - sx - HW * 2} height={H} fill="transparent"
              style={{ cursor: 'grab' }}
              onMouseDown={e => startDrag(e.clientX, 'middle')}
              onTouchStart={e => startDrag(e.touches[0].clientX, 'middle')} />
      </svg>
      <div style={S.dragLabels}>
        <span>{labels[range.startIdx]}</span>
        <span>{labels[range.endIdx]}</span>
      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────
export default function InstrumentChartScreen({ instrumentKey, currentValue, currentChange, onBack }) {
  const meta   = META_MAP[instrumentKey];
  const symbol = SYMBOL_MAP[instrumentKey];

  const [values,  setValues]  = useState([]);
  const [labels,  setLabels]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [range,   setRange]   = useState(null);

  useEffect(() => {
    if (!symbol) { setLoading(false); return; }
    fetch(`/api/chart/${symbol}?range=max`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const pts = d.points ?? [];
        const vs  = pts.map(p => p.price);
        const ls  = pts.map(p => toLabel(p.date));
        setValues(vs);
        setLabels(ls);
        setRange({ startIdx: Math.max(0, vs.length - 60), endIdx: vs.length - 1 });
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [symbol]);

  const slicedValues = range ? values.slice(range.startIdx, range.endIdx + 1) : [];
  const slicedLabels = range ? labels.slice(range.startIdx, range.endIdx + 1) : [];
  const color        = meta?.color ?? '#7F77DD';
  const periodReturn = slicedValues.length >= 2
    ? ((slicedValues.at(-1) - slicedValues[0]) / slicedValues[0] * 100).toFixed(2)
    : '0';

  // 이평선 datasets (전체 values 기준 계산 후 구간 슬라이스)
  const maDatasets = MA_LINES.map(({ period, color: maColor, label }) => {
    const full   = calcMA(values, period);
    const sliced = range ? full.slice(range.startIdx, range.endIdx + 1) : [];
    return {
      label,
      data:        sliced,
      borderColor: maColor,
      borderWidth: 1,
      pointRadius: 0,
      fill:        false,
      tension:     0.3,
      spanGaps:    false,
    };
  });

  const chartData = {
    labels: slicedLabels,
    datasets: [{
      data:                slicedValues,
      borderColor:         color,
      borderWidth:         3,
      pointRadius:         slicedValues.length <= 6 ? 5 : 0,
      pointBackgroundColor: color,
      pointBorderColor:    '#181820',
      pointBorderWidth:    1.5,
      tension:             0.4,
      fill:                true,
      backgroundColor: (ctx) => {
        const { chartArea, ctx: c } = ctx.chart;
        if (!chartArea) return color + '11';
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00');
        return g;
      },
    }, ...maDatasets],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const v = ctx.parsed.y;
            if (v == null) return null;
            if (ctx.datasetIndex === 0) return `${meta?.fmt(v)} ${meta?.unit}`;
            return `${ctx.dataset.label}: ${meta?.fmt(v)}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { display: false }, border: { color: '#2a2a35' } },
      y: { ticks: { font: { size: 9 }, color: '#555', callback: v => meta?.fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: '#2a2a35' } },
    },
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" />시장지표
        </button>
        <span style={S.headerTitle}>{instrumentKey}</span>
        <div style={{ width: 72 }} />
      </div>

      <div style={S.scroll}>
        <div style={S.scrollContent}>

          {/* 현재값 */}
          <div style={S.priceCard}>
            <div style={S.priceRow}>
              <span style={S.priceVal}>{currentValue}</span>
              <span style={{ ...S.priceChg, color: parseFloat(currentChange) >= 0 ? '#1D9E75' : '#E24B4A' }}>
                {currentChange}
              </span>
            </div>
            <div style={S.unitLabel}>
              {meta?.unit} · 기간 수익률{' '}
              <span style={{ color: +periodReturn >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: 500 }}>
                {+periodReturn >= 0 ? '+' : ''}{periodReturn}%
              </span>
            </div>
          </div>

          {/* 차트 */}
          <div style={S.chartCard}>
            {loading ? (
              <div style={S.loadBox}>데이터 로딩 중…</div>
            ) : error ? (
              <div style={S.loadBox}>데이터를 불러올 수 없습니다</div>
            ) : (
              <>
                <div style={{ height: 200 }}>
                  <Line data={chartData} options={chartOptions} />
                </div>

                {/* 이평선 범례 */}
                <div style={S.maLegend}>
                  {MA_LINES.map(({ label, color: mc }) => (
                    <div key={label} style={S.maItem}>
                      <div style={{ width: 16, height: 2, background: mc, borderRadius: 1 }} />
                      <span style={{ fontSize: 9, color: mc }}>{label}</span>
                    </div>
                  ))}
                </div>

                {range && values.length > 0 && (
                  <div style={S.dragSection}>
                    <div style={S.dragTitle}>
                      <i className="ti ti-arrows-left-right" style={{ fontSize: 11, marginRight: 4, color: '#555' }} />
                      <span style={{ fontSize: 9, color: '#444' }}>드래그로 기간 선택</span>
                      <span style={{ fontSize: 9, color: '#333', marginLeft: 'auto' }}>
                        전체 {values.length}개월 ({labels[0]} ~ {labels.at(-1)})
                      </span>
                    </div>
                    <DragRangeBar values={values} labels={labels} range={range} onChange={setRange} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 통계 */}
          {!loading && !error && range && (
            <div style={S.statsCard}>
              {[
                { label: '조회 기간', value: `${labels[range.startIdx]} ~ ${labels[range.endIdx]}` },
                { label: '전체 데이터', value: `${labels[0]} ~ ${labels.at(-1)} (${values.length}개월)` },
                { label: '기간 최고', value: meta?.fmt(Math.max(...slicedValues)) },
                { label: '기간 최저', value: meta?.fmt(Math.min(...slicedValues)) },
                { label: '기간 수익률', value: (+periodReturn >= 0 ? '+' : '') + periodReturn + '%', color: +periodReturn >= 0 ? '#1D9E75' : '#E24B4A' },
              ].map((s, i, arr) => (
                <div key={i} style={{ ...S.statRow, borderBottom: i < arr.length - 1 ? '0.5px solid #151520' : 'none' }}>
                  <span style={S.statLabel}>{s.label}</span>
                  <span style={{ ...S.statValue, color: s.color ?? '#fff' }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden' },
  header: { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, minWidth: 72 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: '#fff' },
  scroll: { flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  scrollContent: { padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 },

  priceCard: { background: '#181820', borderRadius: 12, padding: '12px 14px' },
  priceRow:  { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 },
  priceVal:  { fontSize: 24, fontWeight: 600, color: '#fff' },
  priceChg:  { fontSize: 14, fontWeight: 500 },
  unitLabel: { fontSize: 10, color: '#444' },

  chartCard:    { background: '#181820', borderRadius: 12, padding: 14 },
  maLegend:     { display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  maItem:       { display: 'flex', alignItems: 'center', gap: 4 },
  loadBox:      { height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 },
  dragSection:  { marginTop: 14, borderTop: '0.5px solid #1e1e28', paddingTop: 12 },
  dragTitle:    { display: 'flex', alignItems: 'center', marginBottom: 8 },
  dragWrap:     { position: 'relative', height: 44, background: '#0f1117', borderRadius: 6, overflow: 'hidden', cursor: 'default', userSelect: 'none', WebkitUserSelect: 'none' },
  dragLabels:   { position: 'absolute', bottom: -14, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#444', padding: '0 2px' },

  statsCard: { background: '#181820', borderRadius: 12, overflow: 'hidden' },
  statRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' },
  statLabel: { fontSize: 11, color: '#555' },
  statValue: { fontSize: 12, fontWeight: 500 },
};
