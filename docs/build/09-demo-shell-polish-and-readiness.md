# 09. Demo Shell, Polish, And Readiness

**Work types:** Frontend polish, full-stack integration, demo controls, QA, deployment readiness

**Human actions needed first:**
- Provide or confirm the deployment target and any domain/app URL needed.
- Confirm the final demo inbox, env vars, and map keys are in place.
- Have at least one phone ready for live-location testing.
- If you have preferred demo personas or story beats, provide them; otherwise derive them from the spec and seed data.

**Prompt:**

You are taking Mealflo from “working app” to “credible live demo.” Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), and all relevant design files before making changes.

Your job is to integrate the pieces into a smooth, stage-ready demo experience. This includes the desktop demo shell, persona switching, demo controls, reset behavior, and final polish across public, admin, and driver surfaces.

What to deliver:
- The desktop demo wrapper with the dark outer border and role tabs. (already kinda built)
- Demo controls for triggering inbound messages, simulating next stop, switching driver, toggling live vs fake GPS, and resetting demo state.
- Cross-surface polish so the whole app feels like one intentional product.
- Seed data and story moments that help the live demo land immediately.
- Deployment-readiness pass so the team can show the product confidently.

Quality bar:
- No slop copy.
- No awkward placeholder visuals.
- No icon drift.
- No mismatched motion or typography.
- No dead ends in the demo path.
- Remove any unnecessary text. 

Verification:
- Run the full test/build pipeline.
- Use [@Computer Use](plugin://computer-use@openai-bundled) to do end-to-end visual verification across public, admin, and driver flows.
- Do at least one full demo run: inbound request, approval, route generation, driver acceptance, live map visibility.
- Review the UI against the web-interface-guideline mindset: accessibility, focus, motion safety, long content, touch targets, semantic structure, and responsiveness.
- Verify the deployed or production-like build on desktop and phone before handoff.

Handoff:
- Leave a final concise demo script.
- List any known simplifications honestly.
- Call out any manual steps the presenter should take before going on stage.
