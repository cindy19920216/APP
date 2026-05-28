"use client";

// ─────────────────────────────────────────────
//  PlaceholderTab.jsx  –  미구현 탭 플레이스홀더
// ─────────────────────────────────────────────
import React from 'react';

const TAB_INFO = {
  portfolio: {
    icon: 'ti-chart-pie',
    title: '포트폴리오',
    desc: '가족 전체 포트폴리오 분석\n및 리밸런싱 제안',
    color: '#1D9E75',
  },
  market: {
    icon: 'ti-activity',
    title: '시장지표',
    desc: '패닉-붐 지수 / KOSPI·코스닥\n환율 · 원자재',
    color: '#EF9F27',
  },
  inheritance: {
    icon: 'ti-git-branch',
    title: '상속플래너',
    desc: '증여·상속 시뮬레이션\n세금 최적화 가이드',
    color: '#534AB7',
  },
};

export default function PlaceholderTab({ tabKey }) {
  const info = TAB_INFO[tabKey] || TAB_INFO.portfolio;

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <i
          className={`ti ${info.icon}`}
          style={{ fontSize: 40, color: info.color, marginBottom: 16 }}
        />
        <div style={styles.title}>{info.title}</div>
        <div style={styles.desc}>{info.desc}</div>
        <div style={styles.badge}>준비 중</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#181820',
    borderRadius: 16,
    padding: '32px 24px',
    textAlign: 'center',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 500,
    color: '#fff',
    marginBottom: 10,
  },
  desc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 1.7,
    whiteSpace: 'pre-line',
    marginBottom: 20,
  },
  badge: {
    fontSize: 11,
    padding: '4px 14px',
    borderRadius: 20,
    background: '#222230',
    color: '#555',
    border: '0.5px solid #2a2a35',
  },
};
