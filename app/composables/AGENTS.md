# Composables Layer

## Purpose

Vue 3 composables providing all reactive state and business logic for the multicast control panel. This is the primary test target — 100% coverage is enforced here. Components must delegate logic to composables; composables must not import from `components/`.

## Ownership

Part of `syco23-multicast-control`. Owned by the parent project.

## Local Contracts

### Module Map

| File | Responsibility |
|---|---|
| `store.ts` | Single `reactive<SycoAppState>` singleton, `getSycoAppState()`, `updateSycoAppState()` |
| `layout.ts` | `detectLayout()`, `watchLayout()` — viewport-based UI mode detection |
| `useSycoLayout.ts` | Vue wrapper for layout detection (watches `resize`) |
| `useSycoUiState.ts` | Read-only access to app state + derived title |
| `useSycoStream.ts` | Play/pause/volume control for ingest stream |
| `useSourceIngest.ts` | Connect/disconnect/reconnect lifecycle for source URL |
| `usePipeline.ts` | Pipeline start/stop/restart, health reporting |
| `useWatchdog.ts` | Watchdog event reporting + health computed |
| `useWatchdogService.ts` | Watchdog service integration |
| `useSycoMetadata.ts` | NowPlaying state + refresh |
| `useLogs.ts` | Log entry append, filter, clear |
| `useOutputProfiles.ts` | Output profile CRUD |
| `useTemplates.ts` | Template gallery state |
| `useDestinationMatrix.ts` | Destination matrix logic |
| `useTransmissionKit.ts` | Transmission kit metadata |

### Conventions

- Composables return plain objects with `ref`/`computed` values — no class instances
- State mutations go through `updateSycoAppState()` in `store.ts`; no direct `state.x = y` outside the store
- Browser APIs (`window`, `document`, `crypto`) must be guarded with `typeof window` checks
- Each composable exports a TypeScript interface for its return type (e.g., `UsePipelineReturn`)
- Composables must not import from `../components/`

## Verification

- `npm run test` — runs `app/__tests__/composables/*.test.ts` and `app/__tests__/features/*.test.ts`
- `npm run test:coverage` — 100% threshold on `app/composables/**`
- `npm run typecheck` — strict TS check

## Child DOX Index

None — composables are flat within `composables/`.
