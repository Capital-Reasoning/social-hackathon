# 05. Admin Operations Core

**Work types:** Frontend-heavy full-stack, product UI, workflow design, map-centric admin experience

**Human actions needed first:**
- None, as long as seeded data and intake records are available.

**Prompt:**

You are building the core admin experience for Mealflo. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), the design system files, and any already-built backend interfaces first.

This is the product’s operational heart. It must feel calm, powerful, and instantly legible. Use the principles from [$build-web-apps:frontend-skill](/Users/petersalmon/.codex/plugins/cache/openai-curated/build-web-apps/d5f583fa52a2244c64ed938c4cf941eec0286493/skills/frontend-skill/SKILL.md) and [$frontend-design](/Users/petersalmon/.agents/skills/frontend-design/SKILL.md): restrained composition, utility-first copy, strong hierarchy, minimal chrome, and subtle motion. Avoid generic card mosaics.

What to deliver:
- The main admin dashboard.
- Inbox review screen with raw source beside parsed draft.
- Approved-request / triage surface for today, tomorrow, and later.
- Route planning surface shell ready to consume routing results.
- Live map surfaces that make the app feel operational and real.

Experience expectations:
- The live map should be a primary visual anchor.
- The intake review experience should feel magical, trustworthy, and efficient.
- The admin should be able to understand what needs action now without reading walls of text.
- Copy should be plain, useful, and human.
- Motion should sharpen hierarchy, not distract.

Constraints:
- Follow the Mealflo design system exactly.
- Use custom Mealflo icons only.
- No meta-copy, no executive-summary fluff, no generic empty analytics sections.
- Treat cards as an interaction choice, not a default layout strategy.

Verification:
- Verify the admin flows visually with [@Computer Use](plugin://computer-use@openai-bundled) on desktop and narrow tablet widths.
- Check keyboard flow, focus states, labels, and responsiveness.
- Run a final pass against web-interface quality expectations before handoff.
- Make sure the admin surfaces feel like one product, not separate screens stitched together.
