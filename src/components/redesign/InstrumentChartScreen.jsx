"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { computeApproxSignalDetail, attachAuxIndicators, computeRsiContext, computeTimeframeAlignment, buildLiveBars } from '@/lib/stockAnalysis';
import { computeVolatilityContext, percentileToText } from '@/lib/statisticalNormalization';

// ─── 심볼 매핑 ────────────────────────────────────────────
const SYMBOL_MAP = {
  'KOSPI':     '%5EKS11',
  'KOSDAQ':      '%5EKQ11',
  'S&P500':      '%5EGSPC',
  'NASDAQ':      '%5EIXIC',
  '다우':         '%5EDJI',
  '니케이225':   '%5EN225',
  'DAX':         '%5EGDAXI',
  '유로스톡스50': '%5ESTOXX50E',
  '항셍':        '%5EHSI',
  '상해종합':    '000001.SS',
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
  'KOSPI':       { unit: 'pt',    fmt: pt },
  'KOSDAQ':      { unit: 'pt',    fmt: pt },
  'S&P500':      { unit: 'pt',    fmt: pt },
  'NASDAQ':      { unit: 'pt',    fmt: pt },
  '다우':         { unit: 'pt',    fmt: pt },
  '니케이225':   { unit: 'pt',    fmt: pt },
  'DAX':         { unit: 'pt',    fmt: pt },
  '유로스톡스50': { unit: 'pt',    fmt: pt },
  '항셍':        { unit: 'pt',    fmt: pt },
  '상해종합':    { unit: 'pt',    fmt: pt },
  'USD / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'EUR / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'JPY / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'CNY / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'GBP / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'AUD / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'CAD / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'CHF / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'HKD / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  'SGD / KRW': { unit: '원',    fmt: v => v.toFixed(2) },
  '금':        { unit: '$/oz',  fmt: v => '$' + pt(v) },
  '원유(WTI)': { unit: '$/bbl', fmt: v => '$' + v.toFixed(1) },
  '은':        { unit: '$/oz',  fmt: v => '$' + v.toFixed(2) },
  'BTC':       { unit: 'USD',   fmt: v => '$' + pt(v) },
};

// ─── 기술적 분석 의견 (RSI·이동평균·MACD·볼린저밴드·엘더 임펄스·MA60이격도 기반) ──
// 기술적 지표 탭(개별 종목)의 entry_opinion은 herencia-ta 백엔드가 SMC 지지/저항
// 구조까지 반영해 계산하지만, 시장지표(지수·환율·원자재)는 그런 구조 데이터가 없다.
// 대신 종목 상세와 완전히 같은 계산(src/lib/stockAnalysis.ts의 computeApproxSignalDetail,
// 6개 지표 스코어링)을 그대로 재사용해서, 앱 전체가 하나의 기준으로 통일되게 한다 —
// 예전엔 이 화면만 RSI/MA/MACD/BB 4개짜리 로컬 룰을 따로 구현해서 종목 상세(엘더 임펄스·
// MA60 포함 6개)와 기준이 달랐다.
const SIGNAL_LABEL = { buy: '매수 신호', sell: '매도 신호', neutral: '중립' };
const SIGNAL_COLOR = { buy: '#1D9E75', sell: '#E24B4A', neutral: '#666' };

// ── 다중 시간프레임 정합도 ──────────────────────────────────
// computeTimeframeAlignment(일봉 MA5/MA20·주봉 추세·60일 레인지 위치 3축)을 배지+문장으로
// 풀어 쓴다. 위 6개 지표 투표(매수/매도/중립)와는 다른 질문("여러 시간축이 같은 얘기를
// 하고 있는지")에 답하는 신뢰도 지표라, 종목 상세와 같은 원칙대로 매매 권유 표현 없이
// 사실만 서술한다.
// conflicting(실제로 반대 방향 축이 있는 경우)과 insufficient(그냥 신호가 약한 경우)를
// 구분한다 — 상승 1개·중립 2개처럼 실제 충돌이 없는 경우까지 "혼재 국면"이라 부르면,
// 정말로 방향이 정반대로 부딪히는 경우와 같은 취급을 받아 오해를 준다.
//
// alignment.status를 그대로 배지로 보여주면, 위 매수·매도 신호와 방향이 반대일 때
// "하락 정합"이라는 독립적인 반대 의견처럼 읽혀서 "왜 매수 신호인데 하락이라는 거냐"는
// 혼란을 준다 — 실제로는 MACD·엘더 임펄스처럼 빠르게 반응하는 지표가 매수 쪽에 표를
// 몰아줘서 매수 신호가 나왔지만, 더 느리게 움직이는 일봉/주봉/레인지 위치가 아직 그
// 방향을 뒷받침하지 못했다(=신호가 갓 나왔다)는 뜻이다. detail.signal(위 매수/매도
// 신호)과 비교해 "확인됨/미확인"으로 재구성해서, 항상 "위 신호를 얼마나 믿어도 되는지"로
// 귀결시킨다.
function relateAlignmentToSignal(alignment, primarySignal) {
  if (!alignment) return null;
  const { status } = alignment;
  if (status === 'conflicting' || status === 'insufficient') return status;
  if (primarySignal !== 'buy' && primarySignal !== 'sell') return status; // 중립일 땐 비교 대상이 없어 방향 그대로 노출
  const alignDir = status === 'aligned_bullish' ? 'buy' : 'sell';
  return alignDir === primarySignal ? 'confirmed' : 'contradicting';
}
const ALIGNMENT_LABEL = {
  confirmed: '추세로 확인됨', contradicting: '추세 미확인',
  aligned_bullish: '상승 정합', aligned_bearish: '하락 정합',
  conflicting: '혼재 국면', insufficient: '신호 부족',
};
const ALIGNMENT_COLOR = {
  confirmed: '#1D9E75', contradicting: '#f97316',
  aligned_bullish: '#1D9E75', aligned_bearish: '#E24B4A',
  conflicting: '#eab308', insufficient: '#666',
};
const ALIGNMENT_CONFIDENCE_TEXT = { high: '신뢰도가 높은 편', medium: '신뢰도가 보통 수준', low: '신뢰도가 낮은 편' };

function alignmentSentence(alignment, primarySignal) {
  if (!alignment) return null;
  const { status, confidence, bullishCount, bearishCount, weeklyInsufficient } = alignment;
  const caveat = weeklyInsufficient ? ' 주봉 데이터가 아직 충분하지 않아 일봉·레인지 위치 두 기준만 반영됐어요.' : '';
  if (status === 'conflicting') {
    return `일봉 추세·주봉 추세·60일 레인지 내 위치, 세 시간축의 방향이 서로 엇갈리는 혼재 국면이에요. 위 매수·매도 신호는 ${ALIGNMENT_CONFIDENCE_TEXT[confidence]}으로 보는 게 좋아요.${caveat}`;
  }
  if (status === 'insufficient') {
    return `일봉 추세·주봉 추세·60일 레인지 내 위치 대부분이 뚜렷한 방향 없이 중립이라, 시간프레임 사이에서 서로 확인해 줄 신호 자체가 부족해요.${caveat}`;
  }
  const dirWord = status === 'aligned_bullish' ? '상승' : '하락';
  const agreeCount = status === 'aligned_bullish' ? bullishCount : bearishCount;
  const base = `일봉 추세·주봉 추세·60일 레인지 내 위치 중 ${agreeCount}개 시간축이 함께 ${dirWord} 쪽을 가리키고 있어요.`;
  const alignDir = status === 'aligned_bullish' ? 'buy' : 'sell';
  if (primarySignal === 'buy' || primarySignal === 'sell') {
    if (alignDir === primarySignal) {
      return `${base} 위 매수·매도 신호와 같은 방향이라 ${ALIGNMENT_CONFIDENCE_TEXT[confidence]}이에요.${caveat}`;
    }
    return `${base} 다만 이는 위 매수·매도 신호와는 반대 방향이에요 — 그 신호는 MACD·엘더 임펄스처럼 빠르게 반응하는 지표가 주도한 결과이고, 더 느리게 움직이는 일봉·주봉 추세·레인지 위치는 아직 따라오지 못한 상태라 추세로 확정되기보다는 막 나온 신호로 보는 게 좋아요.${caveat}`;
  }
  return `${base} 여러 시간축에서 같은 방향이 확인되는 만큼 ${ALIGNMENT_CONFIDENCE_TEXT[confidence]}이에요.${caveat}`;
}

// 초보자도 읽을 수 있도록 "지표가 뭔지 → 지금 값이 뭘 뜻하는지" 순서로 문장을 만든다.
// value는 카드 헤더에 숫자/상태를 바로 보여주기 위한 짧은 표시값(RSI 44.2, 상승 모멘텀 등).
// rsiContext(있으면): 이 종목/지수 자신의 최근 1년 RSI 분포에서 지금 값이 몇 percentile인지.
// 30/70 고정 임계값 판정(reading/judge)은 그대로 두고, 그 뒤에 "이 자산 기준으로는 상위 몇
// %인지"를 덧붙여 같은 "중립"이라도 평소보다 높은 편인지 낮은 편인지 구분해서 보여준다.
function rsiExplain(rsi, rsiContext) {
  if (rsi == null) return null;
  const val = rsi.toFixed(1);
  let reading, judge;
  if (rsi <= 30) {
    reading = '과매도(짧은 기간 많이 팔려서 가격이 많이 내린 상태)';
    judge = '단기적으로 낙폭이 과했다는 매수 신호로 볼 수 있어요.';
  } else if (rsi >= 70) {
    reading = '과매수(짧은 기간 많이 사서 가격이 많이 오른 상태)';
    judge = '단기적으로 상승폭이 과했다는 매도 신호로 볼 수 있어요.';
  } else {
    reading = '중립 구간';
    judge = '이 지표만 보면 뚜렷한 매수·매도 신호는 없어요.';
  }
  const pctText = rsiContext
    ? ` 참고로 이 자산의 최근 1년 RSI 분포에서 보면 지금 값은 ${percentileToText(rsiContext.percentile)}에 해당해요.`
    : '';
  return {
    label: 'RSI (상대강도지수)',
    value: `${val} · ${rsi <= 30 ? '과매도' : rsi >= 70 ? '과매수' : '중립'}`,
    text: `최근 가격이 얼마나 강하게 오르거나 내렸는지를 0~100 사이 숫자로 나타내요. 보통 70을 넘으면 "많이 올랐다"(과매수), 30 밑이면 "많이 내렸다"(과매도)로 봐요. 지금 값은 ${val}로 ${reading}이고, ${judge}${pctText}`,
  };
}

function maExplain(ma5, ma20) {
  if (ma5 == null || ma20 == null) return null;
  const up = ma5 > ma20;
  return {
    label: '이동평균선 (MA5 · MA20)',
    value: up ? '단기 상승 추세' : '단기 하락 추세',
    text: `최근 며칠 동안의 평균 가격을 이어 그린 선이에요. 짧은 기간(5일) 평균이 긴 기간(20일) 평균보다 위에 있으면 최근 가격이 예전보다 높아지고 있다는 뜻이라 단기 상승 추세로, 아래에 있으면 하락 추세로 봐요. 지금은 5일 평균이 20일 평균보다 ${up ? '위' : '아래'}에 있어서 단기 ${up ? '상승' : '하락'} 추세로 해석돼요.`,
  };
}

function macdExplain(macd) {
  if (macd == null) return null;
  const up = macd > 0;
  return {
    label: 'MACD 히스토그램',
    value: up ? '상승 모멘텀' : '하락 모멘텀',
    text: `단기 추세와 장기 추세가 벌어지는 속도(모멘텀)를 막대로 보여줘요. 0보다 크면 상승에 속도가 붙고 있다는 뜻이고, 0보다 작으면 하락에 속도가 붙고 있다는 뜻이에요. 지금은 ${up ? '0보다 커서 상승 모멘텀이' : '0보다 작아서 하락 모멘텀이'} 진행 중인 것으로 해석돼요.`,
  };
}

function bbExplain(close, upper, lower) {
  if (close == null || upper == null || lower == null) return null;
  let pos, judge, value;
  if (close <= lower) {
    pos = '아래쪽 띠에 닿거나 벗어난'; judge = '단기간에 너무 많이 떨어졌다는 신호로 볼 수 있어요.'; value = '하단 이탈';
  } else if (close >= upper) {
    pos = '위쪽 띠에 닿거나 벗어난'; judge = '단기간에 너무 많이 올랐다는 신호로 볼 수 있어요.'; value = '상단 이탈';
  } else {
    pos = '위아래 띠 안쪽에 있는'; judge = '이 지표만 보면 특별한 신호는 없어요.'; value = '밴드 내';
  }
  return {
    label: '볼린저밴드',
    value,
    text: `최근 20일 평균 가격을 중심으로, 최근 변동폭만큼 위아래에 띠를 두른 거예요. 가격이 ${pos} 상태이며, ${judge}`,
  };
}

// 종목 상세(ScreenerScreen.jsx)의 엘더 임펄스 설명과 같은 정의 — 13일 지수이동평균
// (EMA13, MA5/MA20과는 별개 지표) 기울기 + MACD 모멘텀 기울기가 둘 다 상승/하락이면
// 강세/약세, 엇갈리면 중립.
function elderExplain(elderImpulse) {
  if (elderImpulse == null) return null;
  const value = elderImpulse === 'green' ? '강세' : elderImpulse === 'red' ? '약세' : '중립';
  const detail = elderImpulse === 'green'
    ? '13일 지수이동평균(EMA13, MA5/MA20과는 별개 지표)이 상승하고 MACD 모멘텀도 함께 오르는 상태예요.'
    : elderImpulse === 'red'
    ? '13일 지수이동평균(EMA13, MA5/MA20과는 별개 지표)이 하락하고 MACD 모멘텀도 함께 내려가는 상태예요.'
    : '13일 지수이동평균(EMA13, MA5/MA20과는 별개 지표)과 MACD 모멘텀의 방향이 서로 엇갈린 상태예요.';
  return {
    label: '엘더 임펄스',
    value,
    text: `추세(이동평균 기울기)와 모멘텀(MACD)을 함께 봐서 강세·약세·중립으로 분류하는 지표예요. ${detail}`,
  };
}

// MA5/MA20보다 더 긴 호흡(60일, 약 3개월)의 추세 확인용.
function ma60Explain(close, ma60) {
  if (close == null || ma60 == null) return null;
  const up = close >= ma60;
  const gapPct = ((close - ma60) / ma60 * 100).toFixed(1);
  return {
    label: 'MA60 이격도',
    value: `${gapPct >= 0 ? '+' : ''}${gapPct}%`,
    text: `60일(약 3개월) 평균 가격 대비 지금 가격이 얼마나 떨어져 있는지를 보는, MA5/MA20보다 더 긴 흐름의 추세 지표예요. 지금은 60일 평균보다 ${up ? '위' : '아래'}에 있어서(${gapPct}%) 장기 흐름상 ${up ? '상승' : '하락'} 쪽으로 해석돼요.`,
  };
}

function computeOpinion(history) {
  if (!history?.length) return null;
  const augmented = attachAuxIndicators(history);
  const latest = augmented.at(-1);
  if (!latest) return null;
  const { close, rsi, ma5, ma20, ma60, bb_upper, bb_lower, macd_hist, elder_impulse } = latest;
  const detail = computeApproxSignalDetail(latest);
  const rsiContext = computeRsiContext(augmented);
  const alignment = computeTimeframeAlignment(augmented);

  // votes(computeApproxSignalDetail의 판정)를 그대로 신뢰 소스로 삼아 각 카드의
  // signal을 덮어쓴다 — 카드 문구는 읽기 좋으라고 따로 쓰지만, 배지 색(매수/매도/중립)은
  // 항상 실제 판정과 같은 값에서 나오게 해서 둘이 어긋날 일이 없게 한다.
  const explainByKey = {
    rsi: rsiExplain(rsi, rsiContext), ma: maExplain(ma5, ma20), macd: macdExplain(macd_hist),
    bb: bbExplain(close, bb_upper, bb_lower), elder: elderExplain(elder_impulse),
    ma60: ma60Explain(close, ma60),
  };
  const items = detail.votes
    .map(v => explainByKey[v.key] && { ...explainByKey[v.key], signal: v.vote })
    .filter(Boolean);

  // detail.signal은 6개 지표를 단순 다수결로 세지 않는다 — 추세(MA5/20·MA60, 후행)·
  // 모멘텀(RSI·MACD, 선행)·평균회귀(볼린저)·엘더 임펄스 4개 그룹에 가중치를 주고, 변동성
  // (볼린저 밴드폭)에 따라 저변동성 국면엔 추세를, 고변동성 국면엔 모멘텀·평균회귀를 더
  // 반영하는 가중 합산 결과다. 그래서 "매도 신호 3개, 매수 1개"처럼 개별 지표 표(votes)는
  // 한쪽으로 쏠려도 가중 합산 점수는 임계값을 못 넘어 관망이 나올 수 있다 — 예전엔 여기서
  // "매도 신호가 N개로 가장 많아요"라고 다수결처럼 설명해서, 이런 경우 "표는 매도가
  // 많은데 왜 관망이냐"는 모순으로 읽혔다. 이제는 다수결이라고 주장하지 않고, 개별 표는
  // 참고 숫자로만 괄호에 남긴다.
  const buyCount = detail.buy, sellCount = detail.sell;
  const scoreText = `가중 합산 점수 ${detail.ensembleScore >= 0 ? '+' : ''}${detail.ensembleScore.toFixed(2)}`;
  let opinion, color, verdict;
  if (detail.signal === 'buy') {
    opinion = '매수 관심'; color = '#1D9E75';
    verdict = `추세·모멘텀·평균회귀·엘더 임펄스를 가중치로 합산한 결과(${scoreText})가 매수 쪽으로 기울어 매수 관심 구간으로 판단됩니다. 개별 지표로는 ${items.length}개 중 매수 신호 ${buyCount}개, 매도 신호 ${sellCount}개입니다.`;
  } else if (detail.signal === 'sell') {
    opinion = '매도 관심'; color = '#E24B4A';
    verdict = `추세·모멘텀·평균회귀·엘더 임펄스를 가중치로 합산한 결과(${scoreText})가 매도 쪽으로 기울어 매도 관심 구간으로 판단됩니다. 개별 지표로는 ${items.length}개 중 매수 신호 ${buyCount}개, 매도 신호 ${sellCount}개입니다.`;
  } else {
    opinion = '관망'; color = '#555';
    verdict = `추세·모멘텀·평균회귀·엘더 임펄스를 가중치로 합산한 결과(${scoreText})가 뚜렷한 방향 없이 중립권이라 관망 구간으로 판단됩니다. 개별 지표로는 ${items.length}개 중 매수 신호 ${buyCount}개, 매도 신호 ${sellCount}개인데, 가중 합산에서는 지표 종류(추세·모멘텀 등)에 따라 무게가 달라 단순히 개수가 더 많다고 판정이 정해지지는 않습니다.`;
  }

  // 정합도 배지는 절대 방향("하락 정합")이 아니라 위 매수/매도 신호(detail.signal) 기준
  // 상대 판정("추세로 확인됨"/"추세 미확인")으로 보여준다 — "매수 관심"과 "하락 정합"이
  // 동시에 떠서 서로 모순처럼 읽히는 일이 없게 한다.
  const alignmentRel = alignment ? relateAlignmentToSignal(alignment, detail.signal) : null;

  return { opinion, color, verdict, items, alignment, alignmentRel, primarySignal: detail.signal };
}

// ─── TradingView 스타일 캔들차트 (StockChart.jsx와 동일한 색·구조) ─────
// 한국 증시 관행(상승=빨강/하락=파랑)에 맞춰 캔들·거래량·MACD 히스토그램 색을 통일한다.
const UP = '#E24B4A';
const DOWN = '#3B82F6';
const MA5_COLOR = '#e67e22';
// 캔들 DOWN 색을 파랑으로 바꾸면서 기존 MA20 파랑과 겹쳐 보이는 문제가 생겨 녹색으로 교체.
const MA20_COLOR = '#22A559';
const BB_COLOR = '#95a5a6';
const VWAP_COLOR = '#8e44ad';

const PERIODS = [
  { key: '1M', label: '1개월', days: 22 },
  { key: '3M', label: '3개월', days: 66 },
  { key: '6M', label: '6개월', days: 130 },
  { key: '1Y', label: '1년',   days: 260 },
];

function sliceHistory(history, periodKey) {
  const p = PERIODS.find(x => x.key === periodKey) ?? PERIODS[1];
  return history.slice(-p.days);
}

function lineData(sliced, key) {
  return sliced.filter(h => h[key] != null).map(h => ({ time: h.date, value: h[key] }));
}

const BB_LINE_OPTS = {
  color: BB_COLOR, lineWidth: 1, lineStyle: 2,
  priceLineVisible: false, lastValueVisible: false,
  autoscaleInfoProvider: () => null,
};

const MARGINS_COMPACT = {
  price: { top: 0.05, bottom: 0.32 },
  volume: { top: 0.75, bottom: 0.05 },
};
const MARGINS_WITH_PANES = {
  price: { top: 0.03, bottom: 0.55 },
  volume: { top: 0.48, bottom: 0.36 },
  rsi: { top: 0.67, bottom: 0.17 },
  macd: { top: 0.85, bottom: 0 },
};

function TVChart({ history, hasVolume, meta, height = 300 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [period, setPeriod] = useState('3M');
  const [showPanes, setShowPanes] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#666', fontSize: 10 },
      grid: { vertLines: { color: '#1a1a24' }, horzLines: { color: '#1a1a24' } },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: '#2a2a35' },
      timeScale: { borderColor: '#2a2a35' },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const candle = chart.addCandlestickSeries({
      upColor: UP, downColor: DOWN, borderVisible: false,
      wickUpColor: UP, wickDownColor: DOWN,
    });
    const ma5 = chart.addLineSeries({ color: MA5_COLOR, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ma20 = chart.addLineSeries({ color: MA20_COLOR, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const bbUpper = chart.addLineSeries(BB_LINE_OPTS);
    const bbLower = chart.addLineSeries(BB_LINE_OPTS);
    const vwap = chart.addLineSeries({ color: VWAP_COLOR, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    const volume = chart.addHistogramSeries({ priceScaleId: 'volume', priceLineVisible: false, lastValueVisible: false });
    const rsi = chart.addLineSeries({ color: '#7F77DD', lineWidth: 1, priceScaleId: 'rsi', priceLineVisible: false, lastValueVisible: false });
    const macd = chart.addHistogramSeries({ priceScaleId: 'macd', priceLineVisible: false, lastValueVisible: false });

    chart.priceScale('right').applyOptions({ scaleMargins: MARGINS_COMPACT.price });
    chart.priceScale('volume').applyOptions({ scaleMargins: hasVolume ? MARGINS_COMPACT.volume : { top: 0.99, bottom: 0 }, visible: hasVolume });
    chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false });
    chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false });

    seriesRef.current = { candle, ma5, ma20, bbUpper, bbLower, vwap, volume, rsi, macd };

    chart.subscribeCrosshairMove((param) => {
      const candleData = param.time ? param.seriesData.get(candle) : null;
      if (!candleData) { setTooltip(null); return; }
      const volData = param.seriesData.get(volume);
      setTooltip({
        date: param.time,
        open: candleData.open, high: candleData.high, low: candleData.low, close: candleData.close,
        volume: volData?.value,
      });
    });

    const ro = new ResizeObserver((entries) => {
      chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (showPanes) {
      chart.priceScale('right').applyOptions({ scaleMargins: MARGINS_WITH_PANES.price });
      chart.priceScale('volume').applyOptions({ scaleMargins: MARGINS_WITH_PANES.volume, visible: hasVolume });
      chart.priceScale('rsi').applyOptions({ scaleMargins: MARGINS_WITH_PANES.rsi, visible: true });
      chart.priceScale('macd').applyOptions({ scaleMargins: MARGINS_WITH_PANES.macd, visible: true });
    } else {
      chart.priceScale('right').applyOptions({ scaleMargins: MARGINS_COMPACT.price });
      chart.priceScale('volume').applyOptions({ scaleMargins: hasVolume ? MARGINS_COMPACT.volume : { top: 0.99, bottom: 0 }, visible: hasVolume });
      chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false });
      chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false });
    }
  }, [showPanes, hasVolume]);

  useEffect(() => {
    chartRef.current?.applyOptions({ height });
  }, [height]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s.candle || !history?.length) return;
    const sliced = sliceHistory(history, period);

    s.candle.setData(sliced.filter(h => h.open != null).map(h => ({ time: h.date, open: h.open, high: h.high, low: h.low, close: h.close })));
    s.ma5.setData(lineData(sliced, 'ma5'));
    s.ma20.setData(lineData(sliced, 'ma20'));
    s.bbUpper.setData(lineData(sliced, 'bb_upper'));
    s.bbLower.setData(lineData(sliced, 'bb_lower'));
    s.vwap.setData(hasVolume ? lineData(sliced, 'vwap') : []);
    s.volume.setData(hasVolume ? sliced.map(h => ({ time: h.date, value: h.volume ?? 0, color: h.close >= h.open ? UP + '80' : DOWN + '80' })) : []);
    s.rsi.setData(showPanes ? lineData(sliced, 'rsi') : []);
    s.macd.setData(showPanes ? sliced.filter(h => h.macd_hist != null).map(h => ({ time: h.date, value: h.macd_hist, color: h.macd_hist >= 0 ? UP : DOWN })) : []);

    chartRef.current?.timeScale().fitContent();
  }, [history, period, showPanes, hasVolume]);

  if (!history?.length) {
    return <div style={S.empty}>차트 데이터가 없습니다.</div>;
  }

  return (
    <div>
      <div style={S.toolbar}>
        <div style={S.periodRow}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              style={{ ...S.pBtn, ...(period === p.key ? S.pBtnActive : {}) }}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          style={{ ...S.toggleBtn, ...(showPanes ? S.toggleBtnActive : {}) }}
          onClick={() => setShowPanes(v => !v)}
        >
          RSI · MACD {showPanes ? '숨기기' : '표시'}
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        {tooltip && (
          <div style={S.tooltip}>
            <span style={S.tooltipDate}>{tooltip.date}</span>
            <span>시 {meta?.fmt(tooltip.open)}</span>
            <span>고 {meta?.fmt(tooltip.high)}</span>
            <span>저 {meta?.fmt(tooltip.low)}</span>
            <span style={{ color: tooltip.close >= tooltip.open ? UP : DOWN, fontWeight: 600 }}>
              종 {meta?.fmt(tooltip.close)}
            </span>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>

      {/* 오버레이 범례 */}
      <div style={S.maLegend}>
        {[
          { label: 'MA5', color: MA5_COLOR },
          { label: 'MA20', color: MA20_COLOR },
          { label: 'BB(20,2)', color: BB_COLOR },
          ...(hasVolume ? [{ label: 'VWAP(20)', color: VWAP_COLOR }] : []),
        ].map(({ label, color: c }) => (
          <div key={label} style={S.maItem}>
            <div style={{ width: 16, height: 2, background: c, borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: c }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────
export default function InstrumentChartScreen({ instrumentKey, currentValue, currentChange, onBack }) {
  const meta   = META_MAP[instrumentKey] ?? { unit: '', fmt: v => v };
  const symbol = SYMBOL_MAP[instrumentKey];

  const [history,   setHistory]   = useState([]);
  const [hourlyPoints, setHourlyPoints] = useState(null);
  const [hasVolume, setHasVolume] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!symbol) { setLoading(false); return; }

    let cancelled = false;

    // range=1y(일봉)만 쓰면 RSI/MACD/정합도/가중 합산 점수 같은 "지표"가 이 일봉의 마지막
    // 봉에서 계산되는데, 일부 심볼(특히 FX·원자재)은 Yahoo가 당일 일봉을 장중에 실시간으로
    // 갱신해주지 않아 지표가 하루 종일 그대로처럼 보이는 문제가 있었다(가격 헤더는 별도로
    // MarketTab의 실시간 시세를 쓰다 보니, 헤더 가격은 바뀌는데 지표는 안 바뀌는 것처럼
    // 보임). 종목 상세(StockDetail)가 herencia-ta 일봉 뒤에 오늘자 Yahoo 시간봉을 합성해
    // 붙이는 것과 같은 방식(buildLiveBars)을 여기도 적용해, 시간봉으로 오늘자 봉을 직접
    // 재구성한다.
    const load = (isFirst) => {
      if (isFirst) setLoading(true);
      Promise.all([
        fetch(`/api/chart/${symbol}?range=1y`).then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch(`/api/chart/${symbol}?range=1mo&interval=60m`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
        .then(([d, hourly]) => {
          if (cancelled) return;
          setHistory(d.points ?? []);
          setHasVolume(!!d.hasVolume);
          const points = (hourly?.points ?? []).filter(p => typeof p.date === 'number');
          setHourlyPoints(points);
          setError(null);
        })
        .catch(e => { if (!cancelled) setError(String(e)); })
        .finally(() => { if (isFirst && !cancelled) setLoading(false); });
    };

    load(true);
    // 장중 자동 새로고침 — 탭이 화면에 보일 때만 60초 간격으로 재조회
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, 60_000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [symbol]);

  // herencia-ta 종목 상세(ScreenerScreen.jsx)와 동일한 로직 — 오늘자 시간봉이 있으면
  // 일봉 히스토리 뒤에 합성해 붙여서 RSI/MACD/정합도/가중 합산 점수가 장중에도 갱신되게
  // 한다. 시간봉이 없거나(휴장·데이터 없음) 오늘자 일봉이 이미 최신이면 원본 history를
  // attachAuxIndicators만 거쳐 그대로 쓴다.
  const liveBars = useMemo(() => buildLiveBars(history, hourlyPoints), [history, hourlyPoints]);

  const last3M = liveBars.slice(-66);
  const periodReturn = last3M.length >= 2
    ? ((last3M.at(-1).close - last3M[0].close) / last3M[0].close * 100).toFixed(2)
    : '0';
  const high3M = last3M.length ? Math.max(...last3M.map(h => h.high)) : null;
  const low3M  = last3M.length ? Math.min(...last3M.map(h => h.low))  : null;
  const opinion = computeOpinion(liveBars);
  // ATR(14, Wilder 평활) 대비 오늘 고가-저가 폭이 몇 배인지 — "평소" 변동성 대비 오늘이
  // 얼마나 조용하거나 요동쳤는지를 절대 단위(포인트·원 등, 자산마다 스케일이 달라 비교 불가)
  // 대신 배수로 표현해 자산군을 가리지 않고 비교 가능하게 한다.
  const volCtx = liveBars?.length > 20 ? computeVolatilityContext(liveBars, 14) : null;

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
              {meta?.unit} · 최근 3개월 수익률{' '}
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
              <TVChart history={liveBars} hasVolume={hasVolume} meta={meta} height={260} />
            )}
          </div>

          {/* 기술적 분석 의견 */}
          {!loading && !error && opinion && (
            <div style={S.opinionCard}>
              <div style={S.opinionBadgeRow}>
                <span style={{ ...S.opinionBadge, color: opinion.color, background: opinion.color + '15' }}>
                  {opinion.opinion}
                </span>
                {opinion.alignment && (
                  <span style={{ ...S.opinionBadge, color: ALIGNMENT_COLOR[opinion.alignmentRel], background: ALIGNMENT_COLOR[opinion.alignmentRel] + '15' }}>
                    {ALIGNMENT_LABEL[opinion.alignmentRel]}
                  </span>
                )}
              </div>
              <div style={S.opinionText}>{opinion.verdict}</div>
              {opinion.alignment && <div style={S.opinionText}>{alignmentSentence(opinion.alignment, opinion.primarySignal)}</div>}

              <div style={S.opinionDivider} />
              <div style={S.opinionSubtitle}>판단 근거 (지표별 설명)</div>
              <div style={S.opinionItemList}>
                {opinion.items.map((item, i) => (
                  <div key={i} style={S.opinionItem}>
                    <div style={S.opinionItemHead}>
                      <span style={S.opinionItemLabel}>{item.label}</span>
                      <span style={S.opinionItemValue}>{item.value}</span>
                      <span style={{ ...S.opinionItemTag, color: SIGNAL_COLOR[item.signal], background: SIGNAL_COLOR[item.signal] + '18' }}>
                        {SIGNAL_LABEL[item.signal]}
                      </span>
                    </div>
                    <div style={S.opinionItemText}>{item.text}</div>
                  </div>
                ))}
              </div>

              <div style={S.opinionCaveat}>
                RSI·이동평균·MACD·볼린저밴드·엘더 임펄스·MA60 이격도 6개 지표를 추세·모멘텀·평균회귀·엘더 임펄스 그룹으로 묶어 가중치를 다르게 준 뒤 변동성(볼린저 밴드폭)에 따라 가중치를 조정해 합산한 참고용 판단이며(종목 상세와 같은 계산 기준), 투자 조언이 아닙니다.
                {opinion.alignment && ' 옆의 시간프레임 정합도 배지는 이 계산과는 별도로 일봉(MA5/MA20)·주봉 추세·60일 레인지 위치만 따로 계산한 결과라, 위 지표들(특히 엘더 임펄스)과 방향이 달라도 모순이 아니라 서로 다른 걸 보는 것입니다.'}
              </div>
            </div>
          )}

          {/* 통계 */}
          {!loading && !error && last3M.length > 0 && (
            <div style={S.statsCard}>
              {[
                { label: '조회 기간', value: `${last3M[0].date} ~ ${last3M.at(-1).date} (최근 3개월)` },
                { label: '전체 데이터', value: `${liveBars[0].date} ~ ${liveBars.at(-1).date}` },
                { label: '3개월 최고', value: meta?.fmt(high3M) },
                { label: '3개월 최저', value: meta?.fmt(low3M) },
                { label: '3개월 수익률', value: (+periodReturn >= 0 ? '+' : '') + periodReturn + '%', color: +periodReturn >= 0 ? '#1D9E75' : '#E24B4A' },
                ...(volCtx ? [{ label: '오늘 변동성(ATR14 대비)', value: `${volCtx.atrMultiple.toFixed(1)}배` }] : []),
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

  chartCard: { background: '#181820', borderRadius: 12, padding: 14 },
  loadBox:   { height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 },

  opinionCard: { background: '#181820', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  opinionBadgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  opinionBadge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 7 },
  opinionText: { fontSize: 12.5, color: '#ccc', lineHeight: 1.7 },
  opinionDivider: { height: 1, background: '#1e1e28', margin: '2px 0' },
  opinionSubtitle: { fontSize: 10.5, color: '#555', fontWeight: 600 },
  opinionItemList: { display: 'flex', flexDirection: 'column', gap: 10 },
  opinionItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  opinionItemHead: { display: 'flex', alignItems: 'center', gap: 7 },
  opinionItemLabel: { fontSize: 11.5, color: '#ddd', fontWeight: 600 },
  opinionItemValue: { fontSize: 10.5, color: '#999' },
  opinionItemTag: { fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 5, marginLeft: 'auto' },
  opinionItemText: { fontSize: 11.5, color: '#999', lineHeight: 1.7 },
  opinionCaveat: { fontSize: 9.5, color: '#444', lineHeight: 1.5, marginTop: 2 },

  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  periodRow: { display: 'flex', gap: 4 },
  pBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  pBtnActive: { background: '#252535', color: '#ccc', border: '0.5px solid #444' },
  toggleBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  toggleBtnActive: { background: '#7F77DD20', border: '0.5px solid #7F77DD', color: '#a29dff' },
  empty: { padding: '40px 0', textAlign: 'center', color: '#444', fontSize: 11.5 },

  maLegend: { display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  maItem:   { display: 'flex', alignItems: 'center', gap: 4 },

  tooltip: {
    position: 'absolute', top: 4, left: 4, zIndex: 2,
    display: 'flex', gap: 8, alignItems: 'center',
    background: '#0f1117cc', border: '0.5px solid #2a2a35', borderRadius: 6,
    padding: '4px 8px', fontSize: 10, color: '#999', pointerEvents: 'none',
  },
  tooltipDate: { color: '#666', fontWeight: 500 },

  statsCard: { background: '#181820', borderRadius: 12, overflow: 'hidden' },
  statRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' },
  statLabel: { fontSize: 11, color: '#555' },
  statValue: { fontSize: 12, fontWeight: 500 },
};
