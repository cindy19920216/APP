"use client";

import React, { useState, useEffect, useMemo } from 'react';
import IndicatorGuideScreen from './IndicatorGuideScreen';
import DesktopModal from './DesktopModal';
import StockChart from './StockChart';
import useIsDesktop from '@/hooks/useIsDesktop';
import {
  computeADX, detectCandlePatterns, detectSignalFlips, computeWeeklyTrend, computeStockSentiment,
  buildLiveBars, computeApproxSignalDetail, computeElderImpulse, computeSwingZone, computeRsiContext,
  computeTimeframeAlignment,
} from '@/lib/stockAnalysis';
import { computeVolatilityContext, describeVolatilityMultiple, percentileToText } from '@/lib/statisticalNormalization';

// ─── 유틸 ─────────────────────────────────
function trendColor(t) {
  if (t === '강세') return '#1D9E75';
  if (t === '약세') return '#E24B4A';
  return '#888';
}
function opinionColor(op) {
  if (op.startsWith('매수')) return '#1D9E75';
  if (op.startsWith('매도')) return '#E24B4A';
  return '#fff';
}
function opinionLabel(op) {
  return op.split('(')[0].trim();
}
// 목록의 실시간 근사 진입의견 배지 — /api/screener-live가 종목코드별로 내려주는
// buy/sell/neutral 신호를 표시용 라벨/색으로 변환.
const LIVE_SIGNAL_LABEL = { buy: '실시간 매수', sell: '실시간 매도', neutral: '실시간 관망' };
function liveSignalColor(signal) {
  if (signal === 'buy') return '#1D9E75';
  if (signal === 'sell') return '#E24B4A';
  return '#fff';
}
function formatMarketCap(v) {
  if (v == null) return '-';
  if (v >= 10000) return (v / 10000).toFixed(1) + '조';
  return v.toLocaleString() + '억';
}
function fmtNum(v, dec = 1) {
  return typeof v === 'number' ? v.toFixed(dec) : '-';
}
function fmtPrice(v) {
  return typeof v === 'number' ? v.toLocaleString() : '-';
}
function elderColor(c) {
  if (c === 'green') return '#1D9E75';
  if (c === 'red') return '#E24B4A';
  return '#7F77DD';
}
// "강세(매수 가능)"/"약세(신규 매수 자제)"처럼 라벨 자체에 매매 권유가 붙어 있으면, 이
// 값이 상단 실시간 매매신호와 다를 때(예: 매도인데 엘더 임펄스는 중립) "권하기 어렵다"는
// 말이 그 자체로 관망을 권하는 것처럼 읽혀서 배지랑 다른 얘기를 하는 것처럼 보인다.
// 라벨은 상태(강세/약세/중립)만 말하고, 권유 뉘앙스는 전부 뺀다.
function elderLabel(c) {
  if (c === 'green') return '강세';
  if (c === 'red') return '약세';
  return '중립';
}
// 엘더 임펄스 시스템: 13일 이평선 추세 + MACD 히스토그램 모멘텀이 둘 다 상승이면
// 초록(매수 가능), 둘 다 하락이면 빨강(신규 매수 자제), 방향이 엇갈리면 중립(파랑)으로
// 분류하는 알렉산더 엘더의 지표. buildStockSummary에 풀어 써서 요약문 톤이 이 판정과
// 어긋나지 않게(예: 가격은 급등했는데 문단은 계속 긍정적으로만 읽히는 일이 없게) 한다.
// 위 sentence2가 쓰는 MA5/MA20(5·20일 단순이평 교차)과는 다른 지표라, 문구에서 "이동평균"
// 대신 "13일 지수이동평균(EMA13)"으로 명시해 두 문장이 서로 다른 걸 말한다는 게 분명하게
// 읽히도록 한다 — 안 그러면 "MA5가 MA20 위(상승)"와 "이동평균 추세 하락"이 한 문단 안에서
// 같은 지표를 가리키는 것처럼 보여 모순처럼 읽힌다.
// "권하기 어렵다"/"안전하게 보는 시점"/"정리를 고려" 같은 표현은 그 자체로 하나의
// 매매 권유(=사실상 관망 권유)라, 상단 배지가 매도인데 이 문장은 "그럼 관망해라"로
// 읽혀서 또 따로 노는 문제가 생긴다. 그래서 권유 표현은 다 빼고, EMA13·MACD가 지금
// 어떤 상태인지만 사실 그대로 설명한다 — 판단은 위 실시간 매매신호 하나로 통일.
function elderImpulseExplain(c) {
  if (c === 'green') return '13일 지수이동평균(EMA13, MA5/MA20과는 별개 지표)이 상승하고 MACD 모멘텀도 함께 오르는 상태입니다.';
  if (c === 'red') return '13일 지수이동평균(EMA13, MA5/MA20과는 별개 지표)이 하락하고 MACD 모멘텀도 함께 내려가는 상태입니다.';
  return '13일 지수이동평균(EMA13, MA5/MA20과는 별개 지표)과 MACD 모멘텀의 방향이 서로 엇갈린 상태입니다.';
}

// ── 다중 시간프레임 정합도 표시 ────────────────────────────
// computeTimeframeAlignment(일봉·주봉·60일 레인지 위치 3축)의 결과를 배지/문장으로
// 풀어 쓴다. 매수·매도 권유가 아니라 "여러 시간축이 같은 얘기를 하고 있는지"만
// 사실대로 알려주는 신뢰도 지표라, 엘더 임펄스와 같은 원칙(권유 표현 배제)을 따른다.
// conflicting(정말 반대 방향 축이 있는 경우)과 insufficient(그냥 신호가 약한 경우)를
// 구분한다 — 상승 1개·중립 2개처럼 실제 충돌이 없는 경우까지 "혼재 국면"이라 부르면,
// 정말로 방향이 정반대로 부딪히는 경우와 같은 취급을 받아 오해를 준다.
//
// alignment.status("aligned_bullish"/"aligned_bearish")를 그대로 배지로 보여주면, 위
// 실시간 매매신호(예: "매수 관심")와 방향이 반대일 때 "하락 정합"이라는 독립적인 반대
// 의견처럼 읽혀서 "왜 매수 관심인데 하락이라는 거냐"는 혼란을 준다 — 실제로는 그런
// 게 아니라, MACD·엘더 임펄스처럼 빠르게 반응하는 지표가 매수 쪽 6표 중 다수를 차지해
// 매수 관심으로 판정됐지만, 더 느리게 움직이는 일봉/주봉/레인지 위치가 아직 그 방향을
// 뒷받침하지 못했다는(=신호가 갓 나왔다는) 뜻이다. 그래서 primarySignal(위 매매신호)과
// 비교해 "확인됨/미확인(반대)"로 재구성한 relateAlignmentToSignal을 배지·문장 둘 다에
// 쓴다 — 절대적인 방향 주장이 아니라 "위 신호를 얼마나 믿어도 되는지"로 항상 귀결시킨다.
function relateAlignmentToSignal(alignment, primarySignal) {
  if (!alignment) return null;
  const { status } = alignment;
  if (status === 'conflicting' || status === 'insufficient') return status;
  if (primarySignal !== 'buy' && primarySignal !== 'sell') return status; // 관망일 땐 비교 대상이 없어 방향 그대로 노출
  const alignDir = status === 'aligned_bullish' ? 'buy' : 'sell';
  return alignDir === primarySignal ? 'confirmed' : 'contradicting';
}
function alignmentLabel(rel) {
  if (rel === 'confirmed') return '추세로 확인됨';
  if (rel === 'contradicting') return '추세 미확인';
  if (rel === 'aligned_bullish') return '상승 정합';
  if (rel === 'aligned_bearish') return '하락 정합';
  if (rel === 'conflicting') return '혼재 국면';
  return '신호 부족';
}
function alignmentColor(rel) {
  if (rel === 'confirmed') return '#1D9E75';
  if (rel === 'contradicting') return '#f97316';
  if (rel === 'aligned_bullish') return '#1D9E75';
  if (rel === 'aligned_bearish') return '#E24B4A';
  if (rel === 'conflicting') return '#eab308';
  return '#666';
}
const CONFIDENCE_TEXT = { high: '신뢰도가 높은 편', medium: '신뢰도가 보통 수준', low: '신뢰도가 낮은 편' };
function alignmentSentence(alignment, primarySignal) {
  if (!alignment) return '';
  const { status, confidence, bullishCount, bearishCount, weeklyInsufficient } = alignment;
  const caveat = weeklyInsufficient ? ' (주봉 데이터가 아직 충분하지 않아 일봉·레인지 위치 두 기준만 반영됐습니다.)' : '';
  if (status === 'conflicting') {
    return `일봉 추세·주봉 추세·60일 레인지 내 위치, 세 시간축의 방향이 서로 엇갈리는 혼재 국면이라 위 실시간 매매신호는 ${CONFIDENCE_TEXT[confidence]}으로 보는 게 좋습니다.${caveat}`;
  }
  if (status === 'insufficient') {
    return `일봉 추세·주봉 추세·60일 레인지 내 위치 대부분이 뚜렷한 방향 없이 중립이라, 시간프레임 사이에서 서로 확인해 줄 신호 자체가 부족한 구간입니다.${caveat}`;
  }
  const dirWord = status === 'aligned_bullish' ? '상승' : '하락';
  const agreeCount = status === 'aligned_bullish' ? bullishCount : bearishCount;
  const base = `일봉 추세·주봉 추세·60일 레인지 내 위치 중 ${agreeCount}개 시간축이 함께 ${dirWord} 쪽을 가리키고 있습니다.`;
  const alignDir = status === 'aligned_bullish' ? 'buy' : 'sell';
  if (primarySignal === 'buy' || primarySignal === 'sell') {
    if (alignDir === primarySignal) {
      return `${base} 위 실시간 매매신호와 같은 방향이라 ${CONFIDENCE_TEXT[confidence]}입니다.${caveat}`;
    }
    return `${base} 다만 이는 위 실시간 매매신호와는 반대 방향입니다 — 그 신호는 MACD·엘더 임펄스처럼 빠르게 반응하는 지표가 주도한 결과이고, 더 느리게 움직이는 일봉·주봉 추세·레인지 위치는 아직 따라오지 못한 상태라 추세로 확정되기보다는 막 나온 신호로 보는 게 좋습니다.${caveat}`;
  }
  return `${base} 여러 시간축에서 같은 방향이 확인되는 만큼 ${CONFIDENCE_TEXT[confidence]}입니다.${caveat}`;
}
function chochLabel(c) {
  if (c === 'bullish') return '상승 전환';
  if (c === 'bearish') return '하락 전환';
  return '미감지';
}
function pclr(v) {
  if (v > 0) return '#1D9E75';
  if (v < 0) return '#E24B4A';
  return '#888';
}
function rsiLabel(v) {
  if (v == null) return '-';
  if (v >= 70) return '과매수';
  if (v <= 30) return '과매도';
  return '중립';
}
function macdMomentumText(v) {
  if (v == null) return '-';
  return v >= 0 ? '상승 모멘텀' : '하락 모멘텀';
}
function pctVsLow(close, low) {
  if (close == null || low == null || low === 0) return null;
  return ((close - low) / low) * 100;
}
function eunNeun(word) {
  if (!word) return '는';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return '는';
  return (code - 0xAC00) % 28 !== 0 ? '은' : '는';
}

// ─── 종목 상세 요약 문단 (자동 생성) ─────────
// live가 있으면(오늘 합성봉 반영됨) 가격/RSI/이평선은 실시간 값을 우선 쓴다 —
// herencia-ta의 daily ind 값만 쓰면 장중 급등락일 때 문단 내용이 헤더(실시간)와
// 어긋나 보인다.
function buildStockSummary(detail, history, live) {
  const ind = detail.indicators ?? {};
  const close = live?.close ?? ind.close;
  const prev = live?.prevClose ?? ind.prev_close;
  if (close == null) return '';

  const change = prev != null ? close - prev : null;

  // 변화폭을 "일반적/드문" 같은 라벨로만 부르면 그 뒤의 실제 수치(몇 배인지)가 사라진다.
  // ATR(14, 고가-저가 기반 Wilder 평활)을 이 종목의 "평소 변동성" 기준으로 삼아 오늘 변화폭이
  // 몇 배인지 계산하고, 라벨 옆에 배수를 숫자로 같이 보여준다(예: "평균보다 큰 변화 폭
  // (ATR 대비 약 2.1배)"). high/low가 없어 ATR을 못 구하면(데이터 부족) 라벨을 생략한다.
  let changeCtx = '';
  let atrMultipleText = '';
  if (history?.length > 20 && change != null) {
    const volCtx = computeVolatilityContext(history, 14);
    if (volCtx) {
      const multiple = Math.abs(change) / volCtx.atr;
      changeCtx = describeVolatilityMultiple(multiple);
      atrMultipleText = ` (ATR 대비 약 ${multiple.toFixed(1)}배)`;
    }
  }

  const dir = change != null && change >= 0 ? '상승' : '하락';
  const topic = eunNeun(detail.name);
  const sentence1 = change != null
    ? (changeCtx
        ? `현재 ${detail.name}${topic} ${fmtPrice(close)}원으로, 전일 종가 대비 ${fmtPrice(Math.abs(change))}원 ${dir}했습니다(${changeCtx} 변화 폭${atrMultipleText}).`
        : `현재 ${detail.name}${topic} ${fmtPrice(close)}원으로, 전일 종가 대비 ${fmtPrice(Math.abs(change))}원 ${dir}했습니다.`)
    : `현재 ${detail.name}${topic} ${fmtPrice(close)}원입니다.`;

  const rsiVal = live?.rsi ?? ind.rsi;
  const rsiCtx = live?.rsiContext;
  // "중립 구간"이라는 라벨은 30~70 사이 전부를 하나로 뭉뚱그린다. 이 종목의 최근 1년
  // RSI 분포에서 지금 값이 상위 몇 %인지를 괄호로 덧붙여, 같은 "중립"이라도 40대 중반과
  // 60대 중반은 다르다는 걸 구분해서 보여준다.
  const rsiPctText = rsiCtx ? `(최근 1년 분포 기준 ${percentileToText(rsiCtx.percentile)})` : '';
  const ma5Val = live?.ma5 ?? ind.ma5;
  const ma20Val = live?.ma20 ?? ind.ma20;
  const maText = ma5Val != null && ma20Val != null
    ? (ma5Val >= ma20Val ? 'MA5가 MA20 위에 위치해 단기 상승 추세를 보이고 있습니다.' : 'MA5가 MA20 아래에 위치해 단기 하락 추세를 보이고 있습니다.')
    : '';
  let sentence2 = '';
  if (rsiVal != null && maText) sentence2 = `RSI는 ${fmtNum(rsiVal)}로 ${rsiLabel(rsiVal)} 구간${rsiPctText}이며, ${maText}`;
  else if (rsiVal != null) sentence2 = `RSI는 ${fmtNum(rsiVal)}로 ${rsiLabel(rsiVal)} 구간${rsiPctText}입니다.`;
  else if (maText) sentence2 = maText;

  // Discount/Premium 구간과 엘더 임펄스는 상단 "실시간 매매신호" 배지와 같은 기준(오늘
  // 합성봉 포함 최근 값)으로 통일한다 — live에 값이 있으면(오늘 시세 반영) 그걸 쓰고,
  // 없으면(장 마감 후 등 합성봉이 없을 때) herencia-ta 공식값으로 폴백한다.
  const equilibrium = live?.equilibrium ?? ind.equilibrium;
  const swingHigh = live?.swingHigh ?? ind.swing_high;
  const swingLow = live?.swingLow ?? ind.swing_low;

  // 엘더 임펄스는 computeApproxSignal의 6개 투표에 포함되므로, 가격·RSI·MA와 같은
  // "1문단(=위 실시간 매매신호 계산에 쓰이는 값들)"에 넣는다. 문장마다 "이 지표도
  // 6개 중 하나"를 반복하는 대신, 문단 자체를 계산에 포함되는 값들로만 묶어서 위치로
  // 표현한다 — 단, 방향이 갈릴 때는 왜 다른지(소수 의견으로 반영) 설명은 그대로 남긴다.
  const elderImpulse = live?.elderImpulse ?? ind.elder_impulse;
  const primarySignal = live?.primarySignal;
  let elderSentence = '';
  if (elderImpulse != null) {
    const elderDir = elderImpulse === 'green' ? 'buy' : elderImpulse === 'red' ? 'sell' : 'neutral';
    if (primarySignal != null && elderDir !== 'neutral' && primarySignal !== 'neutral' && elderDir === primarySignal) {
      elderSentence = `추세와 모멘텀을 함께 보는 엘더 임펄스도 ${elderLabel(elderImpulse)}로 나타나, 위 실시간 매매신호와 같은 방향입니다. ${elderImpulseExplain(elderImpulse)}`;
    } else if (primarySignal != null && elderDir !== 'neutral' && primarySignal !== 'neutral' && elderDir !== primarySignal) {
      elderSentence = `추세와 모멘텀을 함께 보는 엘더 임펄스만 보면 ${elderLabel(elderImpulse)}로, 위 실시간 매매신호와는 다른 방향인데, 나머지 5개 지표와 함께 계산돼 전체 결과에는 소수 의견으로 반영됐습니다. ${elderImpulseExplain(elderImpulse)}`;
    } else {
      elderSentence = `추세와 모멘텀을 함께 보는 엘더 임펄스는 ${elderLabel(elderImpulse)}로 나타나며, ${elderImpulseExplain(elderImpulse)}`;
    }
  }

  // 1문단: 가격 + RSI/MA5vs20 + 엘더 임펄스 — 전부 위 "실시간 매매신호" 계산에 쓰이는 값.
  const paragraph1 = [sentence1, sentence2, elderSentence].filter(Boolean).join(' ');

  // Discount/Premium(60거래일 가격 범위 내 위치)은 computeApproxSignal 점수에서 뺐다 —
  // 평균회귀형이라(떨어질 만큼 떨어지면 "싸다"=매수로 투표) 추세추종 지표들과 정반대로
  // 투표하는 게 정상 동작인데, 매 봉 무조건 투표하다 보니 추세 쪽 표를 계속 상쇄시켜
  // 관망 비율이 크게 늘어나는 부작용이 있었다(stockAnalysis.ts의 computeApproxSignal
  // 주석 참고). 그래서 계산에 쓰이는 1문단과는 분리된 2문단("한편"으로 시작)에 순수
  // 참고 정보로만 둔다 — 문단 자체가 나뉘어 있어 "계산 안에 있는 값 vs 안 쓰이는 참고
  // 값"이 한눈에 구분된다.
  // 이 문단의 "저렴한/비싼 구간"은 평균회귀 관점(쌌으니 반등 가능)인데, 바로 아래 3문단
  // (시간프레임 정합도)은 같은 종가-중간값 비교를 추세 구조 관점(저점권=하락 구조, 고점권=
  // 상승 구조)으로 정반대로 해석한다. 같은 숫자를 다른 렌즈로 두 번 쓰는 건 의도한
  // 설계지만, 아무 설명 없이 두 문단이 뚝뚝 끊어져 있으면 서로 모순되는 것처럼 읽힌다.
  // 그래서 여기서 "관점이 다르다"는 걸 한 문장으로 미리 밝혀 둔다.
  let paragraph2 = '';
  if (equilibrium != null && close != null) {
    const isDiscount = close < equilibrium;
    const zoneLabel = isDiscount ? 'Discount(저가 구간)' : 'Premium(고가 구간)';
    const rangeText = (swingHigh != null && swingLow != null)
      ? `이는 최근 60거래일 고점 ${fmtPrice(swingHigh)}원과 저점 ${fmtPrice(swingLow)}원의 중간값(${fmtPrice(equilibrium)}원)보다 ${isDiscount ? '낮다는' : '높다는'} 의미로, 상대적으로 ${isDiscount ? '저렴한' : '비싼'} 구간이라는 뜻입니다.`
      : '';
    const lensNote = live?.alignment
      ? ` 단, 이 "저렴함/비쌈"은 평균회귀 관점의 해석이고, 같은 위치를 추세 구조 관점에서 다시 보는 시간프레임 정합도는 아래에 따로 있습니다.`
      : '';
    paragraph2 = rangeText
      ? `한편 스윙 구조상으로는 ${zoneLabel}에 위치해 있는데, ${rangeText} 이 위치 정보는 위 실시간 매매신호 계산에는 포함되지 않는 별도 참고 지표입니다.${lensNote}`
      : `한편 스윙 구조상으로는 ${zoneLabel}에 위치해 있습니다. 이 위치 정보는 위 실시간 매매신호 계산에는 포함되지 않는 별도 참고 지표입니다.${lensNote}`;
  }

  // 3문단: 다중 시간프레임 정합도 — 위 실시간 매매신호(1문단)를 그대로 믿어도 되는지에
  // 대한 신뢰도 코멘트라, 계산에 쓰이는 값(1문단)도 참고 정보(2문단)도 아닌 별도 문단으로 둔다.
  const paragraph3 = alignmentSentence(live?.alignment, live?.primarySignal);

  return [paragraph1, paragraph2, paragraph3].filter(Boolean).join('\n\n');
}

const FILTERS = [
  { key: 'all',  label: '전체' },
  { key: 'buy',  label: '매수 관심' },
  { key: 'sell', label: '매도 관심' },
  { key: 'hold', label: '관망' },
];
// 실시간 신호(stock.liveSignal, ScreenerScreen에서 병합)가 있으면 그걸 기준으로,
// 없으면(아직 계산 전/그 종목만 실패) 공식 entry_opinion으로 폴백 — 필터 칩/카운트/
// 목록 배지가 항상 같은 값을 기준으로 삼도록 이 함수 하나로 통일한다.
function effectiveSignal(stock) {
  if (stock.liveSignal) return stock.liveSignal;
  if (stock.entry_opinion.startsWith('매수')) return 'buy';
  if (stock.entry_opinion.startsWith('매도')) return 'sell';
  return 'neutral';
}
// 목록의 "추세" 배지도 herencia-ta 공식값(다른 시점 기준) 대신 진입의견과 같은
// effectiveSignal 하나로 통일해서 파생한다 — 두 컬럼이 서로 다른 소스를 보여주면서
// 어긋나 보이는 일이 없도록, 항상 같은 값에서 같이 나오게 한다.
function liveTrendLabel(signal) {
  if (signal === 'buy') return '강세';
  if (signal === 'sell') return '약세';
  return '혼조';
}
function matchesFilter(stock, key) {
  if (key === 'all') return true;
  const sig = effectiveSignal(stock);
  if (key === 'buy') return sig === 'buy';
  if (key === 'sell') return sig === 'sell';
  return sig === 'neutral';
}

// ─── 지표 그룹 섹션 (종목 상세용) ────────────
function IndicatorSection({ title, cells }) {
  return (
    <div style={S.indSection}>
      <div style={S.indSectionTitle}>{title}</div>
      <div style={S.indSectionGrid}>
        {cells.map(({ label, value }) => (
          <DetailStat key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function SideStat({ label, value, valueColor }) {
  return (
    <div style={S.sideStatRow}>
      <span style={S.sideStatLabel}>{label}</span>
      <span style={{ ...S.sideStatValue, ...(valueColor ? { color: valueColor } : {}) }}>{value}</span>
    </div>
  );
}

function RawIndicatorSections({ ind }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <IndicatorSection
        title="추세"
        cells={[
          { label: 'MA5', value: fmtPrice(ind.ma5) },
          { label: 'MA20', value: fmtPrice(ind.ma20) },
          { label: 'MA60', value: fmtPrice(ind.ma60) },
          { label: 'MACD Hist', value: fmtNum(ind.macd_hist) },
        ]}
      />
      <IndicatorSection
        title="모멘텀"
        cells={[
          { label: 'RSI', value: fmtNum(ind.rsi) },
          { label: 'Stoch %K', value: fmtNum(ind.stoch_k) },
          { label: 'Stoch %D', value: fmtNum(ind.stoch_d) },
          { label: '매수우위비율', value: fmtNum(ind.buy_volume_ratio) + '%' },
        ]}
      />
      <IndicatorSection
        title="변동성"
        cells={[
          { label: 'BB 상단', value: fmtPrice(ind.bb_upper) },
          { label: 'BB 하단', value: fmtPrice(ind.bb_lower) },
          { label: 'ATR', value: fmtPrice(ind.atr) },
          { label: '스퀴즈', value: ind.sqz_on ? 'ON' : 'OFF' },
        ]}
      />
      <IndicatorSection
        title="구조 · SMC"
        cells={[
          { label: '스윙 고점', value: fmtPrice(ind.swing_high) },
          { label: '스윙 저점', value: fmtPrice(ind.swing_low) },
          { label: 'Equilibrium', value: fmtPrice(ind.equilibrium) },
          { label: 'CHoCH', value: chochLabel(ind.choch) },
        ]}
      />
      <IndicatorSection
        title="거래량 · 기타"
        cells={[
          { label: 'VWAP', value: fmtPrice(ind.vwap) },
          { label: '돈치안 상단', value: fmtPrice(ind.donchian_upper) },
          { label: '돈치안 하단', value: fmtPrice(ind.donchian_lower) },
          { label: 'POC', value: fmtPrice(ind.poc) },
        ]}
      />
    </div>
  );
}

// ─── 종목 상세 탭바 ───────────────────────
const DETAIL_TABS = [
  { key: 'chart', label: '차트' },
  { key: 'news', label: '뉴스' },
  { key: 'ai', label: 'AI 분석' },
  { key: 'sentiment', label: '공포탐욕지수' },
];
function DetailTabBar({ active, onChange }) {
  return (
    <div style={S.detailTabBar}>
      {DETAIL_TABS.map(t => (
        <button
          key={t.key}
          style={{ ...S.detailTabBtn, ...(active === t.key ? S.detailTabBtnActive : {}) }}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── 뉴스 탭 ──────────────────────────────
function NewsPanel({ loading, headlines, source }) {
  if (loading) return <div style={S.detailLoading}>뉴스를 불러오는 중...</div>;
  if (!headlines || headlines.length === 0) {
    return <div style={S.summaryText}>관련 뉴스를 찾지 못했습니다.</div>;
  }
  return (
    <div style={S.newsList}>
      {headlines.map((h, i) => {
        const meta = [h.media, h.date].filter(Boolean).join(' · ');
        const body = (
          <div style={S.newsItem}>
            <i className="ti ti-news" style={{ fontSize: 12, color: '#7F77DD', flexShrink: 0, marginTop: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={S.newsItemText}>{h.title}</span>
              {meta && <span style={S.newsItemMeta}>{meta}</span>}
              {h.summary && <span style={S.newsItemSummary}>{h.summary}</span>}
            </div>
          </div>
        );
        return h.url ? (
          <a key={i} href={h.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            {body}
          </a>
        ) : (
          <div key={i}>{body}</div>
        );
      })}
      <div style={S.opinionCaveat}>
        {source === 'batch'
          ? '매일 자동 수집·번역된 외신 위주 뉴스입니다.'
          : 'Google 뉴스 검색 결과이며, 이 앱이 직접 검증한 내용이 아닙니다.'}
      </div>
    </div>
  );
}

// ─── AI 분석 탭 ───────────────────────────
const VERDICT_COLOR = { 상승: '#1D9E75', 하락: '#E24B4A', 보합: '#888' };
function AiPanel({ state, loading, error, stale, onRerun }) {
  if (loading && !state) return <div style={S.detailLoading}>AI가 지표를 분석하는 중...</div>;
  if (error && !state) return <div style={S.summaryText}>AI 분석에 실패했습니다: {error}</div>;
  if (!state) return <div style={S.summaryText}>분석 결과가 없습니다.</div>;

  return (
    <div style={S.aiPanel}>
      {stale && (
        <div style={S.aiStaleBanner}>
          <span>AI 분석 결과가 오래됐어요. 지금 시장 가격을 반영하려면 재분석해 주세요.</span>
          <button style={S.aiRerunBtn} onClick={onRerun} disabled={loading}>
            {loading ? '분석 중...' : '재분석'}
          </button>
        </div>
      )}
      <div style={S.aiHeadRow}>
        <span style={{ ...S.opinionBadge, color: VERDICT_COLOR[state.verdict] ?? '#888', background: (VERDICT_COLOR[state.verdict] ?? '#888') + '15' }}>
          {state.verdict}
        </span>
        <span style={S.aiIndicatorTag}>{state.indicatorCount}종 지표 적용</span>
        <span style={S.aiTimestamp}>{new Date(state.generatedAt).toLocaleString('ko-KR')}</span>
      </div>
      <div style={S.aiText}>{state.text}</div>
    </div>
  );
}

// ─── 공포탐욕지수 탭 (반원 게이지) ─────────
function sentimentArcD(cx, cy, r, from, to) {
  const a1 = Math.PI * (1 - from / 100);
  const a2 = Math.PI * (1 - to / 100);
  const x1 = (cx + r * Math.cos(a1)).toFixed(2);
  const y1 = (cy - r * Math.sin(a1)).toFixed(2);
  const x2 = (cx + r * Math.cos(a2)).toFixed(2);
  const y2 = (cy - r * Math.sin(a2)).toFixed(2);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${(to - from) > 50 ? 1 : 0} 0 ${x2} ${y2}`;
}
const SENTIMENT_SEGS = [
  { from: 0, to: 20, color: '#ef4444' },
  { from: 20, to: 40, color: '#f97316' },
  { from: 40, to: 60, color: '#eab308' },
  { from: 60, to: 80, color: '#84cc16' },
  { from: 80, to: 100, color: '#22c55e' },
];
function SentimentGauge({ score }) {
  const cx = 130, cy = 104, r = 76, sw = 11;
  const angle = Math.PI * (1 - score / 100);
  const nx = (cx + (r - 13) * Math.cos(angle)).toFixed(2);
  const ny = (cy - (r - 13) * Math.sin(angle)).toFixed(2);
  return (
    <svg viewBox="0 0 260 120" style={{ width: '100%' }}>
      {SENTIMENT_SEGS.map((z, i) => (
        <path key={i} d={sentimentArcD(cx, cy, r, z.from, z.to)} fill="none" stroke={z.color + '2a'} strokeWidth={sw} />
      ))}
      {SENTIMENT_SEGS.map((z, i) => {
        if (score <= z.from) return null;
        return <path key={i} d={sentimentArcD(cx, cy, r, z.from, Math.min(score, z.to))} fill="none" stroke={z.color} strokeWidth={sw} strokeLinecap="round" />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      <circle cx={cx} cy={cy} r={5} fill="#fff" opacity={0.9} />
      <circle cx={cx} cy={cy} r={3} fill="#0f1117" />
      <text x={cx} y={cy - 24} textAnchor="middle" fill="#fff" fontSize="30" fontWeight="500" letterSpacing="-1">{score}</text>
      <text x={8} y={cy + 13} textAnchor="start" fill={SENTIMENT_SEGS[0].color} fontSize="9" fontWeight="700">공포</text>
      <text x={252} y={cy + 13} textAnchor="end" fill={SENTIMENT_SEGS[4].color} fontSize="9" fontWeight="700">탐욕</text>
    </svg>
  );
}
function SentimentPanel({ sentiment }) {
  return (
    <div style={S.sentimentPanel}>
      <div style={S.gaugeCard}>
        <SentimentGauge score={sentiment.score} />
        <div style={{ textAlign: 'center', color: sentiment.color, fontSize: 13, fontWeight: 600 }}>{sentiment.label}</div>
      </div>
      <div style={S.sideStatsList}>
        {sentiment.breakdown.map(b => (
          <SideStat key={b.label} label={b.label} value={Math.round(b.score)} />
        ))}
      </div>
      <div style={S.opinionCaveat}>
        RSI·볼린저밴드 위치·MA20 이격도·52주 레인지 위치·MACD 부호를 가중 합산한 이 종목 전용
        근사 지수입니다. 시장지표 탭의 BOOM-BURST 종합지수와는 별개의 방법론입니다.
      </div>
    </div>
  );
}

// ─── 종목 상세 (아코디언 인라인 / 데스크톱 우측 패널) ─
function StockDetail({ code, apiBase }) {
  const isDesktop = useIsDesktop();
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [newsData, setNewsData] = useState(null);
  const [newsSource, setNewsSource] = useState('live');
  const [newsLoading, setNewsLoading] = useState(false);
  const [aiState, setAiState] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiAttempted, setAiAttempted] = useState(false);
  const [currentLivePrice, setCurrentLivePrice] = useState(null);
  const [livePrevClose, setLivePrevClose] = useState(null);
  const [hourlyPoints, setHourlyPoints] = useState(null);

  useEffect(() => {
    setLoading(true);
    setShowRaw(false);
    setActiveTab('chart');
    setNewsData(null);
    setAiState(null);
    setAiAttempted(false);
    setAiError(null);
    setCurrentLivePrice(null);
    setLivePrevClose(null);
    setHourlyPoints(null);
    Promise.all([
      fetch(`${apiBase}/api/stocks/${code}`).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/stocks/${code}/history`).then(r => r.ok ? r.json() : []),
    ])
      .then(([d, h]) => { setDetail(d); setHistory(Array.isArray(h) ? h : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code, apiBase]);

  // AI 분석은 Gemini 호출 비용 때문에 세션 내에서는 종목당 결과를 재사용한다.
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`ai-report-${code}`);
      if (cached) setAiState(JSON.parse(cached));
    } catch { /* noop */ }
  }, [code]);

  const liveBars = useMemo(() => buildLiveBars(history, hourlyPoints), [history, hourlyPoints]);
  const patterns = useMemo(() => detectCandlePatterns(liveBars), [liveBars]);
  const signalFlips = useMemo(() => detectSignalFlips(liveBars), [liveBars]);
  const adx = useMemo(() => computeADX(liveBars), [liveBars]);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(liveBars), [liveBars]);
  const sentiment = useMemo(() => computeStockSentiment(liveBars), [liveBars]);
  const liveElderImpulse = useMemo(() => computeElderImpulse(liveBars), [liveBars]);
  const liveSwingZone = useMemo(() => computeSwingZone(liveBars), [liveBars]);
  const rsiContext = useMemo(() => computeRsiContext(liveBars), [liveBars]);
  const alignment = useMemo(() => computeTimeframeAlignment(liveBars), [liveBars]);

  const runAiAnalysis = () => {
    if (!detail) return;
    const di = detail.indicators ?? {};
    setAiAttempted(true);
    setAiLoading(true);
    setAiError(null);

    // herencia-ta의 close는 최근 확정 일봉(전일 종가 기준)이라, AI 분석 시점의 실제
    // 현재가(지연 포함)는 시장지표 탭과 같은 Yahoo Finance 경로에서 따로 받아온다.
    fetch(`/api/chart/${code}?range=1d&interval=5m`)
      .then(r => r.ok ? r.json() : null)
      .then(chartData => chartData?.meta?.regularMarketPrice ?? di.close)
      .catch(() => di.close)
      .then(livePrice => fetch('/api/stock-ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: detail.name,
          code,
          price: di.close,
          livePrice,
          indicators: {
            close: di.close, prev_close: di.prev_close, rsi: di.rsi, ma5: di.ma5, ma20: di.ma20, ma60: di.ma60,
            macd_hist: di.macd_hist, bb_upper: di.bb_upper, bb_lower: di.bb_lower, atr: di.atr, vwap: di.vwap,
            donchian_upper: di.donchian_upper, donchian_lower: di.donchian_lower, poc: di.poc,
            swing_high: di.swing_high, swing_low: di.swing_low, equilibrium: di.equilibrium, entry_opinion: detail.entry_opinion,
            elder_impulse: di.elder_impulse,
          },
          extra: {
            adx: adx.adx, plusDI: adx.plusDI, minusDI: adx.minusDI,
            patterns: patterns.slice(-3), signalFlips: signalFlips.slice(-5), weeklyTrend,
          },
        }),
      }))
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setAiError(d.error || 'AI 분석에 실패했습니다.'); return; }
        const next = { text: d.text, verdict: d.verdict, indicatorCount: d.indicatorCount, generatedAt: d.generatedAt, priceAtAnalysis: d.livePrice ?? di.close };
        setAiState(next);
        try { sessionStorage.setItem(`ai-report-${code}`, JSON.stringify(next)); } catch { /* noop */ }
      })
      .catch(e => setAiError(String(e)))
      .finally(() => setAiLoading(false));
  };

  // AI 분석 탭에 처음 들어왔고 캐시된 결과가 없을 때만 자동 호출(온디맨드).
  useEffect(() => {
    if (activeTab === 'ai' && detail && !aiState && !aiAttempted && !aiLoading) {
      runAiAnalysis();
    }
  }, [activeTab, detail, aiState, aiAttempted, aiLoading]);

  useEffect(() => {
    if (activeTab !== 'news' || newsData || !detail?.name) return;
    setNewsLoading(true);
    fetch(`/api/stock-news?name=${encodeURIComponent(detail.name)}&code=${code}`)
      .then(r => r.ok ? r.json() : { headlines: [] })
      .then(d => { setNewsData(d.headlines ?? []); setNewsSource(d.source ?? 'live'); })
      .catch(() => setNewsData([]))
      .finally(() => setNewsLoading(false));
  }, [activeTab, detail, newsData]);

  // 차트/AI 분석 탭이 열려 있는 동안 실시간(지연 포함) 현재가를 따로 추적 — herencia-ta의
  // 일봉 지표(RSI/MACD/진입의견 등)는 전일 종가 기준이라 장중 급등락이 반영되지 않는다.
  // 가격 헤더는 이 값으로 보여주고, "재분석 필요" 배너의 가격 변동 판단에도 이 값을 쓴다.
  useEffect(() => {
    if ((activeTab !== 'ai' && activeTab !== 'chart') || !code) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/chart/${code}?range=1d&interval=5m`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (cancelled || !d?.meta) return;
          if (d.meta.regularMarketPrice != null) setCurrentLivePrice(d.meta.regularMarketPrice);
          if (d.meta.previousClose != null) setLivePrevClose(d.meta.previousClose);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeTab, code]);

  // 오늘자 시간봉(StockChart.jsx의 "1시간" 옵션과 동일 데이터) — ADX/캔들패턴/매매신호/
  // 공포탐욕지수/AI판정 같은 "근사치" 계산에 당일 급등락을 반영하기 위해 buildLiveBars로
  // 일봉 히스토리 뒤에 합성해 붙인다. 시간봉 단위 데이터라 자연스럽게 매시 갱신된다.
  useEffect(() => {
    if ((activeTab !== 'ai' && activeTab !== 'chart') || !code) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/chart/${code}?range=1mo&interval=60m`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!cancelled && Array.isArray(d?.points)) setHourlyPoints(d.points); })
        .catch(() => {});
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 10 * 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeTab, code]);

  if (loading) return <div style={S.detailLoading}>불러오는 중...</div>;
  if (!detail) return <div style={S.detailLoading}>상세 정보를 불러오지 못했습니다.</div>;

  const ind = detail.indicators ?? {};
  const close = ind.close, prev = ind.prev_close;
  const vsLow = pctVsLow(close, ind.low_52w);
  // AI 분석 시점의 가격(livePrice 기준)과 비교해야 하므로, herencia-ta 일봉 종가(close)가
  // 아니라 AI 탭에서 폴링 중인 currentLivePrice(없으면 close로 폴백)를 기준으로 삼는다.
  const referencePrice = currentLivePrice ?? close;
  const isStale = !!aiState && (
    (referencePrice != null && aiState.priceAtAnalysis && Math.abs((referencePrice - aiState.priceAtAnalysis) / aiState.priceAtAnalysis) > 0.01) ||
    (Date.now() - new Date(aiState.generatedAt).getTime() > 30 * 60 * 1000)
  );

  // 가격 헤더는 herencia-ta의 전일 종가(close)가 아니라 실시간(지연 포함) 시세를 우선
  // 보여준다 — RSI/MACD/진입의견 같은 지표는 여전히 일봉(전일 종가) 기준이라 급등락
  // 당일에는 헤더 가격과 아래 지표 설명이 다른 기준일 수 있다는 걸 캡션으로 알려준다.
  const displayPrice = currentLivePrice ?? close;
  const displayPrevClose = currentLivePrice != null ? (livePrevClose ?? prev) : prev;
  const change = (displayPrice != null && displayPrevClose != null) ? displayPrice - displayPrevClose : null;
  const pct = (change != null && displayPrevClose) ? (change / displayPrevClose) * 100 : null;
  const showsLive = currentLivePrice != null && close != null && Math.abs(currentLivePrice - close) / close > 0.001;

  // liveBars가 history보다 길면 오늘자 합성봉이 실제로 반영된 것 — ADX/패턴/신호/
  // 공포탐욕지수가 "몇 시 기준"인지 hourlyPoints의 마지막 시간봉에서 뽑아 보여준다.
  const liveBarsActive = liveBars.length > history.length;
  const lastHourKst = liveBarsActive && hourlyPoints?.length
    ? new Date((hourlyPoints.at(-1).date + 9 * 3600) * 1000).getUTCHours()
    : null;

  // 진입의견(매수 관심/매도 관심/관망)도 실시간 근사치로 별도 표시 — 공식
  // entry_opinion(헤더의 detail.entry_opinion)은 herencia-ta 전일 기준 그대로 둔다.
  // 요약 문단(아래)이 이 값을 "기준 신호"로 참조해야 해서 buildStockSummary보다 먼저 계산한다.
  const liveBarsLatest = liveBars.at(-1);
  const LIVE_OPINION_LABEL = { buy: '매수 관심', sell: '매도 관심', neutral: '관망' };
  const LIVE_OPINION_COLOR = { buy: '#1D9E75', sell: '#E24B4A', neutral: '#fff' };
  // computeApproxSignalDetail을 직접 써서 ensembleScore(가중 합산 점수)까지 받는다 —
  // signal은 이제 6표 다수결이 아니라 추세·모멘텀·평균회귀·엘더 임펄스 가중 합산이라,
  // 사이드 스탯에 점수 자체를 같이 보여줘야 "왜 이 판정인지" 근거를 확인할 수 있다.
  const liveOpinionDetail = computeApproxSignalDetail(liveBarsLatest ?? {});
  const liveOpinionSignal = liveOpinionDetail.signal;
  const liveOpinionLabel = LIVE_OPINION_LABEL[liveOpinionSignal];
  const liveOpinionColor = LIVE_OPINION_COLOR[liveOpinionSignal];
  // 정합도 배지는 절대 방향("하락 정합")이 아니라 위 실시간 매매신호 기준 상대 판정
  // ("추세로 확인됨"/"추세 미확인")으로 보여준다 — 그래야 "매수 관심"인데 "하락 정합"이
  // 동시에 뜨는 것처럼 보여서 서로 모순처럼 읽히는 일이 없다.
  const alignmentRel = alignment ? relateAlignmentToSignal(alignment, liveOpinionSignal) : null;

  // 요약 문단도 herencia-ta의 daily RSI/MA가 아니라 오늘 합성봉 반영값을 우선 쓴다.
  // primarySignal(위 liveOpinionSignal)을 함께 넘겨서, 엘더 임펄스 문장이 독자적인
  // 매수/매도 권유처럼 읽히지 않고 "기준 신호"인 진입의견과의 관계로 설명되게 한다.
  const summary = buildStockSummary(detail, history, {
    close: displayPrice,
    prevClose: displayPrevClose,
    rsi: liveBarsLatest?.rsi,
    rsiContext,
    alignment,
    ma5: liveBarsLatest?.ma5,
    ma20: liveBarsLatest?.ma20,
    elderImpulse: liveElderImpulse,
    equilibrium: liveSwingZone?.equilibrium,
    swingHigh: liveSwingZone?.swingHigh,
    swingLow: liveSwingZone?.swingLow,
    primarySignal: liveOpinionSignal,
  });

  // 사이드/키 스탯(엘더 임펄스·RSI·MACD)도 전부 요약 문단과 같은 기준으로 통일한다.
  // 이전엔 여기 RSI/MACD만 ind.rsi/ind.macd_hist(공식, 전일 종가 기준)를 그대로 써서,
  // 문단은 실시간 재계산 RSI를 말하는데 바로 옆 사이드 스탯은 다른 숫자를 보여주는
  // 문제가 있었다(예: 문단 "RSI 44.4" vs 사이드 스탯 "RSI 48.8"). 실시간 합성봉으로
  // 다시 계산된 값이 있으면 그걸 쓰고, 없으면(장 마감 후 등) 공식값으로 폴백한다.
  const elderImpulseDisplay = liveElderImpulse ?? ind.elder_impulse;
  const rsiDisplay = liveBarsLatest?.rsi ?? ind.rsi;
  const macdHistDisplay = liveBarsLatest?.macd_hist ?? ind.macd_hist;

  const priceHeader = (
    <div style={S.priceHeaderBlock}>
      <div style={S.priceHeader}>
        <span style={S.priceValue}>{fmtPrice(displayPrice)}원</span>
        {change != null && (
          <span style={{ ...S.priceChange, color: pclr(change) }}>
            {change >= 0 ? '+' : ''}{fmtPrice(Math.round(change))}원 ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
          </span>
        )}
        {currentLivePrice != null && <span style={S.livePriceTag}>실시간</span>}
      </div>
      {showsLive && (
        <div style={S.livePriceCaption}>
          RSI·MACD·진입의견(공식) 등 아래 지표는 전일 종가 {fmtPrice(close)}원 기준입니다(하루 1회 갱신).
          {liveBarsActive && ` ADX·캔들패턴·매매신호·엘더 임펄스·Discount/Premium 판정·공포탐욕지수·AI 판정(근사치)은 ${lastHourKst}시 기준으로 갱신됩니다(매 정시).`}
        </div>
      )}
    </div>
  );

  const sentimentBadge = (
    <span style={{ ...S.sentimentBadge, color: sentiment.color, background: sentiment.color + '18' }}>
      {sentiment.label} {sentiment.score}
    </span>
  );

  // 헤더에서 제일 크게 보이는 텍스트가 "매수 관심" 같은 herencia-ta 공식 의견(전일
  // 종가 기준)이고, 그 옆의 작은 배지가 "실시간 관망"이면 — 눈에 제일 먼저 들어오는
  // 게 오래된 값이라 실시간 배지랑 반대로 읽혀서 헷갈린다는 피드백을 받았다. 그래서
  // 실시간 값이 있을 땐 그걸 제일 크게 보여주고, 공식 의견은 "전일 종가 기준"이라고
  // 명시한 채 작은 보조 텍스트로 내린다. 실시간 값이 아직 없을 때(로딩 중)만 공식
  // 의견을 그대로 크게 보여준다(폴백).
  const headerRow = (
    <div style={S.detailHeaderRow}>
      <div>
        {liveBarsActive ? (
          <>
            <div style={{ ...S.detailOpinion, color: liveOpinionColor }}>실시간 {liveOpinionLabel}</div>
            <div style={S.detailOpinionSub}>공식 진입의견(전일 종가 기준): {detail.entry_opinion}</div>
          </>
        ) : (
          <div style={{ ...S.detailOpinion, color: opinionColor(detail.entry_opinion) }}>{detail.entry_opinion}</div>
        )}
      </div>
      <div style={S.detailHeaderBadges}>
        {sentimentBadge}
      </div>
    </div>
  );

  const rawToggleBtn = (
    <button style={S.rawToggle} onClick={() => setShowRaw(v => !v)}>
      <span>상세 지표</span>
      <i className={`ti ${showRaw ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11 }} />
    </button>
  );

  const adxValue = adx.adx != null
    ? `${adx.adx.toFixed(1)} (+DI ${adx.plusDI.toFixed(1)} / -DI ${adx.minusDI.toFixed(1)})`
    : '데이터 부족';

  // ── 데스크톱: siglens 스타일 2단(차트 크게/좌 + 요약 사이드바/우) ──
  if (isDesktop) {
    return (
      <div style={S.detailDeskWrap}>
        {headerRow}
        <DetailTabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === 'chart' && (
          <div style={S.detailDeskSplit}>
            <div style={S.detailChartCol}>
              {priceHeader}
              <StockChart history={liveBars} height={440} patternMarkers={patterns} signalMarkers={signalFlips} code={code} />
            </div>
            <div style={S.detailSideCol}>
              <div style={S.sideStatsList}>
                <SideStat label="RSI" value={`${fmtNum(rsiDisplay)} · ${rsiLabel(rsiDisplay)}${rsiContext ? ' · ' + percentileToText(rsiContext.percentile) : ''}`} />
                <SideStat label="MACD" value={macdMomentumText(macdHistDisplay)} />
                <SideStat label="ADX" value={adxValue} />
                <SideStat label="52주 저점 대비" value={vsLow != null ? `+${vsLow.toFixed(1)}%` : '-'} />
                <SideStat
                  label="엘더 임펄스"
                  value={elderLabel(elderImpulseDisplay)}
                  valueColor={elderColor(elderImpulseDisplay)}
                />
                <SideStat
                  label="가중 합산 점수"
                  value={`${liveOpinionDetail.ensembleScore >= 0 ? '+' : ''}${liveOpinionDetail.ensembleScore.toFixed(2)} (${liveOpinionLabel})`}
                  valueColor={liveOpinionColor}
                />
                {alignment && (
                  <SideStat
                    label="시간프레임 정합도"
                    value={`${alignmentLabel(alignmentRel)} · ${CONFIDENCE_TEXT[alignment.confidence]}`}
                    valueColor={alignmentColor(alignmentRel)}
                  />
                )}
              </div>
              <div style={S.alignmentFootnote}>
                * 가중 합산 점수는 RSI·MACD·MA5/20·MA60·볼린저밴드·엘더 임펄스 6개를 단순히
                다수결로 세지 않고, 추세·모멘텀·평균회귀·엘더 임펄스 그룹별 가중치(변동성에
                따라 자동 조정)로 합산한 값(-1~+1)입니다. 개별 지표 중 몇 개가 매수/매도인지와
                실제 판정이 다를 수 있습니다.
              </div>
              {alignment && (
                <div style={S.alignmentFootnote}>
                  * 시간프레임 정합도는 일봉(MA5/MA20)·주봉 추세·60일 레인지 위치만 따로 계산한
                  결과로, 바로 위 RSI·MACD·엘더 임펄스와는 다른 지표입니다. 방향이 엇갈려도
                  모순이 아니라 서로 다른 걸 보는 것입니다.
                </div>
              )}
              {summary && <div style={S.summaryText}>{summary}</div>}
              {rawToggleBtn}
              {showRaw && <RawIndicatorSections ind={ind} />}
            </div>
          </div>
        )}
        {activeTab === 'news' && <NewsPanel loading={newsLoading} headlines={newsData} source={newsSource} />}
        {activeTab === 'ai' && (
          <AiPanel state={aiState} loading={aiLoading} error={aiError} stale={isStale} onRerun={runAiAnalysis} />
        )}
        {activeTab === 'sentiment' && <SentimentPanel sentiment={sentiment} />}
      </div>
    );
  }

  // ── 모바일: 세로 스택 ──
  return (
    <div style={S.detailWrap}>
      {headerRow}
      <DetailTabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'chart' && (
        <>
          {priceHeader}
          <StockChart history={liveBars} height={320} patternMarkers={patterns} signalMarkers={signalFlips} code={code} />

          <div style={S.keyStatsRow}>
            <div style={S.keyStat}>
              <div style={S.keyStatLabel}>RSI</div>
              <div style={S.keyStatValue}>{fmtNum(rsiDisplay)}</div>
              <div style={S.keyStatSub}>{rsiLabel(rsiDisplay)}{rsiContext ? ` · ${percentileToText(rsiContext.percentile)}` : ''}</div>
            </div>
            <div style={S.keyStat}>
              <div style={S.keyStatLabel}>MACD</div>
              <div style={{ ...S.keyStatValue, fontSize: 10.5 }}>{macdMomentumText(macdHistDisplay)}</div>
            </div>
            <div style={S.keyStat}>
              <div style={S.keyStatLabel}>52주 저점 대비</div>
              <div style={S.keyStatValue}>{vsLow != null ? `+${vsLow.toFixed(1)}%` : '-'}</div>
            </div>
            <div style={S.keyStat}>
              <div style={S.keyStatLabel}>엘더 임펄스</div>
              <div style={{ ...S.keyStatValue, color: elderColor(elderImpulseDisplay), fontSize: 10.5 }}>
                {elderLabel(elderImpulseDisplay)}
              </div>
            </div>
          </div>

          <div style={S.alignmentBadgeRow}>
            <span style={{ ...S.alignmentBadge, color: liveOpinionColor, background: liveOpinionColor + '18' }}>
              가중 합산 {liveOpinionDetail.ensembleScore >= 0 ? '+' : ''}{liveOpinionDetail.ensembleScore.toFixed(2)}
            </span>
            <span style={S.alignmentConfidenceText}>{liveOpinionLabel}</span>
          </div>
          <div style={S.alignmentFootnote}>
            * RSI·MACD·MA5/20·MA60·볼린저밴드·엘더 임펄스 6개를 다수결이 아니라 추세·모멘텀·
            평균회귀·엘더 임펄스 그룹별 가중치(변동성에 따라 자동 조정)로 합산한 값입니다.
          </div>

          {alignment && (
            <>
              <div style={S.alignmentBadgeRow}>
                <span style={{ ...S.alignmentBadge, color: alignmentColor(alignmentRel), background: alignmentColor(alignmentRel) + '18' }}>
                  {alignmentLabel(alignmentRel)}
                </span>
                <span style={S.alignmentConfidenceText}>{CONFIDENCE_TEXT[alignment.confidence]}</span>
              </div>
              <div style={S.alignmentFootnote}>
                * 일봉(MA5/MA20)·주봉 추세·60일 레인지 위치만 따로 계산한 결과로, 위 RSI·MACD·
                엘더 임펄스와는 다른 지표입니다. 방향이 엇갈려도 모순이 아니라 서로 다른 걸
                보는 것입니다.
              </div>
            </>
          )}

          {summary && <div style={S.summaryText}>{summary}</div>}
          {rawToggleBtn}
          {showRaw && <RawIndicatorSections ind={ind} />}
        </>
      )}
      {activeTab === 'news' && <NewsPanel loading={newsLoading} headlines={newsData} source={newsSource} />}
      {activeTab === 'ai' && (
        <AiPanel state={aiState} loading={aiLoading} error={aiError} stale={isStale} onRerun={runAiAnalysis} />
      )}
      {activeTab === 'sentiment' && <SentimentPanel sentiment={sentiment} />}
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div style={S.statCell}>
      <div style={S.statLabel}>{label}</div>
      <div style={S.statValue}>{value}</div>
    </div>
  );
}

// ─── 종목 행 ──────────────────────────────
// 진입의견 배지는 실시간 근사 신호가 있으면 그것만 보여주고(공식 배지는 뺌), 아직
// 계산 전이거나 그 종목만 실패했으면 herencia-ta 공식 entry_opinion으로 폴백한다.
function StockRow({ stock, isOpen, onToggle, apiBase, liveSignal }) {
  const badgeColor = liveSignal ? liveSignalColor(liveSignal) : opinionColor(stock.entry_opinion);
  const badgeLabel = liveSignal ? LIVE_SIGNAL_LABEL[liveSignal] : opinionLabel(stock.entry_opinion);
  return (
    <div>
      <button style={S.stockRow} onClick={onToggle}>
        <div style={S.stockLeft}>
          <div style={S.stockName}>{stock.name}</div>
          <div style={S.stockMeta}>{stock.code} · {stock.market} · 시총 {formatMarketCap(stock.market_cap_100m)}</div>
        </div>
        <span style={{ ...S.trendBadge, color: trendColor(liveTrendLabel(effectiveSignal(stock))), borderColor: trendColor(liveTrendLabel(effectiveSignal(stock))) + '40' }}>
          {liveTrendLabel(effectiveSignal(stock))}
        </span>
        <span style={{ ...S.opinionBadge, color: badgeColor, background: badgeColor + '15' }}>
          {badgeLabel}
        </span>
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11, color: '#444', flexShrink: 0 }} />
      </button>
      {isOpen && <StockDetail code={stock.code} apiBase={apiBase} />}
    </div>
  );
}

// ─── 메인 ─────────────────────────────────
export default function ScreenerScreen() {
  const isDesktop = useIsDesktop();
  const [stocks, setStocks] = useState([]);
  const [apiBase, setApiBase] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [openCode, setOpenCode] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [liveSignals, setLiveSignals] = useState({});

  useEffect(() => {
    fetch('/api/screener')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(d => {
        if (d.error) throw new Error(d.error);
        setStocks(d.stocks ?? []);
        setApiBase(d.apiBase ?? '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // 200종목 전체의 실시간 근사 진입의견 — 서버가 15분에 한 번씩 계산해 전체 사용자가
  // 공유하는 캐시라(src/app/api/screener-live/route.ts), 화면이 보이는 동안만 같은
  // 주기로 재조회한다. 필터/카운트는 여전히 herencia-ta 공식 entry_opinion 기준이고,
  // 이건 각 행에 곁들이는 보조 배지일 뿐이다.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/screener-live')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!cancelled && d?.signals) setLiveSignals(d.signals); })
        .catch(() => {});
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15 * 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  // 필터 칩/카운트/목록 배지가 서로 다른 기준(공식 vs 실시간)을 보여줘서 안 맞는다는
  // 피드백 — liveSignal을 각 종목에 병합해 이후 counts/filtered/배지가 전부
  // effectiveSignal() 하나로만 판단하게 통일한다.
  const stocksWithLive = useMemo(
    () => stocks.map(s => ({ ...s, liveSignal: liveSignals[s.code] ?? null })),
    [stocks, liveSignals]
  );

  const counts = useMemo(() => {
    const c = { all: stocksWithLive.length, buy: 0, sell: 0, hold: 0 };
    for (const s of stocksWithLive) {
      const sig = effectiveSignal(s);
      if (sig === 'buy') c.buy++;
      else if (sig === 'sell') c.sell++;
      else c.hold++;
    }
    return c;
  }, [stocksWithLive]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocksWithLive
      .filter(s =>
        matchesFilter(s, filter) &&
        (q === '' || s.name.toLowerCase().includes(q) || s.code.includes(q))
      )
      .sort((a, b) => (b.market_cap_100m ?? 0) - (a.market_cap_100m ?? 0));
  }, [stocksWithLive, filter, query]);

  if (showGuide && !isDesktop) {
    return <IndicatorGuideScreen onBack={() => setShowGuide(false)} />;
  }

  if (isDesktop) {
    const selected = filtered.find(s => s.code === openCode) ?? null;
    return (
      <div style={S.deskWrap}>
        <div style={S.deskHeader}>
          <div>
            <div style={S.titleRow}>
              <i className="ti ti-list-search" style={{ color: '#7F77DD', fontSize: 17 }} />
              <span style={S.deskTitle}>KOSPI200 스크리너</span>
            </div>
            <div style={S.subtitle}>200종목 추세·모멘텀·진입의견</div>
            <div style={S.basisNote}>추세·진입의견 모두 같은 실시간 근사 신호(오늘 장중 가격 반영) 기준으로 통일했습니다.</div>
          </div>
          <button style={S.guideEntryDesk} onClick={() => setShowGuide(true)}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, color: '#7F77DD' }} />
            기술적 지표 알아보기
          </button>
        </div>

        <div style={S.deskToolbar}>
          <div style={S.searchWrapDesk}>
            <i className="ti ti-search" style={{ fontSize: 13, color: '#444' }} />
            <input
              style={S.searchInput}
              placeholder="종목명 또는 코드 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={S.filterRow}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                style={{ ...S.filterChip, ...(filter === f.key ? S.filterChipActive : {}) }}
                onClick={() => setFilter(f.key)}
              >
                {f.label} {counts[f.key] ?? 0}
              </button>
            ))}
          </div>
        </div>

        {loading && <div style={S.msg}>불러오는 중...</div>}
        {error && <div style={S.msg}>데이터를 불러오지 못했습니다: {error}</div>}

        {!loading && !error && (
          <div style={S.deskSplit}>
            <div style={S.deskList}>
              <div style={S.deskTableHead}>
                <span style={{ flex: 2 }}>종목명</span>
                <span style={{ width: 76, textAlign: 'right' }}>시총</span>
                <span style={{ width: 52, textAlign: 'center' }}>추세</span>
                <span style={{ width: 92, textAlign: 'center' }}>진입의견</span>
              </div>
              <div style={S.deskTableBody}>
                {filtered.length === 0 && <div style={S.msg}>조건에 맞는 종목이 없습니다.</div>}
                {filtered.map(s => (
                  <button
                    key={s.code}
                    style={{ ...S.deskRow, ...(openCode === s.code ? S.deskRowActive : {}) }}
                    onClick={() => setOpenCode(s.code)}
                  >
                    <span style={S.deskRowName}>
                      <span style={S.deskRowNameText}>{s.name}</span>
                      <span style={S.deskRowCode}>{s.code}</span>
                    </span>
                    <span style={S.deskRowCap}>{formatMarketCap(s.market_cap_100m)}</span>
                    <span style={{ ...S.trendBadge, color: trendColor(liveTrendLabel(effectiveSignal(s))), borderColor: trendColor(liveTrendLabel(effectiveSignal(s))) + '40', width: 52, textAlign: 'center' }}>
                      {liveTrendLabel(effectiveSignal(s))}
                    </span>
                    <span style={{
                      ...S.opinionBadge, width: 92, textAlign: 'center',
                      color: liveSignalColor(effectiveSignal(s)),
                      background: liveSignalColor(effectiveSignal(s)) + '15',
                    }}>
                      {s.liveSignal ? LIVE_SIGNAL_LABEL[s.liveSignal] : opinionLabel(s.entry_opinion)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={S.deskDetail}>
              {selected
                ? <StockDetail key={selected.code} code={selected.code} apiBase={apiBase} />
                : <div style={S.deskEmpty}>왼쪽 목록에서 종목을 선택하면 여기에 상세 지표가 표시됩니다.</div>}
            </div>
          </div>
        )}

        {showGuide && (
          <DesktopModal onClose={() => setShowGuide(false)} maxWidth={720}>
            <div style={{ position: 'relative', height: '80vh' }}>
              <IndicatorGuideScreen onBack={() => setShowGuide(false)} />
            </div>
          </DesktopModal>
        )}
      </div>
    );
  }

  return (
    <div className="tab-wrap">
      <div style={S.titleBlock}>
        <div style={S.titleRow}>
          <i className="ti ti-list-search" style={{ color: '#7F77DD', fontSize: 15 }} />
          <span style={S.title}>KOSPI200 스크리너</span>
        </div>
        <div style={S.subtitle}>200종목 추세·모멘텀·진입의견</div>
        <div style={S.basisNote}>추세는 herencia-ta 공식 분류(최근 영업일 종가 기준)이고, 진입의견 배지는 오늘 실시간 근사치라 서로 다른 시점을 가리킬 수 있어요.</div>
      </div>

      <button style={S.guideEntry} onClick={() => setShowGuide(true)}>
        <i className="ti ti-info-circle" style={{ fontSize: 13, color: '#7F77DD' }} />
        <span style={S.guideEntryText}>기술적 지표 알아보기</span>
        <i className="ti ti-chevron-right" style={{ fontSize: 12, color: '#444', marginLeft: 'auto' }} />
      </button>

      <div style={S.searchWrap}>
        <i className="ti ti-search" style={{ fontSize: 13, color: '#444' }} />
        <input
          style={S.searchInput}
          placeholder="종목명 또는 코드 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={S.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            style={{ ...S.filterChip, ...(filter === f.key ? S.filterChipActive : {}) }}
            onClick={() => setFilter(f.key)}
          >
            {f.label} {counts[f.key] ?? 0}
          </button>
        ))}
      </div>

      {loading && <div style={S.msg}>불러오는 중...</div>}
      {error && <div style={S.msg}>데이터를 불러오지 못했습니다: {error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div style={S.msg}>조건에 맞는 종목이 없습니다.</div>
      )}
      {!loading && !error && (
        <div style={S.card}>
          {filtered.map((s, i) => (
            <div key={s.code} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '0.5px solid #151520' }}>
              <StockRow
                stock={s}
                apiBase={apiBase}
                isOpen={openCode === s.code}
                onToggle={() => setOpenCode(prev => prev === s.code ? null : s.code)}
                liveSignal={s.liveSignal}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 스타일 ────────────────────────────────
const S = {
  titleBlock: { padding: '2px 2px 0' },
  titleRow: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: 600, color: '#fff' },
  subtitle: { fontSize: 10, color: '#555', marginTop: 3 },
  basisNote: { fontSize: 9.5, color: '#555', marginTop: 4, lineHeight: 1.4, maxWidth: 420 },

  guideEntry: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', background: '#181820', borderRadius: 10,
    border: '0.5px solid #23232f', cursor: 'pointer', flexShrink: 0, width: '100%',
  },
  guideEntryText: { fontSize: 12, color: '#ccc', fontWeight: 500 },

  searchWrap: {
    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
    background: '#181820', borderRadius: 10, flexShrink: 0,
  },
  searchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ddd', fontSize: 12 },

  filterRow: { display: 'flex', gap: 6, flexShrink: 0, overflowX: 'auto' },
  filterChip: {
    padding: '6px 10px', borderRadius: 999, border: '0.5px solid #2a2a3a', background: 'transparent',
    color: '#888', fontSize: 10.5, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
  },
  filterChipActive: { background: '#7F77DD20', borderColor: '#7F77DD', color: '#a29dff' },

  msg: { padding: '24px 8px', textAlign: 'center', color: '#555', fontSize: 12 },

  card: { background: '#181820', borderRadius: 14, overflow: 'hidden' },

  stockRow: {
    width: '100%', display: 'flex', alignItems: 'center',
    padding: '11px 14px', gap: 8,
    cursor: 'pointer', textAlign: 'left', border: 'none', background: 'transparent',
  },
  stockLeft: { flex: 1, minWidth: 0 },
  stockName: { fontSize: 12.5, color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  stockMeta: { fontSize: 8.5, color: '#3a3a4a', marginTop: 2 },
  // border(shorthand)와 borderColor(개별 속성)를 같이 쓰면 리렌더 시 React가 스타일
  // 충돌 경고를 낸다 — borderWidth/borderStyle로 나눠서 borderColor와 안 겹치게 함.
  trendBadge: { fontSize: 9.5, padding: '3px 7px', borderRadius: 999, borderWidth: '0.5px', borderStyle: 'solid', flexShrink: 0 },
  opinionBadge: { fontSize: 9.5, padding: '3px 7px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' },

  detailWrap: { background: '#13131e', padding: '12px 14px 16px', borderTop: '0.5px solid #1e1e28', display: 'flex', flexDirection: 'column', gap: 10 },
  detailLoading: { background: '#13131e', padding: '14px', fontSize: 11, color: '#555', borderTop: '0.5px solid #1e1e28' },
  detailOpinion: { fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 },
  detailOpinionSub: { fontSize: 10, color: '#666', lineHeight: 1.4, marginTop: 2 },
  detailHeaderRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  detailHeaderBadges: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  sentimentBadge: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap' },

  detailTabBar: { display: 'flex', gap: 4, borderBottom: '0.5px solid #1e1e28', paddingBottom: 2 },
  detailTabBtn: {
    fontSize: 11, padding: '6px 10px', borderRadius: '7px 7px 0 0', border: 'none',
    background: 'transparent', color: '#555', cursor: 'pointer', fontWeight: 500,
  },
  detailTabBtnActive: { background: '#181820', color: '#ddd' },

  newsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  newsItem: { display: 'flex', gap: 7, alignItems: 'flex-start', background: '#181820', borderRadius: 10, padding: '9px 11px' },
  newsItemText: { fontSize: 11.5, color: '#ccc', lineHeight: 1.5 },
  newsItemMeta: { fontSize: 9.5, color: '#555' },
  newsItemSummary: { fontSize: 10.5, color: '#888', lineHeight: 1.6, marginTop: 2 },
  opinionCaveat: { fontSize: 9.5, color: '#444', lineHeight: 1.5, marginTop: 2 },

  aiPanel: { display: 'flex', flexDirection: 'column', gap: 10 },
  aiStaleBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    background: '#2a2000', border: '0.5px solid #4a3a00', borderRadius: 10,
    padding: '9px 12px', fontSize: 11, color: '#EF9F27',
  },
  aiRerunBtn: {
    flexShrink: 0, fontSize: 10.5, fontWeight: 600, padding: '5px 11px', borderRadius: 7,
    border: '0.5px solid #EF9F27', background: '#EF9F2718', color: '#EF9F27', cursor: 'pointer',
  },
  aiHeadRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  aiIndicatorTag: { fontSize: 9.5, color: '#666', background: '#181820', padding: '3px 8px', borderRadius: 6 },
  aiTimestamp: { fontSize: 9.5, color: '#444', marginLeft: 'auto' },
  aiText: { fontSize: 11.5, color: '#ccc', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#181820', borderRadius: 10, padding: '12px 14px' },

  sentimentPanel: { display: 'flex', flexDirection: 'column', gap: 12 },
  gaugeCard: { background: '#181820', borderRadius: 14, padding: '14px 14px 16px' },

  indSection: { display: 'flex', flexDirection: 'column', gap: 6 },
  indSectionTitle: { fontSize: 9.5, color: '#444', fontWeight: 600, letterSpacing: '0.3px' },
  indSectionGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  statCell: { background: '#181820', borderRadius: 8, padding: '7px 6px', textAlign: 'center' },
  statLabel: { fontSize: 8, color: '#444', marginBottom: 3 },
  statValue: { fontSize: 11, color: '#ddd', fontWeight: 500 },

  elderRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' },
  elderLabelText: { fontSize: 9.5, color: '#444', fontWeight: 600 },
  elderBadge: { fontSize: 10, padding: '3px 9px', borderRadius: 6, fontWeight: 500 },

  chartImg: { width: '100%', borderRadius: 8, display: 'block' },

  priceHeaderBlock: { display: 'flex', flexDirection: 'column', gap: 4 },
  priceHeader: { display: 'flex', alignItems: 'baseline', gap: 10 },
  priceValue: { fontSize: 20, fontWeight: 600, color: '#fff' },
  priceChange: { fontSize: 12.5, fontWeight: 500 },
  livePriceTag: {
    fontSize: 9, fontWeight: 600, color: '#7F77DD', background: '#7F77DD18',
    padding: '2px 7px', borderRadius: 999,
  },
  livePriceCaption: { fontSize: 9.5, color: '#555' },

  keyStatsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  keyStat: { background: '#181820', borderRadius: 8, padding: '8px 6px', textAlign: 'center' },
  keyStatLabel: { fontSize: 8, color: '#444', marginBottom: 4 },
  keyStatValue: { fontSize: 12, color: '#ddd', fontWeight: 600 },
  keyStatSub: { fontSize: 8.5, color: '#666', marginTop: 2 },
  alignmentBadgeRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  alignmentBadge: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 7 },
  alignmentConfidenceText: { fontSize: 10, color: '#666' },
  alignmentFootnote: { fontSize: 9, color: '#444', lineHeight: 1.5, marginTop: -2 },

  summaryText: { fontSize: 11.5, color: '#999', lineHeight: 1.7, background: '#181820', borderRadius: 10, padding: '10px 12px', whiteSpace: 'pre-wrap' },

  rawToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '8px 4px', background: 'transparent', border: 'none',
    borderTop: '0.5px solid #1e1e28', color: '#666', fontSize: 11, fontWeight: 500, cursor: 'pointer',
  },

  // ── 종목 상세: 데스크톱 2단(siglens 스타일) ──
  detailDeskWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  detailDeskSplit: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  detailChartCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  detailSideCol: {
    width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
  },
  sideStatsList: { background: '#181820', borderRadius: 10, padding: '4px 12px' },
  sideStatRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 0', borderBottom: '0.5px solid #1e1e28',
  },
  sideStatLabel: { fontSize: 10.5, color: '#666' },
  sideStatValue: { fontSize: 11.5, color: '#ddd', fontWeight: 600 },

  // ── 데스크톱 전용 ──
  deskWrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  deskHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  deskTitle: { fontSize: 20, fontWeight: 600, color: '#fff' },
  guideEntryDesk: {
    display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
    padding: '9px 16px', background: '#181820', borderRadius: 10,
    border: '0.5px solid #23232f', cursor: 'pointer', fontSize: 12.5, color: '#ccc', fontWeight: 500,
  },

  deskToolbar: { display: 'flex', alignItems: 'center', gap: 10 },
  searchWrapDesk: {
    width: 280, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
    background: '#181820', borderRadius: 10, flexShrink: 0,
  },

  deskSplit: { display: 'flex', gap: 16, alignItems: 'stretch' },
  deskList: {
    width: 460, flexShrink: 0, background: '#181820', borderRadius: 14,
    border: '0.5px solid #1e1e28', height: 'calc(100vh - 200px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  deskTableHead: {
    display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid #1e1e28',
    fontSize: 9.5, color: '#444', fontWeight: 600, flexShrink: 0, background: '#13131e',
  },
  deskTableBody: { overflowY: 'auto', flex: 1, minHeight: 0 },
  deskRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
    textAlign: 'left', borderBottom: '0.5px solid #151520',
  },
  deskRowActive: { background: '#7F77DD14' },
  deskRowName: { flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  deskRowNameText: { fontSize: 12, color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deskRowCode: { fontSize: 8.5, color: '#3a3a4a' },
  deskRowCap: { width: 76, textAlign: 'right', fontSize: 11, color: '#888', flexShrink: 0 },

  deskDetail: {
    flex: 1, minWidth: 0, background: '#181820', borderRadius: 14,
    border: '0.5px solid #1e1e28', height: 'calc(100vh - 200px)', overflowY: 'auto', padding: 18,
  },
  deskEmpty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 12.5 },
};
