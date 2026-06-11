## Joo Skills

Use the local AI navigation system before broad repository exploration.

Default order:

1. If user names exact files, start there.
2. Read `rules/context-navigation.md` if present.
3. Read `AI_INDEX.md` if present.
4. Follow imports downward.
5. Search broadly only when targeted navigation fails.

Conditional skills:

- Use repo indexing when asked to create, audit, refresh, or maintain AI navigation metadata.
- Use metadata maintenance after changes that affect routes, page structure, domain ownership, API/data flow, state, map/GIS, or first-read files.
- Use screen-spec alignment when official screen specs, PDFs, prototypes, or screenshots are referenced.
- Use API integration planning when connecting frontend UI to Swagger/OpenAPI/backend endpoints.

Do not auto-load `docs/prompts/*` unless the user explicitly references them.
