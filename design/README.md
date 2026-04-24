# Mealflo Design System

## Company Overview

**Mealflo** is a food-delivery coordination platform that enables teams of staff and volunteers to deliver meals to low-income, food-insecure individuals — primarily seniors and people with disabilities. The platform coordinates logistics: scheduling pickups/dropoffs, managing recipient lists, tracking deliveries, and communicating with delivery volunteers.

**Mission tone:** Warm, practical, and community-oriented. The product serves a non-tech-first population — both the volunteers using mobile apps and the coordinators using a web dashboard. Everything must be clear, large, and reassuring.

**Sources provided:**
- `uploads/Screenshot 2026-04-22 at 5.24.54 PM.png` — Icon style reference (Apple-style photorealistic 3D rendered objects)
- User brief: yellow (#fae278) + blue (#7890FA) scheme, DM Sans body, semi-opaque borders, big buttons, light mode

---

## Products

1. **Coordinator Web App** — A dashboard used by staff/admins to manage routes, recipients, and volunteer assignments. Likely desktop-first but responsive.
2. **Volunteer Mobile App** — A simple app used by delivery volunteers to see their route, mark deliveries complete, and communicate issues.

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Warm and encouraging.** Volunteers and staff are doing meaningful work; the copy should affirm that.
- **Plain language.** Users are not tech-first. Avoid jargon. Say "Add a delivery stop" not "Create a waypoint entity."
- **Action-oriented.** Labels are verbs when possible: "Start Route", "Mark Delivered", "Add Recipient" — not "Route", "Delivery", "Recipients."
- **You-first, not I.** "Your route for today", "Your deliveries" — not "My route."
- **No emoji in UI labels.** Emoji may appear in celebration/success states (e.g. delivery complete) but never in nav or form labels.
- **Sentence case everywhere.** "Add a new stop" not "Add A New Stop."
- **Short and scannable.** Seniors and hurried volunteers glance, not read. Keep labels ≤ 3 words. Keep helper text to 1 sentence.
- **Inclusive and respectful.** Refer to meal recipients as "recipients" or "neighbors" — never "clients" or "cases."

### Copy Examples
- ✅ "Start your route" / ❌ "Initiate delivery sequence"
- ✅ "3 deliveries left" / ❌ "3 remaining waypoints"
- ✅ "Something went wrong. Try again." / ❌ "Error 500: Internal server error"
- ✅ "Nice work! All meals delivered." / ❌ "Task completed successfully."

---

## VISUAL FOUNDATIONS

### Colors
- **Primary Yellow:** `#fae278` — Used for page headers, nav backgrounds, key surface highlights. Warm, approachable, food-adjacent.
- **Action Blue:** `#7890FA` — Used for primary buttons, links, focus rings. Clear contrast against yellow and white.
- **Background:** `#fffdf0` — Slightly warm off-white; never pure white. Keeps the yellow theme grounded.
- **Surface:** `#ffffff` — Cards, modals, inputs.
- **Text Dark:** `#1c1c2e` — Primary text.
- **Text Mid:** `#4e4e72` — Secondary labels, descriptions.
- **Text Light:** `#9090b0` — Placeholder text, disabled states.
- **Success Green:** `#4ead6f` — Delivery confirmed, route complete.
- **Warning Amber:** `#f0a830` — Dietary notes, late deliveries.
- **Error Red:** `#e05050` — Errors, missed stops.
- **Border:** `rgba(24, 24, 60, 0.14)` — Semi-opaque dark border for all cards and inputs. No pure black borders.

### Typography
- **Display / Headings:** Outfit (Google Fonts) — rounded, friendly, modern. Used for H1–H3 and dashboard KPI numbers.
- **Body / UI:** DM Sans (Google Fonts) — clean, legible, optimized for screen reading. Used for all labels, paragraphs, and form text.
- **Minimum body size:** 16px (web), 17px (mobile). Never smaller.
- **Heading weights:** 700 (display), 600 (section heads), 500 (sub-labels).
- **Body weight:** 400 (body), 500 (buttons/labels).

### Spacing & Layout
- **Base unit:** 8px grid.
- **Card padding:** 20–24px.
- **Button height:** 48–56px (large), 40px (medium). Never below 44px for touch targets.
- **Border radius:** 12px (cards, modals, large inputs), 8px (buttons, tags, small chips), 999px (pill badges).
- **Section gaps:** 24–32px between major sections.

### Borders
- **Primary border style:** `1.5px solid rgba(24, 24, 60, 0.14)` — semi-opaque, warm-dark. Used on cards, inputs, dropdowns.
- **Accent border:** `2px solid rgba(120, 144, 250, 0.35)` — used on focused inputs, selected cards.
- **No drop shadows** as primary depth signal — borders carry depth instead. Shadows are subtle and optional for elevated modals only.

### Backgrounds & Surfaces
- **Site header / nav:** `#fae278` (yellow).
- **Page background:** `#fffdf0` (warm off-white).
- **Cards:** `#ffffff` with border.
- **Sidebar/secondary panels:** `#fdf8e4` (very light yellow tint).
- No gradients in main UI. Yellow gradient may appear in hero/onboarding only.
- No full-bleed images in functional UI. Illustrations used for empty states only.

### Icons
- **Style:** Photorealistic 3D rendered objects — Apple emoji / iOS icon style. Soft drop shadows, dimensional depth, warm lighting.
- **Usage:** Navigation icons, feature icons, category markers. Never flat or outline-only icons.
- **Source:** Custom 3D icon set (see `assets/` folder). On platforms without asset access, substitute Apple system emoji as a fallback.
- **Size:** 32×32px (nav), 48×48px (feature cards), 64×64px (empty states / hero).

### Animation
- **Easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` for entrances (slight spring). `ease-out` for exits.
- **Duration:** 180ms (micro), 280ms (transitions), 400ms (modals/drawers).
- **Hover states:** Buttons lift slightly (translateY -1px) + deepen border color. Cards get a warmer border on hover.
- **Press states:** Buttons scale to 0.97, background darkens slightly.
- **No aggressive animations.** The user base includes seniors — keep motion minimal and purposeful.

### Corner Radii
- `4px` — small chips, inline badges
- `8px` — buttons, tags, small inputs
- `12px` — cards, large inputs, modals
- `999px` — pill badges, avatar circles

### Cards
- Background: `#ffffff`
- Border: `1.5px solid rgba(24, 24, 60, 0.14)`
- Radius: `12px`
- Padding: `20–24px`
- No box-shadow by default. Elevated modal: `0 8px 32px rgba(24, 24, 60, 0.10)`

### Imagery
- Color vibe: warm, natural, slightly desaturated. Food and community themes.
- Used only in onboarding, marketing, and empty states.
- No stock photography in functional dashboard views.

---

## ICONOGRAPHY

Icon style: **photorealistic 3D rendered objects** — matching the Apple iOS 3D emoji / icon style shown in the reference screenshot. Objects are rendered with:
- Soft, warm directional lighting (upper-left)
- Subtle cast shadows beneath objects
- Material depth (fabric, ceramic, glass, metal textures visible)
- Clean white/transparent background

**Asset location:** `assets/icons/` — contains 3D icon PNGs (see folder).

**CDN fallback:** If custom icon assets unavailable, use system/native Apple emoji via Unicode — they render as 3D on Apple platforms and acceptably on others.

**Icon set used in product:**
- 🍱 Meal container — delivery item
- 🚗 / 🚐 Vehicle — route/driver
- 🗓️ Calendar — scheduling
- 📋 Clipboard — recipient list
- ✅ Check — delivery complete
- 🔔 Bell — notifications
- 👤 Person — volunteer/recipient profile
- 📍 Pin — location/address

**No icon fonts used.** All icons are raster/emoji or custom 3D PNG assets.

---

## File Index

```
README.md                   — This file
SKILL.md                    — Claude Code skill definition
colors_and_type.css         — All CSS custom properties (colors, type, spacing)
assets/
  icons/                    — 3D icon PNGs
fonts/                      — Font files (DM Sans, Outfit via Google Fonts)
preview/
  colors-primary.html       — Primary color swatches
  colors-semantic.html      — Semantic color tokens
  type-display.html         — Display / heading type specimens
  type-body.html            — Body type specimens
  spacing-tokens.html       — Spacing + radius + border tokens
  buttons.html              — Button component states
  inputs.html               — Form input states
  cards.html                — Card components
  badges.html               — Badges and status chips
  icons-preview.html        — Icon style showcase
ui_kits/
  webapp/                   — Coordinator web dashboard UI kit
    index.html              — Interactive prototype
    Header.jsx
    Sidebar.jsx
    RouteCard.jsx
    RecipientList.jsx
    DeliveryMap.jsx
```
