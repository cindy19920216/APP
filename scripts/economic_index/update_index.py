"""
JS Economic Cycle Index — 월간 자동 갱신 스크립트.

INDEX_PYTHON/(step1_download.py + step3_plot.py의 종합지수 계산 로직)을
Herencia(APP) 저장소 안으로 옮겨온 트리밍 버전. GitHub Actions에서 매달 실행되어
index-data/*.csv를 직접 갱신한다 (기존처럼 별도 data/ 폴더 → 수동 sync 과정 없음).

원본과의 차이:
- step1_download.py는 로컬에 2000년 이전 데이터가 있으면 재다운로드를 건너뛰는데,
  자동 갱신에서는 그러면 데이터가 영영 안 바뀌므로 항상 전체 재다운로드한다.
- step3_plot.py의 PROVISIONAL_INJECTIONS(미발표 지표 잠정치 수동 입력)는 사람의 판단이
  들어가는 부분이라 자동화 대상에서 제외. 대신 "M-1 원칙"(7개 지표가 모두 공식 발표된
  가장 최근 월까지만 종합지수 계산)은 그대로 유지 — 잠정치를 넣지 않는 만큼 종합지수가
  실시간 대비 1~2개월 늦게 채워질 수 있음.
- 회귀 가중치(regression_weights.json)는 분기 단위로만 갱신하는 것이 원칙이라 이
  스크립트는 건드리지 않고, index-data/regression_weights.json에 이미 있는 값을 그대로 읽는다.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

API_KEY = os.getenv('FRED_API_KEY')
BASE_URL = 'https://api.stlouisfed.org/fred/series/observations'

INDEX_DATA_DIR = Path(__file__).resolve().parents[2] / 'index-data'
WEIGHTS_FILE = INDEX_DATA_DIR / 'regression_weights.json'

BASE_YEAR = pd.Timestamp('1996-01-01')
ROLLING_YEARS = 20
ROLLING_MONTHS = ROLLING_YEARS * 12
MIN_PERIODS = 12

# route.ts의 SERIES_CONFIG / step3_plot.py의 ALL_SERIES_CONFIG와 동일한 정의를 유지해야
# API·기존 파이프라인과 계산 결과가 어긋나지 않는다.
SERIES_CONFIG = {
    'UMCSENT':  {'name': '소비자신뢰지수',       'panic_up': False, 'yoy': False},
    'NEWORDER': {'name': '기업 설비투자',        'panic_up': False, 'yoy': True},
    'ICSA':     {'name': '주간 실업수당 청구',   'panic_up': True,  'yoy': False},
    'T10Y2Y':   {'name': '10Y-2Y 국채 스프레드', 'panic_up': False, 'yoy': False},
    'VIXCLS':   {'name': 'VIX',                  'panic_up': True,  'yoy': False},
    'M2SL':     {'name': 'M2 통화량',             'panic_up': False, 'yoy': True},
    'MICH':     {'name': '1년 기대 인플레이션',   'panic_up': False, 'yoy': False},
}


def fetch_series(series_id: str) -> pd.DataFrame:
    """FRED에서 시리즈 전체 히스토리를 받아 월간(월초일 기준 평균)으로 리샘플."""
    res = requests.get(BASE_URL, params={
        'series_id':  series_id,
        'api_key':    API_KEY,
        'file_type':  'json',
        'sort_order': 'asc',
        'limit':      100000,
    }, timeout=30)
    res.raise_for_status()
    obs = res.json().get('observations', [])
    if not obs:
        raise RuntimeError(f'{series_id}: FRED에서 관측치를 받지 못함')

    df = pd.DataFrame(obs)[['date', 'value']]
    df = df[df['value'] != '.']
    df['value'] = df['value'].astype(float)
    df['date'] = pd.to_datetime(df['date'])
    df = df.set_index('date').resample('MS').mean().dropna().reset_index()
    return df


def load_weights() -> dict:
    if not WEIGHTS_FILE.exists():
        raise RuntimeError(f'{WEIGHTS_FILE} 없음 — 최초 1회는 INDEX_PYTHON/step2_regression.py 결과를 수동으로 넣어야 함')
    data = json.loads(WEIGHTS_FILE.read_text(encoding='utf-8'))
    return data['weights']


def rolling_percentile(values: pd.Series) -> pd.Series:
    return values.rolling(ROLLING_MONTHS, min_periods=MIN_PERIODS).apply(
        lambda x: pd.Series(x).rank(pct=True).iloc[-1] * 100
    )


def panic_percentile(sid: str, df: pd.DataFrame) -> pd.Series:
    cfg = SERIES_CONFIG[sid]
    values = df['value']
    if cfg['yoy']:
        values = values.pct_change(12) * 100
    values = values.dropna()
    pct = rolling_percentile(values)
    if not cfg['panic_up']:
        pct = 100 - pct
    return pd.Series(pct.values, index=pd.to_datetime(df.loc[values.index, 'date'].values))


def compute_composite(pct_by_sid: dict, weights: dict) -> pd.DataFrame:
    pct_df = pd.DataFrame(pct_by_sid)
    pct_df = pct_df[pct_df.index >= BASE_YEAR]

    def _row(row):
        avail = row.dropna()
        if len(avail) == 0:
            return np.nan
        total_w = sum(weights[s] for s in avail.index)
        return 100 - sum(avail[s] * weights[s] / total_w for s in avail.index)

    composite = pct_df.apply(_row, axis=1).dropna()

    # M-1 원칙: 7개 지표가 전부 발표된 가장 최근 월까지만 사용
    full_end = pct_df.dropna(how='any').index.max()
    composite = composite[composite.index <= full_end]

    return pd.DataFrame({'date': composite.index.strftime('%Y-%m-%d'), 'composite': composite.values})


def main():
    if not API_KEY:
        print('FRED_API_KEY 환경변수가 없습니다.', file=sys.stderr)
        sys.exit(1)

    weights = load_weights()
    print(f'가중치: {weights}')

    raw_by_sid = {}
    pct_by_sid = {}
    for sid, cfg in SERIES_CONFIG.items():
        print(f"  {cfg['name']} ({sid}) 수집 중...", end=' ')
        df = fetch_series(sid)
        raw_by_sid[sid] = df
        pct_by_sid[sid] = panic_percentile(sid, df)
        print(f"{len(df)}행, 최신 {df['date'].iloc[-1].strftime('%Y-%m')}")
        time.sleep(0.3)

    INDEX_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for sid, df in raw_by_sid.items():
        df.to_csv(INDEX_DATA_DIR / f'{sid}.csv', index=False)

    composite_df = compute_composite(pct_by_sid, weights)
    composite_df.to_csv(INDEX_DATA_DIR / 'composite_index.csv', index=False, encoding='utf-8-sig')
    latest = composite_df.iloc[-1]
    print(f"\n종합지수(JS Economic Cycle Index) 최신값: {latest['composite']:.1f}  ({latest['date'][:7]})")
    print(f"저장 완료: {INDEX_DATA_DIR}")


if __name__ == '__main__':
    main()
