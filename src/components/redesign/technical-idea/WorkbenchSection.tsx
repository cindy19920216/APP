import React, { useState, useEffect, useRef } from 'react';
import { STOCK_UNIVERSE, UniverseEntry } from './data/universeData';
import { CHART_PRESETS } from './data/presetsData';
import { IndicatorSettings, ChartPreset, StockDataPoint } from './types';
import { ChartCanvas } from './ChartCanvas';
import { computeIndicators, EnrichedDataPoint, findSupportAndResistance } from './utils/indicatorCalc';

interface WorkbenchSectionProps {
  initialPresetId?: string;
  onConsultAiDoctor: (stockName: string, timeframe: string, currentPrice: number, technicals: any) => void;
}

const DEFAULT_ENTRY: UniverseEntry = { code: '005930', name: '삼성전자', market: 'KOSPI' };

const RANGES: { id: string; label: string }[] = [
  { id: '3mo', label: '3개월' },
  { id: '6mo', label: '6개월' },
  { id: '1y', label: '1년' },
  { id: '3y', label: '3년' },
  { id: '5y', label: '5년' },
];

function Toggle({ checked, onChange, label, dotColor }: { checked: boolean; onChange: (v: boolean) => void; label: string; dotColor?: string }) {
  return (
    <label style={S.toggleRow}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#7F77DD', width: 14, height: 14 }}
      />
      {dotColor && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
      <span style={S.toggleLabel}>{label}</span>
    </label>
  );
}

export const WorkbenchSection: React.FC<WorkbenchSectionProps> = ({
  initialPresetId = 'classic_trend_preset',
  onConsultAiDoctor,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<UniverseEntry>(DEFAULT_ENTRY);
  const [range, setRange] = useState<string>('1y');
  const [chartData, setChartData] = useState<StockDataPoint[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [activePresetId, setActivePresetId] = useState<string>(initialPresetId);
  const currentPreset = CHART_PRESETS.find((p) => p.id === activePresetId) || CHART_PRESETS[1];
  const [settings, setSettings] = useState<IndicatorSettings>(currentPreset.settings);
  const [, setHoveredPoint] = useState<EnrichedDataPoint | null>(null);

  // 검색 결과 (코드/티커/종목명 부분 일치, 최대 20건)
  const searchResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return STOCK_UNIVERSE.filter(
      (e) => e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query]);

  // 바깥 클릭 시 검색 드롭다운 닫기
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // 실제 시세 데이터 로드 (야후 파이낸스 경유, /api/chart/[ticker])
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/chart/${encodeURIComponent(selectedEntry.code)}?range=${range}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('데이터를 불러오지 못했습니다')))
      .then((json) => {
        if (cancelled) return;
        if (json.error || !Array.isArray(json.points) || json.points.length === 0) {
          throw new Error(json.error || '차트 데이터가 없습니다');
        }
        const points: StockDataPoint[] = json.points.map((p: any) => ({
          date: p.date, open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume ?? 0,
        }));
        setChartData(points);
      })
      .catch((e) => {
        if (cancelled) return;
        setChartData(null);
        setError(e.message || '차트 데이터를 불러오지 못했습니다');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedEntry, range]);

  const handleSelectPreset = (preset: ChartPreset) => {
    setActivePresetId(preset.id);
    setSettings(preset.settings);
  };

  const handleSelectEntry = (entry: UniverseEntry) => {
    setSelectedEntry(entry);
    setQuery('');
    setSearchOpen(false);
  };

  const enrichedStock = chartData ? computeIndicators(chartData, settings.rsiPeriod) : [];
  const latestPoint = enrichedStock[enrichedStock.length - 1];
  const { support, resistance } = chartData ? findSupportAndResistance(chartData) : { support: 0, resistance: 0 };

  const alignment = latestPoint?.indicators.alignment || '혼조세';
  const rsiVal = latestPoint?.indicators.rsi;
  const isOverbought = rsiVal !== undefined && rsiVal >= 70;
  const isOversold = rsiVal !== undefined && rsiVal <= 30;
  const alignmentColor = alignment === '정배열' ? '#1D9E75' : alignment === '역배열' ? '#E24B4A' : '#EF9F27';
  const rsiColor = isOverbought ? '#E24B4A' : isOversold ? '#3B82F6' : '#eee';

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.badgeRow}>
            <span style={S.badge}>차트 스튜디오</span>
            <span style={S.detailMeta}>KOSPI200 · S&amp;P500 실시간 시세로 나만의 기술적 차트분석 실험실</span>
          </div>
          <div style={S.title}>
            {selectedEntry.name} <span style={S.tickerText}>({selectedEntry.code} · {selectedEntry.market})</span>
          </div>
        </div>

        <div style={S.headerRight}>
          <div style={S.segmented}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                style={{ ...S.segBtn, ...(range === r.id ? S.segBtnActive : {}) }}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div style={S.searchBox} ref={searchBoxRef}>
            <i className="ti ti-search" style={S.searchIcon} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="종목명 또는 코드 검색 (예: 삼성전자, AAPL)"
              style={S.searchInput}
            />
            {searchOpen && query.trim() && (
              <div style={S.searchDropdown}>
                {searchResults.length === 0 && <div style={S.searchEmpty}>검색 결과가 없습니다</div>}
                {searchResults.map((entry) => (
                  <button key={`${entry.market}-${entry.code}`} style={S.searchRow} onClick={() => handleSelectEntry(entry)}>
                    <span style={S.searchRowName}>{entry.name}</span>
                    <span style={S.searchRowMeta}>{entry.code}</span>
                    <span style={S.searchRowBadge}>{entry.market}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div style={S.presetHeadRow}>
          <span style={S.sectionTitle}>구루의 차트 기본 프리셋</span>
          <span style={S.detailMeta}>원하는 지표만 자유롭게 커스텀 가능</span>
        </div>
        <div style={S.presetGrid}>
          {CHART_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                style={{ ...S.presetCard, ...(isSelected ? S.presetCardActive : {}) }}
              >
                <div style={S.presetCardHead}>
                  <span style={S.presetCardName}>{preset.name}</span>
                  {isSelected && <i className="ti ti-check" style={{ fontSize: 13 }} />}
                </div>
                <div style={S.presetCardDesc}>{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={S.mainSplit}>
        <div style={S.chartCol}>
          {loading && <div style={S.chartMsg}>{selectedEntry.name} 실시간 차트를 불러오는 중...</div>}
          {!loading && error && <div style={{ ...S.chartMsg, color: '#E24B4A' }}>{error}</div>}
          {!loading && !error && chartData && (
            <ChartCanvas
              data={chartData}
              settings={settings}
              height={480}
              onHoverPoint={setHoveredPoint}
              currencyUnit={selectedEntry.market === 'KOSPI' ? '원' : '$'}
            />
          )}

          {latestPoint && !loading && !error && (
            <div style={S.statsBar}>
              <div>
                <div style={S.statLabel}>현재 종가</div>
                <div style={S.statValue}>
                  {selectedEntry.market === 'KOSPI' ? `${latestPoint.close.toLocaleString()}원` : `$${latestPoint.close.toLocaleString()}`}
                </div>
              </div>
              <div>
                <div style={S.statLabel}>이평선 배열</div>
                <div style={{ ...S.statValue, color: alignmentColor }}>{alignment}</div>
              </div>
              <div>
                <div style={S.statLabel}>RSI 수치</div>
                <div style={{ ...S.statValue, color: rsiColor }}>
                  {latestPoint.indicators.rsi ?? 'N/A'} {isOverbought ? '(과매수)' : isOversold ? '(과매도)' : ''}
                </div>
              </div>
              <div>
                <div style={S.statLabel}>지지 / 저항선</div>
                <div style={S.statValue}>{support.toLocaleString()} / {resistance.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        <div style={S.sidebar}>
          <div style={S.sidebarHead}>
            <i className="ti ti-adjustments" style={{ fontSize: 16, color: '#eee' }} />
            <span style={S.sidebarTitle}>차트 지표 커스텀</span>
          </div>

          <div style={S.toggleGroup}>
            <div style={S.sectionTitle}>이동평균선</div>
            <Toggle checked={settings.showMA5} onChange={(v) => setSettings({ ...settings, showMA5: v })} label="5일 이평선 (단기 심리선)" dotColor="#EF9F27" />
            <Toggle checked={settings.showMA20} onChange={(v) => setSettings({ ...settings, showMA20: v })} label="20일 이평선 (생명선)" dotColor="#E67E22" />
            <Toggle checked={settings.showMA60} onChange={(v) => setSettings({ ...settings, showMA60: v })} label="60일 이평선 (수급선)" dotColor="#9B59B6" />
            <Toggle checked={settings.showMA120} onChange={(v) => setSettings({ ...settings, showMA120: v })} label="120일 이평선 (대세선)" dotColor="#64748b" />
          </div>

          <div style={S.toggleGroup}>
            <div style={S.sectionTitle}>보조 지표</div>
            <Toggle checked={settings.rsiEnabled} onChange={(v) => setSettings({ ...settings, rsiEnabled: v })} label="RSI 상대강도지수 (70/30)" />
            <Toggle checked={settings.bollingerEnabled} onChange={(v) => setSettings({ ...settings, bollingerEnabled: v })} label="볼린저 밴드 (20, 2)" />
            <Toggle checked={settings.volumeEnabled} onChange={(v) => setSettings({ ...settings, volumeEnabled: v })} label="거래량 차트" />
            <Toggle checked={settings.showSupportResistance} onChange={(v) => setSettings({ ...settings, showSupportResistance: v })} label="자동 지지선 / 저항선 표시" />
          </div>

          <button
            style={{ ...S.ctaButtonFull, ...(latestPoint ? {} : S.ctaButtonDisabled) }}
            disabled={!latestPoint}
            onClick={() =>
              latestPoint && onConsultAiDoctor(selectedEntry.name, range, latestPoint.close, {
                alignment, rsi: latestPoint.indicators.rsi, support, resistance,
                ma5: latestPoint.indicators.ma5, ma20: latestPoint.indicators.ma20,
              })
            }
          >
            <i className="ti ti-sparkles" style={{ fontSize: 15 }} />
            <span>AI 차트 닥터에게 이 차트 진단 받기</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },

  header: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: '18px 22px' },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: { fontSize: 9.5, padding: '3px 8px', borderRadius: 6, background: '#7F77DD1a', color: '#a29dff', fontWeight: 600, flexShrink: 0 },
  detailMeta: { fontSize: 11, color: '#666' },
  title: { fontSize: 20, fontWeight: 600, color: '#eee', marginTop: 8 },
  tickerText: { fontSize: 13, color: '#666', fontWeight: 500 },

  headerRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  segmented: { display: 'flex', gap: 2, background: '#13131e', borderRadius: 10, padding: 3 },
  segBtn: { padding: '7px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 500, color: '#999', background: 'transparent', border: 'none', cursor: 'pointer' },
  segBtnActive: { background: '#7F77DD', color: '#fff' },

  searchBox: { position: 'relative', width: 260 },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#666', pointerEvents: 'none' },
  searchInput: { flex: 1, width: '100%', background: '#13131e', border: '0.5px solid #23232f', borderRadius: 10, color: '#eee', fontSize: 12.5, padding: '9px 10px 9px 30px', outline: 'none', boxSizing: 'border-box' },
  searchDropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20,
    background: '#181820', border: '0.5px solid #2a2a3a', borderRadius: 12, padding: 6,
    maxHeight: 320, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
  },
  searchRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' },
  searchRowName: { fontSize: 12, color: '#eee', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  searchRowMeta: { fontSize: 10.5, color: '#666', flexShrink: 0 },
  searchRowBadge: { fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#7F77DD1a', color: '#a29dff', fontWeight: 600, flexShrink: 0 },
  searchEmpty: { padding: '14px 10px', textAlign: 'center', fontSize: 11.5, color: '#666' },

  presetHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' },
  sectionTitle: { fontSize: 9.5, color: '#444', fontWeight: 600, letterSpacing: '0.3px' },

  presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 },
  presetCard: { padding: '12px 14px', borderRadius: 12, border: '0.5px solid #23232f', background: '#181820', cursor: 'pointer', textAlign: 'left' },
  presetCardActive: { background: '#7F77DD14', border: '0.5px solid #7F77DD' },
  presetCardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#eee' },
  presetCardName: { fontSize: 12, fontWeight: 600, color: '#eee' },
  presetCardDesc: { fontSize: 10.5, color: '#777', marginTop: 4, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  mainSplit: { display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  chartCol: { flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  chartMsg: { padding: '80px 20px', textAlign: 'center', background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, color: '#666', fontSize: 12.5 },

  statsBar: { padding: '14px 16px', background: '#181820', border: '0.5px solid #23232f', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 },
  statLabel: { fontSize: 9.5, color: '#666', fontWeight: 600, letterSpacing: '0.3px', marginBottom: 5 },
  statValue: { fontSize: 13, fontWeight: 600, color: '#eee' },

  sidebar: { width: 320, flex: '0 0 320px', background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 },
  sidebarHead: { display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid #23232f', paddingBottom: 12 },
  sidebarTitle: { fontSize: 14, fontWeight: 600, color: '#eee' },

  toggleGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', background: '#13131e', borderRadius: 8, cursor: 'pointer' },
  toggleLabel: { fontSize: 11.5, color: '#ccc', fontWeight: 500 },

  ctaButtonFull: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 0', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer' },
  ctaButtonDisabled: { opacity: 0.4, cursor: 'not-allowed' },
};
