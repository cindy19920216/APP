import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';

interface AiDoctorSectionProps {
  initialStockName?: string;
  initialTimeframe?: string;
  initialPrice?: number;
  initialTechnicals?: any;
}

export const AiDoctorSection: React.FC<AiDoctorSectionProps> = ({
  initialStockName = '삼성전자',
  initialTimeframe = '일봉',
  initialPrice = 75000,
  initialTechnicals = { alignment: '정배열', rsi: 58, support: 71000, resistance: 79000 },
}) => {
  const [stockName, setStockName] = useState<string>(initialStockName);
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [currentPrice, setCurrentPrice] = useState<number>(initialPrice);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickQuestions = [
    '현재 이 차트가 정배열 돌파 매수 타점인가요?',
    'RSI 과매도 구간인데 반등 가능성이 높을까요?',
    '주요 지지선과 저항선, 손절선 설정을 알려주세요.',
    '마크 미네르비니나 존 머피 구루 관점에서는 이 차트를 어떻게 보나요?',
  ];

  const handleAskAi = async (overrideQuestion?: string) => {
    const q = overrideQuestion || userQuestion;
    if (!q.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setAiResponse(null);

    try {
      const res = await fetch('/api/chart-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockName,
          timeframe,
          currentPrice,
          technicals: initialTechnicals,
          userQuestion: q,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiResponse(data.answer);
      } else {
        setErrorMsg(data.error || 'AI 차트 닥터 호출 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setErrorMsg('서버와 통신할 수 없습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#181820] p-6 border border-[#23232f] space-y-2">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#7F77DD] text-white text-[10px] font-black uppercase tracking-widest">
          <Bot className="w-4 h-4 text-[#F1C40F]" />
          <span>Gemini 3.6 Flash · AI Chart Doctor</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#eee] pt-1">
          실시간 <span className="underline decoration-[#F1C40F] decoration-2">AI 차트 진단 & 멘토링</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#bbb] leading-relaxed">
          관심 있는 종목이나 공부 중인 차트 시나리오의 지표 상태를 입력하고, AI 닥터에게 쉽고 정밀한 기술적 진단을 받아보세요.
        </p>
      </div>

      {/* Input Parameters Box */}
      <div className="bg-[#181820] border border-[#23232f] p-6 space-y-5">
        <h3 className="text-sm font-bold text-[#eee] flex items-center gap-1.5 uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-[#eee]" />
          진단받을 종목 및 지표 정보 입력
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-[#999] block mb-1 font-bold">종목명</label>
            <input
              type="text"
              value={stockName}
              onChange={(e) => setStockName(e.target.value)}
              className="w-full bg-[#13131a] border border-[#23232f] px-3.5 py-2.5 text-[#eee] font-bold focus:outline-none focus:border-[#7F77DD]"
              placeholder="예: 삼성전자, 테슬라"
            />
          </div>

          <div>
            <label className="text-[#999] block mb-1 font-bold">타임프레임</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-[#13131a] border border-[#23232f] px-3.5 py-2.5 text-[#eee] font-bold focus:outline-none focus:border-[#7F77DD]"
            >
              <option value="일봉">일봉 (스윙/단기)</option>
              <option value="5분봉">5분봉 (스캘핑/단타)</option>
              <option value="주봉">주봉 (중장기 추세)</option>
            </select>
          </div>

          <div>
            <label className="text-[#999] block mb-1 font-bold">현재가 (원/$)</label>
            <input
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(Number(e.target.value))}
              className="w-full bg-[#13131a] border border-[#23232f] px-3.5 py-2.5 text-[#eee] font-bold focus:outline-none focus:border-[#7F77DD]"
            />
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#eee]">자주 묻는 분석 질문 추천:</label>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setUserQuestion(q);
                  handleAskAi(q);
                }}
                className="px-3 py-1.5 bg-[#13131a] hover:bg-[#7F77DD] hover:text-white text-[#eee] border border-[#23232f] text-xs font-medium transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Question Textarea */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            placeholder="예: 20일 이평선을 뚫고 올라왔는데 거래량이 적어서 불안합니다. 어떻게 판단해야 할까요?"
            className="flex-1 bg-[#13131a] border border-[#23232f] px-4 py-3 text-xs sm:text-sm text-[#eee] focus:outline-none focus:border-[#7F77DD]"
          />
          <button
            onClick={() => handleAskAi()}
            disabled={loading || !userQuestion.trim()}
            className="px-6 py-3 bg-[#7F77DD] hover:bg-[#6b63c9] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#F1C40F]" /> : <Send className="w-4 h-4 text-[#F1C40F]" />}
            <span>분석 요청</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-[#E74C3C]/10 border border-[#E74C3C] text-[#E74C3C] text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-[#E74C3C] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* AI Response Display Card */}
      {aiResponse && (
        <div className="bg-[#7F77DD] text-white border border-[#7F77DD] p-6 space-y-4 animate-fade-in">
          <div className="flex items-center space-x-2 pb-3 border-b border-white/20 text-[#F1C40F] font-bold text-base">
            <Sparkles className="w-5 h-5 text-[#F1C40F]" />
            <span>AI 차트 닥터의 전문 기술적 진단 보고서</span>
          </div>

          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3 font-sans">
            {aiResponse}
          </div>

          <div className="pt-3 border-t border-white/20 text-[11px] text-slate-400">
            * 본 AI 분석은 학습 및 기술적 지표 연습 목적의 참고용 자료이며, 투자 결과에 대한 법적 책임이 없으므로 항상 위험 관리를 우선하세요.
          </div>
        </div>
      )}
    </div>
  );
};
