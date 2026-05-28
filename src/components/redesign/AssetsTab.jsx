"use client";

// ─────────────────────────────────────────────
//  AssetsTab.jsx  –  자산현황 탭 메인화면
// ─────────────────────────────────────────────
import React from 'react';
import Avatar from './Avatar';
import FamilyTree from './FamilyTree';
import { DAILY_WINNER } from '../../data/familyData';

export default function AssetsTab({ members, onNodeTap }) {
  const w = DAILY_WINNER;

  return (
    <div style={styles.wrap}>

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
  wrap: {
    padding: '12px 12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    flex: 1,
  },
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
};
