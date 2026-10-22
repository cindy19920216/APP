"""설정값: 경로, 임계값, 검색어, 무료 AI 제공자."""
from pathlib import Path

# ---------- 경로 (Herencia 저장소 기준) ----------
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "scripts" / "market_view" / "data"   # 판정 기록·수정 파일
SITE_DIR = REPO_ROOT / "public" / "market-view"             # 사이트의 /market-view/index.html

# ---------- 집계 ----------
MIN_CONFIDENCE = 0.6     # 이보다 낮은 판정은 '확인 필요'로 빼고 세지 않는다
VALID_DAYS = 7           # 하우스 의견 유효기간(일)
FEW_VOTES = 3            # 표가 이보다 적으면 '의견 적음'
SPLIT_LOW, SPLIT_HIGH = 0.45, 0.55   # 이 범위면 '의견 갈림'

# ---------- 수집 (Google News RSS) ----------
# 하우스별 검색어: (영문 이름, 한국어 이름 또는 None). collect.build_queries가 미국·한국 검색어로 펼친다.
HOUSE_QUERY_NAMES = [
    ("Goldman Sachs", "골드만삭스"), ("Morgan Stanley", "모건스탠리"), ("JPMorgan", "JP모간"),
    ("Bank of America", "뱅크오브아메리카"), ("Citi", "씨티"), ("UBS", "UBS"), ("Barclays", "바클레이즈"),
    ("Nomura", "노무라"), ("HSBC", "HSBC"), ("Macquarie", "맥쿼리"), ("CLSA", "CLSA"),
    ("Deutsche Bank", "도이치"), ("Wells Fargo", None), ("Jefferies", None), ("BlackRock", "블랙록"),
    ("Fundstrat", None), ("Yardeni", None), ("PIMCO", None),
]
# 하우스 이름이 없는 일반 검색어 (제목에 하우스 이름이 있는 기사만 남는다)
EXTRA_QUERIES = [
    ("외국계 코스피 전망", "KR", "ko"),
    ("신흥국 비중확대", "KR", "ko"),
    ("emerging markets stocks overweight", "KR", "en"),
    ("strategist S&P 500 outlook", "US", "en"),
    ("developed markets equities overweight", "US", "en"),
]
RECENT_DAYS = 2          # 이 기간(일) 안의 기사만 판정
REQUEST_PAUSE = 1.0      # 요청 사이 대기(초)
MAX_ARTICLES_PER_RUN = 400   # 한 번에 판정할 기사 상한 (무료 AI 한도 보호)
MIN_TEXT_CHARS = 300     # 본문이 이보다 짧으면 추출 실패로 보고 제목+요약으로 판정
USER_AGENT = "Mozilla/5.0 (market-view daily bot)"

# ---------- 근거 보강 (화면에 나갈 의견만 본문을 읽는다) ----------
ENRICH_MAX_PER_RUN = 20  # 한 번 실행에 보강할 의견 상한 (무료 AI 한도 보호)
ENRICH_MAX_TRIES = 3     # 일시 실패를 이만큼 겪으면 더 시도하지 않는다
ENRICH_TIMEOUT = 15      # 주소 풀기·본문 요청 시간 제한(초)

# ---------- 무료 AI 제공자 (위에서부터 순서대로 시도) ----------
# 모두 OpenAI 호환 엔드포인트. 확인일 2026-10-21:
#  - Gemini: ai.google.dev/api/compatibility (무료 등급은 Flash 계열)
#  - Groq: console.groq.com/docs/openai
#  - GitHub Models: docs.github.com/rest/models/inference (Actions에서 GITHUB_TOKEN + models: read)
# 무료 모델 이름은 자주 바뀌므로 환경변수(model_env)로 덮어쓸 수 있다.
PROVIDERS = [
    {"name": "gemini", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
     "model": "gemini-flash-latest", "model_env": "GEMINI_MODEL", "key_env": "GEMINI_API_KEY"},
    # 같은 키라도 모델마다 무료 한도가 따로라서, Flash가 막히면 Flash-Lite로 한 번 더 시도
    {"name": "gemini-lite", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
     "model": "gemini-flash-lite-latest", "model_env": "GEMINI_LITE_MODEL", "key_env": "GEMINI_API_KEY"},
    {"name": "groq", "base_url": "https://api.groq.com/openai/v1",
     "model": "llama-3.3-70b-versatile", "model_env": "GROQ_MODEL", "key_env": "GROQ_API_KEY"},
    {"name": "github", "base_url": "https://models.github.ai/inference",
     "model": "openai/gpt-4.1-mini", "model_env": "GITHUB_MODEL", "key_env": "GITHUB_TOKEN"},
]
RATE_LIMIT_WAIT = 30.0   # 429 응답에 대기 시간이 없을 때 기다릴 시간(초)
RATE_LIMIT_WAIT_MAX = 90.0
BATCH_SIZE = 20          # AI 한 번에 판정할 기사 수 (제목 위주라 묶어도 짧다)
LLM_PAUSE = 4.0          # 호출 사이 대기(초) — 무료 등급 분당 요청 한도 대비
