import { GuruGuide } from '../types';

export const GURU_DATA: GuruGuide[] = [
  {
    id: 'minervini',
    name: '마크 미네르비니',
    englishName: 'Mark Minervini',
    title: '미국 주식 투자 챔피언십 우승자 (SEPA 전략)',
    quote: '위험 관리가 최우선이다. 손절선을 정하지 않고 차트를 보는 것은 무기 없이 전장에 나가는 것과 같다.',
    corePhilosophy:
      'VCP(변동성 수축 패턴)와 트렌드 템플릿(Trend Template)을 사용하여 기관 매집 후 급등 직전의 차트 타점을 잡는다.',
    mustCheckRules: [
      '주가가 반드시 150일, 200일 이동평균선 위에 위치할 것',
      '200일 이동평균선이 최소 1개월 이상 상승 추세일 것',
      '50일 이동평균선이 150일, 200일 이동평균선 위에 위치할 것 (정배열)',
      '주가가 52주 저점 대비 최소 30% 이상 상승해 있을 것',
      'VCP(변동성 수축): 차트 오른쪽으로 갈수록 파동의 크기(변동 폭)가 줄어들고 거래량이 급감할 것',
    ],
    preferredSetup: '50MA, 150MA, 200MA 정배열 + VCP 피봇 돌파 + 거래량 200% 폭발',
    presetId: 'minervini_preset',
    chartPatternTitle: 'VCP (Volatility Contraction Pattern)',
    chartPatternDescription:
      '주가가 조정을 받을 때 파동의 폭이 30% -> 15% -> 5%로 점점 좁혀지며 매물 오버행이 소화되는 형태입니다. 마지막 가장 좁은 수축 지점에서 거래량이 말라붙었다가 거래량이 터지며 상향 돌파할 때 매수합니다.',
  },
  {
    id: 'stan_weinstein',
    name: '스테인스타인',
    englishName: 'Stan Weinstein',
    title: '차트 파동 4단계 이론의 거장',
    quote: '30주(150일) 이동평균선이 눕거나 하락하는 종목은 절대 사지 마라. 매수는 반드시 2단계 상승장에서만 한다.',
    corePhilosophy:
      '주가의 일생을 1단계(바닥 축적기), 2단계(상승 파동기), 3단계(고점 상투기), 4단계(하락 쇠퇴기)로 나누어 오직 2단계에서만 매수한다.',
    mustCheckRules: [
      '1단계(축적기): 주가가 바닥에서 지루하게 박스권을 형성하며 30주 이평선이 평평해짐',
      '2단계(돌파 및 상승기): 대량 거래량과 함께 박스권 상단과 30주 이평선을 위로 뚫음 -> ★매수 적기',
      '3단계(고점 형성기): 상승 모멘텀이 둔화되고 30주 이평선 위에서 출렁거림 -> 분할 매도',
      '4단계(하락 파동기): 30주 이평선이 하향 이탈하며 역배열 -> 절대 매수 금지',
    ],
    preferredSetup: '30주(150일) 이평선 2단계 돌파 + 대량 거래량 동반',
    presetId: 'stan_preset',
    chartPatternTitle: '2단계 상승 파동 돌파 (Stage 2 Breakout)',
    chartPatternDescription:
      '수개월간 형성된 횡보 박스권을 대량 거래량으로 강하게 돌파하며 150일선이 완벽한 우상향 곡선을 그리는 형태입니다.',
  },
  {
    id: 'livermore',
    name: '제시 리버모어',
    englishName: 'Jesse Livermore',
    title: '월가 전설의 추세추적 매매자',
    quote: '돈을 벌어다 주는 것은 나의 머리가 아니라 나의 엉덩이다. 추세가 유지되는 한 끈기 있게 견뎌라.',
    corePhilosophy:
      '피봇 포인트(Pivot Point)라고 불리는 결정적 추세 전환 및 저항 돌파 지점에서 강력하게 매수하고 손절은 10% 이내로 엄격하게 관리한다.',
    mustCheckRules: [
      '최소 저항선(Line of Least Resistance)을 따라 매매할 것',
      '역사적 신고가 또는 장기 저항선을 거래량을 실어 돌파할 때 진입',
      '첫 매수 후 주가가 예측대로 움직일 때만 추가 매수(물타기 절대 금지, 삐라미딩 승수 매수)',
      '매수가 대비 7~10% 손실 시 무조건 기계적으로 손절',
    ],
    preferredSetup: '신고가 피봇 포인트 돌파 + 폭발적 수급',
    presetId: 'livermore_preset',
    chartPatternTitle: '피봇 포인트 신고가 돌파 (Pivot Breakout)',
    chartPatternDescription:
      '수개월간 아무도 넘지 못했던 전고점(저항선)을 강력한 거래량과 함께 신속하게 돌파하는 타점입니다.',
  },
  {
    id: 'murphy',
    name: '존 머피',
    englishName: 'John Murphy',
    title: '기술적 분석의 성경 저자',
    quote: '추세는 당신의 친구다. 추세와 싸우려 하지 마라.',
    corePhilosophy:
      '지향하는 핵심은 다중 타임프레임 분석, 추세선 및 지지와 저항의 단순하면서도 강력한 법칙을 준수하는 것입니다.',
    mustCheckRules: [
      '상승 추세선은 저점과 저점을 연결, 하락 추세선은 고점과 고점을 연결',
      '지지선이 무너지면 강력한 저항선으로 변하고, 저항선이 뚫리면 강력한 지지선이 된다 (역할 전환)',
      '이동평균선 골든크로스와 RSI 50 상향 돌파의 중복 확인',
    ],
    preferredSetup: '5일/20일/60일 정배열 + 추세선 지지 반등',
    presetId: 'classic_trend_preset',
    chartPatternTitle: '지지선 반등 및 역할 전환 (Support Role Reversal)',
    chartPatternDescription:
      '과거의 강한 저항선이었던 가격대가 돌파된 후, 다시 주가가 눌릴 때 강력한 지지선으로 작용하여 튕겨 오르는 형태입니다.',
  },
  {
    id: 'oneil',
    name: '윌리엄 오닐',
    englishName: 'William O\'Neil',
    title: 'CAN SLIM 시스템 개발자 & IBD 창립자',
    quote: '싸다고 사지 마라. 최고의 주식은 최고가 근처에서 제대로 된 차트 패턴을 만들며 터진다.',
    corePhilosophy:
      '실적 성장성(CAN SLIM)과 차트상의 Cup-with-Handle(손잡이가 달린 컵) 패턴을 조합하여 사상 최고가를 경신하는 주도주를 산다.',
    mustCheckRules: [
      'C: 당기 분기 EPS 25% 이상 급증',
      'A: 연간 이익 성장률 25% 이상',
      'N: 신제품, 신경영, 신고가 차트 패턴',
      'S: 주식수와 수급 (거래량 급증)',
      'L: 주도주(Leader) 매수, 소외주 피하기',
      'I: 기관 매집 흔적 확인',
      'M: 시장 지수 방향성 확인',
    ],
    preferredSetup: 'Cup with Handle 패턴 + 신고가 돌파 거래량',
    presetId: 'oneil_preset',
    chartPatternTitle: '손잡이 달린 컵 패턴 (Cup with Handle)',
    chartPatternDescription:
      'U자형의 매집 컵 모양 이후 오른쪽 상단에서 변동성이 극도로 줄어드는 3~10% 수준의 손잡이 조정을 거친 뒤 전고점을 돌파하는 형태입니다.',
  },
];
