export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change?: number;
  changePercent?: number;
}

export interface ComputedIndicators {
  ma5?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  rsi?: number;
  upperBB?: number;
  middleBB?: number;
  lowerBB?: number;
  macdLine?: number;
  signalLine?: number;
  macdHist?: number;
  alignment: '정배열' | '역배열' | '혼조세';
}

export interface IndicatorSettings {
  showMA5: boolean;
  showMA20: boolean;
  showMA60: boolean;
  showMA120: boolean;
  rsiEnabled: boolean;
  rsiPeriod: number;
  bollingerEnabled: boolean;
  macdEnabled: boolean;
  volumeEnabled: boolean;
  showSupportResistance: boolean;
}

export interface ChartPreset {
  id: string;
  name: string;
  guruName?: string;
  description: string;
  badge: string;
  settings: IndicatorSettings;
}

export interface LessonTopic {
  id: string;
  category: '봉차트' | '이평선' | 'RSI' | 'ADR' | 'MACD' | '볼린저' | '거래량' | '펀더멘털';
  title: string;
  summary: string;
  difficulty: '초급' | '중급' | '고급';
  iconName: string;
  keyPoints: string[];
  detailedContent: string[];
  guruInsight: string;
}

export interface GuruGuide {
  id: string;
  name: string;
  englishName: string;
  title: string;
  quote: string;
  corePhilosophy: string;
  mustCheckRules: string[];
  preferredSetup: string;
  presetId: string;
  chartPatternTitle: string;
  chartPatternDescription: string;
}

export interface QuizChartRef {
  ticker: string; // 야후 파이낸스 심볼 (예: '005930.KS', 'AAPL')
  market: 'KOSPI' | 'S&P500';
  name: string; // 표시용 종목명
  asOfDate: string; // 이 날짜까지의 실제 데이터로 차트를 자른다 (YYYY-MM-DD)
}

export interface QuizItem {
  id: string;
  category: string;
  difficulty: '초급' | '중급' | '고급';
  question: string;
  isCorrectOX: boolean; // true = O, false = X
  explanation: string;
  indicatorTag: string;
  chart?: QuizChartRef; // 실제 종목·날짜 기반 차트 예시 (없으면 텍스트 개념 문제)
}

export interface PracticeScenario {
  id: string;
  title: string;
  stockName: string;
  ticker: string;
  timeframe: string;
  difficulty: '쉬움' | '보통' | '어려움';
  description: string;
  dataPoints: StockDataPoint[];
  revealIndex: number; // Initially reveal up to this index
  scenarioQuestion: string;
  choices: {
    id: 'BUY' | 'PASS' | 'SELL';
    label: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  keyTechnicalPoints: string[];
}
