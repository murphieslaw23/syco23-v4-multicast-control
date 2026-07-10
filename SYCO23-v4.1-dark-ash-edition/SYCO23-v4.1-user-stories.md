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
