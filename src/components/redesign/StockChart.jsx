"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, TickMarkType } from 'lightweight-charts';

const UP = '#1D9E75';
const DOWN = '#E24B4A';
const MA5_COLOR = '#e67e22';
const MA20_COLOR = '#2980b9';
const BB_COLOR = '#95a5a6';
const VWAP_COLOR = '#8e44ad';

const DAILY_PERIODS = [
  { key: '1M', label: '1개월', days: 22 },
  { key: '3M', label: '3개월', days: 66 },
  { key: '6M', label: '6개월', days: 180 },
];

// Yahoo Finance 분봉 — herencia-ta 일봉과 별도로 /api/chart/{code}에서 직접 받아온다.
// 1분봉은 최근 7일, 그 외 분봉은 최근 ~60일까지만 히스토리가 남아있는 Yahoo 쪽 제약이 있다.
const INTRADAY_PERIODS = [
  { key: '5m', label: '5분', range: '1d', interval: '5m' },
  { key: '15m', label: '15분', range: '5d', interval: '15m' },
  { key: '60m', label: '1시간', range: '1mo', interval: '60m' },
];

function isIntradayKey(key) {
  return INTRADAY_PERIODS.some(p => p.key === key);
}

function sliceHistory(history, periodKey) {
  const p = DAILY_PERIODS.find(x => x.key === periodKey) ?? DAILY_PERIODS[2];
  return history.slice(-p.days);
}

function lineData(sliced, key) {
  return sliced.filter(h => h[key] != null).map(h => ({ time: h.date, value: h[key] }));
}

// 일봉(문자열 "YYYY-MM-DD")과 분봉(UTC 초단위 숫자 타임스탬프)을 같은 방식으로 Date로 변환.
function timeToDate(time) {
  return typeof time === 'number' ? new Date(time * 1000) : new Date(`${time}T00:00:00Z`);
}
const pad2 = (n) => String(n).padStart(2, '0');

// lightweight-charts 기본 눈금 포맷터가 분봉(숫자 타임스탬프)에서 날짜 눈금을 엉뚱하게
// 표시하는 문제가 있어(일봉 문자열 포맷과 섞이며 내부 캘린더 계산이 꼬임), 직접 포맷한다.
function tickMarkFormatter(time, tickMarkType) {
  const d = timeToDate(time);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (tickMarkType === TickMarkType.Year) return `${d.getUTCFullYear()}`;
  if (tickMarkType === TickMarkType.Month) return `${month}월`;
  if (tickMarkType === TickMarkType.DayOfMonth) return `${month}/${day}`;
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function formatTooltipDate(time) {
  const d = timeToDate(time);
  if (typeof time === 'number') {
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  }
  return time;
}

// 가격축 자동 스케일이 볼린저밴드 폭(변동성 확대 구간)에 끌려가면 캔들이
// 눌리고 거래량 패널과 시각적으로 붙어 보인다 — BB는 그려지되 자동 스케일
// 범위 계산에는 기여하지 않도록(autoscaleInfoProvider: () => null) 해서
// 캔들+이평선 기준으로 스케일을 고정한다.
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

export default function StockChart({ history, height = 300, patternMarkers = [], signalMarkers = [], code }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [period, setPeriod] = useState('3M');
  const [showPanes, setShowPanes] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [intradayHistory, setIntradayHistory] = useState([]);
  const [intradayLoading, setIntradayLoading] = useState(false);
  const [intradayError, setIntradayError] = useState(false);

  const intraday = isIntradayKey(period);

  // 차트는 mount 시 한 번만 생성 — 데이터/기간 변경은 별도 effect에서 setData만 호출.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#666', fontSize: 10 },
      grid: { vertLines: { color: '#1a1a24' }, horzLines: { color: '#1a1a24' } },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: '#2a2a35' },
      timeScale: { borderColor: '#2a2a35', tickMarkFormatter },
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
    chart.priceScale('volume').applyOptions({ scaleMargins: MARGINS_COMPACT.volume });
    // visible:false는 축 라벨만 숨길 뿐 시리즈 자체는 기본 scaleMargins(꽤 큰 영역)로
    // 계속 그려져서 캔들/거래량과 겹쳐 보이는 원인이 됐다 — 패널이 꺼져 있을 때는
    // margin 자체를 거의 0 높이로 눌러서 실제로도 안 보이게 만든다.
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
  }, []);

  // RSI/MACD 서브패널 토글 시 가격/거래량 패널의 세로 비율만 재조정.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (showPanes) {
      chart.priceScale('right').applyOptions({ scaleMargins: MARGINS_WITH_PANES.price });
      chart.priceScale('volume').applyOptions({ scaleMargins: MARGINS_WITH_PANES.volume });
      chart.priceScale('rsi').applyOptions({ scaleMargins: MARGINS_WITH_PANES.rsi, visible: true });
      chart.priceScale('macd').applyOptions({ scaleMargins: MARGINS_WITH_PANES.macd, visible: true });
    } else {
      chart.priceScale('right').applyOptions({ scaleMargins: MARGINS_COMPACT.price });
      chart.priceScale('volume').applyOptions({ scaleMargins: MARGINS_COMPACT.volume });
      chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false });
      chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false });
    }
  }, [showPanes]);

  // 부모(모바일 스택형 vs 데스크톱 큰 차트)가 요구하는 높이가 바뀌면 반영.
  useEffect(() => {
    chartRef.current?.applyOptions({ height });
  }, [height]);

  // 분봉 선택 시 herencia-ta 일봉과 별개로 Yahoo Finance 분봉을 직접 받아온다.
  // 장중에는 화면이 보이는 동안 60초 간격으로 재조회해 실시간에 가깝게 갱신.
  useEffect(() => {
    if (!intraday || !code) return;
    const opt = INTRADAY_PERIODS.find(p => p.key === period);
    if (!opt) return;
    let cancelled = false;

    const load = () => {
      setIntradayLoading(true);
      fetch(`/api/chart/${code}?range=${opt.range}&interval=${opt.interval}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => {
          if (cancelled) return;
          setIntradayHistory(d.points ?? []);
          setIntradayError(false);
        })
        .catch(() => { if (!cancelled) setIntradayError(true); })
        .finally(() => { if (!cancelled) setIntradayLoading(false); });
    };

    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [intraday, period, code]);

  // 일봉("YYYY-MM-DD" 문자열)과 분봉(UNIX 타임스탬프 숫자)은 lightweight-charts에서
  // 서로 다른 시간 표현이라, 같은 차트 인스턴스에서 그대로 전환하면 내부 타임스케일이
  // 이전 포맷 기준으로 눈금을 잘못 그린다(예: 날짜가 엉뚱하게 표시됨). 모드가 바뀔 때는
  // 모든 시리즈를 한 번 비워서 타임스케일이 새 포맷으로 완전히 다시 잡히게 한다.
  const prevIntradayRef = useRef(intraday);
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({ timeScale: { timeVisible: intraday, secondsVisible: false } });
  }, [intraday]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s.candle) return;

    if (prevIntradayRef.current !== intraday) {
      prevIntradayRef.current = intraday;
      Object.values(s).forEach(series => series.setData([]));
      s.candle.setMarkers([]);
    }

    let bars, markers = [];
    if (intraday) {
      bars = intradayHistory;
    } else {
      if (!history?.length) return;
      bars = sliceHistory(history, period);
      const visibleDates = new Set(bars.map(h => h.date));
      markers = [
        ...patternMarkers.filter(p => visibleDates.has(p.date)).map(p => ({
          time: p.date,
          position: p.type.startsWith('bullish') ? 'belowBar' : 'aboveBar',
          color: p.type.startsWith('bullish') ? UP : DOWN,
          shape: p.type.startsWith('bullish') ? 'arrowUp' : 'arrowDown',
          size: 0.6,
          text: '패턴',
        })),
        ...signalMarkers.filter(f => visibleDates.has(f.date)).map(f => ({
          time: f.date,
          position: f.signal === 'buy' ? 'belowBar' : 'aboveBar',
          color: f.signal === 'buy' ? UP : DOWN,
          shape: f.signal === 'buy' ? 'arrowUp' : 'arrowDown',
          size: 1.4,
          text: f.signal === 'buy' ? '매수' : '매도',
        })),
      ].sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
    }

    if (!bars?.length) return;

    s.candle.setData(bars.filter(h => h.open != null).map(h => ({ time: h.date, open: h.open, high: h.high, low: h.low, close: h.close })));
    s.ma5.setData(lineData(bars, 'ma5'));
    s.ma20.setData(lineData(bars, 'ma20'));
    s.bbUpper.setData(lineData(bars, 'bb_upper'));
    s.bbLower.setData(lineData(bars, 'bb_lower'));
    s.vwap.setData(lineData(bars, 'vwap'));
    s.volume.setData(bars.map(h => ({ time: h.date, value: h.volume, color: h.close >= h.open ? UP + '80' : DOWN + '80' })));
    // RSI/MACD는 scaleMargins로 눌러 숨기는 것만으로는 맨 아래에 얇은 조각이
    // 남아 보였다 — 패널이 꺼져 있을 땐 데이터 자체를 비워서 완전히 안 그려지게 한다.
    s.rsi.setData(showPanes ? lineData(bars, 'rsi') : []);
    s.macd.setData(showPanes ? bars.filter(h => h.macd_hist != null).map(h => ({ time: h.date, value: h.macd_hist, color: h.macd_hist >= 0 ? UP : DOWN })) : []);
    s.candle.setMarkers(markers);

    chartRef.current?.timeScale().fitContent();
  }, [history, period, showPanes, patternMarkers, signalMarkers, intraday, intradayHistory]);

  if (!intraday && !history?.length) {
    return <div style={S.empty}>차트 데이터가 없습니다.</div>;
  }

  return (
    <div>
      <div style={S.toolbar}>
        <div style={S.periodRow}>
          {DAILY_PERIODS.map(p => (
            <button
              key={p.key}
              style={{ ...S.pBtn, ...(period === p.key ? S.pBtnActive : {}) }}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
          {code && (
            <>
              <span style={S.periodDivider} />
              {INTRADAY_PERIODS.map(p => (
                <button
                  key={p.key}
                  style={{ ...S.pBtn, ...(period === p.key ? S.pBtnActive : {}) }}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </>
          )}
        </div>
        <button
          style={{ ...S.toggleBtn, ...(showPanes ? S.toggleBtnActive : {}) }}
          onClick={() => setShowPanes(v => !v)}
        >
          RSI · MACD {showPanes ? '숨기기' : '표시'}
        </button>
      </div>

      {intraday && (
        <div style={S.intradayCaption}>
          분봉은 Yahoo Finance 시세로, 최대 15~20분 지연될 수 있어요. 화면을 열어두면 60초마다 자동 갱신됩니다.
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {tooltip && (
          <div style={S.tooltip}>
            <span style={S.tooltipDate}>{formatTooltipDate(tooltip.date)}</span>
            <span>시 {tooltip.open?.toLocaleString()}</span>
            <span>고 {tooltip.high?.toLocaleString()}</span>
            <span>저 {tooltip.low?.toLocaleString()}</span>
            <span style={{ color: tooltip.close >= tooltip.open ? UP : DOWN, fontWeight: 600 }}>
              종 {tooltip.close?.toLocaleString()}
            </span>
          </div>
        )}
        {intraday && intradayLoading && !intradayHistory.length && (
          <div style={S.intradayOverlay}>분봉 데이터를 불러오는 중...</div>
        )}
        {intraday && intradayError && !intradayHistory.length && (
          <div style={S.intradayOverlay}>분봉 데이터를 불러오지 못했습니다.</div>
        )}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
}

const S = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  periodRow: { display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' },
  periodDivider: { width: 1, height: 14, background: '#2a2a35', margin: '0 2px' },
  pBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  pBtnActive: { background: '#252535', color: '#ccc', border: '0.5px solid #444' },
  toggleBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  toggleBtnActive: { background: '#7F77DD20', border: '0.5px solid #7F77DD', color: '#a29dff' },
  empty: { padding: '40px 0', textAlign: 'center', color: '#444', fontSize: 11.5 },
  intradayCaption: { fontSize: 9.5, color: '#555', marginBottom: 6 },

  tooltip: {
    position: 'absolute', top: 4, left: 4, zIndex: 2,
    display: 'flex', gap: 8, alignItems: 'center',
    background: '#0f1117cc', border: '0.5px solid #2a2a35', borderRadius: 6,
    padding: '4px 8px', fontSize: 10, color: '#999', pointerEvents: 'none',
  },
  tooltipDate: { color: '#666', fontWeight: 500 },
  intradayOverlay: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2,
    fontSize: 11.5, color: '#555', background: '#0f1117cc', padding: '8px 14px', borderRadius: 8,
  },
};
