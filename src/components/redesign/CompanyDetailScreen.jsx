"use client";

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { KOSPI_MONTHLY, CHART_LABELS } from '@/data/companyData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── 유틸 ─────────────────────────────────
function fmt(v, dec = 1) { return (v > 0 ? '+' : '') + v.toFixed(dec) + '%'; }
function pclr(v) { return v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#555'; }
function priceStr(p) { return p >= 10000 ? (p / 10000).toFixed(1) + '만원' : p.toLocaleString() + '원'; }
function priceK(p) { return (p / 1000).toFixed(1) + 'K'; }

const CHART_MODES = ['주가', 'KOSPI대비'];
const PERIODS     = [{ key: '1Y', label: '1년' }, { key: '6M', label: '6개월' }, { key: '3M', label: '3개월' }];

function getSlice(arr, period) {
  if (period === '1Y') return arr;
  if (period === '6M') return arr.slice(-7);
  return arr.slice(-3);
}

// ─── 주가 차트 ─────────────────────────────
function PriceChart({ stock, period }) {
  const prices = getSlice(stock.priceHistory, period);
  const labels = getSlice(CHART_LABELS, period);
  const isUp   = prices[prices.length - 1] >= prices[0];
  const color  = isUp ? '#1D9E75' : '#E24B4A';

  const data = {
    labels,
    datasets: [{
      data: prices,
      borderColor: color, borderWidth: 2,
      pointRadius: prices.length <= 5 ? 4 : 0,
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

  const options = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 250 },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ctx.parsed.y.toLocaleString() + '원' } },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false }, border: { color: '#2a2a35' } },
      y: { ticks: { font: { size: 9 }, color: '#555', callback: (v) => priceK(v) }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: '#2a2a35' } },
    },
  };

  return <div style={{ height: 140 }}><Line data={data} options={options} /></div>;
}

// ─── KOSPI 대비 차트 ────────────────────────
function RelativeChart({ stock, period }) {
  const prices = getSlice(stock.priceHistory, period);
  const kospi  = getSlice(KOSPI_MONTHLY, period);
  const labels = getSlice(CHART_LABELS, period);

  const base  = prices[0];
  const kbase = kospi[0];
  const stkIdx = prices.map(p => +((p / base * 100 - 100).toFixed(2)));
  const kpiIdx = kospi.map(k => +((k / kbase * 100 - 100).toFixed(2)));

  const data = {
    labels,
    datasets: [
      {
        label: stock.name, data: stkIdx,
        borderColor: '#7F77DD', borderWidth: 2.5,
        pointRadius: 0, tension: 0.4, fill: false,
      },
      {
        label: 'KOSPI', data: kpiIdx,
        borderColor: '#444', borderWidth: 1.5,
        pointRadius: 0, tension: 0.4, fill: false,
        borderDash: [4, 3],
      },
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 250 },
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#666', font: { size: 9 }, boxWidth: 14, padding: 8 } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false }, border: { color: '#2a2a35' } },
      y: { ticks: { font: { size: 9 }, color: '#555', callback: (v) => fmt(v, 0) }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: '#2a2a35' } },
    },
  };

  const excessReturn = stkIdx[stkIdx.length - 1] - kpiIdx[kpiIdx.length - 1];

  return (
    <div>
      <div style={S.excessRow}>
        <span style={S.excessLabel}>초과 수익률</span>
        <span style={{ ...S.excessVal, color: pclr(excessReturn) }}>{fmt(excessReturn)}pt</span>
      </div>
      <div style={{ height: 130 }}><Line data={data} options={options} /></div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────
export default function CompanyDetailScreen({ stock, themeName, onBack }) {
  const [chartMode, setChartMode] = useState('주가');
  const [period,    setPeriod]    = useState('1Y');

  const { buy, hold, sell, buyRatio } = stock;
  const total = buy + hold + sell;
  const totalPrice = stock.price.toLocaleString() + '원';
  const upside = stock.upside;

  return (
    <div style={S.wrap}>
      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" />{themeName}
        </button>
        <div style={S.headerCenter}>
          <div style={S.headerName}>{stock.name}</div>
          <div style={S.headerTicker}>{stock.ticker}</div>
        </div>
        <div style={{ width: 72 }} />
      </div>

      <div style={S.scroll}>
        {/* 가격 요약 */}
        <div style={S.priceCard}>
          <div style={S.priceMain}>
            <span style={S.priceVal}>{totalPrice}</span>
            <div style={S.capBadge}>시총 {stock.cap}</div>
          </div>
          <div style={S.returnRow}>
            {[{ label: '일간', v: stock.d }, { label: '주간', v: stock.w }, { label: '월간', v: stock.m }].map(({ label, v }) => (
              <div key={label} style={S.retCell}>
                <div style={S.retLabel}>{label}</div>
                <div style={{ ...S.retVal, color: pclr(v) }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 차트 카드 */}
        <div style={S.card}>
          <div style={S.chartHeader}>
            {/* 주가 / KOSPI대비 */}
            <div style={S.modeRow}>
              {CHART_MODES.map(m => (
                <button key={m} style={{ ...S.modeBtn, ...(chartMode === m ? S.modeBtnActive : {}) }} onClick={() => setChartMode(m)}>{m}</button>
              ))}
            </div>
            {/* 기간 */}
            <div style={S.periodRow}>
              {PERIODS.map(p => (
                <button key={p.key} style={{ ...S.pBtn, ...(period === p.key ? S.pBtnActive : {}) }} onClick={() => setPeriod(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
          {chartMode === '주가'
            ? <PriceChart stock={stock} period={period} />
            : <RelativeChart stock={stock} period={period} />
          }
        </div>

        {/* FnGuide 컨센서스 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <i className="ti ti-chart-bar" style={{ color: '#7F77DD', fontSize: 12, marginRight: 5 }} />
            FnGuide 컨센서스
          </div>

          {/* 투자의견 */}
          <div style={S.consensusRow}>
            <div style={S.consensusLeft}>
              <div style={S.cLabel}>투자의견</div>
              <div style={S.opinionBar}>
                <div style={{ ...S.opinionSeg, flex: buy, background: '#1D9E75' }} />
                <div style={{ ...S.opinionSeg, flex: hold, background: '#EF9F27' }} />
                <div style={{ ...S.opinionSeg, flex: sell || 0.1, background: '#E24B4A' }} />
              </div>
              <div style={S.opinionLegend}>
                <span style={{ color: '#1D9E75' }}>BUY {buy}</span>
                <span style={{ color: '#EF9F27' }}>HOLD {hold}</span>
                {sell > 0 && <span style={{ color: '#E24B4A' }}>SELL {sell}</span>}
                <span style={{ color: '#555' }}>({total}개 증권사)</span>
              </div>
            </div>
            <div style={S.buyRatioBig}>
              <span style={{ ...S.buyRatioNum, color: '#1D9E75' }}>{buyRatio}%</span>
              <span style={S.buyRatioLabel}>BUY</span>
            </div>
          </div>

          {/* 목표주가 */}
          <div style={S.targetRow}>
            <div style={S.targetLeft}>
              <div style={S.cLabel}>목표주가 평균</div>
              <div style={S.targetPrice}>{stock.target.toLocaleString()}원</div>
            </div>
            <div style={S.targetRight}>
              <div style={S.cLabel}>현재가 대비</div>
              <div style={{ ...S.upsideVal, color: pclr(upside) }}>
                {upside > 0 ? '+' : ''}{upside}%
              </div>
            </div>
          </div>

          {/* 실적 추정 테이블 */}
          <div style={S.estTable}>
            <div style={S.estHead}>
              <span style={{ ...S.estTh, flex: 1.6 }}>구분</span>
              <span style={S.estTh}>2025E</span>
              <span style={S.estTh}>2026E</span>
            </div>
            {[
              { label: '매출', v25: stock.rev25, v26: stock.rev26 },
              { label: '영업이익', v25: stock.op25, v26: stock.op26 },
              { label: 'EPS (원)', v25: stock.eps25, v26: stock.eps26 },
              { label: 'PER (x)', v25: stock.per25, v26: stock.per26 },
            ].map((r, i) => (
              <div key={i} style={{ ...S.estRow, borderBottom: i < 3 ? '0.5px solid #151520' : 'none' }}>
                <span style={{ ...S.estTd, flex: 1.6, color: '#888' }}>{r.label}</span>
                <span style={S.estTd}>{r.v25}</span>
                <span style={{ ...S.estTd, color: '#7F77DD' }}>{r.v26}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 관련 뉴스 */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <i className="ti ti-news" style={{ color: '#EF9F27', fontSize: 12, marginRight: 5 }} />
            관련 뉴스
            <span style={S.sentimentNote}>감성분석 베타</span>
          </div>
          {stock.news.map((n, i) => {
            const dot = n.s === 'pos' ? '#1D9E75' : n.s === 'neg' ? '#E24B4A' : '#EF9F27';
            return (
              <div key={i} style={{ ...S.newsRow, borderBottom: i < stock.news.length - 1 ? '0.5px solid #151520' : 'none' }}>
                <div style={{ ...S.newsDot, background: dot }} />
                <div style={S.newsContent}>
                  <div style={S.newsTitle}>{n.title}</div>
                  <div style={S.newsMeta}>{n.source} · {n.time}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// ─── 스타일 ────────────────────────────────
const S = {
  wrap: { display: 'flex', flexDirection: 'column', background: '#0f1117', height: '100%' },
  header: {
    padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '0.5px solid #1e1e28', flexShrink: 0,
  },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, minWidth: 72 },
  headerCenter: { textAlign: 'center' },
  headerName: { fontSize: 14, fontWeight: 500, color: '#fff' },
  headerTicker: { fontSize: 9, color: '#444', marginTop: 1 },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 },

  priceCard: { background: '#181820', borderRadius: 14, padding: 14 },
  priceMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priceVal: { fontSize: 22, fontWeight: 600, color: '#fff' },
  capBadge: { fontSize: 9, color: '#555', background: '#1e1e28', padding: '3px 8px', borderRadius: 5 },
  returnRow: { display: 'flex', borderTop: '0.5px solid #1e1e28', paddingTop: 12 },
  retCell: { flex: 1, textAlign: 'center' },
  retLabel: { fontSize: 9, color: '#444', marginBottom: 4 },
  retVal: { fontSize: 14, fontWeight: 500 },

  card: { background: '#181820', borderRadius: 12, overflow: 'hidden', padding: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 500, color: '#ccc', marginBottom: 12, display: 'flex', alignItems: 'center' },
  sentimentNote: { marginLeft: 'auto', fontSize: 9, color: '#534AB7', background: '#1e1e2e', padding: '2px 7px', borderRadius: 5 },

  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modeRow: { display: 'flex', gap: 4 },
  modeBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  modeBtnActive: { background: '#252535', color: '#ccc', border: '0.5px solid #444' },
  periodRow: { display: 'flex', gap: 4 },
  pBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  pBtnActive: { background: '#EEEDFE', color: '#3C3489', border: 'none' },

  excessRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  excessLabel: { fontSize: 10, color: '#444' },
  excessVal: { fontSize: 13, fontWeight: 600 },

  consensusRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, borderBottom: '0.5px solid #151520', paddingBottom: 14 },
  consensusLeft: { flex: 1 },
  cLabel: { fontSize: 9, color: '#444', marginBottom: 6 },
  opinionBar: { display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', gap: 1 },
  opinionSeg: { height: '100%', minWidth: 4 },
  opinionLegend: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  buyRatioBig: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  buyRatioNum: { fontSize: 24, fontWeight: 600, lineHeight: 1 },
  buyRatioLabel: { fontSize: 9, color: '#444', marginTop: 2 },

  targetRow: { display: 'flex', marginBottom: 14, borderBottom: '0.5px solid #151520', paddingBottom: 14 },
  targetLeft: { flex: 1 },
  targetRight: { flex: 1, textAlign: 'right' },
  targetPrice: { fontSize: 18, fontWeight: 500, color: '#fff', marginTop: 4 },
  upsideVal: { fontSize: 18, fontWeight: 500, marginTop: 4 },

  estTable: { borderRadius: 8, overflow: 'hidden', border: '0.5px solid #1e1e28' },
  estHead: { display: 'flex', background: '#13131e', padding: '7px 12px', borderBottom: '0.5px solid #1e1e28' },
  estTh: { flex: 1, fontSize: 9, color: '#444', textAlign: 'right', textTransform: 'uppercase' },
  estRow: { display: 'flex', padding: '9px 12px' },
  estTd: { flex: 1, fontSize: 11, color: '#ccc', textAlign: 'right' },

  newsRow: { display: 'flex', alignItems: 'flex-start', padding: '10px 0', gap: 10 },
  newsDot: { width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  newsContent: { flex: 1 },
  newsTitle: { fontSize: 12, color: '#ccc', lineHeight: 1.5 },
  newsMeta: { fontSize: 9, color: '#444', marginTop: 3 },
};
