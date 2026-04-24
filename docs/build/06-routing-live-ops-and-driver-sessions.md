# 06. Routing, Live Ops, And Driver Sessions

**Work types:** Backend-heavy full-stack, routing logic, maps, realtime-ish state, demo infrastructure

**Human actions needed first:**
- Confirm the openrouteservice key is available and usable. >>> should be good, let me know if there are any issues. 
- Have at least one real phone ready later for live-location verification if possible. >>> yes, have one for when needed.

**Prompt:**

You are building the routing engine, live-operations state, and driver-session model for Mealflo. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), and [docs/TECH_STACK.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/TECH_STACK.md) first.

This work must support the second and third core demo beats: automatic routes and live drivers on the admin map. The implementation can be heuristic, but it must feel coherent, explainable, and stable.

What to deliver:
- Route generation across available volunteers using the spec’s priorities and time-band rules.
- Start routes from the depot.
- Honor the `66% to 75%` budget using drive time plus 2 minutes per stop.
- Pull in tomorrow/later requests when they are geographically compatible and still fit the route.
- Exclude stops cleanly when inventory or hard constraints fail.
- Produce route summaries and route explanations suitable for admin UI.
- Implement driver sessions with anchor-session logic so one route has one canonical dashboard state even if many phones open it.
- Support live location heartbeats and route reset behavior for demo use.

Constraints:
- Never exceed the upper time band.
- Keep the dashboard stable even with multiple devices on the same route.
- The dashboard should choose the first active session and stick to it unless reset or lost.
- This can be strongly heuristic if needed, but it should never feel random.

Verification:
- Add tests around route scoring, time budgeting, compatible extra stops, exclusion logic, anchor-session election, and reset behavior.
- Verify map data and route lines with realistic seed data.
- Use [@Computer Use](plugin://computer-use@openai-bundled) for browser-level verification of live route behavior where possible.
- If a real phone is available, verify one full route/session loop with actual geolocation heartbeats.
