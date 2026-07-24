"use client";

import React from 'react';

// indicators.py가 계산하는 지표들을 카테고리별로 묶어 설명하는 정적 가이드 화면.
const CATEGORIES = [
  {
    icon: 'ti-trending-up',
    title: '추세',
    items: [
      {
        name: '이동평균선 (MA5/20/60)',
        desc: '종가의 5·20·60일 평균을 이어 그린 선입니다. 단기선이 장기선 위에 있으면 상승 추세, 아래 있으면 하락 추세로 해석합니다.',
      },
      {
        name: 'MACD',
        desc: '단기(12일)·장기(26일) 이동평균의 차이로 추세 전환을 포착하는 오실레이터입니다. 히스토그램이 0선 위에서 커지면 상승 모멘텀 강화, 줄어들면 약화 신호로 봅니다.',
      },
      {
        name: 'ADX',
        desc: '추세의 강도를 0~100으로 나타냅니다. 25 이상이면 뚜렷한 추세, 20 이하면 방향성 없는 횡보 구간으로 해석하되, 방향 자체는 알려주지 않습니다.',
      },
      {
        name: '피벗포인트',
        desc: '전일 고가·저가·종가로 산출한 당일 지지/저항 예상선(PP, R1~R2, S1~S2)입니다. 단기 매매의 기준선으로 활용됩니다.',
      },
    ],
  },
  {
    icon: 'ti-gauge',
    title: '모멘텀',
    items: [
      {
        name: 'RSI',
        desc: '최근 14일간 상승폭과 하락폭의 비율을 0~100으로 환산한 과매수/과매도 지표입니다. 통상 70 이상은 과매수, 30 이하는 과매도로 해석합니다.',
      },
      {
        name: '스토캐스틱 (%K · %D)',
        desc: '최근 가격 범위에서 현재 종가의 상대적 위치를 나타내는 오실레이터입니다. 80 이상은 과매수, 20 이하는 과매도 구간으로 봅니다.',
      },
      {
        name: '매수우위비율',
        desc: '최근 20일 중 상승 마감한 날의 거래량이 전체 거래량에서 차지하는 비중입니다. 50%를 넘으면 매수 세력 우위, 낮으면 매도 세력 우위로 해석합니다.',
      },
    ],
  },
  {
    icon: 'ti-activity',
    title: '변동성',
    items: [
      {
        name: '볼린저밴드',
        desc: '20일 이동평균을 중심으로 표준편차 2배 폭의 상/하단 밴드입니다. 밴드 폭이 좁아지면 변동성 수축(스퀴즈), 종가가 상단/하단을 이탈하면 추세 가속 신호로 봅니다.',
      },
      {
        name: 'ATR',
        desc: '최근 변동폭의 평균으로 절대적인 변동성 크기를 나타냅니다. 손절폭이나 목표가를 설정할 때 참고하는 지표입니다.',
      },
      {
        name: '스퀴즈 모멘텀',
        desc: '볼린저밴드가 켈트너 채널 안으로 수축하면 "Squeeze ON"(에너지 응축 구간)으로 표시하고, 모멘텀 값의 방향으로 향후 돌파 방향을 가늠합니다.',
      },
    ],
  },
  {
    icon: 'ti-chart-dots',
    title: '구조 · 스마트머니(SMC)',
    items: [
      {
        name: 'SMC존 (Discount · Premium · Equilibrium)',
        desc: '최근 60봉 스윙 고점-저점을 절반으로 나눠, 저점 쪽 50%를 Discount(매수 관심 구역), 고점 쪽 50%를 Premium(매도/차익실현 구역), 정중앙을 Equilibrium(균형가)으로 구분합니다.',
      },
      {
        name: 'CHoCH (추세 전환)',
        desc: '최근 구간을 절반으로 나눠 직전 스윙 고점/저점 돌파 여부로 추세 전환을 판정하는 단순화된 구조 신호입니다. 실제 SMC의 정밀한 BOS/CHoCH 대비 근사치입니다.',
      },
      {
        name: '엘더 임펄스',
        desc: '13일 지수이평(EMA13)의 기울기와 MACD 히스토그램의 기울기를 함께 봐서 초록(매수 가능)·빨강(신규 매수 자제)·파랑(중립)으로 분류하는 시스템입니다.',
      },
    ],
  },
  {
    icon: 'ti-chart-histogram',
    title: '거래량 · 기타',
    items: [
      {
        name: 'VWAP',
        desc: '거래대금을 거래량으로 나눈 거래량 가중 평균가입니다. 일봉 데이터 특성상 당일 VWAP이 아니라 최근 20봉 rolling 평균으로 계산합니다. 종가가 위에 있으면 매수 우위로 봅니다.',
      },
      {
        name: '돈치안 채널',
        desc: '최근 20봉의 최고가/최저가로 그리는 채널입니다. 상단 돌파는 신고가 갱신(추세 추종), 하단 이탈은 신저가 갱신 신호로 활용됩니다.',
      },
      {
        name: 'POC (Point of Control)',
        desc: '최근 구간 거래량 프로파일에서 거래량이 가장 많이 쌓인 가격대입니다. 시장 참여자들이 가장 활발히 거래한 "무게중심 가격"으로, 지지/저항으로 자주 작용합니다.',
      },
    ],
  },
];

export default function IndicatorGuideScreen({ onBack }) {
  return (
    <div style={S.wrap}>
      <div style={S.header}>
        {onBack ? (
          <button style={S.backBtn} onClick={onBack}>
            <i className="ti ti-chevron-left" /> 스크리너
          </button>
        ) : <div style={{ width: 64 }} />}
        <span style={S.headerTitle}>기술적 지표 알아보기</span>
        <div style={{ width: 64 }} />
      </div>

      <div style={S.scroll}>
        <div style={S.scrollContent}>
          <div style={S.intro}>
            KOSPI200 스크리너가 계산하는 기술적 지표들을 카테고리별로 정리했어요.
            종목 상세 화면에서 값이 무엇을 의미하는지 헷갈릴 때 참고하세요.
          </div>

          {CATEGORIES.map((cat, ci) => (
            <div key={ci} style={S.card}>
              <div style={S.cardHeader}>
                <i className={`ti ${cat.icon}`} style={{ color: '#7F77DD', fontSize: 13, marginRight: 6 }} />
                <span style={S.cardTitle}>{cat.title}</span>
              </div>
              {cat.items.map((item, ii) => (
                <div
                  key={ii}
                  style={{ ...S.itemRow, borderBottom: ii < cat.items.length - 1 ? '0.5px solid #151520' : 'none' }}
                >
                  <div style={S.itemName}>{item.name}</div>
                  <div style={S.itemDesc}>{item.desc}</div>
                </div>
              ))}
            </div>
          ))}

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden' },
  header: { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 14, fontWeight: 500, color: '#fff' },
  scroll: { flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  scrollContent: { padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 },

  intro: { fontSize: 11.5, color: '#666', lineHeight: 1.7, padding: '2px 4px 4px' },

  card: { background: '#181820', borderRadius: 12, overflow: 'hidden' },
  cardHeader: { padding: '10px 14px', borderBottom: '0.5px solid #151520', display: 'flex', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: 500, color: '#ccc' },

  itemRow: { padding: '11px 14px' },
  itemName: { fontSize: 12, color: '#ddd', fontWeight: 500, marginBottom: 5 },
  itemDesc: { fontSize: 11, color: '#666', lineHeight: 1.6 },
};
