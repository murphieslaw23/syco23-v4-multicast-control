# SYCO23 V4.1 — Final Prompt Pack

---

# SYCO23 V4.1 — Short Production Prompt

Build SYCO23 as a coordinated ecosystem of four projects:

- **syco23-webplayer** — public player/listening surface
- **syco23-transmission** — operator multistream control webapp
- **AzuraCast on Linode VPS** — radio backbone and canonical station backend
- **syco23bot + syco23adminbot** — Telegram community/admin bot project

Global brand: SYSTEM CORRUPT / SYCO23. Visual rules: mechanical totem, ancient energy, sound-system scale, dark mineral surfaces, stacked forms, heavy functional presence. Avoid terminal, neon rave, cyberpunk, glossy startup, or generic SaaS styling.

Key delivery requirements:
- Shared metadata normalization strategy
- Shared status vocabulary
- Mobile-first responsive UI where user-facing
- Lean but modular architecture
- External libraries allowed when justified
- No single-file prototype constraints

### syco23-webplayer
Public live stream playback, now playing metadata, immersive branded player, persistent playback logic, future embed mode, future-compatible video/live preview support.

### syco23-transmission
Multistream routing to YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook; templates with preview images; custom template builder; provider transmission kits; custom output profiles; preview video player; colorized logs; SQLite persistence; FFmpeg pipeline; watchdog service; diagnostics and archive views.

### AzuraCast on Linode VPS
Maintain as canonical station backend and metadata source. Use SYCO23 middleware for enriched/custom stats rather than raw frontend dependence on public API shape.

### syco23bot + syco23adminbot
Public listener bot for status/links/now playing. Admin bot for alerts, health, provider state, and safe operator shortcuts.

Create or update documentation in V4.1 format, including a dedicated user stories document split by project.


---

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


---

# SYCO23 V4.1 — Long Reference Pack

## 1. Document Purpose

This V4.1 reference updates the earlier unified app framing into a separated ecosystem model. All planning, design, implementation, and documentation should now treat SYCO23 as four coordinated projects rather than a single product. This aligns better with the platform’s real operational structure, the middleware requirement around AzuraCast, and the need to distinguish listener-facing, operator-facing, infrastructure, and Telegram surfaces.

## 2. Project Split

### 2.1 syco23-webplayer
Public-facing player and listening surface. Listener-first, immersive, branded, and responsive. Future-ready for embedded playback and possible public video/live preview integration.

### 2.2 syco23-transmission
Operator-facing multistream control app. Handles outbound routing, templates, preview, kits, logs, profiles, watchdog, persistence, and diagnostics.

### 2.3 AzuraCast on Linode VPS
Station backbone and infrastructure layer. Provides canonical upstream station and now-playing data, stream ingest/distribution, and base public API. Not the main place for custom UX or enriched analytics logic.

### 2.4 syco23bot + syco23adminbot
Telegram-facing project split into public community bot and restricted admin/operator bot.

## 3. Shared Brand and System Rules

- SYSTEM CORRUPT is formal; SYCO23 is the public surface; SYCO is compact shorthand.
- Visual identity: mechanical totem, ancient visual energy, large sound-system scale.
- Avoid terminal aesthetics, neon rave styling, cyberpunk, glossy startup UI, and generic dashboards.
- Use one dominant key color per screen or mode.
- Motion should behave like signal, pressure, or machinery.
- All user-facing projects must be mobile-first and responsive.
- Accessibility is mandatory. Important states are never color-only.
- Shared metadata, status vocabulary, and token logic should be reused across the ecosystem.

## 4. Shared Vocabulary

### Status values
`online`, `reconnecting`, `offline`, `standby`, `degraded`, `failed`, `cooldown`

### Common integration concepts
- normalized metadata
- provider destination
- transmission kit
- output profile
- preview player
- archive item
- watchdog event

## 5. Detailed Project Guidance

### 5.1 syco23-webplayer
The webplayer should not feel like an admin surface. It must feel immersive, fast to access, and emotionally aligned with the SYCO23 brand while remaining practical. The player needs stable playback, clean metadata hierarchy, responsive orientation handling, and support for missing or delayed data without visual collapse.

Minimum feature expectations:
- live playback
- metadata stack
- artwork/background layer
- listener status
- persistent playback logic
- future embed mode
- future-compatible video/live preview mode
- optional lightweight visual layer that never harms readability

### 5.2 syco23-transmission
This is the most operationally dense product in the ecosystem. It should prioritize reliability, scan speed, and live recovery over decorative presentation. The design language stays SYCO23-native but must remain heavily functional.

Minimum feature expectations:
- multistream routing to supported providers
- template gallery with generated previews
- custom template builder
- provider-specific kits
- custom output profiles
- preview video player
- logs with colorized levels
- SQLite persistence
- FFmpeg pipeline supervision
- watchdog recovery service
- diagnostics, schedule, archive, overlay views
- mobile-usable control surface

### 5.3 AzuraCast on Linode VPS
Treat AzuraCast as infrastructure and upstream truth, not as the final consumer-facing data model. It should remain maintainable, update-safe, backed up, and monitored. The SYCO23 middleware layer should absorb customization pressure instead of pushing complexity into raw frontend AzuraCast usage.

Minimum responsibility set:
- canonical stream source and station backend
- public API and now-playing upstream
- ingest/distribution
- operational continuity
- safe integration point for middleware polling

### 5.4 syco23bot + syco23adminbot
The bots are an extension layer, not a clone of the webapp. Keep them concise, actionable, and role-appropriate. Public bot = access and awareness. Admin bot = health and response.

Minimum feature expectations:
- public status and now playing
- stream links
- schedule/archive hooks
- admin alerts
- provider health summaries
- safe retry/ack/status shortcuts

## 6. Documentation Set

The V4.1 documentation set must contain:
- master product spec
- user stories
- short production prompt
- agent build prompt
- final prompt pack
- document index

## 7. Main User Story Themes

- listener quick access without friction
- operator clarity under pressure
- infrastructure stability and maintainability
- metadata normalization instead of raw service coupling
- Telegram as both community and operations surface
- one ecosystem language across separated projects


---

# SYCO23 V4.1 — User Stories

This document extracts the main features from the latest evaluated SYCO23 guidelines and rewrites them as detailed user stories. The stories are separated by project.

---

## Project 1 — syco23-webplayer

### Epic: Public Listening Surface

**Story WP-01 — Live audio playback**  
As a listener, I want to open the SYCO23 webplayer and start the live stream quickly, so that I can listen without navigating through clutter or setup.

**Acceptance notes:** playback visible immediately, clear play/pause state, works on mobile portrait and desktop, readable fallback if metadata is missing.

**Story WP-02 — Persistent playback across navigation**  
As a returning listener, I want playback to continue when I move through player-related pages or views, so that the listening experience feels stable and uninterrupted.

**Acceptance notes:** playback state is not reset by normal route changes, UI state can change without killing stream state.

**Story WP-03 — Metadata-driven player**  
As a listener, I want to see now-playing data, artwork, show title, and stream state, so that the player feels alive and contextual instead of anonymous.

**Acceptance notes:** metadata comes from normalized middleware, not raw fragmented frontend calls; artwork failure must not break the player.

**Story WP-04 — Immersive branded player**  
As a listener, I want the player to feel like SYCO23 rather than a generic audio widget, so that the experience reflects the brand’s mechanical-totem and sound-system identity.

**Acceptance notes:** dark mineral surfaces, strong hierarchy, one dominant accent color, no generic SaaS card layout, no terminal styling.

**Story WP-05 — Mobile-first layout**  
As a mobile user, I want the player controls and metadata to be easy to use in portrait orientation, so that the public listening surface works naturally on a phone.

**Acceptance notes:** thumb-safe controls, stacked layout, large tap targets, no hover dependency.

**Story WP-06 — Future embed mode**  
As a product owner, I want the webplayer architecture to support a future embeddable mode, so that the player can be dropped into other SYCO23 surfaces without a redesign.

**Acceptance notes:** simplified chrome mode planned, component contracts clean enough for embed reuse.

**Story WP-07 — Video-capable future extension**  
As a product owner, I want the webplayer to be compatible with a future embedded video/live preview mode, so that the preview player work done in transmission can later surface publicly.

**Acceptance notes:** no architecture that blocks future frontend video integration.

---

## Project 2 — syco23-transmission

### Epic: Operator Multistream Control

**Story TX-01 — Create a stream from templates**  
As an operator, I want to create a stream using a gallery of templates with generated preview images, so that I can quickly choose a fitting visual format before going live.

**Acceptance notes:** preview images may use dummy text initially; previews must reflect provider context and SYCO23 branding.

**Story TX-02 — Build a custom template**  
As an operator, I want to build my own template using custom background images, so that each transmission can be adapted without leaving the SYCO23 system.

**Acceptance notes:** uploaded backgrounds supported, responsive behavior retained, provider-aware layout preserved.

**Story TX-03 — Use provider-specific output profiles**  
As an operator, I want to choose and edit output profiles like 16:9 YouTube or Telegram-adapted output, so that each destination receives a format suited to its platform.

**Acceptance notes:** reusable presets, editable profiles, tied to provider configuration and FFmpeg pipeline.

**Story TX-04 — Manage multiple providers at once**  
As an operator, I want to route one inbound feed to multiple outbound providers, so that one live session can be distributed across the SYCO23 network at the same time.

**Acceptance notes:** YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook supported as first-class destinations; custom RTMP extendable.

**Story TX-05 — Generate provider transmission kits**  
As an operator, I want the app to generate a copy-paste-ready transmission kit for each provider, so that publishing text and launch assets are fast and consistent.

**Acceptance notes:** provider + template specific; includes title blocks, descriptions, metadata snippets, labels, and launch notes.

**Story TX-06 — Preview the built stream in-app**  
As an operator, I want a frontend video player that previews the built stream, so that I can verify the visual output before or during transmission.

**Acceptance notes:** HLS-capable preview, SYCO23-styled player chrome, future-compatible with public embed use.

**Story TX-07 — Read colorized operational logs**  
As an operator, I want a colorized log view with clear levels and filters, so that I can diagnose issues quickly during a live session.

**Acceptance notes:** realtime updates, info/warning/error/success/debug states, filter by level/source, persisted in SQLite.

**Story TX-08 — Trust persistent operational data**  
As an operator, I want streams, templates, providers, output profiles, kits, schedules, and logs to persist across restarts, so that the system remains reliable over time.

**Acceptance notes:** SQLite-backed, restart-safe restoration.

**Story TX-09 — Rely on watchdog recovery**  
As an operator, I want the system to detect failed or stalled outputs and recover them efficiently, so that I do not have to watch every provider manually every second.

**Acceptance notes:** watchdog monitors ingest, FFmpeg, and provider sessions; recovery path visible; low resource cost.

**Story TX-10 — Operate on mobile when needed**  
As an operator, I want the transmission interface to remain usable on a phone, so that I can monitor or control a live stream while away from a desktop setup.

**Acceptance notes:** mobile-first, responsive, reduced density, critical controls accessible in portrait mode.

**Story TX-11 — Separate UI state from stream state**  
As an operator, I want route changes and metadata glitches to avoid collapsing the live control state, so that the transmission app remains dependable under real conditions.

**Acceptance notes:** canonical shared state, metadata failures do not kill stream control, no duplicate control logic.

---

## Project 3 — AzuraCast on Linode VPS

### Epic: Station Backbone and Metadata Source

**Story AZ-01 — Provide stable station backend**  
As a platform owner, I want AzuraCast on the Linode VPS to serve as the stable radio backbone, so that stream ingest, automation, and station data remain centralized and dependable.

**Acceptance notes:** infrastructure-first role, monitored and backed up.

**Story AZ-02 — Supply canonical now-playing data**  
As a dependent SYCO23 service, I want AzuraCast to expose the canonical station and now-playing data, so that webplayer, transmission, and bots can inherit a consistent source of truth.

**Acceptance notes:** SYCO23 middleware can poll and normalize it cleanly.

**Story AZ-03 — Stay maintainable as infrastructure**  
As an operator, I want AzuraCast to stay maintainable and update-safe, so that custom features do not turn the VPS installation into a fragile special-case system.

**Acceptance notes:** custom reporting handled outside AzuraCast where possible.

**Story AZ-04 — Support enriched metadata through middleware**  
As a product owner, I want extra stats and historical queries to live in SYCO23 middleware rather than directly in raw frontend AzuraCast calls, so that the frontend can access richer data without overloading AzuraCast’s public API model.

**Acceptance notes:** middleware layer responsible for custom enrichment and query shape.

---

## Project 4 — syco23bot + syco23adminbot

### Epic: Telegram Community and Operations

**Story BOT-01 — Listener status bot**  
As a Telegram user, I want to query live status and now-playing info through syco23bot, so that I can check the station quickly without opening the website.

**Acceptance notes:** simple commands or buttons, clear branding, normalized data source.

**Story BOT-02 — Listener stream access bot**  
As a Telegram user, I want syco23bot to send me stream links and playback-related actions, so that I can jump into listening with minimal friction.

**Acceptance notes:** useful, lightweight, not overcomplicated.

**Story BOT-03 — Schedule and archive hints**  
As a Telegram user, I want access to upcoming broadcast info and archive links when available, so that the bot becomes a practical extension of the SYCO23 listening surface.

**Acceptance notes:** hooks into shared schedule/archive model.

**Story BOT-04 — Admin stream health bot**  
As an admin, I want syco23adminbot to report stream state, provider health, and critical alerts, so that I can monitor operations remotely from Telegram.

**Acceptance notes:** degraded/failure notifications, concise status language, low-noise design.

**Story BOT-05 — Admin action shortcuts**  
As an admin, I want safe operational shortcuts such as status refresh, acknowledge alert, or retry request, so that I can react quickly without logging into the full web app for every event.

**Acceptance notes:** restricted access, explicit guardrails, no unsafe hidden actions.

**Story BOT-06 — Shared brand and naming**  
As a product owner, I want both Telegram bots to reflect SYCO23 naming and tone consistently, so that community-facing and operator-facing interactions feel like part of one system.

**Acceptance notes:** SYCO23 surface name used correctly, no legacy names.

---

## Cross-Project Stories

**Story CX-01 — Shared metadata language**  
As a platform architect, I want webplayer, transmission, AzuraCast middleware, and bots to use the same normalized metadata vocabulary, so that system integration stays coherent.

**Story CX-02 — Shared status vocabulary**  
As an operator and developer, I want consistent status labels like online, reconnecting, offline, standby, degraded, failed, and cooldown across all projects, so that states are interpreted correctly everywhere.

**Story CX-03 — Shared brand token logic**  
As a designer/developer, I want all SYCO23 projects to inherit the same token logic and visual rules, so that the ecosystem feels coherent even though it is split into separate products.


---

# SYCO23 V4.1 — Agent Build Prompt Pack

Build and maintain the SYCO23 ecosystem as four coordinated projects rather than one monolith.

## Projects

1. **syco23-webplayer** — public listening/player surface.
2. **syco23-transmission** — multistream operator webapp.
3. **AzuraCast on Linode VPS** — station backbone and canonical radio backend.
4. **syco23bot + syco23adminbot** — Telegram bot project.

## Global Brand Rules

- Formal brand: SYSTEM CORRUPT
- Public surface: SYCO23
- Short form: SYCO
- Visual voice: mechanical totem, ancient energy, sound-system scale
- Avoid terminal aesthetics, neon rave styling, cyberpunk, glossy startup UI, and generic SaaS dashboards
- Use dark mineral surfaces, stacked forms, vertical axes, worn metal logic, restrained signal-like motion

## Project Requirements

### syco23-webplayer
- Public live stream playback UI
- Metadata-driven now playing and status
- Mobile-first portrait layout plus desktop and TV-safe variants
- Persistent playback where technically possible
- Future embeddable mode
- Future-compatible with public video/live preview use

### syco23-transmission
- Operator-facing multistream control app
- Supports YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook, plus future custom RTMP targets
- Template gallery with generated previews
- Custom template builder with uploaded backgrounds
- Custom provider output profiles including 16:9 YouTube and Telegram variants
- Provider-specific transmission kits
- Frontend video preview player
- Colorized logs
- SQLite persistence
- FFmpeg pipeline
- Ultra-efficient watchdog service
- Diagnostics, schedule, archive, overlay, and mobile-first responsive control layout

### AzuraCast on Linode VPS
- Canonical radio backend
- Main stream ingest/distribution
- Public API and now-playing source
- Stable infrastructure role
- Custom enrichment moved into SYCO23 middleware rather than raw frontend dependency

### syco23bot + syco23adminbot
- Public listener bot for live status, stream links, now playing, schedule/archive hooks
- Admin bot for stream health, alerts, provider state, and safe operational shortcuts
- Consume normalized SYCO23 APIs instead of brittle raw services

## Shared Technical Rules

- Modular architecture, not single-file output
- External libs allowed when justified
- Shared token logic and naming conventions
- Metadata middleware strategy for enrichment/custom stats
- Canonical status vocabulary across projects
- Mobile-first and responsive where user-facing
- Operational stability prioritized over decorative complexity

## Documentation Output

Maintain and update these V4.1 documents:
- Master product spec
- Long reference pack
- Short production prompt
- Final prompt pack
- User stories document

All future planning and implementation must respect the project split above.
