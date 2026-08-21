"use client";

import React, { useState, useEffect } from 'react';

// Sentiment Indicator 탭 = 2개 하위 탭.
// - 나만의 지표: kospi_capitulation_index.py(프로토타입, KRX 미의존) 산출물의 정적 스냅샷
//   (public/data/capitulation_snapshot.json, scripts/import_capitulation_snapshot.js로 수동 갱신).
// - 준비 중: AI 금융_FINAL 파이프라인(텔레그램 10채널 언급량 + 뉴스 Gemini 감성분석 + XGBoost)의
//   정적 스냅샷(public/data/sentiment_snapshot.json, scripts/import_sentiment_snapshot.js로 수동 갱신).
//   원래 이 화면 전체가 이 콘텐츠였으나, "나만의 지표" 탭 신설과 함께 상시 노출은 보류.

const TABS = [
  { key: 'my', title: '나만의 지표', desc: 'KOSPI Capitulation Index로 보는 현재 시장 위치', icon: 'ti-gauge', color: '#7F77DD' },
  { key: 'coming', title: '준비 중', desc: '텔레그램·뉴스 감성 + XGBoost 테마 분석', icon: 'ti-hourglass', color: '#888' },
];

export default function SentimentIndicatorScreen() {
  const [activeTab, setActiveTab] = useState(null);

  if (activeTab) {
    const tab = TABS.find(t => t.key === activeTab);
    return (
      <div className="tab-wrap">
        <div style={S.wrap}>
          <div style={S.detailHeader}>
            <button style={S.backBtn} onClick={() => setActiveTab(null)}>
              <i className="ti ti-chevron-left" /> Sentiment Indicator
            </button>
            <span style={S.detailHeaderTitle}>{tab.title}</span>
            <div style={{ width: 64 }} />
          </div>

          {activeTab === 'my' && <MyIndicatorTab />}
          {activeTab === 'coming' && <ComingSoonTab />}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-wrap">
      <div style={S.menuWrap}>
        <div style={S.menuHeading}>
          <div style={S.menuTitle}>Sentiment Indicator</div>
          <div style={S.menuSubtitle}>보고 싶은 지표를 선택하세요</div>
        </div>
        <div style={S.tabSelectorRow}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={S.tabCard}
            >
              <i className="ti ti-chevron-right" style={S.tabCardChevron} />
              <div style={{ ...S.tabIconCircle, background: `${t.color}1a` }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 26, color: t.color }} />
              </div>
              <div style={S.tabCardTitle}>{t.title}</div>
              <div style={S.tabCardDesc}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 나만의 지표: KOSPI Capitulation Index ─────────────────────────

const COMPONENT_LABELS = {
  vkospi: '변동성',
  sell_pressure: '개인 순매도',
  credit_growth: '신용융자 증감',
  breadth_200ma: '200일선 상회',
  credit_spread: '신용 스프레드',
};

function MyIndicatorTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    fetch('/data/capitulation_snapshot.json')
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <div style={S.emptyText}>스냅샷 데이터를 불러오지 못했어요. scripts/import_capitulation_snapshot.js를 먼저 실행해주세요.</div>;
  }
  if (!data) {
    return <div style={S.emptyText}>불러오는 중…</div>;
  }

  return (
    <>
      <div style={S.headerCard}>
        <div style={S.headerTop}>
          <div style={{ ...S.iconCircle, background: '#7F77DD1a' }}>
            <i className="ti ti-gauge" style={{ fontSize: 20, color: '#7F77DD' }} />
          </div>
          <div>
            <div style={S.title}>KOSPI Capitulation Index</div>
            <div style={S.subtitle}>모간스탠리 리서치 Capitulation Index를 한국 증시 데이터로 재구성한 항복/과열 프로토타입 지표</div>
          </div>
        </div>
        <div style={S.metaRow}>
          <span style={S.badge}>주간 스냅샷 · 실시간 아님</span>
          <span style={S.metaText}>기준일 {data.asOf}</span>
        </div>
      </div>

      <div style={S.bigValueCard}>
        <div style={{ ...S.bigValue, color: data.band.color }}>{data.value.toFixed(2)}</div>
        <div style={{ ...S.bandLabel, color: data.band.color }}>{data.band.label}</div>
        <div style={S.pctText}>과거 전체 기간 중 하위 {data.percentile}% 수준</div>
      </div>

      <CapitulationChart history={data.history} value={data.value} bandColor={data.band.color} />

      <div style={S.interpretCard}>
        <div style={S.interpretText}>{data.interpretation}</div>
      </div>

      <div style={S.sectionLabel}>구성지표 (부호반전 완료: 음수=항복, 양수=과열) — 탭하면 그래프가 열려요</div>
      <div style={S.sideStatsList}>
        {data.components.map(c => {
          const isOpen = expandedKey === c.key;
          const dotColor = c.value == null ? '#666' : c.value <= -1 ? '#1D9E75' : c.value >= 1 ? '#E24B4A' : '#7F77DD';
          return (
            <div key={c.key}>
              <button
                style={S.sideStatRow}
                onClick={() => setExpandedKey(isOpen ? null : c.key)}
              >
                <span style={S.sideStatLabelRow}>
                  <i className={`ti ti-chevron-${isOpen ? 'down' : 'right'}`} style={S.sideStatChevron} />
                  <span style={S.sideStatLabel}>{COMPONENT_LABELS[c.key] || c.label}</span>
                </span>
                <span style={{ ...S.sideStatValue, color: dotColor }}>
                  {c.value == null ? 'N/A' : c.value.toFixed(2)}
                </span>
              </button>
              {isOpen && (
                <div style={S.componentChartWrap}>
                  {c.history && c.history.length > 0 ? (
                    <TimeSeriesChart
                      history={c.history}
                      value={c.value}
                      lineColor={dotColor}
                      dotColor={dotColor}
                      height={110}
                      refLines={[{ v: 0, color: '#555', dash: '2,2' }]}
                    />
                  ) : (
                    <div style={S.emptyText}>이 지표는 히스토리 데이터가 없어요.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={S.opinionCaveat}>
        모간스탠리 원본(Exhibit 4)의 정확한 구성지표·가중치는 비공개라 추정치 기반 프로토타입입니다.
        VKOSPI·개인 순매도·신용융자 잔고·200일선 상회 비율·신용 스프레드 5개 지표를 3년 롤링
        z-score로 표준화해 평균한 뒤 재표준화한 값이며, 투자 조언이 아닌 참고 지표입니다.
        매주 <code style={S.code}>kospi_capitulation_index.py</code> 재실행 후 수동으로 갱신됩니다.
      </div>
    </>
  );
}

function CapitulationChart({ history, value, bandColor }) {
  if (!history || history.length === 0) return null;

  return (
    <div style={S.chartCardOuter}>
      <TimeSeriesChart
        history={history}
        value={value}
        lineColor="#7F77DD"
        dotColor={bandColor}
        refLines={[
          { v: -2, color: '#c0392b', dash: '3,2' },
          { v: -1, color: '#e74c3c', dash: '3,2' },
          { v: 1, color: '#2ecc71', dash: '3,2' },
        ]}
      />
      <div style={S.chartLegendRow}>
        <LegendDot color="#c0392b" label="-2SD 극단적 항복" />
        <LegendDot color="#e74c3c" label="-1SD 항복" />
        <LegendDot color="#2ecc71" label="+1SD 과열" />
      </div>
    </div>
  );
}

// 연도 눈금(2년 간격, matplotlib YearLocator(2)와 동일한 컨벤션)이 있는 y/x축과
// 얇은 선을 그리는 공용 시계열 차트. viewBox 비율(W:H)과 렌더 박스 비율을 CSS
// aspect-ratio로 강제 일치시켜, preserveAspectRatio="none"이어도 텍스트/원이
// 가로로 눌리지 않게 한다.
function TimeSeriesChart({ history, value, lineColor = '#7F77DD', dotColor, refLines = [], height = 150 }) {
  if (!history || history.length === 0) return null;

  const W = 320, H = height, padL = 28, padR = 8, padT = 10, padB = 22;
  const values = history.map(h => h.value);
  const refValues = refLines.map(r => r.v);
  const dataMin = Math.min(...values, ...refValues);
  const dataMax = Math.max(...values, ...refValues);
  const pad = (dataMax - dataMin) * 0.08 || 0.5;
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;
  const range = yMax - yMin || 1;

  const lastIdx = history.length - 1;
  const x = i => padL + (i / Math.max(lastIdx, 1)) * (W - padL - padR);
  const y = v => H - padB - ((v - yMin) / range) * (H - padT - padB);

  const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(h.value).toFixed(1)}`).join(' ');

  const yStep = range > 8 ? 2 : range > 3 ? 1 : 0.5;
  const yTicks = [];
  for (let t = Math.ceil(yMin / yStep) * yStep; t <= yMax + 1e-9; t += yStep) {
    yTicks.push(Math.round(t / yStep) * yStep);
  }

  const startYear = Number(history[0].date.slice(0, 4));
  const endYear = Number(history[lastIdx].date.slice(0, 4));
  const yearToIndex = {};
  history.forEach((h, i) => {
    const yr = h.date.slice(0, 4);
    if (!(yr in yearToIndex)) yearToIndex[yr] = i;
  });
  const xTickYears = [];
  for (let yr = Math.ceil(startYear / 2) * 2; yr <= endYear; yr += 2) xTickYears.push(yr);
  if (xTickYears[0] !== startYear) xTickYears.unshift(startYear);
  if (xTickYears[xTickYears.length - 1] !== endYear) xTickYears.push(endYear);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', aspectRatio: `${W} / ${H}`, display: 'block' }}
      preserveAspectRatio="none"
    >
      {yTicks.map(t => (
        <g key={`y-${t}`}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#20202a" strokeWidth={1} />
          <text x={padL - 5} y={y(t) + 3} fontSize={7.5} fill="#666" textAnchor="end">{t}</text>
        </g>
      ))}
      {refLines.map(r => (
        <line key={`ref-${r.v}`} x1={padL} x2={W - padR} y1={y(r.v)} y2={y(r.v)} stroke={r.color} strokeWidth={1} strokeDasharray={r.dash || '3,2'} opacity={0.7} />
      ))}
      <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="#3a3a46" strokeWidth={1} />
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#3a3a46" strokeWidth={1} />
      <path d={path} fill="none" stroke={lineColor} strokeWidth={1} />
      {value != null && <circle cx={x(lastIdx)} cy={y(value)} r={3} fill={dotColor} />}
      {xTickYears.map(yr => {
        const idx = yearToIndex[String(yr)] ?? 0;
        return (
          <g key={`x-${yr}`}>
            <line x1={x(idx)} x2={x(idx)} y1={H - padB} y2={H - padB + 3} stroke="#555" strokeWidth={1} />
            <text x={x(idx)} y={H - padB + 13} fontSize={7.5} fill="#666" textAnchor="middle">{yr}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={S.legendItem}>
      <span style={{ ...S.legendDot, background: color }} />
      {label}
    </span>
  );
}

// ─── 준비 중: 기존 XGBoost/텔레그램/뉴스 감성 스냅샷 ───────────────

const CHARTS = [
  { file: 'chart1_monthly_theme_change.png', title: '월별 TOP5 테마 변화', desc: '월별 뉴스 감성 기반 TOP5 테마 순위 히트맵' },
  { file: 'chart2_top_stocks.png', title: '테마별 핵심 관련주 상승 확률', desc: 'XGBoost 예측 상승 확률 (빨강: 55% 초과)' },
  { file: 'chart3_sentiment_corr.png', title: '감성점수 vs 익일 수익률', desc: '테마별 감성점수(t일)와 익일 수익률(t+1일) 산점도' },
  { file: 'chart4_sentiment_heatmap.png', title: '월별×테마별 뉴스 감성점수', desc: 'Gemini LLM 감성점수 히트맵' },
  { file: 'chart5_tg_mention_trend.png', title: '텔레그램 월별 테마 언급량', desc: '10개 테마 텔레그램 언급량 추이' },
  { file: 'chart6_feature_importance.png', title: 'XGBoost 피처 중요도', desc: '13개 피처의 예측 기여도' },
  { file: 'chart7_tg_news_ratio.png', title: '텔레그램/뉴스 비율', desc: '값이 높을수록 뉴스 대비 수급 과열' },
];

function pct(v) { return `${(v * 100).toFixed(1)}%`; }
function corrColor(v) { return v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#666'; }
function corrSign(v) { return v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3); }

function ComingSoonTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [activeTheme, setActiveTheme] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetch('/data/sentiment_snapshot.json')
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => { setData(d); setActiveTheme(Object.keys(d.themes)[0]); })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <div style={S.emptyText}>스냅샷 데이터를 불러오지 못했어요. scripts/import_sentiment_snapshot.js를 먼저 실행해주세요.</div>;
  }
  if (!data) {
    return <div style={S.emptyText}>불러오는 중…</div>;
  }

  const themeNames = Object.keys(data.themes);
  const rows = (data.themes[activeTheme] || []).slice(0, 5);

  return (
    <>
      <div style={S.headerCard}>
        <div style={S.headerTop}>
          <div style={S.iconCircle}><i className="ti ti-brain" style={{ fontSize: 20, color: '#7F77DD' }} /></div>
          <div>
            <div style={S.title}>Sentiment Indicator</div>
            <div style={S.subtitle}>텔레그램 10채널 언급량 + 뉴스 감성분석(Gemini) + XGBoost 기반 테마·관련주 분석</div>
          </div>
        </div>
        <div style={S.metaRow}>
          <span style={S.badge}>스냅샷 · 실시간 아님</span>
          <span style={S.metaText}>분석기간 {data.analysisRange}</span>
        </div>
      </div>

      {/* 테마 선택 */}
      <div style={S.sectionLabel}>테마별 핵심 관련주</div>
      <div style={S.chipRow}>
        {themeNames.map(t => (
          <button
            key={t}
            onClick={() => setActiveTheme(t)}
            style={{ ...S.chip, ...(t === activeTheme ? S.chipActive : {}) }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={S.tableCard}>
        <div style={S.tableHeadRow}>
          <span style={{ ...S.th, flex: '0 0 28px' }}>#</span>
          <span style={{ ...S.th, flex: 1 }}>종목</span>
          <span style={{ ...S.th, width: 64, textAlign: 'right' }}>상승확률</span>
          <span style={{ ...S.th, width: 68, textAlign: 'right' }}>감성상관</span>
          <span style={{ ...S.th, width: 60, textAlign: 'right' }}>종합점수</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.stock} style={{ ...S.tableRow, borderBottom: i < rows.length - 1 ? '0.5px solid #1a1a24' : 'none' }}>
            <span style={{ flex: '0 0 28px', color: '#555', fontSize: 12 }}>{r.rank}</span>
            <span style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: 500 }}>{r.stock}</span>
            <span style={{ width: 64, textAlign: 'right', color: '#ccc', fontSize: 12.5 }}>{pct(r.upProb)}</span>
            <span style={{ width: 68, textAlign: 'right', color: corrColor(r.sentimentCorr), fontSize: 12.5, fontWeight: 600 }}>{corrSign(r.sentimentCorr)}</span>
            <span style={{ width: 60, textAlign: 'right', color: '#7F77DD', fontSize: 12.5, fontWeight: 700 }}>{r.totalScore.toFixed(3)}</span>
          </div>
        ))}
      </div>

      {/* 월별 TOP5 테마 */}
      <div style={S.sectionLabel}>월별 TOP5 테마 추이</div>
      <div style={S.monthlyCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.monthlyTable}>
            <thead>
              <tr>
                <th style={S.monthlyTh}>월</th>
                {[1, 2, 3, 4, 5].map(n => <th key={n} style={S.monthlyTh}>{n}위</th>)}
              </tr>
            </thead>
            <tbody>
              {data.monthly.map(m => (
                <tr key={m.month}>
                  <td style={{ ...S.monthlyTd, color: '#888', fontWeight: 500 }}>{m.month}</td>
                  {[0, 1, 2, 3, 4].map(i => (
                    <td
                      key={i}
                      style={{ ...S.monthlyTd, color: m.top[i] === activeTheme ? '#7F77DD' : '#ccc', fontWeight: m.top[i] === activeTheme ? 700 : 400 }}
                    >
                      {m.top[i] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 시각화 갤러리 */}
      <div style={S.sectionLabel}>분석 차트</div>
      <div style={S.chartGrid}>
        {CHARTS.map(c => (
          <button key={c.file} style={S.chartCard} onClick={() => setLightbox(c)}>
            <img src={`/sentiment-charts/${c.file}`} alt={c.title} style={S.chartImg} />
            <div style={S.chartTitle}>{c.title}</div>
            <div style={S.chartDesc}>{c.desc}</div>
          </button>
        ))}
      </div>

      {lightbox && (
        <div style={S.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div style={S.lightboxBox} onClick={e => e.stopPropagation()}>
            <img src={`/sentiment-charts/${lightbox.file}`} alt={lightbox.title} style={S.lightboxImg} />
            <div style={S.lightboxTitle}>{lightbox.title}</div>
            <button style={S.lightboxClose} onClick={() => setLightbox(null)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  wrap: { minHeight: '100%', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 },
  emptyText: { padding: '48px 20px', textAlign: 'center', color: '#666', fontSize: 13 },

  menuWrap: { minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 28 },
  menuHeading: { textAlign: 'center' },
  menuTitle: { fontSize: 19, fontWeight: 700, color: '#fff' },
  menuSubtitle: { fontSize: 12.5, color: '#888', marginTop: 6 },

  tabSelectorRow: { display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%' },
  tabCard: { position: 'relative', flex: '1 1 200px', maxWidth: 240, background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: '28px 18px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  tabIconCircle: { width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tabCardTitle: { fontSize: 14, fontWeight: 700, color: '#fff' },
  tabCardDesc: { fontSize: 11, color: '#888', lineHeight: 1.5 },
  tabCardChevron: { position: 'absolute', top: 14, right: 14, fontSize: 14, color: '#555' },

  detailHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  detailHeaderTitle: { fontSize: 13, fontWeight: 700, color: '#fff' },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0 },

  headerCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, padding: 16, marginBottom: 4 },
  headerTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: '50%', background: '#7F77DD1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 11.5, color: '#888', lineHeight: 1.6 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  badge: { fontSize: 10.5, fontWeight: 600, color: '#EF9F27', background: '#EF9F271a', border: '0.5px solid #EF9F2733', borderRadius: 6, padding: '3px 8px' },
  metaText: { fontSize: 11, color: '#666' },

  sectionLabel: { fontSize: 12.5, fontWeight: 600, color: '#999', marginTop: 8, marginBottom: 2 },

  bigValueCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, padding: '20px 16px', textAlign: 'center' },
  bigValue: { fontSize: 40, fontWeight: 700, letterSpacing: '-1px' },
  bandLabel: { fontSize: 14, fontWeight: 600, marginTop: 4 },
  pctText: { fontSize: 11, color: '#666', marginTop: 6 },

  chartCardOuter: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, padding: '14px 12px 10px' },
  chartLegendRow: { display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888' },
  legendDot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },

  interpretCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 12, padding: 14 },
  interpretText: { fontSize: 12.5, color: '#ccc', lineHeight: 1.7 },

  sideStatsList: { background: '#181820', borderRadius: 10, padding: '4px 12px', border: '0.5px solid #23232f' },
  sideStatRow: { width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid #1a1a24' },
  sideStatLabelRow: { display: 'flex', alignItems: 'center', gap: 5 },
  sideStatChevron: { fontSize: 11, color: '#555' },
  sideStatLabel: { fontSize: 11.5, color: '#888' },
  sideStatValue: { fontSize: 12, fontWeight: 700 },
  componentChartWrap: { padding: '4px 0 12px' },

  opinionCaveat: { fontSize: 10.5, color: '#666', lineHeight: 1.6, padding: '2px 4px 8px' },
  code: { fontSize: 10, background: '#0e0e14', border: '0.5px solid #23232f', borderRadius: 4, padding: '1px 5px' },

  chipRow: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 },
  chip: { flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: '#999', background: '#181820', border: '0.5px solid #23232f', borderRadius: 20, padding: '7px 14px', cursor: 'pointer' },
  chipActive: { color: '#fff', background: '#7F77DD', border: '0.5px solid #7F77DD' },

  tableCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 12, padding: '4px 14px' },
  tableHeadRow: { display: 'flex', alignItems: 'center', padding: '10px 0 8px', borderBottom: '0.5px solid #23232f' },
  th: { fontSize: 10.5, fontWeight: 600, color: '#555' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '11px 0' },

  monthlyCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 12, padding: 12 },
  monthlyTable: { width: '100%', borderCollapse: 'collapse', minWidth: 420 },
  monthlyTh: { fontSize: 10.5, fontWeight: 600, color: '#555', textAlign: 'left', padding: '4px 8px' },
  monthlyTd: { fontSize: 11.5, padding: '5px 8px', borderTop: '0.5px solid #1a1a24', whiteSpace: 'nowrap' },

  chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 2 },
  chartCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 },
  chartImg: { width: '100%', borderRadius: 8, display: 'block', background: '#0e0e14' },
  chartTitle: { fontSize: 12, fontWeight: 600, color: '#ddd' },
  chartDesc: { fontSize: 10.5, color: '#666', lineHeight: 1.5 },

  lightboxOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 },
  lightboxBox: { maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  lightboxImg: { maxWidth: '100%', maxHeight: '75vh', borderRadius: 8, objectFit: 'contain' },
  lightboxTitle: { color: '#fff', fontSize: 13, fontWeight: 600 },
  lightboxClose: { fontSize: 12, fontWeight: 600, color: '#fff', background: '#7F77DD', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' },
};
