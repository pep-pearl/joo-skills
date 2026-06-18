# 벤치마킹 사용법

사용자는 agent에게 다음 한 줄만 요청하면 됩니다.

```text
벤치마킹 해줘. 모델: YOUR_MODEL
```

요청을 받은 agent는 자신의 native CLI를 사용합니다.

## Antigravity agent

```bash
npm run benchmark:doctor -- --runner agy
npm run benchmark:check
npm run benchmark:dry-run -- --runner agy --model "YOUR_MODEL"
npm run benchmark -- --runner agy --model "YOUR_MODEL"
```

Antigravity agent는 Codex 설치 여부를 확인하거나 `codex`를 실행하면 안 됩니다. 요청 모델은 `agy models`에 출력되는 정확한 이름이어야 합니다.

Git Bash에서 `agy: command not found`가 나오면:

```bash
source scripts/setup-agy-git-bash.sh
agy --version
agy models
```

벤치 러너 자체는 `%LOCALAPPDATA%\agy\bin\agy.exe`를 직접 찾기 때문에 PATH가 고쳐지기 전에도 `--runner agy`로 실행할 수 있습니다.

## Codex agent

```bash
npm run benchmark:doctor -- --runner codex
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "YOUR_MODEL"
npm run benchmark -- --runner codex --model "YOUR_MODEL"
```

Codex에서만 `--reasoning`을 사용할 수 있습니다.

## 공통 옵션

```bash
npm run benchmark -- \
  --runner agy \
  --model "YOUR_MODEL" \
  --repeat 1 \
  --case storefront-shipping-status
```

기본 반복은 3회입니다.

## 실행할 수 없는 환경

native CLI가 없거나 요청 모델이 해당 CLI에 없으면 다른 provider나 모델로 대체하지 않습니다.

```text
NOT_RUN
원인: native CLI 또는 요청 모델을 사용할 수 없음
```

## 채점 방식

모델은 파일을 찾는 역할만 합니다. 별도 LLM이 결과를 평가하지 않습니다.

스크립트가 다음을 확인합니다.

- 필수 concern 그룹(`requiredGroups`) 충족
- 선택 문맥 그룹(`optionalGroups`) 커버리지 — 점수 보너스만 제공하며 통과 필수는 아님
- legacy/archive/example/generated 금지 경로 선택 여부
- 반환 경로의 실제 존재 여부
- 중복 경로
- 1~4개 제한
- 불필요한 추가 경로
- AGY 임시 answer 파일 외 workspace 변경 여부

토큰은 CLI가 제공한 usage만 사용합니다. usage가 없으면 `n/a`입니다.

## 결과 읽기

```text
benchmark/token-navigation/results/<timestamp>/report.md
```

`PARTIAL` 또는 `FAILED` 결과로 개선을 주장하지 않습니다. `REGRESSION`은 품질 게이트 판정이며 곧바로 통계적 유의성을 뜻하지 않습니다. 보고서의 paired exact McNemar p-value를 별도로 확인합니다. 저장소에는 과거 실벤치 결과나 예시 성능 수치를 포함하지 않습니다.
