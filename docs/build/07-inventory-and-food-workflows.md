# 07. Inventory And Food Workflows

**Work types:** Full-stack, data modeling, workflow UI, AI-assisted inventory features

**Human actions needed first:**
- If you have sample receipt images or documents, add them to the repo or make them available.
- If not, proceed with believable fixture receipts and manual-entry flows.

>>> Agent: you are welcome to find some receipts online for test use.

**Prompt:**

You are building Mealflo’s inventory and food workflows. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), and the design system docs first.

This work needs to make the food side of Mealflo feel tangible and real without getting lost in production-grade kitchen complexity. The key product decision is already made: ingredients and deliverable meals are separate layers.

What to deliver:
- Inventory screens and workflows for deliverable meals and ingredients.
- Manual entry flow that works well and looks polished.
- Receipt/document parsing scaffold that can be demoed honestly even if partially simplified.
- Perishability-aware ingredient sorting using AI suggestion plus human confirmation.
- Clear route allocation of named meal items to stops.
- Clean visibility into shortages so route planning can exclude stops instead of failing globally.

Experience expectations:
- This should feel practical and elegant, not like warehouse software.
- Drivers should never see ingredient clutter; they should see named meals and warnings.
- Admins should understand food readiness quickly.

Constraints:
- Keep ingredients mostly separate from route planning.
- Do not build full production modeling from ingredients to meals unless it is already easy.
- Keep copy and UI calm, useful, and concrete.
- Use custom icons and design tokens throughout.

Verification:
- Test manual entry and parsing flows end to end.
- Verify inventory shortages affect route eligibility correctly.
- Verify the ingredient list sorts believably by perishability.
- Use [@Computer Use](plugin://computer-use@openai-bundled) to review the inventory UI on desktop.
