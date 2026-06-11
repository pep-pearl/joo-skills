# joo-skills

개인용 AI workflow / agent skill 아카이브입니다.

`joo-code`가 복붙 가능한 코드 kit을 모으는 저장소라면, `joo-skills`는 매 프로젝트마다 반복해서 쓰는 AI 작업 방식, repo indexing, `AGENTS.md`/rules 템플릿, harness별 어댑터를 모으는 저장소입니다.

이 repo는 두 가지 방식으로 쓸 수 있습니다.

1. **AI agent에게 skill처럼 사용하게 하기**: `/indexing init`, `/indexing audit` 같은 명령을 AI에게 주고, AI가 필요한 파일만 읽으며 metadata를 생성/갱신합니다.
2. **사용자가 직접 CLI로 실행하기**: `scripts/*.mjs`를 터미널에서 실행해 scan, lookup, validate, diff-check, benchmark를 직접 돌립니다.

## Core Idea

AI가 새 프로젝트를 만났을 때 바로 전체 repo를 훑지 않고, 먼저 작은 navigation router를 읽고, 필요한 경우에만 작게 쪼갠 map shard 하나를 읽게 합니다.

```txt
/indexing init      -> 프로젝트 구조를 읽고 router + map shard 후보 생성
/indexing annotate  -> source 수정 없이 sidecar file hint 후보 생성
/indexing audit     -> AI_INDEX / manifest / maps / file hints 불일치 점검
/indexing refresh   -> routes/domains/api/state/packages 등 변경 영역만 갱신
```

`AI_INDEX.md`와 `.ai/indexing/maps/*`는 architecture 문서가 아니라 **AI가 다음에 읽을 파일을 고르는 disposable navigation hint**입니다. 실제 truth는 항상 source, import, test, runtime behavior입니다.

## When To Use

이 도구가 특히 유용한 경우:

- 새 프로젝트에 AI를 투입하기 전에 “어디부터 읽어야 하는지” router를 만들고 싶을 때
- repo가 커서 AI가 매번 full scan하거나, 엉뚱한 파일부터 읽는 비용을 줄이고 싶을 때
- route/API/state/package/domain 구조가 바뀐 PR에서 AI navigation metadata도 같이 갱신해야 하는지 확인하고 싶을 때
- “주문 상세 화면 고쳐줘”처럼 자연어 요청이 들어왔을 때, 가장 작은 first-read 파일 후보를 빠르게 찾고 싶을 때
- 반복되는 failure triage나 screen/API 작업에서 agent가 같은 실수를 반복하지 않게 하고 싶을 때

굳이 쓰지 않아도 되는 경우:

- 파일 수가 적고 진입점이 명확한 작은 repo
- 한두 파일만 고치는 단순 수정
- index를 최신 상태로 유지할 사람이 전혀 없는 repo
- source보다 metadata를 더 신뢰하게 만드는 방식의 문서화

## Repository Structure

```txt
.
├─ skills/
│  ├─ repo-indexing/                 # /indexing 계열 핵심 스킬
│  ├─ repo-navigation/               # 최소 파일 읽기 / intent classification / import-following
│  ├─ failure-triage/                # 에러 로그 기반 임시 라우팅 / known failure 승격 기준
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
│  ├─ joo-indexing-install.mjs       # 대상 프로젝트 bootstrap 파일 복사
│  ├─ joo-indexing-scan.mjs          # repo 구조 scan + candidate/map shard 생성
│  ├─ joo-indexing-validate.mjs      # stale path/source header/security-looking path 검증
│  ├─ joo-indexing-lookup.mjs        # exact path/keyword/intent lookup
│  ├─ joo-indexing-diff-check.mjs    # PR diff 기반 metadata 갱신 필요성 점검
│  └─ joo-navigation-benchmark.mjs   # navigation benchmark case 측정
├─ docs/
│  ├─ skill-map.md
│  ├─ install-targets.md
│  ├─ borrowed-patterns.md
│  ├─ design-principles.md
│  └─ indexing-shards.md
└─ examples/
   └─ react-fsd-monorepo/
```

## Quick Start: 사용자가 직접 실행하기

전제: Node.js가 필요합니다. 이 repo의 스크립트는 dependency 없는 `.mjs` 스크립트로 구성되어 있습니다.

### 1. 이 repo를 clone

```bash
git clone https://github.com/pep-pearl/joo-skills.git
```

아래 예시에서 `/path/to/joo-skills`는 clone한 이 repo의 경로입니다.

### 2. 대상 프로젝트에 bootstrap 파일 설치

대상 프로젝트 root에서 실행합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target .
```

기본적으로 기존 파일은 덮어쓰지 않습니다. 다시 생성하거나 갱신해야 하면 `--force`를 붙입니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target . --force
```

생성되는 기본 파일:

```txt
AI_INDEX.md
AGENTS.md
rules/context-navigation.md
rules/ai-navigation-maintenance.md
rules/failure-triage.md
.ai/indexing/README.md
.github/pull_request_template.md
.ai/indexing/benchmarks/navigation-cases.example.json
```

### 3. repo scan으로 candidate 생성

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --respect-gitignore \
  --respect-ai-ignore \
  --deny-sensitive-paths
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

이 단계는 source runtime logic을 고치지 않습니다. 생성된 candidate를 사람이 리뷰하거나 AI에게 “candidate를 보고 `AI_INDEX.md` router로 정리해줘”라고 맡기면 됩니다.

### 4. index 검증

AI가 토큰으로 stale path를 추론하기 전에, 가능한 검증은 스크립트로 먼저 처리합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps
```

로컬에서 경고만 보고 싶으면 `--warn-only`를 붙입니다. CI에서 실패시키고 싶으면 `--warn-only`를 빼면 됩니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps \
  --warn-only
```

### 5. 작은 lookup으로 다음에 읽을 파일 찾기

Exact path나 keyword만 확인할 때는 map shard 전체를 읽지 말고 lookup을 먼저 사용합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword "order detail"
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --path src/pages/orders/detail.tsx
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --intent route-page --domain order --limit 5
```

JSON이 필요하면 `--json`을 붙입니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword "order detail" --json
```

## Quick Start: AI에게 맡기기

사람이 직접 scan까지 만든 뒤, AI에게 다음처럼 시킬 수 있습니다.

```txt
/indexing init

Read .ai/indexing/AI_INDEX.candidate.md, manifest.json, maps/root.md, and file-hints.candidate.md.
Create or update AI_INDEX.md as a router.
Keep detailed file maps in .ai/indexing/maps/*.
Do not full-scan the repo. Follow the joo-skills repo-indexing skill.
```

이미 `AI_INDEX.md`가 있고 구조 변경 후 갱신만 필요하면:

```txt
/indexing refresh

Only update stale navigation metadata affected by the current diff.
Prefer small patches to AI_INDEX.md and affected map shards.
Do not rewrite unrelated sections.
```

오류가 있는 상황에서는 index보다 error anchor가 우선입니다.

```txt
Use failure-triage first.
Start from the exact failing file/line/test/userland stack.
Only use AI_INDEX.md if the error anchor is not enough.
```

## Command Guide: AI slash commands

이 명령들은 터미널 명령이 아니라, Codex/Claude Code/Cursor/OpenCode 같은 coding agent에게 주는 작업 지시어입니다.

| Command | 무엇을 하는가 | 언제 쓰면 좋은가 | 기대 결과 |
| --- | --- | --- | --- |
| `/indexing init` | 현재 repo의 AI navigation metadata를 처음 만들거나 큰 틀을 갱신합니다. `AI_INDEX.md`, manifest, map shards, rules, sidecar hint 후보를 정리합니다. | 새 프로젝트를 AI가 읽기 전에, 또는 기존 index가 없을 때 | 작은 router 역할의 `AI_INDEX.md`, `.ai/indexing/maps/*`, 유지보수 rules |
| `/indexing annotate` | source 파일을 직접 수정하지 않고 sidecar file hint를 추가/갱신합니다. | 중요한 entry 파일의 역할, domain, related file을 AI가 자주 놓칠 때 | `.ai/indexing/file-map.candidate.json`, `file-hints.candidate.md` 갱신 후보 |
| `/indexing audit` | `AI_INDEX.md`, manifest, maps, file hints가 stale인지 점검합니다. 기본은 읽기/리포트만 합니다. | PR 리뷰 전, 경로 이동 후, AI가 엉뚱한 shard를 읽기 시작할 때 | stale path, missing shard, oversized router, sensitive/generated-looking reference 보고 |
| `/indexing refresh` | 바뀐 영역만 작게 갱신합니다. 전체 rewrite보다 affected shard patch를 선호합니다. | route/API/state/package/domain 구조가 바뀐 뒤 | `AI_INDEX.md` 또는 관련 map shard의 최소 수정 |
| `/indexing explain` | 현재 navigation metadata의 사용법을 사람에게 설명합니다. | 팀원에게 이 repo의 AI_INDEX 운영 방식을 공유할 때 | router, map shard, fallback, first-read 규칙 설명 |
| `/lookup path` | 특정 파일 경로가 metadata에서 어떻게 잡히는지 찾습니다. | 파일 하나를 기준으로 관련 shard나 related file을 빠르게 확인할 때 | 가장 작은 next-read 후보 목록 |
| `/lookup keyword` | keyword, intent, domain으로 metadata를 검색합니다. | “주문 상세”, “auth guard”, “API client”처럼 자연어 힌트만 있을 때 | score가 높은 후보 파일과 관련 shard |
| `/diff-check` | 변경된 source가 metadata 갱신을 요구하는지 확인합니다. | PR에서 `AI_INDEX.md`/maps 갱신 누락을 잡고 싶을 때 | routes/api/state/packages/domain별 갱신 필요 경고 |
| `/benchmark navigation` | 저장된 navigation case로 lookup 품질을 측정합니다. | index 구조를 바꾼 뒤 회귀가 생겼는지 보고 싶을 때 | pass/warn/fail, first hit position, average score |

## Command Guide: 사용자가 직접 실행하는 Node scripts

아래 명령은 터미널에서 직접 실행하는 CLI입니다.

### `joo-indexing-install.mjs`

대상 프로젝트에 AI navigation 운영에 필요한 기본 파일을 복사합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target .
```

좋은 사용 시점:

- 프로젝트에 `AI_INDEX.md`, `AGENTS.md`, navigation rules를 처음 넣을 때
- 팀 공통 AI 작업 규칙을 bootstrap하고 싶을 때
- `.ai/indexing/benchmarks` 예시 파일까지 한 번에 만들고 싶을 때

주요 옵션:

| Option | 의미 |
| --- | --- |
| `--target <dir>` | 파일을 설치할 대상 프로젝트 root |
| `--force` | 기존 파일도 덮어쓰기 |

### `joo-indexing-scan.mjs`

대상 repo를 훑어 `AI_INDEX.candidate.md`, manifest, map shards, file-map 후보를 생성합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --respect-gitignore \
  --respect-ai-ignore \
  --deny-sensitive-paths \
  --max-map-tokens 1600
```

좋은 사용 시점:

- 처음 index를 만들 때
- 큰 폴더 이동이나 route/API/state 구조 변경 뒤
- AI에게 맡기기 전에 candidate 자료를 먼저 만들고 싶을 때
- 민감 경로나 generated 파일을 사람이 먼저 걸러보고 싶을 때

자주 쓰는 옵션:

| Option | 의미 | 언제 쓰나 |
| --- | --- | --- |
| `--target <dir>` | scan 대상 repo | 항상 명시 권장 |
| `--out <dir>` | candidate 출력 위치 | 보통 `.ai/indexing` |
| `--respect-gitignore` | `.gitignore` 기준 제외 | 일반적인 프로젝트 scan |
| `--respect-ai-ignore` | `.aiignore` 기준 제외 | AI에게 숨길 파일이 있을 때 |
| `--deny-sensitive-paths` | secret/env/key처럼 보이는 경로 제외 | 외부 AI 도구와 함께 쓸 때 특히 권장 |
| `--include-generated` | generated-looking 파일도 포함 | generated boundary 자체가 중요한 repo에서만 |
| `--no-maps` | map shard 생성 없이 candidate 중심 출력 | map을 아직 만들지 않고 보고서만 보고 싶을 때 |
| `--changed-since <ref>` | 변경 파일 중심 candidate 생성 | PR branch에서 `main` 대비 갱신할 때 |
| `--max-total-files <n>` | scan 대상 파일 수 상한 | 대형 repo에서 비용 제한 |
| `--max-map-tokens <n>` | shard별 대략적인 token 상한 | AI가 읽을 map을 작게 유지하고 싶을 때 |
| `--max-domain-maps <n>` | domain shard 생성 개수 제한 | domain이 너무 많이 쪼개질 때 |
| `--exclude <glob>` | 추가 제외 패턴 | 특정 vendor/cache 폴더 제외 |
| `--source-headers` | source-level `@ai-*` header 후보 허용 | source에 직접 AI hint를 남기기로 팀이 합의한 경우만 |

### `joo-indexing-validate.mjs`

현재 metadata가 너무 커졌거나, 사라진 path를 참조하거나, generated/sensitive-looking path를 포함하는지 검사합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps \
  --warn-only
```

좋은 사용 시점:

- PR 올리기 전
- `AI_INDEX.md`를 사람이 직접 고친 뒤
- AI가 stale metadata를 기준으로 잘못된 파일을 읽는 것 같을 때
- CI guardrail로 metadata 품질을 확인하고 싶을 때

자주 쓰는 옵션:

| Option | 의미 |
| --- | --- |
| `--target <dir>` | 검증 대상 repo |
| `--index <file>` | 검증할 router 파일. 기본 `AI_INDEX.md` |
| `--maps <dir>` | map shard directory. 기본 `.ai/indexing/maps` |
| `--file-map <file>` | sidecar file map JSON 위치 |
| `--warn-only` | 실패 exit code 대신 경고만 출력 |
| `--max-ai-index-lines <n>` | router size 기준. 기본 160 lines |
| `--max-map-lines <n>` | shard size 기준. 기본 260 lines |
| `--source-headers` | source-level `@ai-*` header 사용을 허용하는 검증 모드 |

### `joo-indexing-lookup.mjs`

metadata에서 exact path, keyword, intent, domain을 검색해 “다음에 읽을 가능성이 높은 파일”을 찾습니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword "order detail" --limit 5
```

좋은 사용 시점:

- AI에게 맡기기 전에 사람이 직접 entry 후보를 찾고 싶을 때
- map shard 전체를 열지 않고 특정 keyword만 확인하고 싶을 때
- 자연어 요청을 route/API/state/domain 후보로 빠르게 좁히고 싶을 때

자주 쓰는 옵션:

| Option | 의미 |
| --- | --- |
| `--path <file>` | exact path 조회 |
| `--keyword <text>` | keyword 검색. 여러 번 사용 가능 |
| `--query <text>` | keyword와 동일한 단일 검색어 alias |
| `--intent <intent>` | `route-page`, `api`, `state`, `config`, `domain` 등 intent 힌트 |
| `--domain <name>` | domain shard나 domain-like path 힌트 |
| `--limit <n>` | 결과 개수 제한. 기본 10 |
| `--maps <dir>` | map shard directory 지정 |
| `--file-map <file>` | sidecar file map 지정 |
| `--json` | machine-readable JSON만 출력 |

### `joo-indexing-diff-check.mjs`

git diff나 명시한 변경 파일을 기준으로, source 변경에 비해 metadata 갱신이 누락됐는지 점검합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
```

좋은 사용 시점:

- PR에서 route/API/state/package/domain 구조 변경이 있었는지 자동 감지하고 싶을 때
- `AI_INDEX.md`나 map shard 갱신 누락을 리뷰 전에 잡고 싶을 때
- 처음에는 `--warn-only`로 운영하다가 안정되면 CI strict mode로 전환하고 싶을 때

자주 쓰는 옵션:

| Option | 의미 |
| --- | --- |
| `--target <dir>` | 점검 대상 repo |
| `--base <ref>` | 비교 기준 branch/ref. 기본 `main` |
| `--changed-since <ref>` | `--base` alias |
| `--changed-files <csv>` | git diff 대신 직접 파일 목록 전달 |
| `--maps <dir>` | map shard directory. 기본 `.ai/indexing/maps` |
| `--warn-only` | 경고만 출력하고 exit code 0 유지 |
| `--json` | machine-readable JSON만 출력 |

### `joo-navigation-benchmark.mjs`

대표 navigation case를 저장해두고 lookup 결과가 기대 entry file을 잘 찾는지 측정합니다.

```bash
node /path/to/joo-skills/scripts/joo-navigation-benchmark.mjs \
  --target . \
  --cases .ai/indexing/benchmarks/navigation-cases.json \
  --lookup-script /path/to/joo-skills/scripts/joo-indexing-lookup.mjs
```

좋은 사용 시점:

- `AI_INDEX.md`나 map shard 구조를 바꾼 뒤 품질 회귀를 확인할 때
- 팀에서 자주 하는 작업 요청을 benchmark case로 고정하고 싶을 때
- “AI가 처음 읽는 파일”이 실제로 좋아졌는지 수치로 보고 싶을 때

자주 쓰는 옵션:

| Option | 의미 |
| --- | --- |
| `--target <dir>` | benchmark 대상 repo |
| `--cases <file>` | navigation case JSON 파일 |
| `--lookup-script <file>` | 사용할 lookup script 경로 |
| `--maps <dir>` | map shard directory 지정 |
| `--file-map <file>` | sidecar file map 지정 |
| `--top-n <n>` | 상위 몇 개 결과 안에 expected file이 있어야 하는지 기준. 기본 5 |
| `--json` | machine-readable JSON만 출력 |

## NPM Scripts

`package.json`에도 shorthand가 있습니다.

```bash
npm run scan
npm run validate:index
npm run validate:index:strict
npm run refresh:changed
npm run lookup -- --keyword "order detail"
npm run diff-check
npm run diff-check:strict
npm run benchmark:navigation
```

주의할 점:

- 이 npm scripts는 기본적으로 `--target .`을 사용합니다.
- `joo-skills` repo 자체를 검사할 때는 그대로 쓰면 됩니다.
- 다른 대상 프로젝트를 검사하려면 대상 프로젝트에 scripts를 복사했거나, 위의 `node /path/to/joo-skills/scripts/*.mjs --target <project>` 형태를 권장합니다.

## Common Workflows

### 1. 새 프로젝트를 AI-friendly하게 만들기

```bash
cd /path/to/target-project
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target .
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --respect-gitignore \
  --respect-ai-ignore \
  --deny-sensitive-paths
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps \
  --warn-only
```

그 다음 AI에게:

```txt
/indexing init

Use the generated candidates in .ai/indexing.
Create a compact AI_INDEX.md router.
Keep detailed maps under .ai/indexing/maps/*.
```

### 2. PR에서 metadata 갱신 누락 확인하기

```bash
node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
```

경고가 나오면 AI에게:

```txt
/indexing refresh

Use the diff-check output.
Update only the affected AI_INDEX.md section and map shards.
```

### 3. 자연어 요청의 entry file만 빠르게 찾기

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs \
  --target . \
  --keyword "order detail" \
  --intent route-page \
  --limit 5
```

lookup 결과는 truth가 아니라 next-read hint입니다. 실제 수정 전에는 반드시 source/import/test로 확인합니다.

### 4. route/API/state 구조가 바뀐 뒤 refresh 후보 만들기

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --respect-gitignore \
  --respect-ai-ignore \
  --deny-sensitive-paths \
  --changed-since main
```

그 다음 사람이 candidate diff를 보거나, AI에게 affected shard만 갱신하도록 시킵니다.

### 5. navigation 품질 회귀 확인하기

`.ai/indexing/benchmarks/navigation-cases.json`에 대표 요청과 기대 entry files를 저장한 뒤 실행합니다.

```bash
node /path/to/joo-skills/scripts/joo-navigation-benchmark.mjs \
  --target . \
  --cases .ai/indexing/benchmarks/navigation-cases.json \
  --lookup-script /path/to/joo-skills/scripts/joo-indexing-lookup.mjs \
  --top-n 5
```

## Output Files: 무엇을 어떻게 읽어야 하나

| File | 역할 | 사람이 볼 때 |
| --- | --- | --- |
| `AI_INDEX.md` | 가장 먼저 읽는 작은 router | 길어지면 실패 신호입니다. 상세 tree가 아니라 어느 shard/file로 갈지 알려줘야 합니다. |
| `.ai/indexing/AI_INDEX.candidate.md` | scan 결과로 만든 router 후보 | 그대로 복붙하기보다 사람이/AI가 compact하게 정리합니다. |
| `.ai/indexing/manifest.json` | scan summary와 shard 목록 | scan 범위, mode, 파일 수, warnings를 확인합니다. |
| `.ai/indexing/maps/root.md` | 모호한 요청의 top-level fallback | 자연어/기획식 요청이 route/API/state로 안 좁혀질 때만 봅니다. |
| `.ai/indexing/maps/routes.md` | route/page/screen 시작점 | 화면, URL, navigation, layout 작업에서 봅니다. |
| `.ai/indexing/maps/api.md` | API/query/client/OpenAPI 시작점 | backend 연동, query/mutation, generated client 경계 확인 때 봅니다. |
| `.ai/indexing/maps/state.md` | store/cache/session 시작점 | auth/session/cache/global state 작업에서 봅니다. |
| `.ai/indexing/maps/packages.md` | package/workspace/build/test config 시작점 | dependency, build, lint, test, monorepo 설정 변경 때 봅니다. |
| `.ai/indexing/maps/domains/*.md` | domain별 compact map | 요청이 특정 domain으로 좁혀졌을 때만 1개 정도 봅니다. |
| `.ai/indexing/file-map.candidate.json` | sidecar file hints | lookup/benchmark의 검색 재료입니다. source truth가 아닙니다. |
| `.ai/indexing/file-hints.candidate.md` | 사람이 읽기 쉬운 file hint 후보 | 중요한 파일 설명을 sidecar로 남길지 리뷰합니다. |
| `.ai/indexing/indexing-report.json` | scan 상세 보고서 | generated/sensitive/truncated 경고와 후보 분류를 확인합니다. |

## Runtime Navigation Rule

평소 개발 작업에서는 다음 순서를 기본으로 합니다.

```txt
exact files from user
-> project/team safety rules
-> rules/context-navigation.md
-> error log / failing command, when present
-> exact error anchor: file/line/test/userland stack
-> AI_INDEX.md
-> at most one .ai/indexing/maps/* shard
-> source file
-> imports
-> companion shard only when coupling signal exists
-> tests if behavior matters
-> targeted search only when blocked
```

## Direction

- `AI_INDEX.md`는 architecture 문서가 아니라 작은 router입니다.
- 상세 파일 매핑은 `.ai/indexing/maps/*`에 shard로 나눕니다.
- 평소 작업에서는 map shard를 최대 1개만 읽고, 이후에는 import-following을 우선합니다.
- 단, route/API/state/style/auth처럼 결합 신호가 있으면 companion shard 1개까지만 싸게 승급합니다.
- 자연어/기획/디자인식 요청이 모호할 때만 `maps/root.md`에서 시작합니다.
- scripts는 후보를 만들고, AI는 필요한 조각만 판단해서 사용합니다.
- index와 map은 truth가 아니라 disposable navigation hint입니다. source/import/test가 더 우선합니다.
- 에러 로그가 있으면 index보다 에러 anchor(file/line/test/userland stack)를 먼저 라우터로 씁니다.
- 반복 에러는 error code가 아니라 root cause 기준으로만 known failure pattern으로 승격합니다.
- metadata가 stale이면 source를 metadata에 맞추지 않고, source 기준으로 작업한 뒤 affected metadata만 고칩니다.

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

## Safety / Guardrails

- Full repo scan은 기본값이 아니라 마지막 수단입니다.
- `--deny-sensitive-paths`와 `.aiignore`를 적극적으로 사용합니다.
- generated client/schema 전체를 first-read로 두지 않습니다. 필요한 operation/type boundary만 봅니다.
- source-level `@ai-*` headers는 기본 비활성입니다. 기본은 sidecar hint입니다.
- metadata가 source와 충돌하면 source가 이깁니다.
- `AI_INDEX.md`가 너무 길어지면 map shard로 내립니다.
- candidate는 자동 정답이 아니라 리뷰 대상입니다.
- 외부 AI 도구에 공유하기 전에 `.env`, key, credential, private config가 metadata에 들어가지 않았는지 validate합니다.

## Philosophy

- Full repo scan is a failure mode, not a default.
- Index is a navigation adapter, not architecture documentation.
- `AI_INDEX.md` is a router, not a file tree.
- File maps are sharded and optional.
- Source-level `@ai-*` headers are disabled by default; sidecar file hints live in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`.
- Scripts produce candidates; AI makes judgment.
- Every code change should briefly decide whether navigation metadata became stale.
