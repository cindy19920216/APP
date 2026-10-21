# 외국계 시각 강세/약세 판정기

매일 07:15 KST에 `.github/workflows/market_view_daily.yml`이 실행돼
`public/market-view/index.html`을 갱신한다. 사이트 주소 뒤에 `/market-view/index.html`을 붙여서 연다.

- 코드: 이 폴더 (`python -m market_view.run_daily`를 `scripts/` 폴더에서 실행)
- 테스트: 이 폴더에서 `python -m pytest -q`
- AI 키: 저장소 Secrets의 `GEMINI_API_KEY`(외신 뉴스 작업과 같은 키를 공유), 예비로 `GROQ_API_KEY`(선택)
- 판정 기록: `data/opinions/날짜.json`, 차트 이력: `data/history.json`, 판정한 기사 목록: `data/judged.json`

## 틀린 판정 고치기
`data/corrections.csv`에 한 줄을 추가하면 다음 실행부터 반영된다.

```
url,house,market,stance,note
https://기사주소,Goldman Sachs,KR,bear,원문은 약세
https://기사주소,BofA,KR,drop,설문 결과라 제외
```
- `stance`: `bull`(강세), `bear`(약세), `neutral`(중립, 약세로 셈), `drop`(의견에서 제외)
