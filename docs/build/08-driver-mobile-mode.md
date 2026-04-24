# 08. Driver Mobile Mode

**Work types:** Frontend-heavy full-stack, mobile UX, maps, PWA behavior, location-aware interaction

**Human actions needed first:**
- Have one or more real phones available for testing if possible.
>>> Yes, we will have phones ready. Let us know of testing directions at the end. 
- If the app needs special local-network or HTTPS setup for geolocation/PWA behavior, handle that early. 
>>> Let me know if any issues come up. 


**Prompt:**

You are building the Mealflo driver mobile product. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), the design-system files, and any session/routing APIs first.

This is one of the most important parts of the entire demo. The driver mode must feel native, calm, and confidence-building on a phone. Use the frontend skills named in this project as guidance: restraint, premium composition, mobile-first clarity, and no generic AI-looking patterns.

What to deliver:
- Driver welcome screen.
- Time-availability picker.
- Persona selection if needed.
- Route-offer screen.
- Active route map.
- Stop-detail screen.
- Local route progression for the phone session.
- Call action on stops.

Experience expectations:
- Open the app on a phone and it should immediately feel like a real product.
- Maps are the center of gravity.
- The route should feel manageable, not overwhelming.
- The stop screen should be clean and supportive under pressure.
- Motion should be subtle, responsive, and present throughout the flow.

Constraints:
- No emoji or icon-library shortcuts.
- No clutter, no tiny targets, no overdesigned panels.
- Keep the flow intentionally locked down for demo simplicity.
- Use custom icons, real fonts, real hierarchy, and strong reduced-motion behavior.

Verification:
- Test on mobile viewport and, if possible, on actual phones.
- Verify geolocation permission, heartbeats, route entry, stop progression, and local completion state.
- Use [@Computer Use](plugin://computer-use@openai-bundled) for browser/mobile emulation and visual checks.
- Check tap targets, focus behavior, readability, and performance on narrow screens.
