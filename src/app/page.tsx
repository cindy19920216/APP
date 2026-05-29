"use client";

// ─────────────────────────────────────────────
//  page.tsx  –  메인 페이지 (Herencia 앱)
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import { FAMILY_MEMBERS } from '@/data/familyData';
import AssetsTab from '@/components/redesign/AssetsTab';
import PinScreen from '@/components/redesign/PinScreen';
import DetailScreen from '@/components/redesign/DetailScreen';
import PlaceholderTab from '@/components/redesign/PlaceholderTab';
import MarketTab from '@/components/redesign/MarketTab';

const TABS = [
  { key: 'market',      label: '시장지표' },
  { key: 'assets',      label: '자산현황' },
  { key: 'portfolio',   label: '포트폴리오' },
  { key: 'inheritance', label: '상속플래너' },
];

export default function App() {
  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState('market');
  const [screen, setScreen]       = useState('main');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // 스플래시 화면 지연 (2초)
  React.useEffect(() => {
    const timer = setTimeout(() => setIsSplashing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 트리맵 노드 탭 → PIN 화면
  const handleNodeTap = (member: any) => {
    setSelectedMember(member);
    setScreen('pin');
  };

  // PIN 성공 → 상세 화면
  const handlePinSuccess = (member: any) => {
    setScreen('detail');
  };

  // 뒤로가기 → 메인
  const handleBack = () => {
    setScreen('main');
    setSelectedMember(null);
  };

  // 탭 전환 시 화면 초기화
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setScreen('main');
    setSelectedMember(null);
  };

  const renderContent = () => {
    // PIN / 상세 화면은 탭 위에 오버레이
    if (screen === 'pin' && selectedMember) {
      return (
        <PinScreen
          member={selectedMember}
          onSuccess={handlePinSuccess}
          onBack={handleBack}
        />
      );
    }
    if (screen === 'detail' && selectedMember) {
      return (
        <DetailScreen
          member={selectedMember}
          onBack={handleBack}
        />
      );
    }

    // 일반 탭 콘텐츠
    switch (activeTab) {
      case 'assets':
        return (
          <AssetsTab
            members={FAMILY_MEMBERS}
            onNodeTap={handleNodeTap}
          />
        );
      case 'portfolio':
        return <PlaceholderTab tabKey="portfolio" />;
      case 'market':
        return <MarketTab />;
      case 'inheritance':
        return <PlaceholderTab tabKey="inheritance" />;
      default:
        return null;
    }
  };

  const isOverlay = screen !== 'main';

  if (isSplashing) {
    return (
      <div className="phone-frame" style={splashStyles.wrap}>
        <div style={splashStyles.logoBox}>
          {/* 가족 트리를 형상화한 헤렌시아 로고 */}
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 배경 원형 장식 */}
            <circle cx="50" cy="50" r="48" stroke="#534AB7" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            
            {/* 연결선 (뿌리/가지) */}
            <path d="M50 30 L50 45" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M50 45 L30 65" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M50 45 L70 65" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M50 45 L50 75" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* 노드 (가족 구성원) */}
            <circle cx="50" cy="30" r="8" fill="#7F77DD" /> {/* 1세대 */}
            <circle cx="30" cy="65" r="6" fill="#5DCAA5" /> {/* 2세대 1 */}
            <circle cx="70" cy="65" r="6" fill="#EF9F27" /> {/* 2세대 2 */}
            <circle cx="50" cy="75" r="6" fill="#378ADD" /> {/* 2세대 3 */}
            
            {/* 빛나는 효과 */}
            <circle cx="50" cy="30" r="12" stroke="#7F77DD" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" values="8;15;8" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div style={splashStyles.title}>Herencia</div>
          <div style={splashStyles.subTitle}>가족의 자산, 하나의 미래</div>
        </div>
        <div style={splashStyles.footer}>© 2026 Herencia Inc.</div>
      </div>
    );
  }

  return (
    <div className="phone-frame">
      {/* 앱 헤더 */}
      <div className="app-header">
        <span className="app-title">Herencia</span>
        <div className="live-badge">
          <span className="live-dot" />
          <span>실시간</span>
        </div>
      </div>

      {/* 탭바 — 오버레이 중엔 숨김 */}
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

      {/* 콘텐츠 영역 */}
      <div className="content-area">
        {renderContent()}
      </div>
    </div>
  );
}

const splashStyles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
    height: '100%',
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '2px',
  },
  subTitle: {
    fontSize: 13,
    color: '#555',
    letterSpacing: '0.5px',
  },
  footer: {
    position: 'absolute' as const,
    bottom: 24,
    fontSize: 10,
    color: '#333',
  },
};
