# 자동 feedback-compound A/B 벤치마크 실행 지침

사용자가 다음처럼 요청하면 이 문서를 실행 계약으로 사용한다.

```text
피드백 컴파운드 벤치마킹 해줘. 모델: <model>
```

추가 옵션이 없어도 질문하지 말고 반복 횟수 `3`을 사용한다. 채점은 스크립트 기반 결정론적 채점이며 별도 LLM judge는 사용하지 않는다.

## 실행기

현재 agent 환경의 native CLI를 사용한다.

- Antigravity / AGY: `--runner agy`
- Codex: `--runner codex`
- 중립적인 터미널에서만 `--runner auto`

다른 provider나 모델로 대체하지 않는다. 실행할 수 없으면 `NOT_RUN`으로 보고한다.

## 절차

Antigravity:

```bash
npm run benchmark:feedback:doctor -- --runner agy
npm run benchmark:feedback:check
npm run benchmark:feedback:dry-run -- --runner agy --model "<model>"
npm run benchmark:feedback -- --runner agy --model "<model>" --repeat 3
```

Codex:

```bash
npm run benchmark:feedback:doctor -- --runner codex
npm run benchmark:feedback:check
npm run benchmark:feedback:dry-run -- --runner codex --model "<model>"
npm run benchmark:feedback -- --runner codex --model "<model>" --reasoning medium --repeat 3
```

## 절대 규칙

- baseline과 skilled는 동일한 visible case를 사용한다.
- skilled에만 feedback skill/rule을 제공한다.
- expected answer key를 workspace에 복사하지 않는다.
- 반복마다 baseline/skilled 순서를 교차한다.
- mock score, 추정 token, 과거 report, 수동 LLM judge를 사용하지 않는다.
- `PARTIAL` 또는 `FAILED` 결과로 개선을 주장하지 않는다.
- `SAFE_TO_SHADOW`는 advisory shadow test 허용만 의미하며 자동 정책 승격을 허용하지 않는다.
