# 자동 navigation A/B 벤치마크 실행 지침

사용자가 다음처럼 요청하면 이 문서를 실행 계약으로 사용한다.

```text
벤치마킹 해줘. 모델: <model>
```

추가 옵션이 없어도 질문하지 말고 반복 횟수 `3`을 사용한다. 채점은 스크립트 기반 결정론적 채점이며 별도 LLM judge는 사용하지 않는다.

## 실행기 선택

요청을 받은 현재 agent의 native CLI를 사용한다.

- Antigravity에서 실행 중이면 반드시 `--runner agy`
- Codex에서 실행 중이면 반드시 `--runner codex`
- 중립적인 일반 터미널에서 직접 실행할 때만 `--runner auto` 허용

Antigravity가 요청을 받았는데 Codex CLI를 검색하거나 실행하면 안 된다. 반대도 마찬가지다.

## 절대 규칙

1. 사용자가 지정한 모델을 정확한 이름 그대로 사용한다.
2. 다른 모델, fallback 모델, 다른 provider CLI로 바꾸지 않는다.
3. 기존 `results/`, 과거 리포트, 이전 대화의 수치를 재사용하지 않는다.
4. mock 결과, 추정 토큰, 수동 입력 수치를 만들지 않는다.
5. 별도 LLM judge나 서브 에이전트 평가를 사용하지 않는다.
6. 모델 실행이 불가능한 환경에서는 벤치마크를 했다고 말하지 않는다.
7. 정확한 token usage가 없으면 `null`/`n/a`로 남긴다.
8. 벤치마크 코드나 fixture를 실행 중 임의 수정하지 않는다.
9. 작은 fixture라는 이유로 efficacy 벤치의 indexed overlay를 auto-disable하지 않는다. index efficacy는 `force`, activation/budget 정책은 별도 deterministic test로 측정한다.

## Antigravity 실행 절차

저장소 루트에서 다음을 수행한다.

```bash
node -v
npm run benchmark:doctor -- --runner agy
npm run benchmark:check
npm run benchmark:dry-run -- --runner agy --model "<model>" --indexing-mode force
npm run benchmark -- --runner agy --model "<model>" --indexing-mode force
```

- `benchmark:doctor`는 `PATH`, `AGY_BIN`, `%LOCALAPPDATA%\agy\bin\agy.exe` 순으로 AGY를 확인한다.
- 실제 실행 전에 `agy models`로 요청 모델의 정확한 이름이 존재하는지 검증한다.
- Antigravity 모델의 reasoning 수준은 모델 이름에 포함되므로 `--reasoning`을 별도로 넘기지 않는다.
- Git Bash에서 `agy: command not found`가 나면 `source scripts/setup-agy-git-bash.sh`를 실행한다.

## Codex 실행 절차

```bash
node -v
npm run benchmark:doctor -- --runner codex
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "<model>" --indexing-mode force
npm run benchmark -- --runner codex --model "<model>" --indexing-mode force
```

Codex에서만 reasoning 기본값 `medium`을 사용한다. 사용자가 값을 지정하면 다음처럼 전달한다.

```bash
npm run benchmark -- --runner codex --model "<model>" --indexing-mode force --reasoning "<setting>" --repeat <count>
```

If a Codex run is interrupted by the host timeout, resume the latest compatible result directory instead of starting over:

```bash
npm run benchmark -- --runner codex --model "<model>" --indexing-mode force --reasoning "<setting>" --repeat <count> --resume latest
```

If it cannot be continued, finalize the partial report:

```bash
npm run benchmark:finalize -- --dir latest
```

## 실행기가 보장해야 하는 조건

- baseline과 indexed는 동일한 fixture source를 사용한다.
- indexed에만 `AI_INDEX.md`, `AGENTS.md`, `.ai/indexing/maps/*`가 존재한다.
- 각 실행은 새 workspace와 새 CLI 호출을 사용한다.
- 반복마다 baseline/indexed 순서를 교차한다.
- Finder에게 정답표를 노출하지 않는다.
- 반환 경로는 실제 존재하는 repository-relative file이어야 한다.
- 첫 baseline/indexed 쌍에서 실행 인프라가 실패하면 나머지 실행을 중단한다.
- 실행 실패와 모델 오답을 구분한다.
- AGY는 임시 workspace 안의 `.benchmark-answer.json`만 쓸 수 있으며, 다른 파일 변경은 실패로 채점한다.
- 결과가 일부만 유효하면 `PARTIAL`, 전부 실패하면 `FAILED`로 기록한다.

## 결과 보고

새 결과는 다음 위치에 생성된다.

```text
benchmark/token-navigation/results/<timestamp>/
```

주요 파일:

- `runs.json`: 정규화된 전체 실행 데이터
- `report.json`: 기계 판독용 집계
- `report.md`: 사람이 읽는 결과
- Codex: `*.jsonl`
- AGY: `*.stdout.txt`
- `*.answer.json`: 모델의 최종 반환값

최종 답변에는 실행 여부, runner, 요청 모델, 상태, 유효/실패 실행 수, 정확도 비교, 사용 가능한 경우에만 token 비교, indexing mode, forced 여부, indexed artifact byte size, 결과 폴더 경로를 간단히 적는다.

`PARTIAL` 또는 `FAILED`인 결과로 성능 향상을 주장하지 않는다.


## 별도 budget/activation 검증

모델 A/B와 별개로 다음 deterministic 검증을 실행할 수 있다. 이 결과를 모델 성능 결과와 합쳐서 하나의 pass/fail로 만들지 않는다.

```bash
npm run test:assessment
npm run test:budget
```
