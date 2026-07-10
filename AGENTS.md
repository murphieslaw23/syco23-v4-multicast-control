# SYCO23 Multicast Control

## Purpose

Vue 3 + Vite + TypeScript broadcast control panel for SYCO23 live streaming operations. Provides UI for managing RTMP destinations, monitoring pipeline health, viewing logs, and overlaying templates. Targets 100% unit-test coverage on composables, types, and server modules.

## Ownership

Single-owner project (SYCO23 broadcast infra). Decisions are made directly; no consensus process. Kept in sync with sibling projects under the root DOX hierarchy at `~/vscode/`.

## Local Contracts

### Tech Stack

- Vue 3 (Composition API, `<script setup>`) + TypeScript strict
- Vite 5 (build dev server)
- Vitest 1.x + `@vue/test-utils` (unit)
- Playwright 1.x (e2e)
- 100% coverage threshold enforced (branches, functions, lines, statements)

### Source Layout

| Path | Purpose |
|---|---|
| `app/components/` | Vue SFCs — thin logic, delegate to composables |
| `app/composables/` | Reactive state & business logic (primary test target) |
| `app/server/` | Schema, type routes, watchdog store (pure logic, no I/O) |
| `app/types/` | Shared TypeScript interfaces |
| `app/__tests__/` | Unit tests colocated by module |
| `tests/e2e/` | Playwright specs (`smoke`, `layout-modes`) |
| `docs/` | Plans, archival docs, release notes |
| `coverage/` | Generated coverage HTML (gitignored in practice) |

### Conventions

- Composables return plain objects (not class instances) — easier to test
- State is a single `reactive<SycoAppState>` in `app/composables/store.ts`; all mutations go through `updateSycoAppState`
- Layout detection is browser-only (`window` guard); server/context-unsafe code must check `typeof window`
- Test files live in `__tests__/` subdirectories mirroring source structure, not a top-level `tests/` dir (except E2E)
- `app/components/` is intentionally **excluded** from coverage — only composables/types/server are tested

### Release Gate

Every milestone must pass:
```
npm run test
npm run lint
npm run typecheck
npm run build
```
All four must exit 0 or the milestone is not done.

## Work Guidance

### Adding a Feature

1. Define types in `app/types/index.ts`
2. Add composable in `app/composables/` (export a function returning an interface)
3. Write tests in `app/__tests__/composables/` or `app/__tests__/features/`
4. Wire into component in `app/components/`
5. Update `docs/plans/implementation-tasks.md` if the feature belongs to an active milestone
6. Add release note entry in `docs/release-notes/` under the current date

### Adding a Component

- Keep `<script setup>` logic minimal; delegate to composables
- No inline business logic (state mutations, calculations) inside components
- Write component tests only if logic cannot be extracted to a composable (component tests are not counted toward coverage)

### Modifying Server/Schema

- `app/server/schema.ts` defines the canonical DB schema — any field change needs a migration note
- Server modules must remain framework-agnostic (no Vue imports); they are pure TS

### Testing

- Unit test files must be `*.test.ts` inside `app/__tests__/`
- Use `@vue/test-utils` only for mount/shallowMount; prefer direct composable invocation for state logic
- Coverage drops below 100% fail the `vitest run` via `vitest.config.ts` thresholds

## Verification

| Command | Checks |
|---|---|
| `npm run test` | Unit tests pass |
| `npm run test:coverage` | 100% on all tracked files |
| `npm run lint` | ESLint clean (`.ts`, `.vue`) |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm run build` | Production build succeeds |
| `npm run e2e` | Playwright specs pass |

## Child DOX Index

- **app/server/** — Pure TypeScript server logic (schema, metadata normalization, watchdog store, API route types). No Vue/DOM deps. Own AGENTS.md at `app/server/AGENTS.md`.
- **app/composables/** — Vue 3 composables: reactive state + business logic. Primary coverage target (100%). Own AGENTS.md at `app/composables/AGENTS.md`.
- **app/components/** — Vue SFC presentation layer. Excluded from coverage. Own AGENTS.md at `app/components/AGENTS.md`.
