import React from 'react';

export type ActiveTab = 'theory' | 'gurus' | 'workbench' | 'quiz' | 'aidoctor';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

// Herencia "Technical Idea" 탭 내부 서브 내비게이션.
// 원본 앱의 자체 로고/브랜딩 헤더는 Herencia 셸과 중복이라 빼고 탭 5개만 유지.
const TABS = [
  { id: 'theory', label: '이론 & 지표', icon: 'ti-book-2' },
  { id: 'gurus', label: '구루의 법칙', icon: 'ti-crown' },
  { id: 'workbench', label: '차트 스튜디오', icon: 'ti-chart-line' },
  { id: 'quiz', label: 'OX퀴즈 & 트레이닝', icon: 'ti-target-arrow' },
  { id: 'aidoctor', label: 'AI 차트닥터', icon: 'ti-robot' },
] as const;

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div style={S.row}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            style={{ ...S.btn, ...(isActive ? S.btnActive : {}) }}
          >
            <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 },
  btn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999,
    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
    background: '#181820', color: '#999', border: '0.5px solid #23232f',
  },
  btnActive: { background: '#7F77DD', color: '#fff', border: '0.5px solid #7F77DD' },
};
