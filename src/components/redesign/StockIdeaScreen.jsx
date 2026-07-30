"use client";

import { useState, useEffect, useMemo } from "react";

/* ------------------------------------------------------------------ */
/* 콘텐츠 데이터                                                        */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["밸류에이션", "수익성", "기초지표", "안정성·환원"];

const TERMS = [
  {
    id: "per", name: "PER", full: "주가수익비율", category: "밸류에이션",
    def: "지금 주가가, 회사가 1년 동안 버는 돈(순이익)의 몇 배인지 보여주는 숫자예요.",
    analogy: "붕어빵 가게가 1년에 1,000원을 남기는데, 내가 그 가게를 10,000원 주고 산다면 PER은 10배예요. 이론상 본전을 뽑는 데 10년이 걸린다는 뜻이죠.",
    formula: "PER = 주가 ÷ 주당순이익(EPS)",
    caution: "PER이 낮다고 무조건 싼 건 아니에요. 업종마다 평균이 다르고, 이익이 일시적으로 튀었을 수도 있어서 같은 업종·과거 평균과 비교해봐야 해요.",
    example: "주가 10,000원 ÷ EPS 1,000원 = PER 10배",
  },
  {
    id: "pbr", name: "PBR", full: "주가순자산비율", category: "밸류에이션",
    def: "회사를 지금 당장 정리(청산)했을 때 받을 수 있는 돈(장부가치) 대비, 주가가 몇 배인지 보여줘요.",
    analogy: "우리 집 물건을 전부 팔면 100만 원인데, 누가 우리 집을 150만 원에 사겠다고 하면 PBR은 1.5배예요.",
    formula: "PBR = 주가 ÷ 주당순자산(BPS)",
    caution: "PBR이 1배보다 낮다고 항상 저평가는 아니에요. 자산의 질이 나쁘거나 수익성이 낮아서 낮게 거래되는 경우도 많아요.",
    example: "주가 8,000원 ÷ BPS 10,000원 = PBR 0.8배",
  },
  {
    id: "psr", name: "PSR", full: "주가매출비율", category: "밸류에이션",
    def: "주가를 1주당 매출액으로 나눈 값이에요. 아직 이익을 못 내는 성장기업을 비교할 때 자주 써요.",
    analogy: "문구점이 아직 순이익은 적자여도, 손님이 얼마나 많이 오는지(매출)를 기준으로 가게 가치를 매기는 방법이라고 보면 돼요.",
    formula: "PSR = 주가 ÷ 주당매출액",
    caution: "매출만 크고 이익률은 형편없는 회사도 낮게 보일 수 있어요. 영업이익률과 반드시 같이 봐야 해요.",
    example: "주가 5,000원 ÷ 주당매출 10,000원 = PSR 0.5배",
  },
  {
    id: "pcr", name: "PCR", full: "주가현금흐름비율", category: "밸류에이션",
    def: "주가를 1주당 영업활동현금흐름으로 나눈 값이에요. 장부상 이익이 아니라 실제 현금 창출력을 기준으로 봐요.",
    analogy: "장부상 이익은 회계 방식에 따라 조금씩 달라질 수 있지만, 실제 통장에 들어온 현금은 속이기 어렵죠. PCR은 그 '진짜 현금'을 기준으로 매긴 값이에요.",
    formula: "PCR = 주가 ÷ 주당영업현금흐름",
    caution: "감가상각이 큰 업종(장치산업 등)은 이익보다 현금흐름이 크게 잡혀서, PCR이 PER보다 낮게 나오는 경우가 흔해요.",
    example: "주가 12,000원 ÷ 주당영업현금흐름 4,000원 = PCR 3배",
  },
  {
    id: "evebitda", name: "EV/EBITDA", full: "기업가치 대비 상각전영업이익", category: "밸류에이션",
    def: "회사를 통째로 인수한다고 가정할 때(기업가치, EV), 그 돈을 감가상각 전 영업현금창출력(EBITDA)으로 몇 년 만에 회수하는지 보여줘요.",
    analogy: "붕어빵 가게를 빚까지 떠안고 통째로 산다고 할 때, 가게가 매년 벌어들이는 현금(감가상각 반영 전)으로 몇 년 만에 본전을 뽑을 수 있는지를 보는 값이에요.",
    formula: "EV/EBITDA = (시가총액 + 순부채) ÷ EBITDA",
    caution: "설비투자가 많은 업종(반도체·통신 등) 비교에 특히 유용하지만, 감가상각을 빼고 보기 때문에 실제 현금흐름과는 차이가 있을 수 있어요.",
    example: "EV 1,200억 ÷ EBITDA 300억 = EV/EBITDA 4배",
  },
  {
    id: "peg", name: "PEG", full: "성장 대비 주가수익비율", category: "밸류에이션",
    def: "PER을 이익 성장률로 한 번 더 나눈 값이에요. '성장 속도까지 감안했을 때도 이 PER이 비싼가'를 판단해요.",
    analogy: "PER만 보면 비싸 보이는 회사도, 이익이 그만큼 빠르게 크고 있다면 사실 안 비쌀 수도 있어요. PEG는 그 성장 속도까지 감안해서 재는 자예요.",
    formula: "PEG = PER ÷ 이익성장률(%)",
    caution: "성장률 추정치에 따라 PEG가 크게 달라져요. 일반적으로 1 미만이면 저평가로 해석하는 경우가 많지만 절대적 기준은 아니에요.",
    example: "PER 20배 ÷ 성장률 20% = PEG 1.0",
  },
  {
    id: "roe", name: "ROE", full: "자기자본이익률", category: "수익성",
    def: "주주가 넣은 돈(자기자본)으로 회사가 얼마나 효율적으로 돈을 벌었는지 보여줘요.",
    analogy: "세뱃돈 10만 원을 저금했더니 1년 뒤 이자가 1만 원 붙었다면, 나의 ROE는 10%인 셈이에요.",
    formula: "ROE = 당기순이익 ÷ 자기자본 × 100",
    caution: "빚을 늘려서 ROE를 인위적으로 높이는 경우도 있어요. ROE만 보지 말고 부채비율도 꼭 같이 확인하세요.",
    example: "자기자본 1억 원, 순이익 1,500만 원 → ROE 15%",
  },
  {
    id: "roa", name: "ROA", full: "총자산이익률", category: "수익성",
    def: "회사가 가진 전체 자산(빚 포함)으로 얼마나 효율적으로 돈을 벌었는지 보여줘요.",
    analogy: "ROE가 '내 돈만으로 낸 성적'이라면, ROA는 '빌린 돈까지 포함한 전체 밑천으로 낸 성적'이에요.",
    formula: "ROA = 당기순이익 ÷ 총자산 × 100",
    caution: "부채가 많은 회사는 ROE는 높아도 ROA는 낮게 나올 수 있어요. 둘을 같이 보면 '진짜 실력'인지 '빚의 힘'인지 구분할 수 있어요.",
    example: "총자산 5억 원, 순이익 2,000만 원 → ROA 4%",
  },
  {
    id: "opm", name: "영업이익률", full: "Operating Margin", category: "수익성",
    def: "매출 중에서 본업으로 남긴 이익이 얼마나 되는지 보여주는 비율이에요.",
    analogy: "붕어빵을 1,000원어치 팔아서 재료비·임대료 빼고 200원이 남았다면 영업이익률은 20%예요.",
    formula: "영업이익률 = 영업이익 ÷ 매출액 × 100",
    caution: "업종별로 평균이 크게 달라요(유통업은 낮고 소프트웨어업은 높음). 같은 업종끼리, 그리고 시간 추세로 비교하세요.",
    example: "매출 1,000억, 영업이익 150억 → 영업이익률 15%",
  },
  {
    id: "eps", name: "EPS", full: "주당순이익", category: "기초지표",
    def: "회사가 1년 동안 번 순이익을 전체 주식 수로 나눈 값이에요. 주식 1주가 벌어들인 몫이죠.",
    analogy: "붕어빵 가게가 1년 동안 남긴 돈을, 가게 지분을 나눠 가진 사람 수만큼 나눠준다면 한 사람(한 주)이 얼마씩 받는지를 보여줘요.",
    formula: "EPS = 당기순이익 ÷ 발행주식수",
    caution: "자사주 매입이나 증자로 주식 수가 바뀌면, 실제 이익 변화 없이도 EPS 숫자만 달라질 수 있어요.",
    example: "순이익 100억 ÷ 주식수 1,000만 주 = EPS 1,000원",
  },
  {
    id: "bps", name: "BPS", full: "주당순자산", category: "기초지표",
    def: "회사의 순자산(자산에서 부채를 뺀 것)을 전체 주식 수로 나눈 값이에요.",
    analogy: "저금통을 다 깨서 나눠 가진다면, 한 사람 몫이 얼마인지 알려주는 숫자예요.",
    formula: "BPS = 순자산 ÷ 발행주식수",
    caution: "장부상 자산 가치일 뿐, 실제로 팔았을 때 그 가격을 받는다는 보장은 없어요.",
    example: "순자산 500억 ÷ 주식수 500만 주 = BPS 10,000원",
  },
  {
    id: "div", name: "배당수익률", full: "Dividend Yield", category: "안정성·환원",
    def: "주식 1주를 갖고 있으면 매년 몇 % 만큼 현금(배당금)을 받는지 보여줘요.",
    analogy: "주식을 갖고 있는 것만으로 매년 받는 '용돈'의 비율이라고 생각하면 쉬워요.",
    formula: "배당수익률 = 주당배당금 ÷ 주가 × 100",
    caution: "배당수익률이 갑자기 비정상적으로 높아졌다면, 회사가 좋아진 게 아니라 주가가 급락해서 그런 경우가 많아요. 꼭 이유를 확인하세요.",
    example: "주당배당금 300원 ÷ 주가 10,000원 × 100 = 3%",
  },
  {
    id: "debt", name: "부채비율", full: "Debt Ratio", category: "안정성·환원",
    def: "회사가 가진 빚(부채)이 내 돈(자기자본)에 비해 얼마나 되는지 보여주는 비율이에요.",
    analogy: "내 돈 100만 원으로 사업을 시작했는데 은행에서 150만 원을 빌렸다면, 부채비율은 150%예요.",
    formula: "부채비율 = 부채총계 ÷ 자본총계 × 100",
    caution: "업종마다 평균이 크게 달라요. 건설·금융업은 원래 부채비율이 높은 편이라, 같은 업종끼리 비교해야 의미가 있어요.",
    example: "부채 150억 ÷ 자본 100억 × 100 = 부채비율 150%",
  },
];

/* 실전 예시 — 2026년 상반기 국내 증권사 리서치 자료 기준 참고용 정적 데이터.
   TODO: 추후 실시간 데이터 API(예: QuantiWise, DART 등) 연동으로 자동화 예정.
   레이더 점수(0~5)와 debtNum(순현금은 음수로 표기)은 이해를 돕기 위한 상대적 예시예요. */
const STOCK_EXAMPLES = [
  {
    ticker: "005930", name: "삼성전자", sector: "반도체", color: "#5b9bd5",
    per: "약 21배", pbr: "약 3.8배", roe: "약 17.6%", debt: "낮음 (순현금 보유)",
    perNum: 21, roeNum: 17.6, debtNum: -18,
    radar: [{ label: "밸류", value: 3 }, { label: "수익성", value: 4 }, { label: "안정성", value: 5 }, { label: "배당", value: 2 }, { label: "성장성", value: 4 }],
    note: "메모리 업황 호조로 이익이 급증하면서 밸류에이션 지표가 빠르게 바뀌는 구간. 분기 실적 흐름을 함께 확인하는 게 중요해요.",
  },
  {
    ticker: "267260", name: "HD현대일렉트릭", sector: "전력기기", color: "#3a9d6f",
    per: "약 30배", pbr: "약 13배", roe: "약 41%", debt: "낮음",
    perNum: 30, roeNum: 41, debtNum: 15,
    radar: [{ label: "밸류", value: 1 }, { label: "수익성", value: 5 }, { label: "안정성", value: 4 }, { label: "배당", value: 1 }, { label: "성장성", value: 5 }],
    note: "ROE가 매우 높지만 PER·PBR도 함께 높아요. '좋은 기업'이라도 '싼 가격'인지는 별개의 질문이라는 걸 보여주는 예시예요.",
  },
  {
    ticker: "000720", name: "현대건설", sector: "건설", color: "#b779e0",
    per: "약 7배", pbr: "약 0.5배", roe: "약 5%", debt: "약 150% (건설업 평균은 더 높은 편)",
    perNum: 7, roeNum: 5, debtNum: 150,
    radar: [{ label: "밸류", value: 5 }, { label: "수익성", value: 2 }, { label: "안정성", value: 3 }, { label: "배당", value: 2 }, { label: "성장성", value: 2 }],
    note: "PER·PBR은 낮지만 ROE도 낮아요. 밸류에이션이 싸 보여도 수익성이 뒷받침되는지 함께 봐야 하는 이유예요.",
  },
];

const CALCS = [
  { id: "per", label: "PER", unit: "배", fields: [{ key: "price", label: "주가", unit: "원" }, { key: "eps", label: "EPS(주당순이익)", unit: "원" }], compute: (v) => v.price / v.eps },
  { id: "pbr", label: "PBR", unit: "배", fields: [{ key: "price", label: "주가", unit: "원" }, { key: "bps", label: "BPS(주당순자산)", unit: "원" }], compute: (v) => v.price / v.bps },
  { id: "psr", label: "PSR", unit: "배", fields: [{ key: "price", label: "주가", unit: "원" }, { key: "sps", label: "주당매출액", unit: "원" }], compute: (v) => v.price / v.sps },
  { id: "pcr", label: "PCR", unit: "배", fields: [{ key: "price", label: "주가", unit: "원" }, { key: "cps", label: "주당영업현금흐름", unit: "원" }], compute: (v) => v.price / v.cps },
  { id: "roe", label: "ROE", unit: "%", fields: [{ key: "ni", label: "당기순이익", unit: "억원" }, { key: "equity", label: "자기자본", unit: "억원" }], compute: (v) => (v.ni / v.equity) * 100 },
  { id: "roa", label: "ROA", unit: "%", fields: [{ key: "ni", label: "당기순이익", unit: "억원" }, { key: "assets", label: "총자산", unit: "억원" }], compute: (v) => (v.ni / v.assets) * 100 },
  { id: "opm", label: "영업이익률", unit: "%", fields: [{ key: "op", label: "영업이익", unit: "억원" }, { key: "sales", label: "매출액", unit: "억원" }], compute: (v) => (v.op / v.sales) * 100 },
  { id: "debt", label: "부채비율", unit: "%", fields: [{ key: "debt", label: "부채총계", unit: "억원" }, { key: "equity", label: "자본총계", unit: "억원" }], compute: (v) => (v.debt / v.equity) * 100 },
  { id: "evebitda", label: "EV/EBITDA", unit: "배", fields: [{ key: "ev", label: "기업가치(EV)", unit: "억원" }, { key: "ebitda", label: "EBITDA", unit: "억원" }], compute: (v) => v.ev / v.ebitda },
  { id: "peg", label: "PEG", unit: "", fields: [{ key: "per", label: "PER", unit: "배" }, { key: "growth", label: "이익성장률", unit: "%" }], compute: (v) => v.per / v.growth },
];

/* ---- 재무제표 시각화용 예시/참고 데이터 ---- */

const INCOME_FUNNEL = [
  { label: "매출액", value: 1000 },
  { label: "매출총이익", value: 400 },
  { label: "영업이익", value: 200 },
  { label: "당기순이익", value: 180 },
];
// 위 4단계 사이에서 실제로 빠져나가는 항목(매출총이익=매출액−매출원가, 영업이익=매출총이익−판관비,
// 당기순이익=영업이익−법인세 등) — 값은 두 단계 차이로 자동 계산해 보여준다.
const INCOME_DEDUCTIONS = ["매출원가", "판관비", "법인세 등"];

const BALANCE_EXAMPLE = { assets: 1000, debt: 600, equity: 400 };

const CASHFLOW_PATTERNS = [
  { name: "건강한 패턴", rows: [{ label: "영업활동", value: 120 }, { label: "투자활동", value: -60 }, { label: "재무활동", value: -20 }], note: "본업에서 현금을 잘 벌고(+), 미래를 위해 투자하며(−), 빚도 갚아나가는 이상적인 그림이에요." },
  { name: "위험 신호 패턴", rows: [{ label: "영업활동", value: -30 }, { label: "투자활동", value: -10 }, { label: "재무활동", value: 50 }], note: "본업에서는 현금이 새는데(−), 대출이나 증자(+)로 겨우 메우고 있다면 위험 신호예요." },
];

/* 아래 업종 수치는 정확한 통계치가 아니라, 업종별 특성을 이해하기 위한
   일반적인 통념 기준의 대략적인 참고 범위예요. 실제로는 경기 사이클과
   개별 기업 상황에 따라 크게 달라질 수 있어요. */
const INDUSTRY_MARGIN = [
  { sector: "소프트웨어", value: 22 },
  { sector: "반도체", value: 18 },
  { sector: "화학", value: 8 },
  { sector: "유통", value: 4 },
  { sector: "건설", value: 3 },
];

const INDUSTRY_DEBT = [
  { sector: "은행·보험(금융업)", value: 400 },
  { sector: "건설", value: 180 },
  { sector: "해운·조선", value: 150 },
  { sector: "반도체", value: 40 },
  { sector: "소프트웨어", value: 30 },
];

const SECTOR_ICONS = {
  "소프트웨어": "💻",
  "반도체": "🔬",
  "화학": "🧪",
  "유통": "🛒",
  "건설": "🏗️",
  "은행·보험(금융업)": "🏦",
  "해운·조선": "🚢",
  "전력기기": "⚡",
};

/* ---- 좋은기업 체크리스트: 가치주 vs 성장주 ---- */

const CHECKLIST_VALUE = [
  { id: 1, title: "PBR이 1배 안팎이거나 그보다 낮은 편인가요?", detail: "장부가치보다 싸게 거래된다는 뜻이에요. 다만 왜 싼지 이유도 함께 살펴보세요." },
  { id: 2, title: "PER이 업종 평균 대비 낮은 편인가요?", detail: "같은 업종 경쟁사와 비교했을 때 상대적으로 저평가되어 있는지가 중요해요." },
  { id: 3, title: "배당수익률이 안정적으로 나오고 있나요?", detail: "이익을 주주에게 꾸준히 환원하는지는 가치주에서 특히 중요한 신호예요." },
  { id: 4, title: "부채비율이 감당 가능한 수준인가요?", detail: "저평가된 이유가 과도한 빚 때문은 아닌지 확인해요." },
  { id: 5, title: "ROE가 낮더라도 꾸준하고 안정적인가요?", detail: "화려하진 않아도 몇 년간 큰 굴곡 없이 이익을 내고 있는지가 포인트예요." },
  { id: 6, title: "자산가치(BPS) 대비 주가에 충분한 안전마진이 있나요?", detail: "그레이엄이 강조한 개념이에요. 실제 가치보다 확실히 싸게 사는지 확인해요." },
];

const CHECKLIST_GROWTH = [
  { id: 1, title: "매출·이익 성장률이 지속적으로 두 자릿수 이상인가요?", detail: "일시적 반짝 성장이 아니라 몇 분기·몇 년째 이어지고 있는지가 중요해요." },
  { id: 2, title: "PER이 높더라도 PEG로 보면 합리적인 수준인가요?", detail: "성장 속도를 감안했을 때도 지나치게 비싼 건 아닌지 확인해요." },
  { id: 3, title: "시장 규모(TAM)가 충분히 커서 성장 여력이 남아있나요?", detail: "이미 시장을 다 차지했다면 앞으로의 성장 스토리가 약해질 수 있어요." },
  { id: 4, title: "영업이익률이 개선되는 추세(스케일업 효과)인가요?", detail: "매출이 커지면서 고정비 부담이 줄어 이익률도 함께 좋아지는지 봐요." },
  { id: 5, title: "신규 시장·제품으로 사업을 확장하고 있나요?", detail: "다음 성장 동력을 준비하고 있는지가 장기 성장의 핵심이에요." },
  { id: 6, title: "경쟁사 대비 기술적 우위나 진입장벽이 있나요?", detail: "빠르게 크는 시장일수록 경쟁자도 많아서, 확실한 차별점이 있는지가 중요해요." },
];

/* ---- 구루의 서재 ---- */

const GURUS_CLASSIC = [
  {
    id: "graham", name: "벤저민 그레이엄", role: "가치투자의 아버지", years: "1894–1976",
    view: "실제 가치보다 충분히 싼 가격에 사서 '안전마진'을 확보하는 것을 무엇보다 중요하게 여겼어요. 주식시장을 매일 기분이 오락가락하는 'Mr. Market'에 비유하며, 그의 변덕에 휘둘리지 말라고 강조했죠.",
    caseStudy: "1948년, 그레이엄이 이끌던 투자조합 그레이엄-뉴먼은 자동차보험사 GEICO에 투자했어요. 이 한 건의 투자에서 거둔 수익이, 이전까지 20여 년간 운용했던 다른 모든 투자를 합친 것보다 컸다고 알려져 있어요. 철저한 안전마진 원칙 속에서도 놓치지 않은 큰 기회로 꼽혀요.",
    currentFocus: "그레이엄은 1976년 세상을 떠났지만, 그가 정립한 '저PBR·저PER·안전마진' 원칙은 오늘날에도 가치주 스크리너와 퀀트 전략의 기본 골격으로 계승되고 있어요.",
  },
  {
    id: "buffett", name: "워런 버핏", role: "버크셔 해서웨이 회장", years: "1930–",
    view: "스승 그레이엄의 안전마진 개념에 '경제적 해자(단단한 경쟁우위)'라는 관점을 더했어요. 좋은 기업을 적정한 가격에 사서 아주 오래 들고 가는 방식을 추구해요.",
    caseStudy: "1972년 씨즈캔디를 장부가의 3배 가격에 인수한 경험이 전환점이 됐어요. 스승 그레이엄이라면 눈여겨보지 않았을 '비싼' 가격이었지만, 브랜드라는 무형자산의 힘을 깨달으며 이후 코카콜라(1988~1994년 매수, 현재도 보유)·애플처럼 강력한 브랜드를 가진 기업에 장기 투자하는 지금의 스타일로 이어졌어요.",
    currentFocus: "2026년 1월 CEO 자리를 그레그 에이블에게 넘기고 회장으로 물러난 가운데, 2026년 1분기 버크셔 해서웨이는 보유 종목 수를 42개에서 29개로 압축하며 알파벳(구글) 비중을 대폭 늘리고 애플·뱅크오브아메리카 비중은 줄였어요. 사상 최대 규모인 약 4,000억 달러의 현금을 단기 국채에 묻어두며 신중한 태도를 유지하고 있어요.",
  },
  {
    id: "lynch", name: "피터 린치", role: "前 마젤란펀드 매니저", years: "1944–",
    view: "내가 이해할 수 있고 일상에서 자주 접하는 기업에 투자하라고 강조했어요. PER을 이익 성장률과 함께 비교하는 PEG 비율을 즐겨 활용했죠.",
    caseStudy: "자신이 즐겨 찾던 던킨도너츠 매장에 항상 손님이 줄 서 있는 걸 보고 투자를 검토해 큰 수익을 거둔 일화로 유명해요. 화려한 첨단산업보다 일상에서 이미 검증된 기업을 먼저 보라는 그의 철학을 잘 보여주는 사례예요.",
    currentFocus: "46세에 은퇴한 뒤에도 피델리티 부회장으로 남아 젊은 애널리스트와 펀드매니저들을 멘토링하고 있어요. 최근에는 잘 알려지지 않은 소형주에 소규모로 직접 투자하는 모습도 보였는데, 예컨대 IMAC Holdings 지분을 인수하며 '남들이 주목하지 않는 곳에 기회가 있다'는 지론을 이어가고 있어요.",
  },
  {
    id: "fisher", name: "필립 피셔", role: "성장주 투자의 개척자", years: "1907–2004",
    view: "숫자만으로는 부족하다고 봤어요. 경영진의 능력, 연구개발 역량, 고객과 경쟁사에 직접 물어보는 탐문까지 파고드는 '질적 분석'을 중시했어요.",
    caseStudy: "1955년 모토로라에 투자한 뒤, 세상을 떠날 때까지 거의 팔지 않고 보유했어요. 훌륭한 경영진과 성장 잠재력을 갖춘 기업이라면 짧은 주가 등락에 흔들리지 말고 아주 오래 들고 가야 한다는 그의 철학을 그대로 실천한 사례로 꼽혀요.",
    currentFocus: "피셔는 2004년 별세했지만, 아들 켄 피셔가 피셔인베스트먼트를 이끌며 성장주 리서치의 전통을 잇고 있어요. '경영진을 직접 탐문하라'는 그의 질적 분석 방법론은 오늘날에도 성장주 투자자들 사이에서 여전히 인용돼요.",
  },
];

/* 클래식 4인과 달리, 최근 들어 존재감이 커지고 있는 '요즘 뜨는' 투자자들이에요.
   투자 스타일은 클래식 구루들과 확연히 다르니 비교해서 보면 재미있어요. */
const GURUS_RISING = [
  {
    id: "wood", name: "캐시 우드", role: "ARK Invest 창업자 겸 CEO", years: "1955–",
    view: "미래를 바꿀 '파괴적 혁신' 기업에 집중 투자해요. 전통적인 밸류에이션보다 5~10년 뒤의 잠재 시장 규모를 먼저 그리고, 그 방향에 맞는 기업을 과감하게 담는 성장주 스타일이에요.",
    caseStudy: "2018~2020년 테슬라 주가가 부진하던 시기에도 남들과 다르게 목표주가를 크게 높여 잡으며 대규모로 매수했어요. 이후 주가가 급등하며 명성을 굳혔지만, 2021~2022년 금리 인상기에는 성장주 급락으로 큰 폭의 손실을 겪기도 했어요. 고위험·고변동성을 감수하는 스타일이 뚜렷하게 드러난 사례예요.",
    currentFocus: "2025년 ARK 대표 ETF들이 시장 수익률을 크게 웃돌며 화려하게 복귀했어요. 2026년에는 가상자산과 중국 빅테크 반등에 베팅하는 한편, 유전자 편집·유전체 분야(Beam Therapeutics, Intellia Therapeutics 등)로 투자 비중을 늘리고 소비자기술·우주기술 비중은 줄이고 있어요.",
  },
  {
    id: "lilu", name: "리 루", role: "히말라야 캐피탈 회장", years: "1966–",
    view: "그레이엄·버핏·멍거의 가치투자 원칙을 따르면서도, 미국과 중국 시장을 넘나들며 경제적 해자를 가진 소수의 우량 기업에 집중 투자해요. '중국의 워런 버핏'이라 불려요.",
    caseStudy: "2002년경 중국의 전기차·배터리 기업 BYD를 발굴해 멍거에게 소개했고, 멍거가 다시 버핏을 설득하면서 2008년 버크셔 해서웨이가 BYD에 투자하는 계기를 만들었어요. 이 투자는 이후 버크셔의 대표적인 성공 사례 중 하나로 꼽혀요.",
    currentFocus: "2026년 기준 히말라야 캐피탈의 미국 내 운용자산은 약 30억 달러 수준이며, 알파벳(구글)과 중국 우체국저축은행 등 소수 종목에 집중 투자하는 극도로 압축된 포트폴리오를 유지하고 있어요.",
  },
];

const QUIZZES = {
  m1: [
    { q: "PER이 낮을수록 무조건 저평가된 좋은 주식이다.", a: false, ex: "업종 평균, 이익의 질 등을 함께 봐야 해요. PER 하나만으로 판단하면 위험해요." },
    { q: "ROE는 회사가 주주 돈을 얼마나 효율적으로 굴렸는지 보여주는 지표다.", a: true, ex: "맞아요! ROE = 당기순이익 ÷ 자기자본 × 100 이에요." },
    { q: "PSR은 적자 상태인 성장기업에도 적용할 수 있는 지표다.", a: true, ex: "PSR은 매출 기준이라 아직 이익이 없는 회사도 비교할 수 있어요." },
    { q: "PCR은 이익 대신 실제 영업현금흐름을 기준으로 본 밸류에이션 지표다.", a: true, ex: "맞아요. 회계상 이익보다 '진짜 현금'을 기준으로 본다는 점이 PER과 달라요." },
    { q: "부채비율이 100%를 넘으면 업종에 상관없이 무조건 위험한 기업이다.", a: false, ex: "건설·금융업처럼 원래 부채비율이 높은 업종도 있어서, 같은 업종끼리 비교해야 해요." },
    { q: "배당수익률이 갑자기 비정상적으로 높아졌다면 이유를 꼭 확인해봐야 한다.", a: true, ex: "회사가 좋아져서가 아니라 주가 급락 때문일 수도 있어요." },
    { q: "ROA는 부채까지 포함한 전체 자산 대비 수익성을 보여준다.", a: true, ex: "맞아요. ROE와 달리 빌린 돈까지 포함한 전체 밑천을 기준으로 봐요." },
    { q: "영업이익률은 업종에 상관없이 항상 비슷한 수준이 정상이다.", a: false, ex: "유통업과 소프트웨어업처럼 업종마다 평균 영업이익률이 크게 달라요." },
    { q: "EV/EBITDA는 설비투자가 많은 업종을 비교할 때 특히 유용하다.", a: true, ex: "감가상각 영향을 배제하고 비교할 수 있어서 장치산업 비교에 자주 쓰여요." },
    { q: "PEG가 낮으면 성장률 추정과 상관없이 항상 저평가로 확신할 수 있다.", a: false, ex: "PEG는 성장률 추정치에 따라 크게 달라지므로 그 근거를 함께 확인해야 해요." },
  ],
  m2: [
    { q: "매출이 늘어도 영업이익률이 계속 떨어진다면 긍정적인 신호다.", a: false, ex: "'팔수록 남는 게 없다'는 위험 신호일 수 있어요." },
    { q: "재무상태표는 '자산 = 부채 + 자본' 공식을 따른다.", a: true, ex: "맞아요, 재무상태표의 기본 공식이에요." },
    { q: "현금흐름표는 특정 시점의 재산 상태를 보여주는 표다.", a: false, ex: "그건 재무상태표예요. 현금흐름표는 '기간' 동안 현금이 오간 내역을 보여줘요." },
    { q: "가장 이상적인 패턴은 영업활동현금흐름이 (+), 투자활동현금흐름이 (−)인 경우다.", a: true, ex: "본업에서 현금을 잘 벌고, 미래를 위해 투자하고 있다는 뜻이에요." },
    { q: "건설업은 반도체·소프트웨어 업종보다 평균 부채비율이 높은 편이다.", a: true, ex: "프로젝트 파이낸싱 구조 등으로 건설·조선업은 원래 부채비율이 높은 편이에요." },
  ],
  m3: [
    { q: "가치주를 볼 때는 PBR·PER이 업종 평균보다 낮은 편인지가 중요한 체크포인트다.", a: true, ex: "저평가 여부를 판단하는 핵심 기준 중 하나예요." },
    { q: "성장주에서는 PER이 높다는 이유만으로 무조건 나쁜 신호로 봐야 한다.", a: false, ex: "성장 속도를 감안한 PEG 등으로 함께 판단해야 해요." },
    { q: "경제적 해자란 경쟁사가 쉽게 따라 할 수 없는 그 기업만의 강점을 뜻한다.", a: true, ex: "브랜드, 특허, 네트워크 효과 등이 대표적인 예예요." },
    { q: "기업 스크리닝 기준은 업종·투자 스타일에 상관없이 항상 동일해야 한다.", a: false, ex: "가치주와 성장주는 물론, 업종별로도 '좋은 숫자'의 기준점이 달라요." },
    { q: "성장주 체크리스트에서는 매출·이익 성장률의 지속성이 중요한 항목이다.", a: true, ex: "일시적 반짝 성장이 아니라 여러 분기 이어지는지가 핵심이에요." },
    { q: "가치주 체크리스트에서 안전마진이란 자산가치 대비 충분히 싼 가격에 사는 것을 뜻한다.", a: true, ex: "그레이엄이 강조한 핵심 개념이에요." },
  ],
};

const MODULES = [
  { id: "m1", step: "01", shortLabel: "사전", accent: "#c9a227", title: "재무지표 사전", subtitle: "13개 지표 · 계산기 · 실전 종목 예시" },
  { id: "m2", step: "02", shortLabel: "재무제표", accent: "#5b9bd5", title: "재무제표 속독법", subtitle: "시각화로 보는 손익·재무상태·현금흐름" },
  { id: "m3", step: "03", shortLabel: "체크", accent: "#3a9d6f", title: "좋은기업 체크리스트", subtitle: "가치주 vs 성장주, 다른 기준으로 보기" },
  { id: "m4", step: "04", shortLabel: "구루", accent: "#b779e0", title: "구루의 서재", subtitle: "클래식 거장 4인 + 요즘 뜨는 투자자 2인" },
];

/* ------------------------------------------------------------------ */
/* storage 헬퍼 (localStorage)                                          */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = "herencia-stock-idea-";

async function loadStored(key) {
  try { const raw = window.localStorage.getItem(STORAGE_PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function saveStored(key, value) {
  try { window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
}
async function removeStored(key) {
  try { window.localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* SVG / bar 차트 헬퍼                                                   */
/* ------------------------------------------------------------------ */

function polarPoint(cx, cy, r, angle) { return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]; }

function RadarChart({ data, size = 148, color = "#c9a227" }) {
  const cx = size / 2, cy = size / 2, maxR = size / 2 - 26;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;
  const gridLevels = [0.34, 0.67, 1];
  const toPath = (pts) => pts.map((p) => p.join(",")).join(" ");
  const axisPoints = data.map((_, i) => polarPoint(cx, cy, maxR, startAngle + i * angleStep));
  const valuePoints = data.map((d, i) => polarPoint(cx, cy, (d.value / 5) * maxR, startAngle + i * angleStep));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {gridLevels.map((lvl, gi) => (
        <polygon key={gi} points={toPath(data.map((_, i) => polarPoint(cx, cy, maxR * lvl, startAngle + i * angleStep)))} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {axisPoints.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />)}
      <polygon points={toPath(valuePoints)} fill={`${color}33`} stroke={color} strokeWidth="1.5" />
      {valuePoints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} />)}
      {data.map((d, i) => {
        const [lx, ly] = polarPoint(cx, cy, maxR + 15, startAngle + i * angleStep);
        return <text key={i} x={lx} y={ly} fontSize="8.5" fill="#9994a8" textAnchor="middle" dominantBaseline="middle">{d.label}</text>;
      })}
    </svg>
  );
}

function ScatterChart({ points, width = 320, height = 230 }) {
  const margin = 40;
  const xMax = Math.max(...points.map((p) => p.x)) * 1.25;
  const yMax = Math.max(...points.map((p) => p.y)) * 1.25;
  const scaleX = (x) => margin + (x / xMax) * (width - margin - 16);
  const scaleY = (y) => height - margin - (y / yMax) * (height - margin - 20);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <line x1={margin} y1={height - margin} x2={width - 10} y2={height - margin} stroke="rgba(255,255,255,.15)" />
      <line x1={margin} y1={16} x2={margin} y2={height - margin} stroke="rgba(255,255,255,.15)" />
      <text x={width / 2} y={height - 6} fontSize="10" fill="#9994a8" textAnchor="middle">PER (배) — 낮을수록 저평가 →</text>
      <text x={14} y={height / 2} fontSize="10" fill="#9994a8" textAnchor="middle" transform={`rotate(-90 14 ${height / 2})`}>ROE (%) — 높을수록 고수익성 →</text>
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r="7" fill={p.color} stroke="#0a0a12" strokeWidth="1.5" />
          <text x={scaleX(p.x)} y={scaleY(p.y) - 13} fontSize="10.5" fill="#f2efe9" textAnchor="middle" fontWeight="600">{p.name}</text>
        </g>
      ))}
    </svg>
  );
}

function MoneyCascade({ steps, unit = "억원", deductions = [], finalEmoji = "🎉" }) {
  return (
    <div className="cascade-chart">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const nextDiff = !isLast ? s.value - steps[i + 1].value : null;
        return (
          <div className="cascade-step" key={i}>
            <div className={`cascade-card ${isLast ? "is-final" : ""}`}>
              <span className="cascade-icon">{isLast ? finalEmoji : "💰"}</span>
              <span className="cascade-label">{s.label}</span>
              <span className="cascade-value">{s.value.toLocaleString()}{unit}</span>
            </div>
            {nextDiff !== null && deductions[i] && (
              <div className="cascade-deduct">
                <span>⬇</span>
                <span>➖ {deductions[i]} {nextDiff.toLocaleString()}{unit}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BalanceScale({ data }) {
  const debtPct = (data.debt / data.assets) * 100;
  const equityPct = (data.equity / data.assets) * 100;
  const debtRatio = (data.debt / data.equity) * 100;
  const ratioEmoji = debtRatio >= 200 ? "🔴" : debtRatio >= 100 ? "🟡" : "🟢";
  return (
    <div className="scale-chart">
      <div className="scale-card">
        <span className="scale-icon">💰</span>
        <span className="scale-label">자산</span>
        <span className="scale-value">{data.assets.toLocaleString()}억원</span>
      </div>
      <div className="scale-eq">=</div>
      <div className="scale-split">
        <div className="scale-cell scale-cell-debt" style={{ flexBasis: `${debtPct}%` }}>
          <span className="scale-icon">💳</span>
          <span className="scale-cell-label">부채</span>
          <span className="scale-cell-value">{data.debt.toLocaleString()}억 · {debtPct.toFixed(0)}%</span>
        </div>
        <div className="scale-cell scale-cell-equity" style={{ flexBasis: `${equityPct}%` }}>
          <span className="scale-icon">💎</span>
          <span className="scale-cell-label">자본</span>
          <span className="scale-cell-value">{data.equity.toLocaleString()}억 · {equityPct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="ratio-badge">
        <span>{ratioEmoji} 부채비율 (부채 ÷ 자본 × 100)</span>
        <b>{debtRatio.toFixed(0)}%</b>
      </div>
    </div>
  );
}

function DivergingBars({ rows, maxAbs, unit = "억원" }) {
  return (
    <div className="diverge-chart">
      {rows.map((r, i) => {
        const pct = (Math.abs(r.value) / maxAbs) * 50;
        const positive = r.value >= 0;
        return (
          <div className="diverge-row" key={i}>
            <span className="diverge-label">{r.label}</span>
            <div className="diverge-track">
              <div className="diverge-half diverge-left">{!positive && <div className="diverge-fill diverge-neg" style={{ width: `${pct}%` }} />}</div>
              <div className="diverge-center" />
              <div className="diverge-half diverge-right">{positive && <div className="diverge-fill diverge-pos" style={{ width: `${pct}%` }} />}</div>
            </div>
            <span className={`diverge-value ${positive ? "is-pos" : "is-neg"}`}>{positive ? "+" : ""}{r.value}{unit}</span>
          </div>
        );
      })}
    </div>
  );
}

function IndustryBars({ data, unit = "%", color = "#c9a227" }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="industry-chart">
      {data.map((d, i) => (
        <div className="industry-row" key={i}>
          <span className="industry-icon">{SECTOR_ICONS[d.sector] || "🏢"}</span>
          <span className="industry-label">{d.sector}</span>
          <div className="industry-track"><div className="industry-fill" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
          <span className="industry-value">{d.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

function CompanyDebtCompare() {
  const max = 200;
  return (
    <div className="industry-chart">
      {STOCK_EXAMPLES.map((s) => (
        <div className="industry-row" key={s.ticker}>
          <span className="industry-icon">{SECTOR_ICONS[s.sector] || "🏢"}</span>
          <span className="industry-label">{s.name}</span>
          {s.debtNum < 0 ? (
            <div className="industry-track"><span className="netcash-badge">💰 순현금 (부채비율 &lt; 0)</span></div>
          ) : (
            <div className="industry-track"><div className="industry-fill" style={{ width: `${(s.debtNum / max) * 100}%`, background: s.color }} /></div>
          )}
          <span className="industry-value">{s.debtNum < 0 ? "—" : `${s.debtNum}%`}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 작은 컴포넌트들                                                       */
/* ------------------------------------------------------------------ */

function ModuleNav({ progress, active, onSelect, wrongCount }) {
  return (
    <div className="module-nav">
      {MODULES.map((m, i) => {
        const done = progress[m.id]?.done;
        const isActive = active === m.id;
        return (
          <button key={m.id} className={`nav-node ${isActive ? "is-active" : ""}`} onClick={() => onSelect(m.id)} style={{ "--accent": m.accent }}>
            <span className={`nav-step ${done ? "is-done" : ""}`}>{done ? "✓" : m.step}</span>
            <span className="nav-label"><b>{m.title}</b>{done && <em>{progress[m.id].score}/{progress[m.id].total}</em>}</span>
            {i < MODULES.length - 1 && <span className="nav-connector" />}
          </button>
        );
      })}
      {wrongCount > 0 && (
        <>
          <span className="nav-connector" />
          <button className={`nav-node ${active === "review" ? "is-active" : ""}`} onClick={() => onSelect("review")} style={{ "--accent": "#ef5c5c" }}>
            <span className="nav-step">✎</span>
            <span className="nav-label"><b>오답노트</b><em>{wrongCount}문제</em></span>
          </button>
        </>
      )}
    </div>
  );
}

function BottomTabBar({ active, onSelect, wrongCount }) {
  const items = [
    { id: "home", label: "홈", icon: "⌂" },
    ...MODULES.map((m) => ({ id: m.id, label: m.shortLabel, icon: m.step })),
    ...(wrongCount > 0 ? [{ id: "review", label: "오답노트", icon: "✎", badge: wrongCount }] : []),
  ];
  return (
    <nav className="bottom-tabbar">
      {items.map((it) => (
        <button key={it.id} className={`tab-btn ${active === it.id ? "is-active" : ""}`} onClick={() => onSelect(it.id)}>
          <span className="tab-icon">{it.icon}</span>
          <span className="tab-label">{it.label}</span>
          {it.badge ? <span className="tab-badge">{it.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}

function TermCard({ term, flipped, onFlip }) {
  return (
    <div className={`term-card ${flipped ? "is-flipped" : ""}`} onClick={onFlip}>
      <div className="term-card-inner">
        <div className="term-face term-front">
          <span className="term-eyebrow">{term.category}</span>
          <h3>{term.name}</h3>
          <p className="term-full">{term.full}</p>
          <span className="term-hint">탭해서 뒤집기 ↻</span>
        </div>
        <div className="term-face term-back">
          <p className="term-def">{term.def}</p>
          <p className="term-analogy">💡 {term.analogy}</p>
          <p className="term-formula">{term.formula}</p>
          <p className="term-example">예시 · {term.example}</p>
          <p className="term-caution">⚠ {term.caution}</p>
        </div>
      </div>
    </div>
  );
}

function Calculator() {
  const [calcId, setCalcId] = useState(CALCS[0].id);
  const [values, setValues] = useState({});
  const config = CALCS.find((c) => c.id === calcId);
  useEffect(() => { setValues({}); }, [calcId]);
  const allFilled = config.fields.every((f) => values[f.key] !== undefined && values[f.key] !== "" && !isNaN(parseFloat(values[f.key])));
  let result = null;
  if (allFilled) {
    const parsed = {};
    config.fields.forEach((f) => { parsed[f.key] = parseFloat(values[f.key]); });
    result = config.compute(parsed);
  }
  return (
    <div className="calc-block">
      <div className="calc-head"><h3>직접 계산해보기</h3><p>숫자만 넣으면 공식이 자동으로 계산돼요.</p></div>
      <div className="calc-select-row">{CALCS.map((c) => <button key={c.id} className={`calc-chip ${calcId === c.id ? "is-active" : ""}`} onClick={() => setCalcId(c.id)}>{c.label}</button>)}</div>
      <div className="calc-form">
        {config.fields.map((f) => (
          <label key={f.key} className="calc-field">
            <span>{f.label}{f.unit && ` (${f.unit})`}</span>
            <input type="number" inputMode="decimal" value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} placeholder="숫자 입력" />
          </label>
        ))}
      </div>
      <div className="calc-result"><span>{config.label}</span><b>{result !== null && isFinite(result) ? `${result.toFixed(2)}${config.unit}` : "값을 입력해보세요"}</b></div>
    </div>
  );
}

function StockExamplesTab() {
  return (
    <div className="example-block">
      <div className="example-head">
        <h3>실전 예시 · 세 종목 비교</h3>
        <span className="example-date">정적 예시 데이터 · 추후 자동 연동 예정</span>
      </div>
      <p className="example-lead">같은 지표라도 업종에 따라 완전히 다르게 읽어야 해요. 레이더 차트는 밸류·수익성·안정성·배당·성장성을 상대적으로 요약한 참고용 스냅샷이에요.</p>
      <div className="example-grid">
        {STOCK_EXAMPLES.map((s) => (
          <div className="example-card" key={s.ticker}>
            <div className="example-card-head"><div><h4>{s.name}</h4><span className="example-sector">{s.sector} · {s.ticker}</span></div></div>
            <div className="example-radar"><RadarChart data={s.radar} color={s.color} /></div>
            <div className="example-metrics">
              <div><span>PER</span><b>{s.per}</b></div>
              <div><span>PBR</span><b>{s.pbr}</b></div>
              <div><span>ROE</span><b>{s.roe}</b></div>
              <div><span>부채비율</span><b>{s.debt}</b></div>
            </div>
            <p className="example-note">{s.note}</p>
          </div>
        ))}
      </div>
      <div className="scatter-block">
        <h3>PER vs ROE 한눈에 비교</h3>
        <p>오른쪽 아래로 갈수록 '싸면서 수익성도 좋은' 영역이에요. 세 종목이 얼마나 다른 자리에 있는지 확인해보세요.</p>
        <ScatterChart points={STOCK_EXAMPLES.map((s) => ({ name: s.name, x: s.perNum, y: s.roeNum, color: s.color }))} />
      </div>
      <p className="example-caveat">※ 실적 발표와 주가 변동에 따라 수치는 계속 바뀌어요. 실제 투자 판단 시에는 최신 공시·HTS 데이터를 꼭 확인하세요.</p>
    </div>
  );
}

function StatementCard({ st, children }) {
  return (
    <div className="stmt-card">
      <div className="stmt-head"><h3>{st.name}</h3><span className="stmt-tag">{st.tag}</span></div>
      <p className="stmt-what">{st.what}</p>
      <div className="stmt-flow">{st.flow.map((f, i) => <span className="stmt-flow-item" key={i}>{f}</span>)}</div>
      <p className="stmt-tip">🔎 {st.tip}</p>
      {children}
    </div>
  );
}

function ChecklistItem({ item, checked, onToggle }) {
  return (
    <div className={`check-item ${checked ? "is-checked" : ""}`} onClick={onToggle}>
      <span className="check-box">{checked ? "✓" : item.id}</span>
      <div className="check-copy"><p className="check-title">{item.title}</p><p className="check-detail">{item.detail}</p></div>
    </div>
  );
}

function GuruCard({ g }) {
  return (
    <div className="guru-card">
      <div className="guru-card-top">
        <div className="guru-avatar">{g.name.slice(0, 1)}</div>
        <div className="guru-copy">
          <h3>{g.name} <span className="guru-years">{g.years}</span></h3>
          <span className="guru-role">{g.role}</span>
          <p>{g.view}</p>
        </div>
      </div>
      <div className="guru-block">
        <span className="guru-block-label">📌 실제 투자 사례</span>
        <p>{g.caseStudy}</p>
      </div>
      <div className="guru-block guru-block-focus">
        <span className="guru-block-label">🔭 지금 눈여겨보는 것</span>
        <p>{g.currentFocus}</p>
      </div>
    </div>
  );
}

function OXQuiz({ moduleId, questions, onComplete, savedAnswers }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState(savedAnswers || {});
  const [quizDone, setQuizDone] = useState(!!savedAnswers && Object.keys(savedAnswers).length === questions.length);
  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const pick = (val) => {
    if (picked !== null) return;
    setPicked(val);
    const next = { ...answers, [idx]: val === q.a };
    setAnswers(next);
    if (isLast) {
      const score = Object.values(next).filter(Boolean).length;
      onComplete(moduleId, { done: true, score, total: questions.length, answers: next });
      setQuizDone(true);
    }
  };
  const goNext = () => { setPicked(null); setIdx((v) => Math.min(v + 1, questions.length - 1)); };
  const restart = () => { setIdx(0); setPicked(null); setAnswers({}); setQuizDone(false); };
  if (quizDone) {
    const score = Object.values(answers).filter(Boolean).length;
    return (
      <div className="quiz-result">
        <span className="quiz-result-score">{score} / {questions.length}</span>
        <p>{score === questions.length ? "완벽해요! 다음 단계로 가볼까요 🎉" : "다시 풀면서 개념을 다져봐요."}</p>
        <button className="btn-ghost" onClick={restart}>다시 풀기</button>
      </div>
    );
  }
  return (
    <div className="quiz-box">
      <div className="quiz-progress"><span>OX 퀴즈</span><span>{idx + 1} / {questions.length}</span></div>
      <p className="quiz-q">{q.q}</p>
      <div className="quiz-ox">
        <button className={`ox-btn ox-o ${picked !== null && q.a === true ? "is-correct" : ""} ${picked === true && q.a === false ? "is-wrong" : ""}`} onClick={() => pick(true)} disabled={picked !== null}>O</button>
        <button className={`ox-btn ox-x ${picked !== null && q.a === false ? "is-correct" : ""} ${picked === false && q.a === true ? "is-wrong" : ""}`} onClick={() => pick(false)} disabled={picked !== null}>X</button>
      </div>
      {picked !== null && (
        <div className="quiz-explain">
          <p>{picked === q.a ? "✅ 정답이에요" : "❌ 아쉬워요"}</p>
          <p>{q.ex}</p>
          {!isLast && <button className="btn-primary" onClick={goNext}>다음 문제 →</button>}
          {isLast && <span className="quiz-done-note">결과를 계산하고 있어요…</span>}
        </div>
      )}
    </div>
  );
}

function ReviewScreen({ items, onFix, onExit }) {
  const [snapshot] = useState(items);
  const [pointer, setPointer] = useState(0);
  const [picked, setPicked] = useState(null);
  const [fixedCount, setFixedCount] = useState(0);
  if (snapshot.length === 0) {
    return (
      <div className="review-empty">
        <p>🎉 복습할 오답이 없어요!</p>
        <button className="btn-primary" onClick={onExit}>처음으로</button>
      </div>
    );
  }
  const item = snapshot[pointer];
  const isLast = pointer === snapshot.length - 1;
  const isDone = isLast && picked !== null;
  const pick = (val) => {
    if (picked !== null) return;
    setPicked(val);
    if (val === item.a) { onFix(item.moduleId, item.idx); setFixedCount((c) => c + 1); }
  };
  const next = () => { setPicked(null); setPointer((p) => Math.min(p + 1, snapshot.length - 1)); };
  if (isDone) {
    return (
      <div className="review-summary">
        <span className="quiz-result-score">{fixedCount} / {snapshot.length}</span>
        <p>이번 라운드에서 다시 맞춘 문제 수예요. 맞춘 문제는 원래 단계 점수에도 반영됐어요.</p>
        <button className="btn-primary" onClick={onExit}>처음으로</button>
      </div>
    );
  }
  return (
    <div className="quiz-box">
      <div className="quiz-progress"><span>오답노트</span><span>{pointer + 1} / {snapshot.length}</span></div>
      <p className="quiz-q">{item.q}</p>
      <div className="quiz-ox">
        <button className={`ox-btn ox-o ${picked !== null && item.a === true ? "is-correct" : ""} ${picked === true && item.a === false ? "is-wrong" : ""}`} onClick={() => pick(true)} disabled={picked !== null}>O</button>
        <button className={`ox-btn ox-x ${picked !== null && item.a === false ? "is-correct" : ""} ${picked === false && item.a === true ? "is-wrong" : ""}`} onClick={() => pick(false)} disabled={picked !== null}>X</button>
      </div>
      {picked !== null && (
        <div className="quiz-explain">
          <p>{picked === item.a ? "✅ 이번엔 맞았어요" : "❌ 아직 헷갈리네요"}</p>
          <p>{item.ex}</p>
          <button className="btn-primary" onClick={next}>{isLast ? "결과 보기 →" : "다음 문제 →"}</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 모듈 화면                                                             */
/* ------------------------------------------------------------------ */

function ModuleScreen({ moduleId, progress, onComplete, checklistChecked, onToggleCheck }) {
  const [flipped, setFlipped] = useState({});
  const [filter, setFilter] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [m1Tab, setM1Tab] = useState("glossary");
  const [m3Style, setM3Style] = useState("value");
  const meta = MODULES.find((m) => m.id === moduleId);
  const toggleFlip = (id) => setFlipped((f) => ({ ...f, [id]: !f[id] }));

  const visibleTerms = TERMS.filter((t) => {
    const matchesCat = filter === t.category;
    const q = search.trim().toLowerCase();
    const matchesSearch = q === "" || (t.name + t.full + t.def).toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const activeChecklist = m3Style === "value" ? CHECKLIST_VALUE : CHECKLIST_GROWTH;
  const checkedCountForStyle = activeChecklist.filter((item) => checklistChecked[`${m3Style}_${item.id}`]).length;

  return (
    <div className="module-screen">
      <header className="module-head" style={{ "--accent": meta.accent }}>
        <span className="module-step-chip">STEP {meta.step}</span>
        <h2>{meta.title}</h2>
        <p>{meta.subtitle}</p>
      </header>

      {moduleId === "m1" && (
        <>
          <div className="subtab-row">
            <button className={`subtab-btn ${m1Tab === "glossary" ? "is-active" : ""}`} onClick={() => setM1Tab("glossary")}>용어사전</button>
            <button className={`subtab-btn ${m1Tab === "examples" ? "is-active" : ""}`} onClick={() => setM1Tab("examples")}>실전예시</button>
          </div>

          {m1Tab === "glossary" && (
            <>
              <div className="search-row"><input className="search-input" type="text" placeholder="지표 이름으로 검색 (예: 배당, 부채)" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <div className="filter-row">{CATEGORIES.map((c) => <button key={c} className={`filter-chip ${filter === c ? "is-active" : ""}`} onClick={() => setFilter(c)}>{c}</button>)}</div>
              <div className="term-grid">
                {visibleTerms.map((t) => <TermCard key={t.id} term={t} flipped={!!flipped[t.id]} onFlip={() => toggleFlip(t.id)} />)}
                {visibleTerms.length === 0 && <p className="term-empty">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>}
              </div>
              <Calculator />
            </>
          )}

          {m1Tab === "examples" && <StockExamplesTab />}
        </>
      )}

      {moduleId === "m2" && (
        <div className="stmt-list">
          <StatementCard st={{ name: "손익계산서", tag: "성적표", what: "회사가 일정 기간 동안 얼마를 벌고, 얼마를 썼는지 보여주는 '성적표'예요.", flow: ["매출액", "− 매출원가", "= 매출총이익", "− 판관비", "= 영업이익", "= 순이익"], tip: "매출은 느는데 영업이익이 줄고 있다면 '팔수록 남는 게 없다'는 위험 신호예요. 영업이익률(영업이익 ÷ 매출)을 최근 3~5년치로 살펴보세요." }}>
            <p className="viz-caption">예시 기업 손익 구조 (가상의 숫자예요)</p>
            <MoneyCascade steps={INCOME_FUNNEL} deductions={INCOME_DEDUCTIONS} />
            <p className="viz-caption" style={{ marginTop: 18 }}>업종별 평균 영업이익률 비교 <span className="viz-caveat-inline">(일반적 통념 기준, 참고용)</span></p>
            <IndustryBars data={INDUSTRY_MARGIN} color="#c9a227" />
          </StatementCard>

          <StatementCard st={{ name: "재무상태표", tag: "재산 목록표", what: "특정 시점에 회사가 가진 것(자산)과 갚아야 할 빚(부채), 순수 내 몫(자본)을 보여주는 '재산 목록표'예요.", flow: ["자산", "=", "부채", "+", "자본"], tip: "부채비율(부채 ÷ 자본 × 100)이 100%를 훌쩍 넘으면 내 돈보다 빚이 많다는 뜻이니 주의하세요. 유동비율로 단기 상환 능력도 함께 체크해요." }}>
            <p className="viz-caption">자산 = 부채 + 자본 (예시 기업)</p>
            <BalanceScale data={BALANCE_EXAMPLE} />
            <p className="viz-caption" style={{ marginTop: 18 }}>업종별 평균 부채비율 비교 <span className="viz-caveat-inline">(일반적 통념 기준, 참고용)</span></p>
            <IndustryBars data={INDUSTRY_DEBT} color="#5b9bd5" />
            <p className="viz-caption" style={{ marginTop: 18 }}>실제 3개 종목 부채비율 비교</p>
            <CompanyDebtCompare />
          </StatementCard>

          <StatementCard st={{ name: "현금흐름표", tag: "용돈기입장", what: "실제 현금이 어디서 들어오고 어디로 나갔는지 보여주는 '용돈기입장'이에요. 이익은 났는데 현금이 없는 경우도 있어서 중요해요.", flow: ["영업활동현금흐름", "투자활동현금흐름", "재무활동현금흐름"], tip: "가장 좋은 패턴은 영업활동현금흐름이 (+), 투자활동현금흐름이 (−)예요. 순이익은 흑자인데 영업현금흐름이 계속 마이너스라면 회계적 착시일 수 있어요." }}>
            <p className="viz-caption">좋은 패턴 vs 위험한 패턴 (예시)</p>
            {CASHFLOW_PATTERNS.map((p) => (
              <div key={p.name} className="cf-pattern-block">
                <span className={`cf-pattern-title ${p.name.includes("위험") ? "is-risk" : "is-good"}`}>{p.name}</span>
                <DivergingBars rows={p.rows} maxAbs={130} />
                <p className="cf-pattern-note">{p.note}</p>
              </div>
            ))}
          </StatementCard>
        </div>
      )}

      {moduleId === "m3" && (
        <>
          <p className="m3-intro">기업 스크리닝 기준은 업종과 투자 스타일에 따라 달라져요. 어떤 관점으로 볼지 골라보세요.</p>
          <div className="subtab-row">
            <button className={`subtab-btn ${m3Style === "value" ? "is-active" : ""}`} onClick={() => setM3Style("value")}>가치주 체크리스트</button>
            <button className={`subtab-btn ${m3Style === "growth" ? "is-active" : ""}`} onClick={() => setM3Style("growth")}>성장주 체크리스트</button>
          </div>
          <div className="check-list">
            {activeChecklist.map((item) => (
              <ChecklistItem key={item.id} item={item} checked={!!checklistChecked[`${m3Style}_${item.id}`]} onToggle={() => onToggleCheck(`${m3Style}_${item.id}`)} />
            ))}
            <p className="check-footer">체크된 항목이 많을수록, '{m3Style === "value" ? "좋은 가치주" : "좋은 성장주"}'의 조건에 가까워요. ({checkedCountForStyle} / {activeChecklist.length})</p>
          </div>
        </>
      )}

      {moduleId === "m4" && (
        <div className="guru-list">
          {GURUS_CLASSIC.map((g) => <GuruCard key={g.id} g={g} />)}
          <div className="guru-divider"><span>🌱 요즘 뜨는 투자자들</span></div>
          {GURUS_RISING.map((g) => <GuruCard key={g.id} g={g} />)}
        </div>
      )}

      {moduleId !== "m4" && (
        <section className="quiz-section">
          <h3 className="quiz-section-title">이 단계 정리 퀴즈</h3>
          <OXQuiz moduleId={moduleId} questions={QUIZZES[moduleId]} onComplete={onComplete} savedAnswers={progress[moduleId]?.answers} />
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 홈 화면                                                               */
/* ------------------------------------------------------------------ */

function HomeScreen({ progress, onSelect, onReset, wrongCount }) {
  const doneCount = MODULES.filter((m) => progress[m.id]?.done).length;
  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-progress"><div className="home-progress-bar"><div className="home-progress-fill" style={{ width: `${(doneCount / MODULES.length) * 100}%` }} /></div><span>{doneCount} / {MODULES.length}단계 완료</span></div>
      </div>
      <div className="home-cards">
        {MODULES.map((m) => {
          const done = progress[m.id]?.done;
          const score = progress[m.id]?.score, total = progress[m.id]?.total;
          return (
            <button key={m.id} className="home-card" onClick={() => onSelect(m.id)} style={{ "--accent": m.accent }}>
              <span className="home-card-accent" />
              <div className="home-card-body"><span className="home-card-eyebrow">STEP {m.step}</span><h3>{m.title}</h3><p>{m.subtitle}</p></div>
              <div className="home-card-status">{done ? <span className="status-done">{score}/{total} ✓</span> : <span className="status-todo">시작하기 →</span>}</div>
            </button>
          );
        })}
      </div>
      {wrongCount > 0 && <button className="review-card" onClick={() => onSelect("review")}><span>📝 오답노트</span><span>{wrongCount}문제 복습하기 →</span></button>}
      {doneCount > 0 && <button className="reset-link" onClick={onReset}>학습 진행 상황 초기화</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 메인 앱                                                               */
/* ------------------------------------------------------------------ */

export default function StockIdeaScreen() {
  const [screen, setScreen] = useState("home");
  const [progress, setProgress] = useState({});
  const [checklistChecked, setChecklistChecked] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadStored("progress");
      const c = await loadStored("checklist");
      if (p) setProgress(p);
      if (c) setChecklistChecked(c);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) saveStored("progress", progress); }, [progress, loaded]);
  useEffect(() => { if (loaded) saveStored("checklist", checklistChecked); }, [checklistChecked, loaded]);

  const wrongList = useMemo(() => {
    const list = [];
    MODULES.forEach((m) => {
      const p = progress[m.id];
      if (p && p.done && p.answers) {
        Object.entries(p.answers).forEach(([idx, correct]) => {
          if (!correct) {
            const qq = QUIZZES[m.id][Number(idx)];
            if (qq) list.push({ moduleId: m.id, idx: Number(idx), q: qq.q, a: qq.a, ex: qq.ex });
          }
        });
      }
    });
    return list;
  }, [progress]);

  const handleComplete = (moduleId, result) => setProgress((p) => ({ ...p, [moduleId]: result }));
  const handleToggleCheck = (key) => setChecklistChecked((c) => ({ ...c, [key]: !c[key] }));
  const handleFixWrong = (moduleId, idx) => {
    setProgress((p) => {
      const mp = p[moduleId];
      if (!mp) return p;
      const newAnswers = { ...mp.answers, [idx]: true };
      const newScore = Object.values(newAnswers).filter(Boolean).length;
      return { ...p, [moduleId]: { ...mp, answers: newAnswers, score: newScore } };
    });
  };
  const handleReset = async () => {
    setProgress({});
    setChecklistChecked({});
    await removeStored("progress");
    await removeStored("checklist");
  };

  return (
    <div className="tab-wrap" style={{ padding: 0 }}>
    <div className="dojo-app">
      <style>{`
        .dojo-app {
          --bg: #0a0a12; --bg-card: #15151f; --bg-card-2: #1b1b28; --border: #29293c;
          --gold: #c9a227; --gold-soft: #e8c547; --teal: #2dd9a3; --red: #ef5c5c;
          --text: #f2efe9; --text-dim: #9994a8; --text-faint: #605c72;
          --serif: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; --mono: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: radial-gradient(ellipse at top, #14141f 0%, var(--bg) 55%);
          color: var(--text); font-family: var(--sans); min-height: 100vh;
          padding: clamp(16px, 4vw, 40px); box-sizing: border-box;
        }
        .dojo-app * { box-sizing: border-box; }
        .dojo-app h1, .dojo-app h2, .dojo-app h3, .dojo-app h4 { font-family: var(--serif); margin: 0; }
        .dojo-app p { margin: 0; }
        .dojo-app button { font-family: var(--sans); cursor: pointer; border: none; }
        .app-shell { max-width: 960px; margin: 0 auto; }

        .module-nav { display: flex; align-items: center; gap: 2px; overflow-x: auto; padding: 6px 4px 22px; margin-bottom: 8px; }
        .nav-node { background: none; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 999px; flex-shrink: 0; transition: background .15s ease; }
        .nav-node.is-active { background: var(--bg-card); }
        .nav-step { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--text-faint); flex-shrink: 0; }
        .nav-node.is-active .nav-step { border-color: var(--accent); color: var(--accent); }
        .nav-step.is-done { background: var(--accent); border-color: var(--accent); color: #0a0a12; font-size: 14px; }
        .nav-label { display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
        .nav-label b { font-size: 12.5px; color: var(--text-dim); font-weight: 500; }
        .nav-node.is-active .nav-label b { color: var(--text); }
        .nav-label em { font-size: 10.5px; color: var(--accent); font-style: normal; font-family: var(--mono); }
        .nav-connector { width: 16px; height: 1px; background: var(--border); flex-shrink: 0; }

        .home-hero { text-align: center; padding: 8px 16px 20px; }
        .home-progress { max-width: 360px; margin: 0 auto; }
        .home-progress-bar { height: 8px; border-radius: 999px; background: var(--bg-card); border: 1px solid var(--border); overflow: hidden; }
        .home-progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-soft)); transition: width .4s ease; }
        .home-progress span { display: block; margin-top: 8px; font-size: 12px; color: var(--text-faint); font-family: var(--mono); }

        .home-cards { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .home-card { display: flex; align-items: stretch; gap: 14px; background: linear-gradient(135deg, var(--bg-card), var(--bg-card-2)); border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; text-align: left; width: 100%; transition: transform .15s ease, border-color .15s ease; }
        .home-card:hover { transform: translateY(-2px); border-color: var(--accent); }
        .home-card-accent { width: 4px; border-radius: 4px; flex-shrink: 0; background: var(--accent); }
        .home-card-body { flex: 1; }
        .home-card-eyebrow { font-family: var(--mono); font-size: 11px; color: var(--accent); }
        .home-card-body h3 { font-size: 18px; margin: 4px 0 4px; }
        .home-card-body p { font-size: 13px; color: var(--text-dim); }
        .home-card-status { display: flex; align-items: center; }
        .status-done { color: var(--teal); font-family: var(--mono); font-size: 13px; font-weight: 600; }
        .status-todo { color: var(--text-faint); font-size: 13px; white-space: nowrap; }
        .reset-link { display: block; margin: 22px auto 0; background: none; color: var(--text-faint); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
        .reset-link:hover { color: var(--red); }
        .review-card { display: flex; justify-content: space-between; align-items: center; width: 100%; background: linear-gradient(135deg, rgba(239,92,92,.12), var(--bg-card)); border: 1px solid var(--red); border-radius: 14px; padding: 14px 18px; margin-top: 14px; color: var(--text); font-size: 13.5px; }
        .review-card span:last-child { color: var(--red); font-family: var(--mono); font-size: 12.5px; }

        .module-head { padding: 8px 4px 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
        .module-step-chip { display: inline-block; font-family: var(--mono); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; border: 1px solid var(--accent); color: var(--accent); }
        .module-head h2 { font-size: clamp(24px, 4vw, 32px); }
        .module-head p { color: var(--text-dim); margin-top: 6px; font-size: 14px; }

        .subtab-row { display: flex; gap: 8px; margin-bottom: 18px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
        .subtab-btn { background: none; color: var(--text-dim); font-size: 13.5px; padding: 10px 4px; border-bottom: 2px solid transparent; margin-right: 14px; font-weight: 500; }
        .subtab-btn.is-active { color: var(--gold-soft); border-bottom-color: var(--gold-soft); font-weight: 700; }

        .m3-intro { font-size: 13px; color: var(--text-dim); margin-bottom: 16px; line-height: 1.6; }

        .search-row { margin-bottom: 12px; }
        .search-input { width: 100%; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; color: var(--text); font-size: 13.5px; }
        .search-input:focus { outline: none; border-color: var(--gold); }
        .search-input::placeholder { color: var(--text-faint); }

        .filter-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .filter-chip { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-dim); font-size: 12.5px; padding: 7px 14px; border-radius: 999px; transition: all .15s ease; }
        .filter-chip.is-active { background: var(--gold); border-color: var(--gold); color: #15151f; font-weight: 600; }

        .term-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-bottom: 28px; position: relative; }
        .term-empty { grid-column: 1/-1; text-align: center; color: var(--text-faint); font-size: 13px; padding: 30px 0; }
        .term-card { perspective: 1200px; height: 230px; cursor: pointer; }
        .term-card-inner { position: relative; width: 100%; height: 100%; transition: transform .5s cubic-bezier(.4,.2,.2,1); transform-style: preserve-3d; }
        .term-card.is-flipped .term-card-inner { transform: rotateY(180deg); }
        .term-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 16px; border: 1px solid var(--border); padding: 18px; display: flex; flex-direction: column; overflow-y: auto; }
        .term-front { background: linear-gradient(160deg, var(--bg-card), #1c1712); justify-content: center; align-items: flex-start; }
        .term-eyebrow { font-family: var(--mono); font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .08em; }
        .term-front h3 { font-size: 26px; color: var(--gold-soft); margin: 6px 0 2px; }
        .term-full { color: var(--text-dim); font-size: 13px; }
        .term-hint { margin-top: auto; font-size: 11px; color: var(--text-faint); font-family: var(--mono); }
        .term-back { background: var(--bg-card-2); transform: rotateY(180deg); gap: 8px; justify-content: flex-start; }
        .term-def { font-size: 13px; line-height: 1.5; }
        .term-analogy { font-size: 12.5px; color: var(--gold-soft); line-height: 1.5; }
        .term-formula { font-family: var(--mono); font-size: 12px; background: rgba(255,255,255,.04); padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border); }
        .term-example { font-family: var(--mono); font-size: 11.5px; color: var(--teal); }
        .term-caution { font-size: 11.5px; color: var(--text-dim); line-height: 1.4; }

        .calc-block { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; padding: 22px; margin-bottom: 24px; }
        .calc-head h3 { font-size: 18px; }
        .calc-head p { font-size: 12.5px; color: var(--text-dim); margin-top: 4px; margin-bottom: 16px; }
        .calc-select-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .calc-chip { background: var(--bg-card-2); border: 1px solid var(--border); color: var(--text-dim); font-size: 12px; padding: 6px 12px; border-radius: 999px; }
        .calc-chip.is-active { background: var(--gold); border-color: var(--gold); color: #15151f; font-weight: 600; }
        .calc-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .calc-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-dim); }
        .calc-field input { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; color: var(--text); font-family: var(--mono); font-size: 13px; width: 100%; }
        .calc-field input:focus { outline: none; border-color: var(--gold); }
        .calc-result { display: flex; justify-content: space-between; align-items: center; background: rgba(201,162,39,.08); border: 1px solid var(--gold); border-radius: 12px; padding: 14px 16px; }
        .calc-result span { font-size: 12.5px; color: var(--text-dim); }
        .calc-result b { font-family: var(--mono); font-size: 20px; color: var(--gold-soft); }

        .example-block { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; padding: 22px; margin-bottom: 32px; }
        .example-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .example-head h3 { font-size: 18px; }
        .example-date { font-family: var(--mono); font-size: 10.5px; color: var(--text-faint); }
        .example-lead { font-size: 13px; color: var(--text-dim); margin-bottom: 18px; }
        .example-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .example-card { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
        .example-card-head h4 { font-size: 16px; }
        .example-sector { font-size: 11.5px; color: var(--text-faint); font-family: var(--mono); }
        .example-radar { display: flex; justify-content: center; margin: 8px 0 4px; }
        .example-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
        .example-metrics div { background: rgba(255,255,255,.03); border-radius: 8px; padding: 8px 10px; }
        .example-metrics span { display: block; font-size: 10.5px; color: var(--text-faint); font-family: var(--mono); margin-bottom: 2px; }
        .example-metrics b { font-size: 13px; color: var(--gold-soft); }
        .example-note { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
        .example-caveat { font-size: 11px; color: var(--text-faint); margin-top: 4px; line-height: 1.5; }

        .scatter-block { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 8px; }
        .scatter-block h3 { font-size: 15px; margin-bottom: 4px; }
        .scatter-block p { font-size: 12px; color: var(--text-dim); margin-bottom: 12px; }

        .stmt-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
        .stmt-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .stmt-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .stmt-head h3 { font-size: 20px; }
        .stmt-tag { font-family: var(--mono); font-size: 11px; color: var(--gold-soft); border: 1px solid var(--gold); border-radius: 999px; padding: 2px 9px; }
        .stmt-what { font-size: 13.5px; color: var(--text-dim); line-height: 1.55; margin-bottom: 14px; }
        .stmt-flow { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .stmt-flow-item { font-family: var(--mono); font-size: 12px; background: rgba(255,255,255,.04); border: 1px solid var(--border); padding: 5px 9px; border-radius: 8px; color: var(--text); }
        .stmt-tip { font-size: 12.5px; color: var(--teal); line-height: 1.5; }

        .viz-caption { font-size: 12px; color: var(--text-faint); font-family: var(--mono); margin-bottom: 8px; }
        .viz-caveat-inline { color: var(--text-faint); font-weight: 400; }

        .industry-chart { display: flex; flex-direction: column; gap: 6px; margin-bottom: 6px; }
        .industry-row { display: grid; grid-template-columns: 20px 88px 1fr 70px; align-items: center; gap: 8px; background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; }
        .industry-icon { font-size: 14px; text-align: center; }
        .industry-label { font-size: 12px; color: var(--text-dim); }
        .industry-track { height: 16px; background: rgba(255,255,255,.05); border-radius: 6px; overflow: hidden; display: flex; align-items: center; }
        .industry-fill { height: 100%; border-radius: 6px; transition: width .3s ease; }
        .industry-value { font-family: var(--mono); font-size: 11.5px; color: var(--text-dim); text-align: right; }
        .netcash-badge { font-size: 11px; color: var(--teal); font-family: var(--mono); padding-left: 4px; }

        .cascade-chart { display: flex; flex-direction: column; margin-bottom: 6px; }
        .cascade-step { display: flex; flex-direction: column; }
        .cascade-card { display: flex; align-items: center; gap: 10px; background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; }
        .cascade-card.is-final { background: rgba(45,217,163,.1); border-color: var(--teal); }
        .cascade-icon { font-size: 18px; flex-shrink: 0; }
        .cascade-label { font-size: 13px; color: var(--text-dim); flex: 1; }
        .cascade-card.is-final .cascade-label { color: var(--text); font-weight: 700; }
        .cascade-value { font-size: 14px; font-weight: 700; color: var(--text); }
        .cascade-card.is-final .cascade-value { color: var(--teal); font-size: 16px; }
        .cascade-deduct { display: flex; align-items: center; gap: 6px; padding: 6px 0 6px 6px; }
        .cascade-deduct span:first-child { color: var(--text-faint); font-size: 13px; }
        .cascade-deduct span:last-child { font-size: 12px; color: var(--red); opacity: .9; font-weight: 500; }

        .scale-chart { margin-bottom: 6px; }
        .scale-card { display: flex; align-items: center; gap: 10px; background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; }
        .scale-icon { font-size: 20px; flex-shrink: 0; }
        .scale-label { font-size: 13px; color: var(--text-dim); flex: 1; }
        .scale-value { font-size: 15px; font-weight: 700; color: var(--text); }
        .scale-eq { text-align: center; font-size: 20px; color: var(--text-faint); margin: 6px 0; }
        .scale-split { display: flex; gap: 4px; }
        .scale-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; border-radius: 12px; padding: 12px 10px; min-width: 0; }
        .scale-cell-debt { background: rgba(239,92,92,.12); border: 1px solid var(--red); }
        .scale-cell-equity { background: rgba(45,217,163,.12); border: 1px solid var(--teal); }
        .scale-cell .scale-icon { font-size: 22px; }
        .scale-cell-label { font-size: 12px; color: var(--text-dim); font-weight: 600; }
        .scale-cell-value { font-size: 12.5px; font-weight: 700; color: var(--text); white-space: nowrap; }
        .ratio-badge { display: flex; justify-content: space-between; align-items: center; background: rgba(201,162,39,.08); border: 1px solid var(--gold); border-radius: 12px; padding: 10px 14px; margin-top: 12px; gap: 10px; }
        .ratio-badge span { font-size: 12px; color: var(--text-dim); }
        .ratio-badge b { font-size: 18px; color: var(--gold-soft); }

        .diverge-chart { display: flex; flex-direction: column; gap: 10px; }
        .diverge-row { display: grid; grid-template-columns: 66px 1fr 60px; align-items: center; gap: 8px; }
        .diverge-label { font-size: 11.5px; color: var(--text-dim); }
        .diverge-track { display: flex; height: 16px; }
        .diverge-half { width: 50%; position: relative; height: 100%; }
        .diverge-left { display: flex; justify-content: flex-end; }
        .diverge-right { display: flex; justify-content: flex-start; }
        .diverge-center { width: 1px; background: var(--border); }
        .diverge-fill { height: 100%; border-radius: 3px; }
        .diverge-pos { background: var(--teal); }
        .diverge-neg { background: var(--red); }
        .diverge-value { font-family: var(--mono); font-size: 11px; text-align: right; }
        .diverge-value.is-pos { color: var(--teal); }
        .diverge-value.is-neg { color: var(--red); }
        .cf-pattern-block { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); }
        .cf-pattern-title { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-bottom: 10px; }
        .cf-pattern-title.is-good { background: rgba(45,217,163,.12); color: var(--teal); }
        .cf-pattern-title.is-risk { background: rgba(239,92,92,.12); color: var(--red); }
        .cf-pattern-note { font-size: 12px; color: var(--text-dim); margin-top: 8px; line-height: 1.5; }

        .check-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
        .check-item { display: flex; gap: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
        .check-item.is-checked { border-color: var(--teal); background: linear-gradient(135deg, rgba(45,217,163,.08), var(--bg-card)); }
        .check-box { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 12px; color: var(--text-faint); }
        .is-checked .check-box { border-color: var(--teal); color: var(--teal); }
        .check-title { font-size: 14px; font-weight: 500; margin-bottom: 3px; }
        .check-detail { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
        .check-footer { font-size: 12px; color: var(--text-faint); font-family: var(--mono); text-align: right; }

        .guru-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
        .guru-divider { display: flex; align-items: center; gap: 10px; margin: 6px 0 2px; }
        .guru-divider::before, .guru-divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }
        .guru-divider span { font-size: 12px; color: var(--text-faint); font-family: var(--mono); white-space: nowrap; }
        .guru-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
        .guru-card-top { display: flex; gap: 16px; margin-bottom: 14px; }
        .guru-avatar { flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(160deg, var(--gold), #8a6d15); display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-weight: 800; color: #15151f; }
        .guru-copy h3 { font-size: 16px; display: inline; }
        .guru-years { font-size: 11px; color: var(--text-faint); font-family: var(--mono); font-weight: 400; margin-left: 4px; }
        .guru-role { display: block; font-size: 11.5px; color: var(--gold-soft); font-family: var(--mono); margin: 2px 0 6px; }
        .guru-copy p { font-size: 13px; color: var(--text-dim); line-height: 1.6; }
        .guru-block { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; margin-top: 10px; }
        .guru-block-label { display: block; font-size: 11.5px; font-weight: 700; color: var(--gold-soft); margin-bottom: 6px; }
        .guru-block-focus .guru-block-label { color: var(--teal); }
        .guru-block p { font-size: 12.5px; color: var(--text-dim); line-height: 1.6; }

        .quiz-section-title { font-size: 15px; color: var(--text-dim); margin-bottom: 12px; letter-spacing: .02em; }
        .quiz-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 22px; }
        .quiz-progress { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 11px; color: var(--text-faint); margin-bottom: 14px; }
        .quiz-q { font-size: 16px; line-height: 1.5; margin-bottom: 20px; min-height: 48px; }
        .quiz-ox { display: flex; gap: 12px; margin-bottom: 6px; }
        .ox-btn { flex: 1; padding: 16px; border-radius: 14px; font-family: var(--serif); font-size: 22px; font-weight: 800; background: var(--bg-card-2); border: 1px solid var(--border); color: var(--text); transition: all .15s ease; }
        .ox-btn.ox-o { color: var(--teal); }
        .ox-btn.ox-x { color: var(--red); }
        .ox-btn:not(:disabled):hover { transform: translateY(-2px); }
        .ox-btn.is-correct { border-color: var(--teal); background: rgba(45,217,163,.12); }
        .ox-btn.is-wrong { border-color: var(--red); background: rgba(239,92,92,.12); }
        .ox-btn:disabled { cursor: default; }
        .quiz-explain { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); }
        .quiz-explain p:first-child { font-weight: 700; margin-bottom: 6px; }
        .quiz-explain p:nth-child(2) { font-size: 13.5px; color: var(--text-dim); line-height: 1.55; margin-bottom: 14px; }
        .quiz-done-note { font-size: 12px; color: var(--text-faint); font-family: var(--mono); }
        .quiz-result { text-align: center; padding: 30px 10px; }
        .quiz-result-score { display: block; font-family: var(--serif); font-size: 44px; color: var(--gold-soft); margin-bottom: 8px; }
        .quiz-result p { color: var(--text-dim); font-size: 13.5px; margin-bottom: 18px; }

        .review-empty, .review-summary { text-align: center; padding: 50px 16px; }
        .review-empty p { font-size: 16px; color: var(--text-dim); margin-bottom: 18px; }
        .review-summary p { color: var(--text-dim); font-size: 13.5px; margin: 10px 0 18px; line-height: 1.6; }

        .btn-primary { background: linear-gradient(135deg, var(--gold), var(--gold-soft)); color: #15151f; font-weight: 700; padding: 11px 20px; border-radius: 10px; font-size: 13.5px; }
        .btn-ghost { background: none; border: 1px solid var(--border); color: var(--text-dim); padding: 9px 18px; border-radius: 10px; font-size: 13px; }
        .back-btn { background: none; color: var(--text-dim); font-size: 13px; margin-bottom: 8px; padding: 6px 0; display: inline-flex; align-items: center; gap: 6px; }
        .back-btn:hover { color: var(--gold-soft); }

        .bottom-tabbar { display: none; position: fixed; left: 0; right: 0; bottom: 0; background: var(--bg-card); border-top: 1px solid var(--border); z-index: 50; padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); justify-content: space-around; }
        .tab-btn { background: none; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 6px; color: var(--text-faint); position: relative; flex: 1; }
        .tab-btn.is-active { color: var(--gold-soft); }
        .tab-icon { font-family: var(--mono); font-size: 14px; }
        .tab-label { font-size: 9.5px; }
        .tab-badge { position: absolute; top: -2px; right: 14px; background: var(--red); color: #fff; font-size: 9px; border-radius: 999px; padding: 1px 5px; line-height: 1.3; }

        @media (max-width: 720px) {
          .module-nav { display: none; }
          .bottom-tabbar { display: flex; }
          .app-shell { padding-bottom: 76px; }
        }
        @media (max-width: 480px) {
          .term-card { height: 250px; }
          .industry-row { grid-template-columns: 18px 76px 1fr 56px; }
          .diverge-row { grid-template-columns: 76px 1fr 56px; }
        }
      `}</style>

      <div className="app-shell">
        <ModuleNav progress={progress} active={screen} onSelect={setScreen} wrongCount={wrongList.length} />
        {screen === "home" && <HomeScreen progress={progress} onSelect={setScreen} onReset={handleReset} wrongCount={wrongList.length} />}
        {screen !== "home" && screen !== "review" && (
          <>
            <button className="back-btn" onClick={() => setScreen("home")}>← 처음으로</button>
            <ModuleScreen moduleId={screen} progress={progress} onComplete={handleComplete} checklistChecked={checklistChecked} onToggleCheck={handleToggleCheck} />
          </>
        )}
        {screen === "review" && (
          <>
            <button className="back-btn" onClick={() => setScreen("home")}>← 처음으로</button>
            <ReviewScreen items={wrongList} onFix={handleFixWrong} onExit={() => setScreen("home")} />
          </>
        )}
      </div>
      <BottomTabBar active={screen} onSelect={setScreen} wrongCount={wrongList.length} />
    </div>
    </div>
  );
}
