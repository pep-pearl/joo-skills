# joo-skills 벤치마킹 초간단 매뉴얼

이 테스트는 같은 프로젝트를 두 가지 상태로 비교한다.

- **baseline:** joo-skills 인덱스가 없는 상태
- **indexed:** `AI_INDEX.md`, `AGENTS.md`, map 파일이 있는 상태

둘 중 indexed가 정답률을 유지하면서 파일을 더 빠르고 적은 토큰으로 찾는지 확인한다.

---

## 1. 테스트 폴더로 이동하기

터미널을 열고 joo-skills 저장소로 이동한다.

```bash
cd joo-skills
git pull
cd benchmark/token-navigation
```

현재 위치가 맞는지 확인한다.

```bash
pwd
```

마지막 부분이 다음처럼 나오면 된다.

```text
joo-skills/benchmark/token-navigation
```

---

## 2. Node.js 버전 확인하기

```bash
node -v
```

다음처럼 20 이상이 나오면 된다.

```text
v20.x.x
v22.x.x
v24.x.x
```

20보다 낮으면 Node.js를 먼저 업데이트한다.

---

## 3. `.gitignore` 먼저 수정하기

현재 결과는 `results/날짜/`처럼 하위 폴더에 만들어진다.

`benchmark/token-navigation/.gitignore`를 다음 내용으로 바꾸는 것을 권장한다.

```gitignore
.work/
node_modules/

results/*
!results/.gitkeep
!results/mock/
!results/mock/**
```

이렇게 하면:

- 실제 테스트 원본 결과는 Git에 올라가지 않는다.
- Mock 예시는 유지된다.
- 임시 작업 폴더도 Git에 올라가지 않는다.

수정 후 확인한다.

```bash
git status
```

나중에 실제 벤치마크를 돌렸을 때 수백 개의 결과 파일이 `git status`에 나타나지 않아야 한다.

---

# 1부: 공통 준비 테스트

## 4. 프로젝트가 정상인지 검사하기

```bash
npm run check
```

정상이면 대략 다음과 비슷한 내용이 나온다.

```text
OK: 10 cases
Fixture: ... files
Indexed metadata: ... files
```

에러가 나오면 실제 벤치마크를 진행하지 말고 에러부터 고친다.

---

## 5. 가짜 결과로 리포터 검사하기

```bash
npm run benchmark:mock
```

이 명령은 돈이나 실제 모델 토큰을 사용하지 않는다.

확인하는 것은 단 하나다.

> 결과를 읽고 `report.md`를 만드는 코드가 정상인가?

Mock 결과에 나온 절감률은 가짜 데이터다. README에 실제 성능처럼 쓰면 안 된다.

---

# 2부: Codex 벤치마크

Codex는 현재 스크립트로 거의 자동 실행된다.

## 6. Codex 설치 여부 확인하기

```bash
codex --version
```

버전이 나오면 준비 완료다.

명령을 찾을 수 없다는 에러가 나오면 Codex CLI를 설치한다.

설치 후 처음 한 번 다음 명령을 실행한다.

```bash
codex
```

브라우저나 터미널 안내에 따라 로그인한 뒤 종료한다.

---

## 7. 실제 실행 없이 명령만 검사하기

```bash
npm run benchmark:codex -- \
  --dry-run \
  --repeat 1 \
  --max-cases 1
```

이 명령은 실제 모델을 호출하지 않는다.

출력에 다음 두 종류가 모두 보이면 된다.

```text
baseline
indexed
```

---

## 8. 한 문제만 실제로 테스트하기

처음부터 전체 테스트를 돌리지 않는다.

```bash
npm run benchmark:codex -- \
  --model gpt-5.5 \
  --repeat 1 \
  --case storefront-shipping-status
```

사용 계정에서 `gpt-5.5`를 사용할 수 없다면 사용 가능한 모델로 바꾼다.

중요한 규칙:

> baseline과 indexed에는 반드시 같은 모델을 사용한다.

테스트가 끝나면 다음 폴더가 생긴다.

```text
results/2026-.../
```

그 안에서 `report.md`를 연다.

---

## 9. Codex 전체 테스트하기

한 문제 테스트가 성공했다면 전체 10문제를 3번씩 실행한다.

```bash
npm run benchmark:codex -- \
  --model gpt-5.5 \
  --repeat 3
```

실행 횟수는 다음과 같다.

```text
10개 문제 × 2개 상태 × 3회 = 60회
```

스크립트가 실행 순서를 자동으로 바꾼다.

```text
1회차: baseline → indexed
2회차: indexed → baseline
3회차: baseline → indexed
```

---

## 10. Codex 결과 보기

가장 최근 `results/날짜/` 폴더를 연다.

중요한 파일은 세 개다.

```text
report.md
report.json
runs.json
```

처음에는 `report.md`만 보면 된다.

### 성공 판정

다음 조건을 모두 확인한다.

1. Indexed Pass rate가 Baseline보다 낮지 않다.
2. Indexed Median input tokens가 더 작다.
3. Indexed Median uncached input도 더 작거나 비슷하다.
4. 여러 문제에서 토큰이 감소한다.
5. `exact-path-control` 문제는 차이가 크지 않다.

예를 들어 다음 결과는 좋다.

```text
Baseline pass rate: 90%
Indexed pass rate: 97%

Baseline input median: 20,000
Indexed input median: 14,000
Reduction: 30%
```

다음 결과는 성공이라고 보기 어렵다.

```text
Baseline pass rate: 100%
Indexed pass rate: 70%

Token reduction: 40%
```

토큰은 줄었지만 정답률이 떨어졌기 때문이다.

---

# 3부: 현재 joo-skills 생성기로 다시 테스트하기

기본 Codex 테스트의 indexed는 저장소에 미리 들어 있는 고정 인덱스를 사용한다.

이 테스트는 벤치마크 장치가 제대로 동작하는지 확인하는 용도다.

실제 README에 쓸 결과는 현재 joo-skills 스크립트가 생성한 인덱스로 한 번 더 테스트하는 게 좋다.

## 11. 현재 joo-skills로 인덱스 생성하기

현재 위치가 다음이어야 한다.

```text
joo-skills/benchmark/token-navigation
```

다음 명령을 실행한다.

```bash
npm run regenerate:joo -- \
  --path ../..
```

생성 결과는 여기에 생긴다.

```text
.work/joo-generated
```

---

## 12. 현재 생성 결과로 Codex 테스트하기

먼저 한 문제만 실행한다.

```bash
npm run benchmark:codex -- \
  --model gpt-5.5 \
  --repeat 1 \
  --case storefront-shipping-status \
  --indexed-workspace .work/joo-generated
```

정상이라면 전체 테스트를 실행한다.

```bash
npm run benchmark:codex -- \
  --model gpt-5.5 \
  --repeat 3 \
  --indexed-workspace .work/joo-generated
```

이 결과가 현재 joo-skills의 실제 생성 성능에 더 가깝다.

---

# 4부: Antigravity 벤치마크 (자동 실행)

Antigravity 벤치마크 역시 Codex와 동일한 에이전트 런타임 및 채점 스크립트를 재사용하여 완전 자동으로 진행한다. 모델 파라미터만 Antigravity가 사용하는 모델로 지정하여 실행하면 된다.

---

## 13. Antigravity 자동 벤치마크 실행하기

다음 명령을 실행하여 Antigravity 모델(예: `gemini-2.5-pro`)로 전체 테스트를 수행한다.

```bash
npm run benchmark:codex -- \
  --model gemini-2.5-pro \
  --repeat 3
```

사용하는 계정 환경에 맞춰 `gemini-2.5-pro` 또는 `claude-3-5-sonnet` 등 Antigravity가 탑재한 모델을 지정하여 실행한다.

---

## 14. 현재 joo-skills 생성 결과로 다시 테스트하기

현재 로컬 스크립트로 생성한 최신 인덱스 메타데이터를 사용하여 벤치마크를 돌리려면 다음과 같이 실행한다.

```bash
npm run benchmark:codex -- \
  --model gemini-2.5-pro \
  --repeat 3 \
  --indexed-workspace .work/joo-generated
```

---

## 15. 결과 분석 및 파일 확인

테스트가 완료되면 Codex 테스트와 동일하게 다음 경로에 결과 리포트와 원시 데이터가 생성된다.

```text
results/2026-.../
```

동일한 결과물 포맷을 가지므로, `report.md`를 열어 동일한 기준(Pass rate, Token reduction)으로 분석한다.

---

# 5부: 처음부터 60회 하기 부담스러울 때

자동 벤치마크 실행이지만, API 할당량(Rate Limit)이나 비용을 절약하기 위해 대표적인 3개 문제만 선별하여 빠르게 테스트하는 것을 권장한다.

추천 문제:

```text
storefront-shipping-status
logout-cart-reset
exact-path-control
```

이 세 문제는 각각 다음을 확인한다.

```text
storefront-shipping-status
→ 화면 탐색

logout-cart-reset
→ 여러 패키지에 걸친 탐색

exact-path-control
→ 정확한 파일을 이미 알려준 대조군
```

선별 실행 명령어는 `--case` 인자를 통해 대상을 지정하면 된다.

```bash
npm run benchmark:codex -- \
  --model gemini-2.5-pro \
  --repeat 1 \
  --case storefront-shipping-status,logout-cart-reset,exact-path-control
```

이 테스트에 문제가 없다면 3회 반복 및 전체 10개 문제로 점진적으로 단계를 높여 진행한다.

---

# 6부: Codex와 Antigravity 결과 해석하기

## Codex

다음을 기록한다.

```text
Pass rate
Median input tokens
Median uncached input tokens
Median output tokens
Median duration
```

Codex는 토큰 수를 자동 집계하므로 토큰 절감률을 공식 결과로 써도 된다.

---

## Antigravity

Antigravity 벤치마크 역시 스크립트를 통해 자동 실행되었으므로 Codex와 완전히 동일한 지표를 기록한다.

- Pass rate
- Median input tokens
- Median uncached input tokens
- Median output tokens
- Median duration

결과 리포트(`report.md`) 및 `runs.json`에서 집계된 토큰 절감률(Token reduction) 수치를 그대로 활용하여 비교 분석한다.

---

# 7부: 두 제품 결과를 섞으면 안 되는 이유

Codex와 Antigravity의 절대 토큰 수를 직접 비교하지 않는다.

잘못된 비교:

```text
Codex는 15,000토큰
Antigravity는 10,000토큰
그러므로 Antigravity가 더 좋다
```

제품마다 다음이 다를 수 있다.

```text
모델
시스템 프롬프트
도구 설명
캐시
에이전트 런타임
토큰 집계 방식
```

올바른 비교는 제품 안에서 한다.

```text
Codex baseline vs Codex indexed

Antigravity baseline vs Antigravity indexed
```

각 제품에서 indexed가 얼마나 개선됐는지 따로 계산한다.

---

# 8부: README에 올릴 결과 형식

숫자는 실제 결과로 교체한다.

```md
## Navigation benchmark

### Test setup

- Synthetic frontend monorepo
- 10 navigation tasks
- 3 repetitions
- Same model and settings within each A/B pair
- Baseline: source files only
- Indexed: source files plus joo-skills navigation metadata

### Codex

- Model: `사용한 모델`
- Baseline pass rate: `__%`
- Indexed pass rate: `__%`
- Baseline median input tokens: `__`
- Indexed median input tokens: `__`
- Input token reduction: `__%`
- Uncached input reduction: `__%`

### Antigravity

- Model: `사용한 모델`
- Baseline pass rate: `__%`
- Indexed pass rate: `__%`
- Baseline median input tokens: `__`
- Indexed median input tokens: `__`
- Input token reduction: `__%`
- Uncached input reduction: `__%`
- Median duration (baseline/indexed): `__초 / __초`

### Interpretation

Indexed 결과는 다음 두 조건을 모두 만족할 때만 개선으로 판정했다.

1. Indexed pass rate가 baseline보다 낮지 않다.
2. 여러 navigation-heavy task에서 token usage 또는 수행 시간이 감소한다.

`exact-path-control`은 사용자가 정확한 파일을 이미 제공한 대조군이므로 큰 개선이 없어야 정상이다.
```

---

# 9부: 자주 하는 실수

## 명령을 저장소 루트에서 실행함

잘못된 위치:

```text
joo-skills/
```

올바른 위치:

```text
joo-skills/benchmark/token-navigation/
```

---

## Mock 숫자를 실제 결과로 사용함

```bash
npm run benchmark:mock
```

이 결과는 가짜다.

리포터 테스트용이다.

---

## Baseline과 Indexed에서 다른 모델을 사용함

이러면 비교 결과를 사용할 수 없다.

---

## 같은 대화를 계속 사용함

이전 대화의 기억 때문에 다음 테스트가 쉬워질 수 있다.

모든 실행은 새 대화로 시작한다.

---



## 토큰만 줄었는데 성공이라고 판단함

정답률이 낮아졌다면 실패다.

```text
정답률 유지 또는 상승
+
토큰이나 시간 감소
=
개선
```

---

## Codex와 Antigravity의 절대 숫자를 직접 비교함

제품 간 절대 토큰 수 비교가 아니라 각 제품의 baseline/indexed 절감률을 비교해야 한다.
