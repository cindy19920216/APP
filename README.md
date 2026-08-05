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

설치·개발 서버·빌드 등 실행 명령어는 `CLAUDE.md`의 "자주 쓰는 명령어" 참고.

### 필요한 환경 변수 (`.env`)

```
FRED_API_KEY=your_fred_api_key_here
```

FRED API 키는 https://fred.stlouisfed.org/docs/api/api_key.html 에서 무료 발급.

---

## 화면 구성

**2026-07-23부터 최상위 네비게이션이 "공부하기 / 투자하기" 2단 구조로 바뀌었다.**
모바일은 상단에 두 섹션을 고르는 큰 버튼 2개 + 그 아래 선택된 섹션의 하위 탭바,
데스크톱은 사이드바에 섹션 헤더로 그룹핑된 리스트(`DesktopShell.jsx`)로 표시된다.

```
PinScreen (잠금 화면)
└─ 메인 탭 네비게이션
   │
   ├─ 공부하기 (아직 초기 단계 — 주린이 대상 학습 콘텐츠)
   │   ├─ Econ Idea       — EconIdeaScreen. ISABELNET 제휴 차트 5개를 매일 자동
   │   │                    수집(06:30 KST GitHub Actions)해 "오늘의 차트"로 표시,
   │   │                    데스크톱은 2열 그리드·모바일은 1열
   │   ├─ Technical Idea  — TechnicalChartMaster (이론/퀴즈/구루/AI 닥터 섹션)
   │   └─ Stock Idea      — 준비 중 (ComingSoonScreen)
   │
   └─ 투자하기 (기존 4개 실전 탭)
      ├─ 시장지표 탭      (MarketTab)
      │   ├─ BOOM-BURST(JS Economic Cycle) 지수 카드 → PanicBoomScreen
      │   │   └─ 각 세부 지표 → IndicatorDetailScreen (히스토리컬 차트)
      │   ├─ 주요 지수 10개(S&P500·NASDAQ·다우·KOSPI·KOSDAQ·니케이225·DAX·
      │   │   유로스톡스50·항셍·상해종합, 국가 국기 표시) → InstrumentChartScreen
      │   ├─ 환율 10개(USD~SGD/KRW, 국기 표시) → InstrumentChartScreen
      │   └─ 원자재(금·WTI·은·BTC, 금속/오일 톤 아이콘) → InstrumentChartScreen
      │   (데스크톱: 지수/환율/원자재 3컬럼 그리드, 클릭 시 모달로 상세 표시)
      │
      │   InstrumentChartScreen: lightweight-charts 기반 TradingView 스타일
      │   캔들차트(MA5/MA20/볼린저밴드/VWAP 오버레이, 거래량, RSI·MACD 토글,
      │   1개월~1년 일봉 + 5분·15분·1시간 분봉 기간 선택) + 차트 아래
      │   "기술적 분석 의견" 카드(RSI·이동평균·MACD·볼린저밴드·엘더 임펄스·MA60
      │   이격도 6개 지표를 추세/모멘텀/평균회귀/엘더 임펄스 4개 그룹 가중 앙상블
      │   점수로 종합 → 매수 관심/매도 관심/관망 판정, 종목 상세와 같은 계산 기준
      │   — 초보자도 이해할 수 있는 지표별 근거 설명 문단 포함).
      │   가격 헤더는 60초 간격으로 자동 갱신(화면이 보일 때만).
      │
      ├─ 기술적 지표 탭   (ScreenerScreen) — KOSPI200 200종목 스크리너
      │   ├─ 검색/필터(전체·매수관심·매도관심·관망) + "추세"(강세/약세/혼조) 배지 —
      │   │   실시간 근사 신호(`/api/screener-live`, 있으면)가 있으면 그걸로 필터·
      │   │   카운트·추세 배지까지 하나로 통일해서 판단하고, 없으면(계산 전/실패)
      │   │   herencia-ta 공식 entry_opinion으로 폴백(`effectiveSignal()`), 시가총액
      │   │   내림차순 정렬
      │   ├─ "기술적 지표 알아보기" → IndicatorGuideScreen (지표 카테고리별 설명)
      │   └─ 종목 상세(StockDetail) — herencia-ta API(`/api/stocks/{code}`,
      │       `/api/stocks/{code}/history`)에서 받은 일봉 데이터에, 오늘자
      │       Yahoo Finance 시간봉을 합성한 "실시간 근사 지표"(ADX·캔들패턴·
      │       매매신호·공포탐욕지수)를 얹어 4개 탭으로 표시:
      │       ├─ 차트 — 가격 헤더(실시간 시세, 60초 갱신) → StockChart(MA/BB/
      │       │   VWAP 오버레이, 거래량, RSI·MACD 토글, 일봉 기간+분봉 선택,
      │       │   캔들패턴/매매신호 마커) → 핵심 지표 요약 → 자동 생성 한글
      │       │   요약 문단(엘더 임펄스 설명 포함) → "상세 지표"(접이식)
      │       ├─ 뉴스 — 대형주 5종목(삼성전자·SK하이닉스·현대차·LG에너지솔루션·
      │       │   삼성바이오로직스)은 매일 자동 수집된 외신 위주 뉴스, 나머지는
      │       │   실시간 조회
      │       ├─ AI 분석 — Gemini 기반 리포트, 온디맨드 생성(세션 캐시 + 가격/
      │       │   시간 기준 재분석 안내), 모든 종목이 동일한 문단 구조로 통일
      │       └─ 공포탐욕지수 — 종목별 반원 게이지 + 구성 요소 breakdown
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
| GET | `/api/chart/[ticker]` | Yahoo Finance OHLCV + MA5/MA20/볼린저밴드/rolling VWAP/RSI/MACD 히스토그램 계산 결과. `range`/`interval` 쿼리로 일봉·주봉·월봉은 물론 분봉(5m/15m/60m)도 지원 (InstrumentChartScreen, StockChart 공용) |
| GET | `/api/prices` | 가격 데이터 |
| GET | `/api/transactions` | 거래 내역 |
| GET | `/api/screener` | KOSPI200 스크리너 목록 프록시(30분 캐시) — 아래 herencia-ta 참고 |
| GET | `/api/screener-live` | KOSPI200 200종목 전체의 실시간 근사 매매신호(15분 캐시, 전체 사용자 공유) — 아래 참고 |
| GET | `/api/stock-news` | 종목별 뉴스. 대형주 5종목은 매일 자동 수집된 배치(엑셀) 데이터, 나머지는 Google News 실시간 조회(30분 캐시) |
| POST | `/api/stock-ai-report` | 종목 기술적 지표 기반 Gemini AI 분석 리포트 생성 |

### 기술적 지표 탭 — herencia-ta 외부 API 연동 + 실시간 근사 지표

`ScreenerScreen`/`StockDetail`은 별도 저장소(`herencia-ta`, Python/FastAPI, Render 배포:
`https://herencia-ta.onrender.com`)의 API를 호출한다. 목록은 `/api/screener` 프록시를
거치지만, 종목 상세(`/api/stocks/{code}`)와 히스토리(`/api/stocks/{code}/history`)는
브라우저에서 herencia-ta API를 직접 호출한다(CORS 전체 허용). herencia-ta 쪽은 매일
GitHub Actions로 KOSPI200 200종목 지표를 자동 갱신하므로, RSI/MACD/진입의견 같은
"공식" 지표는 항상 전일 종가 기준이다.

장중 변동을 반영하기 위해, herencia-ta 일봉 히스토리 뒤에 오늘자 Yahoo Finance
시간봉(`/api/chart/[ticker]?interval=60m`)을 합성한 봉을 이어 붙이고
(`buildLiveBars`, `src/lib/stockAnalysis.ts`) ADX·캔들패턴·매매신호·공포탐욕지수·
AI 분석 판정 근거를 이 값으로 다시 계산한다 — 이 값들은 "근사치"로 명확히
구분해서 표시하고, herencia-ta의 공식 entry_opinion/지표는 그대로 둔다.
`/api/screener-live`가 200종목 전체에 대해 이 계산을 15분마다 한 번(서버 캐시,
전체 사용자 공유) 수행해 목록의 실시간 배지를 채운다 — 종목당 herencia-ta
히스토리 + Yahoo 시간봉 총 2회 호출(200종목 × 2 = 400회)이 필요해서, 무료 API
과호출을 피하려고 이렇게 묶었다.

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
│   │   ├── screener-live/  # KOSPI200 200종목 실시간 근사 매매신호(15분 캐시)
│   │   ├── stock-news/     # 종목별 뉴스(대형주 배치 + 나머지 실시간 조회)
│   │   ├── stock-ai-report/ # 종목 기술적 지표 Gemini AI 분석 리포트
│   │   └── ...
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── redesign/
│       ├── DesktopShell.jsx        # 데스크톱 셸 — 공부하기/투자하기 그룹 사이드바 + 메인 영역
│       ├── DesktopModal.jsx        # 데스크톱 전용 중앙 모달(보조 화면용)
│       ├── ComingSoonScreen.jsx    # "공부하기" 준비중 탭 공통 화면 (Econ/Stock Idea)
│       ├── MarketTab.jsx           # 시장지표 탭 (환율·지수 10개·원자재, 국기 아이콘)
│       ├── PanicBoomScreen.jsx     # BOOM-BURST 상세 화면
│       ├── IndicatorDetailScreen.jsx # 개별 지표 히스토리컬 차트
│       ├── InstrumentChartScreen.jsx # 지수·환율·원자재 TradingView 스타일 캔들차트 +
│       │                            # RSI/MA/MACD/BB 기반 매수·매도·관망 의견 카드
│       ├── ScreenerScreen.jsx      # 기술적 지표 탭 — KOSPI200 스크리너 + 종목 상세
│       ├── StockChart.jsx          # 인터랙티브 캔들차트 (lightweight-charts)
│       ├── IndicatorGuideScreen.jsx # 기술적 지표 설명 화면 (onBack 없으면 "Technical Idea" 탭으로 단독 사용)
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
    ├── types.ts
    ├── gemini.ts            # Gemini SDK 공용 클라이언트
    ├── stockAnalysis.ts     # ADX/캔들패턴/매매신호(앙상블 가중치 모델)/시간프레임 정합/
    │                        # 공포탐욕지수 + buildLiveBars(실시간 합성봉)
    ├── statisticalNormalization.ts # percentile/z-score 정규화, ATR 기반 변동성 배율
    │                        # (stockAnalysis의 RSI 통계적 맥락·변동성 설명에 사용)
    ├── taIndicators.ts      # sma/ema/bollinger/rsi/macd 계산 (차트 API·stockAnalysis 공유)
    ├── yahooChart.ts        # Yahoo Finance 조회+지표계산 (차트 API·screener-live 공유)
    ├── herenciaTa.ts        # herencia-ta 종목 목록 캐시 (screener·screener-live 공유)
    └── googleNews.ts        # Google News RSS 조회 (시장지표·종목 뉴스 공유)
```

---

## 변경 이력

날짜별 상세 변경 이력(왜 그렇게 바꿨는지, 무엇을 발견했는지 포함)은 `progress.md`의
"변경 이력 아카이브" 섹션에서 관리한다. 현재 진행 중인 작업 상태도 같은 파일에 있다.
