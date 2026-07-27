import React, { useState, useRef, useEffect } from 'react';
import { StockDataPoint, IndicatorSettings } from './types';
import { computeIndicators, EnrichedDataPoint, findSupportAndResistance } from './utils/indicatorCalc';

interface ChartCanvasProps {
  data: StockDataPoint[];
  settings: IndicatorSettings;
  height?: number;
  highlightIndex?: number; // Optional index cut-off for training mode
  onHoverPoint?: (point: EnrichedDataPoint | null) => void;
  currencyUnit?: string; // 가격 표시 단위 — KOSPI 종목은 '원', 미국 종목은 '$' (접두사)
  volumeHeight?: number; // 거래량 서브차트 높이(px) — 작게 줄이면 그만큼 캔들 영역이 커진다
}

interface CustomLine {
  id: string;
  type: 'horizontal' | 'trend';
  yValue: number;
  label: string;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  data,
  settings,
  height = 540,
  highlightIndex,
  onHoverPoint,
  currencyUnit = '원',
  volumeHeight: volumeHeightProp = 75,
}) => {
  const fmtPrice = (v: number) => (currencyUnit === '원' ? `${v.toLocaleString()}원` : `${currencyUnit}${v.toLocaleString()}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const activeData = highlightIndex !== undefined ? data.slice(0, highlightIndex) : data;
  const enrichedData: EnrichedDataPoint[] = computeIndicators(activeData, settings.rsiPeriod);

  const subChartCount = (settings.rsiEnabled ? 1 : 0) + (settings.macdEnabled ? 1 : 0);
  const subChartHeight = subChartCount > 0 ? 90 : 0;
  const volumeHeight = settings.volumeEnabled ? volumeHeightProp : 0;
  const mainChartHeight = height - (subChartCount * subChartHeight) - volumeHeight - 40;

  const paddingLeft = 10;
  const paddingRight = 65;
  const paddingTop = 25;
  const MIN_CANDLE_STEP = 8; // 봉 하나당 최소 폭(px) — 이보다 촘촘해지면 스크롤 영역이 넓어진다
  const n = activeData.length;
  const fitWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const chartWidth = Math.max(fitWidth, n * MIN_CANDLE_STEP);
  const svgWidth = chartWidth + paddingLeft + paddingRight;
  const isScrollable = chartWidth > fitWidth;

  const allLows = enrichedData.map((d) => d.low);
  const allHighs = enrichedData.map((d) => d.high);

  if (settings.bollingerEnabled) {
    enrichedData.forEach((d) => {
      if (d.indicators.lowerBB) allLows.push(d.indicators.lowerBB);
      if (d.indicators.upperBB) allHighs.push(d.indicators.upperBB);
    });
  }

  const minPrice = allLows.length > 0 ? Math.min(...allLows) * 0.98 : 100;
  const maxPrice = allHighs.length > 0 ? Math.max(...allHighs) * 1.02 : 200;
  const priceRange = maxPrice - minPrice || 1;

  const { support, resistance } = findSupportAndResistance(activeData);

  const candleWidth = Math.max(2, (chartWidth / Math.max(1, n)) * 0.68);
  const stepX = chartWidth / Math.max(1, n);

  const getX = (i: number) => paddingLeft + i * stepX + stepX / 2;
  const getY = (price: number) =>
    paddingTop + mainChartHeight - ((price - minPrice) / priceRange) * mainChartHeight;

  const maxVol = Math.max(...enrichedData.map((d) => d.volume), 1);
  const getVolY = (vol: number) => {
    const volBaseY = paddingTop + mainChartHeight + volumeHeight;
    return volBaseY - (vol / maxVol) * (volumeHeight - 10);
  };

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawingMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    if (clickY >= paddingTop && clickY <= paddingTop + mainChartHeight) {
      const priceVal = Math.round(
        maxPrice - ((clickY - paddingTop) / mainChartHeight) * priceRange
      );
      setCustomLines((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'horizontal',
          yValue: priceVal,
          label: `나의 지지/저항선: ${fmtPrice(priceVal)}`,
        },
      ]);
    }
  };

  const currentHoverData = hoverIdx !== null && enrichedData[hoverIdx] ? enrichedData[hoverIdx] : null;

  // 종목/기간이 바뀌면 최신 봉이 보이도록 스크롤을 맨 오른쪽으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data, highlightIndex]);

  // 마우스 휠(세로 스크롤)을 차트 좌우 이동으로 변환.
  // React의 합성 onWheel은 passive 리스너라 preventDefault가 안 먹어서 네이티브로 직접 붙인다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isScrollable) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isScrollable]);

  return (
    <div style={{ position: 'relative', width: '100%', background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, padding: 16, userSelect: 'none', overflow: 'hidden' }} ref={containerRef}>
      {/* Chart Top Bar & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '0.5px solid #23232f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#eee' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7F77DD' }} />
            실시간 분석 연습
          </span>
          <span style={{ fontSize: 11, color: '#666' }}>데이터 {n}봉</span>
          {isScrollable && (
            <span style={{ fontSize: 10.5, color: '#7F77DD' }}>
              <i className="ti ti-arrows-horizontal" style={{ fontSize: 11, marginRight: 3 }} />
              스크롤해서 과거 차트 보기
            </span>
          )}
          {settings.showSupportResistance && (
            <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 6, background: '#13131e', border: '0.5px solid #23232f', color: '#ccc' }}>
              지지선 {fmtPrice(support)} / 저항선 {fmtPrice(resistance)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setDrawingMode(!drawingMode)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              ...(drawingMode
                ? { background: '#EF9F27', color: '#1A1A1A', border: 'none' }
                : { background: '#13131e', border: '0.5px solid #23232f', color: '#eee' }),
            }}
            title="차트를 클릭하여 나만의 지지/저항 라인을 직접 그립니다"
          >
            {drawingMode ? '✏️ 선 그리기 클릭 중...' : '➕ 나만의 지지선 그리기'}
          </button>

          {customLines.length > 0 && (
            <button
              onClick={() => setCustomLines([])}
              style={{ padding: '6px 10px', borderRadius: 8, background: '#E24B4A', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              선 초기화 ({customLines.length})
            </button>
          )}
        </div>
      </div>

      {/* SVG Interactive Chart Area — 봉이 촘촘해지면 가로 스크롤 영역으로 전환 */}
      <div ref={scrollRef} style={{ width: '100%', overflowX: isScrollable ? 'auto' : 'hidden', borderRadius: 8 }}>
      <svg
        width={svgWidth}
        height={height}
        style={{ display: 'block', background: '#0e0e14', borderRadius: 8 }}
        onClick={handleChartClick}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left - paddingLeft;
          const idx = Math.floor(mouseX / stepX);
          if (idx >= 0 && idx < n) {
            setHoverIdx(idx);
            if (onHoverPoint) onHoverPoint(enrichedData[idx]);
          } else {
            setHoverIdx(null);
            if (onHoverPoint) onHoverPoint(null);
          }
        }}
        onMouseLeave={() => {
          setHoverIdx(null);
          if (onHoverPoint) onHoverPoint(null);
        }}
      >
        <defs>
          <linearGradient id="bbAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3498DB" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3498DB" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Price Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const p = maxPrice - pct * priceRange;
          const y = paddingTop + pct * mainChartHeight;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="#23232f"
                strokeWidth="1"
              />
              <text
                x={paddingLeft + chartWidth + 6}
                y={y + 4}
                fill="#777"
                fontSize="10"
                fontFamily="sans-serif"
              >
                {Math.round(p).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bollinger Bands Fill Area & Lines */}
        {settings.bollingerEnabled && (
          <g>
            {(() => {
              const upperPts: string[] = [];
              const lowerPts: string[] = [];
              enrichedData.forEach((d, i) => {
                if (d.indicators.upperBB && d.indicators.lowerBB) {
                  upperPts.push(`${getX(i)},${getY(d.indicators.upperBB)}`);
                  lowerPts.unshift(`${getX(i)},${getY(d.indicators.lowerBB)}`);
                }
              });
              if (upperPts.length > 0) {
                const polygonStr = upperPts.concat(lowerPts).join(' ');
                return <polygon points={polygonStr} fill="url(#bbAreaGrad)" />;
              }
              return null;
            })()}

            <polyline
              fill="none"
              stroke="#2980B9"
              strokeWidth="1.2"
              points={enrichedData
                .map((d, i) => (d.indicators.upperBB ? `${getX(i)},${getY(d.indicators.upperBB)}` : null))
                .filter(Boolean)
                .join(' ')}
            />
            <polyline
              fill="none"
              stroke="#2980B9"
              strokeWidth="1.2"
              points={enrichedData
                .map((d, i) => (d.indicators.lowerBB ? `${getX(i)},${getY(d.indicators.lowerBB)}` : null))
                .filter(Boolean)
                .join(' ')}
            />
          </g>
        )}

        {/* Auto Support & Resistance Lines */}
        {settings.showSupportResistance && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(resistance)}
              x2={paddingLeft + chartWidth}
              y2={getY(resistance)}
              stroke="#E74C3C"
              strokeWidth="1.2"
              strokeDasharray="4,4"
            />
            <text x={paddingLeft + 10} y={getY(resistance) - 4} fill="#E74C3C" fontSize="10" fontWeight="bold">
              저항선 {fmtPrice(resistance)}
            </text>

            <line
              x1={paddingLeft}
              y1={getY(support)}
              x2={paddingLeft + chartWidth}
              y2={getY(support)}
              stroke="#27AE60"
              strokeWidth="1.2"
              strokeDasharray="4,4"
            />
            <text x={paddingLeft + 10} y={getY(support) + 12} fill="#27AE60" fontSize="10" fontWeight="bold">
              지지선 {fmtPrice(support)}
            </text>
          </g>
        )}

        {/* Custom Drawn Horizontal Lines */}
        {customLines.map((line) => {
          const lineY = getY(line.yValue);
          return (
            <g key={line.id}>
              <line
                x1={paddingLeft}
                y1={lineY}
                x2={paddingLeft + chartWidth}
                y2={lineY}
                stroke="#D35400"
                strokeWidth="1.8"
              />
              <rect
                x={paddingLeft + chartWidth - 140}
                y={lineY - 10}
                width="135"
                height="18"
                fill="#7F77DD"
              />
              <text x={paddingLeft + chartWidth - 132} y={lineY + 3} fill="#FFFFFF" fontSize="10" fontWeight="bold">
                {line.label}
              </text>
            </g>
          );
        })}

        {/* Candlestick Wicks & Bodies (한국 증시 관행: 상승=빨강, 하락=파랑) */}
        {enrichedData.map((d, i) => {
          const x = getX(i);
          const isBull = d.close >= d.open;
          const candleColor = isBull ? '#E74C3C' : '#3498DB';
          const yHigh = getY(d.high);
          const yLow = getY(d.low);
          const yOpen = getY(d.open);
          const yClose = getY(d.close);

          const bodyY = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

          return (
            <g key={`candle-${i}`}>
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.2" />
              <rect x={x - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} fill={candleColor} />
            </g>
          );
        })}

        {/* Moving Average PolyLines */}
        {settings.showMA5 && (
          <polyline
            fill="none"
            stroke="#F1C40F"
            strokeWidth="2"
            points={enrichedData
              .map((d, i) => (d.indicators.ma5 ? `${getX(i)},${getY(d.indicators.ma5)}` : null))
              .filter(Boolean)
              .join(' ')}
          />
        )}
        {settings.showMA20 && (
          <polyline
            fill="none"
            stroke="#E67E22"
            strokeWidth="2"
            points={enrichedData
              .map((d, i) => (d.indicators.ma20 ? `${getX(i)},${getY(d.indicators.ma20)}` : null))
              .filter(Boolean)
              .join(' ')}
          />
        )}
        {settings.showMA60 && (
          <polyline
            fill="none"
            stroke="#9B59B6"
            strokeWidth="2"
            points={enrichedData
              .map((d, i) => (d.indicators.ma60 ? `${getX(i)},${getY(d.indicators.ma60)}` : null))
              .filter(Boolean)
              .join(' ')}
          />
        )}
        {settings.showMA120 && (
          <polyline
            fill="none"
            stroke="#6B8CAE"
            strokeWidth="2"
            points={enrichedData
              .map((d, i) => (d.indicators.ma120 ? `${getX(i)},${getY(d.indicators.ma120)}` : null))
              .filter(Boolean)
              .join(' ')}
          />
        )}

        {/* Volume Sub-Chart */}
        {settings.volumeEnabled && (
          <g>
            <line
              x1={paddingLeft}
              y1={paddingTop + mainChartHeight}
              x2={paddingLeft + chartWidth}
              y2={paddingTop + mainChartHeight}
              stroke="#23232f"
              strokeWidth="1"
            />
            {enrichedData.map((d, i) => {
              const x = getX(i);
              const isBull = d.close >= d.open;
              const barColor = isBull ? '#E74C3C' : '#3498DB';
              const volY = getVolY(d.volume);
              const volBaseY = paddingTop + mainChartHeight + volumeHeight;
              const barH = volBaseY - volY;

              return (
                <rect
                  key={`vol-${i}`}
                  x={x - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={Math.max(1, barH)}
                  fill={barColor}
                  opacity="0.6"
                />
              );
            })}
            <text x={paddingLeft + 6} y={paddingTop + mainChartHeight + 14} fill="#888" fontSize="10" fontWeight="bold">
              거래량
            </text>
          </g>
        )}

        {/* RSI Sub-Chart */}
        {settings.rsiEnabled && (
          <g>
            {(() => {
              const rsiStartY = paddingTop + mainChartHeight + volumeHeight + 10;
              const rsiH = 70;

              return (
                <g>
                  <rect x={paddingLeft} y={rsiStartY} width={chartWidth} height={rsiH} fill="#13131a" stroke="#23232f" strokeWidth="1" />

                  <line
                    x1={paddingLeft}
                    y1={rsiStartY + rsiH * 0.3}
                    x2={paddingLeft + chartWidth}
                    y2={rsiStartY + rsiH * 0.3}
                    stroke="#E74C3C"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                  />
                  <text x={paddingLeft + chartWidth + 5} y={rsiStartY + rsiH * 0.3 + 3} fill="#E74C3C" fontSize="9">
                    70 과매수
                  </text>

                  <line
                    x1={paddingLeft}
                    y1={rsiStartY + rsiH * 0.7}
                    x2={paddingLeft + chartWidth}
                    y2={rsiStartY + rsiH * 0.7}
                    stroke="#3498DB"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                  />
                  <text x={paddingLeft + chartWidth + 5} y={rsiStartY + rsiH * 0.7 + 3} fill="#3498DB" fontSize="9">
                    30 과매도
                  </text>

                  <polyline
                    fill="none"
                    stroke="#eee"
                    strokeWidth="1.8"
                    points={enrichedData
                      .map((d, i) => {
                        if (d.indicators.rsi === undefined) return null;
                        const ry = rsiStartY + rsiH - (d.indicators.rsi / 100) * rsiH;
                        return `${getX(i)},${ry}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                  />

                  <text x={paddingLeft + 6} y={rsiStartY + 14} fill="#eee" fontSize="10" fontWeight="bold">
                    RSI ({settings.rsiPeriod})
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Crosshair and Hover Line */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={getX(hoverIdx)}
              y1={paddingTop}
              x2={getX(hoverIdx)}
              y2={height - 20}
              stroke="#7F77DD"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle cx={getX(hoverIdx)} cy={getY(enrichedData[hoverIdx].close)} r="4" fill="#7F77DD" stroke="#FFFFFF" strokeWidth="1.5" />
          </g>
        )}
      </svg>
      </div>

      {/* Hover Info Tooltip Bar */}
      {currentHoverData && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#13131e', border: '0.5px solid #23232f', color: '#eee', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 11.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#EF9F27', fontWeight: 600 }}>{currentHoverData.date}</span>
            <span>시가: {currentHoverData.open.toLocaleString()}</span>
            <span>고가: {currentHoverData.high.toLocaleString()}</span>
            <span>저가: {currentHoverData.low.toLocaleString()}</span>
            <span style={{ fontWeight: 600, color: currentHoverData.close >= currentHoverData.open ? '#E24B4A' : '#3B82F6' }}>
              종가: {fmtPrice(currentHoverData.close)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
            {settings.showMA5 && currentHoverData.indicators.ma5 && (
              <span style={{ color: '#EF9F27' }}>5MA: {currentHoverData.indicators.ma5.toLocaleString()}</span>
            )}
            {settings.showMA20 && currentHoverData.indicators.ma20 && (
              <span style={{ color: '#E67E22' }}>20MA: {currentHoverData.indicators.ma20.toLocaleString()}</span>
            )}
            {settings.showMA60 && currentHoverData.indicators.ma60 && (
              <span style={{ color: '#9B59B6' }}>60MA: {currentHoverData.indicators.ma60.toLocaleString()}</span>
            )}
            {settings.rsiEnabled && currentHoverData.indicators.rsi !== undefined && (
              <span style={{ color: '#fff', fontWeight: 600 }}>RSI: {currentHoverData.indicators.rsi}</span>
            )}
            <span style={{ background: '#7F77DD1a', color: '#a29dff', padding: '2px 7px', borderRadius: 6, fontWeight: 600, fontSize: 10 }}>
              {currentHoverData.indicators.alignment}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
