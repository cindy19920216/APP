// AI 금융_FINAL(텔레그램+뉴스 감성 기반 테마 분석)의 results/ 산출물을
// Sentiment Indicator 탭용 정적 스냅샷(public/data/sentiment_snapshot.json)으로 변환한다.
// v1은 정적 스냅샷이라 이 스크립트는 분석을 새로 돌린 뒤 수동으로 재실행해서 갱신한다.
//
// 사용법: node scripts/import_sentiment_snapshot.js

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'AI 금융_FINAL', 'results');
const OUT_JSON = path.join(__dirname, '..', 'public', 'data', 'sentiment_snapshot.json');
const OUT_CHARTS_DIR = path.join(__dirname, '..', 'public', 'sentiment-charts');

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

function buildThemes(rows) {
  const byTheme = {};
  rows.forEach(r => {
    const theme = r.theme;
    if (!byTheme[theme]) byTheme[theme] = [];
    byTheme[theme].push({
      rank: Number(r.rank),
      stock: r.stock,
      upProb: Number(r.avg_up_prob),
      sentimentCorr: Number(r.sentiment_corr),
      totalScore: Number(r.total_score),
    });
  });
  Object.values(byTheme).forEach(list => list.sort((a, b) => a.rank - b.rank));
  return byTheme;
}

function buildMonthly(rows) {
  const byMonth = {};
  rows.forEach(r => {
    const month = r.month;
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month][Number(r.rank) - 1] = r.theme;
  });
  return Object.keys(byMonth).sort().map(month => ({ month, top: byMonth[month] }));
}

function main() {
  const themeRows = parseCsv(path.join(SOURCE_DIR, 'final_theme_stocks.csv'));
  const monthlyRows = parseCsv(path.join(SOURCE_DIR, 'monthly_top_themes.csv'));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    analysisRange: '2025-06 ~ 2026-05',
    model: 'XGBoost (TimeSeriesSplit 5-fold) + Gemini LLM 뉴스 감성분석 + 텔레그램 10개 채널 언급량',
    themes: buildThemes(themeRows),
    monthly: buildMonthly(monthlyRows),
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`Wrote ${OUT_JSON}`);

  fs.mkdirSync(OUT_CHARTS_DIR, { recursive: true });
  const charts = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'));
  charts.forEach(f => {
    fs.copyFileSync(path.join(SOURCE_DIR, f), path.join(OUT_CHARTS_DIR, f));
  });
  console.log(`Copied ${charts.length} chart PNGs to ${OUT_CHARTS_DIR}`);
}

main();
