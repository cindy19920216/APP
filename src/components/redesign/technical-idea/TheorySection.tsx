import React, { useState } from 'react';
import { LESSONS_DATA } from './data/lessonsData';
import { LessonTopic } from './types';
import useIsDesktop from '@/hooks/useIsDesktop';

interface TheorySectionProps {
  onSelectTopicInWorkbench: () => void;
}

const CATEGORIES = [
  { id: 'ALL', name: '전체' },
  { id: '봉차트', name: '캔들/타임프레임' },
  { id: '이평선', name: '이평선 & 배열' },
  { id: 'RSI', name: 'RSI 과매수/과매도' },
  { id: 'ADR', name: 'ADR 시장과열' },
  { id: 'MACD', name: 'MACD 골든크로스' },
  { id: '볼린저', name: '볼린저 밴드' },
  { id: '거래량', name: '거래량 분석' },
  { id: '펀더멘털', name: '펀더멘털 기초' },
];

// 상세 리더 본문 — 데스크톱 우측 패널과 모바일 아코디언에서 공용으로 쓴다.
function LessonDetail({ lesson, onSelectTopicInWorkbench }: { lesson: LessonTopic; onSelectTopicInWorkbench: () => void }) {
  return (
    <div>
      <div style={S.detailTopRow}>
        <span style={S.detailCategoryBadge}>{lesson.category}</span>
        <span style={S.detailDifficulty}>난이도 · {lesson.difficulty}</span>
      </div>
      <div style={S.detailTitle}>{lesson.title}</div>
      <div style={S.detailSummary}>{lesson.summary}</div>

      <div style={S.sectionDivider}>
        <div style={S.sectionTitle}>핵심 요약 노트</div>
        <div style={S.keyPointsGrid}>
          {lesson.keyPoints.map((point, idx) => (
            <div key={idx} style={S.keyPointCell}>
              <span style={S.keyPointDot} />
              <span style={S.keyPointText}>{point}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={S.sectionTitle}>상세 심화 해설</div>
        <div style={S.detailBody}>
          {lesson.detailedContent.map((paragraph, idx) => (
            <p key={idx} style={S.detailParagraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={S.guruBox}>
          <span style={S.guruLabel}>GURU&apos;S WISDOM</span>
          <span style={S.guruQuote}>&ldquo;{lesson.guruInsight}&rdquo;</span>
        </div>
      </div>

      <div style={S.ctaRow}>
        <button style={S.ctaButton} onClick={onSelectTopicInWorkbench}>
          <span>차트 스튜디오에서 지표 실험하기</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  );
}

export const TheorySection: React.FC<TheorySectionProps> = ({ onSelectTopicInWorkbench }) => {
  const isDesktop = useIsDesktop();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeLesson, setActiveLesson] = useState<LessonTopic>(LESSONS_DATA[0]);
  const [openMobileId, setOpenMobileId] = useState<string | null>(null);

  const filteredLessons =
    selectedCategory === 'ALL'
      ? LESSONS_DATA
      : LESSONS_DATA.filter((l) => l.category === selectedCategory);

  const filterChips = (
    <div style={S.filterRow}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setSelectedCategory(cat.id)}
          style={{ ...S.filterChip, ...(selectedCategory === cat.id ? S.filterChipActive : {}) }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );

  if (isDesktop) {
    return (
      <div style={S.wrap}>
        <div style={S.header}>
          <div>
            <div style={S.titleRow}>
              <i className="ti ti-book-2" style={{ color: '#7F77DD', fontSize: 17 }} />
              <span style={S.title}>기술적 지표의 원리와 실전 의미</span>
            </div>
            <div style={S.subtitle}>
              캔들, 정배열/역배열, RSI, ADR, 볼린저 밴드에 담긴 시장 심리와 세력의 수급 원리를 차근차근 다룹니다.
            </div>
          </div>
        </div>

        {filterChips}

        <div style={S.deskSplit}>
          <div style={S.deskList}>
            <div style={S.deskTableHead}>학습 목차 ({filteredLessons.length})</div>
            <div style={S.deskTableBody}>
              {filteredLessons.map((lesson) => {
                const isActive = activeLesson.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    style={{ ...S.lessonRow, ...(isActive ? S.lessonRowActive : {}) }}
                    onClick={() => setActiveLesson(lesson)}
                  >
                    <div style={S.lessonBadgeRow}>
                      <span style={S.lessonCategoryBadge}>{lesson.category}</span>
                      <span style={S.lessonDifficulty}>{lesson.difficulty}</span>
                    </div>
                    <div style={S.lessonTitle}>{lesson.title}</div>
                    <div style={S.lessonSummary}>{lesson.summary}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={S.deskDetail}>
            <LessonDetail lesson={activeLesson} onSelectTopicInWorkbench={onSelectTopicInWorkbench} />
          </div>
        </div>
      </div>
    );
  }

  // ── 모바일: 세로 스택 + 아코디언 ──
  return (
    <div style={S.wrap}>
      <div style={S.titleRow}>
        <i className="ti ti-book-2" style={{ color: '#7F77DD', fontSize: 15 }} />
        <span style={{ ...S.title, fontSize: 16 }}>기술적 지표의 원리와 실전 의미</span>
      </div>
      <div style={S.subtitle}>
        캔들, 정배열/역배열, RSI, ADR, 볼린저 밴드에 담긴 시장 심리와 세력의 수급 원리를 차근차근 다룹니다.
      </div>

      {filterChips}

      <div style={S.mobileList}>
        {filteredLessons.map((lesson) => {
          const isOpen = openMobileId === lesson.id;
          return (
            <div key={lesson.id} style={S.mobileCard}>
              <button
                style={S.mobileCardHead}
                onClick={() => setOpenMobileId(isOpen ? null : lesson.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.lessonBadgeRow}>
                    <span style={S.lessonCategoryBadge}>{lesson.category}</span>
                    <span style={S.lessonDifficulty}>{lesson.difficulty}</span>
                  </div>
                  <div style={S.lessonTitle}>{lesson.title}</div>
                </div>
                <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, color: '#444', flexShrink: 0 }} />
              </button>
              {isOpen && (
                <div style={S.mobileCardBody}>
                  <LessonDetail lesson={lesson} onSelectTopicInWorkbench={onSelectTopicInWorkbench} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 스타일 (Technical Indicator 탭과 동일한 규격) ────────────────────────
const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },

  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 20, fontWeight: 600, color: '#fff' },
  subtitle: { fontSize: 11.5, color: '#666', marginTop: 5, lineHeight: 1.6, maxWidth: 640 },

  filterRow: { display: 'flex', gap: 6, flexShrink: 0, overflowX: 'auto' },
  filterChip: {
    padding: '6px 10px', borderRadius: 999, border: '0.5px solid #2a2a3a', background: 'transparent',
    color: '#888', fontSize: 10.5, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
  },
  filterChipActive: { background: '#7F77DD20', border: '0.5px solid #7F77DD', color: '#a29dff' },

  deskSplit: { display: 'flex', gap: 16, alignItems: 'stretch' },
  deskList: {
    width: 460, flexShrink: 0, background: '#181820', borderRadius: 14,
    border: '0.5px solid #1e1e28', height: 'calc(100vh - 260px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  deskTableHead: {
    padding: '10px 14px', borderBottom: '0.5px solid #1e1e28',
    fontSize: 9.5, color: '#444', fontWeight: 600, flexShrink: 0, background: '#13131e',
  },
  deskTableBody: { overflowY: 'auto', flex: 1, minHeight: 0 },

  lessonRow: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: 5,
    padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
    textAlign: 'left', borderBottom: '0.5px solid #151520',
  },
  lessonRowActive: { background: '#7F77DD14' },
  lessonBadgeRow: { display: 'flex', alignItems: 'center', gap: 6 },
  lessonCategoryBadge: { fontSize: 9.5, padding: '2px 7px', borderRadius: 6, background: '#7F77DD1a', color: '#a29dff', fontWeight: 600, flexShrink: 0 },
  lessonDifficulty: { fontSize: 9.5, color: '#555' },
  lessonTitle: { fontSize: 12.5, color: '#ddd', fontWeight: 500, lineHeight: 1.55 },
  lessonSummary: { fontSize: 10.5, color: '#555', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },

  deskDetail: {
    flex: 1, minWidth: 0, background: '#181820', borderRadius: 14,
    border: '0.5px solid #1e1e28', height: 'calc(100vh - 260px)', overflowY: 'auto', padding: 20,
  },

  detailTopRow: { display: 'flex', alignItems: 'center', gap: 8 },
  detailCategoryBadge: { fontSize: 9.5, padding: '3px 8px', borderRadius: 6, background: '#7F77DD1a', color: '#a29dff', fontWeight: 600 },
  detailDifficulty: { fontSize: 10.5, color: '#666' },
  detailTitle: { fontSize: 20, fontWeight: 600, color: '#fff', marginTop: 10, lineHeight: 1.4 },
  detailSummary: { fontSize: 12.5, color: '#999', lineHeight: 1.7, marginTop: 8 },

  sectionDivider: { borderTop: '0.5px solid #1e1e28', marginTop: 18, paddingTop: 18 },
  sectionTitle: { fontSize: 9.5, color: '#444', fontWeight: 600, letterSpacing: '0.3px', marginBottom: 10 },

  keyPointsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
  keyPointCell: { background: '#13131e', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 },
  keyPointDot: { width: 4, height: 4, borderRadius: '50%', background: '#7F77DD', marginTop: 6, flexShrink: 0 },
  keyPointText: { fontSize: 11.5, color: '#ccc', lineHeight: 1.6 },

  detailBody: { background: '#13131e', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  detailParagraph: { fontSize: 11.5, color: '#999', lineHeight: 1.7 },

  guruBox: { background: '#7F77DD14', border: '0.5px solid #7F77DD33', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  guruLabel: { fontSize: 9.5, color: '#a29dff', fontWeight: 600, letterSpacing: '0.3px' },
  guruQuote: { fontSize: 12, color: '#ddd', lineHeight: 1.7 },

  ctaRow: { display: 'flex', justifyContent: 'flex-end', marginTop: 18 },
  ctaButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer' },

  // ── 모바일 ──
  mobileList: { display: 'flex', flexDirection: 'column', gap: 8 },
  mobileCard: { background: '#181820', borderRadius: 14, border: '0.5px solid #23232f', overflow: 'hidden' },
  mobileCardHead: { width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8, padding: 14, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' },
  mobileCardBody: { padding: '0 14px 16px', borderTop: '0.5px solid #1e1e28', paddingTop: 14 },
};
