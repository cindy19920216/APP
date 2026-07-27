import React, { useState } from 'react';
import { LESSONS_DATA } from './data/lessonsData';
import { LessonTopic } from './types';
import {
  CandlestickChart,
  TrendingUp,
  Activity,
  BarChart2,
  Zap,
  Maximize2,
  Volume2,
  FileText,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface TheorySectionProps {
  onSelectTopicInWorkbench: () => void;
}

export const TheorySection: React.FC<TheorySectionProps> = ({ onSelectTopicInWorkbench }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeLesson, setActiveLesson] = useState<LessonTopic>(LESSONS_DATA[0]);

  const categories = [
    { id: 'ALL', name: '전체 보기' },
    { id: '봉차트', name: '캔들/타임프레임' },
    { id: '이평선', name: '이평선 & 배열' },
    { id: 'RSI', name: 'RSI 과매수/과매도' },
    { id: 'ADR', name: 'ADR 시장과열' },
    { id: 'MACD', name: 'MACD 골든크로스' },
    { id: '볼린저', name: '볼린저 밴드' },
    { id: '거래량', name: '거래량 분석' },
    { id: '펀더멘털', name: '펀더멘털 기초' },
  ];

  const filteredLessons =
    selectedCategory === 'ALL'
      ? LESSONS_DATA
      : LESSONS_DATA.filter((l) => l.category === selectedCategory);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CandlestickChart':
        return <CandlestickChart className="w-5 h-5 text-[#E74C3C]" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-[#27AE60]" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-[#8E44AD]" />;
      case 'BarChart2':
        return <BarChart2 className="w-5 h-5 text-[#D35400]" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-[#2980B9]" />;
      case 'Maximize2':
        return <Maximize2 className="w-5 h-5 text-[#16A085]" />;
      case 'Volume2':
        return <Volume2 className="w-5 h-5 text-[#C0392B]" />;
      default:
        return <FileText className="w-5 h-5 text-[#2C3E50]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative bg-[#181820] p-6 sm:p-8 border border-[#23232f]">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#F1C40F]" />
            <span>Lecture Notes · Curriculum</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#eee] leading-tight">
            기술적 지표의 <span className="text-[#eee] border-b-2 border-[#7F77DD] pb-0.5">원리와 실전 의미</span> 완벽 정복
          </h2>
          <p className="text-sm text-[#bbb] leading-relaxed">
            단순히 모양만 외우지 마세요. 캔들, 정배열/역배열, RSI, ADR, 볼린저 밴드에 담긴 시장 심리와 세력의 수급 원리를 차근차근 다룹니다.
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-[#7F77DD] text-white'
                : 'bg-[#181820] text-[#999] border border-[#23232f] hover:text-[#eee] hover:border-[#7F77DD]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Grid: Lessons List + Detailed View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Lessons List Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs uppercase font-black tracking-widest text-[#999]">
              학습 목차 ({filteredLessons.length})
            </h3>
            <span className="text-[10px] text-[#999]">Chapter Index</span>
          </div>
          <div className="space-y-2.5">
            {filteredLessons.map((lesson) => {
              const isSelected = activeLesson.id === lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson)}
                  className={`p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181820] border-[#7F77DD] ring-1 ring-[#7F77DD]'
                      : 'bg-[#181820] border-[#23232f] hover:border-[#555]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#13131a] border border-[#23232f]">
                        {getIcon(lesson.iconName)}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#7F77DD] text-white">
                          {lesson.category} · {lesson.difficulty}
                        </span>
                        <h4 className="text-sm font-bold text-[#eee] mt-1.5">
                          {lesson.title}
                        </h4>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-[#eee] translate-x-1' : 'text-[#666]'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-[#bbb] mt-2 line-clamp-2">
                    {lesson.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Topic Reader (7 cols) */}
        <div className="lg:col-span-7 bg-[#181820] border border-[#23232f] p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="border-b border-[#23232f] pb-5 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
                {activeLesson.category}
              </span>
              <span className="text-xs text-[#999]">난이도: {activeLesson.difficulty}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#eee]">
              {activeLesson.title}
            </h3>
            <p className="text-sm text-[#bbb] leading-relaxed">
              {activeLesson.summary}
            </p>
          </div>

          {/* Key Takeaways Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#eee] border-l-2 border-[#7F77DD] pl-2">
              핵심 요약 노트 (Key Takeaways)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeLesson.keyPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#13131a] border border-[#23232f] text-xs text-[#eee] flex items-start space-x-2"
                >
                  <span className="text-[#eee] font-bold mt-0.5">•</span>
                  <span className="leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Content Paragraphs */}
          <div className="space-y-3 bg-[#13131a] p-5 border border-[#23232f]">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#999]">상세 심화 해설</h4>
            {activeLesson.detailedContent.map((paragraph, idx) => (
              <p key={idx} className="text-xs sm:text-sm text-[#bbb] leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Guru Insight Quote */}
          <div className="p-5 bg-[#7F77DD] text-white border border-[#7F77DD] space-y-2">
            <div className="flex items-center space-x-2 text-[#F1C40F] text-[10px] font-black uppercase tracking-widest">
              <span>Guru's Wisdom</span>
            </div>
            <blockquote className="text-sm leading-relaxed text-slate-100">
              "{activeLesson.guruInsight}"
            </blockquote>
          </div>

          {/* Direct Workbench Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onSelectTopicInWorkbench}
              className="px-6 py-3 bg-[#7F77DD] hover:bg-[#6b63c9] text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all"
            >
              <span>차트 스튜디오에서 지표 실험하기</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
