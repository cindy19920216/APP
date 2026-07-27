import React, { useState } from 'react';
import useIsDesktop from '@/hooks/useIsDesktop';

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
  const isDesktop = useIsDesktop();
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
        body: JSON.stringify({ stockName, timeframe, currentPrice, technicals: initialTechnicals, userQuestion: q }),
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
    <div style={S.wrap}>
      <div style={{ ...S.header, padding: isDesktop ? '18px 22px' : '14px 16px' }}>
        <div style={S.titleRow}>
          <i className="ti ti-robot" style={{ color: '#7F77DD', fontSize: isDesktop ? 17 : 15 }} />
          <span style={{ ...S.title, fontSize: isDesktop ? 20 : 16 }}>실시간 AI 차트 진단 &amp; 멘토링</span>
        </div>
        {isDesktop && (
          <div style={S.subtitle}>
            관심 있는 종목이나 공부 중인 차트 시나리오의 지표 상태를 입력하고, AI 닥터에게 쉽고 정밀한 기술적 진단을 받아보세요.
          </div>
        )}
      </div>

      <div style={{ ...S.card, padding: isDesktop ? 22 : 16 }}>
        <div style={S.cardHeadRow}>
          <i className="ti ti-message-2" style={{ fontSize: 15, color: '#eee' }} />
          <span style={S.cardHeadText}>진단받을 종목 및 지표 정보 입력</span>
        </div>

        <div style={S.inputGrid}>
          <div>
            <label style={S.inputLabel}>종목명</label>
            <input type="text" value={stockName} onChange={(e) => setStockName(e.target.value)} style={S.input} placeholder="예: 삼성전자, 테슬라" />
          </div>
          <div>
            <label style={S.inputLabel}>타임프레임</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={S.input}>
              <option value="일봉">일봉 (스윙/단기)</option>
              <option value="5분봉">5분봉 (스캘핑/단타)</option>
              <option value="주봉">주봉 (중장기 추세)</option>
            </select>
          </div>
          <div>
            <label style={S.inputLabel}>현재가 (원/$)</label>
            <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(Number(e.target.value))} style={S.input} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={S.inputLabel}>자주 묻는 분석 질문 추천</label>
          <div style={S.tagRow}>
            {quickQuestions.map((q, idx) => (
              <button key={idx} style={S.quickChip} onClick={() => { setUserQuestion(q); handleAskAi(q); }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        <div style={isDesktop ? S.askRow : S.askRowM}>
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            placeholder="예: 20일 이평선을 뚫고 올라왔는데 거래량이 적어서 불안합니다. 어떻게 판단해야 할까요?"
            style={isDesktop ? { ...S.input, flex: 1 } : S.input}
          />
          <button style={isDesktop ? S.ctaButton : S.ctaButtonM} onClick={() => handleAskAi()} disabled={loading || !userQuestion.trim()}>
            <i className={`ti ${loading ? 'ti-loader-2' : 'ti-send'}`} style={{ fontSize: 14 }} />
            <span>분석 요청</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={S.errorBox}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 15, flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {aiResponse && (
        <div style={{ ...S.responseCard, padding: isDesktop ? 22 : 16 }}>
          <div style={S.responseHead}>
            <i className="ti ti-sparkles" style={{ fontSize: 16, color: '#a29dff' }} />
            <span>AI 차트 닥터의 전문 기술적 진단 보고서</span>
          </div>
          <div style={S.responseText}>{aiResponse}</div>
          <div style={S.responseFooter}>
            * 본 AI 분석은 학습 및 기술적 지표 연습 목적의 참고용 자료이며, 투자 결과에 대한 법적 책임이 없으므로 항상 위험 관리를 우선하세요.
          </div>
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880, margin: '0 auto', width: '100%' },

  header: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: '18px 22px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 20, fontWeight: 600, color: '#fff' },
  subtitle: { fontSize: 11.5, color: '#666', marginTop: 6, lineHeight: 1.6 },

  card: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: 22 },
  cardHeadRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardHeadText: { fontSize: 13, fontWeight: 600, color: '#eee' },

  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  inputLabel: { fontSize: 10.5, color: '#666', fontWeight: 600, display: 'block', marginBottom: 6 },
  input: { width: '100%', background: '#13131e', border: '0.5px solid #23232f', borderRadius: 10, color: '#eee', fontSize: 12.5, padding: '10px 14px', outline: 'none' },

  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  quickChip: { padding: '7px 12px', borderRadius: 999, background: '#13131e', border: '0.5px solid #23232f', color: '#ccc', fontSize: 11, cursor: 'pointer' },

  askRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 },
  askRowM: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 },
  ctaButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  ctaButtonM: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px 0', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' },

  errorBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: '#E24B4A14', border: '0.5px solid #E24B4A40', color: '#E24B4A', fontSize: 12 },

  responseCard: { background: '#7F77DD14', border: '0.5px solid #7F77DD33', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 },
  responseHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: '#eee', borderBottom: '0.5px solid #7F77DD33', paddingBottom: 12 },
  responseText: { fontSize: 12.5, color: '#ddd', lineHeight: 1.8, whiteSpace: 'pre-line' },
  responseFooter: { fontSize: 10.5, color: '#888', borderTop: '0.5px solid #7F77DD33', paddingTop: 12 },
};
