# SYCO23 v4 — Design Layout Prompt

**Use Case:** Feed this prompt to any design agent, layout tool, or component design session for the SYCO23 Multicast Control application.

---

## Core Design Brief

Design a SYCO23 v4 broadcast web application for controlling multistream delivery to YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, and Facebook. The app routes a single live program feed to multiple simultaneous outbound destinations via RTMP-first pipelines with HLS monitoring where relevant.

This is a transmission control surface for an underground broadcast operation. It is not a consumer streaming app, not a social media dashboard, and not a generic SaaS product. It must feel like a ritual-grade broadcast machine: heavy, functional, dependable, and built for operators under live pressure.

---

## Visual Language

Follow SYCO23 v4 brand logic:

- **Forms:** stacked vertical modules, speaker-wall column logic, plate-on-plate layering.
- **Surface textures:** dark mineral, worn metal, oxidized finishes, carved-mark details at micro scale.
- **Structural details:** bolt-like anchors, grill patterns, vent lines, cable-routing logic in dividers and separators.
- **Motion:** sparse and signal-like only. Glitch permitted only as a fault indicator or transmission state behavior. No decorative animation.
- **Color:** one dominant key color per screen or mode. Use rust orange, deep crimson, dull amber, oxidized copper, dirty turquoise, or burnt ochre as accent. Base layers must be dark, mineral, and desaturated.
- **Typography:** bold, condensed, industrial for display headings. Clean, readable for UI body, labels, and metadata.

**Hard prohibitions:**
- No terminal or console aesthetic.
- No neon rave graphics.
- No cyberpunk chrome or glow.
- No glossy gradient buttons or cards.
- No bubbly rounded SaaS card soup.
- No icon-in-colored-circle feature grids.
- No centered-everything layouts.
- No generic analytics dashboard structure.

---

## Layout Architecture

### Primary Control Surface (Desktop)

Organize around a dominant left or central vertical control spine with stacked operational modules. The spine holds the source ingest state, master session controls, and primary status output.

Right side: destination matrix, provider nodes, output health, log rail. Secondary detail lives in drawers sliding from the right edge.

Desktop primary view must be **scroll-free or nearly scroll-free**. Everything the operator needs during a live transmission must be visible without scrolling. Secondary information lives in drawers or collapsible panels.

Navigation must be restrained on desktop — a compact sidebar or horizontal top rail, no nested depth.

### Destination Matrix

Display each provider as a **transmission node**, not a branded social icon tile. Each node shows:
- Provider label
- Current state badge: idle / armed / connecting / live / degraded / failed / cooldown / offline
- Protocol indicator (RTMP / RTMPS)
- Bitrate and output profile reference
- Last error or last handshake time
- Arm / start / stop / retry controls

Nodes should feel like mechanical relays or transmission terminals. Status must never be communicated by color alone — use label, icon, and color together.

### Template Gallery

When creating a stream, display templates as a grid of preview tiles. Each tile shows a generated preview image with SYCO23 v4 brand treatment applied. Dummy text is acceptable but the preview must communicate visual structure, provider context, and design identity — not just a blank frame.

Selected template animates into a confirmation or build view. Transition: deliberate and mechanical, not floaty.

### Custom Template Builder

Builder view for uploading background images, selecting layout elements, and configuring provider-specific display logic. Controls must feel like hardware configuration, not a web design tool. Must remain within the SYCO23 visual system.

### Transmission Kit View

When a provider is configured, display the generated transmission kit in a drawer or dedicated panel. Kit elements styled in SYCO23 v4 brand voice, adapted for selected provider and template. Copy-to-clipboard actions styled as operational controls, not generic UI buttons.

### Video Player (Preview)

Built-in frontend video player for previewing the live built stream. No generic HTML5 player chrome. Must feel like a transmission monitor window: dark-bordered, minimal controls, status-first. Architected for future embedding in the external public webapp.

### Colorized Log Panel

Real-time log panel accessible from status view, collapsible from the main control surface. Color coding:

- **Info:** muted base text
- **Warning:** dull amber
- **Error:** deep crimson / rust red
- **Success:** oxidized copper or dirty turquoise
- **Debug:** subdued, low-contrast

Log entries feel like telemetry readouts. Monospaced body text, timestamp column, source tag, message. Dense but readable.

---

## Layout Variants

### Mobile Portrait

Stack priority panels vertically: source state at top, master controls below, destination summary middle, status rail at bottom. Floating bottom nav with idle-collapse. Touch targets minimum 44x44px. No hover-only patterns.

### Tablet

Preserve desktop left-anchored logic with more vertical flexibility. Compact sidebar or persistent compact nav. Mild expansion of metadata and destination panels.

### TV / 4K

Large typography with strong safe-zone discipline. Reduced motion. Broad but sparse composition. High-stability layout. No animated visualizers in TV mode.

---

## Tone Reference

A broadcast control unit built by a crew that runs sound systems in fields and warehouses. Industrial, worn, functional, and ritualistically considered. Heavy presence. Nothing wasted. Everything visible has a job.

Not: a startup streaming dashboard. Not: a music platform skin. Not: a cyberpunk hacker UI.

---

## Component Design Guidance

- Cards and modules: surface elevation (background shift + shadow) rather than thick colored borders.
- Dividers: bolt-line patterns or simple 1px alpha-blended separators.
- Buttons: heavy, rectangular or minimal functional radius. Active states feel like switches engaging.
- Badges / status tags: small, high-contrast, icon + label, never color-only.
- Icons: Lucide or custom inline SVG. No colored icon backgrounds.
- Inputs: dark field, subtle border, clear focus state. No white backgrounds.
- Drawers: slide from right edge, full height, dark scrim overlay.
