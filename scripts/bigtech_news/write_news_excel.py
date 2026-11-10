from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime

today = datetime.now().strftime("%Y%m%d")
import os
save_dir = "C:/Users/Check/Desktop/APP/news"
os.makedirs(save_dir, exist_ok=True)
filepath = f"{save_dir}/빅테크뉴스_{today}.xlsx"

articles = [
    {
        "no": 1,
        "company": "OpenAI",
        "title_en": "The White House is asking OpenAI to slow roll the release of its new model over safety concerns",
        "title_kr": "백악관, 안전 우려로 OpenAI에 신모델 GPT 5.6 출시 속도 조절 요청",
        "media": "TechCrunch",
        "date": "2026-06-25",
        "url": "https://techcrunch.com/2026/06/25/the-white-house-is-asking-openai-to-slow-roll-the-release-of-its-new-model-over-safety-concerns/",
        "summary": "트럼프 행정부가 OpenAI에 신형 모델 GPT 5.6을 일반 공개하지 말고 선별된 파트너에게만 먼저 배포하도록 요청했다. CEO 샘 알트만은 직원들에게 정부가 '고객별로 접근을 승인'할 것이라고 전했으며, 제한 배포가 순조롭게 진행될 경우 수 주 후 일반 공개를 추진할 계획이다. 이번 조치는 국가사이버국장실과 과학기술정책실의 요청에 따른 것으로, 트럼프 행정부가 AI 신모델 공개 전 정부 테스트를 의무화하는 행정명령을 서명한 데 이어 나온 것이다."
    },
    {
        "no": 2,
        "company": "Apple",
        "title_en": "Apple raises Mac and iPad prices, spares iPhone for now",
        "title_kr": "Apple, Mac·iPad 가격 인상… iPhone은 일단 동결",
        "media": "TechCrunch",
        "date": "2026-06-25",
        "url": "https://techcrunch.com/2026/06/25/apple-raises-mac-and-ipad-prices-spares-iphone-for-now/",
        "summary": "AI 데이터센터 급증으로 인한 메모리·저장장치 부품 가격 폭등으로 Apple이 Mac과 iPad 전 라인업의 가격을 인상했다. MacBook Air는 기존 1,099달러에서 1,299달러로, MacBook Pro는 1,699달러에서 1,999달러로 올랐으며, iPad Pro도 999달러에서 1,199달러로 상승했다. Apple은 성명에서 \"AI 데이터센터 확장으로 메모리 수요가 유례없이 급증했다\"고 밝혔으며, iPhone 가격은 당분간 동결하되 연내 인상 가능성을 배제하지 않았다."
    },
    {
        "no": 3,
        "company": "Google (YouTube)",
        "title_en": "YouTube Shorts are getting even shorter with an update that lets you double the playback speed",
        "title_kr": "YouTube Shorts, 2배속 재생 기능 도입… 비디오가 더 짧아진다",
        "media": "TechCrunch",
        "date": "2026-06-25",
        "url": "https://techcrunch.com/2026/06/25/youtube-shorts-are-getting-even-shorter-with-an-update-that-lets-you-double-the-playback-speed/",
        "summary": "Google 산하 YouTube가 Shorts에 2배속 재생 기능을 포함한 여러 업데이트를 발표했다. 사용자가 정보를 더 빠르게 소화하거나 원하는 부분을 빠르게 찾을 수 있도록 돕는다는 취지다. 또한 기존 '싫어요' 버튼을 제거하고, 좋아요 버튼을 하트 이모지로 교체하며, 재생 화면에서 아이콘과 텍스트를 모두 숨기는 '클린 스크린 모드'도 추가된다. 이러한 변경사항은 순차적으로 적용될 예정이다."
    },
    {
        "no": 4,
        "company": "OpenAI",
        "title_en": "OpenAI unveils its first custom chip, built by Broadcom",
        "title_kr": "OpenAI, Broadcom과 공동 개발한 첫 자체 AI 칩 'Jalapeño' 공개",
        "media": "TechCrunch",
        "date": "2026-06-24",
        "url": "https://techcrunch.com/2026/06/24/openai-unveils-its-first-custom-chip-built-by-broadcom/",
        "summary": "OpenAI가 Broadcom과 협력하여 자체 개발한 첫 번째 추론(inference) 전용 프로세서 'Jalapeño'를 공개했다. 이 칩은 OpenAI의 AI 모델이 설계에 직접 참여했으며, 현재 최신 대안 대비 성능 대비 전력 효율이 크게 우수한 것으로 초기 결과가 나타났다. Nvidia GPU 의존도를 낮추려는 OpenAI의 전략적 행보로, Google과 Amazon이 자체 AI 가속 칩을 보유한 것과 같은 방향이다. 현재 테스트 단계이며, 실시간 코딩 모델 구동 시 운용 비용 절감에 특히 유리하다고 강조했다."
    },
    {
        "no": 5,
        "company": "Meta",
        "title_en": "WhatsApp gets new chief as Meta taps India's CRED founder Kunal Shah and invests $900M in startup",
        "title_kr": "Meta, WhatsApp 새 대표에 인도 핀테크 창업자 쿠날 샤 선임… CRED에 9억 달러 투자",
        "media": "TechCrunch",
        "date": "2026-06-22",
        "url": "https://techcrunch.com/2026/06/22/whatsapp-gets-new-chief-as-meta-taps-indias-cred-founder-kunal-shah-and-invests-900m-in-startup/",
        "summary": "Meta가 인도 핀테크 유니콘 CRED의 창업자 쿠날 샤(Kunal Shah)를 WhatsApp 새 대표로 선임하고, CRED에 9억 달러를 투자했다. 7년간 WhatsApp을 이끌어온 윌 캐스카트(Will Cathcart)는 Meta 내 신규 프로덕트 역할로 이동한다. 인도는 WhatsApp 최대 시장으로 5억 명 이상의 사용자를 보유하고 있으며, Meta는 디지털 결제·비즈니스 메시징 분야에서 인도 시장을 공략하기 위해 현지 전문가를 전진 배치하는 전략을 택했다."
    },
]

wb = Workbook()
ws = wb.active
ws.title = "빅테크뉴스"

# 헤더
headers = ["번호", "기업", "제목 (원문)", "제목 (한글)", "매체", "발행일", "URL", "내용 요약 (한글)"]
header_fill = PatternFill("solid", fgColor="1F4E79")
header_font = Font(name="Arial", bold=True, color="FFFFFF", size=11)
thin = Side(style="thin", color="AAAAAA")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

for col, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=h)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border

ws.row_dimensions[1].height = 30

# 데이터
even_fill = PatternFill("solid", fgColor="EBF3FB")
for i, a in enumerate(articles):
    row = i + 2
    row_fill = even_fill if i % 2 == 0 else None
    values = [a["no"], a["company"], a["title_en"], a["title_kr"], a["media"], a["date"], a["url"], a["summary"]]
    for col, val in enumerate(values, 1):
        cell = ws.cell(row=row, column=col, value=val)
        cell.font = Font(name="Arial", size=10)
        cell.border = border
        cell.alignment = Alignment(vertical="top", wrap_text=(col in [3, 4, 8]))
        if row_fill:
            cell.fill = row_fill
    ws.row_dimensions[row].height = 90

# 열 너비
col_widths = [6, 16, 45, 40, 12, 12, 55, 60]
for col, width in enumerate(col_widths, 1):
    ws.column_dimensions[get_column_letter(col)].width = width

# 틀 고정
ws.freeze_panes = "A2"

wb.save(filepath)
print(f"저장 완료: {filepath}")
