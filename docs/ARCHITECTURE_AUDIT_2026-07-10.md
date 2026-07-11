# SYCO23 Multicast Control — Architecture and Story Audit

## Scope

Audit basis: `IMPLEMENTATION_MASTERPLAN.md`, the V4.1 transmission user stories, and the hardened production code following the native-WAL milestone.

## Story coverage

| Story | Status | Evidence / remaining work |
|---|---|---|
| TX-01 Template gallery | Implemented | Persistent templates, generated SVG previews, provider filtering. |
| TX-02 Custom template builder | Implemented | Managed image assets, scene graph, drag and resize editor. |
| TX-03 Provider output profiles | Implemented | Persistent provider-aware editor, destination assignment, server validation, revision history, ETags and conflict handling are implemented. |
| TX-04 Multicast providers | Contract-complete with acceptance caveats | Per-destination FFmpeg workers and all ten provider adapters have deterministic policy, URL, probe and metadata contract coverage; real platform sandbox acceptance still requires external credentials. |
| TX-05 Transmission kits | Fixed in this milestone | Replaced browser-only dummy kits with persisted, destination/template/provider-specific server generation. |
| TX-06 In-app preview | Implemented | Authenticated HLS preview and browser recovery states. |
| TX-07 Operational logs | Implemented | Persistent filters, pagination, CSV export and runtime events. |
| TX-08 Persistence | Implemented | Native better-sqlite3 persistence uses WAL, concurrent reader visibility, integrity-checked backup/restore and legacy snapshot compatibility. |
| TX-09 Watchdog recovery | Implemented | Worker isolation, progress timeout, retry/backoff/cooldown and incidents. |
| TX-10 Mobile operation | Implemented with CI gate | Responsive lifecycle, keyboard controls, touch-target tests, mobile Playwright and WCAG A/AA suites are included; browser execution is enforced in CI. |
| TX-11 Separate UI/runtime state | Mostly implemented | Canonical server state and event stream exist; runtime composition remains too concentrated. |

## Architecture findings

### High priority

1. **Runtime entrypoint concentration** — `runtime-server.ts` still combines dependency construction, authentication, static serving, WebSocket transport, lifecycle and observability. Profile routes have now been extracted to `app/server/http/routes/profiles.ts`; the remaining route groups should follow the same dependency-injected handler pattern.
2. **Contract boundary drift** — shared server/client contracts were stored in `app/types`, despite the plan requiring `app/contracts`. This milestone introduces `app/contracts/domain.ts` and `app/contracts/api.ts`; migration should continue incrementally.
3. **Browser-only transmission kits** — the UI previously generated disposable dummy kits and passed a template ID as a destination ID. This violated TX-05, persistence, audit and canonical-state requirements. Fixed in this milestone.
4. **Durability decision completed** — production defaults to native better-sqlite3 with WAL. The sql.js backend remains only as a compatibility/test option.

### Medium priority

5. **Optimistic concurrency and rollback** — templates, profiles, destinations, schedules and transmission kits support ETags, immutable revisions, comparison, conflict-safe rollback and stale-write rejection.
6. **Provider acceptance gap** — deterministic contracts cover every adapter, but real provider sandbox tests and provider-specific OAuth/webhook workflows remain external acceptance work.
7. **Release evidence** — CI generates an application SBOM, scans the container and captures Playwright evidence. Tagged releases publish provenance and SBOM attestations. A real VPS restore/upgrade drill remains an operational acceptance requirement.
8. **Cross-project scope** — webplayer, AzuraCast infrastructure and Telegram bots are separate projects and are not implemented in this repository.

## Ordered next work

1. Continue extracting runtime route groups and move dependency construction into a composition root without changing API behavior.
2. Execute real provider sandbox acceptance with disposable credentials.
3. Run the documented restore and rolling-upgrade drill on the IONOS staging host.
4. Continue extracting the remaining runtime routes and composition concerns from `runtime-server.ts`.
