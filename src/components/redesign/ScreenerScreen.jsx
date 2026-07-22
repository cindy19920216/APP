"use client";

import React, { useState, useEffect, useMemo } from 'react';
import IndicatorGuideScreen from './IndicatorGuideScreen';
import DesktopModal from './DesktopModal';
import useIsDesktop from '@/hooks/useIsDesktop';

// ─── 유틸 ─────────────────────────────────
function trendColor(t) {
  if (t === '강세') return '#1D9E75';
  if (t === '약세') return '#E24B4A';
  return '#888';
}
function opinionColor(op) {
  if (op.startsWith('매수')) return '#1D9E75';
  if (op.startsWith('매도')) return '#E24B4A';
  return '#555';
}
function opinionLabel(op) {
  return op.split('(')[0].trim();
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
function elderLabel(c) {
  if (c === 'green') return '강세(매수 가능)';
  if (c === 'red') return '약세(신규 매수 자제)';
  return '중립';
}
function chochLabel(c) {
  if (c === 'bullish') return '상승 전환';
  if (c === 'bearish') return '하락 전환';
  return '미감지';
}

const FILTERS = [
  { key: 'all',  label: '전체' },
  { key: 'buy',  label: '매수 관심' },
  { key: 'sell', label: '매도 관심' },
  { key: 'hold', label: '관망' },
];
function matchesFilter(stock, key) {
  if (key === 'all') return true;
  if (key === 'buy') return stock.entry_opinion.startsWith('매수');
  if (key === 'sell') return stock.entry_opinion.startsWith('매도');
  return !stock.entry_opinion.startsWith('매수') && !stock.entry_opinion.startsWith('매도');
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

// ─── 종목 상세 (아코디언 인라인) ────────────
function StockDetail({ code, apiBase }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/stocks/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDetail(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code, apiBase]);

  if (loading) return <div style={S.detailLoading}>불러오는 중...</div>;
  if (!detail) return <div style={S.detailLoading}>상세 정보를 불러오지 못했습니다.</div>;

  const ind = detail.indicators ?? {};
  const chartUrl = detail.chart_path ? `${apiBase}/${detail.chart_path}` : null;

  return (
    <div style={S.detailWrap}>
      <div style={S.detailOpinion}>{detail.entry_opinion}</div>

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

      <div style={S.elderRow}>
        <span style={S.elderLabelText}>엘더 임펄스</span>
        <span style={{ ...S.elderBadge, color: elderColor(ind.elder_impulse), background: elderColor(ind.elder_impulse) + '18' }}>
          {elderLabel(ind.elder_impulse)}
        </span>
      </div>

      {chartUrl && !imgError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chartUrl}
          alt={`${detail.name} 차트`}
          style={S.chartImg}
          onError={() => setImgError(true)}
        />
      )}
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
function StockRow({ stock, isOpen, onToggle, apiBase }) {
  return (
    <div>
      <button style={S.stockRow} onClick={onToggle}>
        <div style={S.stockLeft}>
          <div style={S.stockName}>{stock.name}</div>
          <div style={S.stockMeta}>{stock.code} · {stock.market} · 시총 {formatMarketCap(stock.market_cap_100m)}</div>
        </div>
        <span style={{ ...S.trendBadge, color: trendColor(stock.trend), borderColor: trendColor(stock.trend) + '40' }}>
          {stock.trend}
        </span>
        <span style={{ ...S.opinionBadge, color: opinionColor(stock.entry_opinion), background: opinionColor(stock.entry_opinion) + '15' }}>
          {opinionLabel(stock.entry_opinion)}
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

  const counts = useMemo(() => {
    const c = { all: stocks.length, buy: 0, sell: 0, hold: 0 };
    for (const s of stocks) {
      if (s.entry_opinion.startsWith('매수')) c.buy++;
      else if (s.entry_opinion.startsWith('매도')) c.sell++;
      else c.hold++;
    }
    return c;
  }, [stocks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks
      .filter(s =>
        matchesFilter(s, filter) &&
        (q === '' || s.name.toLowerCase().includes(q) || s.code.includes(q))
      )
      .sort((a, b) => (b.market_cap_100m ?? 0) - (a.market_cap_100m ?? 0));
  }, [stocks, filter, query]);

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
                    <span style={{ ...S.trendBadge, color: trendColor(s.trend), borderColor: trendColor(s.trend) + '40', width: 52, textAlign: 'center' }}>
                      {s.trend}
                    </span>
                    <span style={{ ...S.opinionBadge, color: opinionColor(s.entry_opinion), background: opinionColor(s.entry_opinion) + '15', width: 92, textAlign: 'center' }}>
                      {opinionLabel(s.entry_opinion)}
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
  trendBadge: { fontSize: 9.5, padding: '3px 7px', borderRadius: 999, border: '0.5px solid', flexShrink: 0 },
  opinionBadge: { fontSize: 9.5, padding: '3px 7px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' },

  detailWrap: { background: '#13131e', padding: '12px 14px 16px', borderTop: '0.5px solid #1e1e28', display: 'flex', flexDirection: 'column', gap: 10 },
  detailLoading: { background: '#13131e', padding: '14px', fontSize: 11, color: '#555', borderTop: '0.5px solid #1e1e28' },
  detailOpinion: { fontSize: 11.5, color: '#bbb', lineHeight: 1.5 },

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

  deskSplit: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  deskList: {
    width: 460, flexShrink: 0, background: '#181820', borderRadius: 14,
    border: '0.5px solid #1e1e28', maxHeight: 'calc(100vh - 250px)',
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
    border: '0.5px solid #1e1e28', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', padding: 18,
  },
  deskEmpty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 12.5 },
};
