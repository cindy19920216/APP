# JS Economic Cycle Index (패닉-붐 지수)

미국 거시지표 7개로 경기 국면을 0~100으로 수치화한 지수. **높을수록 과열(붐), 낮을수록 위기(패닉)**.
연합인포맥스 패닉-붐 지표 구조를 참고하되 AI붐·미중 무역갈등·QE/QT 뉴노멀을 반영.
(2026-11 `Desktop/INDEX_PYTHON` 프로젝트에서 이전. PPT/Excel 산출은 폐기.)

## 파일

| 파일 | 역할 | 실행 |
|---|---|---|
| `update_index.py` | FRED 7개 지표 재수집 → 종합지수 재계산 → `index-data/*.csv` | GitHub Actions 매월 6일 07:00 KST (`monthly_economic_index_update.yml`) |
| `update_weights.py` | GDP 회귀 → 가중치 재산출 + 종합지수 분포 → 경계값 추천 + 주요 국면 검증 | **분기마다 로컬 수동** |
| `index-data/regression_weights.json` | 현재 가중치 | `update_weights.py --save`로만 갱신 |
| `src/app/api/boom-burst/route.ts` | CSV 읽어 앱에 제공, `COMPOSITE_BOUNDS` 보관 | — |

## 분기 갱신 절차

```bash
python scripts/economic_index/update_weights.py          # 1. 미리보기 (가중치 변화·추천 경계값·검증값)
python scripts/economic_index/update_weights.py --save   # 2. 괜찮으면 저장
# 3. 추천 경계값이 route.ts COMPOSITE_BOUNDS와 크게 다르면 route.ts 수정
python scripts/economic_index/update_index.py            # 4. 새 가중치로 composite_index.csv 재계산
git add index-data src/app/api/boom-burst/route.ts && git commit && git push   # 5. 배포
```

`FRED_API_KEY`는 환경변수 또는 `APP/.env`에서 읽음.

## 지표

| 지표 | FRED ID | 카테고리 | 패닉 방향 | 변환 | 회귀 시차 | 근거 |
|---|---|---|---|---|---|---|
| 소비자신뢰지수 | `UMCSENT` | 실물 | 낮을수록 | — | 1Q | 소비 심리 → 소비 지출 |
| 비국방 자본재 수주 | `NEWORDER` | 실물 | 낮을수록 | YoY | 1Q | 수주 → 생산 |
| 주간 실업수당 청구 | `ICSA` | 실물 | 높을수록 | — | 0Q | 고용 동행 |
| 10Y-2Y 스프레드 | `T10Y2Y` | 금융 | 낮을수록 | — | 4Q | 역전 → 침체 6~18개월 선행 |
| VIX | `VIXCLS` | 금융 | 높을수록 | — | 1Q | 금융 충격 → 실물 |
| M2 | `M2SL` | 유동성 | 낮을수록 | YoY | 3Q | 통화 → 실물 6~12개월 |
| 1년 기대 인플레이션 | `MICH` | 물가 | **낮을수록** | — | 1Q | 침체기 수요 위축 → 기대 인플레 하락 |

선택 기준(OECD CLI 방법론 준용): GDP 선행성, 경기 사이클 적합성, 지표 간 중복 최소화, 뉴노멀 포착력.

## 계산

1. 월간 리샘플(월초 기준 평균), `NEWORDER`·`M2SL`은 YoY(%) 변환
2. **Rolling 20년(240개월)** 백분위수 (`min_periods=12`), 1996-01 이후만 사용
3. 패닉 방향 정렬: `panic_up=False` 지표는 `100 − 백분위`
4. 종합지수 = `100 − 가중평균(패닉 방향 백분위)`
5. **M-1 원칙**: 7개 지표가 모두 발표된 마지막 월까지만 산출 (잠정치 주입 없음 → 실시간 대비 1~2개월 지연)

## 가중치

GDP 성장률(`GDPC1` YoY)에 각 지표(시차 적용, 분기 평균)를 회귀 — **전체 구간 OLS + COVID 더미(2020Q1–Q2)**로
COVID 구조 이탈이 β에 흡수되지 않게 통제. 표준화 β 절대값 비율 = 가중치. 회귀 실패 시 `DEFAULT_WEIGHTS` fallback.

| 지표 | 회귀 가중치 (2026-06-23, R²=0.668) | DEFAULT (근거) |
|---|---|---|
| ICSA | 28.6% | 14% (Taylor Rule, 고용 선행) |
| NEWORDER | 25.2% | 21% (Stock & Watson 2003) |
| M2SL | 15.8% | 9% (QE/QT 뉴노멀) |
| MICH | 12.0% | 4% (UMCSENT와 상관 높음) |
| UMCSENT | 7.0% | 26% (Stock & Watson 2003) |
| T10Y2Y | 6.4% | 20% (Estrella & Mishkin 1998) |
| VIXCLS | 5.0% | 6% (Gilchrist & Zakrajšek 2012) |

## 상태 구간

종합지수 실제 분포의 10/30/70/90 백분위로 설정 — `COMPOSITE_BOUNDS = [31, 47, 59, 68]` (route.ts).
가중치를 바꾸면 `update_weights.py` 추천값을 보고 재조정.

| 0~31 | 31~47 | 47~59 | 59~68 | 68~100 |
|---|---|---|---|---|
| 위기 | 둔화 | 중립 | 호조 | 과열 |

개별 지표(패닉 방향 백분위): 0~10 과열 / 10~30 호조 / 30~70 중립 / 70~90 둔화 / 90~100 위기.

### 주요 국면 검증

| 날짜 | 지수 | 상태 | |
|---|---|---|---|
| 2008-12 | 21.4 | 위기 | GFC (Lehman 이후) |
| 2020-04 | 21.1 | 위기 | COVID 쇼크 |
| 2018-01 | 62.7 | 호조 | 미중 무역전쟁 전 |
| 2022-01 | 76.7 | 과열 | Fed 긴축 전야 |
| 2022-10 | 57.3 | 중립 | 금리 피크 |
| 2025-04 | 52.2 | 중립 | Liberation Day 관세 쇼크 |

## 참고문헌
- OECD (2008). *System of Composite Leading Indicators.*
- Emerson, R. & Hendry, D.F. (1996). *An Evaluation of Forecasting Using Leading Indicators.* Journal of Forecasting.
- Stock, J.H. & Watson, M.W. (2003). *Forecasting Output and Inflation: The Role of Asset Prices.* JEL.
- Estrella, A. & Mishkin, F.S. (1998). *Predicting U.S. Recessions: Financial Variables as Leading Indicators.* REStat.
- Gilchrist, S. & Zakrajšek, E. (2012). *Credit Spreads and Business Cycle Fluctuations.* AER.
