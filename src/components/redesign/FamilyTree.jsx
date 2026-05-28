"use client";

// ─────────────────────────────────────────────
//  FamilyTree.jsx  –  패밀리 트리맵
// ─────────────────────────────────────────────
import React from 'react';
import Avatar from './Avatar';

function PersonNode({ member, onTap }) {
  return (
    <div onClick={() => onTap(member)} style={styles.node}>
      <div style={{ ...styles.ring, borderColor: member.ringColor }}>
        <Avatar id={member.id} size={member.generation === 1 ? 46 : 38} />
      </div>
      <div style={styles.nodeName}>{member.name}</div>
      <div style={styles.lockIcon}>
        <i className="ti ti-lock" style={{ fontSize: 9, color: '#444' }} />
      </div>
    </div>
  );
}

function HeartSep() {
  return (
    <div style={styles.heartWrap}>
      <svg width="14" height="12" viewBox="0 0 14 12">
        <path d="M7 6 L1 2 L3.5 6 L1 10Z" fill="#2a3a35" />
        <path d="M7 6 L13 2 L10.5 6 L13 10Z" fill="#2a3a35" />
        <circle cx="7" cy="6" r="2.2" fill="#1a2820" />
      </svg>
    </div>
  );
}

export default function FamilyTree({ members, onTap }) {
  const gp = members.grandpa;
  const gm = members.grandma;
  const d1 = members.daughter1;
  const sl1 = members.soninlaw1;
  const d2 = members.daughter2;
  const sl2 = members.soninlaw2;
  const son = members.son;
  const baby = members.baby;

  return (
    <div style={styles.treeWrap}>

      {/* 1세대 */}
      <div style={styles.genLabel}>1세대</div>
      <div style={styles.gen1Row}>
        <PersonNode member={gp} onTap={onTap} />
        <div style={styles.coupleSep}>
          <svg width="22" height="14" viewBox="0 0 22 14">
            <path d="M11 7 L2 3 L5 7 L2 11Z" fill="#2a2a3a" />
            <path d="M11 7 L20 3 L17 7 L20 11Z" fill="#2a2a3a" />
            <circle cx="11" cy="7" r="2.5" fill="#3a3050" />
          </svg>
        </div>
        <PersonNode member={gm} onTap={onTap} />
      </div>

      {/* 1→2세대 연결선 */}
      <svg width="100%" height="20" viewBox="0 0 300 20" preserveAspectRatio="none">
        <line x1="150" y1="0" x2="150" y2="9" stroke="#2a2a3a" strokeWidth="1.5" />
        <line x1="46" y1="9" x2="254" y2="9" stroke="#2a2a3a" strokeWidth="1.5" />
        <line x1="46" y1="9" x2="46" y2="20" stroke="#2a2a3a" strokeWidth="1.5" />
        <line x1="150" y1="9" x2="150" y2="20" stroke="#2a2a3a" strokeWidth="1.5" />
        <line x1="254" y1="9" x2="254" y2="20" stroke="#2a2a3a" strokeWidth="1.5" />
      </svg>

      {/* 2세대 */}
      <div style={styles.genLabel}>2세대</div>
      <div style={styles.gen2Row}>

        {/* 큰딸 부부 */}
        <div style={styles.coupleGroup}>
          <div style={styles.coupleRow}>
            <PersonNode member={d1} onTap={onTap} />
            <HeartSep />
            <PersonNode member={sl1} onTap={onTap} />
          </div>
          {/* 3세대 연결선 */}
          <svg width="100%" height="16" viewBox="0 0 80 16">
            <line x1="40" y1="0" x2="40" y2="16" stroke="#2a2a3a" strokeWidth="1.5" />
          </svg>
        </div>

        {/* 작은딸 부부 */}
        <div style={styles.coupleGroup}>
          <div style={styles.coupleRow}>
            <PersonNode member={d2} onTap={onTap} />
            <HeartSep />
            <PersonNode member={sl2} onTap={onTap} />
          </div>
          <div style={{ height: 16 }} />
        </div>

        {/* 아들 */}
        <div style={styles.coupleGroup}>
          <PersonNode member={son} onTap={onTap} />
          <div style={{ height: 16 }} />
        </div>
      </div>

      {/* 3세대 */}
      <div style={styles.genLabel}>3세대</div>
      <div style={styles.gen3Row}>
        <PersonNode member={baby} onTap={onTap} />
      </div>

    </div>
  );
}

const styles = {
  treeWrap: {
    background: '#181820',
    borderRadius: 12,
    padding: '8px 8px 6px',
  },
  genLabel: {
    fontSize: 9,
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: '0.5px',
  },
  gen1Row: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  coupleSep: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: 22,
  },
  gen2Row: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    padding: '0 2px 4px',
    scrollbarWidth: 'none',
  },
  coupleGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  coupleRow: {
    display: 'flex',
    gap: 4,
    alignItems: 'flex-start',
  },
  heartWrap: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: 20,
  },
  gen3Row: {
    display: 'flex',
    paddingLeft: 8,
    marginBottom: 4,
  },
  node: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.15s',
  },
  ring: {
    borderRadius: '50%',
    padding: 3,
    border: '2px solid',
    transition: 'transform 0.2s',
  },
  nodeName: {
    fontSize: 9,
    fontWeight: 500,
    color: '#ccc',
    marginTop: 4,
    whiteSpace: 'nowrap',
  },
  lockIcon: {
    marginTop: 1,
    textAlign: 'center',
  },
};
