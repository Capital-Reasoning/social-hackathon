# 03. Backend And Data Foundations

**Work types:** Backend, database, schema design, seed data, API scaffolding

**Human actions needed first:**
- Confirm or provide the Neon database connection if it is not already usable. >> it should be, let me kn ow if not
- If you need curated source material for seed content and none exists yet, ask for it once; otherwise generate believable fixtures aligned to the spec. >> reference the materials in track two of buildersvault-hackathon-kit/, and also use your judgement/search the web, review the spec, and make reasonable assumptions to create the seed data. Document any assumptions you make about the seed data in your handoff notes, and ask me any clarifying questions needed first.

**Prompt:**

You are building the Mealflo backend and data foundation. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), and [docs/TECH_STACK.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/TECH_STACK.md) first.

The goal is to create a clean, demo-ready backend that supports the full product story without prematurely overcomplicating the implementation. Follow the spec’s core entities and the deliberate simplifications around ingredients vs deliverable meals, anchor sessions, and blended client/request UI.

What to deliver:
- Define and implement the core database schema for intake messages, drafts, clients, volunteers, availability, vehicles, requests, meals, ingredients, routes, route stops, and driver sessions.
- Seed the database with curated, believable Greater Victoria demo data that feels real on screen.
- Create the API surfaces or server actions needed for the rest of the product to build against.
- Separate raw intake artifacts from approved structured records.
- Make it easy for later agents to fetch admin, public, driver, inventory, and live-ops data without rethinking the domain model.
- Include demo-safe reset and reseed behavior.

Data-quality expectations:
- Real-feeling addresses and documentary-real sample content.
- Fictional names.
- Clean enough to demo smoothly, messy enough to feel real.

Constraints:
- Keep client and request separate in data, even if the UI blends them.
- Keep ingredients separate from deliverable meal items.
- Keep driver session state and dashboard anchor-session logic in mind from the start.
- Do not let the schema drift into a generic CRUD admin app.

Verification:
- Run migrations and seed scripts cleanly.
- Add targeted backend tests around data creation, route prerequisites, and reset behavior.
- Verify the app can read the seeded data without manual DB inspection.
- Leave clear notes on seed assumptions and any intentionally simplified domain decisions.
