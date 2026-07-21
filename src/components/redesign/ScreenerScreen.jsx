"use client";

import React, { useState, useEffect, useMemo } from 'react';

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

      <div style={S.detailGrid}>
        <DetailStat label="종가" value={ind.close?.toLocaleString?.() ?? '-'} />
        <DetailStat label="RSI" value={ind.rsi?.toFixed?.(1) ?? '-'} />
        <DetailStat label="MACD Hist" value={ind.macd_hist?.toFixed?.(1) ?? '-'} />
        <DetailStat label="엘더 임펄스" value={ind.elder_impulse ?? '-'} />
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
          <div style={S.stockMeta}>{stock.code} · {stock.market}</div>
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
export default function ScreenerScreen({ onBack }) {
  const [stocks, setStocks] = useState([]);
  const [apiBase, setApiBase] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [openCode, setOpenCode] = useState(null);

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
    return stocks.filter(s =>
      matchesFilter(s, filter) &&
      (q === '' || s.name.toLowerCase().includes(q) || s.code.includes(q))
    );
  }, [stocks, filter, query]);

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" /> 기업분석
        </button>
        <span style={S.headerTitle}>KOSPI200 스크리너</span>
        <div style={{ width: 64 }} />
      </div>

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

      <div style={S.scroll}>
        <div style={S.scrollContent}>
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
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

// ─── 스타일 ────────────────────────────────
const S = {
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0f1117', overflow: 'hidden' },
  header: { padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e28', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#7F77DD', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: '#fff' },

  searchWrap: {
    margin: '10px 14px 0', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
    background: '#181820', borderRadius: 10, flexShrink: 0,
  },
  searchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ddd', fontSize: 12 },

  filterRow: { display: 'flex', gap: 6, padding: '10px 14px 0', flexShrink: 0, overflowX: 'auto' },
  filterChip: {
    padding: '6px 10px', borderRadius: 999, border: '0.5px solid #2a2a3a', background: 'transparent',
    color: '#888', fontSize: 10.5, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
  },
  filterChipActive: { background: '#7F77DD20', borderColor: '#7F77DD', color: '#a29dff' },

  scroll: { flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' },
  scrollContent: { padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 },
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

  detailWrap: { background: '#13131e', padding: '12px 14px 16px', borderTop: '0.5px solid #1e1e28' },
  detailLoading: { background: '#13131e', padding: '14px', fontSize: 11, color: '#555', borderTop: '0.5px solid #1e1e28' },
  detailOpinion: { fontSize: 11.5, color: '#bbb', lineHeight: 1.5, marginBottom: 10 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 },
  statCell: { background: '#181820', borderRadius: 8, padding: '7px 6px', textAlign: 'center' },
  statLabel: { fontSize: 8, color: '#444', marginBottom: 3 },
  statValue: { fontSize: 11, color: '#ddd', fontWeight: 500 },
  chartImg: { width: '100%', borderRadius: 8, display: 'block' },
};
