# Mealflo Spec Questions — Round 2

Answer directly under each question with `>` lines.

These are the remaining questions I think we need to settle before I write the spec. I’ve kept this round much tighter and more opinionated.

## What I Think Is Already Settled

- We are building around three roles: `admin`, `driver`, and `client`.
- Desktop demo uses a role/persona picker; phone opens straight into driver mode after a short welcome screen.
- The most important live-demo beats are:
  - inbound request arriving live
  - route/map experience for drivers
  - live drivers visible on the admin dashboard
- Real integrations matter for:
  - public form submission
  - email ingestion
- AI should parse and structure things, but humans should be able to review source + parsed output and approve/edit easily.
- The driver flow should be extremely simple: choose availability, accept route, follow map, mark `Delivered` or `Couldn't deliver`.
- We should curate our own demo dataset, using real Greater Victoria geography and believable local names/items/orgs.
- We should optimize for what is visible and magical in the demo, even if some underlying pieces are partly simulated.

If any of that is wrong, mark it clearly in your answers.

---

## 1. Demo State and Shared Reality

1. When multiple audience members scan the QR code and open driver mode, should they all be seeing:
   - the same shared demo routes
   - their own per-session copy of a route
   - or a mix, where some routes are "real" and some are personal demo clones
> shared demo routes, yes — like there is a pre-set list from the admin dashboard, but any number of people can choose the same route. 
> Also, ensure the site prompts them for their location and shows them on the map. 

2. If five people choose the same pretend driver, should the admin dashboard show:
   - one shared driver card/marker
   - five separate live sessions
   - or one real driver plus extra "demo riders"
> yeah, just one driver card — I don't care which device it gets from, just choose one. 

3. You mentioned drivers should "never actually get completed." What do you want the state model to be?
   Options:
   - route progress is purely local to each phone session
   - route progress updates the central DB, but resets automatically
   - route progress updates the central DB, but only for selected demo routes
> Yeah, route progress can be purely local.

4. For the live dashboard, do you want the `delivered count` and `remaining count` to reflect:
   - one canonical route state
   - the current viewer's phone session
   - or a synthetic aggregate for demo purposes
> yeah, one route state. If there are multiple people with the demo open, just choose the first one and stick to it. 

## 2. Route Planning Logic

5. What should be considered part of the `66% to 75%` capacity band?
   Options:
   - drive time only
   - drive time + fixed 2 minutes per stop
   - drive time + stop service estimates + buffer
> drive time + fixed 2 minutes per stops

6. If there are not enough good stops to reach 66% of a volunteer's time, should we:
   - allow a much smaller route
   - hold the volunteer unused
   - or pull in lower-priority/later stops more aggressively
> we can allow a smaller route, but also pull in later/lower-priority stops if they are available.

7. When there are too many requests for the available volunteers, what is the ranking priority?
   Please order these from highest to lowest:
   - urgency
   - perishability
   - route efficiency
   - household size / impact
   - fairness across neighborhoods
   - existing client status / repeat service
> you choose — use your moral compass and just make it feel right in the demo.

8. What should be the default route start point?
   Options:
   - depot only
   - volunteer home/start location only
   - volunteer starts at depot, then deliveries begin
   - depends on route type
> the depot should be the start point. volunteers can manage their own time for getting there. 

9. What is the minimum manual override we must support in admin for the MVP?
   My default recommendation is:
   - approve route
   - remove stop
   - add stop
   - reassign route to another driver
   If you want less or more, say so.
> yeah, that's good. 

10. For "tomorrow" and "later" jobs that get pulled into a route, should the system:
   - actually move them into today's route
   - mark them as opportunistically fulfilled early
   - or treat them as flexible jobs with no visible distinction
> yeah, move them into today's route. 

## 3. Inventory and Food Model

11. I think we should separate inventory into:
   - `ingredients` for intake/receipt parsing
   - `deliverable meal items` for route allocation
   and avoid trying to fully model meal production from ingredients during the hackathon.
   Do you agree?
> Yeah, 100%. Let's keep the inventory model simple and focused on what we can demo well.

12. If yes, how much should ingredients matter in the actual route-planning flow?
   Options:
   - ingredients are mostly a separate inventory/demo feature
   - ingredients roll up into meal availability counts manually
   - ingredients automatically determine meal availability
> Mostly separate. Keep it simple. 

13. When inventory is insufficient for all candidate stops, what should happen?
   Options:
   - block route generation
   - generate route but flag shortages
   - partially allocate and leave some stops unassigned
> I mean, we still want routes, just exclude stops if we don't have enough inventory. 

14. For each stop, what does the driver need to see about the delivery payload?
   Options to react to:
   - total meal count only
   - named items/meals
   - allergen/dietary warnings
   - ingredients should not appear to the driver
> I think the full list would be good. 

## 4. Intake, Email, and Approval Flow

15. For email ingestion, what exact scope do you want in the hackathon MVP?
   Options:
   - read a connected inbox and ingest new messages
   - read only a specific Gmail label/folder
   - also send follow-up replies from Mealflo
   - incoming only, no outbound
> Read a connected inbox and ingest new messages. I can provide the inbox whenever needed. No need for outbound. 

16. Public form submissions and email messages currently imply two slightly different approval models in your answers.
   Which should be true?
   - both become structured drafts that still need admin approval
   - forms auto-create approved records, email needs approval
   - requests auto-create, volunteers need approval
> both become structured drafts that still need admin approval.

17. When the parser is unsure, what is the most important fallback?
   Options:
   - leave more fields blank
   - make a best guess but flag low confidence
   - ask the admin one clarifying question inline
> flag low confidence, but still make a best guess.

18. Do you want the admin to be able to reply to an incoming email from inside Mealflo in the MVP, or is viewing and approving enough?
> just viewing/approving is enough for demo purposes. 

## 5. Driver Experience Details

19. What counts as "in-app navigation" for the demo?
   Options:
   - full turn-by-turn style directions in our UI
   - live map with current position, route line, next stop, and ETA
   - map preview in-app, but deep link to native maps for actual navigation
> live map with current position, turn-by-turn, route line, next stop, and ETA.

20. At the stop screen, what are the must-show fields?
   My default set is:
   - client name
   - address
   - delivered items / meal count
   - access notes
   - dietary/allergy warnings
   - original inbound message when available
> yeah, precisely. Layed out cleanly and well. 

21. Should the driver be able to see any contact action on the stop screen?
   Options:
   - no contact actions for MVP
   - call only
   - text only
   - both call and text
> call only, for demo simplicity.

22. For actual browser geolocation, how often is it acceptable to update location?
   Options:
   - every few seconds for active routes
   - every 15-30 seconds
   - only on major actions like start route / complete stop
> every 15-30 seconds, to balance realism and demo performance.

## 6. Demo Dataset and Realism

23. For "real Victoria addresses," are you comfortable using:
   - real street addresses with fake names
   - only public/community-building addresses
   - real streets but generated house numbers
> Yeah, real addresses with fake names is totally fine. We can use real streets and house numbers, but just make sure the client names are fictional. 

24. Do you want the demo org/depot names to sound:
   - fully fictional but local
   - lightly inspired by real local organizations
   - or directly modeled on real organizations
> Org/depot names — honeslty can be super generic. 

25. For volunteers and clients, do you want clearly fake demo personas, or should they feel almost documentary-real?
> Documentary-real would be good — everyone will know it's fake data. 

## 7. Spec Boundary

26. Which of these should the spec treat as `core MVP`, not stretch?
   Please react to each:
   - admin inbox review yes
   - admin triage board maybe
   - route generation yes
   - manual route override no
   - live dashboard map yes
   - phone driver flow yes
   - public request form yes
   - public volunteer form yes
   - Gmail ingestion yes
   - receipt/manual inventory entry yes
   - perishability AI sort maybe

27. Which 3 things should I explicitly mark as "likely simulated or simplified for demo" so the spec stays honest?
> some ingestion, some route planning logic (if needed), and obviously lots of the driver flow details.

28. If I have to make one strong product decision on your behalf in the spec, where do you most want me to just choose the right answer and move?
> Antying techincal, especially around making features look good in the demo, even if they are partly simulated. I trust your judgement on this, just make it feel magical and real for the audience.
