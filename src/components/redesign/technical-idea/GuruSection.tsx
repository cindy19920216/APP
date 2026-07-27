import React, { useState } from 'react';
import { GURU_DATA } from './data/guruData';
import { GuruGuide } from './types';
import useIsDesktop from '@/hooks/useIsDesktop';

interface GuruSectionProps {
  onApplyPreset: (presetId: string) => void;
}

export const GuruSection: React.FC<GuruSectionProps> = ({ onApplyPreset }) => {
  const isDesktop = useIsDesktop();
  const [activeGuru, setActiveGuru] = useState<GuruGuide>(GURU_DATA[0]);

  return (
    <div style={isDesktop ? S.wrap : S.wrapM}>
      <div style={S.header}>
        <div style={S.titleRow}>
          <i className="ti ti-crown" style={{ color: '#7F77DD', fontSize: isDesktop ? 17 : 15 }} />
          <span style={isDesktop ? S.title : S.titleM}>전설적인 차트 구루들의 골든 룰</span>
        </div>
        {isDesktop && (
          <div style={S.subtitle}>
            마크 미네르비니, 제시 리버모어, 윌리엄 오닐 등 수천% 수익률을 기록한 명장들이 차트에서 필수로 검증했던 원칙을 살펴봅니다.
          </div>
        )}
      </div>

      <div style={isDesktop ? S.guruGrid : S.guruRowM}>
        {GURU_DATA.map((guru) => {
          const isSelected = activeGuru.id === guru.id;
          return (
            <button
              key={guru.id}
              onClick={() => setActiveGuru(guru)}
              style={{
                ...(isDesktop ? S.guruCard : S.guruCardM),
                ...(isSelected ? S.guruCardActive : {}),
              }}
            >
              <div style={S.guruCardName}>{guru.name}</div>
              <div style={S.guruCardEnglish}>{guru.englishName}</div>
            </button>
          );
        })}
      </div>

      <div style={isDesktop ? S.detailCard : S.detailCardM}>
        <div style={isDesktop ? S.detailTopRow : S.detailTopRowM}>
          <div>
            <div style={S.badgeRow}>
              <span style={S.badge}>{activeGuru.englishName}</span>
              <span style={S.detailMeta}>{activeGuru.title}</span>
            </div>
            <div style={isDesktop ? S.detailTitle : S.detailTitleM}>{activeGuru.name}의 핵심 차트 법칙</div>
          </div>
          <button style={isDesktop ? S.ctaButton : S.ctaButtonM} onClick={() => onApplyPreset(activeGuru.presetId)}>
            <i className="ti ti-award" style={{ fontSize: 14 }} />
            <span>구루의 차트 기본 세팅 적용하기</span>
          </button>
        </div>

        <div style={S.quoteBox}>
          <span style={S.quoteLabel}>LEGENDARY INSIGHT</span>
          <span style={S.quoteText}>&ldquo;{activeGuru.quote}&rdquo;</span>
        </div>

        <div style={isDesktop ? S.twoColGrid : S.oneColM}>
          <div style={S.subCard}>
            <div style={S.sectionTitle}>핵심 철학</div>
            <p style={S.subCardText}>{activeGuru.corePhilosophy}</p>
          </div>
          <div style={S.subCard}>
            <div style={S.sectionTitle}>선호 지표 및 타점 세팅</div>
            <p style={{ ...S.subCardText, fontFamily: 'monospace' }}>{activeGuru.preferredSetup}</p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={S.sectionTitle}>{activeGuru.name}가 필수로 확인했던 차트 체크리스트</div>
          <div style={S.checklist}>
            {activeGuru.mustCheckRules.map((rule, idx) => (
              <div key={idx} style={S.checklistRow}>
                <i className="ti ti-circle-check" style={{ fontSize: 15, color: '#7F77DD', flexShrink: 0, marginTop: 1 }} />
                <span style={S.checklistText}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={S.subCard}>
            <div style={S.sectionTitle}>주력 패턴 · {activeGuru.chartPatternTitle}</div>
            <p style={S.subCardText}>{activeGuru.chartPatternDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  wrapM: { display: 'flex', flexDirection: 'column', gap: 10 },

  header: {},
  titleRow: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 20, fontWeight: 600, color: '#fff' },
  titleM: { fontSize: 16, fontWeight: 600, color: '#fff' },
  subtitle: { fontSize: 11.5, color: '#666', marginTop: 5, lineHeight: 1.6, maxWidth: 720 },

  guruGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 },
  guruRowM: { display: 'flex', gap: 8, overflowX: 'auto' },
  guruCard: {
    padding: '12px 14px', borderRadius: 12, border: '0.5px solid #23232f', background: '#181820',
    cursor: 'pointer', textAlign: 'left',
  },
  guruCardM: {
    width: 132, flexShrink: 0, padding: '11px 13px', borderRadius: 12, border: '0.5px solid #23232f',
    background: '#181820', cursor: 'pointer', textAlign: 'left',
  },
  guruCardActive: { background: '#7F77DD14', border: '0.5px solid #7F77DD' },
  guruCardName: { fontSize: 12.5, fontWeight: 600, color: '#eee' },
  guruCardEnglish: { fontSize: 9.5, color: '#666', marginTop: 3 },

  detailCard: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 16, padding: 22 },
  detailCardM: { background: '#181820', border: '0.5px solid #23232f', borderRadius: 14, padding: 16 },

  detailTopRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottom: '0.5px solid #23232f', paddingBottom: 18, marginBottom: 18 },
  detailTopRowM: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, borderBottom: '0.5px solid #23232f', paddingBottom: 14, marginBottom: 14 },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: { fontSize: 9.5, padding: '3px 8px', borderRadius: 6, background: '#7F77DD1a', color: '#a29dff', fontWeight: 600 },
  detailMeta: { fontSize: 11, color: '#666' },
  detailTitle: { fontSize: 20, fontWeight: 600, color: '#eee', marginTop: 8 },
  detailTitleM: { fontSize: 16, fontWeight: 600, color: '#eee', marginTop: 6 },

  ctaButton: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  ctaButtonM: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px 16px', borderRadius: 10, background: '#7F77DD', color: '#fff', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer' },

  quoteBox: { background: '#7F77DD14', border: '0.5px solid #7F77DD33', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 },
  quoteLabel: { fontSize: 9.5, color: '#a29dff', fontWeight: 600, letterSpacing: '0.3px' },
  quoteText: { fontSize: 13, color: '#ddd', lineHeight: 1.7 },

  twoColGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  oneColM: { display: 'flex', flexDirection: 'column', gap: 10 },
  subCard: { background: '#13131e', borderRadius: 10, padding: '14px 16px' },
  sectionTitle: { fontSize: 9.5, color: '#444', fontWeight: 600, letterSpacing: '0.3px', marginBottom: 10 },
  subCardText: { fontSize: 12, color: '#999', lineHeight: 1.7 },

  checklist: { display: 'flex', flexDirection: 'column', gap: 8 },
  checklistRow: { display: 'flex', alignItems: 'flex-start', gap: 10, background: '#13131e', borderRadius: 10, padding: '11px 14px' },
  checklistText: { fontSize: 12, color: '#ccc', lineHeight: 1.6 },
};
