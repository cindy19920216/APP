"use client";

import React, { useState, useEffect } from 'react';
import useIsDesktop from '@/hooks/useIsDesktop';

// "공부하기 > Econ Idea" 탭: ISABELNET(제휴 게재 허락) 블로그 최신 차트 5개를 페이지 단위로
// 보여준다. 하루치 5개 차트 = 1페이지이며, page 0(=1페이지)이 가장 최신이고 숫자가 커질수록
// 과거 페이지다 (isabelnet_charts_history.json이 최신순으로 정렬돼 내려온다).
// 블로그가 매일 갱신되진 않아 수집 스크립트가 직전과 동일하면 새 페이지를 만들지 않으므로,
// 페이지 번호가 반드시 달력상의 "하루 전"과 대응하진 않는다 (실제 콘텐츠가 바뀐 시점 기준).
// 모바일은 세로 1열, 데스크톱은 2열 그리드(2x2)로 배치. 제목은 한글 번역본(titleKo)을
// 우선 쓰고, 아직 번역 전이면 원문(title)으로 대체 표시한다.

export default function EconIdeaScreen() {
  const isDesktop = useIsDesktop();
  const [history, setHistory] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    fetch('/data/isabelnet_charts_history.json')
      .then(r => r.ok ? r.json() : [])
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]));
  }, []);

  const totalPages = history?.length ?? 0;
  const currentPage = history?.[pageIndex];
  const charts = currentPage?.charts;

  const goNewer = () => setPageIndex(i => Math.max(0, i - 1));
  const goOlder = () => setPageIndex(i => Math.min(totalPages - 1, i + 1));

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

        <div style={S.sectionRow}>
          <div style={S.sectionLabel}>
            {currentPage ? `${currentPage.runDate} 차트` : '오늘의 차트'}
          </div>
          {totalPages > 1 && (
            <div style={S.pager}>
              <button
                type="button"
                onClick={goNewer}
                disabled={pageIndex === 0}
                style={{ ...S.pagerBtn, opacity: pageIndex === 0 ? 0.35 : 1 }}
              >
                ◀
              </button>
              <span style={S.pagerLabel}>{pageIndex + 1} / {totalPages}</span>
              <button
                type="button"
                onClick={goOlder}
                disabled={pageIndex === totalPages - 1}
                style={{ ...S.pagerBtn, opacity: pageIndex === totalPages - 1 ? 0.35 : 1 }}
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {history === null && <div style={S.emptyText}>불러오는 중…</div>}
        {history !== null && totalPages === 0 && (
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

  sectionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 2 },
  sectionLabel: { fontSize: 12.5, fontWeight: 600, color: '#999' },
  pager: { display: 'flex', alignItems: 'center', gap: 8 },
  pagerBtn: { background: 'none', border: 'none', color: '#ccc', fontSize: 13, padding: '2px 6px', cursor: 'pointer' },
  pagerLabel: { fontSize: 11.5, color: '#777', minWidth: 40, textAlign: 'center' },
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
