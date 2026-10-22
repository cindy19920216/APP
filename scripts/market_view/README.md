# 오늘의 뷰 — 외국계 시각 신호등

매일 07:15 KST에 `.github/workflows/market_view_daily.yml`이 실행돼
`public/market-view/index.html`을 갱신한다. 사이트 주소 뒤에 `/market-view/index.html`을 붙여서 연다.

- 코드: 이 폴더 (`python -m market_view.run_daily`를 `scripts/` 폴더에서 실행)
- 테스트: 이 폴더에서 `python -m pytest -q`
- AI 키: 저장소 Secrets의 `GEMINI_API_KEY`(외신 뉴스 작업과 같은 키를 공유), 예비로 `GROQ_API_KEY`(선택)
- 화면: 신호등(강세 비율 60% 초과 좋음 / 40~60% 중립 / 40% 미만 나쁨) → 전문가별 의견(신호등·코멘트·근거) → 확인 필요 → 추이
- 판정 기록: `data/opinions/날짜.json`, 차트 이력: `data/history.json`, 판정한 기사 목록: `data/judged.json`

## 판정 두 단계
1. 제목 판정: Google News 제목+요약을 20건씩 묶어 판정한다.
2. 근거 보강(`enrich.py`): 화면에 나갈 의견(표 + 확인 필요)만 원래 기사 주소로 풀고(`googlenewsdecoder`) 본문을 읽어
   음슴체 코멘트(`summary`), 근거 1~2줄(`reason`), 본문 판단(`body_stance`)을 붙인다. 한 번에 최대 20건.
   - AI가 옮긴 근거 문장이 본문에 없으면 근거를 버린다.
   - 본문 판단이 제목 판단과 다르면 표에서 빼고 '확인 필요'로 보낸다(아래 수정 파일로 고치면 다시 표로 센다).
   - 유료·차단 기사는 근거 없이 둔다. 네트워크·AI 한도 같은 일시 실패는 최대 3번까지 다음 실행에서 다시 시도한다.
   - 의견 파일의 `source_url`(원래 주소), `enriched`, `enrich_tries` 필드가 이 상태를 기록한다.

## 틀린 판정 고치기
`data/corrections.csv`에 한 줄을 추가하면 다음 실행부터 반영된다.

```
url,house,market,stance,note
https://기사주소,Goldman Sachs,KR,bear,원문은 약세
https://기사주소,BofA,KR,drop,설문 결과라 제외
```
- `url`: 의견 파일의 `url` 또는 화면 🔗의 원래 기사 주소(`source_url`) 어느 쪽이든 된다.
- `stance`: `bull`(강세), `bear`(약세), `neutral`(중립, 약세로 셈), `drop`(의견에서 제외)
