"use client";

import React, { useState, useEffect } from 'react';
import useIsDesktop from '@/hooks/useIsDesktop';

// "공부하기 > Econ Idea" 탭: ISABELNET(제휴 게재 허락) 블로그 최신 차트 5개를 보여준다.
// 모바일은 세로 1열, 데스크톱은 2열 그리드(2x2)로 배치. 제목은 한글 번역본(titleKo)을
// 우선 쓰고, 아직 번역 전이면 원문(title)으로 대체 표시한다.

export default function EconIdeaScreen() {
  const isDesktop = useIsDesktop();
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    fetch('/data/isabelnet_charts.json')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCharts(d))
      .catch(() => setCharts([]));
  }, []);

  return (
    <div className="tab-wrap">
      <div style={S.wrap}>
        <div style={S.header}>
          <div style={S.iconCircle}>
            <i className="ti ti-world" style={{ fontSize: 22, color: '#7F77DD' }} />
          </div>
          <div>
            <div style={S.title}>Econ Idea</div>
            <div style={S.subtitle}>거시경제 지표와 시장 사이클을 차트로 쉽게 풀어드려요.</div>
          </div>
        </div>

        <div style={S.sectionLabel}>오늘의 차트</div>

        {charts === null && <div style={S.emptyText}>불러오는 중…</div>}
        {charts !== null && charts.length === 0 && (
          <div style={S.emptyText}>아직 차트가 없어요. 잠시 후 다시 확인해주세요.</div>
        )}

        <div style={isDesktop ? S.grid : S.list}>
          {charts?.map((item, i) => (
            <a key={i} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={S.postCard}>
              <div style={S.postImgWrap}>
                <img src={item.image} alt={item.titleKo || item.title} style={S.postImg} />
              </div>
              <div style={S.postBody}>
                <div style={S.postTitle}>{item.titleKo || item.title}</div>
                {(item.descKo || item.desc) && (
                  <div style={S.postDesc}>{item.descKo || item.desc}</div>
                )}
                <div style={S.postMetaRow}>
                  <span style={S.postDate}>{item.date}</span>
                  <span style={S.postCredit}>{item.credit ?? 'Source: ISABELNET'}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: { minHeight: '100%', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 },

  header: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  iconCircle: { width: 44, height: 44, borderRadius: '50%', background: '#7F77DD1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#888', lineHeight: 1.6 },

  sectionLabel: { fontSize: 12.5, fontWeight: 600, color: '#999', marginTop: 6, marginBottom: 2 },
  emptyText: { padding: '24px 0', textAlign: 'center', color: '#666', fontSize: 13 },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 },

  postCard: {
    display: 'flex', flexDirection: 'column',
    background: '#181820', border: '0.5px solid #23232f', borderRadius: 14,
    overflow: 'hidden', textDecoration: 'none',
    width: '100%',
  },
  postImgWrap: { display: 'flex', justifyContent: 'center', background: '#0e0e14' },
  postImg: { width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' },
  postBody: { padding: '12px 14px 14px' },
  postTitle: { fontSize: 13.5, fontWeight: 600, color: '#eee', lineHeight: 1.5, wordBreak: 'keep-all' },
  postDesc: { fontSize: 11.5, color: '#999', lineHeight: 1.6, wordBreak: 'keep-all', marginTop: 6 },
  postMetaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  postDate: { fontSize: 10.5, color: '#666' },
  postCredit: { fontSize: 10.5, color: '#555' },
};
