# 프로젝트 지침

## ⚠️ Next.js 버전 주의

이 프로젝트의 Next.js(16.2.6, App Router + Turbopack)는 학습 데이터 시점보다 최신이라
API·컨벤션·파일 구조가 알고 있는 것과 다를 수 있다. 코드를 작성하기 전에
`node_modules/next/dist/docs/`의 관련 가이드를 확인하고, deprecation 안내를 그대로 따를 것.

## 프로젝트 개요

- Herencia — 가족의 자산 현황·수익률과 시장 지표(BOOM-BURST 공황/탐욕 지수, KOSPI200
  기술적 지표 스크리너)를 함께 보여주는 가족 투자 자산 통합 관리 대시보드.
- 대상 사용자: 가족 단위 개인 투자자(주식 초보 포함 — "공부하기" 섹션 존재).
- 스택: Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7(Better-SQLite3) ·
  Zustand · TanStack Query · Chart.js/Recharts/lightweight-charts.
- 반응형 단일 코드베이스: 1024px 미만은 모바일 폰 프레임 앱, 1024px 이상은 데스크톱
  사이드바+마스터/디테일 레이아웃으로 자동 전환(`src/hooks/useIsDesktop.js`).
- 화면 구성·API 목록·BOOM-BURST 계산식 등 상세 내용은 `README.md` 참고, 날짜별 변경
  이력은 `progress.md`의 "변경 이력 아카이브" 참고.

## 주요 경로

- 화면 컴포넌트: `src/components/redesign/` (탭·상세 화면 대부분 인라인 스타일)
- API 라우트: `src/app/api/` (Next.js Route Handlers)
- 공용 계산 로직: `src/lib/` — `stockAnalysis.ts`(매매신호/공포탐욕지수),
  `taIndicators.ts`(RSI/MACD/볼린저 등), `statisticalNormalization.ts`(percentile/z-score),
  `yahooChart.ts`, `herenciaTa.ts`, `googleNews.ts`
- DB 스키마: `prisma/schema.prisma` (SQLite)
- 자동화 스크립트: `scripts/` (경제지수 월간 갱신, ISABELNET 차트 수집, 종목 뉴스 수집 등
  GitHub Actions cron으로 실행)
- 테스트 코드는 아직 없음 (`__tests__`, `*.spec.*` 없음)

## 자주 쓰는 명령어

- 설치: `npm install`
- 로컬 실행: `npm run dev` (http://localhost:3000)
- 빌드: `npm run build` (`prisma generate` 포함)
- 프로덕션 실행: `npm start`
- 린트: `npm run lint`
- 타입 체크: `npx tsc --noEmit` (별도 스크립트 없음, tsconfig에 `noEmit: true` 설정됨)
- 유닛 테스트: 없음 — 변경 후 `npm run dev`로 직접 화면을 열어 동작을 확인할 것

## 작업 규칙

- `prisma/schema.prisma` 및 마이그레이션은 명시적 요청 없이 변경하지 않는다(기존 로컬
  SQLite 데이터에 영향).
- 요청하지 않은 새 의존성(npm 패키지)을 추가하지 않는다.
- 변경 범위는 요청받은 작업으로 한정한다 — 관련 없는 리팩토링·정리 금지.
- 테스트 스위트가 없으므로, 코드 변경 후에는 (1) `npm run lint`로 최소 검증하고
  (2) UI/화면 관련 변경이면 `npm run dev`로 실제 화면에서 동작을 확인한다. 브라우저로
  확인이 불가능한 환경이면 "확인 못 함"을 명시하고 수동 확인 방법을 안내한다.
- herencia-ta(`https://herencia-ta.onrender.com`), FRED, Yahoo Finance, Gemini 등
  외부 API를 호출하는 코드를 실행/테스트하기 전에는 요청 빈도(무료 API 제한)를
  고려한다 — 특히 200종목 순회 로직은 실수로 과호출하지 않도록 주의.
- GitHub Actions 워크플로(`.github/workflows/*.yml`)나 자동화 스크립트(`scripts/`)를
  수정할 때는 실제 실행(수동 `workflow_dispatch` 등)해보기 전에 사용자에게 먼저 알린다.

### 진행상황 추적 (`progress.md`)

다음에 해당하는 작업은 루트의 `progress.md`를 만들거나 갱신해 상태를 기록한다:
하루 이상 이어지는 작업, 여러 파일·테스트가 얽힌 기능, 중간에 사용자 승인 단계가
많은 작업, 여러 에이전트/세션에 걸쳐 진행하는 작업, 실패한 테스트나 남은 TODO를
추적해야 하는 작업.

- `progress.md`는 저장소에 있는 템플릿 형식(Goal/Current Status/Decisions/
  Completed/In Progress/Next Steps/Changed Files/Commands Run/Test Status/
  Risks)을 그대로 따르고, 파일 하단에는 완료된 작업을 날짜별로 쌓아두는 "변경 이력
  아카이브" 섹션을 둔다(README.md 대체).
- 작업 도중에는 `Current Status`·`Completed`·`In Progress`·`Next Steps`를 진행할 때마다
  갱신한다(끝나고 한 번에 몰아쓰지 않는다).
- 작업이 끝나면(Status: Done) 완료된 핵심 내용을 이 파일 하단의 "변경 이력 아카이브"
  섹션에 날짜별 항목으로 옮겨 적고(최신이 위), `Goal`~`Risks / Open Questions`의
  해당 작업 섹션은 비우거나 삭제한다 — README.md에는 변경 이력을 따로 쓰지 않는다
  (2026-08-05부터 `progress.md`가 유일한 변경 이력 위치).
- 간단한 한 번의 요청(파일 하나 수정, 질문 답변 등)에는 만들지 않는다 — 오버헤드가
  더 크다.

## 코드 스타일

- 새 추상화를 만들기 전에 같은 디렉터리의 기존 패턴을 먼저 따른다(예: 화면 컴포넌트는
  인라인 스타일, 공용 계산은 `src/lib/*.ts`로 분리).
- 지표·신호 계산처럼 "왜 이 값을 쓰는지"가 비직관적인 부분은 코드에 근거를 남긴다
  (임계값을 왜 그 값으로 잡았는지, 실측으로 뭘 발견했는지 등) — 이 저장소의 기존
  주석 스타일을 따를 것.
- 공식 데이터(herencia-ta 전일 종가 기준)와 실시간 근사 데이터(Yahoo 시간봉 합성)를
  섞어 쓰지 않는다 — 화면에 표시할 때 항상 어느 쪽인지 명확히 구분해서 보여준다.
- 기존 공개 API(Route Handler 응답 스펙, `src/lib`의 export 시그니처)는 작업 목적상
  명시적으로 바꿔야 하는 경우가 아니면 호환성을 유지한다.

## 보안

- `.env` 파일의 `FRED_API_KEY`, `GEMINI_API_KEY` 등 시크릿 값을 읽어서 출력하지 않는다.
- 토큰·키·가족 자산/거래 내역 같은 개인 데이터를 응답이나 커밋 메시지에 포함하지 않는다.
- 외부 서비스에 영향을 주는 명령(예: GitHub Actions 수동 실행, 배포 트리거, 외부 API에
  대량 요청)을 실행하기 전에는 먼저 사용자에게 확인한다.

---

@README.md
