# joo-skills

AI coding agent가 큰 저장소에서 덜 헤매도록 돕는 **repo navigation / indexing skill 모음**입니다.

쉽게 말하면, AI에게 프로젝트 전체를 매번 뒤지게 하는 대신:

1. 먼저 작은 길잡이 파일인 `AI_INDEX.md`를 읽게 하고
2. 필요하면 `.ai/indexing/maps/*` 중 관련 shard 하나만 더 읽게 하고
3. 그다음 실제 source, import, test로 확인하게 만드는 도구입니다.

`AI_INDEX.md`와 map shard는 정답 문서가 아닙니다. **다음에 읽을 파일을 고르는 navigation hint**입니다. 최종 진실은 항상 source, import, test, runtime behavior입니다.

## 왜 쓰나

AI agent는 작은 프로젝트에서는 잘 찾지만, repo가 커질수록 이런 문제가 자주 생깁니다.

- 비슷한 이름의 파일이 많아서 엉뚱한 파일을 먼저 읽음
- route, API, state, UI 파일을 구분하지 못하고 repo-wide search를 반복함
- legacy, examples, generated client를 production 코드로 착각함
- 사용자가 "배송 상태 배지 고쳐줘"라고 말했을 때 실제 owner 파일까지 가는 데 오래 걸림

이 프로젝트는 그 문제를 줄이기 위해, AI가 처음부터 읽을 파일 후보를 좁혀주는 metadata와 스크립트를 제공합니다.

## 핵심 원칙

```txt
정확한 파일 경로 / 에러 위치 / 변경 파일
-> AI_INDEX.md
-> 관련 map shard 최대 1개
-> source file
-> import / caller / test
-> 필요한 경우에만 targeted search
```

중요한 규칙:

- 사용자가 정확한 파일 경로를 줬으면 index보다 그 경로가 우선입니다.
- 에러 로그나 failing test가 있으면 index보다 에러 anchor가 우선입니다.
- metadata가 source와 충돌하면 source가 맞습니다.
- 평소 작업 중에는 assessment/priority/local usage 같은 maintenance 파일을 읽지 않습니다.
- full repo scan은 기본값이 아니라 마지막 수단입니다.

## 언제 효과적인가

잘 맞는 경우:

- monorepo처럼 앱, 패키지, 도메인이 여러 개 있는 repo
- `admin`, `storefront`, `b2b`처럼 비슷한 기능이 여러 앱에 나뉜 repo
- route, API, state, UI 파일이 분리된 frontend repo
- legacy/example/generated 파일이 많아서 AI가 자주 헷갈리는 repo
- AI agent에게 "이 기능의 진입 파일 찾아줘" 같은 요청을 자주 하는 팀

굳이 필요 없는 경우:

- 파일 수가 적고 구조가 단순한 repo
- 사용자가 항상 정확한 파일 경로를 알려주는 작업
- 1~2개 파일만 고치는 아주 작은 수정
- index를 최신으로 유지할 사람이 전혀 없는 repo

## 설치 흐름

이 repo를 clone한 뒤, 대상 프로젝트 root에서 실행합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target .
```

기본으로 생성되는 주요 파일:

```txt
AI_INDEX.md
AGENTS.md
rules/context-navigation.md
rules/ai-navigation-maintenance.md
.ai/indexing/README.md
.ai/indexing/benchmarks/navigation-cases.example.json
```

기존 파일을 덮어써야 할 때만 `--force`를 사용합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-install.mjs --target . --force
```

## Index 생성

대상 프로젝트에서 candidate index를 생성합니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing
```

기본 scan은 safe-by-default입니다.

- `.gitignore`를 존중합니다.
- `.aiignore`, `.ignore`, `.repomixignore`를 존중합니다.
- `.ai/` 내부를 scan하지 않습니다.
- `.env`, key, credential처럼 민감해 보이는 경로를 제외합니다.

생성되는 candidate 예시:

```txt
.ai/indexing/assessment-report.json
.ai/indexing/AI_INDEX.candidate.md
.ai/indexing/manifest.json
.ai/indexing/maps/*.md
.ai/indexing/file-map.candidate.json
.ai/indexing/indexing-report.json
```

candidate는 바로 정답으로 복사하기보다, 사람이 보거나 AI에게 정리시키는 용도로 쓰는 것이 좋습니다.

## Index 검증

stale path나 이상한 metadata를 먼저 잡습니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps
```

로컬에서는 경고만 보고 싶을 수 있습니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps \
  --warn-only
```

## Lookup 사용

AI가 map shard 전체를 읽기 전에, 다음에 읽을 파일 후보만 빠르게 찾을 수 있습니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword "order detail"
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --path src/pages/orders/detail.tsx
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --intent route-page --domain order --limit 5
```

자동화에서 쓰려면 JSON으로 받습니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs \
  --target . \
  --keyword "coupon validation" \
  --json
```

lookup 결과도 정답이 아니라 **next-read hint**입니다. 실제 수정 전에는 반드시 source/import/test로 확인해야 합니다.

## PR / 변경분 기반 작업

이미 코드가 바뀐 상태라면 index보다 변경 파일이 더 중요합니다.

```bash
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --staged
```

metadata 갱신이 필요한지도 확인할 수 있습니다.

```bash
node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs \
  --target . \
  --base main \
  --warn-only
```

권장 흐름:

```txt
1. changed files 확인
2. direct imports / matching tests 확인
3. 필요한 경우에만 AI_INDEX.md 또는 affected map shard 갱신
```

## Adaptive Indexing

모든 repo에 같은 크기의 index를 만들면 오히려 손해가 날 수 있습니다. 그래서 이 프로젝트는 Level 0~3으로 indexing 필요도를 나눕니다.

| Level | 의미 | 언제 |
| --- | --- | --- |
| 0 | assessment만 생성 | 작고 단순한 repo |
| 1 | 작은 `AI_INDEX.md` 후보 | 영역은 여러 개지만 직접 search가 아직 싼 repo |
| 2 | router + core maps | 중간 규모이거나 모호성이 있는 repo |
| 3 | Level 2 + compact file-map | 큰 monorepo, 중복 파일명이 많은 repo |

실행:

```bash
npm run assess:index
npm run scan
npm run scan:tight
npm run scan:balanced
npm run scan:retentive
npm run scan:force
npm run scan:off
```

`auto`는 보수적으로 동작합니다. ROI 근거가 없으면 무조건 큰 index를 만들지 않습니다.

자세한 정책은 [ADAPTIVE_INDEXING.md](ADAPTIVE_INDEXING.md)를 보세요.

## 실무 적용 가이드

처음 적용한다면 이렇게 시작하는 것을 권장합니다.

1. 작은 팀 또는 개인 repo에서 `scan`을 돌립니다.
2. 생성된 `AI_INDEX.candidate.md`를 사람이 한 번 봅니다.
3. 너무 긴 항목, generated/client/example 경로가 섞였는지 확인합니다.
4. `lookup`으로 자주 하는 작업 5~10개를 테스트합니다.
5. PR마다 `diff-check --warn-only`로 metadata 누락을 먼저 경고만 받습니다.
6. 효과가 확인되면 CI에서 strict check를 고려합니다.

AI에게 맡길 때는 이렇게 말하면 됩니다.

```txt
/indexing init

Read .ai/indexing/AI_INDEX.candidate.md and maps.
Create a compact AI_INDEX.md router.
Keep detailed maps under .ai/indexing/maps/*.
Do not full-scan the repo.
```

기존 index를 갱신할 때:

```txt
/indexing refresh

Only update stale navigation metadata affected by the current diff.
Prefer small patches to AI_INDEX.md and affected map shards.
Do not rewrite unrelated sections.
```

## Benchmark 결과

최근 navigation A/B benchmark에서 indexed metadata가 실제로 도움이 되는지 확인했습니다.

실행 조건:

- Date: 2026-06-19
- Runner: `codex-cli`
- Model: `gpt-5.5`
- Reasoning: `medium`
- Repeat: `3`
- Runs: `60/60 valid`
- Benchmark kind: `index-efficacy`
- Indexing mode: `force`
- Indexed artifact bytes: `8,929`
- Result directory: `benchmark/token-navigation/results/2026-06-19T00-47-27-560Z/`

요약 결과:

| Metric | Baseline | Indexed | Change |
| --- | ---: | ---: | ---: |
| Pass rate | 90.0% | 100.0% | improved |
| Average deterministic score | 93 | 100 | improved |
| Median commands | 7 | 5 | 23.1% less |
| Tool output chars | 14,317 | 3,041 | 78.8% less |
| Median input tokens | 104,673 | 102,247 | 2.3% less |
| Uncached input tokens | 29,089 | 26,143 | 10.1% less |
| Output tokens | 1,148 | 840 | 26.8% less |
| Reasoning tokens | 221 | 108 | 51.2% less |
| Duration | 36,045 ms | 33,310 ms | 7.6% faster |

Report:

- [report.md](benchmark/token-navigation/results/2026-06-19T00-47-27-560Z/report.md)

### 이 결과를 어떻게 해석해야 하나

초보자 관점에서 보면, 이 benchmark는 다음을 보여줍니다.

좋은 신호:

- AI가 관련 파일을 더 정확히 찾았습니다.
- 불필요한 명령과 출력 읽기가 줄었습니다.
- 총 input token도 이번 run에서는 줄었습니다.
- output/reasoning token과 실행 시간도 줄었습니다.

즉, 이 skill은 "AI가 어디부터 읽어야 할지 알려주는 안내판" 역할을 했고, 이번 테스트에서는 그 안내판이 실제로 도움이 됐습니다.

주의할 점:

- 이 benchmark는 작은 fixture에서 `--indexing-mode force`로 index를 강제로 켠 실험입니다.
- 실무에서는 `auto` 모드가 언제 index를 켜고 끌지까지 중요합니다.
- Paired McNemar p-value는 `0.2500`입니다. 따라서 품질 개선이 통계적으로 강하게 증명됐다고 말하면 안 됩니다.
- 케이스별로 보면 일부 작업은 indexed 쪽 input token이 더 늘었습니다. 전체 중앙값은 좋아졌지만, 모든 요청에서 항상 token이 줄어드는 것은 아닙니다.

결론:

```txt
실무 적용 가치가 있다는 신호는 충분하다.
하지만 "모든 repo에서 항상 켜면 이득"이라는 뜻은 아니다.
큰 repo, 모호한 repo, AI가 자주 헤매는 repo부터 조건부로 적용하는 것이 좋다.
```

## Benchmark 실행 방법

agent에게 이렇게 요청할 수 있습니다.

```txt
벤치마킹 해줘. 모델: gpt-5.5
```

Codex에서 직접 실행할 때:

```bash
npm run benchmark:doctor -- --runner codex
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "gpt-5.5" --indexing-mode force
npm run benchmark -- --runner codex --model "gpt-5.5" --indexing-mode force --reasoning medium --repeat 3
```

Antigravity에서 실행할 때:

```bash
npm run benchmark:doctor -- --runner agy
npm run benchmark:check
npm run benchmark:dry-run -- --runner agy --model "YOUR_MODEL" --indexing-mode force
npm run benchmark -- --runner agy --model "YOUR_MODEL" --indexing-mode force
```

규칙:

- 현재 agent 환경의 native CLI만 사용합니다.
- Codex에서는 `--runner codex`, Antigravity에서는 `--runner agy`를 사용합니다.
- 다른 provider나 다른 model로 fallback하지 않습니다.
- mock 결과, 과거 report, 추정 token, 별도 LLM judge를 사용하지 않습니다.
- 실행할 수 없으면 `NOT_RUN`으로 보고합니다.

별도 deterministic check:

```bash
npm run test:assessment
npm run test:budget
```

## NPM Scripts

이 repo 안에서 사용할 수 있는 shorthand입니다.

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
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "gpt-5.5" --indexing-mode force
npm run benchmark -- --runner codex --model "gpt-5.5" --indexing-mode force --reasoning medium --repeat 3
npm run test:assessment
npm run test:budget
```

## Repository 구조

```txt
.
├─ AGENTS.md
├─ skills/
│  ├─ repo-indexing/
│  ├─ repo-navigation/
│  ├─ navigation-benchmark/
│  └─ ai-metadata-maintenance/
├─ adapters/
│  ├─ common/
│  ├─ codex/
│  ├─ claude-code/
│  ├─ cursor/
│  └─ opencode/
├─ templates/
│  └─ project/
├─ scripts/
│  ├─ joo-indexing-install.mjs
│  ├─ joo-indexing-scan.mjs
│  ├─ joo-indexing-lookup.mjs
│  ├─ joo-indexing-validate.mjs
│  ├─ joo-indexing-diff-check.mjs
│  ├─ joo-diff-impact.mjs
│  └─ lib/
├─ benchmark/
│  ├─ prompt.md
│  └─ token-navigation/
├─ docs/
└─ examples/
```

## Output 파일 읽는 법

| File | 의미 | 평소 agent가 읽어야 하나 |
| --- | --- | --- |
| `AI_INDEX.md` | 가장 먼저 읽는 작은 router | 예 |
| `.ai/indexing/maps/*.md` | domain/concern별 상세 hint | 필요한 shard 1개만 |
| `.ai/indexing/AI_INDEX.candidate.md` | scan 결과 후보 | maintenance 때만 |
| `.ai/indexing/manifest.json` | shard 목록과 budget 정보 | 보통 아니오 |
| `.ai/indexing/file-map.candidate.json` | lookup용 compact metadata | lookup script가 사용 |
| `.ai/indexing/assessment-report.json` | activation 판단 보고서 | maintenance 때만 |
| `.ai/indexing/priority-state.json` | local stability state | 아니오 |
| `.ai/indexing/local-usage.json` | local ROI 관찰값 | 아니오 |

## 철학

- Full repo scan is a failure mode, not a default.
- Index is a navigation adapter, not architecture documentation.
- `AI_INDEX.md` is a router, not a file tree.
- Source, imports, tests, and runtime behavior beat metadata.
- Metadata should be small enough that reading it is cheaper than wandering through the repo.
- Every code change should briefly decide whether navigation metadata became stale.
