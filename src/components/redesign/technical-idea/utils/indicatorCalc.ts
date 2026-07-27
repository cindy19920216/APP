import { StockDataPoint, ComputedIndicators } from '../types';

export interface EnrichedDataPoint extends StockDataPoint {
  indicators: ComputedIndicators;
}

export function computeIndicators(
  data: StockDataPoint[],
  rsiPeriod: number = 14
): EnrichedDataPoint[] {
  const closes = data.map((d) => d.close);
  const n = data.length;

  // SMA Helper
  const getSMA = (index: number, period: number): number | undefined => {
    if (index < period - 1) return undefined;
    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) {
      sum += closes[i];
    }
    return Math.round(sum / period);
  };

  // Standard Deviation Helper for Bollinger
  const getStdDev = (index: number, period: number, mean: number): number => {
    let sumSq = 0;
    for (let i = index - period + 1; i <= index; i++) {
      sumSq += Math.pow(closes[i] - mean, 2);
    }
    return Math.sqrt(sumSq / period);
  };

  // Calculate EMA array
  const calcEMA = (period: number): (number | undefined)[] => {
    const result: (number | undefined)[] = new Array(n).fill(undefined);
    if (n < period) return result;

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    result[period - 1] = sum / period;

    const multiplier = 2 / (period + 1);
    for (let i = period; i < n; i++) {
      const prevEMA = result[i - 1]!;
      result[i] = (closes[i] - prevEMA) * multiplier + prevEMA;
    }
    return result;
  };

  const ema12 = calcEMA(12);
  const ema26 = calcEMA(26);

  // MACD Line = EMA12 - EMA26
  const macdLines: (number | undefined)[] = new Array(n).fill(undefined);
  for (let i = 0; i < n; i++) {
    if (ema12[i] !== undefined && ema26[i] !== undefined) {
      macdLines[i] = ema12[i]! - ema26[i]!;
    }
  }

  // Signal Line = 9-day EMA of MACD Line
  const signalLines: (number | undefined)[] = new Array(n).fill(undefined);
  // Find first valid MACD index
  const firstMacdIdx = macdLines.findIndex((val) => val !== undefined);
  if (firstMacdIdx !== -1 && n >= firstMacdIdx + 9) {
    let sum = 0;
    for (let i = firstMacdIdx; i < firstMacdIdx + 9; i++) {
      sum += macdLines[i]!;
    }
    signalLines[firstMacdIdx + 8] = sum / 9;
    const k = 2 / (9 + 1);
    for (let i = firstMacdIdx + 9; i < n; i++) {
      if (macdLines[i] !== undefined && signalLines[i - 1] !== undefined) {
        signalLines[i] = (macdLines[i]! - signalLines[i - 1]!) * k + signalLines[i - 1]!;
      }
    }
  }

  // RSI calculation
  const rsiValues: (number | undefined)[] = new Array(n).fill(undefined);
  if (n > rsiPeriod) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= rsiPeriod; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / rsiPeriod;
    let avgLoss = losses / rsiPeriod;

    if (avgLoss === 0) rsiValues[rsiPeriod] = 100;
    else {
      const rs = avgGain / avgLoss;
      rsiValues[rsiPeriod] = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
    }

    for (let i = rsiPeriod + 1; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;

      if (avgLoss === 0) rsiValues[i] = 100;
      else {
        const rs = avgGain / avgLoss;
        rsiValues[i] = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
      }
    }
  }

  return data.map((point, i) => {
    const ma5 = getSMA(i, 5);
    const ma20 = getSMA(i, 20);
    const ma60 = getSMA(i, 60);
    const ma120 = getSMA(i, 120);

    let upperBB: number | undefined;
    let middleBB: number | undefined;
    let lowerBB: number | undefined;

    if (ma20 !== undefined) {
      middleBB = ma20;
      const stdDev = getStdDev(i, 20, ma20);
      upperBB = Math.round(ma20 + 2 * stdDev);
      lowerBB = Math.round(ma20 - 2 * stdDev);
    }

    let alignment: '정배열' | '역배열' | '혼조세' = '혼조세';
    if (ma5 && ma20 && ma60 && ma120) {
      if (ma5 > ma20 && ma20 > ma60 && ma60 > ma120) {
        alignment = '정배열';
      } else if (ma5 < ma20 && ma20 < ma60 && ma60 < ma120) {
        alignment = '역배열';
      }
    }

    const macdLine = macdLines[i] !== undefined ? Math.round(macdLines[i]! * 10) / 10 : undefined;
    const signalLine = signalLines[i] !== undefined ? Math.round(signalLines[i]! * 10) / 10 : undefined;
    const macdHist =
      macdLine !== undefined && signalLine !== undefined
        ? Math.round((macdLine - signalLine) * 10) / 10
        : undefined;

    return {
      ...point,
      indicators: {
        ma5,
        ma20,
        ma60,
        ma120,
        rsi: rsiValues[i],
        upperBB,
        middleBB,
        lowerBB,
        macdLine,
        signalLine,
        macdHist,
        alignment,
      },
    };
  });
}

export function findSupportAndResistance(data: StockDataPoint[]) {
  if (data.length < 10) return { support: 0, resistance: 0 };
  const recent = data.slice(-30);
  const lows = recent.map((d) => d.low);
  const highs = recent.map((d) => d.high);

  const support = Math.min(...lows);
  const resistance = Math.max(...highs);

  return { support, resistance };
}
