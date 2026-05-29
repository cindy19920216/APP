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

const TABS = [
  { key: 'assets',      label: '자산현황' },
  { key: 'portfolio',   label: '포트폴리오' },
  { key: 'market',      label: '시장지표' },
  { key: 'inheritance', label: '상속플래너' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('assets');
  const [screen, setScreen]       = useState('main');
  const [selectedMember, setSelectedMember] = useState<any>(null);

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
        return <PlaceholderTab tabKey="market" />;
      case 'inheritance':
        return <PlaceholderTab tabKey="inheritance" />;
      default:
        return null;
    }
  };

  const isOverlay = screen !== 'main';

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
