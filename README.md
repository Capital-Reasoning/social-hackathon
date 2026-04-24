# Mealflo

Single-app Next.js foundation for the Mealflo hackathon demo.

## Scripts

- `pnpm dev` starts the app locally.
- `pnpm check` runs lint, typecheck, and tests.
- `pnpm build` produces a production build.
- `pnpm db:generate` and `pnpm db:push` are wired for the Drizzle + Neon layer.

## Structure

- `src/app` holds the routed Next.js surfaces and API routes.
- `src/views` holds the screen-level UI for admin, public, and driver flows.
- `src/components/mealflo` holds shared Mealflo UI primitives, shell components, and map/PWA helpers.
- `src/lib` holds typed config, mock/demo data, and shared helpers.
- `src/server` holds database schema and lazy server-only database wiring.

## Route Map

- `/` role and persona entry
- `/demo/admin`, `/demo/public`, `/demo/driver` desktop demo shell
- `/admin`, `/admin/inbox`, `/admin/routes`, `/admin/live`, `/admin/inventory`
- `/public`, `/public/request`, `/public/volunteer`
- `/driver`, `/driver/active`
