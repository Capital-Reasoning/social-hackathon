# Mealflo

Mealflo is a hackathon demo for coordinating food delivery work. It gives a small food-access team one place to review incoming requests, turn them into delivery work, build routes, and give drivers a simple phone-first route experience.

The app is intentionally demo-first: the admin view, public intake forms, live map, and driver flow are built to make the core workflow clear quickly.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create or update `.env` in the project root. The app can run with fallbacks for some demo paths, but the full experience uses:

```bash
NEON_DATABASE_URL=
OPENAI_API_KEY=
OPENAI_INTAKE_MODEL=gpt-5.4-mini
OPENROUTESERVICE_API_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Gmail intake demo
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_USER_ID=me
GMAIL_INGEST_TO_ADDRESS=
GMAIL_INGEST_QUERY=
GMAIL_INGEST_MAX_RESULTS=10
MEALFLO_INGEST_SECRET=
```

Where to get keys:

- Neon: create a Postgres database at [neon.tech](https://neon.tech) and copy the pooled connection string into `NEON_DATABASE_URL`.
- OpenAI: create an API key in the [OpenAI dashboard](https://platform.openai.com/api-keys) and use it for `OPENAI_API_KEY`.
- openrouteservice: create an API key at [openrouteservice.org](https://openrouteservice.org/dev/#/signup) for live routing.
- Map style: use any MapLibre-compatible style URL. For quick local work, the app falls back to `https://demotiles.maplibre.org/style.json`.
- Gmail intake: optional for the demo. Create OAuth credentials in Google Cloud, enable the Gmail API, and use a refresh token for the mailbox you want Mealflo to ingest from.

Set up the database, then seed demo data:

```bash
pnpm db:push
pnpm db:seed
```

Run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Routes

- `/` role and persona entry
- `/demo/admin`, `/demo/public`, `/demo/driver` desktop demo shell
- `/admin`, `/admin/inbox`, `/admin/routes`, `/admin/live`, `/admin/inventory`
- `/public`, `/public/request`, `/public/volunteer`
- `/driver`, `/driver/active`

## Scripts

- `pnpm dev` starts the local Next.js app.
- `pnpm check` runs lint, typecheck, and tests.
- `pnpm build` creates a production build.
- `pnpm db:push` applies the Drizzle schema to the database.
- `pnpm db:seed` loads demo data.
- `pnpm db:reset` resets the demo database state.
