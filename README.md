# Herencia — 가족 투자 자산 통합 관리 대시보드

> 가족의 자산, 하나의 미래

모바일 앱 UI 형태로 구현된 Next.js 기반 가족 자산 관리 대시보드. 자산 현황·수익률 추적부터 FRED 실시간 데이터를 이용한 시장 공황·탐욕 지수, KOSPI200 기술적 지표 스크리너까지 통합 제공한다.

**반응형**: 모바일(1024px 미만)에서는 풀스크린 폰 프레임 앱, 데스크톱(1024px 이상)에서는
좌측 사이드바 + 마스터-디테일 레이아웃의 웹 대시보드로 자동 전환된다(`src/hooks/useIsDesktop.js`).

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Next.js | 16.2.6 (App Router, Turbopack) |
| React | 19.2.4 |
| Prisma (Better-SQLite3) | 7.8.0 |
| Chart.js / react-chartjs-2 | 4.x / 5.x |
| Recharts | 3.x |
| lightweight-charts (TradingView OSS) | 4.x |
| Zustand | 5.x |
| TanStack Query | 5.x |

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build && npm start
```

### 필요한 환경 변수 (`.env`)

```
FRED_API_KEY=your_fred_api_key_here
```

FRED API 키는 https://fred.stlouisfed.org/docs/api/api_key.html 에서 무료 발급.

---

## 화면 구성

```
PinScreen (잠금 화면)
└─ 메인 탭 네비게이션 (모바일: 하단/상단 탭바, 데스크톱: 좌측 사이드바)
   ├─ 시장지표 탭      (MarketTab)
   │   ├─ BOOM-BURST(JS Economic Cycle) 지수 카드 → PanicBoomScreen
   │   │   └─ 각 세부 지표 → IndicatorDetailScreen (히스토리컬 차트)
   │   ├─ 주요 지수 (KOSPI, KOSDAQ, S&P500, NASDAQ) → InstrumentChartScreen
   │   ├─ 환율 (USD/KRW, JPY/KRW, CNY/KRW) → InstrumentChartScreen
   │   └─ 원자재 (금, WTI, 은, BTC) → InstrumentChartScreen
   │   (데스크톱: 지수/환율/원자재 3컬럼 그리드, 클릭 시 모달로 상세 표시)
   ├─ 기술적 지표 탭   (ScreenerScreen) — KOSPI200 200종목 스크리너
   │   ├─ 검색/필터(전체·매수관심·매도관심·관망), 시가총액 내림차순 정렬
   │   ├─ "기술적 지표 알아보기" → IndicatorGuideScreen (지표 카테고리별 설명)
   │   └─ 종목 상세(StockDetail) — herencia-ta API(`/api/stocks/{code}`,
   │       `/api/stocks/{code}/history`)에서 데이터를 받아:
   │       가격 헤더 → StockChart(인터랙티브 캔들차트: MA/BB/VWAP 오버레이,
   │       거래량, RSI·MACD 토글, 기간 선택) → 핵심 지표 요약 → 자동 생성
   │       한글 요약 문단 → "상세 지표"(접이식, raw 지표 전체)
   │       (데스크톱: 차트 좌측 크게 + 요약 사이드바 우측 2단 레이아웃)
   ├─ 포트폴리오 탭    (PortfolioTab)
   │   (데스크톱: 스타일 랭킹 좌측 + 선택 스타일 종목 리스트 우측)
   └─ 기업분석 탭      (CompanyTab)
       └─ 기업 상세 → CompanyDetailScreen
           (데스크톱: 테마/종목 리스트 좌측 + 상세 우측)

자산현황 탭(AssetsTab)은 라우팅에서만 빠져 있고 파일은 보존 중 (나중에 재사용 가능).
```

---

## BOOM-BURST 지수

### 개요

미국 연방준비은행(FRED) 공개 데이터를 실시간으로 받아 **시장이 공황(Panic) 상태인지 탐욕(Boom) 상태인지**를 0~100점으로 수치화한 종합 지수.

- **0점** → 극단적 공포 (모든 지표가 역사적 최악 수준)
- **100점** → 극단적 탐욕 (모든 지표가 역사적 최고 호황 수준)

### 종합점수 계산 방식

```
1. 각 지표: 현재값이 전체 역사적 분포에서 몇 퍼센타일인지 계산
   - panicUp=true  (값이 높을수록 공황): percentile = 현재값보다 낮은 관측값 비율
   - panicUp=false (값이 낮을수록 공황): percentile = 현재값보다 높은 관측값 비율
   → 높은 percentile = 공황에 가까움

2. 상태 분류 (percentile 기준)
   ≥ 90% → PANIC  (극단적 공황)
   ≥ 70% → COLD   (냉각)
   ≥ 30% → MILD   (보통)
   ≥ 10% → WARM   (온기)
    < 10% → BOOM   (호황)

3. 종합점수 = 100 − 평균(모든 지표 percentile)
   모두 PANIC → 종합 ≈ 0 / 모두 BOOM → 종합 ≈ 100
```

퍼센타일은 **각 시리즈의 전체 관측 기간** 기준으로 계산 (최대 600개월·50년).  
API 응답은 1시간 캐시 (FRED 속도 제한 대응, 초당 2건 이하).

### 구성 지표 — 금융 지표 (6개)

| 지표명 | FRED 시리즈 | 방향 | 데이터 시작 | 설명 |
|---|---|---|---|---|
| 미국 주식 불확실성 지수 | WLEMUINDXD | ↑공황 | 1985-01 | 높을수록 시장 불안↑ |
| 미국 고위험채권 유효이자율 | BAMLH0A0HYM2 | ↑공황 | 2023-06 | 높을수록 신용위험↑ |
| 미국 기업여신 증가율 | BUSLOANS | ↓공황 | 1976-05 | 낮을수록 신용위축 |
| 미국 금융시장 경색 지수 | NFCI | ↑공황 | 1976-06 | 높을수록 금융경색↑ |
| 미국 장단기 금리차 | T10Y2Y | ↓공황 | 1976-07 | 음수 = 경기침체 신호 |
| 캐나다 달러/일본 엔화 | DEXCAUS÷DEXJPUS (파생) | ↓공황 | 1976-06 | 낮을수록 위험회피↑ |

### 구성 지표 — 경기 지표 (6개)

| 지표명 | FRED 시리즈 | 방향 | 데이터 시작 | 설명 |
|---|---|---|---|---|
| 미국 주간 실물경기 지수 | WEI | ↓공황 | 2008-01 | 낮을수록 경기 둔화 |
| 미국 실물경기 경기침체 확률 | RECPROUSM156N | ↑공황 | 1976-05 | 높을수록 침체 확률↑ |
| 샴 규칙 경기침체 지표 | SAHMREALTIME | ↑공황 | 1976-04 | 0.5 초과 = 경기침체 |
| 미국 트럭판매 현황 | TRUCKD11 | ↓공황 | 2000-01 | 낮을수록 수요 감소 |
| 미국 화물운송 현황 | RAILFRTCARLOADSD11 | ↓공황 | 2000-01 | 낮을수록 물류경기↓ |

### 구성 지표 — 특별 사이클 (4개 — 파생 포함)

| 지표명 | FRED 시리즈 | 방향 | 데이터 시작 | 설명 |
|---|---|---|---|---|
| 금/석유 가격 비율 | GC=F (Yahoo Finance)÷DCOILWTICO (파생) | ↑공황 | 2000-09 | 높을수록 안전자산 선호 |
| 미국 통화유동속도 | M2V | ↓공황 | 1959-01 | 낮을수록 경기침체 신호 |
| 미국 실업률/자연실업률 차이 | UNRATE−NROU (파생) | ↑공황 | 1949-01 | 양수 = 고용 악화 |
| 미국 기대 인플레이션 | T10YIE | ↑공황 | 2003-01 | 높을수록 인플레 우려 |

> 파생 지표: 두 시리즈를 가공해 생성. 금 가격은 FRED 시리즈(GOLDAMGBD228NLBM) 비활성화로 인해 Yahoo Finance `GC=F`(COMEX 금 선물)로 대체.

> **현재 구현 참고**: 위 설명은 초기 설계(`data_handler.py`, 14개 지표 실시간 조회) 기준이고,
> 실제 `/api/boom-burst`는 `index-data/*.csv`(7개 핵심 지표 + `composite_index.csv`)를 읽어
> 서빙한다. 계산 로직은 별도 저장소 `INDEX_PYTHON`(회귀 가중치 산출·분기 갱신)에서 관리하며,
> 그중 지표 재수집 + 종합지수 재계산 부분만 `scripts/economic_index/update_index.py`로 옮겨와
> 아래처럼 월 1회 자동 실행한다.

### 종합지수 자동 갱신 (2026-07-23 추가)

`.github/workflows/monthly_economic_index_update.yml`이 매달 5일 07:00 KST(cron
`0 22 5 * *`)에 GitHub Actions에서 `scripts/economic_index/update_index.py`를 실행해
FRED에서 7개 지표를 다시 받고 종합지수(JS Economic Cycle Index)를 재계산, 변경이 있으면
`index-data/*.csv`를 commit + push한다(push=배포이므로 Vercel이 자동 재배포).

- 회귀 가중치(`index-data/regression_weights.json`)는 건드리지 않음 — 분기 단위로
  `INDEX_PYTHON/step2_regression.py`를 로컬에서 돌려 수동 갱신하는 게 원칙.
- `step3_plot.py`의 `PROVISIONAL_INJECTIONS`(미발표 지표 잠정치 수동 입력)는 자동화 대상에서
  제외 — 대신 "M-1 원칙"(7개 지표가 모두 공식 발표된 가장 최근 월까지만 계산)은 유지하므로,
  종합지수가 실시간 대비 1~2개월 늦게 채워질 수 있음.
- GitHub 저장소 시크릿 `FRED_API_KEY` 필요 (herencia-ta의 `RENDER_DEPLOY_HOOK`과 같은 패턴).
- 수동으로 즉시 갱신하고 싶으면 Actions 탭에서 `JS Economic Cycle Index 월간 자동 갱신`
  워크플로를 `workflow_dispatch`로 실행.

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/boom-burst` | BOOM-BURST 종합점수·지표·차트 데이터 (1h 캐시) |
| GET | `/api/dashboard` | 대시보드 요약 |
| GET | `/api/assets` | 전체 자산 목록 |
| GET | `/api/assets/[id]` | 자산 상세 |
| GET | `/api/members` | 가족 구성원 목록 |
| GET | `/api/tickers` | 티커 목록 |
| GET | `/api/chart/[ticker]` | 종목 차트 데이터 |
| GET | `/api/prices` | 가격 데이터 |
| GET | `/api/transactions` | 거래 내역 |
| GET | `/api/screener` | KOSPI200 스크리너 목록 프록시(30분 캐시) — 아래 herencia-ta 참고 |

### 기술적 지표 탭 — herencia-ta 외부 API 연동

`ScreenerScreen`/`StockDetail`은 별도 저장소(`herencia-ta`, Python/FastAPI, Render 배포:
`https://herencia-ta.onrender.com`)의 API를 호출한다. 목록은 `/api/screener` 프록시를
거치지만, 종목 상세(`/api/stocks/{code}`)와 히스토리(`/api/stocks/{code}/history`)는
브라우저에서 herencia-ta API를 직접 호출한다(CORS 전체 허용). herencia-ta 쪽은 매일
GitHub Actions로 KOSPI200 200종목 지표를 자동 갱신하므로, 이 앱은 데이터 계산 로직을
따로 구현하지 않고 그대로 fetch해서 보여주기만 한다.

---

## 데이터베이스

Prisma + Better-SQLite3 (로컬 파일 DB). 스키마는 `prisma/schema.prisma` 참조.

---

## 프로젝트 구조

```
src/
├── app/
│   ├── api/             # Next.js Route Handlers
│   │   ├── boom-burst/  # FRED 기반 시장 지수 API
│   │   ├── assets/
│   │   ├── chart/
│   │   └── ...
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── redesign/
│       ├── DesktopShell.jsx        # 데스크톱 셸 (좌측 사이드바 + 메인 영역)
│       ├── DesktopModal.jsx        # 데스크톱 전용 중앙 모달(보조 화면용)
│       ├── MarketTab.jsx           # 시장지표 탭 (환율·지수·원자재)
│       ├── PanicBoomScreen.jsx     # BOOM-BURST 상세 화면
│       ├── IndicatorDetailScreen.jsx # 개별 지표 히스토리컬 차트
│       ├── InstrumentChartScreen.jsx # 주가·환율·원자재 차트
│       ├── ScreenerScreen.jsx      # 기술적 지표 탭 — KOSPI200 스크리너 + 종목 상세
│       ├── StockChart.jsx          # 인터랙티브 캔들차트 (lightweight-charts)
│       ├── IndicatorGuideScreen.jsx # 기술적 지표 설명 화면
│       ├── PortfolioTab.jsx
│       ├── AssetsTab.jsx           # 라우팅에서 빠짐(파일은 보존)
│       ├── CompanyTab.jsx
│       ├── CompanyDetailScreen.jsx
│       ├── FamilyTree.jsx
│       ├── PinScreen.jsx
│       └── ...
├── hooks/
│   └── useIsDesktop.js             # matchMedia(min-width:1024px) 기반 반응형 훅
├── data/
│   ├── companyData.js
│   └── familyData.js
└── lib/
    ├── db.ts
    ├── price-fetcher.ts
    └── types.ts
```
