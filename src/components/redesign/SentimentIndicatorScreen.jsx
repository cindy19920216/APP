"use client";

import React, { useState, useEffect } from 'react';

// AI 금융_FINAL 파이프라인(텔레그램 10채널 언급량 + 뉴스 Gemini 감성분석 + XGBoost)의
// 정적 스냅샷을 보여주는 화면. v1은 실시간이 아니라 public/data/sentiment_snapshot.json을
// scripts/import_sentiment_snapshot.js로 수동 갱신하는 구조.

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

export default function SentimentIndicatorScreen() {
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
    return (
      <div className="tab-wrap">
        <div style={S.wrap}>
          <div style={S.emptyText}>스냅샷 데이터를 불러오지 못했어요. scripts/import_sentiment_snapshot.js를 먼저 실행해주세요.</div>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="tab-wrap"><div style={S.wrap}><div style={S.emptyText}>불러오는 중…</div></div></div>;
  }

  const themeNames = Object.keys(data.themes);
  const rows = (data.themes[activeTheme] || []).slice(0, 5);

  return (
    <div className="tab-wrap">
      <div style={S.wrap}>
        {/* 헤더 */}
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
    </div>
  );
}

const S = {
  wrap: { minHeight: '100%', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 },
  emptyText: { padding: '48px 20px', textAlign: 'center', color: '#666', fontSize: 13 },

  headerCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, padding: 16, marginBottom: 4 },
  headerTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: '50%', background: '#7F77DD1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 11.5, color: '#888', lineHeight: 1.6 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  badge: { fontSize: 10.5, fontWeight: 600, color: '#EF9F27', background: '#EF9F271a', border: '0.5px solid #EF9F2733', borderRadius: 6, padding: '3px 8px' },
  metaText: { fontSize: 11, color: '#666' },

  sectionLabel: { fontSize: 12.5, fontWeight: 600, color: '#999', marginTop: 8, marginBottom: 2 },

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
