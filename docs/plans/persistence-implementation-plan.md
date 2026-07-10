# Persistence Implementation Plan

Source of truth:
- `app/server/schema.ts` — 10 tables already defined
- `app/server/watchdog-store.ts` — In-memory store pattern
- `app/composables/store.ts` — Current reactive state
- `app/types/index.ts` — All entity interfaces

Current state: All data in-memory, lost on page reload. Schema defined but never created.

---

## Milestone A — Database Foundation

Goal: establish SQLite database with automatic migration and typed CRUD service layer.

### A.1 — Database Initialization Service

Tasks:
- Create `app/server/db.ts` — database bootstrap service
  - Opens SQLite database (sql.js for client-side WASM, or better-sqlite3 for Node/Electron)
  - Runs `SCHEMA_SQL` on startup if tables don't exist
  - Exports `getDb()` singleton accessor
  - Handles migration versioning via `PRAGMA user_version`
- Add dependency: `sql.js` (WASM SQLite for browser) or `@libsql/client` (Turso SQLite)
- Create `app/__tests__/server/db.test.ts` — verify tables created, migration idempotent

Tests:
- Unit: `app/__tests__/server/db.test.ts` — database initializes, tables exist, migration runs once
- Integration: verify schema matches `REQUIRED_TABLES` from `schema.ts`

### A.2 — Data Access Layer (DAO)

Tasks:
- Create `app/server/dao/` directory with one file per entity:
  - `app/server/dao/destinations.ts` — CRUD for destinations table
  - `app/server/dao/logs.ts` — CRUD + filtering for log_entries
  - `app/server/dao/profiles.ts` — CRUD for output_profiles
  - `app/server/dao/templates.ts` — CRUD for templates
  - `app/server/dao/transmissionKits.ts` — CRUD for transmission_kits
  - `app/server/dao/watchdogEvents.ts` — CRUD + query for watchdog_events
  - `app/server/dao/metadataSnapshots.ts` — CRUD for metadata_snapshots
  - `app/server/dao/streams.ts` — CRUD for streams
  - `app/server/dao/schedules.ts` — CRUD for schedules
  - `app/server/dao/userAssets.ts` — CRUD for user_assets
- Each DAO exports: `insert()`, `update()`, `delete()`, `getById()`, `getAll()`, `query(filters)`
- All DAO functions are pure (no Vue imports), accept/return typed interfaces

Tests:
- Unit: `app/__tests__/server/dao.test.ts` — each DAO CRUD operation
- Verify 100% coverage on DAO layer

### A.3 — Database Singleton & Lifecycle

Tasks:
- Create `app/server/database.ts` — high-level database facade
  - Combines initialization + DAO access
  - Exports `database` singleton with `.initialize()`, `.isReady()`, `.close()`
  - Provides typed accessors: `.destinations`, `.logs`, `.profiles`, etc.
- Create `app/composables/useDatabase.ts` — Vue composable wrapping
  - Returns `{ ready: Ref<boolean>, database: Database }`
  - Handles async initialization
  - Provides reactive error state

Tests:
- Unit: `app/__tests__/server/database.test.ts` — initialization lifecycle
- Integration: composable provides ready state

---

## Milestone B — Destination Persistence

Goal: destinations survive page reloads, status changes persisted immediately.

### B.1 — Migrate Destinations to Store + DB

Tasks:
- Update `SycoAppState.destinations` to be hydrated from database on init
- Create `app/server/repositories/destinationRepository.ts`:
  - `findAll()` → DestinationState[]
  - `insert(dest)` → DestinationState
  - `update(id, patch)` → DestinationState
  - `delete(id)` → void
  - `findById(id)` → DestinationState | undefined
- Modify `useDestinationMatrix` composable:
  - On mount: load all destinations from database
  - `addDestination()`: insert to DB then update store
  - `removeDestination()`: delete from DB then update store
  - `updateDestinationStatus()`: update DB then update store
  - `getDestination()`: query from store (already loaded)
- Add `hydrateDestinations()` to store initialization

Tests:
- Unit: `app/__tests__/features/destination-persistence.test.ts` — CRUD through DB
- Integration: `app/__tests__/composables/destination-db.test.ts` — composable loads from DB
- E2E: `tests/e2e/destinations-persistence.spec.ts` — add destination, reload, verify persisted

### B.2 — Auto-Save on Status Change

Tasks:
- Ensure `updateDestinationStatus()` writes to DB synchronously before store update
- Add optimistic update pattern: store first (instant UI), DB write in background
- Add error handling: if DB write fails, revert store and show error log entry

Tests:
- Unit: verify status change triggers DB write
- Unit: verify rollback on DB failure

### B.3 — Session Restore on Load

Tasks:
- On app startup, `useDatabase.initialize()` loads all destinations into store
- Destinations appear in UI immediately after hydration
- Status shows last persisted state (not reset to 'idle')

Tests:
- E2E: configure destinations, reload page, verify all cards present with correct status
- Unit: hydration populates store correctly

---

## Milestone C — Log Persistence

Goal: log entries stored in database, queryable by time/severity.

### C.1 — Migrate Logs to Database

Tasks:
- Create `app/server/repositories/logRepository.ts`:
  - `insert(entry)` → LogEntry
  - `findAll(limit?: number)` → LogEntry[]
  - `findByLevel(level)` → LogEntry[]
  - `findByTimeRange(from, to)` → LogEntry[]
  - `delete(id)` → void
  - `clear()` → void
  - `count()` → number
- Modify `useLogs` composable:
  - Remove local `ref<LogEntry[]>` (or use as cache)
  - On mount: load last 100 entries from DB
  - `append()`: insert to DB, then add to local cache
  - `filterByLevel()`: query from DB with level filter
  - `clear()`: delete all from DB, clear cache
- Add log retention: keep last N entries, auto-prune on insert

Tests:
- Unit: `app/__tests__/features/log-persistence.test.ts` — CRUD through DB
- Integration: composable loads historical logs on mount
- E2E: add logs, reload, verify history preserved

### C.2 — Advanced Log Queries

Tasks:
- Add `searchLogs(query)` — full-text search on message
- Add `getLogsBySource(source)` — filter by source
- Add `getLogsBySeverity(severity)` — filter by level
- Add pagination: `getLogs(offset, limit)` for large datasets

Tests:
- Unit: each query returns expected results
- Performance: test with 1000+ entries

### C.3 — Log Retention Configuration

Tasks:
- Add `logRetentionCount` to app settings (default: 1000)
- On insert: if count > retention, delete oldest entries
- Expose `setLogRetention(count)` function

Tests:
- Unit: verify old entries pruned when limit exceeded
- Unit: verify retention count configurable

---

## Milestone D — Template & Profile Persistence

Goal: templates, output profiles, and transmission kits survive reloads.

### D.1 — Template Persistence

Tasks:
- Create `app/server/repositories/templateRepository.ts`:
  - `findAll()` → Template[]
  - `insert(tmpl)` → Template
  - `update(id, patch)` → Template
  - `delete(id)` → void
  - `findByProvider(provider)` → Template[]
- Modify `useTemplates` composable:
  - Remove hardcoded seed data (or keep as defaults if DB empty)
  - On mount: load from DB
  - `addTemplate()`: insert to DB then update store
  - `removeTemplate()`: delete from DB then update store
  - `getByProvider()`: query from DB

Tests:
- Unit: `app/__tests__/features/template-persistence.test.ts`
- E2E: create template, reload, verify present

### D.2 — Output Profile Persistence

Tasks:
- Create `app/server/repositories/profileRepository.ts`:
  - `findAll()` → OutputProfile[]
  - `insert(profile)` → OutputProfile
  - `update(id, patch)` → OutputProfile
  - `delete(id)` → void
  - `findById(id)` → OutputProfile | undefined
- Modify `useOutputProfiles` composable:
  - Load from DB on mount
  - `addProfile()`: insert to DB then update store
  - `removeProfile()`: delete from DB then update store
  - `getProfile()`: query from store (already loaded)

Tests:
- Unit: `app/__tests__/features/profile-persistence.test.ts`

### D.3 — Transmission Kit Persistence

Tasks:
- Create `app/server/repositories/transmissionKitRepository.ts`:
  - `findByDestinationId(destId)` → TransmissionKit[]
  - `insert(kit)` → TransmissionKit
  - `update(id, patch)` → TransmissionKit
  - `delete(id)` → void
- Modify `useTransmissionKit` composable:
  - Load from DB on mount (or lazy-load per destination)
  - `generate()`: insert to DB then update local state
  - `reset()`: delete from DB then clear local state

Tests:
- Unit: `app/__tests__/features/transmission-kit-persistence.test.ts`

---

## Milestone E — Configuration Import/Export

Goal: full configuration backup/restore as JSON.

### E.1 — Export Service

Tasks:
- Create `app/server/services/exportService.ts`:
  - `exportAll()` → JSON string with all entities
  - `exportDestinations()` → JSON string
  - `exportProfiles()` → JSON string
  - `exportTemplates()` → JSON string
  - `exportLogs(limit?)` → JSON string
- Add download trigger: `downloadJSON(content, filename)`
- Wire to UI: export buttons in each panel

Tests:
- Unit: `app/__tests__/server/exportService.test.ts` — export produces valid JSON
- Unit: exported JSON can be re-imported

### E.2 — Import Service

Tasks:
- Create `app/server/services/importService.ts`:
  - `importAll(json)` → import result summary
  - `importDestinations(json)` → import result
  - `importProfiles(json)` → import result
  - `importTemplates(json)` → import result
- Add conflict resolution: skip duplicates, overwrite, or merge
- Validate schema before import
- Wire to UI: import file picker in each panel

Tests:
- Unit: `app/__tests__/server/importService.test.ts` — import valid JSON
- Unit: import handles invalid JSON gracefully
- Unit: conflict resolution works correctly

### E.3 — Selective Export

Tasks:
- Add `exportSelection(entities: string[])` — export only specified entity types
- Add UI checkboxes for which entities to export
- Add file picker for import with entity type detection

Tests:
- Unit: selective export includes only requested entities

---

## Milestone F — Session Restore

Goal: app restores full operator state on page load.

### F.1 — Session State Persistence

Tasks:
- Create `app/server/repositories/sessionRepository.ts`:
  - `saveSession(state)` → void
  - `loadSession()` → Partial<SycoAppState> | null
  - `clearSession()` → void
- Persist: live status, source URL, ingest status, pipeline health, uptime
- Persist: last N metadata snapshots for quick restore

Tests:
- Unit: `app/__tests__/server/sessionRepository.test.ts`

### F.2 — Metadata Restore

Tasks:
- On load: restore title, artist, show name, artwork URL from last metadata snapshot
- Restore listener count and bitrate from last known values
- Show "restored from session" indicator in UI

Tests:
- E2E: set metadata, reload, verify restored

### F.3 — Pipeline State Restore

Tasks:
- On load: restore pipeline health from DB
- Restore stream status (online/offline/standby)
- Show uptime as "last known: X" if session expired

Tests:
- E2E: set pipeline to degraded, reload, verify status shown

---

## Milestone G — Watchdog Persistence

Goal: watchdog events stored and queryable.

### G.1 — Watchdog Event Persistence

Tasks:
- Create `app/server/repositories/watchdogEventRepository.ts`:
  - `insert(event)` → WatchdogEvent
  - `findAll(limit?)` → WatchdogEvent[]
  - `findBySeverity(severity)` → WatchdogEvent[]
  - `findByTimeRange(from, to)` → WatchdogEvent[]
  - `getRecent(count)` → WatchdogEvent[]
- Modify `useWatchdog` composable:
  - Load recent events from DB on mount
  - `reportEvent()`: insert to DB then update local state
  - `clearEvents()`: delete all from DB then clear local state

Tests:
- Unit: `app/__tests__/features/watchdog-persistence.test.ts`

### G.2 — Watchdog Timeline View

Tasks:
- Add timeline component showing events chronologically
- Group by severity with color coding
- Add time range filter (last hour, last 24h, last 7d)

Tests:
- Unit: timeline grouping logic
- E2E: trigger events, verify timeline shows them

---

## Implementation Order

```
Milestone A (Database Foundation)
  ├── A.1 Database initialization
  ├── A.2 DAO layer (all 10 entities)
  └── A.3 Database facade + composable

Milestone B (Destination Persistence) — highest ROI
  ├── B.1 Repository + composable migration
  ├── B.2 Auto-save on status change
  └── B.3 Session restore on load

Milestone C (Log Persistence)
  ├── C.1 Repository + composable migration
  ├── C.2 Advanced queries
  └── C.3 Log retention

Milestone D (Template & Profile Persistence)
  ├── D.1 Template persistence
  ├── D.2 Profile persistence
  └── D.3 Transmission kit persistence

Milestone E (Import/Export)
  ├── E.1 Export service
  ├── E.2 Import service
  └── E.3 Selective export

Milestone F (Session Restore)
  ├── F.1 Session state persistence
  ├── F.2 Metadata restore
  └── F.3 Pipeline state restore

Milestone G (Watchdog Persistence)
  ├── G.1 Event persistence
  └── G.2 Timeline view
```

## Technology Decision

| Concern | Recommendation |
|---------|---------------|
| SQLite in browser | `sql.js` (WASM, pure JS, no native deps) |
| SQLite in Node/Electron | `better-sqlite3` (synchronous, fast) |
| Abstraction | Repository pattern — swap sql.js for real backend later |
| Schema management | `PRAGMA user_version` + migration scripts |
| Data format | All JSON columns stored as TEXT in SQLite |
| Error handling | Graceful fallback to in-memory if DB fails |

## Test Strategy

Each milestone must maintain 100% coverage:

```
npm run test          # all unit + integration
npm run test:coverage # verify 100% on all tracked files
npm run e2e           # Playwright specs for persistence flows
npm run build         # production build succeeds
```

## Files to Create

```
app/server/
├── db.ts                          # Database initialization
├── database.ts                    # High-level facade
├── dao/
│   ├── destinations.ts
│   ├── logs.ts
│   ├── profiles.ts
│   ├── templates.ts
│   ├── transmissionKits.ts
│   ├── watchdogEvents.ts
│   ├── metadataSnapshots.ts
│   ├── streams.ts
│   ├── schedules.ts
│   └── userAssets.ts
├── repositories/                  # Higher-level entity operations
│   ├── destinationRepository.ts
│   ├── logRepository.ts
│   ├── profileRepository.ts
│   ├── templateRepository.ts
│   ├── transmissionKitRepository.ts
│   ├── watchdogEventRepository.ts
│   └── sessionRepository.ts
└── services/
    ├── exportService.ts
    └── importService.ts

app/composables/
├── useDatabase.ts                 # Database lifecycle composable
├── useLogs.ts                     # Migrated to DB-backed
├── useOutputProfiles.ts           # Migrated to DB-backed
├── useTemplates.ts                # Migrated to DB-backed
├── useTransmissionKit.ts          # Migrated to DB-backed
└── useWatchdog.ts                 # Migrated to DB-backed

app/__tests__/
├── server/
│   ├── db.test.ts
│   ├── database.test.ts
│   ├── dao.test.ts
│   ├── exportService.test.ts
│   └── importService.test.ts
├── features/
│   ├── destination-persistence.test.ts
│   ├── log-persistence.test.ts
│   ├── template-persistence.test.ts
│   ├── profile-persistence.test.ts
│   ├── transmission-kit-persistence.test.ts
│   └── watchdog-persistence.test.ts
└── composables/
    ├── destination-db.test.ts
    ├── log-db.test.ts
    └── session-restore.test.ts

tests/e2e/
├── destinations-persistence.spec.ts
├── logs-persistence.spec.ts
├── templates-persistence.spec.ts
├── import-export.spec.ts
└── session-restore.spec.ts
```
