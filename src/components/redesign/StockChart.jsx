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

export default function StockChart({ history }) {
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
      height: 280,
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
    const bbUpper = chart.addLineSeries({ color: BB_COLOR, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const bbLower = chart.addLineSeries({ color: BB_COLOR, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const vwap = chart.addLineSeries({ color: VWAP_COLOR, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    const volume = chart.addHistogramSeries({ priceScaleId: 'volume', priceLineVisible: false, lastValueVisible: false });
    const rsi = chart.addLineSeries({ color: '#7F77DD', lineWidth: 1, priceScaleId: 'rsi', priceLineVisible: false, lastValueVisible: false });
    const macd = chart.addHistogramSeries({ priceScaleId: 'macd', priceLineVisible: false, lastValueVisible: false });

    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.priceScale('rsi').applyOptions({ visible: false });
    chart.priceScale('macd').applyOptions({ visible: false });

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
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.03, bottom: 0.45 } });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.58, bottom: 0.30 } });
      chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.68, bottom: 0.15 }, visible: true });
      chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 }, visible: true });
    } else {
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      chart.priceScale('rsi').applyOptions({ visible: false });
      chart.priceScale('macd').applyOptions({ visible: false });
    }
  }, [showPanes]);

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
    s.rsi.setData(lineData(sliced, 'rsi'));
    s.macd.setData(sliced.filter(h => h.macd_hist != null).map(h => ({ time: h.date, value: h.macd_hist, color: h.macd_hist >= 0 ? UP : DOWN })));

    chartRef.current?.timeScale().fitContent();
  }, [history, period]);

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
