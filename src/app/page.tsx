"use client";

import React, { useState } from 'react';
import { FAMILY_MEMBERS } from '@/data/familyData';
import AssetsTab from '@/components/redesign/AssetsTab';
import PinScreen from '@/components/redesign/PinScreen';
import DetailScreen from '@/components/redesign/DetailScreen';
import PlaceholderTab from '@/components/redesign/PlaceholderTab';
import MarketTab from '@/components/redesign/MarketTab';
import PortfolioTab from '@/components/redesign/PortfolioTab';
import CompanyTab from '@/components/redesign/CompanyTab';

const TABS = [
  { key: 'market',      label: '시장지표' },
  { key: 'assets',      label: '자산현황' },
  { key: 'portfolio',   label: '포트폴리오' },
  { key: 'company',     label: '기업분석' },
];

// 0 = 스플래시 표시 중, 1 = 스플래시 퇴장 중, 2 = 메인 표시
type Phase = 0 | 1 | 2;

export default function App() {
  const [phase, setPhase] = useState<Phase>(0);
  const [activeTab, setActiveTab] = useState('market');
  const [screen, setScreen] = useState('main');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2200); // 퇴장 애니메이션 시작
    const t2 = setTimeout(() => setPhase(2), 2750); // 메인 표시
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleNodeTap = (member: any) => { setSelectedMember(member); setScreen('pin'); };
  const handlePinSuccess = () => { setScreen('detail'); };
  const handleBack = () => { setScreen('main'); setSelectedMember(null); };
  const handleTabChange = (key: string) => { setActiveTab(key); setScreen('main'); setSelectedMember(null); };

  const renderContent = () => {
    if (screen === 'pin' && selectedMember)
      return <PinScreen member={selectedMember} onSuccess={handlePinSuccess} onBack={handleBack} />;
    if (screen === 'detail' && selectedMember)
      return <DetailScreen member={selectedMember} onBack={handleBack} />;
    switch (activeTab) {
      case 'assets':      return <AssetsTab members={FAMILY_MEMBERS} onNodeTap={handleNodeTap} />;
      case 'portfolio':   return <PortfolioTab />;
      case 'market':      return <MarketTab />;
      case 'company':     return <CompanyTab />;
      default:            return null;
    }
  };

  // ── 스플래시 ────────────────────────────────
  if (phase < 2) {
    return (
      <div className={`phone-frame ${phase === 1 ? 'splash-exit' : ''}`} style={S.splash}>
        <div style={S.logoBox}>
          {/* 이모지 가족 나무 */}
          <div style={S.emojiTree}>
            {/* 나무 */}
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 8 }}>🌳</div>

            {/* 1세대 */}
            <div style={S.treeRow}>
              <span style={S.e1}>👴</span>
              <span style={S.eHeart}>💕</span>
              <span style={S.e1}>👵</span>
            </div>
            <div style={S.genLabel}>이찬희 · 전지우</div>

            {/* 연결선 */}
            <div style={S.stemLine} />

            {/* 2세대 */}
            <div style={S.treeRow}>
              <div style={S.eCouple}>
                <span style={S.e2}>👩</span><span style={S.eHeart}>💕</span><span style={S.e2}>👨</span>
              </div>
              <div style={S.eCouple}>
                <span style={S.e2}>👩</span><span style={S.eHeart}>💕</span><span style={S.e2}>👨</span>
              </div>
              <span style={S.e2}>🧑</span>
            </div>

            {/* 3세대 */}
            <div style={{ ...S.treeRow, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#3a3a55', marginRight: 2 }}>└</span>
              <span style={S.e3}>👶</span>
              <span style={{ fontSize: 10, color: '#555', marginLeft: 4 }}>식목이</span>
            </div>
          </div>

          <div style={S.splashTitle}>Herencia</div>
          <div style={S.splashSub}>가족의 자산, 하나의 미래</div>
        </div>
        <div style={S.splashFooter}>© 2026 Herencia Inc.</div>
      </div>
    );
  }

  // ── 메인 앱 ─────────────────────────────────
  const isOverlay = screen !== 'main';

  return (
    <div className="phone-frame main-enter">
      <div className="app-header">
        <span className="app-title">Herencia</span>
        <div className="live-badge">
          <span className="live-dot" />
          <span>실시간</span>
        </div>
      </div>

      {!isOverlay && (
        <div className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => handleTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="content-area">
        {renderContent()}
      </div>
    </div>
  );
}

const S = {
  splash: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
    height: '100%',
    position: 'relative' as const,
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 14,
  },
  splashTitle: {
    fontSize: 30,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '3px',
  },
  splashSub: {
    fontSize: 13,
    color: '#555',
    letterSpacing: '0.5px',
  },
  splashFooter: {
    position: 'absolute' as const,
    bottom: 24,
    fontSize: 10,
    color: '#2e2e3e',
  },

  // 이모지 트리
  emojiTree: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 },
  treeRow:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  e1:        { fontSize: 36 },
  e2:        { fontSize: 28 },
  e3:        { fontSize: 22 },
  eHeart:    { fontSize: 14 },
  eCouple:   { display: 'flex', alignItems: 'center', gap: 2 },
  genLabel:  { fontSize: 10, color: '#444' },
  stemLine:  { width: 1, height: 18, background: '#2e2e45', margin: '2px auto' },
};
