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
      │   이격도 6개 신호 점수화 → 매수 관심/매도 관심/관망 판정, 종목 상세와
      │   같은 계산 기준 — 초보자도 이해할 수 있는 지표별 근거 설명 문단 포함).
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
    ├── stockAnalysis.ts     # ADX/캔들패턴/매매신호/공포탐욕지수 + buildLiveBars(실시간 합성봉)
    ├── taIndicators.ts      # sma/ema/bollinger/rsi/macd 계산 (차트 API·stockAnalysis 공유)
    ├── yahooChart.ts        # Yahoo Finance 조회+지표계산 (차트 API·screener-live 공유)
    ├── herenciaTa.ts        # herencia-ta 종목 목록 캐시 (screener·screener-live 공유)
    └── googleNews.ts        # Google News RSS 조회 (시장지표·종목 뉴스 공유)
```

---

## 변경 이력

### 2026-08-03
- **KOSPI200 실시간 매매신호를 6개 지표 스코어링으로 재설계** — 기존
  `computeApproxSignal`(RSI·MA5/MA20·MACD·볼린저밴드 4개)에 엘더 임펄스와 MA60
  이격도를 투표로 추가했다. Discount/Premium(60거래일 가격 범위 내 위치)도 같이
  넣어봤지만, 이건 추세추종이 아니라 평균회귀형 지표라(떨어질 만큼 떨어졌으면
  "싸다"=매수로 투표) 나머지 추세추종 지표들과 정반대로 매 봉 투표하면서 표를
  계속 상쇄시켜 관망 비율이 200종목 실측 기준 40%→최대 90%까지 치솟는 부작용을
  발견 — 점수에서 빼고 화면에는 참고 정보로만 남겼다. 대신 배지 색이 항상 실제
  투표 결과에서 나오도록 `computeApproxSignalDetail`이 breakdown(투표 내역)까지
  반환하게 만들어, 카드 문구와 최종 판정이 어긋날 수 없게 했다
  (`src/lib/stockAnalysis.ts`).
- **"공식(전일 종가 기준)" 값과 "실시간" 값이 화면 곳곳에서 뒤섞여 보이던 문제
  연쇄 수정** — 사용자 피드백으로 하나씩 발견: 종목 상세 헤더의 큰 제목이 실시간
  배지 대신 herencia-ta 공식 진입의견을 보여주고 있던 것, 사이드 RSI/MACD 스탯이
  요약 문단과 다른 소스(공식 vs 실시간)를 쓰던 것, KOSPI200 목록의 "추세"
  (강세/약세/혼조) 배지가 진입의견 배지와 다른 herencia-ta 필드를 쓰던 것 등.
  전부 하나의 실시간 신호(`effectiveSignal()`/`liveOpinionSignal`)로 통일하고,
  실시간 값이 아직 없을 때(로딩 중)만 공식값으로 폴백하도록 정리
  (`ScreenerScreen.jsx`).
- **엘더 임펄스 라벨/설명에서 매매 권유 뉘앙스 제거** — "강세(매수 가능)"/
  "약세(신규 매수 자제)"처럼 라벨 자체에 권유가 섞여 있으면, 상단 배지와 방향이
  다를 때 또 하나의 독립된 의견처럼 읽혀서 배지가 매도인데 문단은 딴 얘기를
  하는 것처럼 보였다. 라벨은 상태(강세/약세/중립)만 말하게 하고, 설명 문장도
  "권하기 어렵다"류의 표현을 빼고 지표가 지금 어떤 상태인지만 사실대로 서술하도록
  변경.
- **종목 상세 요약 문단을 "계산에 쓰이는 값"과 "참고용" 두 문단으로 분리** —
  가격·RSI·MA5/MA20·엘더 임펄스(전부 실시간 매매신호 계산에 포함)를 1문단에,
  Discount/Premium(계산에서 제외된 순수 참고 지표)을 "한편"으로 시작하는 2문단에
  배치해 어느 쪽이 판단 근거이고 어느 쪽이 참고 정보인지 문단 구조만으로 구분되게
  했다.
- **Stock Market(지수·환율·원자재) 탭도 종목 상세와 같은 계산 기준으로 통일** —
  `InstrumentChartScreen.jsx`의 "기술적 분석 의견"이 그동안 RSI/MA/MACD/BB
  4개짜리 로컬 전용 룰(`computeOpinion`)을 따로 구현해서 종목 상세와 판단 기준이
  달랐다. `src/lib/stockAnalysis.ts`의 `computeApproxSignalDetail`/
  `attachAuxIndicators`를 그대로 재사용하도록 교체해 엘더 임펄스·MA60 이격도까지
  동일하게 반영, 지표 카드에 RSI/MACD 등 실제 값도 명시적으로 표시하도록 추가
  (`/api/chart/[ticker]`가 쓰는 `fetchYahooBars`에 `ma60` 계산 추가).
- **캔들차트 색상을 한국 증시 관행으로 변경** — 서구식(상승 초록/하락 빨강)이던
  `StockChart.jsx`/`InstrumentChartScreen.jsx`의 캔들·거래량·MACD 히스토그램 색을
  상승 빨강(`#E24B4A`)/하락 파랑(`#3B82F6`)으로 교체. 이후 MA20 선 색(`#2980b9`)이
  새 하락 캔들 색과 겹쳐 보인다는 피드백을 받아 MA20을 초록(`#22A559`)으로 조정.
- **ISABELNET Econ Idea 자동 업데이트가 며칠째 새 페이지를 안 만든 원인 조사** —
  GitHub Actions 실행 이력을 확인해보니 워크플로 자체는 매일 정상("success")
  실행되고 있었다. 스크립트(`scripts/isabelnet_charts/fetch_charts.py`)를 로컬로
  직접 돌려보니 로직 자체는 멀쩡하게 동작하며, ISABELNET이 새 글을 올리는 시점과
  우리 쪽 하루 1회(06:30 KST) 확인 시점이 어긋나 며칠간 "새 글 없음"으로 조용히
  종료된 것으로 확인됨 — 워크플로 버그는 아니었음. 로컬 진단 실행 결과물(Gemini
  번역 미적용 상태)은 정식 파이프라인을 거치지 않아 커밋하지 않고 되돌림.

### 2026-07-31
- **종목 상세화면(기술적 지표 탭) 4탭 구조로 전면 리디자인** — 참고 이미지(SIGLENS
  스타일)를 바탕으로 `StockDetail`(`ScreenerScreen.jsx`)을 차트/뉴스/AI 분석/
  공포탐욕지수 4개 탭으로 재구성. KOSPI200은 인트라데이 데이터·펀더멘털·뉴스가
  전무해서, 이번 스코프는 이 4개로 한정하고 의회거래/옵션(미국 종목 개념이라
  해당 없음)·재무제표(데이터 소스 없음)는 제외.
- **가격 헤더 실시간화** — 시장지표 탭(`InstrumentChartScreen.jsx`) 상세화면과
  `MarketTab.jsx` 목록 카드가 60초 간격(화면이 보일 때만)으로 자동 새로고침되도록
  폴링 추가. `/api/market`의 서버 캐시도 15분→1분으로 줄임(캐시 키
  `market-v5`→`market-v6`으로 즉시 반영).
- **차트에 분봉(5분/15분/1시간) 옵션 추가** — `/api/chart/[ticker]`가 `interval`
  쿼리 파라미터를 직접 받도록 확장(기존 호출자는 영향 없음), `StockChart.jsx`에
  일봉 기간 버튼 옆에 분봉 버튼 추가. 개발 중 lightweight-charts가 일봉(문자열
  날짜)과 분봉(숫자 타임스탬프)을 같은 차트에서 섞으면 날짜 축 눈금이 엉뚱하게
  표시되는 문제를 발견 — 커스텀 `tickMarkFormatter`로 해결.
- **AI 분석 탭 (Gemini)** — `/api/stock-ai-report`가 herencia-ta 지표 + 자체 계산
  지표(ADX/캔들패턴/매매신호/주봉추세)를 바탕으로 리포트 생성, 세션 캐시 + 가격·
  시간 기준 "재분석 필요" 배너. 종목마다 리포트 구조가 들쭉날쭉하다는 피드백을
  받아, 실제 생성됐던 리포트 하나를 few-shot 예시로 시스템 프롬프트에 그대로
  박아 넣어 모든 종목이 동일한 6문단 구조를 따르게 하고 temperature도 0.6→0.2로
  낮춤.
- **실시간 근사 지표(당일 반영)** — herencia-ta 일봉은 하루 한 번만 갱신돼 장중
  급등락이 ADX/캔들패턴/매매신호/공포탐욕지수/AI 판정에 전혀 반영 안 되는 문제를
  발견. 오늘자 Yahoo Finance 시간봉을 일봉 히스토리 뒤에 합성해 붙이고
  (`buildLiveBars`, `src/lib/stockAnalysis.ts`) 이 값들만 다시 계산하도록 함 —
  herencia-ta 공식 entry_opinion/RSI/MACD 표기는 "전일 종가 기준"으로 그대로 두고
  분리 표시. 매수/매도 판정 임계값을 ±2→±3으로 올려봤다가 200종목 실측 결과 거의
  전부 관망으로만 나와(RSI/BB는 극단치일 때만 투표하는 구조라 3표 이상 쏠리기
  어려움) 다시 ±2로 되돌림.
- **KOSPI200 200종목 목록에 실시간 매매신호 배지** — `/api/screener-live`가
  herencia-ta 히스토리 + Yahoo 시간봉으로 200종목 전체의 근사 신호를 계산해 15분
  캐시(전체 사용자 공유, 종목당 외부 호출 2회 × 200종목 = 400회라 매 요청마다
  하면 두 무료 API 다 차단 위험). 목록 필터 칩/카운트/배지가 서로 다른 기준(공식
  vs 실시간)을 쓰던 걸 `effectiveSignal()`로 통일.
- **종목 뉴스 자동화** — 대형주 5종목(삼성전자·SK하이닉스·현대차·LG에너지솔루션·
  삼성바이오로직스, 외신 커버리지가 실제로 있는 종목만)은
  `scripts/stock_news/fetch_stock_news.py` + 신규 GitHub Actions 워크플로
  (`.github/workflows/stock_news_update.yml`, 매일 07:00 KST)로 자동 수집,
  나머지 종목은 기존처럼 실시간 조회. 처음엔 Google News RSS로 만들었으나 그
  리다이렉트 링크가 실제 기사로 안 열리고(JS 리다이렉트) 모든 요약이 구글의 고정
  문구로 똑같이 나오는 문제를 발견해 Bing News RSS로 교체(실제 기사 링크·요약을
  바로 제공).
- **요약 문단 톤 일치 + 엘더 임펄스 설명 추가** — 가격이 급등했는데 문단은 계속
  낙관적으로만 읽히고 엘더 임펄스는 약세로 나오는 등 톤이 어긋나던 문제를
  "다만/실제로/참고로" 연결어와 함께 엘더 임펄스 설명 문장을 추가해 해결.
- **공유 유틸 추출** — `taIndicators.ts`(sma/ema/bollinger/rsi/macd),
  `yahooChart.ts`(Yahoo 조회+지표계산), `herenciaTa.ts`(종목 목록 캐시),
  `googleNews.ts`(RSS 조회)로 기존 라우트들의 중복 로직을 공용 모듈로 분리 —
  `/api/chart/[ticker]`는 이제 `fetchYahooBars`를 호출하는 얇은 wrapper.

### 2026-07-27
- **Econ Idea ISABELNET 차트 자동갱신 — 실제로는 한 번도 커밋되지 않았던 문제 발견 및 해결**
  지난주 금요일(2026-07-24)에 로컬에서 스크래퍼(`scripts/isabelnet_charts/fetch_charts.py`)·
  일일 GitHub Actions 워크플로(`.github/workflows/isabelnet_charts_update.yml`)·
  `EconIdeaScreen.jsx`·수집 데이터(`public/data/isabelnet_charts.json`,
  `public/isabelnet-charts/*.png`)를 모두 만들어뒀지만, `git status`로 확인해보니 네
  파일 전부 untracked 상태였음 — 즉 GitHub에 push된 적이 없어서 Actions에 워크플로
  자체가 등록되지 않았고, 그래서 "자동갱신 설정했는데 왜 안 도나" 의문이 있었음.
  → 커밋 대상을 검토하는 과정에서 `page.tsx`에 Econ Idea 라우팅과 함께 그동안 커밋
  안 된 다른 로컬 작업(포트폴리오 탭 → Sentiment Indicator, Technical Idea →
  Technical Chart Master/AI Doctor·Quiz·Guru 섹션, `/api/chart-ai` Gemini 연동)도
  뒤엉켜 있는 걸 발견해 사용자 확인 후 함께 커밋.
  → 커밋 준비 중 `.gitignore`의 `data/`, `charts/` 규칙에 루트 앵커(`/`)가 빠져 있어
  `src/components/redesign/technical-idea/data/*.ts` 소스 파일 5개가 의도치 않게
  전부 무시되고 있던 버그도 함께 발견 — `/data/`, `/charts/`로 고쳐서 해결
  (안 고쳤으면 push는 되지만 Vercel 빌드가 import 에러로 깨졌을 것).
  Telegram 봇 로그, 뉴스 스크래핑 xlsx 등 이번 작업과 무관한 미검토 항목은 커밋에서 제외.
- **Econ Idea 차트 레이아웃을 세로 1열 → 2열 그리드(2x2)로 변경**
  `EconIdeaScreen.jsx`가 `useIsDesktop()` 훅으로 데스크톱(1024px 이상)에서는
  `display:grid; gridTemplateColumns: repeat(2,1fr)`, 모바일은 기존처럼 세로 1열을
  쓰도록 분기.
- **GitHub Actions 워크플로 수동 실행(`workflow_dispatch`)으로 end-to-end 검증**
  push 직후 Actions 탭에서 `ISABELNET 오늘의 차트 일일 자동 갱신`을 수동 실행 —
  ISABELNET 블로그에서 새 포스팅 5건(2026-07-24자)을 정상 수집해
  `isabelnet: 오늘의 차트 2026-07-27 (자동)` 커밋으로 push되는 것까지 확인.
  매일 06:30 KST 정기 실행도 이 워크플로가 그대로 수행함.
- **Econ Idea 한글 자동번역 추가 (Gemini)**
  `fetch_charts.py`에 `translate_posts()` 추가 — `GEMINI_API_KEY`가 있으면
  5개 포스팅의 title/desc를 한 번의 호출로 일괄 번역해 titleKo/descKo를 채움
  (앱에서 쓰던 것과 동일 모델 `gemini-3.1-flash-lite`). 키 미설정/호출 실패 시
  예외를 잡아 null로 남기고 차트 수집 자체는 계속 진행 (프론트는 null이면 원문 폴백).
  GitHub Actions Secrets에 `GEMINI_API_KEY` 등록 필요 (Vercel 환경변수와는 별개).
- **잘린 설명(desc) 문제 수정 — 블로그 목록 페이지 요약이 워드프레스에 의해 중간에서 잘림**
  `.post-excerpt`는 워드프레스가 자동으로 일정 길이에서 끊어(…) 문장이 중간에
  끝나던 문제 발견. 개별 포스트 페이지를 확인해보니 실제 캡션은 원래 1~2문장으로
  짧고 "Image: 출처" 문단 앞까지만 있음(그 이후 본문 없음 확인) — `fetch_full_desc()`를
  추가해 목록 페이지 요약 대신 개별 포스트 페이지에서 캡션 전체를 가져오도록 변경.
  포스트 본문 전체를 가져오지 않는다는 기존 라이선스 제약은 그대로 유지됨.
- **하루 5개 차트를 페이지로 누적 보관 (기존: 매일 덮어쓰기 → 최신 1묶음만 존재)**
  `public/data/isabelnet_charts.json`(단일 파일, 매일 덮어씀) 방식을
  `public/data/isabelnet_charts_history.json`(하루치 페이지의 배열, 최신이 index 0)로
  변경. 이미지도 `public/isabelnet-charts/{n}.png` 평면 구조 대신
  `public/isabelnet-charts/{runDate}/{n}.png`로 날짜별 폴더에 저장.
  ISABELNET 블로그가 매일 새 글을 올리진 않으므로, 오늘 수집한 5개가 직전 페이지와
  sourceUrl 기준으로 완전히 같으면 새 페이지를 만들지 않고 조용히 종료(중복 페이지
  방지). 페이지 수는 `MAX_HISTORY_ENTRIES=14`로 제한하고 초과분은 오래된 페이지부터
  이미지 폴더째 삭제. `EconIdeaScreen.jsx`에 페이지네이션(◀/▶, `n / 총페이지`) 추가 —
  1페이지가 최신이고 숫자가 커질수록 과거. 기존 `isabelnet_charts.json`과 평면 png
  5장은 새 구조로 완전히 대체되어 삭제.
- **Technical Idea 탭 5개 서브탭(이론/구루/스튜디오/OX퀴즈/AI닥터) 전면 리디자인**
  원래 독립 앱을 이식한 채로 남아있던 Tailwind 브루탈리스트 스타일(각진 보라 블록,
  대문자 트래킹, 노란 뱃지)을 Herencia 나머지 탭과 동일한 인라인 스타일 규격(둥근
  카드, 톤, 폰트, 행간)으로 통일. 과정에서 이 dev 서버가 새로 쓴 Tailwind 유틸리티
  클래스를 간헐적으로 컴파일하지 않는 캐시 문제를 반복적으로 겪어 — 근본적으로
  Tailwind 의존을 걷어내고 나머지 인라인 스타일 컴포넌트들과 같은 방식으로 통일.
- **차트 스튜디오: 더미 데이터 → KOSPI200+S&P500 실검색 + 야후 파이낸스 실시간 연동**
  `data/universeData.ts`(KOSPI200 200종목 + S&P500 503종목, 총 703종목) 신설,
  검색해서 종목 선택 시 기존 `/api/chart/[ticker]`로 실제 OHLCV를 매번 새로 받아옴
  (캐싱 없음 — 볼 때마다 그 자리에서 최신 데이터 조회, 별도 배치 불필요). 기간
  선택(3개월~5년), KOSPI/미국 종목 원화/달러 표시 분기 추가.
- **차트에 가로 스크롤 + 마우스 휠 팬 지원**
  봉이 촘촘해질 만큼 데이터가 많아지면(예: 5년치) 봉 최소 폭을 유지한 채 필요한
  만큼 차트가 넓어지고 그 구간만 스크롤되도록 `ChartCanvas` 수정. React 합성
  `onWheel`은 passive 리스너라 `preventDefault`가 안 먹는 걸 확인하고 네이티브
  이벤트 리스너로 직접 붙여서 마우스 휠(세로 스크롤 제스처)이 차트를 좌우로
  이동시키도록 처리.
- **OX퀴즈 8→30문항(난이도별 10개) 확장, 실제 차트 사례 기반**
  KOSPI200·S&P500 36개 종목의 최근 약 4년치 실데이터를 스캔해서 골든/데드크로스,
  정배열·역배열 전환, RSI 과매수/과매도, MACD, 볼린저 스퀴즈+돌파, 거래량 급증,
  지지 반등, 갭 상승, RSI 다이버전스가 실제로 발생한 날짜를 찾아 검증 후 구성
  (지어낸 사례 없음). `/api/chart/[ticker]`에 `start`/`end` 날짜 파라미터를 추가해
  고정 캘린더 구간을 조회할 수 있게 함 — 기존 `range`(오늘 기준 상대 구간)만으로는
  콘텐츠 속 과거 날짜가 시간이 지나면 조회 범위 밖으로 밀려나는 문제가 있었음.
  난이도 필터(전체/초급/중급/고급) 추가.
- **모바일(phone-frame) 대응 — 5개 서브탭 전부 데스크톱/모바일 분기**
  Workbench·Guru는 `useIsDesktop()`으로 완전히 별도 모바일 레이아웃(고정폭
  사이드바 → 아코디언, 검색창 전체폭, 프리셋/구루 선택 가로 스크롤 칩)을 새로 작성,
  Quiz·AiDoctor는 패딩·폰트·차트 높이만 모바일용으로 축소.
  `TechnicalChartMaster`가 모바일 전용 스크롤 컨테이너 클래스(`.tab-wrap`)를 쓰지
  않고 있어서 폰 프레임에서 스크롤 자체가 안 되던 버그도 발견해 수정 — 부모
  `.content-area`가 `overflow:hidden`이라 자식이 `.tab-wrap`(자체 스크롤)을 안 쓰면
  막힘.
- **`next.config.ts`에 `allowedDevOrigins` 추가 — 터널/LAN 접속 시 hydration 안 되던 문제**
  실기기(폰)에서 확인하려고 로컬 IP·Cloudflare Quick Tunnel로 접속했더니 스플래시
  화면(정적 HTML)은 뜨는데 "입장하기" 버튼이 아예 안 눌림 — Next.js dev 서버가
  `localhost`가 아닌 오리진에서의 정적 자산 요청을 DNS 리바인딩 방지 차원에서
  기본 차단해 클라이언트 JS가 hydrate되지 못한 것. LAN IP와 `*.trycloudflare.com`,
  `*.loca.lt`를 허용 오리진으로 등록해 해결.

### 2026-07-23
- **JS Economic Cycle Index 월간 자동 갱신 파이프라인 추가** — 자세한 내용은 위
  "BOOM-BURST 지수 → 종합지수 자동 갱신" 참고. `INDEX_PYTHON` 저장소의 계산 로직 중
  지표 재수집 + 종합지수 재계산 부분을 `scripts/economic_index/update_index.py`로 옮겨와
  GitHub Actions 월간 워크플로(`monthly_economic_index_update.yml`)로 자동화.
  첫 수동 실행에서 FRED_API_KEY 시크릿 값에 트레일링 공백이 섞여 400 에러가 났던 것도
  스크립트에 `.strip()` 방어 코드를 추가해 해결.
- **시장지표 탭 — 주요 지수에 국기 아이콘 추가**
  `MarketTab.jsx`에 `INDEX_FLAG_MAP`(지수명 → flagcdn 국가코드) 추가, 환율 카드가 쓰던
  `FxFlag`를 범용 `Flag` 컴포넌트로 일반화해서 지수 카드에도 재사용.
- **환율 CNY/KRW 누락 버그 수정** — Yahoo Finance가 `CNYKRW=X`에 대해 한동안 차트
  시계열을 1개만 반환해 "최소 2개 데이터 필요" 로직에 걸려 응답에서 통째로 빠지고
  있었음. `/api/market`의 `fetchChart()`가 시계열이 부족하면 `meta.regularMarketPrice`/
  `chartPreviousClose`로 폴백하도록 수정 + 캐시 키를 `market-v4`→`market-v5`로 올려서
  기존에 박혀있던 빈 응답 캐시 무효화.
- **원자재 아이콘 색상 정리** — 원유(보라색 물방울→갈색/동색), 은(초록 메달→은색 코인),
  BTC(금과 겹치던 주황→비트코인 공식 오렌지 `#F7931A`)로 교체. 금은 그대로 유지.
- **주요 지수 3개 추가** — 다우존스(`^DJI`), 유로스톡스50(`^STOXX50E`), 상해종합
  (`000001.SS`). `MarketTab.jsx`/`api/market/route.ts`/`InstrumentChartScreen.jsx`
  세 곳의 심볼·국기·단위 매핑에 동시 반영, 총 10개 지수로 미국·유럽·아시아 커버.
- **지수·환율·원자재 상세 차트를 TradingView 스타일로 전면 교체**
  기존엔 종가만 있는 Chart.js 라인차트 + 드래그 범위바였는데, 기술적 지표 탭
  (`StockChart.jsx`)과 동일한 lightweight-charts 캔들차트로 바꿈. `/api/chart/[ticker]`가
  Yahoo Finance에서 OHLCV를 받아 MA5/MA20/볼린저밴드(20,2)/rolling VWAP(20)/RSI(14)/
  MACD(12,26,9)까지 서버에서 계산해 내려주도록 확장. 거래량이 없는 심볼(FX)은 VWAP·
  거래량 패널을 자동으로 숨김. 작업 중 발견한 React 콘솔 에러(`border`/`borderColor`
  속성 충돌)를 이 화면과 `StockChart.jsx` 양쪽에서 같이 수정.
- **차트 아래 기술적 분석 의견(매수/매도/관망) 추가** — RSI·이동평균(MA5/MA20)·MACD
  히스토그램·볼린저밴드 4개 신호를 +1/-1로 점수화해 합산 2 이상이면 매수 관심, -2
  이하면 매도 관심, 그 사이는 관망으로 판정. 종목 상세(기업분석)의 SMC 지지/저항
  기반 판단과는 다른 단순 룰이라 구분되도록 명시. 지표별로 "지표가 뭔지 → 지금 값이
  뭘 뜻하는지 → 그래서 어떤 신호인지" 순서로 초보자도 읽을 수 있는 문장을 붙임
  (`rsiExplain`/`maExplain`/`macdExplain`/`bbExplain`).
- **최상위 네비게이션을 "공부하기 / 투자하기" 2단 구조로 재편** — 주린이도 쉽게
  접근할 수 있는 앱을 목표로, 기존 4개 탭(시장지표·기술적 지표·포트폴리오·기업분석)을
  "투자하기" 아래로 묶고, "공부하기"에 Econ Idea / Technical Idea / Stock Idea 3개
  하위 탭 신설. Technical Idea는 기존 `IndicatorGuideScreen`을 그대로 재사용(`onBack`
  prop을 옵셔널로 바꿔 단독 탭으로도 쓸 수 있게 함), Econ/Stock Idea는 콘텐츠 준비 전이라
  `ComingSoonScreen` 공통 컴포넌트로 "준비 중" 화면만 배치. 데스크톱은 사이드바에
  섹션 헤더로 그룹핑(`DesktopShell.jsx` 재작성), 모바일은 상단 섹션 스위치 버튼 2개 +
  하위 탭바 2단 구성(`globals.css`에 `.section-bar` 추가).
  → 작업 중 데스크톱에서 절대위치(`position:absolute`) 오버레이 화면을 사이드바 없이
  단독 탭으로 재사용하면 포지셔닝 컨텍스트를 잃고 사이드바를 덮어버리는 버그를 발견 —
  `DesktopShell.jsx`의 `main` 영역에 `position: relative`를 추가해 해결.
