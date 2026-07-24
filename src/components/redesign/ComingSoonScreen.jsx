"use client";

import React from 'react';

// "공부하기" 하위 탭 중 아직 콘텐츠가 없는 곳에 쓰는 공통 준비중 화면.
export default function ComingSoonScreen({ icon, title, subtitle, points }) {
  return (
    <div className="tab-wrap">
      <div style={S.wrap}>
        <div style={S.iconCircle}>
          <i className={`ti ${icon}`} style={{ fontSize: 26, color: '#7F77DD' }} />
        </div>
        <div style={S.title}>{title}</div>
        <div style={S.subtitle}>{subtitle}</div>

        {points?.length > 0 && (
          <div style={S.pointCard}>
            {points.map((p, i) => (
              <div key={i} style={{ ...S.pointRow, borderBottom: i < points.length - 1 ? '0.5px solid #151520' : 'none' }}>
                <i className="ti ti-point" style={{ fontSize: 9, color: '#7F77DD', marginTop: 4, flexShrink: 0 }} />
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}

        <div style={S.badge}>준비 중</div>
      </div>
    </div>
  );
}

const S = {
  wrap: {
    minHeight: '100%', padding: '48px 20px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: '50%', background: '#7F77DD1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 12, color: '#666', lineHeight: 1.7, maxWidth: 300, marginBottom: 20 },

  pointCard: {
    width: '100%', maxWidth: 360, background: '#181820', borderRadius: 12,
    overflow: 'hidden', textAlign: 'left', marginBottom: 20,
  },
  pointRow: {
    display: 'flex', gap: 8, padding: '11px 14px',
    fontSize: 11.5, color: '#999', lineHeight: 1.6,
  },

  badge: {
    fontSize: 10.5, fontWeight: 600, color: '#555',
    background: '#181820', border: '0.5px solid #23232f',
    borderRadius: 8, padding: '4px 12px',
  },
};
