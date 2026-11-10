# Claude 모델 배분 가이드 (재선용)

출처: claude.dev "Which Claude model should you build with?" (2026-11)

## 기본 원칙
- 모르겠으면 **Opus 5.5 / medium** 으로 시작
- 품질이 부족하면 순서대로: ① 자체 검증 추가(테스트·빌드·스크립트) → ② effort 한 단계 상승 → ③ 더 낮은 effort로 상위 모델
- Opus를 `high` 이상으로 올리기 전에 **Fable 5.2 high**를 먼저 테스트

## 작업별 배분표
| 작업 | 모델 | effort |
|---|---|---|
| 프로젝트 메인 세션 (Chart Dojang, Herencia, KOSPI Signal Lens 등 바이브코딩) | Opus 5.5 | medium → high |
| 범위 명확한 버그 수정, 스펙 기반 구현 | Sonnet 5.5 | medium → high |
| 문서·PPT·엑셀 산출물 (자산배분협의회 자료 등) | Sonnet 5.5 | medium |
| 복잡한 재무모델, 자료가 방대한 분석 | Opus 5.5 | medium → high |
| 대규모 리팩터링·아키텍처, 딥 리서치, 정량 분석 | Fable 5.2 | medium → high |
| 파일 검색, 로그 읽기, 요약 (서브에이전트) | Haiku 5.5 | - |
| 분류·태깅·추출 대량 처리 | Haiku 5.5 | - |

## 비용 절감 팁
- 전부 `low`로 돌린 뒤 실패한 것만 `high`로 재실행 (한 벤치마크에서 비용 약 40% 절감, 통과율 오히려 상승)
- 모델 전환 시 캐시가 초기화되므로 `/compact` 후 전환
- 메인 컨텍스트는 가볍게 유지하고, 장문 읽기는 Haiku 서브에이전트에 위임

## 주의사항
- Opus 5.5 / Fable 5.2는 thinking을 끌 수 없음 (끄면 에러)
- API에서 `tool_choice`를 `any`/`tool`로 지정하면 400 에러 → `auto` + `strict: true`
- `opusplan` 별칭은 코드 수정을 Sonnet에 맡기므로 도입 전 직접 측정
