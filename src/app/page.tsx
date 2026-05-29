"use client";

import React, { useState } from 'react';
import { FAMILY_MEMBERS } from '@/data/familyData';
import AssetsTab from '@/components/redesign/AssetsTab';
import PinScreen from '@/components/redesign/PinScreen';
import DetailScreen from '@/components/redesign/DetailScreen';
import PlaceholderTab from '@/components/redesign/PlaceholderTab';
import MarketTab from '@/components/redesign/MarketTab';
import PortfolioTab from '@/components/redesign/PortfolioTab';

const TABS = [
  { key: 'market',      label: '시장지표' },
  { key: 'assets',      label: '자산현황' },
  { key: 'portfolio',   label: '포트폴리오' },
  { key: 'inheritance', label: '상속플래너' },
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
      case 'inheritance': return <PlaceholderTab tabKey="inheritance" />;
      default:            return null;
    }
  };

  // ── 스플래시 ────────────────────────────────
  if (phase < 2) {
    return (
      <div className={`phone-frame ${phase === 1 ? 'splash-exit' : ''}`} style={S.splash}>
        <div style={S.logoBox}>
          {/* 귀여운 가족 나무 */}
          <svg width="260" height="178" viewBox="0 0 260 178" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="rg-gp"  cx="38%" cy="32%"><stop offset="0%" stopColor="#BAB5F8"/><stop offset="100%" stopColor="#534AB7"/></radialGradient>
              <radialGradient id="rg-gm"  cx="38%" cy="32%"><stop offset="0%" stopColor="#F5A0BE"/><stop offset="100%" stopColor="#C44A7A"/></radialGradient>
              <radialGradient id="rg-d1"  cx="38%" cy="32%"><stop offset="0%" stopColor="#5DCAA5"/><stop offset="100%" stopColor="#0D7A5C"/></radialGradient>
              <radialGradient id="rg-sl1" cx="38%" cy="32%"><stop offset="0%" stopColor="#80C8FF"/><stop offset="100%" stopColor="#1A6EC2"/></radialGradient>
              <radialGradient id="rg-son" cx="38%" cy="32%"><stop offset="0%" stopColor="#6CB8FF"/><stop offset="100%" stopColor="#185FA5"/></radialGradient>
              <radialGradient id="rg-d2"  cx="38%" cy="32%"><stop offset="0%" stopColor="#FABD6A"/><stop offset="100%" stopColor="#C27500"/></radialGradient>
              <radialGradient id="rg-sl2" cx="38%" cy="32%"><stop offset="0%" stopColor="#B8D97A"/><stop offset="100%" stopColor="#4A7D15"/></radialGradient>
              <radialGradient id="rg-baby" cx="38%" cy="32%"><stop offset="0%" stopColor="#FFAAB3"/><stop offset="100%" stopColor="#B83050"/></radialGradient>
            </defs>

            {/* ── 가지 ── */}
            {/* 기둥 */}
            <line x1="130" y1="48" x2="130" y2="72" stroke="#2e2e45" strokeWidth="2.5" strokeLinecap="round"/>
            {/* 수평 */}
            <line x1="58"  y1="72" x2="202" y2="72" stroke="#2e2e45" strokeWidth="2"   strokeLinecap="round"/>
            {/* 하향 가지 3개 */}
            <line x1="58"  y1="72" x2="58"  y2="97" stroke="#2e2e45" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="130" y1="72" x2="130" y2="97" stroke="#2e2e45" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="202" y1="72" x2="202" y2="97" stroke="#2e2e45" strokeWidth="1.8" strokeLinecap="round"/>
            {/* 식목이 점선 가지 */}
            <line x1="58" y1="119" x2="58" y2="143" stroke="#2e2e4580" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2.5"/>

            {/* ── 분기점 장식 dot ── */}
            <circle cx="58"  cy="72" r="3" fill="#3a3a55"/>
            <circle cx="130" cy="72" r="3" fill="#3a3a55"/>
            <circle cx="202" cy="72" r="3" fill="#3a3a55"/>

            {/* ── 1세대: 할아버지 ❤ 할머니 ── */}
            <circle cx="112" cy="34" r="16" fill="#534AB720"/>
            <circle cx="148" cy="34" r="16" fill="#C44A7A20"/>
            <circle cx="112" cy="34" r="13" fill="url(#rg-gp)"/>
            <circle cx="148" cy="34" r="13" fill="url(#rg-gm)"/>
            <text x="130" y="27" textAnchor="middle" fontSize="11" fill="#E24B4A">♥</text>
            {/* 박동 글로우 */}
            <circle cx="112" cy="34" r="13" fill="none" stroke="#9494EE" strokeWidth="1.5">
              <animate attributeName="r"       values="13;20;13" dur="3s"   repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0;0.5" dur="3s"   repeatCount="indefinite"/>
            </circle>
            <text x="112" y="53" textAnchor="middle" fontSize="7.5" fill="#555">할아버지</text>
            <text x="148" y="53" textAnchor="middle" fontSize="7.5" fill="#555">할머니</text>

            {/* ── 2세대: 큰딸 커플 ── */}
            <circle cx="45"  cy="108" r="11" fill="url(#rg-d1)"/>
            <circle cx="71"  cy="108" r="11" fill="url(#rg-sl1)"/>
            <text x="58" y="101" textAnchor="middle" fontSize="9" fill="#E24B4A">♥</text>
            <text x="45"  y="125" textAnchor="middle" fontSize="7" fill="#555">큰딸</text>
            <text x="71"  y="125" textAnchor="middle" fontSize="7" fill="#555">사위</text>

            {/* ── 2세대: 아들 ── */}
            <circle cx="130" cy="108" r="11" fill="url(#rg-son)"/>
            <text x="130" y="125" textAnchor="middle" fontSize="7" fill="#555">아들</text>

            {/* ── 2세대: 작은딸 커플 ── */}
            <circle cx="189" cy="108" r="11" fill="url(#rg-d2)"/>
            <circle cx="215" cy="108" r="11" fill="url(#rg-sl2)"/>
            <text x="202" y="101" textAnchor="middle" fontSize="9" fill="#E24B4A">♥</text>
            <text x="189" y="125" textAnchor="middle" fontSize="7" fill="#555">작은딸</text>
            <text x="215" y="125" textAnchor="middle" fontSize="7" fill="#555">사위</text>

            {/* ── 3세대: 식목이 ── */}
            <circle cx="58" cy="153" r="9" fill="url(#rg-baby)"/>
            <text x="58" y="168" textAnchor="middle" fontSize="7" fill="#555">식목이</text>
            {/* 식목이 반짝이 */}
            <circle cx="72" cy="145" r="2.5" fill="#FFAAB3">
              <animate attributeName="opacity" values="1;0;1"     dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="r"       values="2.5;4;2.5" dur="1.5s" repeatCount="indefinite"/>
            </circle>

            {/* ── 떠다니는 반짝이들 ── */}
            <circle cx="174" cy="50" r="2.2" fill="#EF9F27">
              <animate attributeName="opacity" values="0.9;0;0.9" dur="2.2s"              repeatCount="indefinite"/>
              <animate attributeName="r"       values="2.2;3.8;2.2" dur="2.2s"            repeatCount="indefinite"/>
            </circle>
            <circle cx="38" cy="85" r="1.8" fill="#7F77DD">
              <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" begin="0.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="225" cy="80" r="2"   fill="#5DCAA5">
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" begin="1s"   repeatCount="indefinite"/>
              <animate attributeName="r"       values="2;3.2;2"   dur="2.5s" begin="1s"   repeatCount="indefinite"/>
            </circle>
            <circle cx="100" cy="140" r="1.6" fill="#EF9F27">
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2s"   begin="0.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="155" cy="130" r="1.5" fill="#F5A0BE">
              <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" begin="0.3s" repeatCount="indefinite"/>
            </circle>
          </svg>

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
};
