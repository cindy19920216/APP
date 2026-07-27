import React, { useState } from 'react';
import { OX_QUIZZES, PRACTICE_SCENARIOS } from './data/quizData';
import { QuizItem, PracticeScenario, IndicatorSettings } from './types';
import { ChartCanvas } from './ChartCanvas';
import { Target, CheckCircle2, XCircle, Trophy, Play, RotateCcw, ArrowRight } from 'lucide-react';

export const QuizTrainingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OX' | 'SIMULATION'>('OX');

  // OX Quiz State
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [oxAnswers, setOxAnswers] = useState<{ [quizId: string]: boolean }>({});
  const [oxScore, setOxScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  // Simulation State
  const [activeScenarioIdx, setActiveScenarioIdx] = useState<number>(0);
  const [userChoice, setUserChoice] = useState<'BUY' | 'PASS' | 'SELL' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const currentQuiz: QuizItem = OX_QUIZZES[currentQuizIdx];
  const currentScenario: PracticeScenario = PRACTICE_SCENARIOS[activeScenarioIdx];

  const simulationSettings: IndicatorSettings = {
    showMA5: true,
    showMA20: true,
    showMA60: true,
    showMA120: false,
    rsiEnabled: true,
    rsiPeriod: 14,
    bollingerEnabled: false,
    macdEnabled: false,
    volumeEnabled: true,
    showSupportResistance: true,
  };

  // Answer OX Quiz
  const handleOxAnswer = (userChoiceO: boolean) => {
    if (oxAnswers[currentQuiz.id] !== undefined) return;

    const isCorrect = userChoiceO === currentQuiz.isCorrectOX;
    setOxAnswers((prev) => ({ ...prev, [currentQuiz.id]: userChoiceO }));

    if (isCorrect) {
      setOxScore((prev) => prev + 10);
    }
  };

  const handleNextQuiz = () => {
    if (currentQuizIdx < OX_QUIZZES.length - 1) {
      setCurrentQuizIdx((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const resetOxQuiz = () => {
    setCurrentQuizIdx(0);
    setOxAnswers({});
    setOxScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#181820] border border-[#23232f] p-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest mb-2">
            <Target className="w-3.5 h-3.5 text-[#F1C40F]" />
            <span>Interactive Trainer · Practice</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#eee]">
            {activeTab === 'OX' ? '차트 지표 핵심 OX 퀴즈' : '실전 차트 시뮬레이터 (Buy or Pass?)'}
          </h2>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center space-x-2 bg-[#13131a] p-1.5 border border-[#23232f]">
          <button
            onClick={() => setActiveTab('OX')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'OX'
                ? 'bg-[#7F77DD] text-white'
                : 'text-[#999] hover:text-[#eee]'
            }`}
          >
            ⭕❌ OX 퀴즈
          </button>
          <button
            onClick={() => setActiveTab('SIMULATION')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'SIMULATION'
                ? 'bg-[#7F77DD] text-white'
                : 'text-[#999] hover:text-[#eee]'
            }`}
          >
            📈 차트 시뮬레이션
          </button>
        </div>
      </div>

      {/* MODE 1: OX QUIZ */}
      {activeTab === 'OX' && (
        <div className="bg-[#181820] border border-[#23232f] p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
          {!quizFinished ? (
            <>
              {/* Progress and Score */}
              <div className="flex items-center justify-between border-b border-[#23232f] pb-4">
                <div className="flex items-center space-x-2 text-xs text-[#999]">
                  <span className="font-bold text-[#eee]">
                    Question {currentQuizIdx + 1} / {OX_QUIZZES.length}
                  </span>
                  <span className="px-2 py-0.5 bg-[#7F77DD] text-white font-mono uppercase text-[10px] font-bold">
                    {currentQuiz.category}
                  </span>
                </div>
                <div className="flex items-center space-x-2 font-bold text-[#eee] text-sm">
                  <Trophy className="w-4 h-4 text-[#F1C40F]" />
                  <span>Score: {oxScore} Pts</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-2 space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#999]">Topic Tag: #{currentQuiz.indicatorTag}</div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#eee] leading-relaxed">
                  "{currentQuiz.question}"
                </h3>
              </div>

              {/* O / X Big Interactive Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOxAnswer(true)}
                  disabled={oxAnswers[currentQuiz.id] !== undefined}
                  className={`p-6 border-2 flex flex-col items-center justify-center space-y-2 transition-all ${
                    oxAnswers[currentQuiz.id] === true
                      ? currentQuiz.isCorrectOX
                        ? 'bg-[#27AE60]/10 border-[#27AE60] text-[#27AE60]'
                        : 'bg-[#E74C3C]/10 border-[#E74C3C] text-[#E74C3C]'
                      : 'bg-[#13131a] border-[#23232f] hover:border-[#7F77DD] text-[#eee]'
                  }`}
                >
                  <span className="text-4xl font-extrabold text-[#27AE60]">⭕</span>
                  <span className="text-xs font-bold uppercase tracking-wider">그렇다 (O)</span>
                </button>

                <button
                  onClick={() => handleOxAnswer(false)}
                  disabled={oxAnswers[currentQuiz.id] !== undefined}
                  className={`p-6 border-2 flex flex-col items-center justify-center space-y-2 transition-all ${
                    oxAnswers[currentQuiz.id] === false
                      ? !currentQuiz.isCorrectOX
                        ? 'bg-[#27AE60]/10 border-[#27AE60] text-[#27AE60]'
                        : 'bg-[#E74C3C]/10 border-[#E74C3C] text-[#E74C3C]'
                      : 'bg-[#13131a] border-[#23232f] hover:border-[#E74C3C] text-[#eee]'
                  }`}
                >
                  <span className="text-4xl font-extrabold text-[#E74C3C]">❌</span>
                  <span className="text-xs font-bold uppercase tracking-wider">아니다 (X)</span>
                </button>
              </div>

              {/* Answer Explanation Reveal */}
              {oxAnswers[currentQuiz.id] !== undefined && (
                <div className="p-5 bg-[#7F77DD] text-white border border-[#7F77DD] space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    {oxAnswers[currentQuiz.id] === currentQuiz.isCorrectOX ? (
                      <span className="text-[#F1C40F] flex items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5" /> 정답입니다! (Correct)
                      </span>
                    ) : (
                      <span className="text-[#E74C3C] flex items-center gap-1.5">
                        <XCircle className="w-5 h-5" /> 오답입니다 (정답: {currentQuiz.isCorrectOX ? 'O' : 'X'})
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                    {currentQuiz.explanation}
                  </p>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleNextQuiz}
                      className="px-6 py-2.5 bg-[#181820] text-[#eee] hover:bg-[#13131a] font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all"
                    >
                      <span>{currentQuizIdx < OX_QUIZZES.length - 1 ? '다음 문제로' : '결과 보기'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Quiz Completion Score Card */
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 bg-[#7F77DD] text-[#F1C40F] flex items-center justify-center mx-auto border border-[#7F77DD]">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#eee]">
                OX 퀴즈 마스터 완료!
              </h3>
              <p className="text-2xl font-black text-[#eee]">
                최종 점수: {oxScore} / {OX_QUIZZES.length * 10} 점
              </p>
              <p className="text-xs sm:text-sm text-[#bbb] max-w-md mx-auto leading-relaxed">
                {oxScore >= 70
                  ? '훌륭합니다! 기본 지표의 개념과 정배열, RSI, 거래량의 원리를 완벽하게 숙지하셨습니다.'
                  : '좋은 도전이었습니다! 이론 섹션을 다시 한 번 복습하며 지표의 정밀한 법칙을 익혀보세요.'}
              </p>

              <button
                onClick={resetOxQuiz}
                className="px-6 py-3 bg-[#7F77DD] hover:bg-[#6b63c9] text-white font-bold text-xs uppercase tracking-wider inline-flex items-center space-x-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>퀴즈 다시 풀어보기</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: CHART PRACTICE SIMULATION */}
      {activeTab === 'SIMULATION' && (
        <div className="space-y-6">
          {/* Scenario Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {PRACTICE_SCENARIOS.map((scen, idx) => (
              <button
                key={scen.id}
                onClick={() => {
                  setActiveScenarioIdx(idx);
                  setIsRevealed(false);
                  setUserChoice(null);
                }}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeScenarioIdx === idx
                    ? 'bg-[#7F77DD] text-white border border-[#7F77DD]'
                    : 'bg-[#181820] border border-[#23232f] text-[#999] hover:text-[#eee]'
                }`}
              >
                시나리오 {idx + 1}: {scen.stockName}
              </button>
            ))}
          </div>

          {/* Scenario Chart Display */}
          <div className="bg-[#181820] border border-[#23232f] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#23232f]">
              <div>
                <span className="px-2.5 py-0.5 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
                  Level: {currentScenario.difficulty}
                </span>
                <h3 className="text-xl font-bold text-[#eee] mt-2">
                  {currentScenario.title}
                </h3>
              </div>
              <span className="text-xs text-[#999]">
                {!isRevealed ? `T일 시점까지 차트 공개 중 (${currentScenario.revealIndex}일)` : '전체 미래 결과 공개됨'}
              </span>
            </div>

            {/* Masked / Unmasked Chart Canvas */}
            <ChartCanvas
              data={currentScenario.dataPoints}
              settings={simulationSettings}
              height={420}
              highlightIndex={!isRevealed ? currentScenario.revealIndex : undefined}
            />

            {/* Scenario Decision Prompt */}
            {!isRevealed ? (
              <div className="p-5 bg-[#13131a] border border-[#23232f] space-y-4">
                <p className="text-xs sm:text-sm text-[#eee] font-medium leading-relaxed">
                  {currentScenario.scenarioQuestion}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentScenario.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => {
                        setUserChoice(choice.id);
                        setIsRevealed(true);
                      }}
                      className="p-4 bg-[#181820] border border-[#23232f] hover:border-[#7F77DD] text-left text-xs sm:text-sm font-bold text-[#eee] flex items-center justify-between transition-all"
                    >
                      <span>{choice.label}</span>
                      <Play className="w-4 h-4 text-[#eee]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Outcome & Technical Commentary Reveal */
              <div className="p-5 bg-[#7F77DD] text-white border border-[#7F77DD] space-y-4">
                <div className="flex items-center space-x-2 text-base">
                  {userChoice === 'BUY' && currentScenario.choices[0].isCorrect ? (
                    <span className="text-[#F1C40F] flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6" /> 완벽한 차트 분석 성공!
                    </span>
                  ) : (
                    <span className="text-white flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-[#F1C40F]" /> 차트 분석 결과 복기
                    </span>
                  )}
                </div>

                <div className="p-4 bg-white/10 border border-white/20 text-xs sm:text-sm text-slate-100 space-y-2">
                  <h4 className="font-bold text-[#F1C40F]">기술적 분석 해설:</h4>
                  <p className="leading-relaxed font-sans">{currentScenario.choices[0].explanation}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    핵심 기술적 체크포인트
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentScenario.keyTechnicalPoints.map((pt, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-[#181820] text-[#eee] text-xs font-bold"
                      >
                        ✓ {pt}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setIsRevealed(false);
                      setUserChoice(null);
                    }}
                    className="px-5 py-2.5 bg-[#181820] text-[#eee] text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>다시 풀어보기</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
