# joo-skills token A/B benchmark fixture

`joo-skills` 방식의 navigation metadata가 실제 coding-agent 입력 토큰을 줄이는지 비교하기 위한 합성 프론트엔드 모노레포입니다.

## 포함 내용

- **동일한 소스 코드**를 사용하는 baseline / indexed 변형
- 현재 production 파일과 이름·키워드가 겹치는 legacy/archive/example/generated 디코이
- 정답 파일 그룹과 금지 경로가 정의된 10개 탐색 과제
- Codex CLI JSONL의 `turn.completed.usage`를 읽는 자동 토큰 집계
- 성공률, 입력 토큰, uncached 입력 토큰, 출력 토큰, 실행 시간 비교 리포트
- 실제 `joo-skills` clone으로 인덱스를 다시 생성하는 선택 스크립트

## 요구 사항

- Node.js 20 이상
- 실제 측정 시 Codex CLI 설치 및 로그인
- 같은 모델과 설정으로 baseline / indexed를 실행할 수 있는 계정

## 먼저 검증

```bash
npm run check
npm run benchmark:mock
```

`benchmark:mock`은 과금 없이 리포터가 정상 작동하는지만 확인합니다. 실제 토큰 측정값이 아닙니다.

## 실제 Codex A/B 실행

```bash
npm run benchmark:codex -- --model gpt-5.5 --repeat 3
```

비용을 줄여 먼저 한 과제만 확인할 수 있습니다.

```bash
npm run benchmark:codex --   --model gpt-5.5   --repeat 1   --case storefront-shipping-status
```

명령만 확인하려면:

```bash
npm run benchmark:codex -- --dry-run --repeat 1 --max-cases 1
```

실행 순서는 반복마다 `baseline → indexed`, `indexed → baseline`으로 교차합니다. 각 실행은 새 작업 디렉터리와 ephemeral 세션을 사용하며 read-only sandbox에서 동작합니다.

결과는 `results/<timestamp>/`에 저장됩니다.

- `runs.json`: 모든 실행의 usage와 채점 결과
- `report.md`: 사람이 읽는 비교표
- `report.json`: 후처리용 데이터
- `*.jsonl`: Codex 원본 이벤트 로그
- `*.answer.json`: 모델이 반환한 진입 파일

## 해석 기준

인덱스가 유효하다고 보려면 최소한 다음을 함께 만족해야 합니다.

1. indexed 성공률이 baseline보다 낮지 않다.
2. navigation-heavy 과제 다수에서 input 또는 uncached input token이 감소한다.
3. `exact-path-control`에서는 차이가 작다. 사용자가 정확한 파일을 줬을 때는 index가 필요 없기 때문이다.
4. 한 번이 아니라 3회 이상 반복한 중앙값으로 판단한다.

## 실제 joo-skills 출력으로 재생성

먼저 별도로 clone한 뒤:

```bash
git clone https://github.com/pep-pearl/joo-skills.git ../joo-skills
npm run regenerate:joo -- --path ../joo-skills
```

이 명령은 `.work/joo-generated`에 fixture를 복사하고 다음을 실행합니다.

```bash
node <joo-skills>/scripts/joo-indexing-install.mjs --target <workspace> --force
node <joo-skills>/scripts/joo-indexing-scan.mjs --target <workspace> --out <workspace>/.ai/indexing
```

생성된 candidate를 `AI_INDEX.md`로 승격하지만, 실제 프로젝트에서는 사람이 검토하거나 `/indexing init`으로 다듬는 편이 낫습니다. 기본 A/B 벤치마크는 재현성을 위해 `variants/indexed`의 고정된 작은 router/map overlay를 사용합니다.

생성 결과 자체를 Codex A/B의 indexed 쪽으로 사용하려면:

```bash
npm run benchmark:codex -- \
  --model gpt-5.5 \
  --repeat 3 \
  --indexed-workspace .work/joo-generated
```

`--baseline-workspace`도 지정할 수 있으며, 지정하지 않으면 `fixture/`를 사용합니다.

## 다른 에이전트에서 사용

`fixture/`가 baseline이고, 여기에 `variants/indexed/`를 덮어쓴 것이 indexed입니다.

```bash
node scripts/materialize.mjs --variant baseline --out /tmp/joo-base
node scripts/materialize.mjs --variant indexed --out /tmp/joo-index
```

같은 프롬프트를 새 세션에서 각각 실행하고, `benchmark/cases.json`의 정답과 비교하면 됩니다. 해당 CLI가 usage를 제공하지 않으면 실제 토큰 절감이 아니라 파일 탐색 정확도만 확인할 수 있습니다.

## 주의

이 fixture는 navigation 단계의 토큰 차이를 보기 위한 것입니다. 실제 코드 수정, 테스트 실행, 장기 대화, prompt cache, 사용자 전역 설정에서는 결과가 달라질 수 있습니다. 토큰 감소만 보고 판단하지 말고 성공률을 함께 보세요.
