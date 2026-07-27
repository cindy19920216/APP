import React, { useState } from 'react';
import { Navbar, ActiveTab } from './Navbar';
import { TheorySection } from './TheorySection';
import { GuruSection } from './GuruSection';
import { WorkbenchSection } from './WorkbenchSection';
import { QuizTrainingSection } from './QuizTrainingSection';
import { AiDoctorSection } from './AiDoctorSection';

// "공부하기 > Technical Idea" 탭 본체.
// 원래 독립 앱(주린이 기술적 차트 마스터)이었던 걸 Herencia 안에 이식 — 자체 로고/푸터
// 브랜딩은 Herencia 셸과 중복돼서 빼고, 5개 서브탭(이론/구루/스튜디오/퀴즈/AI닥터) 로직은 그대로 유지.
export function TechnicalChartMaster() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('theory');
  const [activePresetId, setActivePresetId] = useState<string>('classic_trend_preset');

  const [aiDoctorStock, setAiDoctorStock] = useState<{
    stockName: string;
    timeframe: string;
    price: number;
    technicals: any;
  }>({
    stockName: '삼성전자',
    timeframe: '일봉',
    price: 75000,
    technicals: { alignment: '정배열', rsi: 58, support: 71000, resistance: 79000 },
  });

  const handleGuruPresetApply = (presetId: string) => {
    setActivePresetId(presetId);
    setActiveTab('workbench');
  };

  const handleConsultAiDoctorFromWorkbench = (
    stockName: string,
    timeframe: string,
    currentPrice: number,
    technicals: any
  ) => {
    setAiDoctorStock({ stockName, timeframe, price: currentPrice, technicals });
    setActiveTab('aidoctor');
  };

  return (
    <div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ marginTop: 18 }}>
        {activeTab === 'theory' && (
          <TheorySection onSelectTopicInWorkbench={() => setActiveTab('workbench')} />
        )}

        {activeTab === 'gurus' && <GuruSection onApplyPreset={handleGuruPresetApply} />}

        {activeTab === 'workbench' && (
          <WorkbenchSection
            initialPresetId={activePresetId}
            onConsultAiDoctor={handleConsultAiDoctorFromWorkbench}
          />
        )}

        {activeTab === 'quiz' && <QuizTrainingSection />}

        {activeTab === 'aidoctor' && (
          <AiDoctorSection
            initialStockName={aiDoctorStock.stockName}
            initialTimeframe={aiDoctorStock.timeframe}
            initialPrice={aiDoctorStock.price}
            initialTechnicals={aiDoctorStock.technicals}
          />
        )}
      </div>
    </div>
  );
}

export default TechnicalChartMaster;
