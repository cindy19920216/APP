"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

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

// ─── 기술적 분석 의견 (RSI·이동평균·MACD·볼린저밴드 기반 단순 룰) ─────
// 기술적 지표 탭(개별 종목)의 entry_opinion은 herencia-ta 백엔드가 SMC 지지/저항
// 구조까지 반영해 계산하지만, 시장지표(지수·환율·원자재)는 그런 구조 데이터가 없어
// 여기서는 RSI/추세/모멘텀/밴드 4개 신호를 점수화하는 단순 룰로 판단한다.
const SIGNAL_LABEL = { buy: '매수 신호', sell: '매도 신호', neutral: '중립' };
const SIGNAL_COLOR = { buy: '#1D9E75', sell: '#E24B4A', neutral: '#666' };

// 초보자도 읽을 수 있도록 "지표가 뭔지 → 지금 값이 뭘 뜻하는지" 순서로 문장을 만든다.
function rsiExplain(rsi) {
  if (rsi == null) return null;
  const val = rsi.toFixed(1);
  let signal, reading, judge;
  if (rsi <= 30) {
    signal = 'buy'; reading = '과매도(짧은 기간 많이 팔려서 가격이 많이 내린 상태)';
    judge = '단기적으로 낙폭이 과했다는 매수 신호로 볼 수 있어요.';
  } else if (rsi >= 70) {
    signal = 'sell'; reading = '과매수(짧은 기간 많이 사서 가격이 많이 오른 상태)';
    judge = '단기적으로 상승폭이 과했다는 매도 신호로 볼 수 있어요.';
  } else {
    signal = 'neutral'; reading = '중립 구간';
    judge = '이 지표만 보면 뚜렷한 매수·매도 신호는 없어요.';
  }
  return {
    signal,
    label: 'RSI (상대강도지수)',
    text: `최근 가격이 얼마나 강하게 오르거나 내렸는지를 0~100 사이 숫자로 나타내요. 보통 70을 넘으면 "많이 올랐다"(과매수), 30 밑이면 "많이 내렸다"(과매도)로 봐요. 지금 값은 ${val}로 ${reading}이고, ${judge}`,
  };
}

function maExplain(ma5, ma20) {
  if (ma5 == null || ma20 == null) return null;
  const up = ma5 > ma20;
  return {
    signal: up ? 'buy' : 'sell',
    label: '이동평균선 (MA5 · MA20)',
    text: `최근 며칠 동안의 평균 가격을 이어 그린 선이에요. 짧은 기간(5일) 평균이 긴 기간(20일) 평균보다 위에 있으면 최근 가격이 예전보다 높아지고 있다는 뜻이라 단기 상승 추세로, 아래에 있으면 하락 추세로 봐요. 지금은 5일 평균이 20일 평균보다 ${up ? '위' : '아래'}에 있어서 단기 ${up ? '상승' : '하락'} 추세로 해석돼요.`,
  };
}

function macdExplain(macd) {
  if (macd == null) return null;
  const up = macd > 0;
  return {
    signal: up ? 'buy' : 'sell',
    label: 'MACD 히스토그램',
    text: `단기 추세와 장기 추세가 벌어지는 속도(모멘텀)를 막대로 보여줘요. 0보다 크면 상승에 속도가 붙고 있다는 뜻이고, 0보다 작으면 하락에 속도가 붙고 있다는 뜻이에요. 지금은 ${up ? '0보다 커서 상승 모멘텀이' : '0보다 작아서 하락 모멘텀이'} 진행 중인 것으로 해석돼요.`,
  };
}

function bbExplain(close, upper, lower) {
  if (close == null || upper == null || lower == null) return null;
  let signal, pos, judge;
  if (close <= lower) {
    signal = 'buy'; pos = '아래쪽 띠에 닿거나 벗어난'; judge = '단기간에 너무 많이 떨어졌다는 신호로 볼 수 있어요.';
  } else if (close >= upper) {
    signal = 'sell'; pos = '위쪽 띠에 닿거나 벗어난'; judge = '단기간에 너무 많이 올랐다는 신호로 볼 수 있어요.';
  } else {
    signal = 'neutral'; pos = '위아래 띠 안쪽에 있는'; judge = '이 지표만 보면 특별한 신호는 없어요.';
  }
  return {
    signal,
    label: '볼린저밴드',
    text: `최근 20일 평균 가격을 중심으로, 최근 변동폭만큼 위아래에 띠를 두른 거예요. 가격이 ${pos} 상태이며, ${judge}`,
  };
}

function computeOpinion(latest) {
  if (!latest) return null;
  const { close, rsi, ma5, ma20, bb_upper, bb_lower, macd_hist } = latest;

  const items = [
    rsiExplain(rsi),
    maExplain(ma5, ma20),
    macdExplain(macd_hist),
    bbExplain(close, bb_upper, bb_lower),
  ].filter(Boolean);

  const buyCount  = items.filter(i => i.signal === 'buy').length;
  const sellCount = items.filter(i => i.signal === 'sell').length;
  const score = buyCount - sellCount;

  // ±3(4개 중 3개 이상 일치)을 시도해봤으나 RSI/BB는 극단치일 때만 투표하는 지표라
  // 거의 항상 관망만 나와버려(200종목 실측 확인) 실효성이 없었다 — ±2로 되돌림
  // (src/lib/stockAnalysis.ts의 computeApproxSignal과 동일 기준으로 맞춤).
  let opinion, color, verdict;
  if (score >= 2) {
    opinion = '매수 관심'; color = '#1D9E75';
    verdict = `${items.length}개 지표 중 매수 신호가 ${buyCount}개로 가장 많아요. 여러 지표가 동시에 단기 저점·상승 전환을 가리키고 있어 매수 관심 구간으로 판단됩니다.`;
  } else if (score <= -2) {
    opinion = '매도 관심'; color = '#E24B4A';
    verdict = `${items.length}개 지표 중 매도 신호가 ${sellCount}개로 가장 많아요. 여러 지표가 동시에 단기 과열·하락을 가리키고 있어 매도 관심 구간으로 판단됩니다.`;
  } else {
    opinion = '관망'; color = '#555';
    verdict = `${items.length}개 지표 중 매수 신호 ${buyCount}개, 매도 신호 ${sellCount}개로 신호가 엇갈리고 있어요. 한쪽으로 확신하기 어려운 구간이라 무리해서 사거나 팔지 않고 관망하는 걸 권장합니다.`;
  }

  return { opinion, color, verdict, items };
}

// ─── TradingView 스타일 캔들차트 (StockChart.jsx와 동일한 색·구조) ─────
const UP = '#1D9E75';
const DOWN = '#E24B4A';
const MA5_COLOR = '#e67e22';
const MA20_COLOR = '#2980b9';
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
  const [hasVolume, setHasVolume] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!symbol) { setLoading(false); return; }

    let cancelled = false;

    const load = (isFirst) => {
      if (isFirst) setLoading(true);
      fetch(`/api/chart/${symbol}?range=1y`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => {
          if (cancelled) return;
          setHistory(d.points ?? []);
          setHasVolume(!!d.hasVolume);
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

  const last3M = history.slice(-66);
  const periodReturn = last3M.length >= 2
    ? ((last3M.at(-1).close - last3M[0].close) / last3M[0].close * 100).toFixed(2)
    : '0';
  const high3M = last3M.length ? Math.max(...last3M.map(h => h.high)) : null;
  const low3M  = last3M.length ? Math.min(...last3M.map(h => h.low))  : null;
  const opinion = computeOpinion(history.at(-1));

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
              <TVChart history={history} hasVolume={hasVolume} meta={meta} height={260} />
            )}
          </div>

          {/* 기술적 분석 의견 */}
          {!loading && !error && opinion && (
            <div style={S.opinionCard}>
              <div style={S.opinionBadgeRow}>
                <span style={{ ...S.opinionBadge, color: opinion.color, background: opinion.color + '15' }}>
                  {opinion.opinion}
                </span>
              </div>
              <div style={S.opinionText}>{opinion.verdict}</div>

              <div style={S.opinionDivider} />
              <div style={S.opinionSubtitle}>판단 근거 (지표별 설명)</div>
              <div style={S.opinionItemList}>
                {opinion.items.map((item, i) => (
                  <div key={i} style={S.opinionItem}>
                    <div style={S.opinionItemHead}>
                      <span style={S.opinionItemLabel}>{item.label}</span>
                      <span style={{ ...S.opinionItemTag, color: SIGNAL_COLOR[item.signal], background: SIGNAL_COLOR[item.signal] + '18' }}>
                        {SIGNAL_LABEL[item.signal]}
                      </span>
                    </div>
                    <div style={S.opinionItemText}>{item.text}</div>
                  </div>
                ))}
              </div>

              <div style={S.opinionCaveat}>
                RSI·이동평균·MACD·볼린저밴드 4개 지표를 단순 점수화한 참고용 판단이며, 투자 조언이 아닙니다.
              </div>
            </div>
          )}

          {/* 통계 */}
          {!loading && !error && last3M.length > 0 && (
            <div style={S.statsCard}>
              {[
                { label: '조회 기간', value: `${last3M[0].date} ~ ${last3M.at(-1).date} (최근 3개월)` },
                { label: '전체 데이터', value: `${history[0].date} ~ ${history.at(-1).date}` },
                { label: '3개월 최고', value: meta?.fmt(high3M) },
                { label: '3개월 최저', value: meta?.fmt(low3M) },
                { label: '3개월 수익률', value: (+periodReturn >= 0 ? '+' : '') + periodReturn + '%', color: +periodReturn >= 0 ? '#1D9E75' : '#E24B4A' },
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
  opinionBadgeRow: { display: 'flex' },
  opinionBadge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 7 },
  opinionText: { fontSize: 12.5, color: '#ccc', lineHeight: 1.7 },
  opinionDivider: { height: 1, background: '#1e1e28', margin: '2px 0' },
  opinionSubtitle: { fontSize: 10.5, color: '#555', fontWeight: 600 },
  opinionItemList: { display: 'flex', flexDirection: 'column', gap: 10 },
  opinionItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  opinionItemHead: { display: 'flex', alignItems: 'center', gap: 7 },
  opinionItemLabel: { fontSize: 11.5, color: '#ddd', fontWeight: 600 },
  opinionItemTag: { fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 5 },
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
