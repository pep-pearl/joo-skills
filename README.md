# joo-skills

개인용 AI workflow / agent skill 아카이브입니다.

`joo-code`가 복붙 가능한 코드 kit을 모으는 저장소라면, `joo-skills`는 매 프로젝트마다 반복해서 쓰는 AI 작업 방식, repo indexing, AGENTS/rules 템플릿, harness별 어댑터를 모으는 저장소입니다.

## Core Idea

AI가 새 프로젝트를 만났을 때 바로 전체 repo를 훑지 않고, 먼저 작은 navigation map을 만들고, 이후 작업 중 스스로 그 map을 유지하게 합니다.

```txt
/indexing init      -> 프로젝트 구조를 읽고 AI_INDEX 초안 생성
/indexing annotate  -> 중요한 파일에만 @ai-* header 후보 생성
/indexing audit     -> AI_INDEX와 현재 repo의 불일치 점검
/indexing refresh   -> routes/domains/api/state 등 변경 영역만 갱신
```

## Repository Structure

```txt
.
├─ skills/
│  ├─ repo-indexing/                 # /indexing 계열 핵심 스킬
│  ├─ repo-navigation/               # 최소 파일 읽기 / import-following
│  ├─ ai-metadata-maintenance/       # AI_INDEX, @ai-* header 유지보수
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
│  ├─ joo-indexing-scan.mjs          # dependency 없는 repo 구조 scan
│  └─ joo-indexing-install.mjs       # project bootstrap 파일 복사
├─ docs/
│  ├─ skill-map.md
│  ├─ install-targets.md
│  ├─ borrowed-patterns.md
│  └─ design-principles.md
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
```

### 4. AI에게 명령

```txt
/indexing init

Read .ai/indexing/AI_INDEX.candidate.md and header-candidates.md.
Create or update AI_INDEX.md, AGENTS.md, and only necessary @ai-* file headers.
Do not full-scan the repo. Follow the joo-skills repo-indexing skill.
```

## Philosophy

- Full repo scan is a failure mode, not a default.
- Index is a navigation adapter, not architecture documentation.
- Headers are for high-value entry files only.
- Scripts produce candidates; AI makes judgment.
- Every code change should briefly decide whether navigation metadata became stale.
