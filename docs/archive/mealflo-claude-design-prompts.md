# Mealflo Claude Design Prompt Pack

Use this document to generate mockups for every screen in the app.

The best workflow is:

1. Start with the master prompt.
2. Generate the shared visual system.
3. Then generate each screen prompt using that same visual system.

## 1. Master Prompt

Paste this first:

```text
Design a high-fidelity product design system and app mockup style for a web + mobile product called Mealflo.

Mealflo is a beautiful, humane, operations-focused app for volunteer-led food delivery. It has three product roles: admin, driver, and client. It should feel like a real startup product for meal delivery logistics in Greater Victoria, BC. The product helps staff review incoming food requests, generate routes, manage inventory, and see live drivers. It also gives volunteer drivers a mobile route and map experience.

Important context:
- This is not a generic SaaS dashboard.
- It should feel warm, operational, trustworthy, and quietly magical.
- It should feel more like a thoughtful modern logistics product than a nonprofit back-office tool.
- The product must be very easy to scan quickly.
- Maps are central to the experience.
- The desktop demo is wrapped in a thin dark charcoal outer frame with top-level tabs for Admin View, Public View, and Driver View.
- On desktop, the Driver View should appear inside a phone mockup inside the larger demo shell.
- On an actual phone, the driver app should appear as a normal mobile app with no fake phone frame.

Visual direction:
- Use a refined, contemporary editorial/product aesthetic.
- Avoid default bland startup UI.
- Use a warm light interface for the product itself, with a very dark outer demo frame.
- Suggested palette direction: charcoal shell, soft ivory or warm white surfaces, forest/olive or deep teal for primary actions, muted clay or amber for warnings, cool blue-green for live map accents.
- Typography should feel premium, clean, and modern. Avoid sterile enterprise vibes.
- Use strong information hierarchy, beautiful spacing, and excellent map/data panel composition.
- Make the admin product look powerful but calm.
- Make the driver product feel focused, touch-friendly, and confidence-building.
- Make the public-facing side feel welcoming, simple, and trustworthy.

Product behaviors that the visuals should support:
- Admins review raw email/form messages beside parsed structured drafts.
- Routes are suggested automatically and explained clearly.
- Drivers can choose how much time they have, accept a route, follow a live map, and mark stops delivered.
- The admin dashboard shows live drivers on a map.
- Requests, routes, inventory, and volunteers should feel like one coherent system.

Data realism:
- Use believable fake names and real-feeling Greater Victoria street names.
- Use realistic route and inventory details.
- Use documentary-real content, not lorem ipsum.

Design goals:
- beautiful
- humane
- operational
- premium
- confident
- easy to demo on stage

Please create a consistent design language that can scale across all listed Mealflo screens.
```

## 2. Global Notes For Every Screen Prompt

Append these reminders to each prompt if needed:

```text
Use the Mealflo design system already established.

Keep all content documentary-real and specific, with fake names and believable Victoria-area addresses.

Do not make this look like a generic analytics dashboard. Prioritize calm operational clarity, elegant hierarchy, map-first thinking, and premium product taste.

Use realistic copy, labels, statuses, and route details.
```

## 3. Screen Prompts

## Screen 1. Desktop Demo Shell

```text
Using the Mealflo design system already established, design the desktop demo shell for the product.

This is the stage-facing wrapper around the app. It should have:
- a very thin dark charcoal outer frame around the entire app
- tab-like top navigation for Admin View, Public View, and Driver View
- a subtle persona switcher
- a compact demo controls area for Trigger Incoming Message, Simulate Next Stop, Switch Driver, and Toggle Live/Fake GPS
- a large inner viewport area where the selected app view appears

The shell should feel premium and understated, not gimmicky. It should frame the product for demos without distracting from the actual interface. Show the Admin View selected by default in the inner viewport with a partial dashboard preview.
```

## Screen 2. Public Landing Page

```text
Using the Mealflo design system already established, design the public landing page for Mealflo.

This page should feel welcoming, trustworthy, and extremely clear. It needs:
- a short, strong headline about getting food where it needs to go
- a concise supporting sentence
- two primary calls to action: Request food and Volunteer
- a reassuring note that this is a demo experience
- subtle cues that this connects to a real routing and delivery operations system

This is not a marketing website with lots of sections. It is a focused public entry point into the product. Make it beautiful, simple, and premium.
```

## Screen 3. Public Food Request Form

```text
Using the Mealflo design system already established, design the public food request form.

This page should feel calm, accessible, and easy to complete on desktop or mobile. Required fields:
- name
- address
- preferred contact method

Optional fields:
- household size
- dietary notes
- urgency
- access notes
- freeform message

Design this as a highly usable form, not a bureaucratic intake document. Make the structure feel human and lightweight. Include believable example data for a Victoria-area request.
```

## Screen 4. Public Volunteer Form

```text
Using the Mealflo design system already established, design the public volunteer signup form.

Required fields:
- name
- contact info
- availability

Optional fields:
- vehicle access
- starting area
- notes

The page should feel friendly and encouraging, but still part of the same Mealflo product family. Make it simple, elegant, and clearly lower effort than a formal application.
```

## Screen 5. Admin Dashboard

```text
Using the Mealflo design system already established, design the main Mealflo admin dashboard.

This is the operational home screen. It should feel powerful, calm, and instantly legible. The dashboard should include:
- key metrics across the top
- a live map with drivers and route lines
- a compact inbox requiring review
- today's approved requests
- suggested routes ready for approval
- a small inventory snapshot
- a volunteer capacity snapshot

The layout should make clear that this is an operations product, not just analytics. The live map should be the visual anchor. Use believable route, request, and volunteer content.
```

## Screen 6. Admin Inbox / Intake Review

```text
Using the Mealflo design system already established, design the admin inbox and intake review screen.

This is one of the most important screens in the app. It needs a three-panel layout:
- left: feed of inbound items from email and forms
- center: raw source message
- right: parsed structured draft ready for review

Include:
- parser confidence
- low-confidence flags
- fields like address, urgency, contact info, dietary notes, access notes
- approve, edit, ignore, and mark as other actions

The screen should make the relationship between raw source and parsed result feel obvious and trustworthy. This should look elegant, magical, and highly practical.
```

## Screen 7. Admin Requests / Triage Board

```text
Using the Mealflo design system already established, design the admin triage board for approved delivery requests.

The board should group requests into Today, Tomorrow, and Later. Each request card should feel information-rich but still easily scannable. Include:
- client name
- Victoria-area address
- urgency
- household size
- meal count
- dietary/allergy badges
- access/safety badges

This screen should feel like a smart queue of real operational work, not sticky notes on a wall. Keep the hierarchy very clean.
```

## Screen 8. Admin Route Planning

```text
Using the Mealflo design system already established, design the admin route planning screen.

This screen should show:
- available drivers and their time windows
- suggested routes
- a route map
- excluded requests and why

Each route suggestion should clearly display:
- assigned driver
- assigned vehicle
- stop count
- drive time
- total planned time
- capacity utilization
- route reasoning in concise language

Make this screen feel like the product's logistical brain. It should look smart, controlled, and easy to approve at a glance.
```

## Screen 9. Admin Route Detail

```text
Using the Mealflo design system already established, design the admin route detail screen.

This page should focus on one route and show:
- a clear route summary
- a map with the full route line
- ordered stop list
- named meal allocations per stop
- access and safety notes
- ETA and timing details

The stop list should be easy to scan and should clearly connect to points on the map. Make this feel like a polished logistics interface for real operators.
```

## Screen 10. Admin Live Operations Map

```text
Using the Mealflo design system already established, design the live operations screen for admins.

This should be a map-dominant screen showing:
- active route lines
- live driver markers
- driver cards
- delivered count
- remaining count

The feeling should be dynamic but calm. The map should feel genuinely live. Show a believable Greater Victoria route in progress with one or more active drivers, but do not make the interface noisy.
```

## Screen 11. Admin Inventory

```text
Using the Mealflo design system already established, design the inventory screen.

This screen should have two sections:
- deliverable meals
- ingredients

Deliverable meals should show:
- item name
- quantity
- category
- dietary tags
- allergen flags
- refrigeration indicator

Ingredients should show:
- item name
- quantity
- source
- perishability sorting
- refrigeration indicator

Include a compact area for manual text entry and a visible receipt/document parsing affordance. Make the whole screen feel practical and surprisingly elegant, not like warehouse software.
```

## Screen 12. Driver Welcome

```text
Using the Mealflo design system already established, design the mobile driver welcome screen.

This is the first screen a phone user sees. It should feel polished, friendly, and confidence-building. Include:
- a short explanation of the Mealflo demo
- a location permission prompt moment
- a clear continue action

This should feel like the opening of a real mobile product, not a prototype placeholder.
```

## Screen 13. Driver Availability Picker

```text
Using the Mealflo design system already established, design the mobile driver availability screen.

The driver should pick how much time they have from a small number of large, touch-friendly options such as:
- 30 min
- 45 min
- 60 min
- 90 min

Also include a simple driver persona selector. The screen should feel fast, obvious, and satisfying to use. It should set up the route suggestion as the next magical step.
```

## Screen 14. Driver Route Offer

```text
Using the Mealflo design system already established, design the mobile driver route offer screen.

This screen should present one recommended route in a compelling, easy-to-accept format. Show:
- route name
- stop count
- drive time
- total planned time
- assigned vehicle
- first stop preview
- ETA

Include strong Accept Route and lighter alternate route actions. The design should make the route feel manageable, well-composed, and trustworthy.
```

## Screen 15. Driver Active Route Map

```text
Using the Mealflo design system already established, design the mobile active route map screen.

This is the most important driver screen. It should include:
- live current position
- route line
- next stop card
- ETA
- delivered count
- remaining count
- a call action

The map should dominate. The layout should feel focused, tactile, and premium. It should suggest real navigation confidence without becoming cluttered.
```

## Screen 16. Driver Stop Detail

```text
Using the Mealflo design system already established, design the mobile stop detail screen.

This screen should show:
- client name
- full address
- delivered items / meal count
- dietary and allergy warnings
- access notes
- original inbound message excerpt if available

Actions:
- Call
- Delivered
- Couldn't deliver

This screen should feel extremely clear, supportive, and easy to use under pressure. Make the completion actions feel obvious and satisfying.
```

## 4. Optional Extra Prompt: Cross-Screen Presentation Board

If you want Claude Design to create one final board showing the whole product system, use this:

```text
Create a presentation board showing the Mealflo product system across desktop and mobile.

Include:
- the desktop demo shell
- the admin dashboard
- the inbox review screen
- the route planning screen
- the live operations map
- the public landing page
- the driver route offer screen
- the driver active route map
- the driver stop detail screen

This board should communicate that Mealflo is one coherent, premium, beautifully designed product ecosystem for food delivery operations.
```
