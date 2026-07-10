# SYCO23 Multicast Control — Build Implementation Plan

Source of truth:
- `SYCO23-v4.1-dark-ash-edition/SYCO23-v4.1-master-product-spec.md`
- `SYCO23-v4.1-dark-ash-edition/SYCO23-v4.1-user-stories.md`
- Existing root references: `syco23_v4_broadcast_app.tsx`, `syco23_multicast_control.tsx`, `syco23_multicast_control_app_redesign.html`, `syco23_livestream_broadcast_deck.tsx`
- `docs/archival/` design + architecture notes

Out of scope for this plan: `syco23-webplayer` and bot projects. This plan is for `syco23-transmission` only.

Working convention:
- Main branch: `main`
- Feature branches per milestone
- Each milestone includes docs, code, and tests
- Every milestone must reach 100% coverage on its own test slices before merge
- Final milestone must reach 100% coverage for the committed test suite
- Tests are namespaced under `app/__tests__/`
- Primary test runner: Vitest for unit/integration
- E2E runner: Playwright

## Milestone 0 — Foundation and repo bootstrap
Goal: establish the executable project shape for the transmission app.

Tasks:
- Create package scripts for `dev`, `build`, `test`, `lint`, and `e2e`
- Add Vite + Vue 3 + TypeScript scaffold that can compile the current `app/` sources
- Add Vitest config with coverage thresholds for unit/integration tests
- Add Playwright config and baseline E2E harness
- Add `tests/e2e/smoke.spec.ts` for the base page smoke check
- Document the bootstrap in `README.md` and `RUNBOOK.md`
- Add `.env.example` for local config needs

Tests:
- Unit: `app/__tests__/config.package.test.ts` validates package scripts and manifests
- Integration: `app/__tests__/server.health.test.ts` verifies dev server health route responds
- E2E: `tests/e2e/smoke.spec.ts` loads the base page and asserts the SYCO23 brand header is visible
- Coverage command: `vitest run --coverage`
- E2E command: `playwright test`

## Milestone 1 — Brand design system and layout core
Goal: implement the SYCO23 v4 visual foundation and responsive layout rules.

Tasks:
- Implement design tokens and theme system from `docs/archival/design-tokens.md` and spec section 2
- Implement responsive layout engine from `docs/archival/layout-system.md`
- Build primary app shell and navigation chrome
- Implement `SycoVideoPlayer.vue`-style placeholder contracts to be filled later
- Add CSS baseline and spatial grid

Tests:
- Unit: `app/__tests__/layout.detector.test.ts` verifies layout mode for viewport fixtures
- Integration: `app/__tests__/tokens.css.test.ts` verifies token system CSS custom properties
- E2E: `tests/e2e/layout-modes.spec.ts` resizes a viewport and verifies layout mode classes and nav behavior

## Milestone 2 — Shared state model and composables
Goal: replace the current scaffold placeholders with canonical reactive state.

Tasks:
- Define the full `SycoAppState` model
- Implement shared state container without event bus antipatterns
- Implement composables from spec:
  - `useSourceIngest`
  - `useDestinationMatrix`
  - `useOutputProfiles`
  - `useSycoMetadata`
  - `useSycoStream`
  - `useWatchdog`
  - `useLogs`
  - `useSycoLayout`
  - `useSycoUiState`
  - `useTemplates`
  - `useTransmissionKit`
- Ensure route changes do not collapse live state

Tests:
- Unit: `app/__tests__/composables/state.test.ts` verifies each composable initializes correctly and reactive API
- Unit: `app/__tests__/composables/route-isolation.test.ts` verifies stream state survives simulated route changes
- Integration: `app/__tests__/composables/matrix-to-logs.test.ts` updates destination matrix via `useDestinationMatrix` and verifies `useLogs` reflects the update

## Milestone 3 — Server foundation and persistence contract
Goal: provide the backend API and data layer the UI depends on.

Tasks:
- Add SQLite schema for all required entities
- Implement server services and mocked API routes
- Implement metadata middleware polling contract
- Implement watchdog events persistence
- Add data validation and typed API responses

Tests:
- Unit: `app/__tests__/server/schema.test.ts` verifies SQLite tables are created as expected
- Integration: `app/__tests__/server/metadata.test.ts` validates normalized JSON from metadata middleware
- Integration: `app/__tests__/server/watchdog.test.ts` validates watchdog events persist and are queryable
- E2E: `tests/e2e/api-routes.spec.ts` validates API route documents and HTTP status codes

## Milestone 4 — Live control surface and destinations
Goal: deliver the primary operator control UX from spec section 4 and section 6.

Tasks:
- Build live control view: source state, master session controls, alert rail
- Build destination matrix with provider states and actions
- Implement provider CRUD
- Add output profile management UI
- Implement provider state transitions and provider-specific controls

Tests:
- Unit: `app/__tests__/features/destinations.test.ts` verifies provider CRUD mutates persisted records correctly
- Integration: `app/__tests__/features/destination-approval.test.ts` verifies approving a destination writes expected state and watchdog log entries
- E2E: `tests/e2e/destinations.spec.ts` demonstrates operator creating a provider, selecting a profile, and observing UI state changes

## Milestone 5 — Templates, transmission kits, and preview
Goal: deliver creation-time assets before stream execution.

Tasks:
- Build template gallery with generated preview images
- Build custom template builder
- Implement transmission kit generation
- Persist templates, custom assets, and kits
- Connect template selection into stream creation flow
- Integrate with player preview surface

Tests:
- Unit: `app/__tests__/features/templates.test.ts` verifies template preview generation returns expected assets
- Integration: `app/__tests__/features/transmission-kit.test.ts` verifies kit generation combines selected provider and template data
- E2E: `tests/e2e/templates-kit.spec.ts` verifies operator creates a custom template, selects it, and sees kit output

## Milestone 6 — Streaming pipeline and watchdog
Goal: add process-level execution and recovery behavior.

Tasks:
- Implement managed child-process pipeline abstraction
- Route one ingest to multiple destinations by profile
- Implement watchdog monitoring and recovery triggers
- Report pipeline health to UI and logs
- Keep resource cost bounded

Tests:
- Unit: `app/__tests__/features/watchdog.test.ts` verifies watchdog thresholds trigger expected recovery actions
- Integration: `app/__tests__/features/pipeline.test.ts` verifies pipeline health transitions are observable
- E2E: `tests/e2e/pipeline-watchdog.spec.ts` simulates provider failure, verifies reconnect, and asserts UI updates

## Milestone 7 — Logs, status, diagnostics, schedule, archive, overlay
Goal: complete the operator operational surface.

Tasks:
- Build colorized real-time log viewer
- Build status/diagnostics view
- Add schedule and archive views
- Build overlay-safe minimal output view
- Ensure all data surfaces are mobile-readable
- Wire log persistence and filtering to UI

Tests:
- Unit: `app/__tests__/features/logs.test.ts` verifies log filtering returns expected entries
- Integration: `app/__tests__/features/schedule-archive.test.ts` verifies schedule and archive endpoints return persisted data
- E2E: `tests/e2e/logs-status-archive.spec.ts` verifies operator can filter logs by level and navigate status, schedule, and archive views

## Milestone 8 — Polish, accessibility, and release readiness
Goal: harden UX, accessibility, and release documentation.

Tasks:
- Responsive layout polish for portrait, tablet, and TV-safe variants
- Accessibility pass for color-only meaning, contrast, and touch targets
- Finalize deployment configs and environment docs
- Finalize README, RUNBOOK, release notes, and user docs
- Verify 100% coverage and block regressions

Tests:
- Integration: `app/__tests__/a11y/contrast.test.ts` and `app/__tests__/a11y/touch-targets.test.ts` validate accessibility rules
- E2E: `tests/e2e/critical-paths.spec.ts` validates critical operator paths on mobile and desktop viewports
- Final coverage command: `vitest run --coverage --thresholds`
- Coverage gate: a failing coverage threshold in Vitest blocks merge
