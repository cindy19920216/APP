# Progress: 프로젝트 문서(README/CLAUDE.md) 정비 + 진행상황 추적 체계 도입

Last updated: 2026-08-05 00:30

## Goal

- README.md / CLAUDE.md / progress.md 역할을 분리하고 중복 내용을 정리한다: README는
  사람이 읽는 프로젝트 소개·화면 구성·API, CLAUDE.md는 Claude Code 작업 규칙·자주 쓰는
  명령어·주요 경로 같은 짧은 실행 지침, progress.md는 진행 중인 작업 상태 + 날짜별
  변경 이력 아카이브로 역할을 나눈다.
- 하루 이상 이어지거나, 여러 파일·테스트가 얽히거나, 사용자 승인 단계가 많거나,
  여러 세션에 걸쳐 진행되는 작업을 추적할 수 있도록 `progress.md` 컨벤션을 도입한다.

## Current Status

- Status: In progress
- Current focus: README/CLAUDE.md 중복 제거 마무리, progress.md 컨벤션을 CLAUDE.md
  작업 규칙에 반영
- Branch: main
- Related issue/PR: 없음 (직접 커밋)

## Decisions

- [2026-08-05] (수정됨, 아래 항목이 대체) ~~progress.md는 "현재 진행 중인 작업" 전용
  살아있는 문서로 두고, 작업이 끝나면 완료 내용은 README의 "변경 이력"으로 옮기고
  progress.md 해당 항목은 비운다~~ — 사용자가 재검토를 요청해 아래 항목으로 뒤집힘.
- [2026-08-05] README의 "변경 이력" 섹션(2026-07-23~08-04, 날짜별 상세 항목 전체)을
  통째로 이 파일의 "변경 이력 아카이브" 섹션으로 이관하고 README에서는 삭제 —
  README 변경 이력은 이미 완료된 기능 수십 개가 누적된 영구 아카이브라 애초에
  progress.md 템플릿(진행 중인 작업 1건 추적용)과 어울리지 않는다는 우려가 있었으나,
  사용자가 명확히 "전체 이관"을 선택함. 앞으로 새 변경 이력 항목은 작업이 끝나는 대로
  이 파일의 아카이브 섹션에 직접 추가한다(README에는 더 이상 안 씀).
- [2026-08-05] CLAUDE.md에 있던 "실행 방법" 명령어 목록을 README에서 제거하고 CLAUDE.md
  "자주 쓰는 명령어"를 가리키도록 변경 — 두 파일에 동일한 npm 명령어 목록이 중복돼
  있었음.
- [2026-08-05] README의 프로젝트 개요 인트로 문단(반응형 설명)과 기술 스택 표는 CLAUDE.md
  개요와 문구가 겹치지만 유지하기로 함 — README를 처음 보는 사람에게 필요한 최소 소개와
  정확한 버전 정보라 삭제 시 정보 손실이 있다고 판단, 사용자 확인 대기 중.

## Completed

- [x] KOSPI200 매매신호를 이산 투표(±2 임계값) → 추세/모멘텀/평균회귀/엘더 임펄스
      4개 그룹 가중 앙상블 모델로 재설계 (`src/lib/stockAnalysis.ts`)
- [x] `statisticalNormalization.ts` 신설 (percentile/z-score, ATR 기반 변동성 배율)
- [x] `computeTimeframeAlignment` 추가 (일봉/주봉/60일 레인지 정합 판단)
- [x] `/api/market` 전일 종가 계산 버그 수정 (시간봉 기반 재구성, `market-v6`→`v8`)
- [x] 위 변경사항 커밋(`e1ea085`) + origin/main push 완료
- [x] README에 2026-08-04 변경 이력 항목 추가 (이후 아래 항목에서 progress.md로 재이관)
- [x] CLAUDE.md를 표준 템플릿(개요/명령어/작업규칙/코드스타일/보안) 구조로 재작성
- [x] README "실행 방법" 명령어 블록을 CLAUDE.md 참조로 축약(중복 제거)
- [x] progress.md 컨벤션을 CLAUDE.md "작업 규칙"에 명문화 (진행상황 추적 절 추가)
- [x] README "변경 이력" 섹션 전체(2026-07-23~08-04)를 이 파일 하단 "변경 이력
      아카이브"로 이관하고 README에서 삭제, README에는 이 파일을 가리키는 한 줄만 남김

## In Progress

- [ ] README/CLAUDE.md 잔여 중복 검토 — 인트로 반응형 설명·기술 스택 표를 추가로
      지울지 사용자 확인 대기
- [ ] CLAUDE.md "진행상황 추적" 절의 문구를 새 아카이브 위치(progress.md, README 아님)에
      맞게 재확인

## Next Steps

1. CLAUDE.md "진행상황 추적" 절 문구를 "완료되면 README로 옮긴다" → "완료되면 이 파일의
   변경 이력 아카이브 섹션에 남긴다"로 갱신
2. README.md / CLAUDE.md / progress.md 수정사항 커밋 + push 여부 사용자에게 확인
3. (사용자 응답에 따라) README 인트로/기술 스택 표 추가 정리 여부 결정

## Changed Files

- `README.md`: "실행 방법" 명령어 목록 제거(CLAUDE.md로 이관), 앙상블 모델 반영해
  InstrumentChartScreen 설명 문구 갱신, lib 구조에 `statisticalNormalization.ts` 추가,
  "변경 이력" 섹션 전체(약 270줄, 2026-07-23~08-04)를 삭제하고 이 파일을 가리키는
  한 줄로 대체
- `CLAUDE.md`: 표준 템플릿 구조로 전면 재작성(프로젝트 개요/주요 경로/명령어/작업규칙/
  코드스타일/보안), 기존 Next.js 버전 경고는 상단에 유지, 하단 `@README.md` include 유지,
  "진행상황 추적(progress.md)" 작업 규칙 절 추가
- `progress.md`: 신규 생성(본 파일) + README에서 이관한 변경 이력 아카이브 추가
- `src/lib/stockAnalysis.ts`, `src/lib/statisticalNormalization.ts`,
  `src/app/api/market/route.ts`, `src/components/redesign/InstrumentChartScreen.jsx`,
  `src/components/redesign/ScreenerScreen.jsx`, `kospi_capitulation_index.py`:
  커밋 `e1ea085`로 이미 반영·push 완료 (상세는 아래 "변경 이력 아카이브" 2026-08-04 참고)

## Commands Run

```text
git add -A && git commit -m "feat: 매매신호 앙상블 가중치 모델 + 통계적 정규화, 전일 종가 계산 버그 수정"
→ [main 5aa09e6] 커밋 성공 (7 files changed)

git fetch origin && git pull --rebase origin main
→ origin에 자동 뉴스/차트 수집 커밋(news, isabelnet) 4건 존재, rebase 성공

git push origin main
→ 231d729..e1ea085 main -> main, push 성공
```

## Test Status

- Last passing: 해당 없음 (저장소에 테스트 스위트 없음)
- Failing: 없음
- Not run: 유닛 테스트 자체가 없음 — 코드 변경분은 `npm run dev`로 화면 수동 확인 필요
  (아직 미실행, 다음 세션에서 확인 권장)

## Risks / Open Questions

- README에서 인트로 반응형 설명·기술 스택 표까지 CLAUDE.md와 중복이라고 보고 지울지
  아직 사용자 확인 전 — 잘못 지우면 README의 최소 소개 정보가 없어질 수 있어 판단 보류.
- 매매신호 앙상블 모델 변경(임계값 ±0.20 등)은 200종목 실측 기반 추정치라, 실제 운영
  중 매수/매도 비율이 기존 이산 투표 방식과 크게 달라지는지 후속 관찰 필요.

---

## 변경 이력 아카이브

README.md "변경 이력" 섹션(2026-07-23~08-04)을 2026-08-05에 그대로 이관. 새 항목은
작업이 끝날 때마다 맨 위(최신순)에 추가한다.

### 2026-08-04
- **KOSPI200 매매신호를 이산 투표에서 앙상블 가중치 모델로 재설계** — 기존
  `computeApproxSignalDetail`은 6개 지표를 각각 -1/0/+1로 이산화해 단순 합산(±2
  임계값)했는데, RSI 31과 RSI 69.9가 똑같이 "1표"로 취급되고 후행 지표(MA5/MA20)와
  선행 지표(RSI/MACD)가 같은 무게를 받는 문제가 있었다. 추세(MA5/MA20+MA60 이격)·
  모멘텀(RSI+MACD)·평균회귀(볼린저 %B)·엘더 임펄스 4개 그룹으로 묶어 각각 -1~+1
  연속 점수로 계산한 뒤 가중합하도록 변경, 볼린저 밴드폭으로 변동성 국면을 추정해
  저변동성엔 추세 가중치를, 고변동성엔 모멘텀·평균회귀 가중치를 자동으로 높인다
  (레짐 의존 가중치). 화면에 보이는 지표별 배지(RSI/MA/MACD/BB/엘더/MA60)는 기존
  이산 판정을 그대로 유지 — "판단 근거" 카드 표시 방식은 안 바뀌고 6개를 합쳐 최종
  매수/매도/관망을 내는 방식만 바뀌었다.
- **`statisticalNormalization.ts` 신설** — RSI 같은 지표를 30/70 같은 고정 임계값
  대신 종목 자신의 과거 분포에서 지금이 몇 percentile/z-score인지로 설명하는
  유틸(`normalizeIndicator`), 그리고 오늘 가격 변동폭을 Wilder ATR(14) 대비 배율로
  "소폭/일반적/평균보다 큰/역사적으로 드문"으로 분류하는 유틸(`computeVolatilityContext`,
  `describeVolatilityMultiple`) — 기존 median-diff 휴리스틱을 대체. 판정 로직 자체를
  바꾸는 게 아니라 설명 문구에 통계적 맥락을 덧붙이는 용도.
- **`computeTimeframeAlignment` 추가** — 일봉 추세(MA5 vs MA20)·주봉 추세
  (`computeWeeklyTrend`)·60일 레인지 내 위치(고점권/저점권), 서로 다른 시간축의
  지표 3개가 같은 방향을 가리키는지(정합) 판단해 `aligned_bullish`/`aligned_bearish`/
  `conflicting`/`insufficient` 4가지로 분류. 상승·하락 축이 실제로 하나씩 충돌할 때만
  `conflicting`으로 구분하고, 단순히 신호가 약한 경우는 `insufficient`로 따로 둬서
  "정말 방향이 부딪히는 경우"와 "그냥 신호가 약한 경우"를 화면에서 혼동하지 않게 했다.
- **`/api/market` 전일 종가 계산 버그 수정** — 일봉(`interval=1d`) close 배열에서
  null만 걸러 마지막 두 값을 비교하던 기존 방식이, KOSPI처럼 특정 날짜의 일봉 close가
  통째로 null로 오는 심볼에서 그 날을 건너뛰고 더 이전 거래일과 비교해 등락률이 크게
  틀어지는 걸 발견(실측: 실제 +1.6%인데 -3.6%로 계산). `meta.chartPreviousClose`로
  바꿔봤지만 이 필드는 `range` 파라미터에 따라 서로 다른(그리고 실제 어느 날짜
  종가와도 안 맞는) 값을 줘서 더 못 믿을 물건이었음. 최종적으로 시간봉
  (`interval=60m`)을 KST 날짜별로 묶어 "가장 최근 완결된 거래일의 마지막 시간봉
  종가"를 직접 재구성하는 방식으로 교체(캐시 키 `market-v6`→`market-v8`).
- **`kospi_capitulation_index.py` (프로토타입, 앱 미통합)** — 모간스탠리
  Capitulation Index(VIX·Put/Call·AAII·RSI/%>200MA·HY OAS)를 한국 시장 데이터로
  역산 재구성한 실험 스크립트. VKOSPI·개인 순매수 강도·KOSPI200 200일선 상회 비율·
  회사채-국고채 스프레드로 대체해 3년 롤링 z-score 합성. 원본 가중치는 비공개라
  추정치 기반이며, KRX/ECOS 네트워크 접근이 되는 로컬 환경에서만 실행 가능 —
  현재는 로컬 실행 전용 프로토타입으로 앱 파이프라인에는 연결돼 있지 않음.

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
