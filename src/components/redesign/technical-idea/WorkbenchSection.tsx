import React, { useState } from 'react';
import { STOCK_DATASETS, StockDatasetInfo } from './data/stockDatasets';
import { CHART_PRESETS } from './data/presetsData';
import { IndicatorSettings, ChartPreset } from './types';
import { ChartCanvas } from './ChartCanvas';
import { computeIndicators, EnrichedDataPoint, findSupportAndResistance } from './utils/indicatorCalc';
import { Settings2, Sliders, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface WorkbenchSectionProps {
  initialPresetId?: string;
  onConsultAiDoctor: (stockName: string, timeframe: string, currentPrice: number, technicals: any) => void;
}

export const WorkbenchSection: React.FC<WorkbenchSectionProps> = ({
  initialPresetId = 'classic_trend_preset',
  onConsultAiDoctor,
}) => {
  const [selectedStock, setSelectedStock] = useState<StockDatasetInfo>(STOCK_DATASETS[0]);
  const [activePresetId, setActivePresetId] = useState<string>(initialPresetId);

  // Default indicator settings initialized from active preset
  const currentPreset = CHART_PRESETS.find((p) => p.id === activePresetId) || CHART_PRESETS[1];
  const [settings, setSettings] = useState<IndicatorSettings>(currentPreset.settings);

  const [hoveredPoint, setHoveredPoint] = useState<EnrichedDataPoint | null>(null);

  // Apply predefined preset
  const handleSelectPreset = (preset: ChartPreset) => {
    setActivePresetId(preset.id);
    setSettings(preset.settings);
  };

  // Compute indicators for active stock
  const enrichedStock = computeIndicators(selectedStock.data, settings.rsiPeriod);
  const latestPoint = enrichedStock[enrichedStock.length - 1];
  const { support, resistance } = findSupportAndResistance(selectedStock.data);

  // Diagnostics calculations
  const alignment = latestPoint?.indicators.alignment || '혼조세';
  const rsiVal = latestPoint?.indicators.rsi;
  const isOverbought = rsiVal !== undefined && rsiVal >= 70;
  const isOversold = rsiVal !== undefined && rsiVal <= 30;

  return (
    <div className="space-y-6">
      {/* Top Header & Stock Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181820] border border-[#23232f] p-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
              Chart Studio · Interactive
            </span>
            <span className="text-xs text-[#999]">나만의 기술적 차트분석 실험실</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#eee] mt-2">
            {selectedStock.name} <span className="text-[#999] text-sm font-sans font-bold">({selectedStock.ticker})</span>
          </h2>
        </div>

        {/* Stock Dataset Dropdown & Timeframe selector */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedStock.id}
            onChange={(e) => {
              const found = STOCK_DATASETS.find((s) => s.id === e.target.value);
              if (found) setSelectedStock(found);
            }}
            className="bg-[#13131a] border border-[#23232f] text-[#eee] text-xs sm:text-sm font-bold px-4 py-2.5 focus:outline-none focus:border-[#7F77DD]"
          >
            {STOCK_DATASETS.map((stock) => (
              <option key={stock.id} value={stock.id}>
                [{stock.timeframe}] {stock.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Guru Presets Selector Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#999] px-1">
          <span className="font-bold text-[#eee] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Sliders className="w-3.5 h-3.5 text-[#eee]" />
            구루의 차트 기본 프리셋 (1-Click Presets)
          </span>
          <span className="">원하는 지표만자유롭게 커스텀 가능</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CHART_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3.5 text-left transition-all ${
                  isSelected
                    ? 'bg-[#7F77DD] text-white border border-[#7F77DD]'
                    : 'bg-[#181820] text-[#eee] border border-[#23232f] hover:border-[#7F77DD]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#eee]'}`}>
                    {preset.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#F1C40F]" />}
                </div>
                <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-[#999]'}`}>
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Chart Canvas (8 cols) + Indicator Controls Drawer (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Canvas Area */}
        <div className="lg:col-span-8 space-y-4">
          <ChartCanvas
            data={selectedStock.data}
            settings={settings}
            height={520}
            onHoverPoint={setHoveredPoint}
          />

          {/* Quick Stats Bar under Chart */}
          {latestPoint && (
            <div className="p-4 bg-[#181820] border border-[#23232f] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#eee]">
              <div>
                <span className="text-[#999] block text-[10px] uppercase font-bold tracking-wider">현재 종가</span>
                <span className="text-sm font-bold text-[#eee]">
                  {latestPoint.close.toLocaleString()}원
                </span>
              </div>

              <div>
                <span className="text-[#999] block text-[10px] uppercase font-bold tracking-wider">이평선 배열 상태</span>
                <span
                  className={`text-sm font-bold ${
                    alignment === '정배열'
                      ? 'text-[#27AE60]'
                      : alignment === '역배열'
                      ? 'text-[#E74C3C]'
                      : 'text-[#D35400]'
                  }`}
                >
                  {alignment}
                </span>
              </div>

              <div>
                <span className="text-[#999] block text-[10px] uppercase font-bold tracking-wider">RSI 수치</span>
                <span
                  className={`text-sm font-bold ${
                    isOverbought
                      ? 'text-[#E74C3C]'
                      : isOversold
                      ? 'text-[#3498DB]'
                      : 'text-[#eee]'
                  }`}
                >
                  {latestPoint.indicators.rsi ?? 'N/A'}{' '}
                  {isOverbought ? '(과매수)' : isOversold ? '(과매도)' : ''}
                </span>
              </div>

              <div>
                <span className="text-[#999] block text-[10px] uppercase font-bold tracking-wider">자동 지지 / 저항선</span>
                <span className="text-xs font-semibold text-[#eee]">
                  S: {support.toLocaleString()} / R: {resistance.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Custom Indicator Customizer Sidebar */}
        <div className="lg:col-span-4 bg-[#181820] border border-[#23232f] p-5 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#23232f]">
            <Settings2 className="w-5 h-5 text-[#eee]" />
            <h3 className="text-base font-bold text-[#eee]">차트 지표 커스텀</h3>
          </div>

          {/* Moving Averages Toggles */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#999]">
              이동평균선 (Moving Averages)
            </h4>
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.showMA5}
                  onChange={(e) => setSettings({ ...settings, showMA5: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="w-3 h-3 bg-[#F1C40F] inline-block"></span>
                <span className="text-[#eee] font-bold">5일 이평선 (단기 심리선)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.showMA20}
                  onChange={(e) => setSettings({ ...settings, showMA20: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="w-3 h-3 bg-[#E67E22] inline-block"></span>
                <span className="text-[#eee] font-bold">20일 이평선 (생명선)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.showMA60}
                  onChange={(e) => setSettings({ ...settings, showMA60: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="w-3 h-3 bg-[#9B59B6] inline-block"></span>
                <span className="text-[#eee] font-bold">60일 이평선 (수급선)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.showMA120}
                  onChange={(e) => setSettings({ ...settings, showMA120: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="w-3 h-3 bg-[#34495E] inline-block"></span>
                <span className="text-[#eee] font-bold">120일 이평선 (대세선)</span>
              </label>
            </div>
          </div>

          {/* Auxiliary Indicators Toggles */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#999]">
              보조 지표 (Oscillators & Bands)
            </h4>
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.rsiEnabled}
                  onChange={(e) => setSettings({ ...settings, rsiEnabled: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="text-[#eee] font-bold">RSI 상대강도지수 (70/30)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.bollingerEnabled}
                  onChange={(e) => setSettings({ ...settings, bollingerEnabled: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="text-[#eee] font-bold">볼린저 밴드 (20, 2)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.volumeEnabled}
                  onChange={(e) => setSettings({ ...settings, volumeEnabled: e.target.checked })}
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="text-[#eee] font-bold">거래량 차트 (Volume)</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-[#13131a] border border-[#23232f]">
                <input
                  type="checkbox"
                  checked={settings.showSupportResistance}
                  onChange={(e) =>
                    setSettings({ ...settings, showSupportResistance: e.target.checked })
                  }
                  className="rounded text-[#eee] focus:ring-0"
                />
                <span className="text-[#eee] font-bold">자동 지지선 / 저항선 표시</span>
              </label>
            </div>
          </div>

          {/* AI Analysis Trigger */}
          <div className="pt-2">
            <button
              onClick={() =>
                onConsultAiDoctor(
                  selectedStock.name,
                  selectedStock.timeframe,
                  latestPoint.close,
                  {
                    alignment,
                    rsi: latestPoint.indicators.rsi,
                    support,
                    resistance,
                    ma5: latestPoint.indicators.ma5,
                    ma20: latestPoint.indicators.ma20,
                  }
                )
              }
              className="w-full py-3.5 bg-[#7F77DD] hover:bg-[#6b63c9] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#F1C40F]" />
              <span>AI 차트 닥터에게 이 차트 진단 받기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
