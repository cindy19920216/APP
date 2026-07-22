"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const UP = '#1D9E75';
const DOWN = '#E24B4A';
const MA5_COLOR = '#e67e22';
const MA20_COLOR = '#2980b9';
const BB_COLOR = '#95a5a6';
const VWAP_COLOR = '#8e44ad';

const PERIODS = [
  { key: '1M', label: '1개월', days: 22 },
  { key: '3M', label: '3개월', days: 66 },
  { key: '6M', label: '6개월', days: 180 },
];

function sliceHistory(history, periodKey) {
  const p = PERIODS.find(x => x.key === periodKey) ?? PERIODS[2];
  return history.slice(-p.days);
}

function lineData(sliced, key) {
  return sliced.filter(h => h[key] != null).map(h => ({ time: h.date, value: h[key] }));
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

export default function StockChart({ history, height = 300 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [period, setPeriod] = useState('3M');
  const [showPanes, setShowPanes] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  // 차트는 mount 시 한 번만 생성 — 데이터/기간 변경은 별도 effect에서 setData만 호출.
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

  useEffect(() => {
    const s = seriesRef.current;
    if (!s.candle || !history?.length) return;
    const sliced = sliceHistory(history, period);

    s.candle.setData(sliced.filter(h => h.open != null).map(h => ({ time: h.date, open: h.open, high: h.high, low: h.low, close: h.close })));
    s.ma5.setData(lineData(sliced, 'ma5'));
    s.ma20.setData(lineData(sliced, 'ma20'));
    s.bbUpper.setData(lineData(sliced, 'bb_upper'));
    s.bbLower.setData(lineData(sliced, 'bb_lower'));
    s.vwap.setData(lineData(sliced, 'vwap'));
    s.volume.setData(sliced.map(h => ({ time: h.date, value: h.volume, color: h.close >= h.open ? UP + '80' : DOWN + '80' })));
    // RSI/MACD는 scaleMargins로 눌러 숨기는 것만으로는 맨 아래에 얇은 조각이
    // 남아 보였다 — 패널이 꺼져 있을 땐 데이터 자체를 비워서 완전히 안 그려지게 한다.
    s.rsi.setData(showPanes ? lineData(sliced, 'rsi') : []);
    s.macd.setData(showPanes ? sliced.filter(h => h.macd_hist != null).map(h => ({ time: h.date, value: h.macd_hist, color: h.macd_hist >= 0 ? UP : DOWN })) : []);

    chartRef.current?.timeScale().fitContent();
  }, [history, period, showPanes]);

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
            <span>시 {tooltip.open?.toLocaleString()}</span>
            <span>고 {tooltip.high?.toLocaleString()}</span>
            <span>저 {tooltip.low?.toLocaleString()}</span>
            <span style={{ color: tooltip.close >= tooltip.open ? UP : DOWN, fontWeight: 600 }}>
              종 {tooltip.close?.toLocaleString()}
            </span>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
}

const S = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  periodRow: { display: 'flex', gap: 4 },
  pBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  pBtnActive: { background: '#252535', color: '#ccc', border: '0.5px solid #444' },
  toggleBtn: { fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '0.5px solid #2a2a35', background: 'transparent', color: '#555', cursor: 'pointer' },
  toggleBtnActive: { background: '#7F77DD20', borderColor: '#7F77DD', color: '#a29dff' },
  empty: { padding: '40px 0', textAlign: 'center', color: '#444', fontSize: 11.5 },

  tooltip: {
    position: 'absolute', top: 4, left: 4, zIndex: 2,
    display: 'flex', gap: 8, alignItems: 'center',
    background: '#0f1117cc', border: '0.5px solid #2a2a35', borderRadius: 6,
    padding: '4px 8px', fontSize: 10, color: '#999', pointerEvents: 'none',
  },
  tooltipDate: { color: '#666', fontWeight: 500 },
};
