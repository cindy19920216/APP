# Herencia — 가족 투자 자산 통합 관리 대시보드

> 가족의 자산, 하나의 미래

모바일 앱 UI 형태로 구현된 Next.js 기반 가족 자산 관리 대시보드. 자산 현황·수익률 추적부터 FRED 실시간 데이터를 이용한 BOOM-BURST 시장 지수, 뉴스 기반 시장 요약까지 통합 제공한다.

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Next.js | 16.2.6 (App Router, Turbopack) |
| React | 19.2.4 |
| Prisma (Better-SQLite3) | 7.8.0 |
| Chart.js / react-chartjs-2 | 4.x / 5.x |
| Recharts | 3.x |
| Zustand | 5.x |
| TanStack Query | 5.x |

---

## 실행 방법

```bash
npm install
npm run dev    # http://localhost:3000
npm run build && npm start
```

### 환경 변수 (`.env`)

```
FRED_API_KEY=your_fred_api_key   # https://fred.stlouisfed.org/docs/api/api_key.html
```

---

## 화면 구성

```
PinScreen (잠금 화면)
└─ 메인 탭 네비게이션
   ├─ 포트폴리오 탭    (PortfolioTab)
   ├─ 자산 탭          (AssetsTab)
   ├─ 시장지표 탭      (MarketTab)
   │   ├─ BOOM-BURST 지수 카드 → PanicBoomScreen
   │   │   └─ 세부 지표 항목 → IndicatorDetailScreen (히스토리컬 차트 + 이평선 + 설명)
   │   ├─ 주요 지수 7개 (S&P500, NASDAQ, KOSPI, KOSDAQ, 니케이225, DAX, 항셍)
   │   │   └─ 탭 → InstrumentChartScreen (전체 히스토리 + 이평선 MA5/20/60/120)
   │   ├─ 환율 10개 (USD/EUR/JPY/GBP/CNY/AUD/CAD/CHF/HKD/SGD → KRW)
   │   └─ 원자재 4개 (금, WTI, 은, BTC)
   └─ 기업 탭          (CompanyTab)
       └─ 기업 상세 → CompanyDetailScreen
```

---

## BOOM-BURST 지수

### 개요

FRED 공개 데이터 기반으로 시장이 공황(Panic) 상태인지 탐욕(Boom) 상태인지를 0~100점으로 수치화한 종합 지수.

- **0점** → PANIC (모든 지표 역사적 최악)
- **100점** → BOOM (모든 지표 역사적 최고 호황)

### 종합점수 계산 방식

```
1. 각 지표의 현재값을 전체 역사적 분포에서 퍼센타일화 (높을수록 공황에 가까움)
2. 상태 분류: ≥90%→PANIC / ≥70%→COLD / ≥30%→MILD / ≥10%→WARM / <10%→BOOM
3. 종합점수 = 100 - 평균(모든 지표 퍼센타일)
```

### 구성 지표 — 금융 지표 (6개)

| 지표명 | FRED 시리즈 | 방향 | 데이터 시작 | 설명 |
|---|---|---|---|---|
| 미국 주식 불확실성 지수 | WLEMUINDXD | ↑공황 | 1985-01 | 높을수록 시장 불안↑ |
| 미국 고위험채권 유효이자율 | BAMLH0A0HYM2 | ↑공황 | 2023-06 | 높을수록 신용위험↑ |
| 미국 기업여신 증가율 | BUSLOANS (YoY%) | ↓공황 | 1976-05 | 전년대비 증가율, 음수=신용위축 |
| 미국 금융시장 경색 지수 | NFCI | ↑공황 | 1976-06 | 높을수록 금융경색↑ |
| 미국 장단기 금리차 | T10Y2Y | ↓공황 | 1976-07 | 음수 = 경기침체 신호 |
| 캐나다 달러/일본 엔화 | DEXCAUS÷DEXJPUS (파생) | ↓공황 | 1976-06 | 낮을수록 위험회피↑ |

### 구성 지표 — 경기 지표 (5개)

| 지표명 | FRED 시리즈 | 방향 | 데이터 시작 | 설명 |
|---|---|---|---|---|
| 미국 주간 실물경기 지수 | WEI | ↓공황 | 2008-01 | 낮을수록 경기 둔화 |
| 미국 실물경기 경기침체 확률 | RECPROUSM156N | ↑공황 | 1976-05 | 높을수록 침체 확률↑ |
| 샴 규칙 경기침체 지표 | SAHMREALTIME | ↑공황 | 1976-04 | 0.5 초과 = 경기침체 |
| 미국 트럭판매 현황 | TRUCKD11 | ↓공황 | 2000-01 | 낮을수록 수요 감소 |
| 미국 화물운송 현황 | RAILFRTCARLOADSD11 | ↓공황 | 2000-01 | 낮을수록 물류경기↓ |

### 구성 지표 — 특별 사이클 (4개)

| 지표명 | FRED 시리즈 | 방향 | 데이터 시작 | 설명 |
|---|---|---|---|---|
| 금/석유 가격 비율 | GC=F (Yahoo)÷DCOILWTICO (파생) | ↑공황 | 2000-09 | 높을수록 안전자산 선호 |
| 미국 통화유동속도 | M2V | ↓공황 | 1959-01 | 낮을수록 경기침체 신호 |
| 미국 실업률/자연실업률 차이 | UNRATE−NROU (파생) | ↑공황 | 1949-01 | 양수 = 고용 악화 |
| 미국 기대 인플레이션 | T10YIE | ↑공황 | 2003-01 | 높을수록 인플레 우려 |

---

## 시장지표 탭 자동화

### 데이터 소스

| 항목 | 소스 | 갱신 주기 |
|---|---|---|
| 지수·환율·원자재 가격 | Yahoo Finance v8/chart | 15분 캐시 |
| 뉴스 기반 한줄 요약 | Google News RSS + 키워드 추출 | 1시간 캐시 |
| 차트 전체 히스토리 | Yahoo Finance v8/chart (`range=max`) | 요청시 |

### 뉴스 요약 방식

```
Google News RSS 검색 → 헤드라인 5개 수집
    ↓
방향 인식 키워드 매핑 (상승용/하락용/중립 3분류, 30+ 패턴)
    ↓
한국어 조사 자동 처리 (로/에) + 1~2개 원인어구 조합
    ↓
"국채금리 변동·지정학 리스크에 하락" 형태 출력
```

API 키·비용 없음 (Google News RSS 무료).

### 지수 (7개)
S&P500, NASDAQ, KOSPI, KOSDAQ, 니케이225, DAX, 항셍

### 환율 (10개, 국가명 표기)
USD(미국), EUR(유럽연합), JPY(일본), GBP(영국), CNY(중국), AUD(호주), CAD(캐나다), CHF(스위스), HKD(홍콩), SGD(싱가포르)

### 원자재 (4개)
금(GC=F, Yahoo), WTI(CL=F), 은(SI=F), BTC(BTC-USD)

---

## 차트 기능 (InstrumentChartScreen)

- **전체 히스토리**: Yahoo Finance `range=max` (최대 50년 월봉)
- **이동평균선**: MA5(빨강), MA20(노랑), MA60(초록), MA120(보라)
- **드래그 범위 선택**: 미니맵 드래그로 기간 자유 조정
- **기간 수익률**: 선택 구간의 시작~끝 수익률 자동 계산

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/boom-burst` | BOOM-BURST 종합점수·지표·차트 (1h 캐시) |
| GET | `/api/market` | 시장가격 + 뉴스 요약 (15분/1h 분리 캐시) |
| GET | `/api/chart/[ticker]` | 종목 전체 히스토리 (Yahoo Finance) |
| GET | `/api/dashboard` | 대시보드 요약 |
| GET | `/api/assets` | 전체 자산 목록 |
| GET | `/api/members` | 가족 구성원 목록 |
| GET | `/api/transactions` | 거래 내역 |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── boom-burst/     # FRED 기반 BOOM-BURST 지수
│   │   ├── market/         # Yahoo Finance + Google News 시장 데이터
│   │   ├── chart/[ticker]/ # 종목 히스토리 차트
│   │   └── ...
│   └── page.tsx
├── components/redesign/
│   ├── MarketTab.jsx           # 시장지표 탭 메인
│   ├── PanicBoomScreen.jsx     # BOOM-BURST 상세
│   ├── IndicatorDetailScreen.jsx  # 개별 지표 히스토리 차트
│   └── InstrumentChartScreen.jsx  # 지수·환율·원자재 차트 (이평선 포함)
└── lib/
```
