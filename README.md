# joo-skills

개인용 AI workflow / agent skill 아카이브입니다.

`joo-code`가 복붙 가능한 코드 kit을 모으는 저장소라면, `joo-skills`는 매 프로젝트마다 반복해서 쓰는 AI 작업 방식, repo indexing, `AGENTS.md`/rules 템플릿, harness별 어댑터를 모으는 저장소입니다.

이 repo는 두 가지 방식으로 쓸 수 있습니다.

1. **AI agent에게 skill처럼 사용하게 하기**: `/indexing init`, `/indexing audit` 같은 명령을 AI에게 주고, AI가 필요한 파일만 읽으며 metadata를 생성/갱신합니다.
2. **사용자가 직접 CLI로 실행하기**: `scripts/*.mjs`를 터미널에서 실행해 scan, lookup, validate, diff impact, diff-check, benchmark를 직접 돌립니다.

## Core Idea

AI가 새 프로젝트를 만났을 때 바로 전체 repo를 훑지 않고, 먼저 작은 navigation router를 읽고, 필요한 경우에만 작게 쪼갠 map shard 하나를 읽게 합니다.

```txt
/indexing init      -> 프로젝트 구조를 읽고 router + map shard 후보 생성
/indexing annotate  -> source 수정 없이 sidecar file hint 후보 생성
/indexing audit     -> AI_INDEX / manifest / maps / file hints 불일치 점검
/indexing refresh   -> routes/domains/api/state/packages 등 변경 영역만 갱신
/diff impact        -> 이미 변경된 diff에서 read next / skip / metadata shard 판정
/diff review        -> changed files + direct imports + matching tests 중심 리뷰
/diff fix-plan      -> 기존 diff를 고치기 위한 최소 수정 계획
/feedback review     -> 검증된 사용자 정정을 임시 incident와 advisory lesson 후보로 정리
/feedback promote    -> 반복·고비용 후보의 승격/폐기/재검증 검토
```

`AI_INDEX.md`와 `.ai/indexing/maps/*`는 architecture 문서가 아니라 **AI가 다음에 읽을 파일을 고르는 disposable navigation hint**입니다. 실제 truth는 항상 source, import, test, runtime behavior입니다.

## Weak-Agent Runtime Contract

대상 프로젝트에 설치되는 `AGENTS.md`와 `rules/context-navigation.md`의 최상단에는 짧은 runtime contract가 들어갑니다. 핵심은 다음입니다.

```txt
exact files / changed files / error anchors beat AI_INDEX
run npm run diff:impact for existing changes; fallback to changed files directly
read at most one map shard before source
after source is found, follow imports/callers/tests
source/imports/tests beat metadata
no full repo scan by default; if unavoidable, scan filenames before contents
```

이 짧은 계약은 약한 agent가 긴 skill 문서를 다 읽기 전에 먼저 따라야 하는 hard guardrail입니다.

## When To Use

이 도구가 특히 유용한 경우:

- 새 프로젝트에 AI를 투입하기 전에 “어디부터 읽어야 하는지” router를 만들고 싶을 때
- repo가 커서 AI가 매번 full scan하거나, 엉뚱한 파일부터 읽는 비용을 줄이고 싶을 때
- 이미 변경된 PR/staged diff에서 영향 범위, 읽을 파일, metadata 갱신 shard를 작게 판정하고 싶을 때
- route/API/state/package/domain 구조가 바뀐 PR에서 AI navigation metadata도 같이 갱신해야 하는지 확인하고 싶을 때
- “주문 상세 화면 고쳐줘”처럼 자연어 요청이 들어왔을 때, 가장 작은 first-read 파일 후보를 빠르게 찾고 싶을 때
- 반복되는 failure triage나 screen/API 작업에서 agent가 같은 실수를 반복하지 않게 하고 싶을 때
- 사용자 정정이 반복되지만 감정·사과문이 아니라 검증된 future-task 교훈으로만 남기고 싶을 때

굳이 쓰지 않아도 되는 경우:

- 파일 수가 적고 진입점이 명확한 작은 repo
- 한두 파일만 고치는 단순 수정
- 단순 불만·욕설을 장기 학습 신호로 저장하려는 경우
- index를 최신 상태로 유지할 사람이 전혀 없는 repo
- source보다 metadata를 더 신뢰하게 만드는 방식의 문서화

## Repository Structure

```txt
.
├─ AGENTS.md                         # 모델 지정 벤치 요청 자동 라우팅
├─ skills/
│  ├─ repo-indexing/                 # /indexing 계열 핵심 스킬
│  ├─ repo-navigation/               # 최소 파일 읽기 / intent classification / import-following
│  ├─ pr-diff-impact/                # PR/diff/staged 변경 기반 영향 범위 / review / fix-plan
│  ├─ failure-triage/                # 에러 로그 기반 임시 라우팅 / known failure 승격 기준
│  ├─ feedback-compound/             # 사용자 정정 검증 / 현재 수정 / future advisory lesson 후보
│  ├─ ai-metadata-maintenance/       # AI_INDEX, map shards, sidecar file hints 유지보수
│  ├─ frontend-fsd-navigation/       # FE/FSD/React Router 탐색
│  ├─ frontend-next-app-navigation/  # Next.js App Router 탐색
│  ├─ screen-spec-alignment/         # 화면설계서 기반 구현/감사
│  ├─ api-integration-planning/      # Swagger/OpenAPI ↔ FE 연결 계획
│  ├─ navigation-benchmark/          # 모델 지정 navigation A/B 벤치 실행 계약
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
│  ├─ joo-indexing-scan.mjs          # adaptive scan + budgeted priority eviction
│  ├─ joo-indexing-assess.mjs        # Level 0~3 필요성 평가
│  ├─ joo-indexing-observe.mjs       # 로컬 사용/오류/ROI 신호 기록
│  ├─ lib/joo-indexing-budget.mjs    # profile, priority, retention, eviction
│  ├─ joo-indexing-validate.mjs      # stale path/source header/security-looking path 검증
│  ├─ joo-indexing-lookup.mjs        # exact path/keyword/intent lookup
│  ├─ joo-diff-impact.mjs            # PR/diff/staged 기반 영향 범위와 read plan
│  ├─ joo-indexing-diff-check.mjs    # PR diff 기반 metadata 갱신 필요성 점검
│  ├─ lib/joo-path-classifier.mjs    # diff/check 공통 path classifier
│  └─ joo-navigation-benchmark.mjs   # navigation benchmark case 측정
├─ benchmark/
│  ├─ prompt.md                      # “벤치마킹 해줘. 모델: …” 자동 실행 계약
│  ├─ token-navigation/              # isolated baseline/indexed fixture와 runner
│  └─ feedback-compound/             # baseline/skilled incident 판단 A/B runner
├─ docs/
│  ├─ skill-map.md
│  ├─ install-targets.md
│  ├─ borrowed-patterns.md
│  ├─ design-principles.md
│  ├─ feedback-compound-design.md
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
  --out .ai/indexing
```

기본 scan은 safe-by-default입니다. `.gitignore`, `.aiignore`/`.ignore`/`.repomixignore`를 존중하고, secret/env/key처럼 보이는 경로는 제외합니다. 신뢰된 로컬 repo에서만 `--no-respect-gitignore`, `--no-respect-ai-ignore`, `--allow-sensitive-paths`로 명시적으로 완화합니다.

생성되는 후보 파일:

```txt
.ai/indexing/assessment-report.json
.ai/indexing/AI_INDEX.candidate.md              # Level 1+
.ai/indexing/manifest.json                     # Level 2+
.ai/indexing/maps/*.md                         # 선택된 shard만, Level 2+
.ai/indexing/file-map.candidate.json           # byte-capped, Level 3
.ai/indexing/indexing-report.json              # maintenance summary
.ai/indexing/priority-state.json               # local stability state; runtime에서 읽지 않음
.ai/indexing/priority-report.json              # opt-in maintenance diagnostics
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
| `/diff impact` | changed files, staged files, PR diff를 기준으로 영향 범위와 읽을 파일을 고릅니다. | 이미 변경된 코드 리뷰/수정 전에 full scan을 막고 싶을 때 | `[DIFF_IMPACT]`, read next, skip, AI metadata required/maybe |
| `/diff review` | 변경 파일과 직접 import/matching test 중심으로 리뷰합니다. | PR 리뷰에서 unrelated shard를 읽지 않고 싶을 때 | review focus, targeted tests, stale metadata risk |
| `/diff fix-plan` | 기존 diff를 고치기 위한 최소 수정 계획을 만듭니다. | 이미 변경된 코드에서 무엇만 고칠지 정리할 때 | patch targets, verification, metadata decision |
| `/diff-check` | 변경된 source가 metadata 갱신을 요구하는지 확인합니다. | PR에서 `AI_INDEX.md`/maps 갱신 누락을 잡고 싶을 때 | routes/api/state/packages/domain별 갱신 필요 경고 |
| `/feedback review` | 명시적 사용자 정정이나 검증 가능한 지시/범위 위반을 현재 수정과 임시 incident로 정리합니다. | 사용자 정정이 실제 요구와 결과의 불일치인지 확인할 때 | correction, evidence, promotion=no/candidate, next-task isolation |
| `/feedback promote` | 기존 lesson 후보를 반복 root cause·환경 유효성·비용 기준으로 검토합니다. | candidate를 keep/revise/archive/supersede할 때 | promotion review, stale action, advisory-only decision |
| `/benchmark feedback` | baseline/skilled feedback 판단 A/B 벤치를 실행합니다. | skill이 오탐·과잉 승격 없이 개선되는지 볼 때 | `benchmark/feedback-compound/results/<timestamp>/report.md` |
| `/benchmark navigation` | 저장된 navigation case로 deterministic lookup 품질을 검사합니다. | index 구조를 바꾼 뒤 lookup 회귀를 확인할 때 | pass/warn/fail, first hit position, average score |
| `벤치마킹 해줘. 모델: <model>` | 합성 fixture의 baseline/indexed를 지정 모델로 A/B 실행합니다. | 실제 모델의 navigation 정확도·토큰·시간을 비교할 때 | `benchmark/token-navigation/results/<timestamp>/report.md` |

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
| `--with-feedback-compound` | 선택적으로 `rules/feedback-compound.md` 설치 |

### `joo-indexing-scan.mjs`

대상 repo를 훑어 `AI_INDEX.candidate.md`, manifest, map shards, file-map 후보를 생성합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --max-map-tokens 1600
```

Safe defaults are on: `.gitignore`, `.aiignore`/`.ignore`/`.repomixignore` are respected, `.ai/` is skipped, and sensitive-looking paths are denied unless explicitly allowed.

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
| `--no-respect-gitignore` | `.gitignore` 기준 제외를 끔 | 신뢰된 로컬 repo에서만 사용 |
| `--no-respect-ai-ignore` | `.aiignore`/`.ignore`/`.repomixignore` 기준 제외를 끔 | 숨김 규칙까지 재검토해야 할 때만 |
| `--allow-sensitive-paths` | secret/env/key처럼 보이는 경로 제외를 끔 | 외부 AI 공유 전 사람이 직접 리뷰할 때만 |
| `--respect-gitignore` / `--respect-ai-ignore` / `--deny-sensitive-paths` | backward-compatible no-op | 예전 명령어 호환용. 현재 기본값은 이미 안전 모드 |
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

### `joo-diff-impact.mjs`

git diff, staged files, or explicit changed files를 기준으로 영향 범위와 최소 read plan을 만듭니다.

```bash
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --staged
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main --review --include-imports
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main --fix-plan --include-imports
```

좋은 사용 시점:

- 이미 변경된 PR/staged diff의 영향 범위를 먼저 좁히고 싶을 때
- 변경 파일 주변, direct imports, matching tests만 읽고 리뷰하고 싶을 때
- `ai-metadata-maintenance` 전에 required/maybe/skip shard를 판정하고 싶을 때
- route/API/state/package/domain 변경이 섞인 PR에서 full shard refresh를 막고 싶을 때

자주 쓰는 옵션:

| Option | 의미 |
| --- | --- |
| `--target <dir>` | 점검 대상 repo |
| `--base <ref>` | 비교 기준 branch/ref. 기본 `main` |
| `--staged` | staged files 기준 |
| `--working` | working tree diff 기준 |
| `--changed-files <csv>` | git diff 대신 직접 파일 목록 전달 |
| `--review` | `[DIFF_REVIEW]` 출력 |
| `--fix-plan` | `[DIFF_FIX_PLAN]` 출력 |
| `--include-imports` | 변경 파일의 direct relative imports 후보 포함 |
| `--no-tests` | matching test 후보 생성을 끔 |
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

대표 navigation case를 저장해두고 lookup 결과가 기대 entry file을 잘 찾는지 결정론적으로 검사합니다. 이 명령은 모델을 호출하지 않고 token 절감률을 추정하지 않습니다.

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
npm run diff:impact
npm run diff:impact:staged
npm run diff:review
npm run diff:fix-plan
npm run diff-check
npm run diff-check:strict
npm run benchmark:navigation
npm run benchmark:feedback:check
npm run benchmark:feedback -- --runner codex --model "MODEL" --reasoning medium --repeat 3
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
  --out .ai/indexing
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

### 2. PR에서 영향 범위와 metadata 갱신 후보 확인하기

먼저 변경 파일 중심으로 읽을 범위를 좁힙니다.

```bash
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main
```

그 다음 metadata 갱신 누락 guard를 봅니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
```

`diff impact` 또는 `diff-check`에서 경고가 나오면 AI에게:

```txt
/indexing refresh

Use the diff impact and diff-check output.
Update only required/maybe AI_INDEX.md sections and affected map shards.
Skip shards marked skip by /diff impact.
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


## Verified Feedback Compound: 반성문이 아니라 증거 기반 future-task 학습

상세 설계는 [`docs/feedback-compound-design.md`](docs/feedback-compound-design.md), 실행 계약은 [`skills/feedback-compound/SKILL.md`](skills/feedback-compound/SKILL.md)에 있습니다.

핵심 원칙:

```txt
사용자 정정/지시 위반
-> expected vs actual 검증
-> 현재 작업부터 최소 수정
-> root cause는 기본 hypothesis
-> 반복·고비용·고위험일 때만 advisory candidate
-> 새 lesson은 다음 task부터
```

기본 설치에는 포함하지 않습니다. 대상 프로젝트가 필요할 때만:

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs \
  --target . \
  --with-feedback-compound
```

학습 강도는 `observe`, `advisory`, `promotion-review` 세 단계만 사용합니다. 러프한 프로젝트에서는 `observe`로 즉시 수정만 하고, 공용 API·다른 팀 ownership·운영·데이터·보안 경계는 어떤 모드에서도 느슨하게 만들지 않습니다.

자연어 lesson은 권한이 아니라 advisory hint입니다. 테스트, lint, schema, CI, permission 같은 executable control로 별도 승격되기 전에는 작업을 차단하지 않습니다.

피드백 벤치:

```bash
npm run benchmark:feedback:doctor -- --runner codex
npm run benchmark:feedback:check
npm run benchmark:feedback:dry-run -- --runner codex --model "MODEL"
npm run benchmark:feedback -- --runner codex --model "MODEL" --reasoning medium --repeat 3
```

이 벤치는 profanity, 근거 없는 sarcasm, 사용자의 잘못된 정정, technical-only failure, stale lesson, current-task lesson reuse, policy poisoning 같은 negative/control case를 결정론적으로 채점합니다. `SAFE_TO_SHADOW`는 advisory shadow test만 허용하며 자동 policy mutation을 뜻하지 않습니다.


## Adaptive indexing: 인덱스가 소스보다 비싸지지 않게 하기

상세 정책과 명령은 [`ADAPTIVE_INDEXING.md`](ADAPTIVE_INDEXING.md)에 정리돼 있습니다.

인덱스는 문서가 아니라 **용량 제한이 있는 navigation cache**로 취급합니다. `npm run scan`은 먼저 Level 0~3을 판단하고, 그다음 `tight / balanced / retentive` profile로 전체 byte, shard 수, domain shard 수, shard별 entry 수를 제한합니다.

```bash
npm run assess:index
npm run scan             # level auto + profile auto
npm run scan:tight
npm run scan:balanced
npm run scan:retentive
npm run scan:force       # index efficacy 실험용 Level 3; budget은 유지
npm run scan:off
```

우선순위는 LLM이 아니라 deterministic Node script가 계산합니다.

- 최근 사용 빈도와 recency
- 동일 basename 중복과 legacy/archive/generated 혼재
- file bytes와 import 수를 이용한 저비용 복잡도 proxy
- 최근 error/failing-test 관찰
- changed file과 behavior/state/data/route 역할
- 수동 path/domain/concern pin
- 기존 entry의 최소 체류 기간과 refresh당 최대 교체 비율

새 entry가 들어와 예산을 넘으면 pin·최근 error·최소 체류 entry를 우선 보호하고, 나머지는 `priority / estimated index bytes`가 낮은 순서로 제외합니다. generated map의 고정 heading 크기도 미리 예약하므로 profile budget이 entry에 전부 소비되지 않습니다.

설정 파일은 `joo-indexing.config.json` 또는 `.joo-indexing.json`입니다. 예시는 `examples/indexing/joo-indexing.config.example.json`에 있습니다.

최근 탐색과 ROI를 반영할 수 있습니다.

```bash
npm run observe:navigation -- \
  --commands 9 \
  --tool-output-chars 18000 \
  --domain checkout \
  --concern validation \
  --file apps/storefront/src/features/coupon/ui/CouponField.tsx \
  --error \
  --index-used \
  --saved-chars 12000 \
  --index-read-chars 1800 \
  --maintenance-chars 400
```

ROI 근거가 없으면 `auto`는 보수적으로 동작합니다. Level 3이라는 이유만으로 `retentive`를 선택하지 않으며, 반복해서 손해가 관측되면 `tight`로 축소합니다.

다음 파일은 runtime navigation context가 아닙니다. 일반 작업 중 읽지 않습니다.

```txt
.ai/indexing/assessment-report.json
.ai/indexing/assessment-state.json
.ai/indexing/priority-report.json
.ai/indexing/priority-state.json
.ai/indexing/local-usage.json
```

벤치마크는 작은 fixture의 자동 비활성화와 index 자체 효능을 섞지 않습니다. index efficacy는 `--indexing-mode force`, activation/budget policy는 `auto`와 deterministic self-check로 별도 측정합니다.

## 실제 모델 navigation A/B 벤치마크

저장소 루트에서 다음처럼 실행합니다.

```bash
npm run benchmark -- --runner agy --model "YOUR_MODEL" --indexing-mode force
```

사용자가 coding agent에게 `벤치마킹 해줘. 모델: YOUR_MODEL`이라고 요청하면 `skills/navigation-benchmark/SKILL.md`와 `benchmark/prompt.md`를 따라 같은 명령을 실행합니다. 기본 반복은 3회이며, Antigravity는 모델 이름에 포함된 reasoning variant를 사용하고 Codex에서만 reasoning 기본값 medium을 사용합니다.

이 벤치는 별도 LLM judge나 추정 토큰을 사용하지 않습니다. 지정 모델은 파일 탐색만 수행하고, 정답 그룹·금지 경로·경로 유효성·중복·precision은 스크립트가 결정론적으로 채점합니다. 현재 agent의 native CLI(예: Antigravity의 `agy`, Codex의 `codex`) 또는 요청 모델을 실행할 수 없으면 다른 provider로 대체하지 않고 `NOT_RUN`으로 보고합니다.

과거 실벤치 결과와 예시 성능 수치는 저장소에 포함하지 않습니다. 새 결과는 `benchmark/token-navigation/results/<timestamp>/`에만 로컬로 생성되며 Git에서 제외됩니다.

Antigravity에서 실행할 때는 `--runner agy`, Codex에서 실행할 때는 `--runner codex`를 반드시 지정합니다. Windows Git Bash에서 `agy`가 PATH에 없으면 `source scripts/setup-agy-git-bash.sh`로 고칠 수 있으며, 벤치 러너는 `%LOCALAPPDATA%\agy\bin\agy.exe`도 직접 탐색합니다.

## Output Files: 무엇을 어떻게 읽어야 하나

| File | 역할 | 사람이 볼 때 |
| --- | --- | --- |
| `AI_INDEX.md` | 가장 먼저 읽는 작은 router | 길어지면 실패 신호입니다. 상세 tree가 아니라 어느 shard/file로 갈지 알려줘야 합니다. |
| `.ai/indexing/assessment-report.json` | adaptive activation 판단과 실제 artifact 예산 | Level 0~3, 신호, 권장/실제 level, budget 초과 여부를 확인합니다. |
| `.ai/indexing/assessment-state.json` | hysteresis용 로컬 상태 | runtime agent가 읽지 않습니다. |
| `.ai/indexing/priority-state.json` | 최소 체류·교체 제한용 로컬 상태 | runtime agent가 읽지 않습니다. |
| `.ai/indexing/priority-report.json` | opt-in 우선순위 진단 | 기본 생성하지 않으며 maintenance 때만 봅니다. |
| `.ai/indexing/AI_INDEX.candidate.md` | scan 결과로 만든 router 후보 | 그대로 복붙하기보다 사람이/AI가 compact하게 정리합니다. |
| `.ai/indexing/manifest.json` | compact shard 목록과 budget profile | runtime에서는 shard 존재 여부만 사용합니다. |
| `.ai/indexing/maps/root.md` | 모호한 요청의 top-level fallback | 자연어/기획식 요청이 route/API/state로 안 좁혀질 때만 봅니다. |
| `.ai/indexing/maps/routes.md` | route/page/screen 시작점 | 화면, URL, navigation, layout 작업에서 봅니다. |
| `.ai/indexing/maps/api.md` | API/query/client/OpenAPI 시작점 | backend 연동, query/mutation, generated client 경계 확인 때 봅니다. |
| `.ai/indexing/maps/state.md` | store/cache/session 시작점 | auth/session/cache/global state 작업에서 봅니다. |
| `.ai/indexing/maps/packages.md` | package/workspace/build/test config 시작점 | dependency, build, lint, test, monorepo 설정 변경 때 봅니다. |
| `.ai/indexing/maps/domains/*.md` | domain별 compact map | 요청이 특정 domain으로 좁혀졌을 때만 1개 정도 봅니다. |
| `.ai/indexing/file-map.candidate.json` | sidecar file hints | lookup/benchmark의 검색 재료입니다. source truth가 아닙니다. |
| `.ai/indexing/file-hints.candidate.md` | 사람이 읽기 쉬운 file hint 후보 | 중요한 파일 설명을 sidecar로 남길지 리뷰합니다. |
| `.ai/indexing/indexing-report.json` | compact maintenance summary | runtime agent가 읽지 않습니다. |

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
- scan은 기본적으로 sensitive-looking path를 제외하고 `.aiignore`를 존중합니다. 필요할 때만 opt-out flag를 씁니다.
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
