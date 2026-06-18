# joo-skills navigation A/B benchmark

동일한 합성 프론트엔드 저장소를 두 조건으로 실행해 navigation metadata의 효과를 비교합니다.

- **baseline:** navigation metadata 없음
- **indexed:** `AI_INDEX.md`, `AGENTS.md`, `.ai/indexing/maps/*`만 추가

별도 LLM judge는 없습니다. 지정 모델은 파일을 찾고, 정답 여부는 스크립트가 결정론적으로 채점합니다.

## Antigravity에서 실행

```bash
npm run benchmark:doctor
npm run benchmark:check
npm run benchmark:dry-run -- --runner agy --model "EXACT_MODEL_NAME"
npm run benchmark -- --runner agy --model "EXACT_MODEL_NAME"
```

사용 가능한 모델 이름:

```bash
agy models
```

반드시 출력된 이름을 정확히 사용합니다. Antigravity 모델의 reasoning 수준은 모델 이름에 포함되므로 `--reasoning`을 전달하지 않습니다.

Windows 공식 설치 경로는 `%LOCALAPPDATA%\agy\bin\agy.exe`입니다. 러너는 이 경로를 직접 확인하므로 Git Bash의 `PATH`가 깨져 있어도 벤치를 실행할 수 있습니다.

Git Bash에서 `agy` 명령 자체도 사용하려면 저장소 루트에서:

```bash
source scripts/setup-agy-git-bash.sh
```

## Codex에서 실행

```bash
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "EXACT_MODEL_NAME"
npm run benchmark -- --runner codex --model "EXACT_MODEL_NAME"
```

Codex 전용 옵션:

```bash
npm run benchmark -- \
  --runner codex \
  --model "EXACT_MODEL_NAME" \
  --reasoning high \
  --repeat 3
```

## 직접 실행과 자동 선택

중립적인 일반 터미널에서만 `--runner auto`를 사용할 수 있습니다.

```bash
npm run benchmark -- --runner auto --model "EXACT_MODEL_NAME"
```

`auto`는 요청 모델이 `agy models`에 정확히 있으면 AGY를 사용하고, 그렇지 않으면 설치된 Codex를 확인합니다. Agent 환경에서는 모호성을 피하기 위해 native runner를 명시해야 합니다.

## 부분 실행

```bash
npm run benchmark -- \
  --runner agy \
  --model "EXACT_MODEL_NAME" \
  --repeat 1 \
  --case storefront-shipping-status
```

여러 case는 쉼표로 구분합니다.

## AGY 실행 방식

AGY Windows 비대화형 출력이 항상 stdout으로 전달된다고 가정하지 않습니다. 모델은 격리된 임시 workspace 안에 `.benchmark-answer.json` 하나만 생성합니다.

- 원본 fixture는 수정되지 않습니다.
- 임시 answer 파일 외의 변경이 있으면 해당 실행은 실패로 채점합니다.
- AGY가 token usage를 제공하지 않으면 token 값은 `null`/`n/a`입니다.
- 다른 CLI의 수치나 추정값으로 채우지 않습니다.

## 결과

```text
benchmark/token-navigation/results/<timestamp>/
```

- `runs.json`: 실행별 정규화 데이터
- `report.json`: 결정론적 집계
- `report.md`: 비교표
- Codex: `*.jsonl`
- AGY: `*.stdout.txt`
- `*.answer.json`: 최종 응답 JSON

상태:

- `VALID`: 예정 실행 전부 정상
- `PARTIAL`: 일부 실행 실패
- `FAILED`: 유효 실행 없음 또는 첫 검증 쌍 실패
- `DRY_RUN`: 명령 구성만 확인

## fixture 구성

- `fixture/`: baseline source
- `variants/indexed/`: indexed에만 덮어쓰는 compact metadata
- `benchmark/cases.json`: prompt와 외부 채점용 answer key
- `benchmark/output-schema.json`: 모델 최종 응답 형식

Finder workspace에는 answer key가 복사되지 않습니다. 이 fixture는 navigation 단계만 측정하며 실제 코드 수정, 테스트, 장기 대화 성능 전체를 대표하지 않습니다.
