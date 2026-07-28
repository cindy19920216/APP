import { NextResponse } from 'next/server';
import { getGenAI, GEMINI_MODEL } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION = `
당신은 대한민국 최고의 주식 기술적 분석 전문가이자 '주린이(주식 초보자)'를 친절하게 이끄는 멘토 '차트 닥터 AI'입니다.
사용자가 제공한 기술적 지표 정보와 질문을 바탕으로, 명쾌하고 이해하기 쉬우며 실전 학습에 도움이 되는 답변을 제공하세요.

답변 작성 규칙:
1. 주린이 눈높이에 맞춰 어려운 용어는 쉬운 예시와 함께 설명합니다.
2. 현재 차트 상태(정배열/역배열, 이평선 위치, RSI 수치, 볼린저밴드, 거래량 등)를 종합적으로 점검해 줍니다.
3. 구루들(미네르비니, 리버모어, 존머피 등)의 핵심 원칙 중 연결할 수 있는 법칙을 짧게 언급합니다.
4. 매수/매도 추천은 '투자 참고용 학습 자료'임을 명시하고, 기술적 관점에서의 핵심 지지선과 저항선, 손절선 설정 기준을 가이드합니다.
5. 가독성이 좋게 가벼운 마크다운 formatting과 이모지를 적절히 사용하세요.
`;

export async function POST(req: Request) {
  try {
    const { stockName, timeframe, currentPrice, technicals, userQuestion } = await req.json();

    const prompt = `
[주식 차트 데이터]
- 종목명: ${stockName || '샘플 종목'}
- 타임프레임: ${timeframe || '일봉'}
- 현재가: ${currentPrice ? currentPrice.toLocaleString() + '원' : '미정'}
- 기술적 지표 현황: ${JSON.stringify(technicals || {}, null, 2)}

[사용자 질문 / 분석 요청]
${userQuestion || '이 차트의 핵심 기술적 포인트와 지지/저항선, RSI 및 이평선 상태를 쉽게 분석해주세요.'}
`;

    const response = await getGenAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const text = response.text || '답변을 생성할 수 없습니다.';
    return NextResponse.json({ success: true, answer: text });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gemini API 호출 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
