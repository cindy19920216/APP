import { StockDataPoint } from '../types';

export interface StockDatasetInfo {
  id: string;
  name: string;
  ticker: string;
  category: 'KOSPI' | 'US_TECH' | 'INTRADAY';
  timeframe: string;
  description: string;
  data: StockDataPoint[];
}

// Helper to generate smooth candle sequences with realistic OHLCV
function generateCandles(
  basePrice: number,
  count: number,
  trendFn: (i: number) => { priceDelta: number; volMult: number }
): StockDataPoint[] {
  const points: StockDataPoint[] = [];
  let currClose = basePrice;
  const startDate = new Date(2026, 0, 5);

  for (let i = 0; i < count; i++) {
    const { priceDelta, volMult } = trendFn(i);
    const open = currClose + (Math.random() - 0.5) * (basePrice * 0.005);
    currClose = Math.max(10, open + priceDelta + (Math.random() - 0.48) * (basePrice * 0.012));

    const high = Math.max(open, currClose) + Math.random() * (basePrice * 0.012);
    const low = Math.min(open, currClose) - Math.random() * (basePrice * 0.012);
    const volume = Math.round((500000 + Math.random() * 400000) * volMult);

    const d = new Date(startDate);
    d.setDate(d.getDate() + i + Math.floor(i / 5) * 2); // skip weekends roughly

    const change = Math.round(currClose - open);
    const changePercent = Math.round((change / open) * 10000) / 100;

    points.push({
      date: d.toISOString().split('T')[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(currClose),
      volume,
      change,
      changePercent,
    });
  }
  return points;
}

// 1. 삼성전자: 바닥 형성 후 5/20/60일선 정배열 급등 패턴
const samsungData = generateCandles(71000, 70, (i) => {
  if (i < 20) {
    // 횡보 및 20일선 수축
    return { priceDelta: (Math.random() - 0.52) * 300, volMult: 0.7 };
  } else if (i < 35) {
    // 골든 크로스 발생 & 원만한 상승
    return { priceDelta: 400 + Math.random() * 300, volMult: 1.4 };
  } else if (i < 55) {
    // 강력한 정배열 상승추세
    return { priceDelta: 600 + Math.random() * 500, volMult: 2.2 };
  } else {
    // 고점 숨고르기 눌림목
    return { priceDelta: -100 + (Math.random() - 0.5) * 400, volMult: 0.9 };
  }
});

// 2. 엔비디아 (NVIDIA): VCP 변동성 수축 후 신고가 폭발 패턴
const nvidiaData = generateCandles(110, 75, (i) => {
  if (i < 25) {
    // 1차 파동 수축 (30% 변동)
    const sinVal = Math.sin(i / 3) * 3;
    return { priceDelta: sinVal, volMult: 1.0 };
  } else if (i < 45) {
    // 2차 파동 수축 (15% 변동)
    const sinVal = Math.sin(i / 2) * 1.5;
    return { priceDelta: sinVal, volMult: 0.7 };
  } else if (i < 55) {
    // 3차 극소 수축 (거래량 말라붙음)
    return { priceDelta: (Math.random() - 0.5) * 0.4, volMult: 0.4 };
  } else {
    // 신고가 폭발 돌파
    return { priceDelta: 2.5 + Math.random() * 1.5, volMult: 3.5 };
  }
});

// 3. 테슬라 (TESLA): 지지선 반등 & RSI 과매도(30) 상승 다이버전스
const teslaData = generateCandles(220, 65, (i) => {
  if (i < 30) {
    // 지루한 급락세 (역배열)
    return { priceDelta: -2.2 - Math.random() * 1.5, volMult: 1.5 };
  } else if (i < 42) {
    // 지지선(180$) 터치 후 RSI 상승 다이버전스 발생
    return { priceDelta: (Math.random() - 0.4) * 0.8, volMult: 0.8 };
  } else {
    // V자 반등 및 20일선 상향 돌파
    return { priceDelta: 3.0 + Math.random() * 2.0, volMult: 2.1 };
  }
});

// 4. KOSPI 지수: 역배열 하락세 및 가짜 반등(Trap) 패턴
const kospiData = generateCandles(2750, 60, (i) => {
  if (i < 20) {
    return { priceDelta: -12 - Math.random() * 8, volMult: 1.2 };
  } else if (i < 32) {
    // 가짜 기술적 반등 (20일선 저항에 막힘)
    return { priceDelta: 8 + Math.random() * 5, volMult: 0.8 };
  } else {
    // 2차 하락 파동
    return { priceDelta: -15 - Math.random() * 10, volMult: 1.6 };
  }
});

// 5. SK하이닉스 (5분봉): 단타 세력 수급 유입 및 거래량 300% 폭발
const intradaySkData = generateCandles(185000, 50, (i) => {
  if (i < 15) {
    return { priceDelta: (Math.random() - 0.5) * 300, volMult: 0.5 };
  } else if (i < 25) {
    // 대량 거래량 분봉 상한가 돌파
    return { priceDelta: 1200 + Math.random() * 800, volMult: 4.2 };
  } else if (i < 38) {
    // 고가권 횡보 및 차익실현
    return { priceDelta: (Math.random() - 0.5) * 400, volMult: 1.1 };
  } else {
    // 2차 상승 파동
    return { priceDelta: 800 + Math.random() * 600, volMult: 2.8 };
  }
});

export const STOCK_DATASETS: StockDatasetInfo[] = [
  {
    id: 'samsung',
    name: '삼성전자 (정배열 골든크로스)',
    ticker: '005930.KS',
    category: 'KOSPI',
    timeframe: '일봉',
    description: '5일/20일/60일선이 정배열로 전환되며 거래량이 실리는 대표적 우량주 골든크로스 시나리오',
    data: samsungData,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA (VCP 수축 신고가 돌파)',
    ticker: 'NVDA',
    category: 'US_TECH',
    timeframe: '일봉',
    description: '마크 미네르비니의 VCP 패턴대로 변동성이 좁아진 뒤 거래량 폭발과 함께 52주 신고가 돌파 시나리오',
    data: nvidiaData,
  },
  {
    id: 'tesla',
    name: '테슬라 (지지선 반등 & RSI 다이버전스)',
    ticker: 'TSLA',
    category: 'US_TECH',
    timeframe: '일봉',
    description: 'RSI 지표가 30 이하 과매도에 진입하고 주요 전고점 지지선에서 강한 양봉 망치형 꼬리를 다는 바닥 반등 패턴',
    data: teslaData,
  },
  {
    id: 'kospi',
    name: 'KOSPI 지수 (역배열 및 20일선 저항)',
    ticker: 'KOSPI',
    category: 'KOSPI',
    timeframe: '일봉',
    description: '이평선이 역배열인 상태에서 반등을 시도하나 20일 이동평균선 저항에 부딪히는 하락추세 예시',
    data: kospiData,
  },
  {
    id: 'sk_intraday',
    name: 'SK하이닉스 (5분봉 수급 단타 패턴)',
    ticker: '000660.KS',
    category: 'INTRADAY',
    timeframe: '5분봉',
    description: '장 시작 후 거래량이 전일 평균 대비 300% 이상 터지며 분봉 상단 돌파를 만드는 실시간 스캘핑 패턴',
    data: intradaySkData,
  },
];
