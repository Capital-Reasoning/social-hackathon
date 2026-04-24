# 01. Project Init

**Work types:** Full-stack foundation, repo setup, app architecture, developer experience

**Human actions needed first:**
- None unless key env vars are missing or you need a package-manager decision because the repo has not been initialized yet.
- If anything critical is missing, ask once, clearly, and keep moving on everything else.

**Prompt:**

You are initializing the Mealflo application from the current repo state. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), [docs/TECH_STACK.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/TECH_STACK.md), [design/README.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/README.md), and [design/colors_and_type.css](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/colors_and_type.css) first.

Build the project foundation for a single-app Mealflo implementation using the chosen stack in `docs/TECH_STACK.md`. The goal is to leave the repo in a clean, ready-to-build state for focused follow-on agents. This is foundation work, but it must already reflect the product direction: admin/public/driver surfaces, demo wrapper, responsive PWA, and a clean separation between frontend and backend responsibilities.

What to deliver:
- Initialize the actual app in-repo using the agreed stack.
- Establish a clean app structure for admin, public, driver, shared UI, shared data, API routes, and demo-specific behavior.
- Set up environment-variable handling, typed config, and any obvious safety around missing keys.
- Add baseline tooling for linting, formatting, testing, and type safety.
- Add a lightweight PWA-ready base so phone testing is not blocked later.
- Create a minimal role/persona entry flow and placeholder routes so the whole app can be navigated immediately.
- Ensure the repo is easy for other agents to work in without re-deciding architecture.

Constraints:
- Follow the design system from day one, even for placeholders.
- Do not introduce icon libraries or emoji fallbacks.
- Keep copy sparse, plain, and product-like.
- Avoid overengineering. This is a hackathon foundation, not a platform rewrite.

Agent operating rules:
- Use subagents if parallel setup helps.
- Search official docs or the web when needed.
- Ask clarifying questions if blocked on something genuinely ambiguous.

Verification:
- Run the relevant install, lint, typecheck, and build commands.
- Verify the app boots locally and the main role paths render.
- Use [@Computer Use](plugin://computer-use@openai-bundled) to smoke-test the initial app shell in a browser.
- Confirm fonts, background colors, and icon pipeline are not silently wrong.
- Leave a concise handoff listing what is ready for the next agents and any remaining blockers.
