# Architecture — SYCO23 Multicast Control

Stack and routing summary derived from prompts, spec, and source files.

## Framework/Language
- Nuxt 3
- TypeScript
- Vue 3 SFC
- Tailwind CSS utilities
- CSS custom properties as token source of truth (`assets/css/variables.css`)

## State
- Pinia or composable-based shared reactive state
- One canonical state model
- No event bus
- No unauthorized prop drilling

## Backend
- Nitro server routes
- SQLite via `better-sqlite3`
- Local metadata middleware, file-based persistence

## Media Pipeline
- FFmpeg spawned child processes
- Multi-destination fan-out via RTMP/RTMPS targets
- Per-provider output profiles

## Key Composables
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

## Deployment Modes
- Ubuntu bare metal / PM2
- Docker Compose local
- Vercel UI + stateless API routes only; media pipeline runs separately
