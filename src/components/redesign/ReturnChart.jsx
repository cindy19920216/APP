"use client";

// ─────────────────────────────────────────────
//  ReturnChart.jsx  –  수익률 히스토리 차트
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const PERIODS = [
  { key: '1w', label: '1주' },
  { key: '1m', label: '1달' },
  { key: '3m', label: '3달' },
];

export default function ReturnChart({ chartData }) {
  const [period, setPeriod] = useState('1w');

  if (!chartData || !chartData[period]) return null;

  const { labels, values } = chartData[period];
  const allNeg = values.every((v) => v <= 0);
  const lineColor = allNeg ? '#E24B4A' : '#1D9E75';

  const data = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: lineColor,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: lineColor,
        pointBorderColor: '#181820',
        pointBorderWidth: 1.5,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => (ctx.parsed.y >= 0 ? '+' : '') + ctx.parsed.y.toFixed(1) + '%',
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 10 }, color: '#555' },
        grid: { display: false },
        border: { color: '#2a2a35' },
      },
      y: {
        ticks: {
          font: { size: 10 },
          color: '#555',
          callback: (v) => (v >= 0 ? '+' : '') + v + '%',
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: '#2a2a35' },
      },
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>수익률 히스토리</span>
        <div style={styles.periodRow}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              style={{
                ...styles.pbtn,
                ...(period === p.key ? styles.pbtnActive : {}),
              }}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.chartArea}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#181820',
    borderRadius: 14,
    padding: 14,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: 500,
    color: '#ccc',
  },
  periodRow: {
    display: 'flex',
    gap: 4,
  },
  pbtn: {
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 6,
    border: '0.5px solid #2a2a35',
    background: 'transparent',
    color: '#555',
    cursor: 'pointer',
  },
  pbtnActive: {
    background: '#EEEDFE',
    color: '#3C3489',
    border: 'none',
  },
  chartArea: {
    height: 110,
    position: 'relative',
  },
};
