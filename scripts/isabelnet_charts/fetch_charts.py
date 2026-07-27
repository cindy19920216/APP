# -*- coding: utf-8 -*-
"""
isabelnet.com/blog/ 최신 포스팅 5개(제목/설명/날짜/원문 링크/차트 이미지)를 가져와
public/isabelnet-charts/{n}.png + public/data/isabelnet_charts.json으로 저장한다.

isabelnet.com으로부터 게재 허락을 받은 상태이며, 출처 표기(크레딧+링크백)는
public/data/isabelnet_charts.json의 credit/sourceUrl 필드로 항상 함께 내보낸다.
이미지 5장 + 제목 + 짧은 설명 + 출처만 사용하고, 포스트 본문 전체는 가져오지 않는다.

"Bull and Bear Indicator" 시리즈는 실제 데이터가 아니라 "SAMPLE ONLY" 워터마크가 박힌
구독 유도용 홍보 이미지라서 제외한다 (public/isabelnet-charts/1.png에서 실제로 확인됨).
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHARTS_DIR = os.path.join(BASE_DIR, "public", "isabelnet-charts")
JSON_PATH = os.path.join(BASE_DIR, "public", "data", "isabelnet_charts.json")
BLOG_URL = "https://www.isabelnet.com/blog/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
TARGET_COUNT = 5
CANDIDATE_LIMIT = 20  # 제외 필터링 후에도 5개를 채울 수 있도록 넉넉히 훑어봄

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
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)

    posts = fetch_posts()
    print(f"포스팅 {len(posts)}건 파싱 완료 (제외 필터 적용 후)")

    entries = []
    original_count = 0
    for i, post in enumerate(posts, start=1):
        image_url = full_size_url(post["thumbUrl"])
        if image_url != post["thumbUrl"]:
            original_count += 1
        dest = os.path.join(CHARTS_DIR, f"{i}.png")
        ok = download_image(image_url, dest)
        if not ok:
            print(f"  [{i}] 건너뜀: {post['title']}")
            continue
        entries.append({
            "title": post["title"],
            "titleKo": None,  # 별도의 번역 루틴이 이후 채워 넣음 (프론트는 없으면 title로 폴백)
            "desc": post["desc"],
            "descKo": None,   # 위와 동일
            "date": post["date"],
            "sourceUrl": post["sourceUrl"],
            "image": f"/isabelnet-charts/{i}.png",
            "credit": "Source: ISABELNET",
        })
        print(f"  [{i}] {post['date']} {post['title']} ({'원본' if image_url != post['thumbUrl'] else '축소판'})")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"\n완료: {len(entries)}건 저장 (원본 이미지 {original_count}/{len(entries)})")
    print(f"[저장됨] {JSON_PATH}")


if __name__ == "__main__":
    main()
