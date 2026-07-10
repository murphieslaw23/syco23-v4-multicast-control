# SYCO23 Multicast Control — Master Product Spec v4.0

**Product:** SYCO23 Multicast Control
**Brand:** SYSTEM CORRUPT / SYCO23
**Status:** Developer-ready
**Scope:** Full-stack Nuxt 3 broadcast control application

---

## 1. Product Definition

SYCO23 Multicast Control is a mobile-first, fully responsive broadcast control application for routing one live program feed to multiple outbound destinations simultaneously. It is built as a modular Nuxt 3 system with persistent SQLite storage, an efficient FFmpeg-based media pipeline, and an ultra-efficient watchdog service for supervision and recovery.

The system is not a consumer music player, not a social media dashboard, and not a generic SaaS analytics product. It is a transmission control surface for an underground broadcast operation, built to feel heavy, infrastructural, and dependable under live pressure. All design and engineering decisions must reflect the SYCO23 v4 brand: mechanical totem, ancient visual energy, large sound-system scale, ritual-industrial restraint.

---

## 2. Brand Identity Constraints

- **Master brand:** SYSTEM CORRUPT
- **Public surface:** SYCO23
- **Shorthand:** SYCO
- Use SYSTEM CORRUPT in formal, legal, or press contexts only. Use SYCO23 in UI, overlays, social, and broadcast output.
- Visual language: stacked forms, vertical axes, speaker-wall logic, metal plates, vents, grills, bolts, cabling logic, worn textures, carved marks, oxidation, stone-like or ritual-like surfaces.
- Colors: prefer rust orange, deep crimson, dull amber, oxidized copper, dirty turquoise, burnt ochre. Dark mineral base layers.
- Typography: bold, condensed, industrial for display; clean and readable for body and UI.
- Motion: sparse and signal-like. Glitch only as fault or transmission behavior. No decorative animation.

**Must avoid:** terminal or console aesthetics, neon rave graphics, cyberpunk styling, glossy startup UI, soft skeuomorphic cards, generic SaaS dashboard patterns.

---

## 3. Target Users

- Underground radio operators and broadcast engineers running live tekno/freetekno streams.
- DJs and sound-system operators managing multiplatform transmission in live conditions.
- Technical operators who need operational clarity under pressure.

---

## 4. Core Feature Requirements

### 4.1 Multistream Destination Routing

Route one inbound program feed to any combination of the following providers via RTMP-first outbound logic:

- YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook

Architecture must also support future custom RTMP targets. Each provider is a typed `ProviderDestination` with shared base fields and provider-specific extensions. Destination states: `idle | configured | armed | connecting | live | degraded | failed | cooldown | disabled`.

### 4.2 Stream Creation and Template System

When creating a stream, present a visual template gallery with generated preview images. Dummy text is acceptable in initial implementation but each preview must reflect SYCO23 v4 brand treatment, layout logic, and provider/output context.

Users can build custom templates using their own background images and assets. Custom templates must remain provider-aware, responsive across all layout variants, and consistent with the SYCO23 v4 token system unless the user explicitly overrides permitted fields. Templates persist in SQLite.

### 4.3 Custom Output Profiles

User-defined per-provider output profiles. Required built-in presets at minimum:

- 16:9 YouTube output
- Telegram-adapted output

Profiles must be reusable, editable, and integrated into the routing pipeline — not isolated one-off settings.

### 4.4 Provider Transmission Kit

When a user configures a provider, generate an individual transmission kit containing copy-paste-ready assets: title blocks, description blocks, metadata snippets, labels, launch notes — all adapted to the selected provider and template, styled in SYCO23 v4 brand language. Kits persist in SQLite and are regenerable.

### 4.5 Frontend Video Player

A built-in `SycoVideoPlayer.vue` for previewing the live built stream. HLS playback at minimum. Styled within SYCO23 v4 visual system — no generic HTML5 player chrome. Architected for future embedding in the external public-facing webapp. Integrated with shared stream state.

### 4.6 Colorized Log System

Real-time log panel with color-coded levels:

| Level | Color |
|---|---|
| Info | Muted base text |
| Warning | Dull amber |
| Error | Deep crimson / rust red |
| Success | Oxidized copper or dirty turquoise |
| Debug | Subdued, low-contrast |

Filterable by level and source. Persistently stored in SQLite with timestamps. Accessible in `/logs` and as a collapsible panel from the main control surface. Mobile-readable without breaking the primary live-control layout.

### 4.7 AzuraCast Metadata Middleware

A dedicated server-side metadata middleware at `server/services/metadata/`. It:

1. Polls the AzuraCast public API server-side on a configurable interval.
2. Normalizes and enriches responses, persisting relevant fields to local SQLite.
3. Executes custom SQLite queries to surface stats beyond what the public API exposes.
4. Serves clean typed JSON to frontend via `/api/metadata` and `/api/metadata/stats`.
5. Fully decouples the frontend from the raw AzuraCast API surface.

The frontend never calls AzuraCast directly. A standalone separate metadata microservice is not required — the Nuxt Nitro server layer is sufficient if properly structured.

### 4.8 Watchdog Service

An ultra-efficient watchdog service that:

- Monitors all active ingest connections, FFmpeg pipeline processes, and outbound provider sessions.
- Detects stalled, frozen, or failed states using configurable thresholds.
- Triggers recovery: RTMP reconnect cycles, FFmpeg subprocess restart.
- Surfaces diagnostics to the colorized log and `/api/watchdog`.
- Operates with minimal CPU and memory overhead — must not compete with the live pipeline.
- Runs as a lightweight Node.js background service within the app process or as a Docker sidecar.

### 4.9 Persistence (SQLite)

All critical data stored persistently in SQLite:

- Providers and their configurations
- Streams and session records
- Templates (built-in and user-created)
- User background image references
- Output profiles
- Generated transmission kits
- Schedules and presets
- Log entries with timestamps
- System events and watchdog events
- Archive of past sessions with outcomes

Full operational state must restore cleanly after a process restart.

### 4.10 FFmpeg Pipeline

Structured FFmpeg child-process management for:

- Receiving ingest from AzuraCast or another source via RTMP or HLS pull.
- Encoding and muxing output per provider output profile.
- Fanning out to multiple destinations simultaneously.
- Reporting pipeline health, frame rate, and bitrate to the watchdog and UI.

---

## 5. Information Architecture

| Route | Purpose |
|---|---|
| `/` | Live control — source state, master session, destination matrix, alert rail |
| `/destinations` | Provider management, output profiles, transmission kits |
| `/templates` | Template gallery, custom template builder |
| `/schedule` | Planned transmissions, recurring shows, launch presets |
| `/archive` | Session history, destinations reached, durations, errors |
| `/status` | Diagnostics, pipeline health, watchdog status, reconnect loops |
| `/logs` | Colorized real-time and historical log viewer |
| `/overlay` | Broadcast-safe minimal output for external display |
| `/about` | Identity and network description |

---

## 6. Layout System

The layout engine selects the variant. Components must not invent their own layout logic.

### 6.1 Desktop
Left-aligned control spine. Primary live-control surface scroll-free. Drawers for secondary detail. Restrained navigation.

### 6.2 Portrait Mobile
Stacked priority panels. Floating bottom navigation with idle-collapse. Minimum 44x44px touch targets. No hover-only patterns.

### 6.3 Tablet
Desktop-like logic with more vertical flexibility. Mild expansion for metadata and destination panels.

### 6.4 TV / 4K
Large typography, strong safe-zone discipline, reduced motion, no animated visualizers.

---

## 7. Shared State Model

One canonical reactive state object across all components and routes. No event bus patterns. No prop drilling for values used in more than one component tier.

```typescript
interface SycoAppState {
  live: boolean
  sessionId: string | null
  uptime: string | null
  streamStatus: "online" | "reconnecting" | "offline" | "standby"
  sourceUrl: string | null
  ingestStatus: "connected" | "degraded" | "failed" | "idle"
  title: string
  artist: string
  show?: string
  artworkUrl?: string
  backgroundUrl?: string
  listeners?: number
  bitrate?: number
  codec?: string
  destinations: DestinationState[]
  pipelineHealth: "ok" | "degraded" | "failed"
  uiMode: "portrait" | "landscape" | "tablet" | "tv"
  collapsedNav: boolean
}
```

---

## 8. Composable Architecture

| Composable | Responsibility |
|---|---|
| `useSourceIngest` | Source connection, ingest state, reconnect |
| `useDestinationMatrix` | Provider list, per-destination control and routing |
| `useOutputProfiles` | Profile CRUD, encoder config |
| `useSycoMetadata` | AzuraCast middleware polling, normalized now-playing |
| `useSycoStream` | Audio/video playback state and controls |
| `useWatchdog` | Watchdog health reporting and recovery events |
| `useLogs` | Log subscription, filtering, persistence bridge |
| `useSycoLayout` | Responsive mode detection and orientation |
| `useSycoUiState` | Drawers, modals, nav collapse, overlay state |
| `useTemplates` | Template CRUD, preview generation, custom asset management |
| `useTransmissionKit` | Kit generation and provider-specific asset rendering |

---

## 9. Server Architecture

### 9.1 API Routes

| Route | Purpose |
|---|---|
| `GET /api/metadata` | AzuraCast middleware — normalized now-playing |
| `GET /api/metadata/stats` | Custom enriched stats from local SQLite |
| `GET /api/status` | System, pipeline, watchdog health |
| `GET /api/destinations` | All provider destination records |
| `POST /api/destinations` | Create or update provider |
| `GET /api/destinations/:id/kit` | Generate or retrieve transmission kit |
| `GET /api/streams` | Active and past session records |
| `POST /api/streams` | Create new stream session |
| `GET /api/templates` | All templates with preview metadata |
| `POST /api/templates` | Create or save custom template |
| `GET /api/profiles` | Output profile list |
| `POST /api/profiles` | Create or update output profile |
| `GET /api/logs` | Log history with filtering |
| `GET /api/watchdog` | Watchdog status and recent events |

### 9.2 Metadata Middleware Architecture

Lives at `server/services/metadata/`. Polls AzuraCast, enriches and persists to SQLite, executes custom queries for extended stats, serves clean typed JSON to frontend. Frontend is fully decoupled from the raw AzuraCast API.

### 9.3 SQLite Tables

Core tables: `streams`, `destinations`, `output_profiles`, `templates`, `transmission_kits`, `schedules`, `log_entries`, `metadata_snapshots`, `watchdog_events`, `user_assets`.

---

## 10. Provider Destination Model

```typescript
type Provider =
  | "youtube" | "telegram" | "tiktok" | "twitch"
  | "instagram" | "mixer" | "mixcloud" | "facebook"
  | "custom-rtmp"

interface ProviderDestination {
  id: string
  provider: Provider
  label: string
  protocol: "rtmp" | "rtmps"
  endpointUrl: string
  streamKeyRef: string
  status: DestinationStatus
  health: "ok" | "degraded" | "failed" | null
  lastHandshakeAt: string | null
  lastError: string | null
  videoProfile: string
  audioProfile: string
  monitorMode: "rtmp-output" | "platform-ack" | "hls-playback"
  hlsPlaybackUrl?: string
  requiresManualPlatformSetup: boolean
  capabilities: string[]
  transmissionKitId: string | null
  notes: string
}
```

---

## 11. Design Token System

Global token file: `assets/css/variables.css`. Token groups:
- Colors, Typography, Spacing (4px grid), Radius, Shadows, Blur levels, Motion timings, Z-layer indices.

Tailwind may reference tokens but must not replace them.

---

## 12. Deployment Targets

### Ubuntu (bare metal / PM2)
Node.js direct or PM2 process manager. FFmpeg and SQLite available natively. Environment config via `.env`.

### macOS / Local (Docker Compose)
`Dockerfile` for Nuxt app. `docker-compose.yml` with app container, optional watchdog sidecar, SQLite volume mount. Primary local development target.

### Vercel
`vercel.json` for Nuxt SSR deployment. UI and stateless API routes deploy to Vercel. FFmpeg pipeline and watchdog **cannot run on Vercel serverless** — these must run as a separate Node.js or Docker service. Document this split clearly in the README.

Provide: `Dockerfile`, `docker-compose.yml`, `vercel.json`, `README.md` covering all three deployment paths.

---

## 13. Acceptance Criteria

A component is complete when it:
- Renders correctly in at least two layout variants.
- Handles loading, empty, degraded, and error states.
- Respects the shared token system without custom exceptions.
- Does not duplicate stream or session logic.
- Stays readable on low-end and high-density screens.
- Supports SYCO23 v4 brand language.

The application is release-ready when all primary routes are functional, all eight providers have full state handling, template gallery with previews works, custom builder works, transmission kits generate, video player previews the live stream, colorized log is live and filterable, AzuraCast middleware serves enriched data, SQLite persistence survives restart, watchdog monitors and recovers, and all three deployment configs are verified.

---

## 14. Implementation Phase Order

1. Root shell, global tokens, design system baseline.
2. SQLite schema, typed models, mock API routes.
3. AzuraCast metadata middleware and `useSycoMetadata`.
4. Live control view — source panel, destination matrix, alert rail.
5. Destination CRUD, output profiles, transmission kit generation.
6. Template gallery, preview generation, custom template builder.
7. FFmpeg pipeline service and output routing.
8. Watchdog service and colorized log system.
9. Video player component (`SycoVideoPlayer.vue`).
10. Schedule and archive views.
11. Status and diagnostics view.
12. Overlay view.
13. Responsive layout polish — portrait, tablet, TV-safe.
14. Deployment configs — Ubuntu, Docker Compose, Vercel.
15. README and documentation.
