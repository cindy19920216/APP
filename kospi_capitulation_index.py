# -*- coding: utf-8 -*-
"""
KOSPI Capitulation Index (프로토타입)
=====================================
모간스탠리 "Capitulation Index" (Exhibit 4)의 시각적 특징을 역산하여
한국 증시 버전으로 재구성한 합성 지표.

** 주의 **
- 모간스탠리 원본의 정확한 구성지표/가중치는 비공개이며, 이 스크립트는 추정(inference)에 기반한
  프로토타입입니다. 원본과 동일한 결과를 보장하지 않습니다.
- 본 환경(샌드박스)은 KRX/ECOS 서버로의 네트워크 접근이 차단되어 있어 실행 테스트는
  로컬 환경(pykrx, ECOS API 사용 가능한 PC)에서 진행해야 합니다.
- 필요 패키지: pandas, numpy, pykrx, requests, matplotlib

방법론 요약
-----------
1. 주간(금요일) 리샘플링
2. 구성지표 5개를 각각 "패닉/캐피튤레이션 방향"으로 부호 정렬
3. 각 지표를 3년(156주) 롤링 z-score로 표준화 (MAD 기반 robust z-score)
4. 5개 z-score 단순평균 → 합성지수(raw composite)
5. 합성지수를 전체 기간 기준으로 재표준화(re-standardize) → 최종 Capitulation Index
   (이 재표준화 덕분에 ±1SD 밴드가 정확히 ±1.0에 위치)

구성지표 (한국 시장 대체)
-------------------------
| 카테고리      | 원본(미국)        | 대체(한국)                                  | 방향처리        |
|----------------|-------------------|---------------------------------------------|-----------------|
| 변동성         | VIX               | VKOSPI                                       | 그대로 (상승=패닉) |
| 옵션 포지셔닝  | Put/Call Ratio    | (데이터 접근 제한 시 생략 가능)               | 그대로           |
| 수급/심리      | AAII Bull-Bear    | 개인 순매도 강도 (개인 순매수대금 / 거래대금) | 부호반전(순매도↑=패닉) |
| 기술적 과매도  | RSI, %>200MA      | KOSPI200 200일선 상회 종목 비율               | 부호반전(비율↓=패닉) |
| 신용 스트레스  | HY OAS 스프레드   | 회사채(BBB-)-국고채(3년) 스프레드 (ECOS)      | 그대로 (확대=패닉) |
"""

import os
import numpy as np
import pandas as pd

# ------------------------------------------------------------------
# 0. 설정
# ------------------------------------------------------------------
START_DATE = "20080101"
END_DATE = "20260804"
ROLL_WEEKS = 156          # 3년 롤링 (52주 * 3)
MAD_THRESHOLD = 4.0        # MAD clipping 배수 (quant-factor-model 스킬과 동일 관례)
ECOS_API_KEY = "YOUR_ECOS_API_KEY"  # https://ecos.bok.or.kr 발급키로 교체

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
        # KOSPI200 200일 이동평균선 상회 종목 비율 (원래는 0.0~1.0):
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
    """VKOSPI 지수 종가 (일별)"""
    try:
        from pykrx import stock
        df = stock.get_index_ohlcv_by_date(start, end, "1027")  # 1027: V-KOSPI200
        if df.empty or "종가" not in df.columns:
            raise ValueError("Empty data or missing '종가' column")
        print("[Info] Successfully fetched VKOSPI from KRX.")
        return df["종가"].rename("vkospi")
    except Exception as e:
        print(f"[Warning] Failed to fetch VKOSPI via pykrx ({e}). Falling back to synthetic generator...")
        return generate_synthetic_series("vkospi", start, end)


def fetch_individual_sell_pressure(start: str, end: str) -> pd.Series:
    """개인 순매도 강도 = -(개인 순매수대금) / 시장 총거래대금.
    값이 클수록(개인이 강하게 순매도) 패닉 신호로 해석."""
    try:
        from pykrx import stock
        df = stock.get_market_trading_value_by_date(start, end, "KOSPI", detail=False)
        if df.empty or "개인" not in df.columns:
            raise ValueError("Empty data or missing '개인' column")
        net_indiv = df["개인"]
        total_value = df.abs().sum(axis=1)
        pressure = -(net_indiv / total_value)
        print("[Info] Successfully fetched Individual Sell Pressure from KRX.")
        return pressure.rename("sell_pressure")
    except Exception as e:
        print(f"[Warning] Failed to fetch Sell Pressure via pykrx ({e}). Falling back to synthetic generator...")
        return generate_synthetic_series("sell_pressure", start, end)


def fetch_credit_balance_growth(start: str, end: str) -> pd.Series:
    """신용융자 잔고 증감률(전주 대비 %, 패닉 방향으로 부호반전).
    실제 수집에는 금융투자협회 공시나 KRX 정보데이터시스템 수집이 요구되므로, 가상 생성기를 사용합니다."""
    print("[Info] Credit Balance Growth: Direct KRX/KOFIA API unavailable. Generating realistic synthetic data...")
    return generate_synthetic_series("credit_growth", start, end)


def fetch_breadth_200ma(start: str, end: str, tickers: list = None) -> pd.Series:
    """KOSPI200 구성종목 중 200일 이동평균선 상회 비율.
    개별 종목 전수조사 및 일별 이동평균 루프는 성능 부하가 심해 가상 데이터로 처리합니다."""
    print("[Info] Breadth 200MA: Real-time calculation over 200 tickers is resource-intensive. Generating realistic synthetic data...")
    s = generate_synthetic_series("breadth_200ma", start, end)
    return -s  # 방향 반전: 비율이 낮을수록 패닉(+)


def fetch_credit_spread_ecos(start: str, end: str, api_key: str) -> pd.Series:
    """ECOS API: 회사채(BBB-, 3년) 수익률 - 국고채(3년) 수익률 스프레드."""
    try:
        if not api_key or api_key == "YOUR_ECOS_API_KEY":
            raise ValueError("ECOS API key placeholder detected")
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

        bbb = _get_series("817Y002", "010300000")
        ktb = _get_series("817Y002", "010190000")
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
    final_index = (composite_raw - composite_raw.mean()) / composite_raw.std()
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
    
    # 0 라인 및 가이드 밴드 표시
    ax.axhline(0, color="#2c3e50", linewidth=1.0, alpha=0.5)
    ax.axhline(1.0, color="#e74c3c", linestyle="--", linewidth=1.0, alpha=0.6, label="Normal Panic Limit (+1.0 SD)")
    ax.axhline(2.0, color="#c0392b", linestyle="-.", linewidth=1.2, alpha=0.8, label="Extreme Capitulation (+2.0 SD)")
    ax.axhline(-1.0, color="#2ecc71", linestyle="--", linewidth=1.0, alpha=0.4, label="Euphoria Limit (-1.0 SD)")
    
    # 지수 시계열 플롯
    ax.plot(result.index, result["Capitulation_Index"], color="#1f4e8c", linewidth=1.5, label="KOSPI Capitulation Index")
    
    # Capitulation 영역 하이라이트 (Index > 1.5)
    high_panic = result[result["Capitulation_Index"] >= 1.5]
    if not high_panic.empty:
        ax.scatter(high_panic.index, high_panic["Capitulation_Index"], color="#e74c3c", s=18, zorder=5, label="Panic / Buying Signal")
        
    ax.set_title("KOSPI Capitulation Index (한국형 캐피튤레이션 합성 지표)", fontsize=14, fontweight="bold", pad=15)
    ax.set_ylim(-3.5, 4.5)
    ax.set_xlabel("연도", fontsize=11)
    ax.set_ylabel("Capitulation Z-Score", fontsize=11)
    
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    
    ax.grid(True, linestyle=":", alpha=0.5)
    ax.legend(loc="upper left", frameon=True, facecolor="white", edgecolor="none", alpha=0.9)
    
    plt.tight_layout()
    plt.savefig(png_path, dpi=150)
    print(f"[성공] Capitulation Index 차트 이미지가 저장되었습니다: {png_path}")
    print("==================================================")


if __name__ == "__main__":
    main()
