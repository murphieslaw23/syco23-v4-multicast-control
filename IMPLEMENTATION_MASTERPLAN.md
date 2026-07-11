# SYCO23 Multicast Control — Production Implementation Masterplan

## Delivery model

Work is organized as six independently reviewable workstreams. Each produces small, passing commits and may only merge after its acceptance gate passes.

| Stream | Required skills | Scope | Merge gate |
|---|---|---|---|
| A. Platform architecture | Nuxt 3, Nitro, TypeScript, monorepos, API contracts | Separate UI/runtime, shared contracts, route architecture | Typecheck, contract tests, migration plan |
| B. Media runtime | FFmpeg/FFprobe, RTMP/SRT/HLS, process supervision, Linux | Per-destination workers, watchdog, HLS preview, compositor | Failure-injection tests, 2-hour soak test |
| C. Operator product | Vue 3, accessibility, responsive control-room UX | Routes, persistent stores, schedule/archive/status/logs/overlay | Playwright workflows, WCAG AA scan |
| D. Integrations | AzuraCast, provider APIs, OAuth, webhooks | Metadata, provider adapters, platform acknowledgements | Provider sandbox tests and normalized errors |
| E. Security & operations | AppSec, secrets, RBAC, SQLite, backups, observability | Secret store, secure auth, validation, audit, retention | Threat-model checklist, restore drill |
| F. Quality & release | Vitest, Playwright, Docker, CI/CD, SBOM | Test pyramid, images, deploy verification, release automation | Green CI, container smoke, signed artifact |

## Orchestration rules

1. One owner per stream; one integration owner controls shared contracts.
2. Shared interfaces are changed contract-first under `app/contracts` and require compatibility tests.
3. No placeholder implementations, fake success responses, or UI-only operational state.
4. Every feature includes persistence, failure behavior, audit behavior, documentation, and tests.
5. Commits remain deployable. Cross-stream work lands behind explicit feature flags only when incomplete.
6. Media-runtime changes use deterministic fake-process tests plus real FFmpeg smoke tests.
7. Security-sensitive changes require negative tests before merge.

## Ordered milestones

### M1 — Production safety
- Strict secret resolution; unresolved references fail closed.
- Stable machine-readable API errors and request IDs.
- Runtime request validation and body limits.
- Command serialization and idempotency.
- Secure WebSocket ticket exchange.
- Backup restore by validated backup ID/upload, never arbitrary path.
- Deep liveness/readiness/dependency probes.

### M2 — Broadcast resilience
- Per-destination process isolation.
- Server watchdog with progress timeout, retry, exponential backoff and cooldown.
- Persistent destination transitions and watchdog events.
- Incident escalation and recovery actions.
- Graceful shutdown and interrupted-session reconciliation.

### M3 — Metadata and preview
- Integrated AzuraCast poller with timeout, jitter, backoff and persistence.
- Metadata/stats/health APIs.
- Local authenticated HLS preview.
- Real browser HLS player with recovery states.

### M4 — Templates and compositor
- Asset upload/storage and validation.
- Versioned scene graph.
- Deterministic preview renderer.
- FFmpeg filtergraph compiler.
- Overlay editor and template/session binding.

### M5 — Complete operator application
- Required route architecture.
- Server-backed canonical stores.
- Schedule editor, archive, diagnostics, logs, incidents, audit and backups.
- Mobile critical-action flows and accessible confirmations.

### M6 — First-class providers
- Platform-specific validation and profile constraints.
- Metadata publishing and acknowledgements where APIs allow it.
- Provider health probes, error normalization and retry policies.
- Provider-specific transmission kits.

### M7 — Production release
- Nuxt/Nitro UI migration or formally approved split architecture.
- Native SQLite/WAL or external durable DB decision.
- Full CI, secret scan, SAST, SBOM and image scan.
- Ubuntu/PM2, Docker Compose and split UI/runtime deployment verification.
- Restore drill, rolling-upgrade drill and live-provider acceptance tests.

## Definition of done

A capability is complete only when its normal path, rejection path, restart recovery, authorization, persistence, audit record, metrics, documentation and automated tests are implemented.

## Current audit checkpoint — 2026-07-10

- M1–M5: implemented with remaining formal release evidence and full-resource concurrency work.
- M6: provider constraints, probes, metadata publishing and persisted transmission-kit generation implemented.
- M7: pending architecture decision for native SQLite/WAL versus external durable database, route/composition split, SBOM/image signing, restore and rolling-upgrade drills.
- Detailed story and architecture findings: `docs/ARCHITECTURE_AUDIT_2026-07-10.md`.


## 2026-07-10 implementation update — output profiles

- TX-03 is now implemented end to end.
- Added persistent profile revisions, timestamps and ETag conflict detection.
- Fixed the profile DAO column mapping defect for `video_bitrate` and `audio_bitrate`.
- Added a provider-policy-driven operator editor and destination profile assignment.
- Extracted profile HTTP handling from the runtime entrypoint into `app/server/http/routes/profiles.ts`.
- Remaining concurrency work: destinations, schedules and transmission kits.

## 2026-07-11 implementation update — resource concurrency and route extraction

- Destinations, schedules and transmission kits now persist versions and timestamps.
- All three resources support ETag/If-Match conflict detection and immutable configuration revisions.
- Their HTTP handlers are extracted from `runtime-server.ts` into dependency-injected route modules.
- Operator clients send current revisions for update and delete operations.
- The official test command uses a deterministic single-worker VM-isolated pool.
- Remaining ordered work: kit checklist/editor UX, native SQLite/WAL decision, provider sandbox acceptance, WCAG/mobile E2E, and signed release artifacts.

## 2026-07-11 implementation update — revision rollback and provider kits

- Added an administrator revision browser with snapshot comparison and conflict-safe rollback.
- Rollback creates a new audited revision and never rewrites immutable history.
- Transmission kits now persist provider-specific launch checklist progress.
- Added editable kit copy, labels, metadata, launch notes, existing-kit selection and clipboard actions.
- Fixed asynchronous operational log persistence so mutations do not resolve before their log transaction completes.
- Remaining ordered work: native SQLite/WAL decision, provider sandbox acceptance, WCAG/mobile E2E, SBOM/image scanning, and signed release artifacts.
