"use client";

// ─────────────────────────────────────────────
//  DetailScreen.jsx  –  개인 자산 상세화면
// ─────────────────────────────────────────────
import React from 'react';
import Avatar from './Avatar';
import ReturnChart from './ReturnChart';

export default function DetailScreen({ member, onBack }) {
  const isUp = member.pct !== null && member.pct >= 0;
  const pctColor = member.pct === null ? '#555' : (isUp ? '#1D9E75' : '#E24B4A');
  const pctText = member.pct === null ? '–' : (isUp ? '+' : '') + member.pct + '%';
  const wpBg = member.pct === null ? '#222' : (isUp ? '#0a2a18' : '#2a0a0a');

  return (
    <div style={styles.wrap}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" />
          자산현황
        </button>
        <span style={styles.headerTitle}>{member.name}</span>
        <button style={styles.lockBtn} onClick={onBack} title="잠금">
          <i className="ti ti-lock" style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div style={styles.scroll}>
        <div style={styles.scrollContent}>
          {/* 프로필 카드 */}
          <div style={styles.profileCard}>
            <div style={{ ...styles.avatarRing, borderColor: member.ringColor }}>
              <Avatar id={member.id} size={52} />
            </div>
            <div>
              <div style={styles.name}>{member.name}</div>
              <div style={{ ...styles.role, color: member.color }}>{member.role}</div>
              <div style={styles.weekRow}>
                <span style={styles.weekLabel}>이번 주 수익</span>
                <span style={{ ...styles.weekMoney, color: pctColor }}>{member.weekMoney}</span>
                <span style={{ ...styles.weekPct, background: wpBg, color: pctColor }}>
                  {pctText}
                </span>
              </div>
            </div>
          </div>

          {member.empty ? (
            <div style={styles.emptyCard}>
              <i className="ti ti-plant" style={{ fontSize: 36, color: '#3a3a45' }} />
              <div style={styles.emptyText}>아직 등록된 자산이 없어요</div>
              <div style={styles.emptySubText}>자산을 추가해 식목이의 첫 씨앗을 심어보세요</div>
            </div>
          ) : (
            <>
              {/* 자산 유형별 그리드 */}
              <div style={styles.typeGrid}>
                {member.assetTypes.map((t, i) => (
                  <div key={i} style={styles.typeCard}>
                    <div style={{ ...styles.typeIcon, background: t.bg }}>
                      <i className={`ti ${t.icon}`} style={{ color: t.ic, fontSize: 15 }} />
                    </div>
                    <div style={styles.typeLabel}>{t.label}</div>
                    <div style={styles.typeValue}>{t.value}</div>
                    <div style={{ ...styles.typeChange, color: t.up ? '#1D9E75' : '#E24B4A' }}>
                      {t.up ? '▲' : '▼'} {t.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* 수익률 차트 */}
              <ReturnChart chartData={member.chart} />

              {/* 보유 종목 */}
              <div style={styles.holdingsCard}>
                <div style={styles.holdingsHeader}>
                  <span style={styles.holdingsTitle}>보유 종목</span>
                  <span style={styles.holdingsCount}>{member.holdings.length}개 항목</span>
                </div>
                {member.holdings.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.holdingRow,
                      borderBottom: i < member.holdings.length - 1 ? '0.5px solid #151520' : 'none',
                    }}
                  >
                    <div style={{ ...styles.holdingIc, background: h.bg, color: h.ic }}>
                      {h.ini}
                    </div>
                    <div style={styles.holdingInfo}>
                      <div style={styles.holdingName}>{h.name}</div>
                      <div style={styles.holdingType}>{h.type}</div>
                      <div style={styles.barWrap}>
                        <div
                          style={{
                            ...styles.bar,
                            width: `${h.barPct}%`,
                            background: h.barColor,
                          }}
                        />
                      </div>
                    </div>
                    <div style={styles.holdingRight}>
                      <div style={styles.holdingValue}>{h.value}</div>
                      <div style={{ fontSize: 10, color: h.up ? '#1D9E75' : '#E24B4A', marginTop: 2 }}>
                        {h.up ? '▲' : '▼'} {h.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#0f1117',
    overflow: 'hidden',
  },
  header: {
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '0.5px solid #1e1e28',
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#7F77DD',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: '#fff',
  },
  lockBtn: {
    background: 'none',
    border: 'none',
    color: '#555',
    cursor: 'pointer',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    WebkitOverflowScrolling: 'touch',
  },
  scrollContent: {
    padding: '14px 14px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  profileCard: {
    background: '#181820',
    borderRadius: 14,
    padding: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: {
    borderRadius: '50%',
    padding: 3,
    border: '2px solid',
    flexShrink: 0,
  },
  name: { fontSize: 17, fontWeight: 500, color: '#fff' },
  role: { fontSize: 11, marginTop: 2 },
  weekRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 },
  weekLabel: { fontSize: 10, color: '#555' },
  weekMoney: { fontSize: 15, fontWeight: 500 },
  weekPct: { fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6 },
  emptyCard: {
    background: '#181820',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, color: '#555' },
  emptySubText: { fontSize: 12, color: '#3a3a45' },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  typeCard: {
    background: '#181820',
    borderRadius: 12,
    padding: '11px 12px',
  },
  typeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeLabel: { fontSize: 10, color: '#555', marginBottom: 3 },
  typeValue: { fontSize: 14, fontWeight: 500, color: '#fff' },
  typeChange: { fontSize: 11, marginTop: 3 },
  holdingsCard: {
    background: '#181820',
    borderRadius: 12,
    overflow: 'hidden',
  },
  holdingsHeader: {
    padding: '10px 14px',
    borderBottom: '0.5px solid #1e1e28',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingsTitle: { fontSize: 12, fontWeight: 500, color: '#ccc' },
  holdingsCount: { fontSize: 10, color: '#555' },
  holdingRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    gap: 10,
  },
  holdingIc: {
    width: 32,
    height: 32,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 500,
    flexShrink: 0,
  },
  holdingInfo: { flex: 1, minWidth: 0 },
  holdingName: { fontSize: 12, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  holdingType: { fontSize: 10, color: '#555', marginTop: 2 },
  barWrap: { height: 3, background: '#2a2a35', borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 2 },
  holdingRight: { textAlign: 'right', flexShrink: 0 },
  holdingValue: { fontSize: 12, fontWeight: 500, color: '#fff' },
};
