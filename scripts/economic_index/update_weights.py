"""
JS Economic Cycle Index — 분기별 가중치 재산출 + 상태 경계값 점검 (로컬 수동 실행).

INDEX_PYTHON/step2_regression.py(GDP 회귀) + step4_check_dist.py(분포·경계값)를 합쳐 옮긴 것.
월간 자동 갱신(update_index.py)이 index-data/*.csv를 최신으로 유지하므로 이 스크립트는
그 CSV를 그대로 읽어 회귀한다.

사용법 (APP 루트에서):
    python scripts/economic_index/update_weights.py            # 결과 출력만 (저장 안 함)
    python scripts/economic_index/update_weights.py --save     # regression_weights.json 갱신

--save 후에는 출력된 "COMPOSITE_BOUNDS 추천값"을 보고 필요하면
src/app/api/boom-burst/route.ts의 COMPOSITE_BOUNDS를 직접 수정한 뒤,
update_index.py를 다시 돌려 composite_index.csv를 새 가중치로 재계산하고 커밋한다.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import argparse
import json
import os
import re
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_index import SERIES_CONFIG, BASE_YEAR, panic_percentile, compute_composite  # noqa: E402

APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = APP_ROOT / 'index-data'
ROUTE_FILE = APP_ROOT / 'src' / 'app' / 'api' / 'boom-burst' / 'route.ts'
BASE_URL = 'https://api.stlouisfed.org/fred/series/observations'

REGRESSION_START = pd.Timestamp('1990-01-01')

# 선행 시차(분기): 지표 → GDP
LAG_Q = {'UMCSENT': 1, 'NEWORDER': 1, 'ICSA': 0, 'T10Y2Y': 4,
         'VIXCLS': 1, 'M2SL': 3, 'MICH': 1}

# 회귀 실패 시 fallback (Stock & Watson 2003, Estrella & Mishkin 1998 등 근거)
DEFAULT_WEIGHTS = {'UMCSENT': 26.0, 'NEWORDER': 21.0, 'T10Y2Y': 20.0, 'ICSA': 14.0,
                   'M2SL': 9.0, 'VIXCLS': 6.0, 'MICH': 4.0}

# COVID 구조 이탈 구간 — 회귀에서 빼지 않고 더미로 통제
COVID_DUMMY_RANGE = ('2020-01-01', '2020-06-30')

CHECKPOINTS = {
    'IT버블 붕괴': '2001-09-01', '침체 바닥': '2002-10-01', '중기 확장': '2006-06-01',
    'GFC 절정': '2008-12-01', '무역전쟁 전': '2018-01-01', 'COVID 쇼크': '2020-04-01',
    '유동성 버블': '2021-06-01', 'Fed 긴축 전야': '2022-01-01', '고금리 피크': '2023-10-01',
    '관세 충격': '2025-04-01',
}


def get_api_key() -> str:
    key = (os.getenv('FRED_API_KEY') or '').strip()
    env_file = APP_ROOT / '.env'
    if not key and env_file.exists():
        for line in env_file.read_text(encoding='utf-8').splitlines():
            m = re.match(r'\s*FRED_API_KEY\s*=\s*(.+)', line)
            if m:
                key = m.group(1).strip().strip('"\'')
    return key


def fetch_gdp_yoy(api_key: str) -> pd.Series:
    """GDPC1 (실질GDP, 분기) → 전년동기비 성장률(%)"""
    res = requests.get(BASE_URL, params={'series_id': 'GDPC1', 'api_key': api_key,
                                         'file_type': 'json', 'sort_order': 'asc',
                                         'limit': 100000}, timeout=30)
    res.raise_for_status()
    df = pd.DataFrame(res.json()['observations'])[['date', 'value']]
    df = df[df['value'] != '.']
    s = pd.Series(df['value'].astype(float).values, index=pd.to_datetime(df['date']))
    return (s.resample('QS').last().pct_change(4) * 100).dropna()


def load_raw(data_dir: Path) -> dict:
    out = {}
    for sid in SERIES_CONFIG:
        path = data_dir / f'{sid}.csv'
        if not path.exists():
            raise FileNotFoundError(f'{path} 없음 — update_index.py를 먼저 실행')
        out[sid] = pd.read_csv(path, parse_dates=['date']).sort_values('date').reset_index(drop=True)
    return out


def indicator_quarterly(sid: str, df: pd.DataFrame) -> pd.Series:
    """지표 → (YoY) → 분기 평균 → 선행 시차만큼 shift"""
    s = df[df['date'] >= REGRESSION_START].set_index('date')['value']
    if SERIES_CONFIG[sid]['yoy']:
        s = s.pct_change(12) * 100
    return s.dropna().resample('QS').mean().dropna().shift(LAG_Q[sid])


def full_sample_ols(X_df: pd.DataFrame, y: pd.Series):
    """전체 구간 OLS + COVID 더미. 표준화 β 절대값 비율 → 가중치(%)."""
    common = X_df.dropna(how='any').index.intersection(y.dropna().index)
    n = len(common)
    X = X_df.loc[common].values.astype(float)
    yv = y.loc[common].values.astype(float)
    cols = list(X_df.columns)

    lo, hi = pd.Timestamp(COVID_DUMMY_RANGE[0]), pd.Timestamp(COVID_DUMMY_RANGE[1])
    dummy = np.array([lo <= t <= hi for t in common], dtype=float)

    sd = X.std(axis=0, ddof=1)
    sd[sd == 0] = 1.0
    Xs = (X - X.mean(axis=0)) / sd
    ys = (yv - yv.mean()) / (yv.std(ddof=1) or 1.0)

    design = np.column_stack([np.ones(n), Xs, dummy])
    betas, _, rank, _ = np.linalg.lstsq(design, ys, rcond=None)
    if rank < design.shape[1]:
        raise ValueError(f'행렬 랭크 부족 ({rank})')

    resid = ys - design @ betas
    r2 = float(1 - (resid ** 2).sum() / ((ys - ys.mean()) ** 2).sum())

    abs_b = np.abs(betas[1:1 + len(cols)])
    if abs_b.sum() == 0:
        raise ValueError('β 계수 합계 = 0')
    return dict(zip(cols, (abs_b / abs_b.sum() * 100).tolist())), r2, n, common


def current_route_bounds():
    if not ROUTE_FILE.exists():
        return None
    m = re.search(r'COMPOSITE_BOUNDS\s*=\s*\[([^\]]+)\]', ROUTE_FILE.read_text(encoding='utf-8'))
    return [float(x) for x in m.group(1).split(',')] if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--save', action='store_true', help='regression_weights.json에 저장')
    ap.add_argument('--data-dir', type=Path, default=DEFAULT_DATA_DIR)
    args = ap.parse_args()

    api_key = get_api_key()
    if not api_key:
        sys.exit('FRED_API_KEY가 환경변수나 APP/.env에 없습니다.')

    raw = load_raw(args.data_dir)

    # ── 1. GDP 회귀 → 가중치 ──────────────────────────────
    print('=' * 60)
    print('  GDP 회귀 가중치 (전체 구간 OLS + COVID 더미 2020Q1-Q2)')
    print('=' * 60)
    r2 = n_obs = None
    try:
        gdp = fetch_gdp_yoy(api_key)
        X_df = pd.DataFrame({sid: indicator_quarterly(sid, df) for sid, df in raw.items()})
        weights, r2, n_obs, common = full_sample_ols(X_df, gdp)
        print(f'구간: {common[0]:%Y-%m} ~ {common[-1]:%Y-%m}  ({n_obs}분기)\n')
    except Exception as e:
        print(f'❌ 회귀 실패: {e} → DEFAULT_WEIGHTS 사용\n')
        weights = DEFAULT_WEIGHTS

    weights_file = args.data_dir / 'regression_weights.json'
    old = json.loads(weights_file.read_text(encoding='utf-8'))['weights'] if weights_file.exists() else {}
    print(f"  {'지표':10s} {'새 가중치':>8s} {'기존':>8s} {'변화':>7s}")
    for sid, w in sorted(weights.items(), key=lambda x: -x[1]):
        o = old.get(sid)
        diff = f'{w - o:+.1f}' if o is not None else ''
        print(f"  {sid:10s} {w:7.1f}% {(f'{o:.1f}%' if o is not None else '-'):>8s} {diff:>7s}")
    if r2 is not None:
        print(f'\n  R² = {r2:.3f}')

    # ── 2. 새 가중치 기준 종합지수 분포 → 경계값 ─────────────
    pct = {sid: panic_percentile(sid, df) for sid, df in raw.items()}
    comp = compute_composite(pct, weights)
    c = pd.Series(comp['composite'].values, index=pd.to_datetime(comp['date']))

    print('\n' + '=' * 60)
    print('  종합지수 분포 (새 가중치 기준)')
    print('=' * 60)
    print(f'{len(c)}개월 ({c.index[0]:%Y-%m} ~ {c.index[-1]:%Y-%m})  '
          f'평균 {c.mean():.1f} / 표준편차 {c.std():.1f} / 최소 {c.min():.1f} / 최대 {c.max():.1f}')
    rec = [round(c.quantile(q)) for q in (0.10, 0.30, 0.70, 0.90)]
    cur = current_route_bounds()
    print(f'\n  COMPOSITE_BOUNDS 추천 (10/30/70/90th): {rec}')
    print(f'  route.ts 현재값                       : {cur}')
    if cur and max(abs(a - b) for a, b in zip(rec, cur)) >= 2:
        print('  ⚠ 2pt 이상 차이 — route.ts COMPOSITE_BOUNDS 수정 검토')

    bounds = cur or rec
    labels = ['위기', '둔화', '중립', '호조', '과열']
    state = lambda v: labels[sum(v > b for b in bounds)]
    print('\n── 주요 국면 검증 ──')
    for label, d in CHECKPOINTS.items():
        ts = pd.Timestamp(d)
        if ts in c.index:
            print(f'  {label:<12} ({d[:7]}): {c[ts]:5.1f}  {state(c[ts])}')
    print(f"  {'최신':<12} ({c.index[-1]:%Y-%m}): {c.iloc[-1]:5.1f}  {state(c.iloc[-1])}")

    # ── 3. 저장 ─────────────────────────────────────────
    if args.save:
        out = {'weights': {k: round(v, 2) for k, v in weights.items()},
               'method': 'Full-sample OLS + COVID dummy (표준화 β계수)',
               'updated': str(date.today())}
        if r2 is not None:
            out.update({'r_squared': round(r2, 4), 'n_obs': n_obs})
        weights_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'\n✅ 저장: {weights_file}')
        print('   다음: (필요 시 route.ts 경계값 수정) → python scripts/economic_index/update_index.py → 커밋')
    else:
        print('\n(미리보기 — 저장하려면 --save)')


if __name__ == '__main__':
    main()
