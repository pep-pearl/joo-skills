# Skill Map

## Core Skills

| Skill | Use when | Main output |
| --- | --- | --- |
| `repo-indexing` | 새 프로젝트를 AI 친화적으로 인덱싱할 때 | `AI_INDEX.md` router, `.ai/indexing/maps/*`, rules, file hint candidates |
| `repo-navigation` | 작업 시작 전 최소 파일을 고를 때 | intent classification, read plan, one-shard read list, uncertainty |
| `ai-metadata-maintenance` | route/domain/API/state/package 변경 후 metadata 갱신 판단 | maintenance summary for router/maps/file hints |
| `agent-operating-loop` | 큰 작업을 계획→실행→검증 loop로 진행할 때 | task ledger, verification gates |

## Frontend Skills

| Skill | Use when | Main output |
| --- | --- | --- |
| `frontend-fsd-navigation` | FSD-like frontend repo 탐색 | layer-aware read path |
| `screen-spec-alignment` | 화면설계서/PDF/HTML 기준 FE 구현/감사 | page alignment report |
| `api-integration-planning` | Swagger/OpenAPI와 FE domain API 연결 | API connection plan |

## Command Family

```txt
/indexing init
/indexing annotate
/indexing audit
/indexing refresh
/indexing explain
/navigation plan
/navigation trace
/metadata audit
/metadata refresh
```
