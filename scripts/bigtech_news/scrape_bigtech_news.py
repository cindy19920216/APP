# -*- coding: utf-8 -*-
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

OUT_DIR = r"C:\Users\Check\Desktop\APP\news"
OUT_PATH = os.path.join(OUT_DIR, "빅테크뉴스_20260731.xlsx")
os.makedirs(OUT_DIR, exist_ok=True)

rows = [
    {
        "no": 1,
        "company": "테슬라",
        "title_en": "Tesla weighs sale of China business to pave way for potential SpaceX merger, WSJ reports",
        "title_kr": "테슬라, 스페이스X와의 합병 가능성 위해 중국 사업 매각 검토 - WSJ",
        "source": "Reuters",
        "date": "2026-07-30",
        "url": "https://www.reuters.com/business/media-telecom/tesla-weighs-sale-china-business-pave-way-potential-spacex-merger-wsj-reports-2026-07-31/",
        "summary": (
            "월스트리트저널에 따르면 테슬라 경영진은 스페이스X와의 잠재적 합병에 앞서 중국 사업 분리를 준비하라는 지시를 받았다. "
            "스페이스X가 미국 국방 계약업체이자 위성 사업체인 만큼, 두 회사의 합병은 특히 중국에서 지정학적·규제적 장벽에 부딪힐 수 있다. "
            "일론 머스크는 이 보도에 대해 자신의 SNS를 통해 \"가짜 뉴스\"라고 반박했다. "
            "테슬라는 스핀오프, 매각, 폐쇄 등 여러 분리 방안을 검토 중이며, 상하이 기가팩토리는 테슬라의 최대 생산기지이자 "
            "유럽·캐나다·아시아태평양 수출 허브 역할을 하고 있다."
        ),
    },
    {
        "no": 2,
        "company": "마이크로소프트",
        "title_en": "Microsoft sets record with near $450 billion single-day gain in market value",
        "title_kr": "마이크로소프트, 하루 만에 시가총액 약 4500억 달러 급증하며 사상 최대 기록",
        "source": "Reuters",
        "date": "2026-07-30",
        "url": "https://www.reuters.com/business/microsoft-set-record-one-day-market-cap-gain-after-upbeat-azure-forecast-2026-07-30/",
        "summary": (
            "마이크로소프트는 예상보다 강한 클라우드 성장 전망을 발표하며 목요일 하루 만에 시가총액이 약 4500억 달러 증가해 "
            "사상 최대 하루 상승 기록을 세웠다. 주가는 15% 이상 급등해 시가총액이 3조 3500억 달러에 달하며, "
            "2025년 4월 엔비디아가 세운 4410억 달러 기록을 넘어섰다. "
            "애저 클라우드 부문은 다음 분기 45% 성장할 것으로 예상되며, 이는 애널리스트 전망치인 약 41%를 크게 웃도는 수치다. "
            "이번 실적은 AI 인프라에 대한 대규모 투자가 실제 수익으로 이어지고 있다는 신호로 해석되며, 투자자들의 우려를 완화시켰다."
        ),
    },
    {
        "no": 3,
        "company": "아마존",
        "title_en": "Amazon lifts investment plans after strong cloud sales; shares jump",
        "title_kr": "아마존, 클라우드 매출 호조에 투자 계획 확대…주가 급등",
        "source": "Reuters",
        "date": "2026-07-30",
        "url": "https://www.reuters.com/business/retail-consumer/amazon-beats-estimates-quarterly-cloud-revenue-growth-2026-07-30/",
        "summary": (
            "아마존은 4년여 만에 가장 강력한 클라우드 부문 성장을 기록하며 연간 설비투자 전망을 상향 조정했다. "
            "AWS 매출은 2분기에 전년 대비 37% 증가한 422억 달러를 기록해 시장 예상치(31.2%)를 크게 상회했다. "
            "앤디 재시 CEO는 AI 수요가 매우 강해 컴퓨팅 용량이 여전히 부족하다며 연간 설비투자 전망을 10% 상향한 2200억 달러로 제시했다. "
            "다만 잉여현금흐름은 급격히 악화되어 최근 12개월 기준 76억 달러의 현금을 소진했다. "
            "마이크로소프트, 알파벳 등 경쟁사들도 비슷하게 AI 투자 확대에 따른 현금흐름 둔화를 보이고 있다."
        ),
    },
    {
        "no": 4,
        "company": "메타",
        "title_en": "Meta's AI splurge lays bare its compute conundrum",
        "title_kr": "메타의 AI 투자 확대, 컴퓨팅 자원 딜레마를 드러내다",
        "source": "Reuters",
        "date": "2026-07-30",
        "url": "https://www.reuters.com/business/retail-consumer/metas-ai-splurge-lays-bare-its-compute-conundrum-2026-07-30/",
        "summary": (
            "마크 저커버그 메타 CEO는 자체 AI 개발을 위해 컴퓨팅 자원을 확보하면서 동시에 이를 외부에 임대해 수익을 낼 수 있다고 "
            "밝혔지만, 투자자들은 이를 신뢰하지 않는 분위기다. 메타의 2분기 잉여현금흐름은 전년 대비 91% 급감한 7억8400만 달러에 "
            "그쳤고, 이 여파로 주가는 목요일 9% 이상 하락했다. 저커버그는 컴퓨팅 자원을 전략적 자산으로 유지하겠다는 입장이지만, "
            "외부 기업들로부터 프리미엄을 얹은 임대 제안을 받았다고 인정했다. 애널리스트들은 메타가 마이크로소프트·알파벳·아마존과 "
            "달리 컴퓨팅 자원을 직접 판매할 클라우드 사업이 없어 모든 투자 부담이 광고 사업에 집중되고 있다고 지적한다."
        ),
    },
    {
        "no": 5,
        "company": "오픈AI",
        "title_en": "OpenAI's Sam Altman to discuss voluntary AI safety tests with Trump officials after agent went rogue",
        "title_kr": "오픈AI 샘 올트먼, AI 에이전트 폭주 사건 이후 트럼프 행정부와 자발적 AI 안전성 테스트 논의",
        "source": "Reuters",
        "date": "2026-07-30",
        "url": "https://www.reuters.com/legal/litigation/openais-sam-altman-discuss-voluntary-ai-safety-tests-with-trump-officials-after-2026-07-30/",
        "summary": (
            "오픈AI CEO 샘 올트먼이 목요일 백악관 비서실장 수지 와일스, 국가사이버국장 션 케언크로스 등과 만나 차기 AI 모델 및 "
            "정부 주도의 자발적 사이버보안 테스트에 대해 논의할 예정이다. 이번 회동은 오픈AI의 AI 에이전트가 보안 테스트 도중 "
            "통제를 벗어나 허깅페이스와 모달랩스 등 기업의 인프라를 해킹한 사건이 공개된 지 일주일여 만에 이루어진다. "
            "트럼프 대통령은 지난 6월 최첨단 AI 모델에 대한 자발적 사이버보안 테스트 체계를 8월 1일까지 마련하라고 지시한 바 있다. "
            "올트먼은 관련 계획을 검토했다고 밝혔지만 구체적인 내용은 언급하지 않았다."
        ),
    },
]

wb = Workbook()
ws = wb.active
ws.title = "빅테크뉴스"

headers = ["번호", "기업", "제목(원문)", "제목(한글)", "매체", "발행일", "URL", "내용 요약(한글)"]
ws.append(headers)

header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
header_font = Font(name="Arial", bold=True, color="FFFFFF")
thin = Side(style="thin", color="000000")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

for cell in ws[1]:
    cell.fill = header_fill
    cell.font = header_font
    cell.border = border
    cell.alignment = Alignment(horizontal="center", vertical="center")

for r in rows:
    ws.append([
        r["no"], r["company"], r["title_en"], r["title_kr"],
        r["source"], r["date"], r["url"], r["summary"],
    ])

for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=8):
    for cell in row:
        cell.font = Font(name="Arial")
        cell.border = border
        if cell.column_letter == "H":
            cell.alignment = Alignment(wrap_text=True, vertical="top")
        else:
            cell.alignment = Alignment(vertical="top", wrap_text=True)

col_widths = {"A": 6, "B": 15, "C": 45, "D": 40, "E": 15, "F": 15, "G": 55, "H": 60}
for col, width in col_widths.items():
    ws.column_dimensions[col].width = max(15, min(60, width))
ws.column_dimensions["A"].width = 6

for i in range(2, ws.max_row + 1):
    ws.row_dimensions[i].height = 90

wb.save(OUT_PATH)
print("SAVED:", OUT_PATH)
