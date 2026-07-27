import requests
import pandas as pd
import numpy as np
from dotenv import load_dotenv
import os
import time

load_dotenv()
API_KEY = os.getenv('FRED_API_KEY')
BASE_URL = 'https://api.stlouisfed.org/fred/series/observations'

SERIES = {
    '미국 주식 불확실성 지수':     'WLEMUINDXD',
    '미국 고위험채권 유효이자율':  'BAMLH0A0HYM2EY',
    '미국 기업여신 증가율':        'BUSLOANS',
    '미국 금융시장 경색 지수':     'NFCI',
    '미국 장단기 금리차':          'T10Y2Y',
    'CAD/USD':                     'DEXCAUS',
    'JPY/USD':                     'DEXJPUS',
    '미국 주간 실물경기 지수':     'WEI',
    '미국 실물경기 경기침체 확률': 'RECPROUSM156N',
    '샴 규칙 경기침체 지표':       'SAHMREALTIME',
    '미국 국가활동 지수':          'CFNAI',
    '미국 트럭판매 현황':          'TRUCKD11',
    '미국 화물운송 현황':          'RAILFRTCARLOADSD11',
    '금 가격':                      'GOLDAMGBD228NLBM',
    '원유 가격 WTI':               'DCOILWTICO',
    '미국 통화유동속도':           'M2V',
    '미국 실업률':                 'UNRATE',
    '미국 자연실업률':             'NROU',
    '미국 기대 인플레이션':        'T10YIE',
    '경기침체':                    'USREC',
}

CATEGORIES = {
    'FINANCIAL CYCLE': [
        '미국 주식 불확실성 지수',
        '미국 고위험채권 유효이자율',
        '미국 기업여신 증가율',
        '미국 금융시장 경색 지수',
        '미국 장단기 금리차',
        '캐나다 달러/일본 엔화'
    ],
    'BUSINESS CYCLE': [
        '미국 주간 실물경기 지수',
        '미국 실물경기 경기침체 확률',
        '샴 규칙 경기침체 지표',
        '미국 국가활동 지수',
        '미국 트럭판매 현황',
        '미국 화물운송 현황'
    ],
    'SPECIAL INDICATOR': [
        '금/석유 가격 비율',
        '미국 통화유동속도',
        '미국 실업률/자연실업률 차이',
        '미국 기대 인플레이션'
    ]
}

PANIC_DIRECTION = {
    '미국 주식 불확실성 지수':     True,
    '미국 고위험채권 유효이자율':  True,
    '미국 기업여신 증가율':        False,
    '미국 금융시장 경색 지수':     True,
    '미국 장단기 금리차':          False,
    '캐나다 달러/일본 엔화':       False,
    '미국 주간 실물경기 지수':     False,
    '미국 실물경기 경기침체 확률': True,
    '샴 규칙 경기침체 지표':       True,
    '미국 국가활동 지수':          False,
    '미국 트럭판매 현황':          False,
    '미국 화물운송 현황':          False,
    '금/석유 가격 비율':           True,
    '미국 통화유동속도':           False,
    '미국 실업률/자연실업률 차이': True,
    '미국 기대 인플레이션':        True,
}

PERCENTILES = {'BOOM': 10, 'WARM': 30, 'MILD': 70, 'COLD': 90}
COLORS = {
    'BOOM':  '#22c55e',
    'WARM':  '#84cc16',
    'MILD':  '#eab308',
    'COLD':  '#f97316',
    'PANIC': '#ef4444',
}

def fetch(series_id):
    try:
        res = requests.get(BASE_URL, params={
            'series_id':  series_id,
            'api_key':    API_KEY,
            'file_type':  'json',
            'sort_order': 'asc',
            'limit':      100000,
        })
        if res.status_code != 200:
            return None
        obs = res.json().get('observations', [])
        df = pd.DataFrame(obs)[['date', 'value']]
        df = df[df['value'] != '.']
        df['value'] = df['value'].astype(float)
        df['date'] = pd.to_datetime(df['date'])
        return df.reset_index(drop=True)
    except:
        return None

def load_data():
    os.makedirs('data', exist_ok=True)
    results = {}
    
    # Load from CSV or Fetch
    for name, sid in SERIES.items():
        path = f'data/{sid}.csv'
        if os.path.exists(path):
            df = pd.read_csv(path, parse_dates=['date'])
            results[name] = df
        else:
            df = fetch(sid)
            if df is not None:
                df.to_csv(path, index=False)
                results[name] = df

    # Derived Indicators
    # 1. 캐나다 달러/일본 엔화
    if 'CAD/USD' in results and 'JPY/USD' in results:
        cad = results['CAD/USD'].set_index('date')['value']
        jpy = results['JPY/USD'].set_index('date')['value']
        ratio = (1 / cad) / (1 / jpy)
        df = ratio.dropna().reset_index()
        df.columns = ['date', 'value']
        results['캐나다 달러/일본 엔화'] = df

    # 2. 금/석유 가격 비율
    if '금 가격' in results and '원유 가격 WTI' in results:
        gold = results['금 가격'].set_index('date')['value']
        oil  = results['원유 가격 WTI'].set_index('date')['value']
        merged = pd.concat([gold, oil], axis=1, keys=['gold', 'oil']).dropna()
        merged['value'] = merged['gold'] / merged['oil']
        results['금/석유 가격 비율'] = merged[['value']].reset_index()
    elif '원유 가격 WTI' in results:
        # If Gold fails, we just don't create this ratio or use a fixed/mock value
        # For now, we skip it to avoid crashes
        pass

    # 3. 실업률 - 자연실업률
    if '미국 실업률' in results and '미국 자연실업률' in results:
        u  = results['미국 실업률'].set_index('date')['value']
        nu = results['미국 자연실업률'].set_index('date')['value']
        # Align dates
        merged = pd.concat([u, nu], axis=1).dropna()
        diff = (merged.iloc[:, 0] - merged.iloc[:, 1]).reset_index()
        diff.columns = ['date', 'value']
        results['미국 실업률/자연실업률 차이'] = diff

    return results

def get_status_info(name, df):
    values = df['value']
    latest_val = values.iloc[-1]
    
    thresholds = {k: np.percentile(values, v) for k, v in PERCENTILES.items()}
    panic_up = PANIC_DIRECTION.get(name, True)
    
    b, w, m, c = thresholds['BOOM'], thresholds['WARM'], thresholds['MILD'], thresholds['COLD']
    
    if panic_up:
        if latest_val >= c: status = 'PANIC'
        elif latest_val >= m: status = 'COLD'
        elif latest_val >= w: status = 'MILD'
        elif latest_val >= b: status = 'WARM'
        else: status = 'BOOM'
        percentile = (values < latest_val).mean() * 100
    else:
        if latest_val <= b: status = 'PANIC'
        elif latest_val <= w: status = 'COLD'
        elif latest_val <= m: status = 'MILD'
        elif latest_val <= c: status = 'WARM'
        else: status = 'BOOM'
        percentile = (values > latest_val).mean() * 100
        
    return {
        'status': status,
        'color': COLORS[status],
        'latest_val': latest_val,
        'percentile': percentile,
        'thresholds': thresholds,
        'panic_up': panic_up
    }

def get_recession_periods(results):
    df = None
    if '경기침체' in results: df = results['경기침체'].copy()
    if df is None: return []
    df['diff'] = df['value'].diff()
    starts = df[df['diff'] == 1]['date'].tolist()
    ends = df[df['diff'] == -1]['date'].tolist()
    if df['value'].iloc[0] == 1: starts.insert(0, df['date'].iloc[0])
    if df['value'].iloc[-1] == 1: ends.append(df['date'].iloc[-1])
    return list(zip(starts, ends))
