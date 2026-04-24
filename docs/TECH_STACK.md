# mealflo Tech Stack

## Stack

- Frontend: Next.js + React + TypeScript + Tailwind
- Mobile: responsive PWA
- Backend: Next.js server routes / server actions
- Database: Neon Postgres
- ORM: Drizzle
- AI: OpenAI API
- Maps: MapLibre
- Geocoding / directions: openrouteservice
- Routing logic: TypeScript heuristic in the Next.js backend
- Deployment: Vercel
- Auth: none for the hackathon demo; users choose a demo role in-app

## Architecture Notes

- Keep everything in one app for the hackathon.
- Use AI for parsing, classification, and explanation.
- Keep safety rules deterministic: allergens, cold chain, wheelchair compatibility, and two-person requirements must be backend logic.
- We do not need a separate OpenStreetMap integration. MapLibre + a map style URL + openrouteservice is enough.
- If routing quality is not good enough later, we can add a separate optimizer service after the demo.

## Env

API keys and connection strings live in [/.env](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/.env).

All agents working in this repo are permitted to read that file.

Current keys:

```bash
NEON_DATABASE_URL=
OPENAI_API_KEY=
OPENROUTESERVICE_API_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
NEXT_PUBLIC_APP_URL=
```
