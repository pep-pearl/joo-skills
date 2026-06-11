# joo-skills

개인용 AI workflow / agent skill 아카이브입니다.

`joo-code`가 복붙 가능한 코드 kit을 모으는 저장소라면, `joo-skills`는 매 프로젝트마다 반복해서 쓰는 AI 작업 방식, repo indexing, AGENTS/rules 템플릿, harness별 어댑터를 모으는 저장소입니다.

## Core Idea

AI가 새 프로젝트를 만났을 때 바로 전체 repo를 훑지 않고, 먼저 작은 navigation router를 읽고, 필요한 경우에만 작게 쪼갠 map shard 하나를 읽게 합니다.

```txt
/indexing init      -> 프로젝트 구조를 읽고 router + map shard 후보 생성
/indexing annotate  -> source 수정 없이 sidecar file hint 후보 생성
/indexing audit     -> AI_INDEX / manifest / maps / file hints 불일치 점검
/indexing refresh   -> routes/domains/api/state/packages 등 변경 영역만 갱신
```

## Direction

- `AI_INDEX.md`는 architecture 문서가 아니라 작은 router입니다.
- 상세 파일 매핑은 `.ai/indexing/maps/*`에 shard로 나눕니다.
- 평소 작업에서는 map shard를 최대 1개만 읽고, 이후에는 import-following을 우선합니다.
- 단, route/API/state/style/auth처럼 결합 신호가 있으면 companion shard 1개까지만 싸게 승급합니다.
- 자연어/기획/디자인식 요청이 모호할 때만 `maps/root.md`에서 시작합니다.
- scripts는 후보를 만들고, AI는 필요한 조각만 판단해서 사용합니다.
- index와 map은 truth가 아니라 disposable navigation hint입니다. source/import/test가 더 우선합니다.

## Repository Structure

```txt
.
├─ skills/
│  ├─ repo-indexing/                 # /indexing 계열 핵심 스킬
│  ├─ repo-navigation/               # 최소 파일 읽기 / intent classification / import-following
│  ├─ ai-metadata-maintenance/       # AI_INDEX, map shards, sidecar file hints 유지보수
│  ├─ frontend-fsd-navigation/       # FE/FSD/React Router 탐색
│  ├─ frontend-next-app-navigation/  # Next.js App Router 탐색
│  ├─ screen-spec-alignment/         # 화면설계서 기반 구현/감사
│  ├─ api-integration-planning/      # Swagger/OpenAPI ↔ FE 연결 계획
│  └─ agent-operating-loop/          # 계획-실행-검증 loop
├─ adapters/
│  ├─ common/                        # AGENTS.md 공통 fragment
│  ├─ codex/                         # Codex / oh-my-codex 사용용
│  ├─ claude-code/                   # Claude Code plugin/skill용
│  ├─ cursor/                        # Cursor rules용
│  └─ opencode/                      # OpenCode/Gemini류 범용 CLI용
├─ templates/
│  ├─ project/                       # 새 프로젝트에 복사할 기본 파일
│  ├─ ai-index/                      # AI_INDEX 세부 템플릿
│  └─ reports/                       # audit/maintenance report 템플릿
├─ scripts/
│  ├─ joo-indexing-scan.mjs          # dependency 없는 repo 구조 scan + map shard/file-map 생성
│  ├─ joo-indexing-validate.mjs      # stale path/source header/security-looking path 검증
│  ├─ joo-indexing-lookup.mjs        # exact path/keyword/intent lookup
│  ├─ joo-indexing-diff-check.mjs    # PR diff 기반 metadata 갱신 필요성 점검
│  ├─ joo-navigation-benchmark.mjs   # navigation benchmark case 측정
│  └─ joo-indexing-install.mjs       # project bootstrap 파일 복사
├─ docs/
│  ├─ skill-map.md
│  ├─ install-targets.md
│  ├─ borrowed-patterns.md
│  ├─ design-principles.md
│  └─ indexing-shards.md
└─ examples/
   └─ react-fsd-monorepo/
```

## Quick Start

### 1. 이 repo를 clone

```bash
git clone https://github.com/pep-pearl/joo-skills.git
```

### 2. 대상 프로젝트에서 bootstrap

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target .
```

생성되는 기본 파일:

```txt
AI_INDEX.md
AGENTS.md
rules/context-navigation.md
rules/ai-navigation-maintenance.md
.ai/indexing/README.md
.github/pull_request_template.md
.ai/indexing/benchmarks/navigation-cases.example.json
```

### 3. 대상 프로젝트에서 scan

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing --respect-gitignore --respect-ai-ignore --deny-sensitive-paths
```

생성되는 후보 파일:

```txt
.ai/indexing/AI_INDEX.candidate.md
.ai/indexing/indexing-report.json
.ai/indexing/file-map.candidate.json
.ai/indexing/file-hints.candidate.md
.ai/indexing/source-header-exceptions.md
.ai/indexing/manifest.json
.ai/indexing/maps/root.md
.ai/indexing/maps/routes.md
.ai/indexing/maps/api.md
.ai/indexing/maps/state.md
.ai/indexing/maps/packages.md
.ai/indexing/maps/domains/*.md
```

map shard 생성을 끄고 기존 후보 파일만 만들고 싶으면:

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing --respect-gitignore --respect-ai-ignore --deny-sensitive-paths --no-maps
```

민감 경로와 generated 파일을 더 보수적으로 다루고 싶으면:

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --respect-gitignore \
  --respect-ai-ignore \
  --deny-sensitive-paths \
  --max-total-files 3000
```

변경분 중심으로 refresh 후보를 만들고 싶으면:

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --respect-gitignore \
  --respect-ai-ignore \
  --deny-sensitive-paths \
  --changed-since main
```

### 3-1. index 검증

AI가 토큰으로 stale path를 추론하기 전에, 가능한 검증은 스크립트로 먼저 처리합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps
```

CI에서 실패시키고 싶으면 기본 모드를 쓰고, 로컬에서 경고만 보고 싶으면 `--warn-only`를 붙입니다.

### 3-2. 작은 lookup / diff guard / benchmark

Exact path나 keyword만 확인할 때는 map shard 전체를 읽지 말고 lookup을 먼저 사용합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword "order detail"
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --path src/pages/orders/detail.tsx
```

PR에서 source 구조가 바뀌었는데 metadata를 갱신하지 않았는지 확인합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
```

대표 navigation case를 저장해두면 index 품질 회귀를 수치로 확인할 수 있습니다.

```bash
node /path/to/joo-skills/scripts/joo-navigation-benchmark.mjs --target . --cases .ai/indexing/benchmarks/navigation-cases.json
```

### 4. AI에게 명령

```txt
/indexing init

Read .ai/indexing/AI_INDEX.candidate.md, manifest.json, maps/root.md, and file-hints.candidate.md.
Create or update AI_INDEX.md as a router.
Keep detailed file maps in .ai/indexing/maps/*.
Do not full-scan the repo. Follow the joo-skills repo-indexing skill.
```

## Runtime Navigation Rule

평소 개발 작업에서는 다음 순서를 기본으로 합니다.

```txt
exact files from user
-> project/team safety rules
-> rules/context-navigation.md
-> AI_INDEX.md
-> at most one .ai/indexing/maps/* shard
-> source file
-> imports
-> companion shard only when coupling signal exists
-> tests if behavior matters
-> targeted search only when blocked
```

## Philosophy

- Full repo scan is a failure mode, not a default.
- Index is a navigation adapter, not architecture documentation.
- `AI_INDEX.md` is a router, not a file tree.
- File maps are sharded and optional.
- Source-level `@ai-*` headers are disabled by default; sidecar file hints live in `.ai/indexing/maps/*` and `file-map.candidate.json`.
- Scripts produce candidates; AI makes judgment.
- Every code change should briefly decide whether navigation metadata became stale.


## Cheap Escalation

기본은 map shard 0-1개입니다. 하지만 다음 결합 신호가 있으면 companion shard 1개까지 추가로 읽을 수 있습니다.

- route + auth/permission/session
- route + query/mutation/cache
- UI bug + theme/style/token/responsive
- form + validation/API error
- disabled/loading/error state
- stale data/cache/invalidation
- feature flag/experiment
- i18n/date/timezone/locale
- generated client/schema mismatch

Hard cap before edit:

- map shards: max 2
- source files: max 5
- broad search: exact file, index, import-following이 모두 막힌 뒤에만


## Sidecar File Hints

소스 파일에는 기본적으로 `@ai-*` 주석을 넣지 않습니다. `max-lines` lint, 리뷰 노이즈, stale comment 문제를 피하기 위해 파일 단위 AI metadata는 sidecar map에 둡니다.

```txt
.ai/indexing/maps/routes.md
.ai/indexing/maps/api.md
.ai/indexing/maps/state.md
.ai/indexing/maps/domains/<domain>.md
.ai/indexing/file-map.candidate.json
```

Exact file이 주어졌을 때는 map 전체를 읽지 말고, 해당 path만 lookup합니다. Source header가 필요한 팀은 `--source-headers`를 명시적으로 켜야 하며, strict max-lines 프로젝트에서는 사용하지 않습니다.

## Borrowed Open-Source Patterns

이 workflow는 구현 코드를 복사하지 않고, 방향이 맞는 공개 도구의 패턴만 흡수합니다.

- Aider: repo map은 token budget 안에서 관련 부분만 담는 것이 중요합니다. 이 repo는 `--max-map-tokens`와 shard별 token budget으로 반영합니다.
- Repomix: `.gitignore`/ignore 파일 존중, security-looking path 제외, token count가 중요합니다. 이 repo는 `--respect-gitignore`, `--respect-ai-ignore`, `--deny-sensitive-paths`, token estimate를 반영합니다.
- Continue/Sourcegraph: context는 명시적으로 추가·필터링되어야 합니다. 이 repo는 exact path lookup, shard read cap, generated/sensitive exclusion을 기본 정책으로 둡니다.

## Metadata Trust

`AI_INDEX.md`, map shard, sidecar file hint, optional source-header exception은 truth가 아니라 navigation hint입니다.

Trust order:

1. user-provided exact file
2. project/team safety rules
3. source/imports/tests
4. `AI_INDEX.md`
5. map shards
6. generated candidates

source/import/test가 metadata와 충돌하면 source가 이깁니다. 이 경우 metadata를 억지로 따르지 말고 stale로 보고합니다.

## When Not To Use This Workflow

This workflow is optimized for token-efficient AI navigation in medium or large repositories.

It is not a full architecture documentation system, security audit tool, or replacement for project ownership rules.

Do not use this workflow as the primary navigation method in the following cases.

### 1. Security-critical or highly regulated repositories

Avoid this workflow when path names, domain names, route names, or package names are sensitive.

The scanner produces metadata from repository structure. Even when source file contents are not copied, generated index files may expose sensitive project shape.

Use a stricter internal indexing process instead.

### 2. Repositories without stable structure

Avoid this workflow when the project is in early rewrite, migration, or large-scale restructuring.

The index is useful only when routes, domains, packages, API boundaries, and state ownership are stable enough to act as navigation hints.

If files move every day, the metadata will become stale faster than it helps.

### 3. Tasks that require whole-repository correctness

Do not rely on this workflow alone for:

- security review
- license review
- dependency migration
- framework migration
- naming convention migration
- dead code removal
- public API breaking-change analysis
- large refactors across many packages

For these tasks, targeted navigation is not enough. Use dedicated repo-wide analysis tools.

### 4. Repositories dominated by generated code

Avoid using generated files as map entries.

Generated clients, snapshots, build outputs, compiled assets, route outputs, and schema dumps should usually be excluded from AI maps.

Index the human-owned boundary around generated code instead.

### 5. Projects that do not match the selected navigation skill

Do not apply FSD navigation rules to non-FSD projects. Use `skills/frontend-next-app-navigation/SKILL.md` for Next.js App Router projects.

For example, do not force the `app -> pages -> widgets -> features -> entities -> shared` reading order onto:

- Next.js App Router projects
- Remix route-module projects
- TanStack Router file-route projects
- vertical-slice monorepos
- package-owned domain architectures

Use the generic repo navigation skill or create a framework-specific adapter.

### 6. When exact user-provided files conflict with the index

Exact files from the user always beat the index.

If the user names a file, start there. Use `AI_INDEX.md` only as a supporting router.

If source imports contradict map metadata, trust the source and report stale metadata.

### 7. When metadata appears stale or misleading

Do not keep following the index when:

- referenced files no longer exist
- route/page ownership changed
- API clients moved
- state ownership changed
- map shards point to generated or obsolete files
- `AI_INDEX.md` became a large file tree instead of a router

In these cases, stop and run an index refresh or report the stale metadata.

### 8. When the project already has stronger local rules

This workflow must not override project-specific rules.

Security rules, generated-code rules, ownership rules, test requirements, and team `AGENTS.md` instructions take priority over AI navigation metadata.

### Recommended fallback

When this workflow does not fit, use this safer order:

```txt
exact files from user
-> nearest project/team rules
-> failing test or error output
-> source imports
-> targeted search
-> broader repository analysis only when required
```

The index is a disposable navigation hint, not the source of truth.
