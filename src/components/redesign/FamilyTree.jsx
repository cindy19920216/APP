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
        <Avatar id={member.id} size={member.generation === 1 ? 38 : 32} />
      </div>
      <div style={styles.nodeName}>{member.name}</div>
      <div style={styles.lockIcon}>
        <i className="ti ti-lock" style={{ fontSize: 8, color: '#444' }} />
      </div>
    </div>
  );
}

function HeartSep() {
  return (
    <div style={styles.heartWrap}>
      <i className="ti ti-heart-filled" style={{ fontSize: 10, color: '#E24B4A' }} />
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
        <HeartSep />
        <PersonNode member={gm} onTap={onTap} />
      </div>

      {/* 1→2세대 연결선 */}
      <svg width="100%" height="16" viewBox="0 0 300 16" preserveAspectRatio="none">
        <line x1="150" y1="0" x2="150" y2="8" stroke="#2a2a3a" strokeWidth="1.2" />
        <line x1="50" y1="8" x2="250" y2="8" stroke="#2a2a3a" strokeWidth="1.2" />
        <line x1="50" y1="8" x2="50" y2="16" stroke="#2a2a3a" strokeWidth="1.2" />
        <line x1="150" y1="8" x2="150" y2="16" stroke="#2a2a3a" strokeWidth="1.2" />
        <line x1="250" y1="8" x2="250" y2="16" stroke="#2a2a3a" strokeWidth="1.2" />
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
          <svg width="100%" height="12" viewBox="0 0 80 12">
            <line x1="40" y1="0" x2="40" y2="8" stroke="#2a2a3a" strokeWidth="1.2" />
          </svg>
          {/* 3세대 (식목이) */}
          <div style={styles.gen3CenterRow}>
            <PersonNode member={baby} onTap={onTap} />
          </div>
        </div>

        {/* 작은딸 부부 */}
        <div style={styles.coupleGroup}>
          <div style={styles.coupleRow}>
            <PersonNode member={d2} onTap={onTap} />
            <HeartSep />
            <PersonNode member={sl2} onTap={onTap} />
          </div>
        </div>

        {/* 아들 */}
        <div style={styles.coupleGroup}>
          <PersonNode member={son} onTap={onTap} />
        </div>
      </div>

    </div>
  );
}

const styles = {
  treeWrap: {
    background: '#181820',
    borderRadius: 12,
    padding: '10px 6px',
  },
  genLabel: {
    fontSize: 8,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: '0.5px',
  },
  gen1Row: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 2,
    alignItems: 'center',
  },
  gen2Row: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    padding: '0 2px 4px',
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
    alignItems: 'center',
  },
  heartWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  gen3CenterRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: -2,
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
    padding: 2.5,
    border: '1.5px solid',
  },
  nodeName: {
    fontSize: 8,
    fontWeight: 500,
    color: '#ccc',
    marginTop: 3,
    whiteSpace: 'nowrap',
  },
  lockIcon: {
    marginTop: 0,
    textAlign: 'center',
  },
};
