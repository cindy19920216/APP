"use client";

// ─────────────────────────────────────────────
//  PinScreen.jsx  –  4자리 비밀번호 입력
// ─────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import Avatar from './Avatar';

export default function PinScreen({ member, onSuccess, onBack }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleKey = useCallback(
    (k) => {
      if (input.length >= 4) return;
      const next = input + k;
      setInput(next);
      setError('');

      if (next.length === 4) {
        setTimeout(() => {
          if (next === member.pin) {
            onSuccess(member);
          } else {
            setShake(true);
            setError('비밀번호가 맞지 않아요');
            setTimeout(() => {
              setInput('');
              setShake(false);
              setError('');
            }, 900);
          }
        }, 150);
      }
    },
    [input, member, onSuccess]
  );

  const handleDel = () => {
    setInput((p) => p.slice(0, -1));
    setError('');
  };

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div style={styles.wrap}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <i className="ti ti-chevron-left" />
          자산현황
        </button>
      </div>

      {/* 아바타 + 이름 */}
      <div style={styles.profile}>
        <div style={{ ...styles.avatarRing, borderColor: member.ringColor }}>
          <Avatar id={member.id} size={64} />
        </div>
        <div style={styles.name}>{member.name}</div>
        <div style={styles.hint}>4자리 비밀번호를 입력하세요</div>
      </div>

      {/* 도트 */}
      <div style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              background: i < input.length ? (shake ? '#E24B4A' : '#534AB7') : '#2a2a35',
              transform: i < input.length ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* 키패드 */}
      <div style={styles.keypad}>
        {keys.map((k, idx) => {
          if (k === '') return <div key={idx} />;
          if (k === 'del') return (
            <button key={idx} style={styles.key} onClick={handleDel}>
              <i className="ti ti-backspace" style={{ fontSize: 20 }} />
            </button>
          );
          return (
            <button key={idx} style={styles.key} onClick={() => handleKey(k)}>
              {k}
            </button>
          );
        })}
      </div>

      <div style={styles.errMsg}>{error}</div>
    </div>
  );
}

const styles = {
  wrap: {
    padding: '20px 20px 0',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f1117',
    minHeight: '100%',
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#7F77DD',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 0',
  },
  profile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  avatarRing: {
    borderRadius: '50%',
    padding: 3,
    border: '2px solid',
  },
  name: {
    fontSize: 17,
    fontWeight: 500,
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#555',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: '50%',
    transition: 'all 0.15s',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 0,
  },
  key: {
    background: '#181820',
    border: '0.5px solid #2a2a35',
    borderRadius: 14,
    padding: '14px 0',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: 20,
    fontWeight: 500,
    color: '#fff',
    userSelect: 'none',
    transition: 'background 0.12s',
  },
  errMsg: {
    textAlign: 'center',
    fontSize: 12,
    color: '#E24B4A',
    marginTop: 14,
    minHeight: 18,
  },
};
