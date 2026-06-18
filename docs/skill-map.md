# Skill Map

## Core Skills

| Skill | Use when | Main output |
| --- | --- | --- |
| `repo-indexing` | 새 프로젝트를 AI 친화적으로 인덱싱할 때 | `AI_INDEX.md` router, `.ai/indexing/maps/*`, rules, file hint candidates |
| `repo-navigation` | 작업 시작 전 최소 파일을 고를 때 | intent classification, read plan, one-shard read list, uncertainty |
| `pr-diff-impact` | 이미 변경된 코드/PR/staged diff를 리뷰하거나 수정 계획을 세울 때 | `[DIFF_IMPACT]`, read-next/skip, affected shard candidates |
| `failure-triage` | 에러 로그, failing test, CI/build/type/lint/runtime failure에서 시작할 때 | temporary failure routing card, anchor-first read plan, known-pattern promotion decision |
| `ai-metadata-maintenance` | route/domain/API/state/package 변경 후 metadata 갱신 판단 | maintenance summary for router/maps/file hints |
| `agent-operating-loop` | 큰 작업을 계획→실행→검증 loop로 진행할 때 | task ledger, verification gates |
| `navigation-benchmark` | “벤치마킹 해줘. 모델: …”처럼 navigation A/B 실벤치를 요청할 때 | Codex CLI 실행, 결정론적 report, 실패 시 NOT_RUN |

## Frontend Skills

| Skill | Use when | Main output |
| --- | --- | --- |
| `frontend-fsd-navigation` | FSD-like frontend repo 탐색 | layer-aware read path |
| `frontend-next-app-navigation` | Next.js App Router repo 탐색 | route segment aware read path |
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
/failure triage
/metadata audit
/metadata refresh
/lookup path
/diff impact
/diff review
/diff fix-plan
/diff-check
/benchmark navigation
/benchmark model:<model>
```


## Failure / Metadata Recovery Flow

```txt
changed files / PR diff / staged files
-> pr-diff-impact
-> exact changed files, direct imports, matching tests
-> ai-metadata-maintenance only for affected shards

error log or failing command
-> failure-triage
-> exact anchor first
-> repo-navigation only if anchors are missing or stale
-> ai-metadata-maintenance only for affected stale metadata or promoted known failure patterns
```

Known failure patterns should be promoted by root cause, not error code. Default promotion threshold: same root cause 3+ times within 30 days, 2+ times in the same sprint, one high-navigation-cost occurrence, or one high-severity occurrence.
