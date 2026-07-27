import React from 'react';
import { BookOpen, Crown, LineChart, Target, Bot } from 'lucide-react';

export type ActiveTab = 'theory' | 'gurus' | 'workbench' | 'quiz' | 'aidoctor';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

// Herencia "Technical Idea" 탭 내부 서브 내비게이션.
// 원본 앱의 자체 로고/브랜딩 헤더는 Herencia 셸과 중복이라 빼고 탭 5개만 유지.
export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'theory', label: '이론 & 지표', icon: BookOpen },
    { id: 'gurus', label: '구루의 법칙', icon: Crown },
    { id: 'workbench', label: '차트 스튜디오', icon: LineChart },
    { id: 'quiz', label: 'OX퀴즈 & 트레이닝', icon: Target },
    { id: 'aidoctor', label: 'AI 차트닥터', icon: Bot },
  ] as const;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[#7F77DD] text-white'
                : 'bg-[#181820] text-[#999] border border-[#23232f] hover:text-[#eee] hover:border-[#7F77DD]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
