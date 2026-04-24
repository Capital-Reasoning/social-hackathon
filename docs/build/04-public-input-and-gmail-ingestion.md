# 04. Public Input And Gmail Ingestion

**Work types:** Full-stack, frontend + backend integration, AI parsing, intake workflows

**Human actions needed first:**
- Provide or confirm the Gmail inbox / credentials / access method for the demo inbox.
- If you want the inbox restricted to a label or folder, specify that now; otherwise default to safe inbound ingestion from the connected inbox.
>>> Yeah, I will want to get emails sent to info@capitalreasoning.com, but actually only ones sent to info+mealflo@capitalreasoning.com. Figure out the best way to set this up, and give me directions for finalization once you are done.
- If an app URL is required for auth, callbacks, or form verification, provide or confirm it.
>>> You let me know if we need anything from my end for this.

**Prompt:**

You are building the public intake and Gmail ingestion workflows for Mealflo. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), [docs/TECH_STACK.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/TECH_STACK.md), and the design files before making changes.

This work needs to create one of the key demo beats: a real inbound request arrives, gets parsed into a structured draft, and is ready for admin approval. The flows must feel polished and trustworthy.

What to deliver:
- Public landing page with two entry points: request food and volunteer.
- Public request and volunteer forms aligned to the design system and the spec.
- Intake persistence for both forms and Gmail messages.
- Parser flow that turns raw intake into structured drafts with confidence indicators and low-confidence field marking.
- Clear source + parsed representation for later admin review.
- Incoming Gmail ingestion only. No outbound email in MVP.

Experience expectations:
- Forms should feel simple, clear, and non-bureaucratic.
- No sales language, no filler, no fake startup tone.
- Trust must be visible: raw source, parsed data, confidence, approval path.
- The system should make a best guess when uncertain, but flag low confidence.

Constraints:
- Both forms and email must become structured drafts that still require admin approval.
- Do not auto-approve anything.
- No icon libraries or placeholder visuals.
- Keep the copy warm, plain, and short.

Verification:
- Test both forms end to end.
- Verify Gmail ingestion against real or staged inbox content.
- Verify parsing output is usable, editable, and confidence-aware.
- Use [@Computer Use](plugin://computer-use@openai-bundled) to verify the public flows visually on desktop and mobile.
- Leave the repo in a state where an admin can immediately review newly created drafts.
