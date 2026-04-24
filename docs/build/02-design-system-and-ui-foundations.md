# 02. Design System In App

**Work types:** Frontend, design system integration, UI primitives, motion foundations

**Human actions needed first:**
- None.

**Prompt:**

You are responsible for translating the Mealflo design system into the production app. Read [AGENTS.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/AGENTS.md), [design/README.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/README.md), [design/colors_and_type.css](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/colors_and_type.css), [design/ui_kits/webapp/README.md](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/ui_kits/webapp/README.md), and the icon assets in [design/assets/icons](/Users/petersalmon/Projects/Capital%20Reasoning/social-hackathon/design/assets/icons) before coding.

***Use the files in design/ as your strongest source of truth.*** The spec, design skills, and any other sources are bonuses on top of that.

Use the spirit of [$build-web-apps:frontend-skill](/Users/petersalmon/.codex/plugins/cache/openai-curated/build-web-apps/d5f583fa52a2244c64ed938c4cf941eec0286493/skills/frontend-skill/SKILL.md) and [$frontend-design](/Users/petersalmon/.agents/skills/frontend-design/SKILL.md): restrained composition, premium hierarchy, no generic card-grid SaaS feel, and no AI-slop aesthetics. Also bake in the accessibility and interface-quality expectations from [$build-web-apps:web-design-guidelines](/Users/petersalmon/.codex/plugins/cache/openai-curated/build-web-apps/d5f583fa52a2244c64ed938c4cf941eec0286493/skills/web-design-guidelines/SKILL.md).

What to deliver:
- Integrate the real brand fonts, color tokens, spacing, radii, borders, and motion tokens into the app.
- Create shared UI primitives for layout, buttons, inputs, selects, badges, panels, headers, lists, tables, sheets, modals, and map overlays.
- Create a single icon pipeline around the custom Mealflo PNG assets so the rest of the app can use them consistently.
- Establish strong focus styles, reduced-motion support, hover/press states, and typography defaults.
- Encode the product’s copy style: sentence case, warm and practical, never salesy, never meta.
- Make the UI foundations feel clean, professional, and durable, not flashy.

Hard constraints:
- Custom Mealflo icons only. No Lucide, Heroicons, emoji, or placeholder icon packs.
- No generic dashboard-card mosaics.
- Avoid shadows as the main depth signal; use borders and spacing first.
- Motion should be subtle and meaningful throughout the app.
- The output must feel like one cohesive product system, not a kitbash.

Verification:
- Render a local style gallery or representative pages so the system can be checked visually.
- Use [@Computer Use](plugin://computer-use@openai-bundled) to verify desktop and mobile rendering, hover/focus states, and typography.
- Run a UI review pass against the current Web Interface Guidelines mindset: labels, focus, semantic structure, motion safety, touch targets, long-content behavior, and responsiveness.
- Leave the repo with UI primitives that other agents can confidently build on.
