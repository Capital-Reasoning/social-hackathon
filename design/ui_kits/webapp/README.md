# Mealflo Web App UI Kit

A high-fidelity click-through prototype of the Mealflo coordinator web dashboard.

## Screens
- **Dashboard** — KPI overview, route statuses, alert banners
- **Routes** — Route list + stop-by-stop detail panel
- **Recipients** — Searchable recipient list + detail sidebar
- **Volunteers** — Volunteer cards with assignment and status
- **Schedule** — Weekly calendar grid view

## Components
- `Header.jsx` — Top nav with logo, nav items, notification badge, avatar
- `RouteCard.jsx` — Route summary card with status badge + delivery stats
- `RecipientList.jsx` — Searchable list with dietary flags + delivery status

## Usage
Open `index.html` in a browser. Navigate between screens using the top nav.
State (current page) persists via localStorage on refresh.

## Design tokens
All visual styles use the Mealflo design system:
- Yellow `#fae278` header, warm off-white `#fffdf0` background
- Blue `#7890fa` action buttons
- Semi-opaque borders (no drop shadows)
- Outfit (display) + DM Sans (body)
- 12px card radius, 8px button radius
