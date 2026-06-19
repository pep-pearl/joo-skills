# Navigation contract

For repo navigation: exact user paths/errors/changed files win. Otherwise read `AI_INDEX.md`, then at most one `.ai/indexing/maps/*.md`, then source.

Pick the smallest files covering the requested concerns. Behavior/state/data owners beat generic routes. Use concrete anchors: labels, enum values, URL params, cache keys, endpoints, and error text. Follow imports only when a required concern is still uncovered.

Avoid full content scans by default; scan names first if metadata is weak. Treat `legacy/`, `archive/`, `examples/`, `apps/playground/`, Storybook, and generated clients as non-production unless requested. Read-only benchmark.
