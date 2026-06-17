# joo-skills token benchmark report

- Model: `mock-model`
- Repeats: 3
- Paired runs: 30

## Overall

| Metric | Baseline | Indexed | Reduction |
| --- | ---: | ---: | ---: |
| Pass rate | 100.0% | 100.0% | — |
| Average score | 100 | 100 | — |
| Median input tokens | 10,410 | 6,663 | 36.0% |
| Median uncached input | 10,410 | 6,663 | 36.0% |
| Median output tokens | 180 | 180 | 0.0% |
| Median duration | 6,000 ms | 4,300 ms | 28.3% |

## By case

| Case | Base pass | Index pass | Base input | Index input | Reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| storefront-shipping-status | 100.0% | 100.0% | 9,150 | 5,856 | 36.0% |
| profile-cache-invalidation | 100.0% | 100.0% | 9,430 | 6,035 | 36.0% |
| logout-cart-reset | 100.0% | 100.0% | 9,710 | 6,214 | 36.0% |
| admin-assignee-url-filter | 100.0% | 100.0% | 9,990 | 6,394 | 36.0% |
| checkout-coupon-validation | 100.0% | 100.0% | 10,270 | 6,573 | 36.0% |
| search-url-state | 100.0% | 100.0% | 10,550 | 6,752 | 36.0% |
| notification-double-call | 100.0% | 100.0% | 10,830 | 6,931 | 36.0% |
| admin-revenue-currency | 100.0% | 100.0% | 11,110 | 7,110 | 36.0% |
| exact-path-control | 100.0% | 100.0% | 11,390 | 11,162 | 2.0% |
| b2b-tax-invoice | 100.0% | 100.0% | 11,670 | 7,469 | 36.0% |

## Interpretation

Treat the index as beneficial only when indexed pass rate is not worse and token reduction is positive across several navigation-heavy cases. The exact-path control should show little or no improvement; a large gain there may indicate uncontrolled variance. Cached input is reported separately because it can make cost and context-size conclusions differ.
