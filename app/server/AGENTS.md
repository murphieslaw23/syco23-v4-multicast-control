# Server Layer

## Purpose

Framework-agnostic TypeScript modules for SYCO23 multicast control. Handles database schema, AzuraCast metadata normalization, watchdog event persistence, and API route type contracts. No Vue or browser-specific imports — runs in any Node/Bun context.

## Ownership

Part of `syco23-multicast-control`. Changes here are owned by the parent project. Do not add Vue or DOM dependencies; keep this layer portable.

## Local Contracts

### Modules

| File | Responsibility |
|---|---|
| `schema.ts` | Canonical DDL (`SCHEMA_SQL`), table list, `validateSchema()` |
| `metadata.ts` | AzuraCast API response types, `normalizeAzuraCast()`, metadata middleware factory |
| `watchdog-store.ts` | In-memory watchdog event store factory (`createWatchdogStore`) |
| `api-routes.ts` | Typed API route map (`ApiRoute`, `ApiRouteResponses`, `createApiRouteHandler`) |

### Conventions

- No `vue`, `@vue/*`, or `window`/`document` references
- Export interfaces and factory functions; no classes
- Pure functions where possible; factories for stateful modules
- Schema changes must update `REQUIRED_TABLES` and note migration impact

## Verification

- `npm run test` — runs `app/__tests__/server/schema.test.ts` and related
- `npm run typecheck` — `vue-tsc --noEmit` covers this directory
- Coverage tracked under `app/server/**` in `vitest.config.ts`

## Child DOX Index

None — modules are flat within `server/`.
