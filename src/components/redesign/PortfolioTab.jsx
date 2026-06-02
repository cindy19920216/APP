"use client";

import React, { useState } from 'react';

// ─── 스타일별 데이터 ───────────────────────────
const STYLES = [
  {
    key: 'momentum',
    name: '모멘텀',
    icon: 'ti-trending-up',
    color: '#7F77DD',
    desc: '최근 3~12개월 주가 상승 종목 추종',
    weekReturn: 8.2,
    stocks: [
      { name: '삼성전자',         ticker: '005930', d: +1.2, w: +8.4,  m: +12.1 },
      { name: 'SK하이닉스',       ticker: '000660', d: +0.8, w: +7.2,  m: +10.3 },
      { name: 'LG에너지솔루션',   ticker: '373220', d: +1.5, w: +6.8,  m: +9.4  },
      { name: '삼성바이오로직스', ticker: '207940', d: +0.6, w: +5.9,  m: +8.7  },
      { name: '현대차',           ticker: '005380', d: +0.4, w: +5.2,  m: +7.2  },
    ],
  },
  {
    key: 'quality',
    name: '퀄리티',
    icon: 'ti-rosette',
    color: '#1D9E75',
    desc: '높은 ROE · 안정적 이익 성장주',
    weekReturn: 5.1,
    stocks: [
      { name: '삼성전자', ticker: '005930', d: +1.2, w: +5.4, m: +8.2 },
      { name: 'NAVER',    ticker: '035420', d: +0.9, w: +4.8, m: +6.3 },
      { name: '카카오',   ticker: '035720', d: +1.1, w: +4.2, m: +5.8 },
      { name: 'LG화학',   ticker: '051910', d: +0.3, w: +3.9, m: +4.1 },
      { name: '셀트리온', ticker: '068270', d: +0.7, w: +3.6, m: +3.8 },
    ],
  },
  {
    key: 'dividend',
    name: '배당',
    icon: 'ti-pig-money',
    color: '#EF9F27',
    desc: '고배당 수익률 · 안정적 현금흐름',
    weekReturn: 3.4,
    stocks: [
      { name: 'KT&G',       ticker: '033780', d: +0.5, w: +3.8, m: +5.2 },
      { name: 'SK텔레콤',   ticker: '017670', d: +0.3, w: +3.1, m: +4.4 },
      { name: '한국전력',   ticker: '015760', d: -0.2, w: +2.8, m: +3.1 },
      { name: '우리금융지주',ticker:'316140', d: +0.4, w: +2.4, m: +3.8 },
      { name: '기업은행',   ticker: '024110', d: +0.2, w: +2.1, m: +2.9 },
    ],
  },
  {
    key: 'value',
    name: '저평가',
    icon: 'ti-discount',
    color: '#378ADD',
    desc: '낮은 PER · PBR 기준 저평가 종목',
    weekReturn: 1.2,
    stocks: [
      { name: '기아',           ticker: '000270', d: +0.3, w: +2.1, m: +3.4 },
      { name: 'POSCO홀딩스',    ticker: '005490', d: -0.4, w: +1.8, m: +2.2 },
      { name: '현대중공업',     ticker: '329180', d: +0.6, w: +1.4, m: +2.8 },
      { name: '한국조선해양',   ticker: '009540', d: +0.5, w: +0.9, m: +1.6 },
      { name: '두산에너빌리티', ticker: '034020', d: -0.3, w: +0.4, m: +0.8 },
    ],
  },
  {
    key: 'growth',
    name: '성장',
    icon: 'ti-rocket',
    color: '#E2844A',
    desc: '높은 매출 · 이익 성장률 기대주',
    weekReturn: -0.8,
    stocks: [
      { name: '알테오젠',     ticker: '196170', d: -1.2, w: +0.4, m: +5.6 },
      { name: '에코프로비엠', ticker: '247540', d: -0.8, w: -0.6, m: -2.1 },
      { name: 'HLB',          ticker: '028300', d: -1.5, w: -1.2, m: +3.2 },
      { name: '포스코퓨처엠', ticker: '003670', d: -0.6, w: -1.8, m: -3.4 },
      { name: '엔켐',         ticker: '348370', d: -0.4, w: -2.1, m: -4.2 },
    ],
  },
].sort((a, b) => b.weekReturn - a.weekReturn);

const MAX_ABS = Math.max(...STYLES.map((s) => Math.abs(s.weekReturn)));

// ─── 유틸 ─────────────────────────────────────
function fmt(v) {
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}

function pctColor(v) {
  if (v > 0) return '#1D9E75';
  if (v < 0) return '#E24B4A';
  return '#555';
}

// ─── 메인 ─────────────────────────────────────
export default function PortfolioTab() {
  const [selected, setSelected] = useState(null);

  const top = STYLES[0];
  const selectedStyle = STYLES.find((s) => s.key === selected);

  return (
    <div className="tab-wrap">

      {/* 이번 주 요약 배너 */}
      <div style={S.banner}>
        <div style={S.bannerLeft}>
          <div style={S.bannerLabel}>이번 주 강세 전략</div>
          <div style={S.bannerRow}>
            <i className={`ti ${top.icon}`} style={{ color: top.color, fontSize: 16 }} />
            <span style={{ ...S.bannerStyle, color: top.color }}>{top.name}</span>
            <span style={S.bannerReturn}>+{top.weekReturn}%</span>
          </div>
          <div style={S.bannerSub}>{top.desc}</div>
        </div>
        <div style={S.trophyWrap}>
          <i className="ti ti-trophy" style={{ fontSize: 32, color: '#EF9F2755' }} />
          <span style={{ fontSize: 24 }}>🏆</span>
        </div>
      </div>

      {/* 스타일 랭킹 */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>시장 스타일 랭킹</span>
          <span style={S.cardSub}>주간 누적 수익률 · 05.28</span>
        </div>

        {STYLES.map((s, i) => {
          const isPos = s.weekReturn >= 0;
          const barW = (Math.abs(s.weekReturn) / MAX_ABS) * 100;
          const isActive = selected === s.key;

          return (
            <button
              key={s.key}
              style={{
                ...S.styleRow,
                background: isActive ? s.color + '12' : 'transparent',
                borderLeft: isActive ? `2.5px solid ${s.color}` : '2.5px solid transparent',
                borderBottom: i < STYLES.length - 1 ? '0.5px solid #151520' : 'none',
              }}
              onClick={() => setSelected(isActive ? null : s.key)}
            >
              {/* 순위 */}
              <div style={{ ...S.rank, color: i === 0 ? '#EF9F27' : '#333' }}>{i + 1}</div>

              {/* 아이콘 + 이름 */}
              <div style={S.styleInfo}>
                <div style={{ ...S.styleIcon, background: s.color + '20' }}>
                  <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 12 }} />
                </div>
                <span style={S.styleName}>{s.name}</span>
              </div>

              {/* 수익률 + 바 */}
              <div style={S.styleRight}>
                <span style={{ ...S.styleReturn, color: isPos ? '#1D9E75' : '#E24B4A' }}>
                  {fmt(s.weekReturn)}
                </span>
                <div style={S.barTrack}>
                  <div
                    style={{
                      ...S.barFill,
                      width: `${barW}%`,
                      background: isPos ? s.color : '#E24B4A',
                    }}
                  />
                </div>
              </div>

              {/* 토글 화살표 */}
              <i
                className={`ti ${isActive ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                style={{ fontSize: 11, color: '#444', marginLeft: 6, flexShrink: 0 }}
              />
            </button>
          );
        })}
      </div>

      {/* 종목 리스트 */}
      {selectedStyle && (
        <div style={S.card}>
          {/* 종목 카드 헤더 */}
          <div style={{ ...S.cardHeader, borderLeft: `3px solid ${selectedStyle.color}`, paddingLeft: 11 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${selectedStyle.icon}`} style={{ color: selectedStyle.color, fontSize: 13 }} />
                <span style={S.cardTitle}>{selectedStyle.name} 포트폴리오</span>
              </div>
              <div style={S.stockSubDesc}>{selectedStyle.desc} · 시총 1조↑ Top 5</div>
            </div>
          </div>

          {/* 테이블 헤더 */}
          <div style={S.tableHead}>
            <span style={{ ...S.th, flex: 1.8 }}>기업명</span>
            <span style={S.th}>일간</span>
            <span style={S.th}>주간</span>
            <span style={S.th}>월간</span>
          </div>

          {/* 종목 행 */}
          {selectedStyle.stocks.map((st, i) => (
            <div
              key={i}
              style={{
                ...S.stockRow,
                borderBottom: i < selectedStyle.stocks.length - 1 ? '0.5px solid #151520' : 'none',
              }}
            >
              <div style={{ ...S.stockName, flex: 1.8 }}>
                <div style={S.stockNameText}>{st.name}</div>
                <div style={S.stockTicker}>{st.ticker}</div>
              </div>
              <span style={{ ...S.td, color: pctColor(st.d) }}>{fmt(st.d)}</span>
              <span style={{ ...S.td, color: pctColor(st.w), fontWeight: 600 }}>{fmt(st.w)}</span>
              <span style={{ ...S.td, color: pctColor(st.m) }}>{fmt(st.m)}</span>
            </div>
          ))}

          {/* 스타일 요약 */}
          <div style={S.summaryRow}>
            <span style={S.summaryLabel}>포트폴리오 평균 주간 수익률</span>
            <span style={{ ...S.summaryValue, color: selectedStyle.weekReturn >= 0 ? '#1D9E75' : '#E24B4A' }}>
              {fmt(selectedStyle.weekReturn)}
            </span>
          </div>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────
const S = {
  banner: {
    background: 'linear-gradient(135deg, #1c1c30 0%, #181820 100%)',
    border: '0.5px solid #2a2a45',
    borderRadius: 14, padding: '14px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  bannerLeft: { flex: 1 },
  bannerLabel: { fontSize: 9, color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 7 },
  bannerRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 },
  bannerStyle: { fontSize: 22, fontWeight: 600 },
  bannerReturn: { fontSize: 18, fontWeight: 500, color: '#1D9E75' },
  bannerSub: { fontSize: 10, color: '#555' },
  trophyWrap: { position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  card: { background: '#181820', borderRadius: 14, overflow: 'hidden' },
  cardHeader: {
    padding: '10px 14px', borderBottom: '0.5px solid #151520',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
  },
  cardTitle: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  cardSub: { fontSize: 10, color: '#444' },

  styleRow: {
    width: '100%', display: 'flex', alignItems: 'center',
    padding: '11px 14px', gap: 8,
    cursor: 'pointer', textAlign: 'left', border: 'none',
    transition: 'background 0.15s',
  },
  rank: { fontSize: 12, fontWeight: 600, width: 14, flexShrink: 0, textAlign: 'center' },
  styleInfo: { display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
  styleIcon: {
    width: 24, height: 24, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  styleName: { fontSize: 13, fontWeight: 500, color: '#fff' },
  styleRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  styleReturn: { fontSize: 12, fontWeight: 500, width: 48, textAlign: 'right', flexShrink: 0 },
  barTrack: { width: 72, height: 5, background: '#252530', borderRadius: 3, overflow: 'hidden', flexShrink: 0 },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },

  stockSubDesc: { fontSize: 9, color: '#444', marginTop: 2 },

  tableHead: {
    display: 'flex', padding: '7px 14px',
    borderBottom: '0.5px solid #1e1e28', background: '#13131e',
  },
  th: { flex: 1, fontSize: 9, color: '#444', textAlign: 'right', letterSpacing: '0.3px', textTransform: 'uppercase' },

  stockRow: { display: 'flex', alignItems: 'center', padding: '10px 14px' },
  stockName: { display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' },
  stockNameText: { fontSize: 12, color: '#ddd', fontWeight: 500 },
  stockTicker: { fontSize: 9, color: '#3a3a4a' },
  td: { flex: 1, fontSize: 12, textAlign: 'right' },

  summaryRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', background: '#13131e', borderTop: '0.5px solid #1e1e28',
  },
  summaryLabel: { fontSize: 10, color: '#444' },
  summaryValue: { fontSize: 13, fontWeight: 600 },
};
