import React, { useState, useRef, useEffect } from 'react';
import { StockDataPoint, IndicatorSettings } from './types';
import { computeIndicators, EnrichedDataPoint, findSupportAndResistance } from './utils/indicatorCalc';

interface ChartCanvasProps {
  data: StockDataPoint[];
  settings: IndicatorSettings;
  height?: number;
  highlightIndex?: number; // Optional index cut-off for training mode
  onHoverPoint?: (point: EnrichedDataPoint | null) => void;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
  const volumeHeight = settings.volumeEnabled ? 75 : 0;
  const mainChartHeight = height - (subChartCount * subChartHeight) - volumeHeight - 40;

  const paddingLeft = 10;
  const paddingRight = 65;
  const paddingTop = 25;
  const chartWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);

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

  const n = enrichedData.length;
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
          label: `나의 지지/저항선: ${priceVal.toLocaleString()}원`,
        },
      ]);
    }
  };

  const currentHoverData = hoverIdx !== null && enrichedData[hoverIdx] ? enrichedData[hoverIdx] : null;

  return (
    <div className="relative w-full bg-[#181820] border border-[#23232f] p-4 select-none overflow-hidden" ref={containerRef}>
      {/* Chart Top Bar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-[#23232f] text-xs text-[#bbb]">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-[#eee] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#7F77DD] animate-pulse"></span>
            Real-Time Analysis Practice
          </span>
          <span className="text-[#999] text-[11px]">데이터 {n}봉</span>
          {settings.showSupportResistance && (
            <span className="hidden sm:inline-block bg-[#13131a] border border-[#23232f] px-2.5 py-0.5 text-[#eee] font-medium text-[11px]">
              지지선 {support.toLocaleString()}원 / 저항선 {resistance.toLocaleString()}원
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDrawingMode(!drawingMode)}
            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              drawingMode
                ? 'bg-[#F1C40F] text-[#1A1A1A]'
                : 'bg-[#181820] border border-[#23232f] hover:border-[#7F77DD] text-[#eee]'
            }`}
            title="차트를 클릭하여 나만의 지지/저항 라인을 직접 그립니다"
          >
            {drawingMode ? '✏️ 선 그리기 클릭 중...' : '➕ 나만의 지지선 그리기'}
          </button>

          {customLines.length > 0 && (
            <button
              onClick={() => setCustomLines([])}
              className="px-2.5 py-1 bg-[#E74C3C] text-white text-[11px] font-bold uppercase tracking-wider"
            >
              선 초기화 ({customLines.length})
            </button>
          )}
        </div>
      </div>

      {/* SVG Interactive Chart Area */}
      <svg
        width={containerWidth}
        height={height}
        className="w-full cursor-crosshair block bg-[#0e0e14]"
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
              저항선 {resistance.toLocaleString()}원
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
              지지선 {support.toLocaleString()}원
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

      {/* Hover Info Tooltip Bar */}
      {currentHoverData && (
        <div className="mt-3 p-3 bg-[#13131a] border border-[#23232f] text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-[#F1C40F] font-bold font-sans">{currentHoverData.date}</span>
            <span>시가: {currentHoverData.open.toLocaleString()}</span>
            <span>고가: {currentHoverData.high.toLocaleString()}</span>
            <span>저가: {currentHoverData.low.toLocaleString()}</span>
            <span
              className={`font-bold font-sans ${
                currentHoverData.close >= currentHoverData.open ? 'text-[#E74C3C]' : 'text-[#3498DB]'
              }`}
            >
              종가: {currentHoverData.close.toLocaleString()}원
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-sans">
            {settings.showMA5 && currentHoverData.indicators.ma5 && (
              <span className="text-[#F1C40F]">5MA: {currentHoverData.indicators.ma5.toLocaleString()}</span>
            )}
            {settings.showMA20 && currentHoverData.indicators.ma20 && (
              <span className="text-[#E67E22]">20MA: {currentHoverData.indicators.ma20.toLocaleString()}</span>
            )}
            {settings.showMA60 && currentHoverData.indicators.ma60 && (
              <span className="text-[#9B59B6]">60MA: {currentHoverData.indicators.ma60.toLocaleString()}</span>
            )}
            {settings.rsiEnabled && currentHoverData.indicators.rsi !== undefined && (
              <span className="text-white font-bold">RSI: {currentHoverData.indicators.rsi}</span>
            )}
            <span className="bg-[#7F77DD] text-white px-1.5 py-0.5 font-bold uppercase text-[10px]">
              {currentHoverData.indicators.alignment}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
