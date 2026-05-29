"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── 2년치 월간 데이터 (2023.6 ~ 2025.5) ──────────────────────────
const LABELS = ['23.6','23.7','23.8','23.9','23.10','23.11','23.12','24.1','24.2','24.3','24.4','24.5','24.6','24.7','24.8','24.9','24.10','24.11','24.12','25.1','25.2','25.3','25.4','25.5'];

const ALL_DATA = {
  'KOSPI':     { values:[2563,2527,2495,2465,2423,2465,2556,2634,2692,2655,2601,2524,2742,2780,2643,2603,2606,2501,2399,2481,2547,2463,2564,2748], color:'#7F77DD', unit:'pt',     fmt:v=>v.toLocaleString() },
  'KOSDAQ':    { values:[896,878,862,840,810,840,862,896,920,906,888,854,912,928,886,876,848,836,802,834,856,846,872,854],                         color:'#1D9E75', unit:'pt',     fmt:v=>v.toLocaleString() },
  'S&P500':    { values:[4450,4588,4511,4288,4194,4388,4594,4742,4846,4938,4845,4845,5137,5304,5243,5461,5463,5705,5882,5981,5954,5812,5569,5304], color:'#378ADD', unit:'pt',     fmt:v=>v.toLocaleString() },
  'NASDAQ':    { values:[13787,14103,13673,13220,12910,13479,14046,14609,15022,15011,14765,14765,15990,16378,16274,17282,17490,18022,18528,19403,19622,19149,18119,16920], color:'#EF9F27', unit:'pt', fmt:v=>v.toLocaleString() },
  'USD / KRW': { values:[1310,1332,1358,1380,1380,1363,1350,1330,1328,1344,1358,1331,1330,1340,1362,1388,1382,1360,1444,1474,1438,1420,1436,1378], color:'#5DCAA5', unit:'원',     fmt:v=>v.toFixed(2) },
  'JPY / KRW': { values:[9.42,9.28,9.18,9.10,9.08,9.16,9.08,9.14,9.20,9.28,9.22,9.08,9.14,9.24,9.40,9.52,9.58,9.24,9.48,9.44,9.28,9.16,9.08,9.14], color:'#5DCAA5', unit:'원', fmt:v=>v.toFixed(2) },
  'CNY / KRW': { values:[180.2,183.4,187.6,190.2,191.4,189.8,187.4,185.6,183.8,186.2,188.4,184.6,183.8,185.2,188.6,193.4,194.8,190.2,198.4,201.2,194.6,190.8,192.4,189.7], color:'#5DCAA5', unit:'원', fmt:v=>v.toFixed(2) },
  '금':        { values:[1958,1945,1927,1888,1900,1988,2008,2073,2034,2029,2065,2079,2071,2227,2334,2330,2353,2657,2687,2648,2748,2837,2880,2338], color:'#EF9F27', unit:'$/oz',   fmt:v=>'$'+v.toLocaleString() },
  '원유(WTI)': { values:[71.8,68.2,82.1,88.1,92.2,86.6,78.3,77.6,75.2,74.1,76.8,72.4,78.1,82.7,82.5,80.7,82.7,78.1,76.6,80.4,77.8,68.9,60.9,78.2], color:'#7F77DD', unit:'$/bbl', fmt:v=>'$'+v.toFixed(1) },
  '은':        { values:[23.4,23.8,22.8,23.4,25.1,24.8,25.8,26.9,26.7,24.2,24.4,25.0,22.2,24.6,27.3,29.1,29.3,32.2,32.5,31.8,33.0,34.7,31.8,29.9], color:'#5DCAA5', unit:'$/oz', fmt:v=>'$'+v.toFixed(2) },
  'BTC':       { values:[27800,29200,27600,26100,26500,26900,28500,31500,37200,44900,43500,42600,53900,63800,71400,65200,67800,59700,57400,65000,66000,97500,84200,68420], color:'#EF9F27', unit:'USD', fmt:v=>'$'+v.toLocaleString() },
};

// ─── 드래그 범위 바 ────────────────────────────────────────────────
function DragRangeBar({ values, range, onChange }) {
  const barRef  = useRef(null);
  const dragRef = useRef(null); // { type, startRelX, startRange }
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
      const width = endIdx - startIdx;
      const last  = total - 1;

      if (dragRef.current.type === 'left') {
        const ns = Math.max(0, Math.min(Math.round(startIdx + dIdx), endIdx - 2));
        onChange({ startIdx: ns, endIdx });
      } else if (dragRef.current.type === 'right') {
        const ne = Math.min(last, Math.max(Math.round(endIdx + dIdx), startIdx + 2));
        onChange({ startIdx, endIdx: ne });
      } else {
        let ns = Math.round(startIdx + dIdx);
        let ne = Math.round(endIdx + dIdx);
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

  // mini chart points (0-100% coords in 300×36 viewBox)
  const W = 300, H = 36;
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const pts = values.map((v, i) => `${(i / (total - 1) * W).toFixed(1)},${(H - 4 - (v - minV) / span * (H - 8)).toFixed(1)}`).join(' ');

  const sx = range.startIdx / (total - 1) * W;
  const ex = range.endIdx   / (total - 1) * W;
  const HW = 5; // handle half-width

  return (
    <div ref={barRef} style={S.dragWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}
           preserveAspectRatio="none">
        {/* full mini line (muted) */}
        <polyline points={pts} fill="none" stroke="#2e2e45" strokeWidth="1.5" />

        {/* dark overlays outside selection */}
        <rect x="0" y="0" width={sx}       height={H} fill="rgba(0,0,0,0.55)" />
        <rect x={ex} y="0" width={W - ex}  height={H} fill="rgba(0,0,0,0.55)" />

        {/* selected portion (bright line) */}
        <polyline
          points={values.slice(range.startIdx, range.endIdx + 1).map((v, i) => {
            const ix = range.startIdx + i;
            return `${(ix / (total - 1) * W).toFixed(1)},${(H - 4 - (v - minV) / span * (H - 8)).toFixed(1)}`;
          }).join(' ')}
          fill="none" stroke="#7F77DD" strokeWidth="2"
        />

        {/* handles */}
        <rect x={sx - HW} y="0" width={HW * 2} height={H} fill="#7F77DD" rx="3" opacity="0.9"
              style={{ cursor: 'ew-resize' }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e.clientX, 'left'); }}
              onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientX, 'left'); }} />
        <rect x={ex - HW} y="0" width={HW * 2} height={H} fill="#7F77DD" rx="3" opacity="0.9"
              style={{ cursor: 'ew-resize' }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e.clientX, 'right'); }}
              onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientX, 'right'); }} />

        {/* middle drag zone */}
        <rect x={sx + HW} y="0" width={ex - sx - HW * 2} height={H} fill="transparent"
              style={{ cursor: 'grab' }}
              onMouseDown={e => startDrag(e.clientX, 'middle')}
              onTouchStart={e => startDrag(e.touches[0].clientX, 'middle')} />
      </svg>

      {/* labels */}
      <div style={S.dragLabels}>
        <span>{LABELS[range.startIdx]}</span>
        <span>{LABELS[range.endIdx]}</span>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function InstrumentChartScreen({ instrumentKey, currentValue, currentChange, onBack }) {
  const meta   = ALL_DATA[instrumentKey];
  const values = meta?.values ?? [];
  const total  = values.length;

  const [range, setRange] = useState({ startIdx: Math.max(0, total - 12), endIdx: total - 1 });

  const slicedValues = values.slice(range.startIdx, range.endIdx + 1);
  const slicedLabels = LABELS.slice(range.startIdx, range.endIdx + 1);
  const isUp  = slicedValues.length >= 2 ? slicedValues[slicedValues.length - 1] >= slicedValues[0] : true;
  const color = meta?.color ?? (isUp ? '#1D9E75' : '#E24B4A');

  const periodReturn = slicedValues.length >= 2
    ? ((slicedValues[slicedValues.length - 1] - slicedValues[0]) / slicedValues[0] * 100).toFixed(2)
    : 0;

  const chartData = {
    labels: slicedLabels,
    datasets: [{
      data: slicedValues,
      borderColor: color, borderWidth: 2,
      pointRadius: slicedValues.length <= 6 ? 4 : 0,
      pointBackgroundColor: color, pointBorderColor: '#181820', pointBorderWidth: 1.5,
      tension: 0.4, fill: true,
      backgroundColor: (ctx) => {
        const { chartArea, ctx: c } = ctx.chart;
        if (!chartArea) return color + '11';
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, color + '44'); g.addColorStop(1, color + '00');
        return g;
      },
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${meta?.fmt(ctx.parsed.y)} ${meta?.unit}` } },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { display: false }, border: { color: '#2a2a35' } },
      y: { ticks: { font: { size: 9 }, color: '#555', callback: v => meta?.fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: '#2a2a35' } },
    },
  };

  if (!meta) return null;

  return (
    <div style={S.wrap}>
      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" />시장지표
        </button>
        <span style={S.headerTitle}>{instrumentKey}</span>
        <div style={{ width: 72 }} />
      </div>

      <div style={S.scroll}>
        {/* 현재값 */}
        <div style={S.priceCard}>
          <div style={S.priceRow}>
            <span style={S.priceVal}>{currentValue}</span>
            <span style={{ ...S.priceChg, color: parseFloat(currentChange) >= 0 ? '#1D9E75' : '#E24B4A' }}>
              {currentChange}
            </span>
          </div>
          <div style={S.unitLabel}>{meta.unit} · 기간 수익률{' '}
            <span style={{ color: +periodReturn >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: 500 }}>
              {+periodReturn >= 0 ? '+' : ''}{periodReturn}%
            </span>
          </div>
        </div>

        {/* 메인 차트 */}
        <div style={S.chartCard}>
          <div style={{ height: 180 }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* 드래그 범위 바 */}
          <div style={S.dragSection}>
            <div style={S.dragTitle}>
              <i className="ti ti-arrows-left-right" style={{ fontSize: 11, marginRight: 4, color: '#555' }} />
              <span style={{ fontSize: 9, color: '#444' }}>드래그로 기간 선택</span>
            </div>
            <DragRangeBar values={values} range={range} onChange={setRange} />
          </div>
        </div>

        {/* 통계 */}
        <div style={S.statsCard}>
          {[
            { label: '조회 기간', value: `${LABELS[range.startIdx]} ~ ${LABELS[range.endIdx]}` },
            { label: '기간 최고', value: meta.fmt(Math.max(...slicedValues)) },
            { label: '기간 최저', value: meta.fmt(Math.min(...slicedValues)) },
            { label: '기간 수익률', value: (+periodReturn >= 0 ? '+' : '') + periodReturn + '%', color: +periodReturn >= 0 ? '#1D9E75' : '#E24B4A' },
          ].map((s, i) => (
            <div key={i} style={{ ...S.statRow, borderBottom: i < 3 ? '0.5px solid #151520' : 'none' }}>
              <span style={S.statLabel}>{s.label}</span>
              <span style={{ ...S.statValue, color: s.color ?? '#fff' }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', background: '#0f1117', height: '100%' },
  header: { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, minWidth: 72 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: '#fff' },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 },

  priceCard: { background: '#181820', borderRadius: 12, padding: '12px 14px' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 },
  priceVal: { fontSize: 24, fontWeight: 600, color: '#fff' },
  priceChg: { fontSize: 14, fontWeight: 500 },
  unitLabel: { fontSize: 10, color: '#444' },

  chartCard: { background: '#181820', borderRadius: 12, padding: 14 },
  dragSection: { marginTop: 14, borderTop: '0.5px solid #1e1e28', paddingTop: 12 },
  dragTitle: { display: 'flex', alignItems: 'center', marginBottom: 8 },
  dragWrap: {
    position: 'relative', height: 44,
    background: '#0f1117', borderRadius: 6,
    overflow: 'hidden', cursor: 'default',
    userSelect: 'none', WebkitUserSelect: 'none',
  },
  dragLabels: {
    position: 'absolute', bottom: -14, left: 0, right: 0,
    display: 'flex', justifyContent: 'space-between',
    fontSize: 8, color: '#444', padding: '0 2px',
  },

  statsCard: { background: '#181820', borderRadius: 12, overflow: 'hidden' },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' },
  statLabel: { fontSize: 11, color: '#555' },
  statValue: { fontSize: 12, fontWeight: 500 },
};
