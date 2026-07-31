import { NextResponse } from 'next/server';
import { getGenAI, GEMINI_MODEL } from '@/lib/gemini';
import { computeApproxSignal } from '@/lib/stockAnalysis';

export const dynamic = 'force-dynamic';

const VERDICT_MAP = { buy: '상승', sell: '하락', neutral: '보합' } as const;

// 종목마다 리포트의 단락 수·순서·문체가 제각각이라는 피드백을 받아, 삼성전자로 실제
// 생성됐던 리포트를 그대로 few-shot 예시로 박아 넣었다 — 모든 종목이 이 구조를 정확히
// 따르게 강제하기 위함(숫자만 바뀌고 글의 뼈대는 항상 동일해야 함).
const EXAMPLE_REPORT = `삼성전자(005930)의 현재가는 263,000원으로 전일 종가 207,000원 대비 27.05% 상승한 상태입니다. 현재 주가는 이동평균선 대비 MA5(227,800원) 위에는 위치해 있으나, MA20(263,725원)과 MA60(295,383원)보다는 아래에 머물러 있어 중장기적인 하락 추세 속에 단기 반등을 시도하는 국면입니다.

보조지표를 살펴보면 RSI는 33.57로 과매도권에서 벗어나려는 움직임을 보이고 있으며, MACD 히스토그램은 -5918.07로 음의 값을 유지하고 있어 하락 모멘텀이 진행 중입니다. 볼린저밴드는 하단(204,301원) 근처에서 반등이 일어났으며, ADX는 28.28로 추세의 강도가 형성된 가운데 +DI(12.98)보다 -DI(38.49)가 월등히 높아 하락 압력이 우세한 상황입니다.

캔들 패턴 분석 결과, 가장 최근인 2026년 7월 1일에 하락 장악형(bearish_engulfing) 패턴이 감지되었습니다. 매매신호로는 2026년 7월 2일, 7월 14일, 7월 30일에 연속적으로 '매도(sell)' 신호가 발생하며 하락 추세의 지속을 알리고 있습니다.

상위 시간대인 주봉 추세는 약세 흐름을 보이고 있습니다. 분봉 및 시간봉 차트는 별도 화면에서 확인 가능하나 이 지표 분석은 일봉 기준으로 수행되었습니다.

기술적 지표상 지지선은 스윙 저점이자 돈치안 하단인 189,200원과 POC 192,418원 부근이며, 저항선은 스윙 고점 374,500원과 돈치안 상단 325,000원입니다. 현재가는 VWAP(260,302원) 부근에서 공방을 벌이고 있으나, 엘더 임펄스 지표상 하락 모멘텀이 진행 중이므로 반전 전까지 신규 매수는 리스크가 큽니다.

종합적으로 판단할 때, 기술적 지표와 매매 신호가 하락 추세를 가리키고 있어 현재의 반등을 추세 전환으로 보기 어렵습니다. 따라서 삼성전자에 대한 기술적 분석 판정은 '하락'입니다.

본 분석은 투자 참고 자료이며, 모든 투자의 책임은 투자자 본인에게 있습니다.`;

const SYSTEM_INSTRUCTION = `
당신은 한국 주식시장 기술적 분석 전문가입니다. 아래 [예시 리포트]와 정확히 같은 단락
개수·순서·문장 구조·어조·분량으로, 사용자가 제공하는 종목의 기술적 지표 수치를 반영한
한국어 분석 리포트를 작성하세요. 예시는 문체와 구성의 기준일 뿐이니 숫자·종목명·날짜는
반드시 실제 입력값으로 바꾸고, 지어낸 수치나 근거는 절대 추가하지 마세요. 데이터에 없는
지표(예: elder_impulse 필드가 없으면 엘더 임펄스)는 언급하지 마세요.

[예시 리포트]
${EXAMPLE_REPORT}
[예시 끝]

각 단락은 순서대로: 1) 현재가·전일 종가 대비 등락·이동평균선 위치, 2) RSI·MACD·
볼린저밴드·ADX(+DI/-DI), 3) 캔들 패턴과 매매신호 전환 이력(없으면 "감지된 패턴
없음"이라고 명시), 4) 상위 시간대(주봉) 추세 — 분·시간봉은 "별도 화면에서 확인 가능하나
이 지표 분석은 일봉 기준"이라고만 짧게 언급, 5) 지지선·저항선과 리스크 요인(엘더 임펄스
데이터가 있으면 여기서 언급), 6) 종합 판단 — 반드시 미리 정해진 판정(아래 [판정])과
모순되지 않게 서술. 마지막에 투자 조언이 아닌 참고 자료라는 문장을 예시와 같은 위치에
넣으세요.
`;

export async function POST(req: Request) {
  try {
    const { name, code, price, livePrice, indicators, extra } = await req.json();
    const ind = indicators ?? {};
    const ex = extra ?? {};
    // 일봉 지표(RSI/MA/MACD/BB)는 herencia-ta 기준 그대로 두되, "현재가"만 실시간(지연
    // 포함) 시세로 대체해 판정·서술에 반영한다 — 지표 자체를 분봉으로 다시 계산하진 않는다.
    const effectivePrice = livePrice ?? ind.close ?? price;

    const signal = computeApproxSignal({
      date: '', open: null, high: null, low: null, close: effectivePrice,
      rsi: ind.rsi, ma5: ind.ma5, ma20: ind.ma20, bb_upper: ind.bb_upper, bb_lower: ind.bb_lower, macd_hist: ind.macd_hist,
    });
    const verdict = VERDICT_MAP[signal];

    const indicatorCount = Object.values(ind).filter(v => v != null).length + Object.values(ex).filter(v => v != null).length;

    const priceChangeNote = (livePrice != null && ind.close != null && ind.close !== 0)
      ? `(전일 종가 ${ind.close.toLocaleString()}원 대비 ${(((livePrice - ind.close) / ind.close) * 100).toFixed(2)}%)`
      : '';

    const prompt = `
[종목 정보]
- 종목명: ${name} (${code})
- 현재가(실시간, 최대 15~20분 지연 가능): ${effectivePrice != null ? effectivePrice.toLocaleString() + '원' : '미정'} ${priceChangeNote}
- 전일 종가: ${ind.close != null ? ind.close.toLocaleString() + '원' : '미정'}

[herencia-ta 기술적 지표 (일봉 기준)]
${JSON.stringify(ind, null, 2)}

[추가 계산 지표]
- ADX: ${ex.adx != null ? ex.adx.toFixed(2) : '데이터 부족'} / +DI: ${ex.plusDI != null ? ex.plusDI.toFixed(2) : '-'} / -DI: ${ex.minusDI != null ? ex.minusDI.toFixed(2) : '-'}
- 최근 캔들 패턴: ${ex.patterns?.length ? JSON.stringify(ex.patterns) : '감지된 패턴 없음'}
- 최근 매매신호 전환: ${ex.signalFlips?.length ? JSON.stringify(ex.signalFlips.slice(-3)) : '없음'}
- 상위 시간대(주봉) 추세: ${ex.weeklyTrend?.label ?? '중립'}${ex.weeklyTrend?.insufficient ? ' (데이터 부족)' : ''}
- 하위 시간대(분/시간봉): 데이터 없음

[판정]
${verdict}
`;

    const response = await getGenAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      // 종목마다 리포트 구조가 들쭉날쭉하다는 피드백 — 낮은 temperature로 예시([예시 리포트])
      // 구조를 더 일관되게 따르게 한다.
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 },
    });

    const text = response.text || '분석을 생성할 수 없습니다.';
    return NextResponse.json({
      success: true,
      verdict,
      text,
      indicatorCount,
      livePrice: effectivePrice,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'AI 분석 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
