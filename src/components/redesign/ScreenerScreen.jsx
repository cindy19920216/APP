"use client";

import React, { useState, useEffect, useMemo } from 'react';
import IndicatorGuideScreen from './IndicatorGuideScreen';
import DesktopModal from './DesktopModal';
import StockChart from './StockChart';
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
function pclr(v) {
  if (v > 0) return '#1D9E75';
  if (v < 0) return '#E24B4A';
  return '#888';
}
function rsiLabel(v) {
  if (v == null) return '-';
  if (v >= 70) return '과매수';
  if (v <= 30) return '과매도';
  return '중립';
}
function macdMomentumText(v) {
  if (v == null) return '-';
  return v >= 0 ? '상승 모멘텀' : '하락 모멘텀';
}
function pctVsLow(close, low) {
  if (close == null || low == null || low === 0) return null;
  return ((close - low) / low) * 100;
}
function eunNeun(word) {
  if (!word) return '는';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return '는';
  return (code - 0xAC00) % 28 !== 0 ? '은' : '는';
}

// ─── 종목 상세 요약 문단 (자동 생성) ─────────
function buildStockSummary(detail, history) {
  const ind = detail.indicators ?? {};
  const close = ind.close, prev = ind.prev_close;
  if (close == null) return '';

  const change = prev != null ? close - prev : null;

  let changeCtx = '';
  if (history?.length > 5 && change != null) {
    const closes = history.map(h => h.close).filter(v => typeof v === 'number');
    const diffs = closes.slice(1).map((c, i) => Math.abs(c - closes[i]));
    const sorted = [...diffs].sort((a, b) => a - b);
    const medDiff = sorted[Math.floor(sorted.length / 2)] || 1;
    const ratio = Math.abs(change) / medDiff;
    if (ratio < 0.5) changeCtx = '소폭의';
    else if (ratio < 1.5) changeCtx = '일반적인';
    else if (ratio < 3) changeCtx = '평균보다 큰';
    else changeCtx = '역사적으로 드문';
  }

  const dir = change != null && change >= 0 ? '상승' : '하락';
  const topic = eunNeun(detail.name);
  const sentence1 = change != null
    ? `현재 ${detail.name}${topic} ${fmtPrice(close)}원이며, 전일 대비 ${fmtPrice(Math.abs(change))}원(${changeCtx} 변화 수준) ${dir}했습니다.`
    : `현재 ${detail.name}${topic} ${fmtPrice(close)}원입니다.`;

  const parts2 = [];
  if (ind.rsi != null) parts2.push(`RSI는 ${fmtNum(ind.rsi)}로 ${rsiLabel(ind.rsi)} 구간`);
  if (ind.ma5 != null && ind.ma20 != null) {
    parts2.push(ind.ma5 >= ind.ma20 ? 'MA5가 MA20 위에 위치해 단기 상승 추세' : 'MA5가 MA20 아래에 위치해 단기 하락 추세');
  }
  const sentence2 = parts2.length ? parts2.join(', ') + '입니다.' : '';

  let sentence3 = '';
  if (ind.equilibrium != null && close != null) {
    const isDiscount = close < ind.equilibrium;
    const zoneLabel = isDiscount ? 'Discount(매수 관심)' : 'Premium(매도/차익실현)';
    const rangeText = (ind.swing_high != null && ind.swing_low != null)
      ? ` 최근 60거래일 고점 ${fmtPrice(ind.swing_high)}원과 저점 ${fmtPrice(ind.swing_low)}원의 중간값(${fmtPrice(ind.equilibrium)}원)보다 ${isDiscount ? '낮아' : '높아'} 상대적으로 ${isDiscount ? '저렴한' : '비싼'} 구간이라는 뜻이에요.`
      : '';
    sentence3 = `스윙 구조상 ${zoneLabel} 구간에 위치해 있습니다.${rangeText}`;
  }

  return [sentence1, sentence2, sentence3].filter(Boolean).join(' ');
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

function SideStat({ label, value, valueColor }) {
  return (
    <div style={S.sideStatRow}>
      <span style={S.sideStatLabel}>{label}</span>
      <span style={{ ...S.sideStatValue, ...(valueColor ? { color: valueColor } : {}) }}>{value}</span>
    </div>
  );
}

function RawIndicatorSections({ ind }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
    </div>
  );
}

// ─── 종목 상세 (아코디언 인라인 / 데스크톱 우측 패널) ─
function StockDetail({ code, apiBase }) {
  const isDesktop = useIsDesktop();
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShowRaw(false);
    Promise.all([
      fetch(`${apiBase}/api/stocks/${code}`).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/stocks/${code}/history`).then(r => r.ok ? r.json() : []),
    ])
      .then(([d, h]) => { setDetail(d); setHistory(Array.isArray(h) ? h : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code, apiBase]);

  if (loading) return <div style={S.detailLoading}>불러오는 중...</div>;
  if (!detail) return <div style={S.detailLoading}>상세 정보를 불러오지 못했습니다.</div>;

  const ind = detail.indicators ?? {};
  const close = ind.close, prev = ind.prev_close;
  const change = (close != null && prev != null) ? close - prev : null;
  const pct = (change != null && prev) ? (change / prev) * 100 : null;
  const vsLow = pctVsLow(close, ind.low_52w);
  const summary = buildStockSummary(detail, history);

  const priceHeader = (
    <div style={S.priceHeader}>
      <span style={S.priceValue}>{fmtPrice(close)}원</span>
      {change != null && (
        <span style={{ ...S.priceChange, color: pclr(change) }}>
          {change >= 0 ? '+' : ''}{fmtPrice(Math.round(change))}원 ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
        </span>
      )}
    </div>
  );

  // ── 데스크톱: siglens 스타일 2단(차트 크게/좌 + 요약 사이드바/우) ──
  if (isDesktop) {
    return (
      <div style={S.detailDeskWrap}>
        <div style={S.detailOpinion}>{detail.entry_opinion}</div>
        <div style={S.detailDeskSplit}>
          <div style={S.detailChartCol}>
            {priceHeader}
            <StockChart history={history} height={440} />
          </div>
          <div style={S.detailSideCol}>
            <div style={S.sideStatsList}>
              <SideStat label="RSI" value={`${fmtNum(ind.rsi)} · ${rsiLabel(ind.rsi)}`} />
              <SideStat label="MACD" value={macdMomentumText(ind.macd_hist)} />
              <SideStat label="52주 저점 대비" value={vsLow != null ? `+${vsLow.toFixed(1)}%` : '-'} />
              <SideStat
                label="엘더 임펄스"
                value={elderLabel(ind.elder_impulse)}
                valueColor={elderColor(ind.elder_impulse)}
              />
            </div>
            {summary && <div style={S.summaryText}>{summary}</div>}
            <button style={S.rawToggle} onClick={() => setShowRaw(v => !v)}>
              <span>상세 지표</span>
              <i className={`ti ${showRaw ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11 }} />
            </button>
            {showRaw && <RawIndicatorSections ind={ind} />}
          </div>
        </div>
      </div>
    );
  }

  // ── 모바일: 세로 스택 ──
  return (
    <div style={S.detailWrap}>
      <div style={S.detailOpinion}>{detail.entry_opinion}</div>
      {priceHeader}
      <StockChart history={history} height={320} />

      <div style={S.keyStatsRow}>
        <div style={S.keyStat}>
          <div style={S.keyStatLabel}>RSI</div>
          <div style={S.keyStatValue}>{fmtNum(ind.rsi)}</div>
          <div style={S.keyStatSub}>{rsiLabel(ind.rsi)}</div>
        </div>
        <div style={S.keyStat}>
          <div style={S.keyStatLabel}>MACD</div>
          <div style={{ ...S.keyStatValue, fontSize: 10.5 }}>{macdMomentumText(ind.macd_hist)}</div>
        </div>
        <div style={S.keyStat}>
          <div style={S.keyStatLabel}>52주 저점 대비</div>
          <div style={S.keyStatValue}>{vsLow != null ? `+${vsLow.toFixed(1)}%` : '-'}</div>
        </div>
        <div style={S.keyStat}>
          <div style={S.keyStatLabel}>엘더 임펄스</div>
          <div style={{ ...S.keyStatValue, color: elderColor(ind.elder_impulse), fontSize: 10.5 }}>
            {elderLabel(ind.elder_impulse)}
          </div>
        </div>
      </div>

      {summary && <div style={S.summaryText}>{summary}</div>}

      <button style={S.rawToggle} onClick={() => setShowRaw(v => !v)}>
        <span>상세 지표</span>
        <i className={`ti ${showRaw ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11 }} />
      </button>

      {showRaw && <RawIndicatorSections ind={ind} />}
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

  priceHeader: { display: 'flex', alignItems: 'baseline', gap: 10 },
  priceValue: { fontSize: 20, fontWeight: 600, color: '#fff' },
  priceChange: { fontSize: 12.5, fontWeight: 500 },

  keyStatsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  keyStat: { background: '#181820', borderRadius: 8, padding: '8px 6px', textAlign: 'center' },
  keyStatLabel: { fontSize: 8, color: '#444', marginBottom: 4 },
  keyStatValue: { fontSize: 12, color: '#ddd', fontWeight: 600 },
  keyStatSub: { fontSize: 8.5, color: '#666', marginTop: 2 },

  summaryText: { fontSize: 11.5, color: '#999', lineHeight: 1.7, background: '#181820', borderRadius: 10, padding: '10px 12px' },

  rawToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '8px 4px', background: 'transparent', border: 'none',
    borderTop: '0.5px solid #1e1e28', color: '#666', fontSize: 11, fontWeight: 500, cursor: 'pointer',
  },

  // ── 종목 상세: 데스크톱 2단(siglens 스타일) ──
  detailDeskWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  detailDeskSplit: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  detailChartCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  detailSideCol: {
    width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
  },
  sideStatsList: { background: '#181820', borderRadius: 10, padding: '4px 12px' },
  sideStatRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 0', borderBottom: '0.5px solid #1e1e28',
  },
  sideStatLabel: { fontSize: 10.5, color: '#666' },
  sideStatValue: { fontSize: 11.5, color: '#ddd', fontWeight: 600 },

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

  deskSplit: { display: 'flex', gap: 16, alignItems: 'stretch' },
  deskList: {
    width: 460, flexShrink: 0, background: '#181820', borderRadius: 14,
    border: '0.5px solid #1e1e28', height: 'calc(100vh - 200px)',
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
    border: '0.5px solid #1e1e28', height: 'calc(100vh - 200px)', overflowY: 'auto', padding: 18,
  },
  deskEmpty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 12.5 },
};
