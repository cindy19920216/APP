"""하우스 이름 정규화: 한국어·영문·약칭·소속 전략가 이름을 하나의 이름으로 묶는다.
외국계가 아니면 None을 돌려준다(국내 증권사·운용사·개인은 집계 대상이 아님)."""
import re

# 정규화 이름 -> 별칭들 (소문자, 공백 제거 후 비교)
HOUSES = {
    "Goldman Sachs": ["goldmansachs", "goldman", "gs", "골드만삭스", "골드만", "davidkostin", "데이비드코스틴", "kostin", "코스틴"],
    "Morgan Stanley": ["morganstanley", "ms", "모건스탠리", "mikewilson", "마이크윌슨"],
    "JPMorgan": ["jpmorgan", "jpm", "jp모간", "jp모건", "제이피모간", "dubravkolakos"],
    "BofA": ["bankofamerica", "bofa", "boa", "merrilllynch", "뱅크오브아메리카", "bofa증권", "메릴린치", "michaelhartnett", "마이클하트넷", "savitasubramanian"],
    "Citi": ["citigroup", "citi", "씨티", "씨티그룹", "씨티글로벌"],
    "UBS": ["ubs"],
    "Barclays": ["barclays", "바클레이즈"],
    "Nomura": ["nomura", "노무라"],
    "HSBC": ["hsbc"],
    "Macquarie": ["macquarie", "맥쿼리"],
    "CLSA": ["clsa"],
    "Deutsche Bank": ["deutschebank", "deutsche", "도이치", "도이체방크", "도이치뱅크"],
    "Wells Fargo": ["wellsfargo", "웰스파고"],
    "Jefferies": ["jefferies", "제프리스"],
    "BlackRock": ["blackrock", "블랙록"],
    "PIMCO": ["pimco", "핌코"],
    "Fidelity": ["fidelity", "피델리티"],
    "Vanguard": ["vanguard", "뱅가드"],
    "Fundstrat": ["fundstrat", "펀드스트랫", "tomlee", "톰리"],
    "Yardeni": ["yardeni", "야데니"],
}

# 짧은 별칭(약칭)은 부분일치하면 오탐이 많으므로 이름 안의 '단어' 하나와 같을 때만 인정한다.
# 예: "BofA Securities" -> bofa, "GS Asset Management" -> gs
_SHORT_MAX_LEN = 4

_ALIASES = sorted(
    ((alias, name) for name, aliases in HOUSES.items() for alias in aliases),
    key=lambda x: -len(x[0]),
)


def _key(s: str) -> str:
    return re.sub(r"[\s.\-·&']", "", s).lower()


def _tokens(s: str) -> list[str]:
    return [t.lower() for t in re.split(r"[\s.\-·&',()/]+", s) if t]


def normalize_house(name: str) -> str | None:
    k = _key(name or "")
    if not k:
        return None
    tokens = set(_tokens(name))
    for alias, canon in _ALIASES:
        if k == alias:
            return canon
    for alias, canon in _ALIASES:
        if len(alias) > _SHORT_MAX_LEN and alias in k:
            return canon
    for alias, canon in _ALIASES:
        if len(alias) <= _SHORT_MAX_LEN and alias in tokens:
            return canon
    return None


# 한국어 기사 제목에서 약칭 뒤에 붙는 조사 (예: "UBS는", "JP모간의")
_PARTICLES = {"는", "은", "이", "가", "의", "도", "와", "과", "에", "측", "에서", "로", "증권"}


def find_house(text: str) -> str | None:
    """기사 제목 같은 문장에 언급된 외국계 하우스를 찾는다(수집 단계 거르기용)."""
    k = _key(text or "")
    for alias, canon in _ALIASES:
        if len(alias) > _SHORT_MAX_LEN and alias in k:
            return canon
    for tok in _tokens(text or ""):
        for alias, canon in _ALIASES:
            if len(alias) <= _SHORT_MAX_LEN and tok.startswith(alias) and (
                    tok == alias or tok[len(alias):] in _PARTICLES):
                return canon
    return None
