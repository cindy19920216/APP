import React, { useState } from 'react';
import { GURU_DATA } from './data/guruData';
import { GuruGuide } from './types';
import { Crown, CheckCircle2, ChevronRight, Award } from 'lucide-react';

interface GuruSectionProps {
  onApplyPreset: (presetId: string) => void;
}

export const GuruSection: React.FC<GuruSectionProps> = ({ onApplyPreset }) => {
  const [activeGuru, setActiveGuru] = useState<GuruGuide>(GURU_DATA[0]);

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <div className="relative bg-[#181820] border border-[#23232f] p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
            <Crown className="w-3.5 h-3.5 text-[#F1C40F]" />
            <span>Wall Street Legends · Masterclass</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#eee] leading-tight">
            전설적인 차트 구루들은 <span className="text-[#eee] border-b-2 border-[#7F77DD] pb-0.5">무엇을 가장 중요하게 보았나?</span>
          </h2>
          <p className="text-sm text-[#bbb] leading-relaxed">
            마크 미네르비니, 제시 리버모어, 윌리엄 오닐 등 수천 %의 수익률을 기록한 명장들이 차트에서 필수로 검증했던 골든 룰을 살펴봅니다.
          </p>
        </div>
      </div>

      {/* Guru Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {GURU_DATA.map((guru) => {
          const isSelected = activeGuru.id === guru.id;
          return (
            <button
              key={guru.id}
              onClick={() => setActiveGuru(guru)}
              className={`p-4 text-left transition-all ${
                isSelected
                  ? 'bg-[#7F77DD] text-white border border-[#7F77DD]'
                  : 'bg-[#181820] text-[#eee] border border-[#23232f] hover:border-[#7F77DD]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Crown className={`w-3.5 h-3.5 ${isSelected ? 'text-[#F1C40F]' : 'text-[#999]'}`} />
                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#eee]'}`}>
                  {guru.name}
                </span>
              </div>
              <p className={`text-[10px] uppercase tracking-wider mt-1 truncate ${isSelected ? 'text-slate-300' : 'text-[#999]'}`}>
                {guru.englishName}
              </p>
            </button>
          );
        })}
      </div>

      {/* Detailed Guru Card */}
      <div className="bg-[#181820] border border-[#23232f] p-6 sm:p-8 space-y-6">
        {/* Guru Header & Quote */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#23232f]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
                {activeGuru.englishName}
              </span>
              <span className="text-xs text-[#999]">{activeGuru.title}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#eee] mt-2">
              {activeGuru.name}의 핵심 차트 법칙
            </h3>
          </div>

          <button
            onClick={() => onApplyPreset(activeGuru.presetId)}
            className="px-5 py-3 bg-[#7F77DD] hover:bg-[#6b63c9] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all whitespace-nowrap"
          >
            <Award className="w-4 h-4 text-[#F1C40F]" />
            <span>구루의 차트 기본 세팅 적용하기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Famous Quote Box */}
        <div className="p-5 bg-[#7F77DD] text-white border-l-4 border-[#F1C40F]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#F1C40F] block mb-1">Legendary Insight</span>
          <blockquote className="text-sm sm:text-base leading-relaxed text-slate-100">
            "{activeGuru.quote}"
          </blockquote>
        </div>

        {/* Core Philosophy & Preferred Setup Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-[#13131a] border border-[#23232f] space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#eee]">
              핵심 철학 (Core Philosophy)
            </h4>
            <p className="text-xs sm:text-sm text-[#bbb] leading-relaxed">
              {activeGuru.corePhilosophy}
            </p>
          </div>

          <div className="p-5 bg-[#13131a] border border-[#23232f] space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#eee]">
              선호 지표 및 타점 세팅
            </h4>
            <p className="text-xs sm:text-sm text-[#eee] font-mono">
              {activeGuru.preferredSetup}
            </p>
          </div>
        </div>

        {/* Must Check Rules Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#eee]">
            {activeGuru.name}가 필수로 확인했던 차트 체크리스트
          </h4>
          <div className="space-y-2">
            {activeGuru.mustCheckRules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-[#181820] border border-[#23232f] flex items-start space-x-3 text-xs sm:text-sm text-[#eee]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#eee] shrink-0 mt-0.5" />
                <span className="leading-snug">{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Example Box */}
        <div className="p-5 bg-[#13131a] border border-[#23232f] space-y-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#eee] flex items-center gap-1.5">
            <span>📈 주력 패턴: {activeGuru.chartPatternTitle}</span>
          </h4>
          <p className="text-xs sm:text-sm text-[#bbb] leading-relaxed">
            {activeGuru.chartPatternDescription}
          </p>
        </div>
      </div>
    </div>
  );
};
