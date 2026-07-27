import React, { useState, useEffect, useMemo } from 'react';
import { OX_QUIZZES, PRACTICE_SCENARIOS } from './data/quizData';
import { QuizItem, PracticeScenario, IndicatorSettings, StockDataPoint } from './types';
import { ChartCanvas } from './ChartCanvas';

const DIFFICULTIES: { id: 'ALL' | '초급' | '중급' | '고급'; label: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: '초급', label: '초급' },
  { id: '중급', label: '중급' },
  { id: '고급', label: '고급' },
];

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const QUIZ_CHART_SETTINGS: IndicatorSettings = {
  showMA5: true, showMA20: true, showMA60: true, showMA120: true,
  rsiEnabled: true, rsiPeriod: 14, bollingerEnabled: false, macdEnabled: false,
  volumeEnabled: true, showSupportResistance: false,
};

export const QuizTrainingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OX' | 'SIMULATION'>('OX');

  // OX Quiz State
  const [difficulty, setDifficulty] = useState<'ALL' | '초급' | '중급' | '고급'>('ALL');
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [oxAnswers, setOxAnswers] = useState<{ [quizId: string]: boolean }>({});
  const [oxScore, setOxScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [quizChartData, setQuizChartData] = useState<StockDataPoint[] | null>(null);
  const [quizChartLoading, setQuizChartLoading] = useState<boolean>(false);

  // Simulation State
  const [activeScenarioIdx, setActiveScenarioIdx] = useState<number>(0);
  const [userChoice, setUserChoice] = useState<'BUY' | 'PASS' | 'SELL' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const filteredQuizzes = useMemo(
    () => (difficulty === 'ALL' ? OX_QUIZZES : OX_QUIZZES.filter((q) => q.difficulty === difficulty)),
    [difficulty]
  );

  const handleSelectDifficulty = (d: typeof difficulty) => {
    setDifficulty(d);
    setCurrentQuizIdx(0);
    setOxAnswers({});
    setOxScore(0);
    setQuizFinished(false);
  };

  const currentQuiz: QuizItem = filteredQuizzes[currentQuizIdx];
  const currentScenario: PracticeScenario = PRACTICE_SCENARIOS[activeScenarioIdx];

  // 문항에 실제 차트가 붙어있으면 asOfDate 기준으로 실제 데이터를 받아온다 (지표 워밍업을 위해 280일 여유를 두고 조회)
  useEffect(() => {
    if (!currentQuiz?.chart) { setQuizChartData(null); return; }
    const { ticker, asOfDate } = currentQuiz.chart;
    let cancelled = false;
    setQuizChartLoading(true);
    fetch(`/api/chart/${encodeURIComponent(ticker)}?start=${subtractDays(asOfDate, 280)}&end=${asOfDate}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
      .then((json) => {
        if (cancelled) return;
        if (json.error || !Array.isArray(json.points)) throw new Error(json.error || 'no data');
        const points: StockDataPoint[] = json.points.map((p: any) => ({
          date: p.date, open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume ?? 0,
        }));
        setQuizChartData(points);
      })
      .catch(() => { if (!cancelled) setQuizChartData(null); })
      .finally(() => { if (!cancelled) setQuizChartLoading(false); });
    return () => { cancelled = true; };
  }, [currentQuiz?.id]);

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

  const handleOxAnswer = (userChoiceO: boolean) => {
    if (oxAnswers[currentQuiz.id] !== undefined) return;
    const isCorrect = userChoiceO === currentQuiz.isCorrectOX;
    setOxAnswers((prev) => ({ ...prev, [currentQuiz.id]: userChoiceO }));
    if (isCorrect) setOxScore((prev) => prev + 10);
  };

  const handleNextQuiz = () => {
    if (currentQuizIdx < filteredQuizzes.length - 1) {
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

  const oxAnswered = oxAnswers[currentQuiz.id] !== undefined;

  return (
    <div style={S.wrap}>
      {/* Header & Mode Toggle */}
      <div style={S.header}>
        <div>
          <div style={S.titleRow}>
            <i className="ti ti-target-arrow" style={{ color: '#7F77DD', fontSize: 17 }} />
            <span style={S.title}>{activeTab === 'OX' ? '차트 지표 핵심 OX 퀴즈' : '실전 차트 시뮬레이터'}</span>
          </div>
          <div style={S.subtitle}>배운 지표를 문제와 실전 시나리오로 바로 점검해보세요.</div>
        </div>

        <div style={S.segmented}>
          <button
            style={{ ...S.segBtn, ...(activeTab === 'OX' ? S.segBtnActive : {}) }}
            onClick={() => setActiveTab('OX')}
          >
            OX 퀴즈
          </button>
          <button
            style={{ ...S.segBtn, ...(activeTab === 'SIMULATION' ? S.segBtnActive : {}) }}
            onClick={() => setActiveTab('SIMULATION')}
          >
            차트 시뮬레이션
          </button>
        </div>
      </div>

      {/* MODE 1: OX QUIZ */}
      {activeTab === 'OX' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...S.filterRow, justifyContent: 'center' }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                style={{ ...S.filterChip, ...(difficulty === d.id ? S.filterChipActive : {}) }}
                onClick={() => handleSelectDifficulty(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

        <div style={{ ...S.card, maxWidth: 720, margin: '0 auto', width: '100%' }}>
          {!quizFinished ? (
            <>
              <div style={S.progressRow}>
                <div style={S.progressLeft}>
                  <span style={S.progressText}>문제 {currentQuizIdx + 1} / {filteredQuizzes.length}</span>
                  <span style={S.badge}>{currentQuiz.category}</span>
                  <span style={{ ...S.badge, background: '#EF9F271a', color: '#EF9F27' }}>{currentQuiz.difficulty}</span>
                </div>
                <div style={S.scoreText}>
                  <i className="ti ti-trophy" style={{ fontSize: 14, color: '#EF9F27' }} />
                  <span>{oxScore}점</span>
                </div>
              </div>

              {currentQuiz.chart && (
                <div style={{ marginTop: 16 }}>
                  {quizChartLoading && <div style={S.chartMsg}>{currentQuiz.chart.name} 실제 차트를 불러오는 중...</div>}
                  {!quizChartLoading && quizChartData && (
                    <>
                      <ChartCanvas
                        data={quizChartData}
                        settings={QUIZ_CHART_SETTINGS}
                        height={420}
                        volumeHeight={36}
                        currencyUnit={currentQuiz.chart.market === 'KOSPI' ? '원' : '$'}
                      />
                      <div style={S.chartCaption}>
                        {currentQuiz.chart.name} ({currentQuiz.chart.ticker}) · {currentQuiz.chart.asOfDate} 기준 실제 차트
                      </div>
                    </>
                  )}
                  {!quizChartLoading && !quizChartData && <div style={S.chartMsg}>차트를 불러오지 못했습니다.</div>}
                </div>
              )}

              <div style={{ margin: '18px 0' }}>
                <div style={S.tagText}>#{currentQuiz.indicatorTag}</div>
                <div style={S.questionText}>&ldquo;{currentQuiz.question}&rdquo;</div>
              </div>

              <div style={S.oxGrid}>
                <button
                  onClick={() => handleOxAnswer(true)}
                  disabled={oxAnswered}
                  style={{
                    ...S.oxButton,
                    ...(oxAnswers[currentQuiz.id] === true
                      ? currentQuiz.isCorrectOX ? S.oxButtonCorrect : S.oxButtonWrong
                      : {}),
                  }}
                >
                  <span style={{ fontSize: 32 }}>⭕</span>
                  <span style={S.oxButtonLabel}>그렇다 (O)</span>
                </button>
                <button
                  onClick={() => handleOxAnswer(false)}
                  disabled={oxAnswered}
                  style={{
                    ...S.oxButton,
                    ...(oxAnswers[currentQuiz.id] === false
                      ? !currentQuiz.isCorrectOX ? S.oxButtonCorrect : S.oxButtonWrong
                      : {}),
                  }}
                >
                  <span style={{ fontSize: 32 }}>❌</span>
                  <span style={S.oxButtonLabel}>아니다 (X)</span>
                </button>
              </div>

              {oxAnswered && (
                <div style={{ ...S.resultBox, ...(oxAnswers[currentQuiz.id] === currentQuiz.isCorrectOX ? S.resultBoxCorrect : S.resultBoxWrong), marginTop: 16 }}>
                  <div style={S.resultHead}>
                    <i className={`ti ${oxAnswers[currentQuiz.id] === currentQuiz.isCorrectOX ? 'ti-circle-check' : 'ti-circle-x'}`} style={{ fontSize: 17 }} />
                    <span>
                      {oxAnswers[currentQuiz.id] === currentQuiz.isCorrectOX
                        ? '정답입니다!'
                        : `오답입니다 (정답: ${currentQuiz.isCorrectOX ? 'O' : 'X'})`}
                    </span>
                  </div>
                  <p style={S.resultExplain}>{currentQuiz.explanation}</p>
                  <div style={S.resultActions}>
                    <button style={S.ctaButtonGhost} onClick={handleNextQuiz}>
                      <span>{currentQuizIdx < filteredQuizzes.length - 1 ? '다음 문제로' : '결과 보기'}</span>
                      <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={S.completeWrap}>
              <div style={S.trophyCircle}>
                <i className="ti ti-trophy" style={{ fontSize: 26, color: '#EF9F27' }} />
              </div>
              <div style={S.completeTitle}>OX 퀴즈 완료!</div>
              <div style={S.completeScore}>최종 점수 {oxScore} / {filteredQuizzes.length * 10}점</div>
              <p style={S.completeMsg}>
                {oxScore >= 70
                  ? '훌륭합니다! 기본 지표의 개념과 정배열, RSI, 거래량의 원리를 완벽하게 숙지하셨습니다.'
                  : '좋은 도전이었습니다! 이론 섹션을 다시 한 번 복습하며 지표의 정밀한 법칙을 익혀보세요.'}
              </p>
              <button style={S.ctaButton} onClick={resetOxQuiz}>
                <i className="ti ti-refresh" style={{ fontSize: 14 }} />
                <span>퀴즈 다시 풀어보기</span>
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* MODE 2: SIMULATION */}
      {activeTab === 'SIMULATION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={S.filterRow}>
            {PRACTICE_SCENARIOS.map((scen, idx) => (
              <button
                key={scen.id}
                onClick={() => { setActiveScenarioIdx(idx); setIsRevealed(false); setUserChoice(null); }}
                style={{ ...S.filterChip, ...(activeScenarioIdx === idx ? S.filterChipActive : {}) }}
              >
                시나리오 {idx + 1}: {scen.stockName}
              </button>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.scenarioHead}>
              <div>
                <span style={S.badge}>레벨 · {currentScenario.difficulty}</span>
                <div style={{ ...S.detailTitle, marginTop: 8 }}>{currentScenario.title}</div>
              </div>
              <span style={S.detailMeta}>
                {!isRevealed ? `T일 시점까지 차트 공개 중 (${currentScenario.revealIndex}일)` : '전체 미래 결과 공개됨'}
              </span>
            </div>

            <div style={{ marginTop: 16 }}>
              <ChartCanvas
                data={currentScenario.dataPoints}
                settings={simulationSettings}
                height={420}
                highlightIndex={!isRevealed ? currentScenario.revealIndex : undefined}
                currencyUnit={currentScenario.ticker.includes('.K') ? '원' : '$'}
              />
            </div>

            {!isRevealed ? (
              <div style={{ ...S.subCard, marginTop: 16 }}>
                <p style={S.subCardText}>{currentScenario.scenarioQuestion}</p>
                <div style={S.choiceGrid}>
                  {currentScenario.choices.map((choice) => (
                    <button
                      key={choice.id}
                      style={S.choiceButton}
                      onClick={() => { setUserChoice(choice.id); setIsRevealed(true); }}
                    >
                      <span>{choice.label}</span>
                      <i className="ti ti-player-play" style={{ fontSize: 14 }} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...S.resultBox, ...S.resultBoxNeutral, marginTop: 16 }}>
                <div style={S.resultHead}>
                  {userChoice === 'BUY' && currentScenario.choices[0].isCorrect ? (
                    <>
                      <i className="ti ti-circle-check" style={{ fontSize: 18, color: '#1D9E75' }} />
                      <span>완벽한 차트 분석 성공!</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-trophy" style={{ fontSize: 18, color: '#EF9F27' }} />
                      <span>차트 분석 결과 복기</span>
                    </>
                  )}
                </div>
                <div style={S.subCard}>
                  <div style={S.sectionTitle}>기술적 분석 해설</div>
                  <p style={S.subCardText}>{currentScenario.choices[0].explanation}</p>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={S.sectionTitle}>핵심 기술적 체크포인트</div>
                  <div style={S.tagRow}>
                    {currentScenario.keyTechnicalPoints.map((pt, idx) => (
                      <span key={idx} style={S.badge}>✓ {pt}</span>
                    ))}
                  </div>
                </div>
                <div style={S.resultActions}>
                  <button style={S.ctaButtonGhost} onClick={() => { setIsRevealed(false); setUserChoice(null); }}>
                    <i className="ti ti-refresh" style={{ fontSize: 13 }} />
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

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },

  header: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 20, fontWeight: 600, color: '#fff' },
  subtitle: { fontSize: 11.5, color: '#666', marginTop: 5, lineHeight: 1.6 },

  segmented: { display: 'flex', gap: 2, background: '#13131e', borderRadius: 10, padding: 3 },
  segBtn: { padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#999', background: 'transparent', border: 'none', cursor: 'pointer' },
  segBtnActive: { background: '#7F77DD', color: '#fff' },

  card: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: 22 },

  progressRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #23232f', paddingBottom: 14 },
  progressLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  progressText: { fontSize: 12, fontWeight: 600, color: '#eee' },
  scoreText: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#eee' },
  badge: { fontSize: 9.5, padding: '3px 8px', borderRadius: 6, background: '#7F77DD1a', color: '#a29dff', fontWeight: 600 },

  tagText: { fontSize: 10.5, color: '#666', marginBottom: 8 },
  questionText: { fontSize: 17, fontWeight: 600, color: '#eee', lineHeight: 1.5 },

  chartMsg: { padding: '50px 20px', textAlign: 'center', background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, color: '#666', fontSize: 12 },
  chartCaption: { fontSize: 10.5, color: '#666', textAlign: 'center', marginTop: 8 },

  oxGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
  oxButton: {
    padding: '22px 0', borderRadius: 14, border: '1px solid #23232f', background: '#13131e',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
  },
  oxButtonLabel: { fontSize: 11.5, fontWeight: 600, color: '#ccc' },
  oxButtonCorrect: { background: '#1D9E7514', border: '1px solid #1D9E75' },
  oxButtonWrong: { background: '#E24B4A14', border: '1px solid #E24B4A' },

  resultBox: { borderRadius: 12, padding: 16 },
  resultBoxCorrect: { background: '#1D9E7514', border: '0.5px solid #1D9E7540' },
  resultBoxWrong: { background: '#E24B4A14', border: '0.5px solid #E24B4A40' },
  resultBoxNeutral: { background: '#7F77DD14', border: '0.5px solid #7F77DD33' },
  resultHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#eee', marginBottom: 10 },
  resultExplain: { fontSize: 12, color: '#bbb', lineHeight: 1.7 },
  resultActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 14 },

  completeWrap: { textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  trophyCircle: { width: 56, height: 56, borderRadius: '50%', background: '#7F77DD1a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  completeTitle: { fontSize: 18, fontWeight: 600, color: '#eee' },
  completeScore: { fontSize: 22, fontWeight: 700, color: '#eee' },
  completeMsg: { fontSize: 12, color: '#999', lineHeight: 1.7, maxWidth: 420 },

  ctaButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer' },
  ctaButtonGhost: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#181820', border: '0.5px solid #23232f', color: '#eee', fontSize: 12, fontWeight: 500, cursor: 'pointer' },

  filterRow: { display: 'flex', gap: 6, flexShrink: 0, overflowX: 'auto' },
  filterChip: { padding: '8px 14px', borderRadius: 999, border: '0.5px solid #2a2a3a', background: 'transparent', color: '#888', fontSize: 11.5, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 },
  filterChipActive: { background: '#7F77DD20', border: '0.5px solid #7F77DD', color: '#a29dff' },

  scenarioHead: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, borderBottom: '0.5px solid #23232f', paddingBottom: 14 },
  detailTitle: { fontSize: 18, fontWeight: 600, color: '#eee' },
  detailMeta: { fontSize: 11, color: '#666' },

  subCard: { background: '#13131e', borderRadius: 10, padding: '14px 16px' },
  subCardText: { fontSize: 12.5, color: '#ccc', lineHeight: 1.7 },
  sectionTitle: { fontSize: 9.5, color: '#444', fontWeight: 600, letterSpacing: '0.3px', marginBottom: 10 },

  choiceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 },
  choiceButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
    borderRadius: 10, background: '#181820', border: '0.5px solid #23232f', color: '#eee',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  },

  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
};
