# SYCO23 Multicast Control — Architecture and Story Audit

## Scope

Audit basis: `IMPLEMENTATION_MASTERPLAN.md`, the V4.1 transmission user stories, and the production code at commit `f8cd666`.

## Story coverage

| Story | Status | Evidence / remaining work |
|---|---|---|
| TX-01 Template gallery | Implemented | Persistent templates, generated SVG previews, provider filtering. |
| TX-02 Custom template builder | Implemented | Managed image assets, scene graph, drag and resize editor. |
| TX-03 Provider output profiles | Implemented | Persistent provider-aware editor, destination assignment, server validation, revision history, ETags and conflict handling are implemented. |
| TX-04 Multicast providers | Implemented with acceptance caveats | Per-destination FFmpeg workers and first-class provider policies exist; real sandbox acceptance is still required. |
| TX-05 Transmission kits | Fixed in this milestone | Replaced browser-only dummy kits with persisted, destination/template/provider-specific server generation. |
| TX-06 In-app preview | Implemented | Authenticated HLS preview and browser recovery states. |
| TX-07 Operational logs | Implemented | Persistent filters, pagination, CSV export and runtime events. |
| TX-08 Persistence | Implemented with architecture debt | SQLite-compatible persistence exists through sql.js snapshots; native WAL/external DB decision remains M7. |
| TX-09 Watchdog recovery | Implemented | Worker isolation, progress timeout, retry/backoff/cooldown and incidents. |
| TX-10 Mobile operation | Implemented | Responsive route shell and critical controls; formal WCAG/Playwright mobile gate remains. |
| TX-11 Separate UI/runtime state | Mostly implemented | Canonical server state and event stream exist; runtime composition remains too concentrated. |

## Architecture findings

### High priority

1. **Runtime entrypoint concentration** — `runtime-server.ts` still combines dependency construction, authentication, static serving, WebSocket transport, lifecycle and observability. Profile routes have now been extracted to `app/server/http/routes/profiles.ts`; the remaining route groups should follow the same dependency-injected handler pattern.
2. **Contract boundary drift** — shared server/client contracts were stored in `app/types`, despite the plan requiring `app/contracts`. This milestone introduces `app/contracts/domain.ts` and `app/contracts/api.ts`; migration should continue incrementally.
3. **Browser-only transmission kits** — the UI previously generated disposable dummy kits and passed a template ID as a destination ID. This violated TX-05, persistence, audit and canonical-state requirements. Fixed in this milestone.
4. **Durability decision outstanding** — sql.js atomic snapshots are restart-safe but do not provide native SQLite WAL concurrency. M7 still requires a formal native SQLite or external durable DB choice.

### Medium priority

5. **Optimistic concurrency** — templates, profiles, destinations, schedules and transmission kits now support ETags, immutable revisions and stale-write rejection.
6. **Provider acceptance gap** — adapters normalize HTTP responses, but real provider sandbox tests and OAuth/webhook workflows remain incomplete.
7. **Release evidence gap** — CI exists, but signed artifacts, SBOM, image scan, restore drill and rolling upgrade evidence remain unfinished.
8. **Cross-project scope** — webplayer, AzuraCast infrastructure and Telegram bots are separate projects and are not implemented in this repository.

## Ordered next work

1. Continue extracting runtime route groups and move dependency construction into a composition root without changing API behavior.
2. Add configuration revision comparison and rollback controls to the operator UI.
3. Add provider-specific kit editing, copy actions and launch checklist status.
4. Execute native SQLite/WAL evaluation and migration spike.
5. Add WCAG AA automation, mobile Playwright workflows and provider sandbox contract tests.
6. Add SBOM, image scanning, signed release artifacts and documented restore/upgrade drills.
