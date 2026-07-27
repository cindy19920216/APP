# -*- coding: utf-8 -*-
"""
isabelnet.com/blog/ 최신 포스팅 5개(제목/설명/날짜/원문 링크/차트 이미지)를 가져와
public/isabelnet-charts/{runDate}/{n}.png + public/data/isabelnet_charts_history.json에
"하루치 페이지"로 누적 저장한다 (history[0]이 최신 = 프론트의 1페이지).

isabelnet.com으로부터 게재 허락을 받은 상태이며, 출처 표기(크레딧+링크백)는
각 페이지의 credit/sourceUrl 필드로 항상 함께 내보낸다.
이미지 5장 + 제목 + 짧은 설명 + 출처만 사용하고, 포스트 본문 전체는 가져오지 않는다.

isabelnet 블로그가 매일 새로 올라오지는 않으므로, 오늘 수집한 5개(sourceUrl 기준)가
직전 페이지(history[0])와 완전히 같으면 새 페이지를 추가하지 않고 그대로 종료한다
(같은 차트를 매일 중복 페이지로 쌓아두지 않기 위함). 보관 페이지 수는
MAX_HISTORY_ENTRIES로 제한하고, 넘치는 오래된 페이지는 이미지 폴더까지 함께 삭제한다.

"Bull and Bear Indicator" 시리즈는 실제 데이터가 아니라 "SAMPLE ONLY" 워터마크가 박힌
구독 유도용 홍보 이미지라서 제외한다 (public/isabelnet-charts에서 실제로 확인됨).

GEMINI_API_KEY(환경변수)가 설정돼 있으면 title/desc를 Gemini로 일괄 번역해
titleKo/descKo를 채운다. 키가 없거나 호출/파싱에 실패해도 차트 수집 자체는
계속 진행하고 titleKo/descKo만 null로 남긴다 (프론트는 null이면 원문으로 폴백).
"""
import json
import os
import re
import shutil
import sys
from datetime import datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHARTS_DIR = os.path.join(BASE_DIR, "public", "isabelnet-charts")
HISTORY_JSON_PATH = os.path.join(BASE_DIR, "public", "data", "isabelnet_charts_history.json")
BLOG_URL = "https://www.isabelnet.com/blog/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
TARGET_COUNT = 5
CANDIDATE_LIMIT = 20  # 제외 필터링 후에도 5개를 채울 수 있도록 넉넉히 훑어봄
MAX_HISTORY_ENTRIES = 14  # 보관할 최대 페이지 수 (넘으면 오래된 페이지부터 이미지째 삭제)
KST = timezone(timedelta(hours=9))  # 워크플로가 06:30 KST에 실행되므로 runDate는 KST 기준

# src/lib/gemini.ts와 동일한 모델 사용 (일관성 유지). 번역 실패/키 미설정 시에도
# 파이프라인 자체는 계속 진행하고 titleKo/descKo만 null로 남긴다 (프론트가 title로 폴백).
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-3.1-flash-lite"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# 실제 차트가 아니라 "SAMPLE ONLY" 워터마크 박힌 구독 유도 홍보 이미지인 시리즈.
EXCLUDE_TITLE_SUBSTRINGS = [
    "bull and bear indicator",
]

MONTH_MAP = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
    "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
}


def parse_date(date_meta) -> str:
    month = date_meta.select_one(".posted-date-month").get_text(strip=True)
    day = date_meta.select_one(".posted-date-day").get_text(strip=True)
    year = date_meta.select_one(".posted-date-year").get_text(strip=True)
    return f"{year}-{MONTH_MAP.get(month, '01')}-{int(day):02d}"


def is_excluded(title: str) -> bool:
    t = title.lower()
    return any(sub in t for sub in EXCLUDE_TITLE_SUBSTRINGS)


def full_size_url(thumb_url: str) -> str:
    """'...-small.png' -> '...png' (원본 해상도). 실제로 존재하는지 HEAD로 확인,
    없으면 축소판 URL을 그대로 반환."""
    candidate = re.sub(r"-small(?=\.\w+$)", "", thumb_url)
    if candidate == thumb_url:
        return thumb_url
    try:
        resp = requests.head(candidate, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            return candidate
    except requests.RequestException:
        pass
    return thumb_url


def fetch_full_desc(article_url: str, fallback: str) -> str:
    """개별 포스트 페이지에서 잘리지 않은 전체 캡션을 가져온다.
    블로그 목록 페이지의 .post-excerpt는 워드프레스가 자동으로 일정 길이에서
    잘라(…) 문장이 중간에 끊기지만, 실제 포스트 페이지의 캡션 자체는 원래 1~2문장으로 짧고
    "Image: <출처>" 문단 앞까지만 있다 (그 뒤에 이미지 외 본문은 없음 - 확인됨).
    실패 시 목록 페이지에서 얻은 잘린 excerpt(fallback)로 되돌아간다."""
    try:
        resp = requests.get(article_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        body = soup.select_one(".entry-content") or soup.select_one("article")
        if not body:
            return fallback
        parts = []
        for p in body.find_all("p"):
            text = p.get_text(strip=True)
            if not text:
                continue
            if text.lower().startswith("image:"):
                break
            parts.append(text)
        full = " ".join(parts).strip()
        return full or fallback
    except requests.RequestException as e:
        print(f"  전체 캡션 조회 실패, 요약으로 대체 ({article_url}): {e}")
        return fallback


def fetch_posts(candidate_limit=CANDIDATE_LIMIT):
    resp = requests.get(BLOG_URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    posts = []
    for article in soup.select("article.futurio-post")[:candidate_limit]:
        title_a = article.select_one("h2.entry-title a")
        thumb_img = article.select_one(".news-thumb img")
        date_meta = article.select_one(".date-meta")
        excerpt_p = article.select_one(".post-excerpt p")
        if not (title_a and thumb_img and date_meta):
            continue
        title = title_a.get_text(strip=True)
        if is_excluded(title):
            print(f"  제외(샘플/광고성 시리즈): {title}")
            continue
        desc = excerpt_p.get_text(strip=True) if excerpt_p else ""
        # 제목이 설명 맨 앞에 그대로 중복 포함되는 경우(사이트 원본 excerpt 구조) 제거
        if desc.startswith(title):
            desc = desc[len(title):].strip()
        desc = fetch_full_desc(title_a["href"], desc)
        posts.append({
            "title": title,
            "desc": desc,
            "sourceUrl": title_a["href"],
            "thumbUrl": thumb_img["src"],
            "date": parse_date(date_meta),
        })
        if len(posts) >= TARGET_COUNT:
            break
    return posts


def translate_posts(posts: list) -> list:
    """posts의 title/desc를 자연스러운 한국어로 일괄 번역해 (titleKo, descKo) 튜플 리스트로 반환.
    GEMINI_API_KEY 미설정이거나 호출/파싱 실패 시 전부 (None, None)으로 채워 프론트가
    title/desc(원문)로 폴백하게 한다 - 번역 실패가 차트 수집 자체를 막으면 안 되므로."""
    fallback = [(None, None)] * len(posts)
    if not GEMINI_API_KEY:
        print("  GEMINI_API_KEY 미설정 - 번역 건너뜀 (원문 그대로 표시됨)")
        return fallback

    items = [{"title": p["title"], "desc": p["desc"]} for p in posts]
    prompt = (
        "다음은 경제/투자 블로그 게시물의 제목과 설명을 담은 JSON 배열이다. "
        "각 항목의 title과 desc를 자연스러운 한국어 경제 뉴스체로 번역하라. "
        "고유명사/지표명은 통용되는 한국어 표기를 쓰되 원문 뉴앙스를 살릴 것. "
        "원문에 없는 말줄임표(…)나 문장을 임의로 덧붙이지 말고 원문 의미만 정확히 옮길 것. "
        "설명 외 다른 텍스트 없이, 입력과 같은 개수/순서의 JSON 배열만 출력하라. "
        '각 원소 형식: {"titleKo": "...", "descKo": "..."}\n\n'
        f"입력:\n{json.dumps(items, ensure_ascii=False)}"
    )

    try:
        resp = requests.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
        translated = json.loads(text)
        if not isinstance(translated, list) or len(translated) != len(posts):
            raise ValueError(f"번역 결과 개수 불일치: {len(translated) if isinstance(translated, list) else 'N/A'} != {len(posts)}")
        return [(t.get("titleKo"), t.get("descKo")) for t in translated]
    except Exception as e:
        print(f"  번역 실패, 원문으로 폴백: {e}")
        return fallback


def load_history() -> list:
    if not os.path.exists(HISTORY_JSON_PATH):
        return []
    try:
        with open(HISTORY_JSON_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_history(history: list) -> None:
    with open(HISTORY_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def download_image(url: str, dest_path: str) -> bool:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(resp.content)
        return True
    except requests.RequestException as e:
        print(f"  이미지 다운로드 실패 ({url}): {e}")
        return False


def main():
    os.makedirs(CHARTS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(HISTORY_JSON_PATH), exist_ok=True)

    posts = fetch_posts()
    print(f"포스팅 {len(posts)}건 파싱 완료 (제외 필터 적용 후)")
    if not posts:
        print("수집된 포스팅이 없어 종료")
        return

    history = load_history()
    latest_urls = {p["sourceUrl"] for p in posts}
    if history and {c["sourceUrl"] for c in history[0]["charts"]} == latest_urls:
        print(f"직전 페이지({history[0]['runDate']})와 차트 구성이 동일 - 새 페이지 없이 종료")
        return

    run_date = datetime.now(KST).strftime("%Y-%m-%d")
    run_dir = os.path.join(CHARTS_DIR, run_date)
    os.makedirs(run_dir, exist_ok=True)

    translations = translate_posts(posts)

    entries = []
    original_count = 0
    for i, (post, (title_ko, desc_ko)) in enumerate(zip(posts, translations), start=1):
        image_url = full_size_url(post["thumbUrl"])
        if image_url != post["thumbUrl"]:
            original_count += 1
        dest = os.path.join(run_dir, f"{i}.png")
        ok = download_image(image_url, dest)
        if not ok:
            print(f"  [{i}] 건너뜀: {post['title']}")
            continue
        entries.append({
            "title": post["title"],
            "titleKo": title_ko,  # 번역 실패/미설정 시 None (프론트는 없으면 title로 폴백)
            "desc": post["desc"],
            "descKo": desc_ko,    # 위와 동일
            "date": post["date"],
            "sourceUrl": post["sourceUrl"],
            "image": f"/isabelnet-charts/{run_date}/{i}.png",
            "credit": "Source: ISABELNET",
        })
        print(f"  [{i}] {post['date']} {post['title']} ({'원본' if image_url != post['thumbUrl'] else '축소판'})")

    if not entries:
        print("다운로드에 성공한 항목이 없어 종료 (히스토리에 추가하지 않음)")
        shutil.rmtree(run_dir, ignore_errors=True)
        return

    history.insert(0, {"runDate": run_date, "charts": entries})

    while len(history) > MAX_HISTORY_ENTRIES:
        removed = history.pop()
        shutil.rmtree(os.path.join(CHARTS_DIR, removed["runDate"]), ignore_errors=True)
        print(f"  보관기간({MAX_HISTORY_ENTRIES}페이지) 초과로 정리: {removed['runDate']}")

    save_history(history)

    print(f"\n완료: {len(entries)}건 저장 (원본 이미지 {original_count}/{len(entries)}) - runDate={run_date}, 총 {len(history)}페이지")
    print(f"[저장됨] {HISTORY_JSON_PATH}")


if __name__ == "__main__":
    main()
