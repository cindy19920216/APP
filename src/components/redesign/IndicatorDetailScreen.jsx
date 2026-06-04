"use client";

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── 상수 ────────────────────────────────────────────────
const PERIODS = ['1년', '3년', '5년', '전체'];

const ZONE = {
  PANIC: { color: '#ef4444', bg: '#2a0808' },
  COLD:  { color: '#f97316', bg: '#2a1500' },
  MILD:  { color: '#eab308', bg: '#2a2000' },
  WARM:  { color: '#84cc16', bg: '#1a2a05' },
  BOOM:  { color: '#22c55e', bg: '#0a2a10' },
};

// 개별 지표 게이지: BOOM(좌) → PANIC(우) 방향
const IND_SEG_COLORS = ['#0f7a5c', '#1D9E75', '#EF9F27', '#E2844A', '#E24B4A'];
const SEGS = [[0,20],[20,40],[40,60],[60,80],[80,100]];

// ─── 지표 설명 ────────────────────────────────────────────
const DESCRIPTIONS = {
  '미국 주식 불확실성 지수': {
    what: '미국 주식시장의 불확실성을 수치화한 지수로, 뉴스 기사 빈도·옵션 가격·애널리스트 예측 분산을 종합해 산출합니다.',
    why:  '투자 심리와 변동성의 선행 지표입니다. 지수가 높을수록 시장 참여자들이 미래를 예측하지 못하는 상태로, 위험 회피 성향과 주가 하락 압력이 커집니다.',
  },
  '미국 고위험채권 유효이자율': {
    what: '미국 투자부적격(BB등급 이하) 회사채의 평균 이자율로, 옵션 조정 스프레드(OAS) 기반으로 산출됩니다.',
    why:  '기업 신용 위험의 바로미터입니다. 스프레드가 확대될수록 시장이 기업 부도 가능성을 높게 보고 있다는 신호이며, 신용 경색의 전조가 됩니다.',
  },
  '미국 기업여신 증가율': {
    what: '미국 상업은행의 기업 대출 잔액 전년 동월 대비 증가율(YoY%)입니다. 양수이면 전년보다 대출이 늘어난 상태입니다.',
    why:  '경제의 혈류 역할을 합니다. 증가율이 마이너스로 전환되면 투자·고용이 위축되어 경기 침체로 이어지는 선행 신호입니다.',
  },
  '미국 금융시장 경색 지수': {
    what: '시카고 연방준비은행(Chicago Fed)이 금리·스프레드·주가·레버리지 등 105개 금융변수를 종합해 주간 단위로 산출하는 지수입니다.',
    why:  '금융시스템 전반의 스트레스를 하나의 숫자로 요약합니다. 0이 역사적 평균이며, 양수이면 평균 이상 경색, 음수이면 이완 상태를 나타냅니다.',
  },
  '미국 장단기 금리차': {
    what: '미국 10년 국채 금리에서 2년 국채 금리를 뺀 값입니다. 수익률 곡선(Yield Curve)의 기울기를 나타냅니다.',
    why:  '수십 년간 경기침체를 가장 정확하게 예고해온 지표 중 하나입니다. 음전환(역전) 이후 평균 12~18개월 내에 경기침체가 발생해왔습니다.',
  },
  '캐나다 달러/일본 엔화': {
    what: '원자재 수출국 통화(캐나다 달러)와 대표적 안전자산 통화(일본 엔화)의 상대 가치 비율입니다.',
    why:  '글로벌 위험선호도를 측정합니다. 비율 하락은 투자자들이 위험자산을 팔고 안전자산으로 이동하는 신호로, 공황 심리가 커지고 있음을 나타냅니다.',
  },
  '미국 주간 실물경기 지수': {
    what: 'NY 연방준비은행이 소비·고용·생산 등 10개 고빈도 데이터를 주간 단위로 종합한 경기 지수입니다.',
    why:  '월별 GDP보다 훨씬 빠른 실시간 경기 측정 도구입니다. 양수이면 경기 성장세, 음수이면 수축 신호이며, 수치 변화 추이가 특히 중요합니다.',
  },
  '미국 실물경기 경기침체 확률': {
    what: '과거 GDP 데이터와 침체 패턴을 학습한 통계 모델이 산출하는 향후 경기침체 진입 확률(0~100%)입니다.',
    why:  '수치가 높아질수록 현재 경제 흐름이 과거 침체 진입 패턴과 유사해지고 있음을 의미합니다. 30% 이상이면 경계 신호로 봅니다.',
  },
  '샴 규칙 경기침체 지표': {
    what: 'Fed 이코노미스트 Claudia Sahm이 개발한 지표로, 현재 실업률 3개월 이동평균에서 최근 12개월 최저 실업률을 뺀 값입니다.',
    why:  '0.5% 초과 시 경기침체가 이미 시작됐다고 판정하며, 역사적 적중률이 매우 높습니다. 침체 판단에 가장 빠르고 신뢰도 높은 도구 중 하나입니다.',
  },
  '미국 트럭판매 현황': {
    what: '미국에서 판매된 중·대형 트럭 수량 지수입니다.',
    why:  '기업의 물류 투자 선행 지표입니다. 경기 개선 시 기업들이 먼저 물류 역량을 확충하므로 트럭 판매가 증가하고, 침체 전에는 먼저 감소하는 경향이 있습니다.',
  },
  '미국 화물운송 현황': {
    what: '미국 철도를 통해 운반된 화물량 지수입니다.',
    why:  '제조·소비재·원자재의 실물 이동을 측정하는 경기 온도계입니다. 화물 물동량은 생산과 소비가 늘어날 때 함께 증가해 경기 흐름을 실시간으로 반영합니다.',
  },
  '금/석유 가격 비율': {
    what: '금 가격(달러/온스)을 WTI 원유 가격(달러/배럴)으로 나눈 비율입니다.',
    why:  '안전자산(금)과 성장·위험 자산(원유)의 상대적 선호도를 나타냅니다. 비율이 높을수록 투자자들이 원유보다 금을 선호하는 위험 회피 심리가 강한 상태입니다.',
  },
  '미국 통화유동속도': {
    what: 'GDP를 M2 통화량으로 나눈 값으로, 같은 돈이 경제 안에서 얼마나 빠르게 순환하는지를 측정합니다.',
    why:  '낮을수록 돈이 실물경제에 흐르지 않고 저축·금융자산에 고여 있다는 의미입니다. 장기적 하락은 디플레이션 압력과 경기침체의 구조적 신호입니다.',
  },
  '미국 실업률/자연실업률 차이': {
    what: '실제 실업률(UNRATE)에서 경제의 구조적·마찰적 실업률인 자연실업률(NROU)을 뺀 값입니다.',
    why:  '경기적 실업의 크기를 나타냅니다. 양수이면 경기 침체로 인한 추가 실업이 발생 중이며, 음수이면 경기 과열(일손 부족) 상태를 의미합니다.',
  },
  '미국 기대 인플레이션': {
    what: '10년 만기 물가연동국채(TIPS)와 명목국채의 금리 차이로, 시장이 예상하는 향후 10년 평균 인플레이션율입니다.',
    why:  '중앙은행 정책 방향의 핵심 변수입니다. 2%를 크게 상회하면 추가 금리 인상 압력이 커지고, 하회하면 경기 부양을 위한 금리 인하 여력이 생깁니다.',
  },
};

// ─── 유틸 ────────────────────────────────────────────────
function arcD(cx, cy, r, from, to) {
  const a1 = Math.PI * (1 - from / 100);
  const a2 = Math.PI * (1 - to / 100);
  const x1 = (cx + r * Math.cos(a1)).toFixed(2);
  const y1 = (cy - r * Math.sin(a1)).toFixed(2);
  const x2 = (cx + r * Math.cos(a2)).toFixed(2);
  const y2 = (cy - r * Math.sin(a2)).toFixed(2);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${(to - from) > 50 ? 1 : 0} 0 ${x2} ${y2}`;
}

function calcThresholds(history, panicUp) {
  const sorted = [...history.map(d => d.value)].sort((a, b) => a - b);
  const n = sorted.length;
  if (n < 10) return null;
  const at = p => sorted[Math.min(Math.floor(n * p), n - 1)];
  if (panicUp) {
    return [
      { value: at(0.10), label: 'WARM',  color: '#84cc16' },
      { value: at(0.30), label: 'MILD',  color: '#eab308' },
      { value: at(0.70), label: 'COLD',  color: '#f97316' },
      { value: at(0.90), label: 'PANIC', color: '#ef4444' },
    ];
  } else {
    return [
      { value: at(0.10), label: 'COLD',  color: '#f97316' },
      { value: at(0.30), label: 'MILD',  color: '#eab308' },
      { value: at(0.70), label: 'WARM',  color: '#84cc16' },
      { value: at(0.90), label: 'BOOM',  color: '#22c55e' },
    ];
  }
}

// ─── 동적 설명 생성 ───────────────────────────────────────
function buildSentence(item) {
  const h = item.history ?? [];
  if (h.length < 2) return null;

  const cur    = h[h.length - 1].value;
  const prev   = h[h.length - 2].value;
  const change = cur - prev;
  const fmtChange = Math.abs(change) >= 10
    ? Math.abs(change).toFixed(1)
    : Math.abs(change).toFixed(2);

  // 월간 변동 중앙값 (역사적 변동 기준)
  const diffs  = h.slice(1).map((r, i) => Math.abs(r.value - h[i].value)).sort((a, b) => a - b);
  const medDiff = diffs[Math.floor(diffs.length / 2)] || 1;

  const ratio = Math.abs(change) / medDiff;
  let changeCtx;
  if (ratio < 0.5)      changeCtx = '소폭의 변화 수준';
  else if (ratio < 1.5) changeCtx = '일반적인 변화 수준';
  else if (ratio < 3)   changeCtx = '평균보다 큰 변화 수준';
  else                   changeCtx = '역사적으로 드문 큰 변화';

  // 3개월 추세로 다음 구간 방향 판단
  const trend3 = h.length >= 4
    ? h[h.length - 1].value - h[h.length - 4].value
    : change;
  const movingToPanic = item.panicUp ? trend3 > 0 : trend3 < 0;

  const zoneOrder = ['BOOM', 'WARM', 'MILD', 'COLD', 'PANIC'];
  const curIdx    = zoneOrder.indexOf(item.status);
  let zoneText;
  if (Math.abs(trend3) < medDiff * 0.5) {
    zoneText = `현재 ${item.status} 구간에서 안정적인 흐름을 보이고 있습니다.`;
  } else if (movingToPanic && curIdx < 4) {
    zoneText = `현재 ${item.status} 구간에서 ${zoneOrder[curIdx + 1]} 구간을 향해 이동 중입니다.`;
  } else if (!movingToPanic && curIdx > 0) {
    zoneText = `현재 ${item.status} 구간에서 ${zoneOrder[curIdx - 1]} 구간을 향해 이동 중입니다.`;
  } else {
    zoneText = `현재 ${item.status} 구간에 위치해 있습니다.`;
  }

  // 지표별 경제적 의미 (첫 문장만)
  const desc    = DESCRIPTIONS[item.name];
  const econText = desc ? desc.why.split('.')[0] + '.' : item.note;

  const dir = change >= 0 ? '상승' : '하락';
  return `${econText} 현재 ${item.name}은 ${item.value}이며, 1개월 전 대비 ${fmtChange}만큼 ${dir}했습니다. 이는 ${changeCtx}입니다. ${zoneText}`;
}

// ─── 퍼센타일 게이지 (BOOM 좌 ↔ PANIC 우) ──────────────
function IndicatorGauge({ percentile, status }) {
  const cx = 90, cy = 72, r = 56, sw = 8;
  const zone  = ZONE[status] ?? ZONE.MILD;
  const angle = Math.PI * (1 - percentile / 100);
  const nx    = (cx + (r - 10) * Math.cos(angle)).toFixed(2);
  const ny    = (cy - (r - 10) * Math.sin(angle)).toFixed(2);

  return (
    <svg viewBox="0 0 180 84" style={{ width: '100%' }}>
      {SEGS.map(([f, t], i) => (
        <path key={i} d={arcD(cx, cy, r, f, t)} fill="none" stroke={IND_SEG_COLORS[i] + '33'} strokeWidth={sw} />
      ))}
      {SEGS.map(([f, t], i) => {
        if (percentile <= f) return null;
        return <path key={i} d={arcD(cx, cy, r, f, Math.min(percentile, t))} fill="none" stroke={IND_SEG_COLORS[i]} strokeWidth={sw} strokeLinecap="round" />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.9} />
      <circle cx={cx} cy={cy} r={4}   fill="#fff" opacity={0.9} />
      <circle cx={cx} cy={cy} r={2.5} fill="#0f1117" />
      <text x={cx} y={cy - 15} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="600">{percentile.toFixed(1)}%</text>
      <text x={4}   y={cy + 10} textAnchor="start" fill={IND_SEG_COLORS[0]} fontSize="7" fontWeight="700">BOOM</text>
      <text x={176} y={cy + 10} textAnchor="end"   fill={IND_SEG_COLORS[4]} fontSize="7" fontWeight="700">PANIC</text>
    </svg>
  );
}

// ─── 차트 내 임계선 레이블 플러그인 ─────────────────────
const zoneLabelPlugin = {
  id: 'zoneThresholdLabels',
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

// ─── 메인 ────────────────────────────────────────────────
export default function IndicatorDetailScreen({ item, onBack }) {
  const [period, setPeriod] = useState('1년');

  const history    = item.history ?? [];
  const panicUp    = item.panicUp ?? true;
  const cutMap     = { '1년': 12, '3년': 36, '5년': 60, '전체': 9999 };
  const sliced     = history.slice(-(cutMap[period] ?? 9999));
  const thresholds = calcThresholds(history, panicUp);
  const sentence   = buildSentence(item);
  const desc       = DESCRIPTIONS[item.name] ?? null;
  const zone       = ZONE[item.status] ?? ZONE.MILD;

  const step   = Math.ceil(sliced.length / 7);
  const labels = sliced.map((d, i) => i % step === 0 ? d.date.slice(0, 7) : '');
  const values = sliced.map(d => d.value);

  const threshDatasets = (thresholds ?? []).map(t => ({
    data:        sliced.map(() => t.value),
    borderColor: t.color + 'bb',
    borderWidth: 1,
    borderDash:  [5, 3],
    pointRadius: 0,
    fill:        false,
    tension:     0,
    label:       t.label,
    _zoneLabel:  t.label,
    _zoneColor:  t.color,
    order:       2,
  }));

  const chartData = {
    labels,
    datasets: [
      {
        data:             values,
        borderColor:      '#7F77DD',
        borderWidth:      2,
        pointRadius:      values.length > 30 ? 0 : 3,
        pointBackgroundColor: '#7F77DD',
        tension:          0.4,
        fill:             true,
        label:            item.name,
        order:            1,
        backgroundColor: (ctx) => {
          const { chartArea, ctx: c } = ctx.chart;
          if (!chartArea) return '#7F77DD11';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, '#7F77DD44');
          g.addColorStop(1, '#7F77DD00');
          return g;
        },
      },
      ...threshDatasets,
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ctx.datasetIndex > 0 ? null : `${item.name}: ${ctx.parsed.y}`,
          afterBody: (items) => {
            if (!items.length || !thresholds) return [];
            const y = items[0].parsed.y;
            if (panicUp) {
              if (y >= thresholds[3].value) return ['구간: PANIC'];
              if (y >= thresholds[2].value) return ['구간: COLD'];
              if (y >= thresholds[1].value) return ['구간: MILD'];
              if (y >= thresholds[0].value) return ['구간: WARM'];
              return ['구간: BOOM'];
            } else {
              if (y >= thresholds[3].value) return ['구간: BOOM'];
              if (y >= thresholds[2].value) return ['구간: WARM'];
              if (y >= thresholds[1].value) return ['구간: MILD'];
              if (y >= thresholds[0].value) return ['구간: COLD'];
              return ['구간: PANIC'];
            }
          },
        },
      },
    },
    scales: {
      x: {
        ticks:  { font: { size: 9 }, color: '#555', maxRotation: 0, autoSkip: false },
        grid:   { display: false },
        border: { color: '#2a2a35' },
      },
      y: {
        ticks:  { font: { size: 9 }, color: '#555' },
        grid:   { color: 'rgba(255,255,255,0.04)' },
        border: { color: '#2a2a35' },
      },
    },
  };

  const allVals = history.map(d => d.value);
  const maxVal  = allVals.length ? Math.max(...allVals) : null;
  const minVal  = allVals.length ? Math.min(...allVals) : null;

  return (
    <div style={S.wrap}>
      {/* 헤더 */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" /> 지표목록
        </button>
        <span style={S.headerTitle}>{item.name}</span>
        <div style={{ width: 64 }} />
      </div>

      <div style={S.scroll}>
        <div style={S.scrollContent}>

          {/* ① 게이지 + 현재값 카드 */}
          <div style={S.gaugeCard}>
            <IndicatorGauge percentile={item.percentile} status={item.status} />
            <div style={S.gaugeRight}>
              <div style={{ ...S.statusBadge, background: zone.bg, color: zone.color }}>
                {item.status}
              </div>
              <div style={S.gaugeValue}>{item.value}</div>
              {allVals.length > 0 && (
                <div style={S.statsRow}>
                  <div style={S.statsCell}>
                    <div style={S.statsLabel}>최저</div>
                    <div style={S.statsValue}>{minVal?.toFixed(2)}</div>
                  </div>
                  <div style={S.statsDivider} />
                  <div style={S.statsCell}>
                    <div style={S.statsLabel}>최고</div>
                    <div style={S.statsValue}>{maxVal?.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ② 설명 카드 */}
          {(sentence || desc) && (
            <div style={S.descCard}>
              {sentence && <p style={S.sentence}>{sentence}</p>}
              {desc && <p style={S.descSub}>{desc.what}</p>}
            </div>
          )}

          {/* ③ 차트 카드 (맨 아래, 크게) */}
          <div style={S.chartCard}>
            <div style={S.chartHeader}>
              <div>
                <div style={S.chartTitle}>Historical Perspective</div>
                <div style={S.chartSub}>Last Updated: {history.at(-1)?.date ?? '-'}, Monthly</div>
              </div>
              <div style={S.periodRow}>
                {PERIODS.map(p => (
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

            {history.length > 0 ? (
              <div style={{ height: 220, position: 'relative' }}>
                <Line data={chartData} options={options} plugins={[zoneLabelPlugin]} />
              </div>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 11 }}>
                차트 데이터 없음
              </div>
            )}

            {/* 임계선 범례 */}
            {thresholds && (
              <div style={S.threshLegend}>
                {(panicUp
                  ? [
                      { label: 'BOOM',  color: '#22c55e', desc: `< ${thresholds[0].value.toFixed(2)}` },
                      { label: 'WARM',  color: '#84cc16', desc: `${thresholds[0].value.toFixed(2)} ~` },
                      { label: 'MILD',  color: '#eab308', desc: `${thresholds[1].value.toFixed(2)} ~` },
                      { label: 'COLD',  color: '#f97316', desc: `${thresholds[2].value.toFixed(2)} ~` },
                      { label: 'PANIC', color: '#ef4444', desc: `≥ ${thresholds[3].value.toFixed(2)}` },
                    ]
                  : [
                      { label: 'PANIC', color: '#ef4444', desc: `< ${thresholds[0].value.toFixed(2)}` },
                      { label: 'COLD',  color: '#f97316', desc: `${thresholds[0].value.toFixed(2)} ~` },
                      { label: 'MILD',  color: '#eab308', desc: `${thresholds[1].value.toFixed(2)} ~` },
                      { label: 'WARM',  color: '#84cc16', desc: `${thresholds[2].value.toFixed(2)} ~` },
                      { label: 'BOOM',  color: '#22c55e', desc: `≥ ${thresholds[3].value.toFixed(2)}` },
                    ]
                ).map(z => (
                  <div key={z.label} style={S.threshItem}>
                    <div style={{ ...S.threshDash, borderColor: z.color }} />
                    <span style={{ ...S.threshLabel, color: z.color }}>{z.label}</span>
                    <span style={S.threshDesc}>{z.desc}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={S.chartFooter}>
              BOOM (~10%) · WARM (~30%) · MILD (~70%) · COLD (~90%) · PANIC (~100%) · 데이터: FRED / Yahoo Finance
            </div>
          </div>

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

// ─── 스타일 ──────────────────────────────────────────────
const S = {
  wrap:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden' },
  header:        { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0 },
  backBtn:       { background: 'none', border: 'none', color: '#7F77DD', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  headerTitle:   { fontSize: 13, fontWeight: 500, color: '#fff', textAlign: 'center', flex: 1 },
  scroll:        { flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  scrollContent: { padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 },

  // 게이지 카드 (가로 분할)
  gaugeCard:   { background: '#181820', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 },
  gaugeRight:  { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  statusBadge: { fontSize: 10, padding: '3px 10px', borderRadius: 6, fontWeight: 700, alignSelf: 'flex-start' },
  gaugeValue:  { fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 },

  // 설명 카드
  descCard:    { background: '#181820', borderRadius: 12, padding: '14px 14px' },
  sentence:    { fontSize: 11.5, color: '#ccc', lineHeight: 1.8, margin: 0 },
  descSub:     { fontSize: 10, color: '#444', lineHeight: 1.6, margin: '10px 0 0', borderTop: '0.5px solid #1e1e28', paddingTop: 10 },

  // 차트 카드
  chartCard:   { background: '#181820', borderRadius: 12, padding: 14 },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartTitle:  { fontSize: 12, fontWeight: 600, color: '#ccc' },
  chartSub:    { fontSize: 9, color: '#444', marginTop: 2 },
  chartFooter: { fontSize: 8, color: '#2a2a35', marginTop: 10, lineHeight: 1.5 },
  periodRow:   { display: 'flex', gap: 3 },
  pBtn:        { fontSize: 9, padding: '3px 8px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  pBtnActive:  { background: '#EEEDFE', color: '#3C3489', border: 'none' },

  // 임계선 범례
  threshLegend: { display: 'flex', flexWrap: 'wrap', gap: '5px 10px', marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #1e1e28' },
  threshItem:   { display: 'flex', alignItems: 'center', gap: 4 },
  threshDash:   { width: 12, height: 0, borderTop: '1.5px dashed', flexShrink: 0 },
  threshLabel:  { fontSize: 9, fontWeight: 700 },
  threshDesc:   { fontSize: 9, color: '#3a3a4a' },

  // 통계
  statsRow:     { display: 'flex', gap: 16 },
  statsCell:    { textAlign: 'left' },
  statsDivider: { width: 1, background: '#1e1e28', alignSelf: 'stretch' },
  statsLabel:   { fontSize: 9, color: '#444', marginBottom: 2 },
  statsValue:   { fontSize: 12, fontWeight: 500, color: '#666' },
};
