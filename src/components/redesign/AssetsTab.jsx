"use client";

// ─────────────────────────────────────────────
//  AssetsTab.jsx  –  자산현황 탭 메인화면
// ─────────────────────────────────────────────
import React from 'react';
import Avatar from './Avatar';
import FamilyTree from './FamilyTree';
import { DAILY_WINNER } from '../../data/familyData';

function getBestHolding(member) {
  if (!member.holdings || member.holdings.length === 0) return null;
  return member.holdings
    .filter(h => h.up)
    .reduce((best, h) => {
      if (!best) return h;
      return parseFloat(h.change) > parseFloat(best.change) ? h : best;
    }, null);
}

export default function AssetsTab({ members, onNodeTap }) {
  const w    = DAILY_WINNER;
  const best = getBestHolding(w);

  return (
    <div className="tab-wrap">

      {/* 오늘의 1위 카드 */}
      <div style={styles.winnerCard}>
        <div style={styles.winnerHeader}>
          <span style={styles.winnerLabel}>
            <i className="ti ti-trophy" style={{ fontSize: 11, color: '#EF9F27', marginRight: 4 }} />
            오늘의 수익률 1위
          </span>
          <span style={styles.winnerDate}>05.28 데일리</span>
        </div>

        <div style={styles.winnerBody}>
          <div style={styles.winnerAvatarWrap}>
            <Avatar id={w.id} size={54} />
            <span style={styles.crown}>👑</span>
          </div>

          <div style={styles.winnerInfo}>
            <div style={styles.winnerName}>{w.name}</div>
            <div style={styles.winnerRole}>{w.role} · 오늘 수익률</div>
            <div style={styles.winnerPct}>+{w.pct}%</div>
          </div>

          <svg viewBox="0 0 70 36" width={70} height={36}>
            <polyline
              points="0,30 10,26 20,20 30,15 40,10 55,6 70,3"
              fill="none"
              stroke="#1D9E75"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="70" cy="3" r="3" fill="#1D9E75" />
          </svg>
        </div>

        {/* 베스트 종목 한 줄 */}
        {best && (
          <div style={styles.bestRow}>
            <span style={styles.bestMedal}>🏅</span>
            <span style={styles.bestText}>
              <span style={{ color: '#ccc' }}>{w.name}님의&nbsp;</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{best.name}&nbsp;</span>
              <span style={{ color: '#777' }}>이 가장 성과가 좋아요!</span>
              <span style={{ color: '#1D9E75', fontWeight: 500 }}>&nbsp;{best.change}</span>
            </span>
          </div>
        )}
      </div>

      {/* 안내 문구 */}
      <div style={styles.treeLabel}>
        패밀리 트리맵 — 탭 후 비밀번호로 열람
      </div>

      {/* 패밀리 트리맵 */}
      <FamilyTree members={members} onTap={onNodeTap} />

      <div style={{ height: 20 }} />
    </div>
  );
}

const styles = {
  winnerCard: {
    background: '#181820',
    borderRadius: 14,
    padding: 14,
  },
  winnerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  winnerLabel: {
    fontSize: 10,
    color: '#555',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
  },
  winnerDate: {
    fontSize: 10,
    color: '#444',
  },
  winnerBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  winnerAvatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  crown: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 16,
    lineHeight: 1,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: 500,
    color: '#fff',
  },
  winnerRole: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  winnerPct: {
    fontSize: 22,
    fontWeight: 500,
    color: '#1D9E75',
    marginTop: 4,
  },
  treeLabel: {
    fontSize: 9,
    color: '#444',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    paddingLeft: 2,
  },
  bestRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '0.5px solid #1e1e28',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  bestMedal: { fontSize: 14, flexShrink: 0 },
  bestText:  { fontSize: 11, lineHeight: 1.5 },
};
