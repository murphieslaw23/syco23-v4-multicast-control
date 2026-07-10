# SYCO23 v4 — Agent Build Prompt

**Use this as the complete initial instruction to an agent tasked with building SYCO23 Multicast Control from scratch.**

---

## Product Directive

Build a production-ready Nuxt 3 application called **SYCO23 Multicast Control**. This is a live broadcast control surface for routing a single inbound program feed to multiple outbound destinations simultaneously. It must be a real, maintainable full-stack codebase — not a static prototype, not a single-file demo, not a sandbox artifact.

The app is built for an underground tekno/freetekno broadcast operation. All design decisions must follow the SYCO23 v4 brand: mechanical totem, ritual-industrial, stacked, heavy, anti-commercial. No terminal aesthetics, no neon rave visuals, no cyberpunk styling, no generic SaaS dashboard patterns, no glossy gradients.

---

## Required Stack

- **Framework:** Nuxt 3 with SSR or hybrid rendering
- **Language:** TypeScript throughout
- **Frontend:** Vue 3 Composition API, Vue Single File Components
- **Styling:** Tailwind CSS for composition-level utilities only; CSS custom properties (`assets/css/variables.css`) are the sole source of truth for all design tokens
- **State:** Pinia or Nuxt composables — one canonical shared state model
- **Backend:** Nitro server routes for all API, metadata, and data access
- **Database:** SQLite via `better-sqlite3` or equivalent — persistent, file-based
- **Media pipeline:** FFmpeg managed as spawned child processes
- **Deployment:** Ubuntu (bare metal / PM2), macOS (Docker Compose), Vercel (UI + stateless API routes only)

External libraries permitted when technically justified. Keep dependencies lean. Avoid generic UI component frameworks that override the SYCO23 design system.

---

## Architecture Rules

- Standard Nuxt 3 folder structure: `components/`, `composables/`, `pages/`, `server/`, `assets/`, `public/`.
- One root `AppShell.vue` owning global layout, background rendering, responsive mode detection, drawers, modals, and shared live state.
- One canonical reactive state model across all views and components.
- Stream/session control state independent from route transitions.
- Separate composables for metadata polling, stream control, and UI state.
- A failed metadata fetch must never collapse stream control.
- No duplicated stream or session logic across pages or component trees.
- Components receive shared reactive data and emit user intent. They do not self-fetch source data unless explicitly designated server-integrated utility modules.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Live control |
| `/destinations` | Provider management, output profiles, transmission kits |
| `/templates` | Template gallery, custom builder |
| `/schedule` | Planned transmissions and presets |
| `/archive` | Past sessions and outcomes |
| `/status` | Diagnostics, pipeline health, watchdog |
| `/logs` | Colorized real-time and historical log viewer |
| `/overlay` | Broadcast-safe minimal output |
| `/about` | Identity and network description |

---

## Feature Requirements

### Multistream Routing
Route one inbound feed to any combination of: YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook. Support future custom RTMP targets. Model each provider as a typed `ProviderDestination`. Destination states: `idle | configured | armed | connecting | live | degraded | failed | cooldown | disabled`.

### Stream Creation and Template System
- Visual template gallery with generated preview images when creating a stream.
- Dummy text acceptable in previews — each must reflect SYCO23 v4 visual treatment and layout structure.
- Users can build custom templates using their own uploaded background images.
- Templates must be provider-aware, responsive, and stored persistently in SQLite.

### Custom Output Profiles
- User-defined per-provider output profiles.
- Built-in presets: 16:9 YouTube output, Telegram-adapted output.
- Profiles reusable, editable, integrated into routing pipeline.

### Provider Transmission Kit
- When a provider is configured, generate an individual transmission kit.
- Kit contains copy-paste-ready assets: title blocks, description blocks, metadata snippets, labels, launch notes.
- All kit assets adapted to selected provider and template, styled in SYCO23 v4 brand language.
- Kits stored persistently and regenerable.

### Frontend Video Player
- Built-in `SycoVideoPlayer.vue` for previewing the live built stream.
- HLS playback at minimum.
- Styled within SYCO23 v4 visual system — no generic HTML5 player chrome.
- Architected for future embedding in the external public-facing webapp.
- Integrated with shared stream state composable.

### Colorized Log System
- Real-time log panel with color-coded levels: info, warning, error, success, debug.
- Filterable by level and source.
- Stored persistently in SQLite with timestamps.
- Accessible in the `/logs` route and as a collapsible panel from the main control surface.
- Mobile-readable without breaking the primary live-control layout.

### AzuraCast Metadata Middleware
- Server-side middleware at `server/services/metadata/`.
- Polls AzuraCast public API server-side on a configurable interval.
- Normalizes and enriches responses, persists relevant fields to local SQLite.
- Executes custom SQLite queries to surface extended stats beyond the public API.
- Serves clean typed JSON to frontend via `/api/metadata` and `/api/metadata/stats`.
- Frontend never calls AzuraCast directly — all metadata flows through this middleware.
- Fully decoupled from stream control layer.

### Watchdog Service
- Monitors ingest connections, FFmpeg child processes, and outbound provider sessions.
- Detects stalled, frozen, or failed states via configurable thresholds.
- Triggers recovery: RTMP reconnect cycles, FFmpeg subprocess restart.
- Surfaces diagnostics to colorized log and `/api/watchdog`.
- Minimal CPU/memory overhead — must not compete with the live pipeline.
- Runs as a Node.js background service within the app process or as a Docker sidecar.

### Persistence (SQLite)
Persist: providers, stream sessions, templates, user background image references, output profiles, transmission kits, schedules, log entries, metadata snapshots, watchdog events, user assets. Full operational state must survive and restore cleanly after a process restart.

### FFmpeg Pipeline
- Spawn FFmpeg as child processes.
- Handle per-provider encoding and muxing from selected output profiles.
- Fan out to multiple destinations simultaneously.
- Report frame rate, bitrate, and pipeline health to the watchdog.

---

## Composables

| Composable | Responsibility |
|---|---|
| `useSourceIngest` | Source connection, ingest state, reconnect logic |
| `useDestinationMatrix` | Provider list, per-destination control and routing |
| `useOutputProfiles` | Profile CRUD, encoder configuration |
| `useSycoMetadata` | AzuraCast middleware polling, normalized data |
| `useSycoStream` | Audio/video playback state and controls |
| `useWatchdog` | Watchdog health reporting and recovery events |
| `useLogs` | Log subscription, filtering, persistence bridge |
| `useSycoLayout` | Responsive mode detection and orientation |
| `useSycoUiState` | Drawers, modals, nav collapse, overlay state |
| `useTemplates` | Template CRUD, preview generation, custom asset management |
| `useTransmissionKit` | Kit generation and provider-specific asset rendering |

---

## Design System Requirements

- Global token file: `assets/css/variables.css`.
- Token groups: colors, typography, spacing, radius, shadows, blur levels, motion timings, z-layer indices.
- Tailwind may reference tokens but must not replace them.
- Dark mineral base surfaces. Signal accent colors from SYCO23 v4 palette (rust orange, deep crimson, dull amber, oxidized copper, dirty turquoise, burnt ochre).
- Display typography: bold, condensed, industrial.
- Body/UI typography: clean, readable.
- No glossy gradients, no bubbly radius everywhere, no colored card borders, no icon-in-circle patterns.

---

## Layout Requirements

- Mobile-first. Design at 375px portrait first, then expand.
- Desktop: primary live-control surface scroll-free. Drawers for secondary detail.
- Portrait: stacked priority panels, floating bottom nav with idle-collapse.
- Tablet: desktop-like logic, more vertical flexibility.
- TV: large type, strong safe zones, calm motion.
- Layout engine selects the variant. Components must not invent their own layout logic.

---

## Accessibility

- Keyboard focus on every interactive element.
- Touch targets minimum 44x44px.
- Status never communicated by color alone.
- `prefers-reduced-motion` respected globally.
- WCAG AA contrast on all text/surface combinations.

---

## Deployment

**Ubuntu (bare metal / PM2):**
Node.js direct or PM2 process manager. FFmpeg and SQLite available natively. Environment config via `.env`.

**macOS / Local (Docker Compose):**
`Dockerfile` for Nuxt app. `docker-compose.yml` with app container, optional watchdog sidecar, SQLite volume mount. Primary local development target.

**Vercel:**
`vercel.json` for Nuxt SSR deployment. UI and stateless API routes deploy to Vercel. FFmpeg pipeline and watchdog cannot run on Vercel serverless — these must run as a separate Node.js or Docker service. Document this split clearly in the README.

---

## Hard Constraints

- Build a real Nuxt 3 codebase — standard folders, pages, components, composables, server routes.
- External libraries allowed when technically justified. Keep dependencies lean.
- Do not reduce the deliverable to a static HTML file, mockup, or sandbox prototype.
- Do not use a generic SaaS dashboard aesthetic, UI kit look, or neon/cyberpunk/terminal styling.
- Do not duplicate stream or session logic across views or components.
- Do not let Tailwind or third-party components replace the SYCO23 token system.

---

## Build Phase Order

Deliver in this sequence. Keep the base broadcast-control experience stable before adding atmosphere.

1. Root shell, global token file, design system baseline.
2. SQLite schema, typed models, mock API routes.
3. AzuraCast metadata middleware and `useSycoMetadata`.
4. Live control view — source panel, destination matrix, alert rail.
5. Destination CRUD, output profiles, transmission kit generation.
6. Template gallery, preview generation, custom template builder.
7. FFmpeg pipeline service and outbound routing.
8. Watchdog service and colorized log system.
9. Video player component (`SycoVideoPlayer.vue`).
10. Schedule and archive views.
11. Status and diagnostics view.
12. Overlay view.
13. Responsive layout polish — portrait, tablet, TV-safe.
14. Deployment configurations — Ubuntu, Docker Compose, Vercel.
15. README with setup, architecture, deployment paths, and provider extension guide.

---

## Deliverables

- Full Nuxt 3 TypeScript codebase.
- Modular Vue SFC component tree.
- Global design token system (`assets/css/variables.css`).
- Mock server routes and typed interfaces for all entities.
- Responsive views: desktop, portrait, tablet, TV-safe.
- SQLite schema and migration baseline.
- FFmpeg pipeline manager module.
- Watchdog service.
- AzuraCast metadata middleware.
- `Dockerfile`, `docker-compose.yml`, `vercel.json`.
- `README.md` with setup, architecture overview, all deployment paths, and guide for adding new providers.
