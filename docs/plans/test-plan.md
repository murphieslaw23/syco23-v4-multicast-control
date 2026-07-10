# SYCO23 Multicast Control — Test Plan

Source of truth:
- `docs/plans/implementation-plan.md`
- `SYCO23-v4.1-dark-ash-edition/SYCO23-v4.1-master-product-spec.md`
- `PLAN_ARCHIVE.md`

## Test layers
- Unit: runnable Vitest cases in `app/__tests__/`
- Integration: runnable Vitest cases that exercise composed modules and APIs together
- E2E: runnable Playwright tests in `tests/e2e/`
- Coverage: collected by `vitest run --coverage`

## Coverage contract
- Every milestone is responsible for:
  - Adding or updating the tests listed for that milestone
  - Running the exact commands in its `Test commands` block
  - Reporting whether those commands report full pass and expected floor coverage
- Final milestone creates a global `coverage` guard. If any committed test subset cannot achieve 100%, the pipeline must fail and the milestone must document the bounded scope instead of silently accepting lower coverage.

## Test commands
- Unit + integration coverage: `vitest run`
- E2E only: `playwright test`
- Full combined: `vitest run && playwright test`

## Milestone test inventory
Milestone 0 — Foundation:
- `app/__tests__/config.package.test.ts`
- `app/__tests__/server.health.test.ts`
- `tests/e2e/smoke.spec.ts`

Milestone 1 — Design system and layout:
- `app/__tests__/layout.detector.test.ts`
- `app/__tests__/tokens.css.test.ts`
- `tests/e2e/layout-modes.spec.ts`

Milestone 2 — Shared state and composables:
- `app/__tests__/composables/state.test.ts`
- `app/__tests__/composables/route-isolation.test.ts`
- `app/__tests__/composables/matrix-to-logs.test.ts`

Milestone 3 — Server foundation:
- `app/__tests__/server/schema.test.ts`
- `app/__tests__/server/metadata.test.ts`
- `app/__tests__/server/watchdog.test.ts`
- `tests/e2e/api-routes.spec.ts`

Milestone 4 — Live control surface:
- `app/__tests__/features/destinations.test.ts`
- `app/__tests__/features/destination-approval.test.ts`
- `tests/e2e/destinations.spec.ts`

Milestone 5 — Templates and kits:
- `app/__tests__/features/templates.test.ts`
- `app/__tests__/features/transmission-kit.test.ts`
- `tests/e2e/templates-kit.spec.ts`

Milestone 6 — Pipeline and watchdog:
- `app/__tests__/features/watchdog.test.ts`
- `app/__tests__/features/pipeline.test.ts`
- `tests/e2e/pipeline-watchdog.spec.ts`

Milestone 7 — Logs and status:
- `app/__tests__/features/logs.test.ts`
- `app/__tests__/features/schedule-archive.test.ts`
- `tests/e2e/logs-status-archive.spec.ts`

Milestone 8 — Release readiness:
- `app/__tests__/a11y/contrast.test.ts`
- `app/__tests__/a11y/touch-targets.test.ts`
- `tests/e2e/critical-paths.spec.ts`
