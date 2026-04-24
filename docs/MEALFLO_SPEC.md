# Mealflo Hackathon Product Spec

Version: `v1`

Date: `2026-04-22`

Status: `Spec approved for build`

## 1. Purpose

Mealflo is a hackathon-stage operations product for volunteer-led food delivery. It is designed to make the value obvious within minutes:

- inbound requests get turned into structured work fast
- admins can see what needs action now
- drivers get an easy, map-first route experience
- the audience can watch live delivery activity happen on the dashboard

This spec is intentionally optimized for:

- demo clarity
- hackathon speed
- believable product depth
- future extensibility after the event

This is not a production-complete social services system. It is a tight, magical, highly legible demo product that should feel like a real company prototype rather than a notebook with buttons.

## 2. Product Thesis

Mealflo is a dispatch and driver system for meal and hamper delivery teams. It combines:

1. An admin console for intake, triage, routing, inventory awareness, and live delivery monitoring.
2. A mobile-first driver app for route acceptance, navigation, and stop completion.
3. A public intake experience for requesting food or volunteering.
4. A demo wrapper that makes the whole system legible on stage and easy to explore from multiple devices.

## 3. What Success Looks Like

Judges should walk away thinking:

`Why is this not already how these organizations operate?`

The live demo must land three moments:

1. A real inbound request arrives and is parsed into a structured draft.
2. A driver gets an automatic route and follows it on a live map.
3. The admin dashboard shows live drivers moving and route progress updating.

## 4. Product Principles

### 4.1 Demo First

If a feature is not visible, understandable, or emotionally convincing in the demo, it is lower priority than a visible core flow.

### 4.2 Low Cognitive Load

This product is for tired, busy people. Admin and driver flows should be obvious in under 5 seconds.

### 4.3 Source + Parse + Approval

AI may parse, classify, clean, and suggest, but admins must be able to compare the original input with the parsed result and approve it quickly.

### 4.4 Deterministic Safety Rules

Anything safety-related should be enforced with deterministic backend logic, not LLM guesswork.

### 4.5 Believable Reality

The product may simplify internals for demo purposes, but visible geography, names, delivery details, and operational behavior should feel documentary-real.

## 5. MVP Boundary

## 5.1 Core MVP

The following are in scope for the core hackathon build:

- admin inbox review
- automatic parsing of inbound form and email requests
- admin approval of structured drafts
- route generation
- live admin dashboard map
- phone driver flow
- public request form
- public volunteer form
- Gmail ingestion
- inventory entry for manual input and receipt parsing scaffolding

## 5.2 Secondary MVP / If Time

These are desirable but not required for the first shippable demo:

- admin triage board polish
- perishability AI sort polish
- minimal manual route override
- richer driver stop detail states
- better routing explanations

## 5.3 Explicitly Simplified For Demo

The spec should stay honest about these likely simplifications:

1. Some ingestion will be partly curated or semi-simulated even if email/form integration is real.
2. Some route-planning logic may use strong heuristics instead of full optimization.
3. Some driver-flow detail will be intentionally simplified to keep the mobile experience magical and reliable.

## 6. Roles and Surfaces

Mealflo has three product roles:

### 6.1 Admin

The operations person who:

- reviews incoming messages and form submissions
- approves structured drafts
- sees request demand
- creates or approves routes
- sees active drivers and live map state
- manages inventory awareness

### 6.2 Driver

The volunteer or staff driver who:

- chooses how much time they have
- accepts a suggested route
- follows a live in-app route map
- sees each stop's context and instructions
- marks stops delivered or not delivered

### 6.3 Client

The public user who:

- requests food delivery
- or offers to volunteer

## 7. Product Surfaces

Mealflo behaves like two products sharing one backend:

- desktop/admin/public product
- phone-first driver product

The desktop demo is wrapped in a thin dark shell with top-level tabs for:

- Admin View
- Public View
- Driver View

The shell also includes stage controls such as:

- switch role/persona
- trigger incoming message
- simulate next stop
- switch active driver
- toggle live vs fake GPS

On phones:

- no outer shell
- no role switcher
- app opens into a short welcome screen and then driver mode

## 8. Core Experience Summary

## 8.1 Admin Experience

Admin opens Mealflo and sees:

- intake requiring attention
- route readiness for today
- live drivers on the map
- inventory pressure

Admin can:

- inspect raw source messages and parsed drafts
- approve a request or volunteer
- see approved requests in today's demand
- generate routes
- assign a route to a driver persona
- watch route activity live

## 8.2 Driver Experience

Driver opens Mealflo on their phone and sees:

- welcome screen
- time availability picker
- suggested route
- live route map
- stop details and actions

The driver flow is deliberately locked down and simple.

## 8.3 Client Experience

Public users land on a simple page with two calls to action:

- Request food
- Volunteer

Form submissions are parsed into structured drafts and require admin approval.

## 9. Screen Inventory

The app should contain the following screens.

## 9.1 Shared / Demo Wrapper

### Screen 1. Desktop Demo Shell

Purpose:

- wrap the live app in a presentation-friendly shell
- expose role switching and demo controls

Key elements:

- dark outer frame
- tab-like role switcher
- current persona chip
- demo controls rail
- inner app viewport

## 9.2 Public Screens

### Screen 2. Public Landing Page

Purpose:

- explain the two paths into the system
- route users to request food or volunteer

Key elements:

- concise mission statement
- two large action cards/buttons
- reassurance that this is a demo experience

### Screen 3. Public Food Request Form

Purpose:

- collect minimum viable food request info

Required fields:

- name
- address
- contact method

Optional fields:

- household size
- dietary notes
- urgency
- access notes
- freeform message

Behavior:

- submission creates an intake message and a structured draft
- does not auto-approve

### Screen 4. Public Volunteer Form

Purpose:

- capture volunteer interest

Required fields:

- name
- contact info
- availability

Optional fields:

- vehicle access
- starting area
- notes

Behavior:

- creates an intake message and volunteer draft
- requires admin approval

## 9.3 Admin Screens

### Screen 5. Admin Dashboard

Purpose:

- give one-screen operational awareness

Primary modules:

- inbox requiring review
- today's approved requests
- suggested routes
- live drivers map
- inventory snapshot
- volunteer capacity snapshot

Key metrics:

- new intake count
- approved requests for today
- total routes ready
- active drivers
- meals available

### Screen 6. Admin Inbox / Intake Review

Purpose:

- process raw input into approved entities

Layout:

- left column: feed of raw inbound items
- center: raw source artifact
- right: parsed structured draft

Actions:

- approve
- edit then approve
- ignore
- mark as other

Supported draft types:

- request draft
- volunteer draft
- client draft
- other / undefined

Must-show trust signals:

- original message body
- parser confidence
- low-confidence field badges
- parsed address
- parsed urgency
- parsed dietary/access flags

### Screen 7. Admin Requests / Triage Board

Purpose:

- view approved work waiting for dispatch

Layout:

- columns or grouped lists for `today`, `tomorrow`, and `later`
- request cards with key badges

Card fields:

- client name
- address
- due bucket
- household size
- meal count
- urgency
- safety/access notes
- dietary/allergy badges

Behavior:

- routes are generated from approved requests, primarily from `today`
- `tomorrow` and `later` may be pulled in opportunistically

### Screen 8. Admin Route Planning

Purpose:

- generate routes across all available volunteers

Main panels:

- available drivers and their time windows
- route suggestions
- route map
- excluded requests and why

Route card should show:

- assigned driver
- assigned vehicle
- stop count
- route ETA
- capacity utilization
- drive time
- total planned time
- why these stops were selected

Core actions:

- generate routes
- approve route

Secondary actions if time:

- remove stop
- add stop
- reassign route to another driver

### Screen 9. Admin Route Detail

Purpose:

- inspect a single route before or during execution

Contents:

- stop sequence
- map with route line
- item allocations per stop
- warnings
- route summary

Stop row contents:

- client name
- address
- meal/items
- safety/access badges
- due bucket origin
- ETA

### Screen 10. Admin Live Operations Map

Purpose:

- show active routes and live driver positions

Main elements:

- map with route lines
- driver markers
- route cards
- delivered count
- remaining count

Behavior:

- one canonical dashboard state per route
- if multiple phones open the same route, the first active route session becomes the dashboard anchor

### Screen 11. Admin Inventory

Purpose:

- show what food is available and what is route-ready

Two sections:

- deliverable meals
- ingredients

Deliverable meal items include:

- item name
- category
- available quantity
- dietary tags
- allergen flags
- refrigeration requirement

Ingredient items include:

- item name
- source
- quantity
- perishability sort
- refrigeration requirement

Entry methods:

- manual text entry
- receipt/document parsing scaffold

## 9.4 Driver Screens

### Screen 12. Driver Welcome

Purpose:

- orient phone users immediately

Contents:

- demo explanation
- permission prompts
- location prompt
- continue button

### Screen 13. Driver Availability Picker

Purpose:

- collect available time in the simplest possible way

Options:

- 30 min
- 45 min
- 60 min
- 90 min

Optional:

- named driver selector

### Screen 14. Driver Route Offer

Purpose:

- show one recommended route and ask for acceptance

Must-show summary:

- route name
- stop count
- total drive time
- total planned time
- ETA
- vehicle
- first stop

Actions:

- accept route
- choose another route if available

### Screen 15. Driver Active Route Map

Purpose:

- provide the magical core driver experience

Must-show:

- current position
- route line
- next stop
- ETA
- stops remaining
- delivered count
- call action

Behavior:

- live location updates every 15-30 seconds
- route begins at depot
- route line remains visible throughout the session

### Screen 16. Driver Stop Detail

Purpose:

- let the driver complete a stop with full context

Must-show fields:

- client name
- address
- delivered items / meal count
- access notes
- dietary/allergy warnings
- original inbound message when available

Actions:

- call
- delivered
- couldn't deliver

For MVP:

- no required failure reason
- no proof of delivery
- no text action

## 10. Demo-State Model

This is one of the most important parts of the spec.

Mealflo must feel shared and live on stage without becoming fragile.

## 10.1 Shared Routes

- Admin defines a pre-set set of available demo routes.
- Any number of audience members may open the same route.
- Routes are shared as choices, not exclusive claims.

## 10.2 Local Driver Progress

- Driver progress is local to each phone session.
- A phone user can move through a route without changing the global route state for every other viewer.

## 10.3 Canonical Dashboard Session

To keep the admin dashboard stable:

- the first active phone session on a given route becomes the `anchor session`
- the dashboard uses that anchor session for:
  - live location
  - delivered count
  - remaining count
- additional phones on the same route do not replace the anchor unless:
  - the anchor disappears
  - or the route is reset manually in demo controls

This gives us:

- believable shared reality
- stable dashboard behavior
- safe multi-device demo use

## 10.4 Route Reset

Demo controls should support route reset for stage use.

Reset returns a route to:

- not started
- zero delivered
- all stops remaining
- no anchor session

## 11. User Flows

## 11.1 Food Request Flow

1. User submits public food request form or sends email.
2. Intake record is created.
3. Parser extracts structured fields.
4. Admin opens inbox item.
5. Admin compares raw source and parsed result.
6. Admin edits if needed.
7. Admin approves.
8. Approved request appears in triage board.
9. Route generator includes it in planning.
10. Driver sees stop in route.
11. Driver completes or skips stop.

## 11.2 Volunteer Signup Flow

1. User submits volunteer form or email.
2. Intake record is created and parsed.
3. Admin reviews and approves.
4. Volunteer becomes available in roster.
5. Volunteer can be matched to routes in admin view.

## 11.3 Driver Flow

1. Driver opens app on phone.
2. Welcome screen explains demo.
3. User grants location permission.
4. User chooses time available.
5. User picks a driver persona.
6. App recommends a route.
7. User accepts route.
8. Active route map opens.
9. User taps into stop detail.
10. User marks `Delivered` or `Couldn't deliver`.
11. App advances to next stop automatically.

## 11.4 Admin Dispatch Flow

1. Admin approves drafts from inbox.
2. Admin reviews today's demand and volunteer availability.
3. Admin runs route generator.
4. App produces route suggestions across all available volunteers.
5. Admin approves routes.
6. Drivers open route offers on phones.
7. Dashboard shows live execution.

## 12. Data Model

The backend data model should stay normalized enough to be sane, while the UI should feel blended and fast.

## 12.1 Core Entities

### IntakeMessage

Represents a raw inbound item from:

- public request form
- public volunteer form
- email

Fields:

- id
- source_type
- source_address
- subject
- raw_text
- raw_html
- received_at
- parser_status
- parser_confidence
- classification
- processed_at

### IntakeDraft

Represents the parsed result of an intake message.

Fields:

- id
- intake_message_id
- draft_type
- structured_json
- low_confidence_fields
- status
- approved_at
- approved_by

### Client

Fields:

- id
- full_name
- contact_phone
- contact_email
- address
- lat
- lng
- household_size
- dietary_profile
- allergy_profile
- access_notes
- safe_to_leave
- do_not_enter
- assistance_at_door
- requires_two_person
- active_status

### Volunteer

Fields:

- id
- full_name
- contact_phone
- contact_email
- home_start_area
- default_vehicle_access
- notes
- weekly_hours_estimate
- demo_persona

### VolunteerAvailability

Fields:

- id
- volunteer_id
- source
- raw_text
- recurring_rule
- date
- minutes_available
- parsed_confidence

### Vehicle

Fields:

- id
- name
- type
- refrigerated
- capacity_meals
- notes

### DeliveryRequest

Fields:

- id
- client_id
- source_intake_draft_id
- due_bucket
- scheduled_date
- urgency_score
- household_size
- requested_meal_count
- approved_meal_count
- notes
- status

### DeliverableMealItem

Represents route-allocatable food units.

Fields:

- id
- name
- category
- quantity_available
- allergen_flags
- dietary_tags
- refrigerated

### IngredientItem

Represents inventory ingredients or raw goods.

Fields:

- id
- name
- quantity
- unit
- refrigerated
- perishability_score
- source_type
- source_reference

### Route

Fields:

- id
- route_name
- driver_id
- vehicle_id
- start_depot_id
- status
- planned_drive_minutes
- planned_stop_minutes
- planned_total_minutes
- stop_count
- delivered_count
- remaining_count
- dashboard_anchor_session_id

### RouteStop

Fields:

- id
- route_id
- request_id
- client_id
- sequence
- eta
- meal_summary
- item_summary
- access_summary
- original_message_excerpt
- status

### DriverSession

Represents a mobile session on a route.

Fields:

- id
- route_id
- volunteer_id
- device_fingerprint
- started_at
- last_seen_at
- current_lat
- current_lng
- delivered_count_local
- current_stop_index
- is_anchor

## 12.2 UI Modeling Decision

Mealflo should keep `client` and `delivery request` separate in the backend, but blend them in the UI.

Why:

- clients persist over time
- requests are per-delivery work items
- the admin UI should still feel like one fast object to review

So:

- backend: separate entities
- frontend cards: blended `request + client context`

## 13. Routing and Dispatch Spec

This is the heart of the product.

## 13.1 Hard Constraints

The route generator must not knowingly violate these rules:

- approved requests only
- valid geocoded address required
- route starts at depot
- route total time must not exceed 75% of driver availability
- route time = drive time + 2 minutes per stop
- if an item requires refrigeration, the assigned vehicle must support refrigerated transport or the route gets a strong warning and that stop should normally be excluded
- allergen hard blockers should prevent incompatible item assignment
- do-not-enter, safe-to-leave, assistance-at-door, and two-person requirements must be surfaced as route flags
- inventory must exist for assigned items

## 13.2 Capacity Rule

The target band is:

- minimum target: 66% of available minutes
- maximum target: 75% of available minutes

Interpretation:

- under 66% is acceptable if there are not enough good stops
- never exceed 75%
- route planning uses `drive minutes + (2 * stop_count)`

## 13.3 Default Start Point

Routes start at the depot.

Volunteer travel to the depot is not modeled in route duration.

## 13.4 Request Ranking Priority

When demand exceeds capacity, Mealflo should prioritize:

1. urgency
2. household impact
3. perishability
4. route efficiency
5. existing client continuity
6. fairness across neighborhoods

Why this order:

- urgent needs must win first
- feeding larger households creates visible impact
- perishables should not be stranded
- efficient routes let us help more people
- continuity matters, but should not outrank urgent need
- neighborhood fairness matters, but not at the cost of urgent unmet need in a hackathon demo

## 13.5 Due Buckets

Requests live in:

- today
- tomorrow
- later

Route generation starts with `today`.

Then it may pull in `tomorrow` or `later` requests if:

- the request is geographically compatible
- the route still fits within the time cap
- inventory exists

If a later request is included:

- it is moved into today's route
- it should be labeled as fulfilled early

## 13.6 Geographic Compatibility Rule

To define "along the same route," use a simple deterministic rule:

- candidate stop must be in the same route cluster
- and inserting it must add no more than the lesser of:
  - 8 extra drive minutes
  - 12% extra route drive time

This is good enough for demo logic and easy to explain.

## 13.7 Route Generation Algorithm

Recommended heuristic:

1. Filter approved, unassigned, geocoded requests.
2. Split by due bucket.
3. Score requests using weighted priority.
4. Group by depot and geography.
5. For each available driver:
   - determine minute budget
   - determine eligible vehicle
   - build a candidate route from highest scoring nearby requests
   - use route time cap logic
6. Allocate meal items to each stop.
7. Exclude stops with insufficient inventory.
8. Produce route cards with reasons and warnings.

## 13.8 Route Explanation

The UI should explain routes using:

- total drive time
- total planned time
- stop count
- priority coverage
- perishables included
- inventory fit
- excluded requests and why

The explanation should stay concise and non-technical.

## 13.9 Manual Override

Core MVP only requires route approval.

If time allows, add these minimal overrides:

- remove stop
- add stop
- reassign route

Do not build a full drag-and-drop dispatcher studio unless the rest of the app is already solid.

## 14. Inventory Spec

## 14.1 Inventory Layers

Mealflo uses two inventory layers:

### Ingredients

Used for:

- receipt parsing
- manual inventory intake
- perishability sorting
- visual inventory realism

Not used directly for route generation, except indirectly through human operations.

### Deliverable Meals

Used for:

- route allocation
- stop payloads
- dietary/allergy matching
- refrigeration checks

This separation is intentional and should not be blurred during the hackathon.

## 14.2 Inventory Entry

Supported entry modes:

- manual text
- receipt or document parsing scaffold

For MVP:

- manual text should work well
- OCR parsing can be partly simulated if needed

## 14.3 Perishability Sort

Ingredients should default-sort by perishability, using:

- LLM suggestion
- human confirmation

This is a good demo AI feature because it is visible, intuitive, and low-risk.

## 14.4 Route Allocation

Each route stop should show exact named meal items, not only category totals.

Drivers should not see ingredient inventory.

Drivers should see:

- meal names
- quantities
- allergy/dietary warnings

## 14.5 Insufficient Inventory

If inventory is insufficient:

- route generation should still succeed
- stops without enough deliverable meals should be excluded
- exclusions should be visible in the admin route planning screen

## 15. AI and Trust Model

AI is a helper, not the source of truth.

## 15.1 AI Jobs In Scope

Mealflo should use AI for:

- message parsing
- urgency classification
- address cleanup
- dietary extraction
- OCR extraction for receipts/documents
- voice transcription scaffold if needed
- perishability ranking

Do not make route explanation a major AI feature.

## 15.2 Trust Pattern

For all important AI outputs:

- show source
- show parsed result
- show confidence
- flag low-confidence fields
- require human approval before creation becomes official

## 15.3 Parser Fallback Behavior

If the parser is unsure:

- it should still make a best guess
- it should flag low confidence
- it should never silently fabricate high-confidence certainty

## 16. Intake and Gmail Integration

## 16.1 Inbound Channels

Real integrations in MVP:

- public food request form
- public volunteer form
- connected Gmail inbox

Other channels may be represented visually but are not real in MVP.

## 16.2 Gmail Scope

Gmail integration should:

- read new inbound messages from a connected inbox
- ingest them into IntakeMessage
- not send replies

Recommended implementation choice:

- use a dedicated demo inbox
- poll for new mail on interval and manual refresh

## 16.3 Approval Rule

Both form submissions and email messages:

- become structured drafts
- still require admin approval

This keeps the mental model simple and consistent.

## 17. Driver Product Spec

## 17.1 Driver Availability Input

For the hackathon MVP, driver availability should be chosen from simple time options, not natural language.

Why:

- faster
- clearer
- better for QR-code audience flow
- more reliable

The original natural-language ambition can return later.

## 17.2 Route Offer Logic

After a driver selects time available, the app should:

- find the best fitting pre-generated or dynamically generated route
- show one strong recommendation
- allow alternate route selection only if easy to support

## 17.3 In-App Navigation Definition

For MVP, "in-app navigation" means:

- live map
- current position
- route line
- next stop
- ETA
- simple turn guidance or directional cues where feasible

If full turn-by-turn is too risky, prioritize:

- route line
- current location
- next stop card
- clear progression

This is one of the places where polish matters more than literal navigation completeness.

## 17.4 Stop Screen Requirements

Must display:

- client name
- full address
- meal/item list
- dietary/allergy badges
- access and safety notes
- original inbound message excerpt when available

Must support:

- call
- delivered
- couldn't deliver

Must not require:

- failure reason
- photo
- signature

## 17.5 Location Tracking

While a route is active:

- request geolocation permission
- update location every 15-30 seconds
- reflect anchor-session location on admin dashboard

## 18. Data Strategy

Track 2 is inspiration, not the product database.

Mealflo should use a curated internal dataset with:

- real Greater Victoria addresses
- fictional names
- documentary-real messages
- believable volunteer roster
- realistic inventory names
- generic depot names

Recommended demo data scale:

- 20 active requests
- 10 volunteers
- 5 routes
- 5 vehicles
- 20 inventory items

## 18.1 Geographic Scope

Addresses should feel local and plausible across:

- Victoria
- Esquimalt
- Saanich
- Oak Bay
- Sidney
- Langford
- Colwood
- Metchosin
- Sooke corridor

## 18.2 Content Realism

The visible data should feel real in:

- street names
- depot names
- org names
- food items
- volunteer names
- email senders
- request phrasing

## 19. Technical Architecture

## 19.1 Stack

Use the repo's chosen stack:

- Next.js
- React
- TypeScript
- Tailwind
- Neon Postgres
- Drizzle
- OpenAI API
- MapLibre
- openrouteservice
- Vercel
- PWA/mobile web

## 19.2 Architecture Shape

Single app, shared backend.

Recommended app structure:

- `app/(demo-shell)` for desktop wrapper
- `app/admin/*`
- `app/public/*`
- `app/driver/*`
- `app/api/*` for ingestion, routing, sessions, inventory, and geolocation

## 19.3 Key Services

### Intake Service

Handles:

- form submissions
- Gmail polling/ingestion
- message normalization

### Parser Service

Handles:

- LLM extraction
- confidence scoring
- draft creation

### Routing Service

Handles:

- request scoring
- clustering
- route generation
- route allocation

### Driver Session Service

Handles:

- active mobile sessions
- anchor session election
- location updates
- local progress snapshots

### Inventory Service

Handles:

- deliverable meal availability
- ingredient logging
- perishability sort

## 19.4 Recommended API Endpoints

Suggested endpoints:

- `POST /api/intake/request`
- `POST /api/intake/volunteer`
- `POST /api/intake/email/poll`
- `POST /api/intake/:id/parse`
- `POST /api/drafts/:id/approve`
- `POST /api/routes/generate`
- `POST /api/routes/:id/approve`
- `GET /api/routes/:id`
- `POST /api/driver/session/start`
- `POST /api/driver/session/heartbeat`
- `POST /api/driver/session/stop-complete`
- `POST /api/driver/session/reset`
- `POST /api/inventory/manual`
- `POST /api/inventory/receipt-parse`

## 20. Build Priorities

Recommended build order:

1. App shell and routing structure
2. Curated seed dataset and DB schema
3. Public forms
4. Gmail ingestion
5. Inbox review with source + parsed draft
6. Admin dashboard skeleton
7. Route generation service
8. Driver mobile flow
9. Live driver map and anchor-session logic
10. Inventory screen
11. Demo controls and resets
12. Polish and mock data refinement

## 21. QA Checklist

Before demo, verify:

- forms create drafts
- email ingestion works reliably
- parser output is understandable
- admin can approve a request
- route generation succeeds with current seed data
- route cards explain themselves
- phone location permission works
- route line appears on mobile
- driver can mark stops delivered
- admin sees live driver marker
- route reset works
- seeded addresses geocode correctly

## 22. Final Product Positioning

Mealflo should feel like:

- a real product
- built for volunteer-led meal logistics
- surprisingly complete
- warm and humane
- operationally smart

It should not feel like:

- a spreadsheet replacement with generic charts
- an AI toy
- a route optimizer with no human workflow
- a fake dashboard with no mobile execution story

## 23. Final Implementation Assumptions

The following decisions are intentionally made on behalf of the team so we can move:

- client and request stay separate in the backend, blended in the UI
- route priority order is urgency > household impact > perishability > efficiency > continuity > neighborhood fairness
- route compatibility for early fulfillment uses an insertion-cost threshold
- driver anchor-session logic controls the shared live dashboard state
- ingredients and deliverable meals stay separate
- driver availability uses simple time picks for the MVP instead of natural-language parsing

These are the right tradeoffs for the hackathon build.
