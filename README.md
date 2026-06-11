# joo-skills

개인용 AI workflow / agent skill 아카이브입니다.

`joo-code`가 복붙 가능한 코드 kit을 모으는 저장소라면, `joo-skills`는 매 프로젝트마다 반복해서 쓰는 AI 작업 방식, repo indexing, AGENTS/rules 템플릿, harness별 어댑터를 모으는 저장소입니다.

## Core Idea

AI가 새 프로젝트를 만났을 때 바로 전체 repo를 훑지 않고, 먼저 작은 navigation router를 읽고, 필요한 경우에만 작게 쪼갠 map shard 하나를 읽게 합니다.

```txt
/indexing init      -> 프로젝트 구조를 읽고 router + map shard 후보 생성
/indexing annotate  -> 중요한 파일에만 @ai-* header 후보 생성
/indexing audit     -> AI_INDEX / manifest / maps / headers 불일치 점검
/indexing refresh   -> routes/domains/api/state/packages 등 변경 영역만 갱신
```

## Direction

- `AI_INDEX.md`는 architecture 문서가 아니라 작은 router입니다.
- 상세 파일 매핑은 `.ai/indexing/maps/*`에 shard로 나눕니다.
- 평소 작업에서는 map shard를 최대 1개만 읽고, 이후에는 import-following을 우선합니다.
- 자연어/기획/디자인식 요청이 모호할 때만 `maps/root.md`에서 시작합니다.
- scripts는 후보를 만들고, AI는 필요한 조각만 판단해서 사용합니다.

## Repository Structure

```txt
.
├─ skills/
│  ├─ repo-indexing/                 # /indexing 계열 핵심 스킬
│  ├─ repo-navigation/               # 최소 파일 읽기 / intent classification / import-following
│  ├─ ai-metadata-maintenance/       # AI_INDEX, map shards, @ai-* header 유지보수
│  ├─ frontend-fsd-navigation/       # FE/FSD/React Router 탐색
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
│  ├─ joo-indexing-scan.mjs          # dependency 없는 repo 구조 scan + map shard 생성
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
```

### 3. 대상 프로젝트에서 scan

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing
```

생성되는 후보 파일:

```txt
.ai/indexing/AI_INDEX.candidate.md
.ai/indexing/indexing-report.json
.ai/indexing/header-candidates.md
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
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing --no-maps
```

### 4. AI에게 명령

```txt
/indexing init

Read .ai/indexing/AI_INDEX.candidate.md, manifest.json, maps/root.md, and header-candidates.md.
Create or update AI_INDEX.md as a router.
Keep detailed file maps in .ai/indexing/maps/*.
Do not full-scan the repo. Follow the joo-skills repo-indexing skill.
```

## Runtime Navigation Rule

평소 개발 작업에서는 다음 순서를 기본으로 합니다.

```txt
exact files from user
-> rules/context-navigation.md
-> AI_INDEX.md
-> at most one .ai/indexing/maps/* shard
-> source file
-> imports
-> tests if behavior matters
-> targeted search only when blocked
```

## Philosophy

- Full repo scan is a failure mode, not a default.
- Index is a navigation adapter, not architecture documentation.
- `AI_INDEX.md` is a router, not a file tree.
- File maps are sharded and optional.
- Headers are for high-value entry files only.
- Scripts produce candidates; AI makes judgment.
- Every code change should briefly decide whether navigation metadata became stale.
