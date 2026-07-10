# SYCO23 Multicast Control — Master Product Spec v4.1

**Brand:** SYSTEM CORRUPT / SYCO23  
**Version:** SYCO23 V4.1  
**Status:** Developer-ready  
**Scope:** Separated multi-project ecosystem specification

---

## 1. Ecosystem Structure

SYCO23 V4.1 separates the platform into four distinct but connected projects:

1. **syco23-webplayer** — the public-facing listening surface and future embeddable playback interface.
2. **syco23-transmission** — the multistream transmission control webapp for operators.
3. **AzuraCast on Linode VPS** — the radio backend, source of station metadata, automation, stream ingest, and canonical station services.
4. **syco23bot + syco23adminbot** — the Telegram bot project for listener-facing actions and operator/admin workflows.

These projects must share the same brand language, metadata logic, naming system, and operational assumptions, but they must not collapse into one monolith. They are separate products inside one SYCO23 ecosystem.

---

## 2. Brand Core V4.1

### 2.1 Identity

- **Formal brand:** SYSTEM CORRUPT
- **Public surface:** SYCO23
- **Compact shorthand:** SYCO

### 2.2 Visual Voice

- Mechanical totem
- Ancient visual energy
- Large sound-system scale
- Heavy, functional, ritual-industrial presence
- Dark mineral surfaces, worn metal, oxidation, grill and vent logic, stacked forms, strong vertical axes

### 2.3 Must Avoid

- Terminal or console aesthetic
- Neon rave styling
- Cyberpunk UI
- Glossy startup gradients
- Generic SaaS dashboard look
- Vinyl-player metaphors
- Legacy naming such as BASSLIVE or BLR23

### 2.4 System-Wide UX Rules

- Mobile-first and fully responsive where user-facing.
- One dominant key color per screen, mode, or campaign.
- Motion must behave like signal or machinery, never decorative fluff.
- Accessibility is mandatory even in brutalist or industrial presentation.
- Important states must never rely on color alone.

---

## 3. Shared Architecture Principles

These rules apply across all projects where relevant:

- Modular architecture over single-file output.
- Shared token logic and coherent naming across interfaces.
- Lean dependencies are preferred, but external libraries are allowed when justified.
- Persist important operational and editorial data.
- Use middleware where raw third-party APIs are too limited or unstable for frontend use.
- Separate presentation state from stream/control state.
- Build for stability under live conditions.

---

## 4. Project: syco23-webplayer

### 4.1 Purpose

The webplayer is the public listening surface for SYCO23. It is the branded player experience for listeners and the future embeddable playback interface that can also host the built stream preview logic now developed in the transmission app.

### 4.2 Main Features

- Public audio playback for live station stream.
- Future-ready frontend video player surface for embedded video/live preview contexts.
- Now-playing metadata from SYCO23 middleware, not directly from raw AzuraCast responses.
- Cover art, background art, show info, listener-facing status, archive hooks, and future schedule integration.
- Mobile portrait-first player layout, with desktop landscape and TV-safe variants.
- Persistent playback across navigation changes where technically possible.
- Optional low-cost visualizer layer that never obscures core playback UI.

### 4.3 UX Rules

- Desktop main player must feel immersive and stable, not like a dashboard.
- Portrait mode must stack content clearly with thumb-safe controls.
- Playback UI must remain readable under degraded metadata or missing artwork states.
- The player must support future embed mode with simplified chrome.

### 4.4 Technical Direction

- Nuxt 3, Vue 3 Composition API, TypeScript.
- Shared composables for playback, metadata, layout, and UI state.
- CSS variables as token source of truth.
- Metadata delivered through SYCO23 middleware layer.
- Can be deployed on Vercel or equivalent frontend-friendly platform if stream/runtime constraints permit.

---

## 5. Project: syco23-transmission

### 5.1 Purpose

The transmission app is the operator-facing multistream control surface. It manages source ingest, templates, output profiles, provider delivery, transmission kits, monitoring, logs, watchdog recovery, and stream preview.

### 5.2 Main Features

- One inbound program feed routed to multiple outbound providers.
- Supported first-class providers: YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook.
- Support for future custom RTMP destinations.
- Template gallery with generated preview images during stream creation.
- Custom template builder with user background images.
- Provider-specific transmission kits with copy-paste-ready text/assets adapted to provider and template.
- Custom output profiles including 16:9 YouTube and Telegram-oriented variants.
- Built-in frontend video player for previewing the built live stream.
- Colorized live log system.
- SQLite persistence for all critical entities.
- FFmpeg-based multistream pipeline.
- Ultra-efficient watchdog service.
- Status, diagnostics, schedule, archive, and overlay views.

### 5.3 Data and Control Requirements

- Canonical shared stream/session state.
- Metadata must come from middleware, not raw frontend polling.
- Watchdog supervises ingest, FFmpeg processes, and outbound states.
- Operator UI must remain usable under partial failure conditions.
- Restart or reconnect actions must be explicit and visible.

### 5.4 Technical Direction

- Nuxt 3 + Vue 3 + TypeScript.
- Nitro server routes.
- SQLite persistence.
- FFmpeg as managed child processes.
- Optional Docker sidecar for watchdog if needed.
- Ubuntu and Docker Compose are primary deployment targets.
- Vercel may host UI or stateless routes only; not FFmpeg/watchdog runtime.

---

## 6. Project: AzuraCast on Linode VPS

### 6.1 Purpose

AzuraCast on the Linode VPS is the station backbone. It is the canonical radio backend for stream ingest, automation, source distribution, and public API availability, but it is not the sole product surface and should not be overloaded with custom presentation concerns.

### 6.2 Main Features / Responsibilities

- Host and operate the main station stream.
- Provide canonical now-playing and station data.
- Handle station scheduling/automation where applicable.
- Expose public API and base metadata.
- Serve as trusted upstream for the SYCO23 middleware layer.
- Provide source endpoints and operational health data to transmission and webplayer projects.

### 6.3 Extension Rules

- Do not force every custom reporting need directly into frontend consumption of the public API.
- Where more stats, enriched history, or custom queries are needed, use SYCO23 middleware and local persistence layers.
- Keep AzuraCast installation maintainable, update-safe, and infrastructure-focused.

### 6.4 Operational Notes

- Hosted on Linode VPS.
- Must be treated as infrastructure, not as the main UI platform.
- Backups, monitoring, credentials, and source health are critical.

---

## 7. Project: syco23bot + syco23adminbot

### 7.1 Purpose

This project contains the listener-facing Telegram bot and the admin/operator Telegram bot workflows. It extends SYCO23 into Telegram as both a community surface and an operational tool.

### 7.2 Bot Split

- **syco23bot** — public/community bot.
- **syco23adminbot** — restricted admin/operator bot.

### 7.3 Main Features

**syco23bot**
- Live status queries.
- Now playing / current show lookup.
- Stream links and listening actions.
- Schedule or upcoming broadcast info.
- Archive or replay links where available.
- Branded lightweight broadcast notifications.

**syco23adminbot**
- Stream state checks.
- Outbound provider summary.
- Quick alerting on failure, degraded state, or restart events.
- Manual operator actions where safe, such as acknowledge, retry, or status request.
- Delivery of transmission summaries, logs, or kit references.

### 7.4 Integration Rules

- Bots should consume normalized SYCO23 middleware or transmission APIs, not fragile raw platform responses.
- Public bot should stay simple and useful.
- Admin bot should be low-latency, direct, and operational.
- Both must preserve SYCO23 naming and tonal consistency.

---

## 8. Cross-Project Shared Services

These shared concerns must be defined once and reused where possible:

- Brand token logic
- Metadata normalization layer
- Naming conventions
- Artwork / image asset rules
- Transmission kit formatting logic
- Schedule data model
- Status vocabulary: online, reconnecting, offline, standby, degraded, failed, cooldown
- Auth and role boundaries for admin functions

---

## 9. Delivery Priorities V4.1

### Phase A
- Stabilize AzuraCast on Linode VPS.
- Build metadata middleware strategy.
- Define shared status vocabulary and token system.

### Phase B
- Build syco23-webplayer public listening surface.
- Build initial public bot features.

### Phase C
- Build syco23-transmission core multistream app.
- Add templates, transmission kits, output profiles, preview player, logs, and watchdog.

### Phase D
- Expand admin bot integration for operational workflows.
- Add deeper analytics, archive, and extended diagnostics.
