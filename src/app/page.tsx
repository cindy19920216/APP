"use client";

import React, { useState } from 'react';
import { FAMILY_MEMBERS } from '@/data/familyData';
import PinScreen from '@/components/redesign/PinScreen';
import DetailScreen from '@/components/redesign/DetailScreen';
import MarketTab from '@/components/redesign/MarketTab';
import PortfolioTab from '@/components/redesign/PortfolioTab';
import CompanyTab from '@/components/redesign/CompanyTab';
import ScreenerScreen from '@/components/redesign/ScreenerScreen';
import IndicatorGuideScreen from '@/components/redesign/IndicatorGuideScreen';
import ComingSoonScreen from '@/components/redesign/ComingSoonScreen';
import DesktopShell from '@/components/redesign/DesktopShell';
import useIsDesktop from '@/hooks/useIsDesktop';
// 자산현황 탭(AssetsTab)은 잠시 빼둠 — 나중에 다시 쓸 수 있어서 파일은 그대로 둠.
// import AssetsTab from '@/components/redesign/AssetsTab';

// 큰 틀: 공부하기(학습 콘텐츠) / 투자하기(지금까지 만든 실전 탭들) 2단 구조.
const SECTIONS = [
  {
    key: 'learn', label: '공부하기', icon: 'ti-book-2',
    tabs: [
      { key: 'econ-idea',      label: 'Econ Idea',      icon: 'ti-world' },
      { key: 'technical-idea', label: 'Technical Idea', icon: 'ti-chart-candle' },
      { key: 'stock-idea',     label: 'Stock Idea',     icon: 'ti-bulb' },
    ],
  },
  {
    key: 'invest', label: '투자하기', icon: 'ti-rocket',
    tabs: [
      { key: 'market',     label: '시장지표' ,    icon: 'ti-chart-line' },
      { key: 'technical',  label: '기술적 지표', icon: 'ti-list-search' },
      { key: 'portfolio',  label: '포트폴리오',   icon: 'ti-briefcase' },
      { key: 'company',    label: '기업분석',     icon: 'ti-building-skyscraper' },
    ],
  },
];

function sectionOf(tabKey: string) {
  return SECTIONS.find(s => s.tabs.some(t => t.key === tabKey))?.key ?? 'invest';
}

type Phase = 0 | 1 | 2; // 0=스플래시, 1=퇴장중, 2=메인

// ─── 나무 일러스트 SVG ─────────────────────────────────────────────
function TreeIllustration() {
  return (
    <svg width="210" height="215" viewBox="0 0 210 215" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 그림자 */}
      <ellipse cx="105" cy="205" rx="52" ry="9" fill="#060610" opacity="0.5"/>

      {/* 뿌리 */}
      <path d="M 92 198 Q 76 201 62 198" stroke="#3d2812" strokeWidth="5" strokeLinecap="round"/>
      <path d="M 118 198 Q 134 201 148 198" stroke="#3d2812" strokeWidth="5" strokeLinecap="round"/>

      {/* 줄기 */}
      <path d="M 93 198 C 91 182 89 164 90 148 C 91 132 94 122 105 118 C 116 114 119 126 119 142 C 119 158 117 176 116 196" fill="#3d2812"/>
      {/* 줄기 결 */}
      <path d="M 97 182 Q 100 174 97 166" stroke="#5a3a20" strokeWidth="1.2" opacity="0.4" fill="none"/>
      <path d="M 107 185 Q 110 177 107 169" stroke="#5a3a20" strokeWidth="1.2" opacity="0.4" fill="none"/>

      {/* 가지 - 왼쪽 하단 */}
      <path d="M 92 162 Q 68 154 46 142" stroke="#3d2812" strokeWidth="8" strokeLinecap="round"/>
      {/* 가지 - 오른쪽 하단 */}
      <path d="M 118 160 Q 142 152 164 140" stroke="#3d2812" strokeWidth="8" strokeLinecap="round"/>
      {/* 가지 - 왼쪽 상단 */}
      <path d="M 93 142 Q 68 132 48 118" stroke="#3d2812" strokeWidth="6" strokeLinecap="round"/>
      {/* 가지 - 오른쪽 상단 */}
      <path d="M 117 140 Q 142 130 162 116" stroke="#3d2812" strokeWidth="6" strokeLinecap="round"/>
      {/* 가지 - 중앙 상단 */}
      <path d="M 105 130 L 105 90" stroke="#3d2812" strokeWidth="6" strokeLinecap="round"/>

      {/* 잎사귀 - 어두운 배경 레이어 */}
      <circle cx="44" cy="120" r="34" fill="#0b4430"/>
      <circle cx="166" cy="120" r="34" fill="#0b4430"/>
      <circle cx="105" cy="72" r="42" fill="#0b4430"/>

      {/* 잎사귀 - 중간 레이어 */}
      <circle cx="42" cy="114" r="29" fill="#166647"/>
      <circle cx="168" cy="114" r="29" fill="#166647"/>
      <circle cx="103" cy="66" r="36" fill="#166647"/>

      {/* 잎사귀 - 밝은 앞쪽 레이어 */}
      <circle cx="38" cy="108" r="23" fill="#1D9E75"/>
      <circle cx="164" cy="108" r="23" fill="#1D9E75"/>
      <circle cx="99"  cy="60" r="30" fill="#1D9E75"/>
      <circle cx="114" cy="63" r="24" fill="#22a87e"/>

      {/* 잎사귀 - 하이라이트 */}
      <circle cx="95"  cy="52" r="20" fill="#28B888"/>
      <circle cx="112" cy="56" r="16" fill="#2EC496"/>

      {/* 꽃/열매 장식 */}
      <circle cx="20"  cy="108" r="5.5" fill="#EF9F27"/>
      <circle cx="20"  cy="108" r="2.8" fill="#FAC775"/>
      <circle cx="190" cy="108" r="5.5" fill="#7F77DD"/>
      <circle cx="190" cy="108" r="2.8" fill="#BAB5F8"/>
      <circle cx="105" cy="28"  r="4.5" fill="#EF9F27"/>
      <circle cx="105" cy="28"  r="2.2" fill="#FAC775"/>
      <circle cx="72"  cy="58"  r="4"   fill="#E24B4A" opacity="0.85"/>
      <circle cx="72"  cy="58"  r="2"   fill="#FFA0A0" opacity="0.85"/>
      <circle cx="136" cy="54"  r="4"   fill="#E24B4A" opacity="0.85"/>
      <circle cx="136" cy="54"  r="2"   fill="#FFA0A0" opacity="0.85"/>

      {/* 반짝이 애니메이션 */}
      <circle cx="178" cy="125" r="2.5" fill="#EF9F27">
        <animate attributeName="opacity" values="0.9;0;0.9"   dur="2.2s"              repeatCount="indefinite"/>
        <animate attributeName="r"       values="2.5;4;2.5"   dur="2.2s"              repeatCount="indefinite"/>
      </circle>
      <circle cx="32"  cy="120" r="2"   fill="#7F77DD">
        <animate attributeName="opacity" values="0.7;0;0.7"   dur="1.8s" begin="0.7s" repeatCount="indefinite"/>
        <animate attributeName="r"       values="2;3.2;2"     dur="1.8s" begin="0.7s" repeatCount="indefinite"/>
      </circle>
      <circle cx="110" cy="12"  r="2"   fill="#5DCAA5">
        <animate attributeName="opacity" values="0.6;0;0.6"   dur="2.5s" begin="0.3s" repeatCount="indefinite"/>
        <animate attributeName="r"       values="2;3;2"       dur="2.5s" begin="0.3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="56"  cy="100" r="1.5" fill="#FAC775">
        <animate attributeName="opacity" values="0.5;0;0.5"   dur="3s"   begin="1s"   repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

export default function App() {
  const isDesktop = useIsDesktop();
  const [phase, setPhase]               = useState<Phase>(0);
  const [activeSection, setActiveSection] = useState('invest');
  const [activeTab, setActiveTab]       = useState('market');
  const [screen, setScreen]             = useState('main');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  // 탭을 다시 누를 때 컴포넌트를 리셋하기 위한 버전 카운터
  const [tabKeys, setTabKeys] = useState<Record<string, number>>({
    'econ-idea': 0, 'technical-idea': 0, 'stock-idea': 0,
    market: 0, technical: 0, portfolio: 0, company: 0,
  });

  const handleEnter = () => {
    setPhase(1);
    setTimeout(() => setPhase(2), 520);
  };

  const handleNodeTap    = (member: any) => { setSelectedMember(member); setScreen('pin'); };
  const handlePinSuccess = ()            => { setScreen('detail'); };
  const handleBack       = ()            => { setScreen('main'); setSelectedMember(null); };
  const handleTabChange  = (key: string) => {
    // 같은 탭을 다시 누르면 key 증가 → 컴포넌트 리마운트 → 내부 상태 초기화
    setTabKeys(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
    setActiveTab(key);
    setActiveSection(sectionOf(key));
    setScreen('main');
    setSelectedMember(null);
  };
  const handleSectionChange = (sectionKey: string) => {
    const section = SECTIONS.find(s => s.key === sectionKey);
    if (section) handleTabChange(section.tabs[0].key);
  };

  const renderContent = () => {
    if (screen === 'pin' && selectedMember)
      return <PinScreen member={selectedMember} onSuccess={handlePinSuccess} onBack={handleBack} />;
    if (screen === 'detail' && selectedMember)
      return <DetailScreen member={selectedMember} onBack={handleBack} />;
    switch (activeTab) {
      case 'econ-idea':      return <ComingSoonScreen key={`econ-idea-${tabKeys['econ-idea']}`} icon="ti-world" title="Econ Idea" subtitle="거시경제 지표와 JS Economic Cycle Index를 이해하기 쉽게 풀어드릴 예정이에요." points={['금리·물가·고용 같은 거시 지표가 시장에 미치는 영향', 'JS Economic Cycle Index 7개 구성 지표 해설', '경기 사이클 국면별 투자 전략']} />;
      case 'technical-idea': return <IndicatorGuideScreen key={`technical-idea-${tabKeys['technical-idea']}`} />;
      case 'stock-idea':     return <ComingSoonScreen key={`stock-idea-${tabKeys['stock-idea']}`} icon="ti-bulb" title="Stock Idea" subtitle="기업분석 탭의 숫자들을 어떻게 읽어야 하는지, 종목을 고르는 관점을 다룰 예정이에요." points={['PER·PBR·ROE 등 기본 밸류에이션 지표 해설', '재무제표 핵심만 빠르게 읽는 법', '좋은 기업을 고르는 체크리스트']} />;
      case 'technical': return <ScreenerScreen key={`technical-${tabKeys.technical}`} />;
      case 'portfolio': return <PortfolioTab key={`portfolio-${tabKeys.portfolio}`} />;
      case 'market':    return <MarketTab    key={`market-${tabKeys.market}`}       />;
      case 'company':   return <CompanyTab   key={`company-${tabKeys.company}`}     />;
      default:          return null;
    }
  };

  // ── 데스크톱 웹 대시보드 (스플래시 없이 바로 진입) ──────────────────
  if (isDesktop) {
    return (
      <DesktopShell sections={SECTIONS} activeTab={activeTab} onTabChange={handleTabChange}>
        {renderContent()}
      </DesktopShell>
    );
  }

  // ── 스플래시 ───────────────────────────────────────────────────────
  if (phase < 2) {
    return (
      <div className={`phone-frame ${phase === 1 ? 'splash-exit' : ''}`}>
        {/* 완전한 가운데 정렬 컨테이너 */}
        <div style={S.splashInner}>

          {/* 나무 일러스트 + 타이틀 */}
          <div style={S.logoBox}>
            <TreeIllustration />
            <div style={S.splashTitle}>Herencia</div>
            <div style={S.splashSub}>가족의 자산, 하나의 미래</div>
          </div>

          {/* 입장하기 버튼 */}
          {phase === 0 && (
            <button className="enter-btn" style={S.enterBtn} onClick={handleEnter}>
              입장하기&nbsp;&nbsp;→
            </button>
          )}

          {/* 하단 카피라이트 */}
          <div style={S.splashFooter}>© 2026 Herencia Inc.</div>
        </div>
      </div>
    );
  }

  // ── 메인 앱 ────────────────────────────────────────────────────────
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
        <>
          <div className="section-bar">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                className={`section-btn ${activeSection === s.key ? 'active' : ''}`}
                onClick={() => handleSectionChange(s.key)}
              >
                <i className={`ti ${s.icon}`} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="tab-bar">
            {SECTIONS.find(s => s.key === activeSection)!.tabs.map((t) => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => handleTabChange(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="content-area">
        {renderContent()}
      </div>
    </div>
  );
}

const S = {
  // 스플래시 내부 컨테이너: phone-frame 안에서 flex 1 차지
  splashInner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    gap: 0,
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '4px',
    marginTop: 4,
  },
  splashSub: {
    fontSize: 13,
    color: '#555',
    letterSpacing: '0.5px',
  },
  enterBtn: {
    marginTop: 36,
    background: 'linear-gradient(135deg, #4a41a8 0%, #7F77DD 100%)',
    border: 'none',
    borderRadius: 16,
    padding: '15px 52px',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '1.5px',
  },
  splashFooter: {
    position: 'absolute' as const,
    bottom: 22,
    fontSize: 10,
    color: '#282838',
  },
};
