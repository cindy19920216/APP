// kospi_capitulation_index.py(저장소 루트, 독립 실행 스크립트)의 산출물
// outputs/kospi_capitulation_index.csv를 Sentiment Indicator > "나만의 지표" 탭용
// 정적 스냅샷(public/data/capitulation_snapshot.json)으로 변환한다.
// v1은 정적 스냅샷이라, python kospi_capitulation_index.py를 다시 돌린 뒤 이 스크립트를
// 수동으로 재실행해서 갱신한다(sentiment_snapshot.json과 동일한 컨벤션).
//
// 사용법: node scripts/import_capitulation_snapshot.js

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'outputs', 'kospi_capitulation_index.csv');
const OUT_JSON = path.join(__dirname, '..', 'public', 'data', 'capitulation_snapshot.json');

// CSV의 5개 구성지표 컬럼(vkospi/sell_pressure/credit_growth/breadth_200ma/credit_spread)은
// 계산 편의상 "양수=패닉"으로 정렬된 원시 z-score라, 최종 Capitulation_Index와 같은
// "음수=항복(패닉), 양수=과열" 규약으로 보여주기 위해 부호를 반전해서 내보낸다.
const COMPONENT_LABELS = {
  vkospi: '변동성 (VKOSPI 대용치)',
  sell_pressure: '개인 순매도 강도',
  credit_growth: '신용융자 잔고 증감',
  breadth_200ma: '200일선 상회 비율',
  credit_spread: '신용 스프레드',
};

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
  const headers = lines[0].split(',');
  headers[0] = 'date';
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] === undefined || cells[i] === '' ? null : Number(cells[i]);
    });
    row.date = cells[0];
    return row;
  });
}

function getBand(value) {
  if (value <= -2) return { key: 'extreme_capitulation', label: '극단적 항복 (강한 매수 관심)', color: '#1D9E75' };
  if (value <= -1) return { key: 'capitulation', label: '항복/과매도 (매수 관심)', color: '#1D9E75' };
  if (value >= 1) return { key: 'euphoria', label: '과열 (매도 관심)', color: '#E24B4A' };
  return { key: 'neutral', label: '중립 (관망)', color: '#999999' };
}

function percentileRank(values, value) {
  const sorted = values.slice().sort((a, b) => a - b);
  let i = 0;
  while (i < sorted.length && sorted[i] < value) i++;
  return Math.round((i / sorted.length) * 100);
}

function buildInterpretation(band, value, pct, yearsSpan) {
  const pctText = `지난 ${yearsSpan}년(2008년~) 데이터 중 하위 ${pct}% 수준`;
  if (band.key === 'extreme_capitulation') {
    return `현재 지수는 ${value.toFixed(2)}로, ${pctText}입니다. 2008년 금융위기·2020년 코로나 급락 때와 비슷한 정도의 극단적인 항복성 매도가 나타난 구간으로, 역사적으로는 이런 구간 이후 반등이 나온 사례가 많았습니다.`;
  }
  if (band.key === 'capitulation') {
    return `현재 지수는 ${value.toFixed(2)}로, ${pctText}입니다. 평소보다 매도 압력이 강하게 누적된 항복/과매도 구간에 있습니다.`;
  }
  if (band.key === 'euphoria') {
    return `현재 지수는 ${value.toFixed(2)}로, ${pctText}입니다. 시장 참여자들의 낙관·매수 심리가 강하게 쏠린 과열 구간으로, 단기 변동성 확대에 유의할 필요가 있습니다.`;
  }
  return `현재 지수는 ${value.toFixed(2)}로, ${pctText}입니다. 항복(패닉)도 과열(euphoria)도 아닌 중립적인 구간입니다.`;
}

function main() {
  const rows = parseCsv(CSV_PATH);
  const validRows = rows.filter(r => r.Capitulation_Index !== null);
  if (validRows.length === 0) {
    throw new Error('Capitulation_Index 값이 있는 행이 없습니다 — CSV 확인 필요');
  }

  const latest = validRows[validRows.length - 1];
  const allValues = validRows.map(r => r.Capitulation_Index);
  const value = latest.Capitulation_Index;
  const band = getBand(value);
  const pct = percentileRank(allValues, value);
  const firstDate = validRows[0].date;
  const lastDate = latest.date;
  const yearsSpan = Math.round(
    (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  );

  // 구성지표별 히스토리: 각 지표는 실데이터 시작 시점이 서로 달라(예: 신용 스프레드는
  // ECOS 조회 범위, 개인 순매도는 네이버 페이지네이션 범위) 컬럼 값이 있는 행만 포함한다
  // (composite 계산에 쓰인 validRows 전체가 아니라 지표 자신의 실제 데이터 구간).
  const components = Object.keys(COMPONENT_LABELS).map(key => ({
    key,
    label: COMPONENT_LABELS[key],
    value: latest[key] === null ? null : -latest[key],
    history: rows
      .filter(r => r[key] !== null)
      .map(r => ({ date: r.date, value: -r[key] })),
  }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'kospi_capitulation_index.py (프로토타입, KRX 미의존 — Yahoo Finance/네이버금융/KOFIA/한국은행 ECOS)',
    asOf: lastDate,
    value,
    band,
    percentile: pct,
    interpretation: buildInterpretation(band, value, pct, yearsSpan),
    components,
    history: validRows.map(r => ({ date: r.date, value: r.Capitulation_Index })),
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`Wrote ${OUT_JSON} (${validRows.length} history points, asOf ${lastDate}, value ${value.toFixed(3)})`);
}

main();
