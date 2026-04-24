# AGENTS.md

- Read [docs/MEALFLO_SPEC.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/MEALFLO_SPEC.md), [docs/TECH_STACK.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/docs/TECH_STACK.md), [design/README.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/README.md), and [design/colors_and_type.css](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/colors_and_type.css) before making product changes.
- Build the spec first; prioritize visible demo quality over invisible complexity.
- Follow the Mealflo design system exactly: light mode, Outfit + DM Sans, Mealflo color tokens, semi-opaque borders, warm surfaces, large touch targets.
- Use only the custom Mealflo icons from [design/assets/icons](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/assets/icons). No emojis, Lucide, Heroicons, or substitute icon packs.
- Avoid AI tells: no meta-copy, no salesy marketing language, no filler banners, no generic dashboard-card mosaics.
- Prefer calm layout, strong hierarchy, sentence case, and utility copy on product surfaces.
- Motion should be smooth, subtle, and purposeful; prefer `transform` and `opacity`, never `transition: all`, and honor `prefers-reduced-motion`.
- Keep admin surfaces operational, not promotional; maps and workflow should lead the experience.
- Build desktop and mobile together; driver mode must feel native and focused on phones.
- Accessibility is required: semantic HTML, visible focus states, labels, keyboard support, contrast, and touch-friendly targets.
- Test every meaningful change locally, then verify visually with [@Computer Use](plugin://computer-use@openai-bundled) or equivalent browser automation.
- Use subagents when helpful, browse docs or the web when needed, and ask clarifying questions if blocked.
- Make reasonable assumptions when they are low risk; document them clearly in your handoff.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->