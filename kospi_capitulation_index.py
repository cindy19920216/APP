# -*- coding: utf-8 -*-
"""
KOSPI Capitulation Index (프로토타입)
=====================================
모간스탠리 "Capitulation Index" (Exhibit 4)의 시각적 특징을 역산하여
한국 증시 버전으로 재구성한 합성 지표.

** 주의 **
- 모간스탠리 원본의 정확한 구성지표/가중치는 비공개이며, 이 스크립트는 추정(inference)에 기반한
  프로토타입입니다. 원본과 동일한 결과를 보장하지 않습니다.
- 실데이터 사용 현황(2026-08 기준):
  - 200일선 상회 비율: Yahoo Finance(이 프로젝트가 `src/lib/yahooChart.ts`에서 이미 쓰는
    소스, `{종목코드}.KS` 심볼)로 KOSPI 시장 전체 상장종목(2026-08-20부터, 이전엔
    KOSPI200 200종목만)의 일별 종가를 받아 실데이터 계산. 티커 목록은
    `FinanceDataReader.StockListing('KOSPI')`(KRX 로그인 불필요)로 받은 '현재' 상장종목
    구성을 과거 전체 기간에 그대로 적용하는 근사치.
    KRX Open API(`stk_bydd_trd`)도 시도했으나 AUTH_KEY 발급과 별개로 서비스별 "이용신청"
    승인이 필요해(발급만으로는 401 Unauthorized) 승인 없이 바로 쓸 수 있는 Yahoo로 대체함.
  - 신용 스프레드: ECOS API(`ECOS_API_KEY`, https://ecos.bok.or.kr 발급)로 실데이터.
  - VKOSPI, 개인 순매도 강도, 신용융자 잔고 증감률: 2026-08-20부터 KRX 대신 다른 소스의
    실데이터로 전환(모두 실패 시에만 synthetic으로 폴백):
    - VKOSPI(내재변동성) 자체는 KRX가 산출을 독점하고 있어 무료로 구할 수 있는 곳이 없음
      (네이버금융/야후파이낸스/TradingView/Investing.com 모두 확인함). 대신 KOSPI 지수
      (Yahoo Finance `^KS11`) 일별수익률의 20거래일 롤링 실현변동성(연율화)을 대용치로 사용.
    - 개인 순매도 강도: 네이버금융 `investorDealTrendDay.naver`(KOSPI 일자별 투자자
      순매수, 2006년 이후 존재, 로그인 불필요) — page 파라미터로 페이지네이션되어 있어
      구간을 덮을 때까지 순차 조회.
    - 신용융자 잔고 증감률: 금융투자협회(KOFIA) `freesis.kofia.or.kr`(KRX와 무관한 별도
      자율규제기구) '신용공여 잔고 추이' 통계 — 세션/로그인 없이 단일 POST 요청으로 조회
      기간 전체를 한 번에 받을 수 있음(2026-08-20 확인).
  - `ECOS_API_KEY`는 `.env`에 넣으면 자동 인식.
- 필요 패키지: pandas, numpy, requests, matplotlib, python-dotenv (pykrx 불필요 — 2026-08-20
  KRX 의존 제거)

방법론 요약
-----------
1. 주간(금요일) 리샘플링
2. 구성지표 5개를 각각 "값이 클수록 패닉"이 되도록 부호 정렬
3. 각 지표를 3년(156주) 롤링 z-score로 표준화 (MAD 기반 robust z-score)
4. 5개 z-score 단순평균 → 합성지수(raw composite)
5. 합성지수를 전체 기간 기준으로 재표준화(re-standardize)한 뒤 부호를 반전 → 최종
   Capitulation Index (이 재표준화 덕분에 ±1SD 밴드가 정확히 ±1.0에 위치)

부호 규약: **음수 = 항복/과매도(캐피튤레이션, 매수 관심), 양수 = 과열(euphoria)**.
2~4단계까지는 계산 편의상 "양수=패닉"으로 정렬해서 진행하지만, 마지막 5단계에서 -1을
곱해 원본 모간스탠리 Capitulation Index(Exhibit 4)와 같은 부호 규약으로 맞춘다.
2026-08-20에 원본 차트(2026-07-30 기준 -2.53, "-1SD를 하회하는 극단적 과매도")와 직접
비교해보니, 부호 반전 전에는 2008 GFC(+4.6)·2020 코로나 급락(+3.2) 같은 실제 패닉 구간이
전부 양수로 나와 원본과 반대였던 것을 확인하고 고쳤다.

구성지표 (한국 시장 대체)
-------------------------
| 카테고리      | 원본(미국)        | 대체(한국)                                  | 방향처리        |
|----------------|-------------------|---------------------------------------------|-----------------|
| 변동성         | VIX               | VKOSPI                                       | 그대로 (상승=패닉) |
| 옵션 포지셔닝  | Put/Call Ratio    | (데이터 접근 제한 시 생략 가능)               | 그대로           |
| 수급/심리      | AAII Bull-Bear    | 개인 순매도 강도 (개인 순매수대금 / 거래대금) | 부호반전(순매도↑=패닉) |
| 기술적 과매도  | RSI, %>200MA      | KOSPI 전체 상장종목 200일선 상회 비율          | 부호반전(비율↓=패닉) |
| 신용 스트레스  | HY OAS 스프레드   | 회사채(BBB-)-국고채(3년) 스프레드 (ECOS)      | 그대로 (확대=패닉) |
"""

import os
import json
import time
from datetime import datetime, timezone
import numpy as np
import pandas as pd

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ------------------------------------------------------------------
# 0. 설정
# ------------------------------------------------------------------
START_DATE = "20080101"
# 주간 자동 갱신(GitHub Actions, 매주 월요일 KST)이 항상 "오늘"까지 최신 데이터를 받도록
# 기본값을 동적으로 설정. 특정 시점을 재현하려면 환경변수 CAPITULATION_END_DATE(YYYYMMDD)로
# 덮어쓸 수 있다.
END_DATE = os.getenv("CAPITULATION_END_DATE", "").strip() or datetime.now(timezone.utc).strftime("%Y%m%d")
ROLL_WEEKS = 156          # 3년 롤링 (52주 * 3)
MAD_THRESHOLD = 4.0        # MAD clipping 배수 (quant-factor-model 스킬과 동일 관례)

# 시크릿은 .env 파일(또는 환경변수)에서만 읽는다 — 코드에 하드코딩하지 않음.
ECOS_API_KEY = os.getenv("ECOS_API_KEY", "").strip()  # https://ecos.bok.or.kr 발급

# 200일선 상회비율 계산용 캐시 (반복 실행 시 Yahoo Finance 재호출 방지).
# GitHub Actions 주간 자동 갱신에서는 outputs/krx_cache를 actions/cache로 실행 간에
# 보존해 매주 전체 재수집을 피한다 — 아래 fetch_kospi_close_panel_yahoo/
# fetch_individual_sell_pressure/fetch_kospi_all_tickers가 캐시를 증분(새 구간만) 갱신한다.
KRX_CACHE_DIR = "outputs/krx_cache"
YAHOO_PRICE_CACHE_PATH = os.path.join(KRX_CACHE_DIR, "yahoo_kospi200_close.csv")
YAHOO_CACHE_RANGE_PATH = os.path.join(KRX_CACHE_DIR, "yahoo_kospi200_close_range.json")
YAHOO_TICKER_SUFFIX_CACHE_PATH = os.path.join(KRX_CACHE_DIR, "yahoo_ticker_suffix.json")
KOSPI_ALL_TICKERS_CACHE_PATH = os.path.join(KRX_CACHE_DIR, "kospi_all_tickers.json")
KOSPI_ALL_TICKERS_TTL_DAYS = 30  # 캐시가 실행 간에 보존돼도 상장/폐지 변동을 반영하도록 주기적 재조회
BREADTH_MA_WINDOW = 200  # 200일 이동평균선

# ------------------------------------------------------------------
# 1. 고품질 가상 데이터 생성기 (네트워크 실패 및 로컬 API 제한 대응)
# ------------------------------------------------------------------

def generate_synthetic_series(name: str, start: str, end: str) -> pd.Series:
    """네트워크 또는 API 호출 실패 시 활용하는 고품질 시뮬레이션 데이터 생성기.
    주요 위기 기간(GFC, 유로존 위기, 코로나19, 고금리 등)의 실제 한국 시장 변동 패턴을 재현합니다."""
    dates = pd.date_range(start=pd.to_datetime(start), end=pd.to_datetime(end), freq="D")
    n = len(dates)
    
    np.random.seed(42)  # 재현 가능하도록 시드 고정
    
    # 한국 증시 주요 크래시/패닉 이벤트 정의
    crises = [
        ("2008-09-01", "2009-04-30", 1.0),  # 글로벌 금융위기
        ("2011-08-01", "2011-11-30", 0.6),  # 미국 신용등급 강등 및 유럽 재정위기
        ("2015-08-01", "2016-02-28", 0.3),  # 위안화 평가절하 및 중국 증시 쇼크
        ("2018-10-01", "2018-12-31", 0.4),  # 미중 무역전쟁 및 긴축 쇼크
        ("2020-02-15", "2020-05-31", 0.8),  # 코로나19 팬데믹 쇼크
        ("2022-09-01", "2022-12-31", 0.5),  # 레고랜드 사태 및 급격한 금리인상 쇼크
    ]
    
    # 위기 가중치 시계열 (사인 곡선 형태로 부드럽게 전개)
    crisis_weights = np.zeros(n)
    for s_date, e_date, strength in crises:
        s_dt = pd.to_datetime(s_date)
        e_dt = pd.to_datetime(e_date)
        mask = (dates >= s_dt) & (dates <= e_dt)
        if np.any(mask):
            sub_dates = dates[mask]
            total_days = (e_dt - s_dt).days or 1
            elapsed_days = (sub_dates - s_dt).days
            # 하프 사인 곡선으로 영향력 모델링 (상승 후 하강)
            weights = np.sin(np.pi * elapsed_days / total_days) * strength
            crisis_weights[mask] = np.maximum(crisis_weights[mask], weights)
            
    # 노이즈 및 추세 컴포넌트
    raw_noise = np.random.randn(n)
    smooth_noise = pd.Series(raw_noise).rolling(60, min_periods=1).mean().values
    
    if name == "vkospi":
        # VKOSPI: 평소 12~18, 패닉 시 35~60 이상 급등
        base = 14.5
        val = base + smooth_noise * 3.5 + raw_noise * 1.2 + crisis_weights * 32.0
        val = np.clip(val, 9.5, 75.0)
        return pd.Series(val, index=dates, name="vkospi")
        
    elif name == "sell_pressure":
        # 개인 순매도 강도 (개인 순매수대금 / 거래대금의 부호반전):
        # 평소 -0.1~0.1, 패닉 셀링 시 +0.35 이상으로 급증
        base = -0.02
        val = base + smooth_noise * 0.04 + raw_noise * 0.08 + crisis_weights * 0.28
        return pd.Series(val, index=dates, name="sell_pressure")
        
    elif name == "credit_growth":
        # 신용융자 잔고 증감률 (부호 반전 완료됨):
        # 평소에는 잔고가 서서히 늘어나므로 잔고 증감률이 양수이며, 패닉 시에는 반대매매로 급감(-)함.
        # 따라서, 부호가 반전된 패닉 지표로서는 평소 음수(-), 위기 시 양수(+) 값을 가짐.
        base = -0.15  # 평소 신용융자 서서히 증가 (패닉 기준 음수)
        val = base + smooth_noise * 0.4 + raw_noise * 0.6 + crisis_weights * 4.2
        return pd.Series(val, index=dates, name="credit_growth")
        
    elif name == "breadth_200ma":
        # KOSPI 전체 상장종목 200일 이동평균선 상회 비율 (원래는 0.0~1.0):
        # 평소 0.5~0.8, 대세 하락장/패닉 시 0.05~0.15로 급감.
        base = 0.58
        val = base + smooth_noise * 0.15 + raw_noise * 0.04 - crisis_weights * 0.48
        val = np.clip(val, 0.02, 0.98)
        return pd.Series(val, index=dates, name="breadth_200ma")
        
    elif name == "credit_spread":
        # BBB- 회사채 스프레드 (%p): 평소 2.8%~3.8%, 유동성 락다운/신용 스트레스 시 5.5%~9.5%로 급격히 확대
        base = 3.1
        val = base + smooth_noise * 0.6 + raw_noise * 0.12 + crisis_weights * 4.8
        val = np.clip(val, 1.4, 12.0)
        return pd.Series(val, index=dates, name="credit_spread")
        
    else:
        raise ValueError(f"Unknown synthetic name: {name}")

# ------------------------------------------------------------------
# 2. 개별 지표 수집 함수 (API 실패 시 가상 데이터 fallback 포함)
# ------------------------------------------------------------------

def fetch_vkospi(start: str, end: str) -> pd.Series:
    """VKOSPI 대용치: KOSPI 지수(Yahoo Finance `^KS11`) 일별수익률의 20거래일 롤링
    실현변동성(연율화, %). VKOSPI(내재변동성)는 KRX가 산출을 독점하고 있어 KRX 로그인
    세션 없이는 무료로 구할 수 있는 곳이 없음(네이버/야후/TradingView/Investing.com
    모두 확인함, 2026-08-20). 실현변동성은 내재변동성과 정확히 같지는 않지만 방향성
    (패닉 시 급등)은 동일하게 포착하는 표준적인 대체 지표."""
    try:
        period1 = int(pd.to_datetime(start).timestamp())
        period2 = int(pd.to_datetime(end).timestamp())
        close = fetch_yahoo_daily_close("%5EKS11", period1, period2)  # ^KS11 = KOSPI 지수
        if close.empty:
            raise ValueError("Yahoo Finance에서 ^KS11 데이터를 받지 못했습니다")
        log_ret = np.log(close / close.shift(1))
        realized_vol = log_ret.rolling(window=20, min_periods=15).std() * np.sqrt(252) * 100
        print("[Info] Successfully computed VKOSPI proxy (KOSPI realized volatility) from Yahoo Finance.")
        return realized_vol.dropna().rename("vkospi")
    except Exception as e:
        print(f"[Warning] Failed to compute VKOSPI proxy via Yahoo Finance ({e}). Falling back to synthetic generator...")
        return generate_synthetic_series("vkospi", start, end)


def fetch_individual_sell_pressure(start: str, end: str) -> pd.Series:
    """개인 순매도 강도 = -(개인 순매수대금) / (개인+외국인+기관계+기타법인 순매수대금의 절대값 합).
    값이 클수록(개인이 강하게 순매도) 패닉 신호로 해석.
    소스: 네이버금융 `investorDealTrendDay.naver`(KOSPI 일자별 투자자 순매수, 억원 단위,
    2006년 이후 데이터 존재 확인, KRX 로그인 불필요) — page 파라미터로 10행씩 과거로
    페이지네이션되어 있어 요청 기간을 덮을 때까지 순차 조회한다.

    캐시가 요청 시작일을 덮고 있으면(=이미 전체 히스토리를 한 번 받아둔 상태) 캐시 마지막
    날짜 다음날부터 요청 종료일까지만 새로 페이지네이션해서 이어붙인다 — 주간 자동 갱신처럼
    end만 매번 앞으로 이동하는 경우 매번 2008년부터 460+페이지를 다시 긁는 걸 방지한다.
    캐시가 아예 없거나 캐시 시작일이 요청 시작일보다 늦으면 전체 기간을 새로 받는다."""
    cache_path = os.path.join(KRX_CACHE_DIR, "naver_investor_trend.csv")
    os.makedirs(KRX_CACHE_DIR, exist_ok=True)
    start_dt, end_dt = pd.to_datetime(start), pd.to_datetime(end)

    cached = pd.DataFrame()
    if os.path.exists(cache_path):
        cached = pd.read_csv(cache_path, index_col=0, parse_dates=True)

    def _pressure_from(df: pd.DataFrame) -> pd.Series:
        net_indiv = df["indiv"]
        total_value = df[["indiv", "foreign", "inst", "other_corp"]].abs().sum(axis=1)
        return (-(net_indiv / total_value)).rename("sell_pressure")

    covers_start = not cached.empty and cached.index.min() <= start_dt
    if covers_start and cached.index.max() >= end_dt:
        print("[Info] 네이버금융 투자자 순매수 캐시를 재사용합니다(요청 범위 전체 커버).")
        return _pressure_from(cached.loc[(cached.index >= start_dt) & (cached.index <= end_dt)])

    fetch_from_dt = (cached.index.max() + pd.Timedelta(days=1)) if covers_start else start_dt
    if covers_start:
        print(f"[Info] 네이버금융 투자자 순매수를 {fetch_from_dt.strftime('%Y-%m-%d')}부터 증분 조회합니다.")

    try:
        import re
        import requests
        headers = {"User-Agent": "Mozilla/5.0"}
        url = "https://finance.naver.com/sise/investorDealTrendDay.naver"
        bizdate = end_dt.strftime("%Y%m%d")
        row_pattern = re.compile(
            r'<td class="date2">([\d.]+)</td>((?:\s*<td class="rate_\w+3">-?[\d,]+</td>){10})'
        )
        rows = {}
        page = 1
        max_pages = 2000  # 안전장치(무한루프 방지) — 실제로는 fetch_from_dt 도달 시 훨씬 먼저 중단됨
        while page <= max_pages:
            r = requests.get(url, headers=headers, params={"bizdate": bizdate, "sosok": "01", "page": page}, timeout=15)
            r.encoding = "euc-kr"
            matches = row_pattern.findall(r.text)
            if not matches:
                break
            reached_cutoff = False
            for date_str, values_html in matches:
                d = pd.to_datetime(date_str, format="%y.%m.%d")
                if d > end_dt:
                    continue
                if d < fetch_from_dt:
                    reached_cutoff = True
                    continue
                nums = [float(v.replace(",", "")) for v in re.findall(r">(-?[\d,]+)<", values_html)]
                # 열 순서: 개인, 외국인, 기관계, (기관 세부 6개 — 미사용), 기타법인
                rows[d] = {"indiv": nums[0], "foreign": nums[1], "inst": nums[2], "other_corp": nums[9]}
            if reached_cutoff:
                break
            page += 1
            time.sleep(0.15)
            if page % 100 == 0:
                print(f"[Info] 네이버금융 투자자 순매수 {page}페이지 조회 중...")

        if not rows and not covers_start:
            raise RuntimeError("네이버금융에서 투자자 순매수 데이터를 받지 못했습니다")

        new_df = pd.DataFrame.from_dict(rows, orient="index").sort_index()
        combined = pd.concat([cached, new_df]) if not cached.empty else new_df
        combined = combined[~combined.index.duplicated(keep="last")].sort_index()
        combined.to_csv(cache_path)

        result_df = combined.loc[(combined.index >= start_dt) & (combined.index <= end_dt)]
        if result_df.empty:
            raise RuntimeError("네이버금융 투자자 순매수 결과가 비어 있습니다")
        print(f"[Info] Successfully fetched Individual Sell Pressure from Naver Finance ({len(new_df)}건 신규).")
        return _pressure_from(result_df)
    except Exception as e:
        print(f"[Warning] Failed to fetch Sell Pressure via Naver Finance ({e}). Falling back to synthetic generator...")
        return generate_synthetic_series("sell_pressure", start, end)


def fetch_credit_balance_growth(start: str, end: str) -> pd.Series:
    """신용융자 잔고 증감률(5거래일 전 대비 %, 패닉 방향으로 부호반전: 급감=패닉=양수).
    소스: 금융투자협회(KOFIA) 프리시스(freesis.kofia.or.kr) '신용공여 잔고 추이' —
    KRX가 아닌 별도 기관(자율규제기구)이며, 세션/로그인 없이 단일 POST 요청으로 조회
    기간 전체(2008~현재)를 한 번에 받을 수 있음을 확인함(2026-08-20)."""
    try:
        import requests
        # 5거래일 pct_change 계산을 위해 조회 시작일보다 앞선 구간을 더 당겨서 요청
        lookback_start = (pd.to_datetime(start) - pd.tseries.offsets.BDay(10)).strftime("%Y%m%d")
        end_fmt = pd.to_datetime(end).strftime("%Y%m%d")
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/json",
            "Referer": "https://freesis.kofia.or.kr/stat/FreeSIS.do?parentDivId=MSIS10000000000000&serviceId=STATSCU0100000070",
        }
        body = {"dmSearch": {"tmpV40": "1000000", "tmpV41": "1", "tmpV1": "D",
                              "tmpV45": lookback_start, "tmpV46": end_fmt, "OBJ_NM": "STATSCU0100000070BO"}}
        r = requests.post("https://freesis.kofia.or.kr/meta/getMetaDataList.do",
                           headers=headers, data=json.dumps(body), timeout=30)
        r.raise_for_status()
        ds1 = r.json().get("ds1") or []
        if not ds1:
            raise ValueError("KOFIA 응답에 데이터가 없습니다")
        # TMPV1=날짜, TMPV3=신용거래융자 잔고(유가증권/KOSPI, 백만원)
        s = pd.Series(
            {pd.to_datetime(row["TMPV1"], format="%Y%m%d"): row["TMPV3"] for row in ds1}
        ).sort_index()
        growth = -(s.pct_change(5) * 100)
        print("[Info] Successfully fetched Credit Balance Growth from KOFIA.")
        return growth.dropna().rename("credit_growth")
    except Exception as e:
        print(f"[Warning] Failed to fetch Credit Balance Growth via KOFIA ({e}). Falling back to synthetic generator...")
        return generate_synthetic_series("credit_growth", start, end)


def fetch_kospi_all_tickers() -> list:
    """KOSPI 시장 전체 상장종목 코드 목록을 가져온다(KOSPI200 지수 구성 200종목이 아니라
    KOSPI 시장에 상장된 전 종목, 2026-08-20 기준 900여 개 — 우선주 등 포함). KRX 로그인 세션
    없이도 되는 `FinanceDataReader.StockListing('KOSPI')`을 사용한다(내부적으로 KRX의
    상장종목 목록 공개 엔드포인트를 호출하며, 이건 `data.krx.co.kr` 로그인 세션이 필요한
    개별 시세 조회 API와는 별개라 막히지 않음). herencia-ta의 KOSPI200 200종목 목록보다
    범위가 넓어 200일선 상회 비율이 지수 구성종목 교체와 무관하게 시장 전체를 반영한다.
    지수 구성종목 이력은 별도로 구할 방법이 없어서, '현재' 상장종목 구성을 과거 전체
    기간에 그대로 적용하는 근사치로 사용한다(상장폐지/신규상장은 과거로 소급 반영 안 됨).

    GitHub Actions 주간 자동 갱신에서는 이 캐시가 actions/cache로 실행 간에도 남아있을 수
    있어, 무기한 재사용하지 않고 KOSPI_ALL_TICKERS_TTL_DAYS(기본 30일)가 지나면 상장/폐지
    변동을 반영하도록 다시 받는다."""
    os.makedirs(KRX_CACHE_DIR, exist_ok=True)
    if os.path.exists(KOSPI_ALL_TICKERS_CACHE_PATH):
        with open(KOSPI_ALL_TICKERS_CACHE_PATH, "r", encoding="utf-8") as f:
            cached = json.load(f)
        if isinstance(cached, dict) and cached.get("tickers"):
            fetched_at = pd.to_datetime(cached.get("fetchedAt"))
            age_days = (pd.Timestamp.now(tz="UTC") - fetched_at).days
            if age_days < KOSPI_ALL_TICKERS_TTL_DAYS:
                return cached["tickers"]
            print(f"[Info] KOSPI 상장종목 목록 캐시가 {age_days}일 지나 다시 받습니다.")
    import FinanceDataReader as fdr
    listing = fdr.StockListing("KOSPI")
    tickers = sorted({code for code in listing["Code"].astype(str) if code})
    with open(KOSPI_ALL_TICKERS_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump({"fetchedAt": pd.Timestamp.now(tz="UTC").isoformat(), "tickers": tickers}, f)
    return tickers


def fetch_yahoo_daily_close(symbol: str, period1: int, period2: int) -> pd.Series:
    """Yahoo Finance 차트 API에서 종목 하나의 전체 기간 일별 종가를 한 번에 받는다.
    src/lib/yahooChart.ts의 fetchChart()와 같은 엔드포인트/포맷."""
    import requests
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"interval": "1d", "period1": period1, "period2": period2}
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers, params=params, timeout=20)
    if r.status_code != 200:
        return pd.Series(dtype=float)
    result = (r.json().get("chart") or {}).get("result")
    if not result:
        return pd.Series(dtype=float)
    result = result[0]
    timestamps = result.get("timestamp") or []
    closes = ((result.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    idx = pd.DatetimeIndex([pd.Timestamp(ts, unit="s").normalize() for ts in timestamps])
    return pd.Series(closes, index=idx, dtype=float).dropna()


def fetch_kospi_close_panel_yahoo(start: str, end: str, tickers: list) -> pd.DataFrame:
    """Yahoo Finance(`{종목코드}.KS`, KOSDAQ 상장이면 `.KQ` 폴백)로 KOSPI 상장종목(근사)의
    (날짜 x 종목코드) 종가 패널을 만든다.

    캐시가 요청 시작일을 덮고 있으면(=이미 그 종목의 히스토리를 한 번 받아둔 상태) 캐시
    마지막 날짜 다음날 ~ 요청 종료일까지만 증분으로 받아 이어붙인다 — 주간 자동 갱신처럼
    end만 매번 앞으로 이동하는 경우 종목당 payload를 크게 줄인다(다만 Yahoo 요청 자체는
    종목마다 1건씩 필요해 호출 "건수"는 줄지 않는다). 캐시에 아예 없는 종목이거나 캐시
    시작일이 요청 시작일보다 늦으면 그 종목은 전체 기간을 새로 받는다. 종목별로 실제 조회에
    성공한 접미사(.KS/.KQ)는 YAHOO_TICKER_SUFFIX_CACHE_PATH에 기록해 증분 조회 시 매번
    재추측하지 않는다."""
    os.makedirs(KRX_CACHE_DIR, exist_ok=True)
    req_start, req_end = pd.to_datetime(start), pd.to_datetime(end)

    cached = pd.DataFrame()
    cached_start = cached_end = None
    if os.path.exists(YAHOO_PRICE_CACHE_PATH) and os.path.exists(YAHOO_CACHE_RANGE_PATH):
        with open(YAHOO_CACHE_RANGE_PATH, "r", encoding="utf-8") as f:
            cached_range = json.load(f)
        cached_start = pd.to_datetime(cached_range["start"])
        cached_end = pd.to_datetime(cached_range["end"])
        cached = pd.read_csv(YAHOO_PRICE_CACHE_PATH, index_col=0, parse_dates=True)

    suffix_map = {}
    if os.path.exists(YAHOO_TICKER_SUFFIX_CACHE_PATH):
        with open(YAHOO_TICKER_SUFFIX_CACHE_PATH, "r", encoding="utf-8") as f:
            suffix_map = json.load(f)

    covers_start = cached_start is not None and cached_start <= req_start
    can_extend = covers_start and cached_end is not None and cached_end < req_end

    full_fetch = [t for t in tickers if not covers_start or t not in cached.columns]
    incremental = [t for t in tickers if t not in full_fetch] if can_extend else []

    updated = {}

    if full_fetch:
        print(f"[Info] Yahoo Finance로 {len(full_fetch)}개 종목 전체 기간 신규 조회 "
              f"(총 {len(tickers)}개 중 {len(tickers) - len(full_fetch)}개는 캐시 재사용/증분 조회)")
        period1 = int(req_start.timestamp())
        period2 = int(req_end.timestamp())
        for i, code in enumerate(full_fetch):
            s = fetch_yahoo_daily_close(f"{code}.KS", period1, period2)
            suffix = ".KS"
            if s.empty:
                s = fetch_yahoo_daily_close(f"{code}.KQ", period1, period2)
                suffix = ".KQ"
            if s.empty:
                print(f"[Warning] Yahoo에서 {code} 데이터를 받지 못했습니다.")
            else:
                suffix_map[code] = suffix
            updated[code] = s
            time.sleep(0.25)  # Yahoo 쪽 예의상 슬로틀링
            if (i + 1) % 25 == 0:
                print(f"[Info] Yahoo 종가 수집 {i + 1}/{len(full_fetch)} ...")

    if incremental:
        inc_start = cached_end + pd.Timedelta(days=1)
        print(f"[Info] Yahoo Finance로 {len(incremental)}개 종목 증분 조회 "
              f"({inc_start.strftime('%Y-%m-%d')} ~ {end})")
        inc_period1 = int(inc_start.timestamp())
        inc_period2 = int(req_end.timestamp())
        for i, code in enumerate(incremental):
            suffix = suffix_map.get(code, ".KS")
            s = fetch_yahoo_daily_close(f"{code}{suffix}", inc_period1, inc_period2)
            if s.empty and suffix != ".KQ":
                s = fetch_yahoo_daily_close(f"{code}.KQ", inc_period1, inc_period2)
                if not s.empty:
                    suffix_map[code] = ".KQ"
            prior = cached[code].dropna() if code in cached.columns else pd.Series(dtype=float)
            updated[code] = pd.concat([prior, s]) if not s.empty else prior
            time.sleep(0.25)
            if (i + 1) % 50 == 0:
                print(f"[Info] Yahoo 증분 수집 {i + 1}/{len(incremental)} ...")

    if updated:
        new_df = pd.DataFrame(updated)
        keep_cols = [c for c in cached.columns if c not in new_df.columns] if not cached.empty else []
        merged = pd.concat([cached[keep_cols], new_df], axis=1) if keep_cols else new_df
        merged = merged[~merged.index.duplicated(keep="last")].sort_index()
        merged.to_csv(YAHOO_PRICE_CACHE_PATH)
        with open(YAHOO_CACHE_RANGE_PATH, "w", encoding="utf-8") as f:
            json.dump({"start": start if not covers_start else cached_range["start"], "end": end}, f)
        with open(YAHOO_TICKER_SUFFIX_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(suffix_map, f)
        cached = merged

    cols = [c for c in tickers if c in cached.columns]
    return cached[cols].sort_index()


def fetch_breadth_200ma_real(start: str, end: str) -> pd.Series:
    """KOSPI 시장 전체 상장종목(현재 구성 근사) 중 200일 이동평균선 상회 비율을
    Yahoo Finance 실데이터로 계산한다. 방향은 부호반전 완료(비율↓ = 패닉↑)."""
    tickers = fetch_kospi_all_tickers()
    print(f"[Info] KOSPI 전체 상장종목 {len(tickers)}개 기준으로 200일선 상회비율을 실데이터로 계산합니다.")

    # 200일 이동평균에 필요한 과거분(약 300영업일)을 더 당겨서 조회
    lookback_start = (pd.to_datetime(start) - pd.tseries.offsets.BDay(300)).strftime("%Y-%m-%d")
    panel = fetch_kospi_close_panel_yahoo(lookback_start, end, tickers)
    if panel.empty:
        raise RuntimeError("Yahoo Finance 종가 패널이 비어 있습니다")

    ma200 = panel.rolling(window=BREADTH_MA_WINDOW, min_periods=BREADTH_MA_WINDOW).mean()
    above = panel > ma200  # NaN 비교는 자동으로 False라 결측치는 분자에서 자연히 제외됨
    valid_count = (ma200.notna() & panel.notna()).sum(axis=1)
    breadth = above.sum(axis=1) / valid_count.replace(0, np.nan)
    breadth = breadth.loc[breadth.index >= pd.to_datetime(start)].rename("breadth_200ma")
    return -breadth  # 방향 반전: 비율이 낮을수록 패닉(+)


def fetch_breadth_200ma(start: str, end: str, tickers: list = None) -> pd.Series:
    """KOSPI 시장 전체 상장종목 중 200일 이동평균선 상회 비율(부호반전 완료: 비율↓ = 패닉↑).
    Yahoo Finance 실데이터로 계산하고, 호출에 실패하면 가상 데이터로 대체한다."""
    try:
        result = fetch_breadth_200ma_real(start, end)
        print("[Info] Successfully computed Breadth 200MA from Yahoo Finance.")
        return result
    except Exception as e:
        print(f"[Warning] Failed to compute Breadth 200MA via Yahoo Finance ({e}). Falling back to synthetic generator...")
        s = generate_synthetic_series("breadth_200ma", start, end)
        return -s


def fetch_credit_spread_ecos(start: str, end: str, api_key: str) -> pd.Series:
    """ECOS API: 회사채(BBB-, 3년) 수익률 - 국고채(3년) 수익률 스프레드."""
    try:
        if not api_key:
            raise ValueError("ECOS_API_KEY가 설정되지 않았습니다")
        import requests

        def _get_series(stat_code: str, item_code: str) -> pd.Series:
            url = (
                f"https://ecos.bok.or.kr/api/StatisticSearch/{api_key}/json/kr/1/10000/"
                f"{stat_code}/D/{start}/{end}/{item_code}"
            )
            r = requests.get(url, timeout=10).json()
            rows = r["StatisticSearch"]["row"]
            df = pd.DataFrame(rows)
            df["TIME"] = pd.to_datetime(df["TIME"], format="%Y%m%d")
            return df.set_index("TIME")["DATA_VALUE"].astype(float)

        # ECOS StatisticItemList로 직접 확인한 코드(2026-08-18):
        # 010300000=회사채(3년, AA-), 010190000=국고채(1년) — 원래 코드가 이 둘을 가리키고
        # 있어서 "BBB-/3년" 스프레드가 아니라 "AA-/1년" 스프레드가 나오던 버그였음.
        bbb = _get_series("817Y002", "010320000")  # 회사채(3년, BBB-)
        ktb = _get_series("817Y002", "010200000")  # 국고채(3년)
        spread = (bbb - ktb).rename("credit_spread")
        print("[Info] Successfully fetched Credit Spread from ECOS.")
        return spread
    except Exception as e:
        print(f"[Warning] Failed to fetch Credit Spread via ECOS ({e}). Falling back to synthetic generator...")
        return generate_synthetic_series("credit_spread", start, end)


# ------------------------------------------------------------------
# 3. 표준화 (3년 롤링 MAD z-score, 시계열 버전)
# ------------------------------------------------------------------

def rolling_mad_zscore(x: pd.Series, window: int = ROLL_WEEKS, threshold: float = MAD_THRESHOLD) -> pd.Series:
    """
    과거 `window`기간의 median/MAD를 기준으로 로버스트 z-score 계산.
    첫 `window`기간은 expanding으로 처리(데이터 부족 구간).
    """
    def _z(sub: pd.Series) -> float:
        if len(sub) < 20 or sub.isna().all():
            return np.nan
        median = sub.median()
        mad = (sub - median).abs().median()
        scale = 1.4826 * mad
        if scale == 0 or np.isnan(scale):
            return np.nan
        last = sub.iloc[-1]
        clipped = np.clip(last, median - threshold * scale, median + threshold * scale)
        return (clipped - median) / scale

    z = x.rolling(window=window, min_periods=20).apply(_z, raw=False)
    expanding_part = x.expanding(min_periods=20).apply(_z, raw=False)
    z = z.fillna(expanding_part)
    return z.rename(f"z_{x.name}")


# ------------------------------------------------------------------
# 4. 합성 및 재표준화
# ------------------------------------------------------------------

def build_capitulation_index(components: dict) -> pd.DataFrame:
    """
    components: {지표명: 방향처리 완료된 raw Series} 딕셔너리
    """
    df = pd.DataFrame(components)
    df = df.resample("W-FRI").last()  # 주간 정렬

    z_df = pd.DataFrame({col: rolling_mad_zscore(df[col]) for col in df.columns})

    # 합성지수: 유효 지표 평균 (결측 지표는 제외, 최소 3개 이상 존재 시에만 계산)
    valid_count = z_df.notna().sum(axis=1)
    composite_raw = z_df.mean(axis=1, skipna=True)
    composite_raw[valid_count < 3] = np.nan

    # 최종 재표준화: 전체 기간 평균/표준편차로 z-score (밴드가 ±1.0에 오도록)
    # 부호는 마지막에 반전한다: 지금까지의 raw composite는 5개 지표를 전부
    # "값이 클수록 패닉"으로 정렬해온 결과라 양수=패닉이지만, 이 스크립트가 재현하려는
    # 원본 모간스탠리 Capitulation Index(Exhibit 4)는 음수가 항복/과매도(패닉), 양수가
    # 과열(euphoria)이다. 2026-08-20에 원본 차트(2026-07-30 기준 -2.53, 극단적 과매도)와
    # 직접 비교해보니 2008 GFC(+4.6)·2020 코로나 급락(+3.2) 등 실제 패닉 구간이 전부
    # 양수로 나와 부호가 거꾸로였음을 확인 — 여기서 -1을 곱해 원본과 같은 부호 규약으로
    # 맞춘다(내부 percentile 정렬·z-score 계산 로직은 그대로, 최종 부호만 반전).
    final_index = -(composite_raw - composite_raw.mean()) / composite_raw.std()
    final_index = final_index.rename("Capitulation_Index")

    result = z_df.copy()
    result["composite_raw"] = composite_raw
    result["Capitulation_Index"] = final_index
    return result


# ------------------------------------------------------------------
# 5. 실행 및 시각화
# ------------------------------------------------------------------

def main():
    print("==================================================")
    print(" KOSPI Capitulation Index 계산 및 시각화를 시작합니다. ")
    print("==================================================")
    
    # --- 1) 원자료 수집 (가상 데이터 및 API 혼합) ---
    vkospi = fetch_vkospi(START_DATE, END_DATE)
    sell_pressure = fetch_individual_sell_pressure(START_DATE, END_DATE)
    credit_growth = fetch_credit_balance_growth(START_DATE, END_DATE)
    breadth = fetch_breadth_200ma(START_DATE, END_DATE)
    credit_spread = fetch_credit_spread_ecos(START_DATE, END_DATE, ECOS_API_KEY)

    components = {
        "vkospi": vkospi,
        "sell_pressure": sell_pressure,
        "credit_growth": credit_growth,
        "breadth_200ma": breadth,
        "credit_spread": credit_spread,
    }

    # --- 2) 합성 지수 빌드 ---
    result = build_capitulation_index(components)
    
    # 출력 경로를 현재 워크스페이스의 'outputs' 폴더로 포터블하게 지정 (Windows 호환)
    out_dir = "outputs"
    os.makedirs(out_dir, exist_ok=True)
    
    csv_path = os.path.join(out_dir, "kospi_capitulation_index.csv")
    png_path = os.path.join(out_dir, "kospi_capitulation_index.png")
    
    result.to_csv(csv_path, encoding="utf-8-sig")
    print(f"\n[성공] Capitulation Index CSV 파일이 저장되었습니다: {csv_path}")

    # --- 3) 시각화 ---
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    plt.rcParams["axes.unicode_minus"] = False
    
    # 폰트 설정 (Windows 기본 맑은 고딕 사용)
    try:
        plt.rcParams["font.family"] = "Malgun Gothic"
    except Exception:
        pass

    fig, ax = plt.subplots(figsize=(14, 6))
    
    # 0 라인 및 가이드 밴드 표시 (음수=항복/패닉, 양수=과열/euphoria — 원본 Exhibit 4와 동일한 부호 규약)
    ax.axhline(0, color="#2c3e50", linewidth=1.0, alpha=0.5)
    ax.axhline(-1.0, color="#e74c3c", linestyle="--", linewidth=1.0, alpha=0.6, label="Normal Panic Limit (-1.0 SD)")
    ax.axhline(-2.0, color="#c0392b", linestyle="-.", linewidth=1.2, alpha=0.8, label="Extreme Capitulation (-2.0 SD)")
    ax.axhline(1.0, color="#2ecc71", linestyle="--", linewidth=1.0, alpha=0.4, label="Euphoria Limit (+1.0 SD)")

    # 지수 시계열 플롯
    ax.plot(result.index, result["Capitulation_Index"], color="#1f4e8c", linewidth=1.5, label="KOSPI Capitulation Index")

    # Capitulation 영역 하이라이트 (Index < -1.5)
    high_panic = result[result["Capitulation_Index"] <= -1.5]
    if not high_panic.empty:
        ax.scatter(high_panic.index, high_panic["Capitulation_Index"], color="#e74c3c", s=18, zorder=5, label="Panic / Buying Signal")
        
    ax.set_title("KOSPI Capitulation Index (한국형 캐피튤레이션 합성 지표)", fontsize=14, fontweight="bold", pad=15)
    ax.set_ylim(-3.5, 4.5)
    ax.set_xlabel("연도", fontsize=11)
    ax.set_ylabel("Capitulation Z-Score", fontsize=11)
    
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    
    ax.grid(True, linestyle=":", alpha=0.5)
    ax.legend(loc="upper left", frameon=True, facecolor="white", edgecolor="none", framealpha=0.9)
    
    plt.tight_layout()
    plt.savefig(png_path, dpi=150)
    print(f"[성공] Capitulation Index 차트 이미지가 저장되었습니다: {png_path}")
    print("==================================================")


if __name__ == "__main__":
    main()
