# Components Layer

## Purpose

Vue 3 Single-File Components (SFCs) rendering the multicast control UI. Components are thin presentation layers — all business logic lives in `composables/`. Components are excluded from coverage thresholds.

## Ownership

Part of `syco23-multicast-control`. Owned by the parent project.

## Local Contracts

### Component Map

| File | Responsibility |
|---|---|
| `app.vue` | Root shell: header, nav, main layout; wires composables |
| `LiveControl.vue` | Stream start/stop, metadata display, pipeline controls |
| `SycoVideoPlayer.vue` | Video preview player (ingest playback) |
| `DestinationMatrix.vue` | Destination grid: status, health, arm/disarm per destination |
| `TemplateGallery.vue` | Template selection and preview |
| `LogViewer.vue` | Log entry list with level filtering |

### Conventions

- `<script setup lang="ts">` only — no Options API
- No inline business logic: delegate to composables via `import { useX } from '../composables/'`
- No direct `store.ts` imports — always go through a composable
- Props/emits must be typed with `defineProps<T>()` / `defineEmits<T>()`
- Components are excluded from `vitest.config.ts` coverage — do not add test-critical logic here
- CSS: plain `.css` or scoped `<style>` — no preprocessor (no SCSS/Less)

## Verification

- `npm run typecheck` — `vue-tsc --noEmit` validates SFC types
- `npm run lint` — ESLint validates `.vue` files
- `npm run build` — Vite production build succeeds
- `npm run e2e` — Playwright specs exercise components

## Child DOX Index

None — components are flat within `components/`.
