# Mealflo Spec Questions — Round 1

Answer directly under each question with `>` lines.

Example:

> We want staff to be able to override any route suggestion.

If a question feels premature, answer with `> TBD` and we can tighten it in the next round.

## Repo / Track 2 Takeaways

- The repo currently contains the BuildersVault hackathon kit, your `mealflo-icons`, and a `TECH_STACK.md`. There is not yet an actual product app scaffold in this repo.
- `TECH_STACK.md` already points toward a strong hackathon stack: Next.js + React + TypeScript + Tailwind + Neon + Drizzle + OpenAI + MapLibre + openrouteservice.
- The `.env` already has keys set for Neon, OpenAI, openrouteservice, and the map style URL.
- Track 2 is useful as seed material for clients, requests, routes, stops, vehicles, drivers, depots, and item catalogs.
- The Track 2 docs are not fully consistent with the actual SQLite data. We should treat the actual dataset as the source of truth when the README and the data disagree.
- The kit does not give us real inbound-message feeds, dynamic volunteer availability, inventory-on-hand counts, receipt OCR flows, or live driver telemetry. Those are product features we would need to build or simulate.
- Some of the sample names and addresses are clearly synthetic and not demo-quality. We should likely curate or replace the visible demo dataset.

## Working Product Thesis

My current read is that the strongest version of Mealflo for this hackathon is:

1. A staff dispatch console with an intake inbox, triage board, route builder, inventory panel, and live driver view.
2. A phone-first driver flow that lets a volunteer *accept* a route, start it, see the map and ETA, and mark each stop delivered or not delivered.
3. A public intake surface for food requests and volunteer signups.
4. A demo layer that makes the whole thing legible on stage: role-switching, simulated *(and real!)* inbound messages, and visible live route progress.

If that thesis is wrong, say so early in your answers.

---

## Critical Decisions

### 1. Demo Story and Scope

1. In one sentence, what should judges remember after seeing Mealflo?
>  "Why isn't this implemented already!? It makes everyone's lives easier and takes away manual, tedious work"

2. What are the 3 moments that absolutely must land in the live demo?
> Getting the message live, the driver routing/mapping, and seeing drivers show up in the live dashboard. 

3. If we have to optimize for one surface first, which is it: staff dispatch, driver execution, or intake magic?
> Driver execution is probably the most key — right now, they don't have maps at all, so that will be key. 

4. Which parts of your notes are aspirational but should probably not be in the weekend MVP?
> Ideally, we do all of it! The world of Agentic development is here, it should all be possible. 

5. Do you want one tightly polished end-to-end workflow, or a broader app with more features but less depth?
> Ideally, both. But when we need to skip things, skip things that won't be visible (literally and figuratively) in the demo. We need to gets the judges to understand the value prop and the user experience, so anything that doesn't serve that can be cut if we need to cut. We can build the final touches and real integrations later — this is about the visual, the core, the flow, the magic ✨.

6. Which constraints do you want treated as true hard rules in the product right now?
   Options to react to: allergens, dietary compatibility, cold chain, safe-to-leave, do-not-enter, assistance-at-door, two-person support, volunteer hour limits, vehicle capacity.
> Yes to all, unless they are causing us major issues, then we can drop items. For the cold chain, at ingredient ingestion time, things should get marked as needing refrigeration or not, and then when they get allocated to a route, if they need refrigeration, that should trigger a warning if the volunteer doesn't have a cooler/fridge/whatever.

1. Are there any kit constraints you explicitly want to ignore or soften besides the wheelchair van one?
> The obvious bit is regenerating addresses — we need a real, realistic set of addresses in the greater victoria area (Sidney to Sooke, inclusive) for the demo. For all of the data, though, take the sample data as a template — but we can generate our own, better-curated, more useful data and put that in our DB, where it will actually live. 

### 2. Personas, Roles, and Surfaces

8. What roles exist in the MVP?
   Candidate roles: dispatcher/admin, staff operator, volunteer driver, food requester, volunteer applicant, demo operator.
> let's try to simplify to: admin, driver, client (and everything else is a subset of those three)

9. Should staff and volunteer functionality live in one app with different modes, or feel like separate products sharing the same backend?
> It is, in a sense, two products with one backend — but the products will share a visual identity, feel, etc.

10. Since auth is intentionally light for the hackathon, how should role switching work in the demo?
   Options: role picker, named personas, passcode for staff, phone auto-opens driver mode.
> For the desktop demo, a role picker with named personas would be best. For the phone, it should auto-open driver mode for maximum immersion and simplicity. Have a welcome screen in all cases though, explaining it's a demo, and any other key information. 

11. Should a volunteer on mobile be able to pick any pretend driver identity, or should the demo operator assign them first?
> Yeah, they should be able to pick any pretend driver identity, and it shouldn't cause problems if mlutiple people choose the same one — it's a demo, not a real app. 

12. Do staff and volunteer actions need any visible audit/history trail in the MVP, or is current state enough?
> No, don't worry about it. 

### 3. Intake Inbox and Request Creation

13. Which inbound channels actually matter for the demo?
   Options to react to: web form, manual entry, Gmail, SMS, LinkedIn, Instagram, Messenger, Facebook.
> For the demo: let's just have a web form and *email* (we will use that for the demo instead of linkedin). Everything else we could support down the line, but doesn't matter right now.

14. For each of those channels, do you want a real integration, a simulated feed, or a hybrid?
> Real integration for the form & email.

15. Do you want one unified inbox for both incoming food requests and incoming volunteer offers, or two adjacent inboxes?
> I think like, on one screen, but two separate feeds or something. 

16. Should one raw message be able to become any of these: a request, a client profile, a volunteer profile, or just a triage item?
> Yeah, it should be any of those three, and a fourth other/undefined category for things that don't fit.

17. What is the minimum information required before a food request can move from inbox to dispatchable request?
   Candidate fields: name, phone, address, household size, urgency, dietary needs, notes.
> just address and one form of contact, effectively. everythign else is nice to have, but not required — but we can say that like, you'll be lower priority if you only have address.

18. How much human review should happen after LLM parsing and before a request is created?
   Options: auto-create draft, require confirmation, require field-by-field confirmation.
> everything from an LLM should require confirmation — but it should be easy, glanceable. we should always show the raw, the parsed data (cleanly), and easy approve/ignore/edit buttons.

19. When information is incomplete, what should the system do?
   Options: keep in inbox, create draft request with missing-fields badge, suggest follow-up message, allow dispatcher override.
> well, everything needs approval, so the manager can figure it out

20. How important is duplicate detection in the MVP?
   Options: must-have, useful but lightweight, can skip.
> useful but lightweight. 

21. Should requests be triaged into `today`, `tomorrow`, and `later` automatically from message content, manually by dispatcher, or both?
> both. we can have an LLM suggestion, but the dispatcher should be able to easily change it.

22. Do you want referral or word-of-mouth requests to feel first-class, even if the requester is not the end recipient?
> nah, don't worry too much about it. 

### 4. Core Request / Client Model

23. What is the main thing we are routing?
   Options: household requests, delivery orders, individual stops, or client records with attached requests.
> all of the above, really. the routing engine should just do it all — put all of the pieces together. 

24. Should repeat deliveries be modeled as recurring templates that generate requests, or do you want to treat every delivery as an independent request?
> yeah, we can like indicate it's recurring. don't worry too much about that for the demo though. 

25. For household size, how should delivery quantity be determined?
   Options: fixed per person, fixed by program type, dispatcher chooses manually, AI suggests with override.
> let's just go fixedf per person for demo purposes. 

26. Which dietary and allergy dimensions truly matter for the hackathon MVP?
   Please separate hard blockers from soft preferences.
> honestly, I'm not too plussed for the hackathon. basics is enough, to show we could add more functionality later. 

27. Which access and safety notes must be visible at route-build time, not just in a detail drawer?
   Candidate notes: safe to leave unattended, do not enter home, assistance at door, two-person support, dog on premises, buzzer/gate notes.
> You decide — I trust your judgement. 

28. Do you want structured tags, freeform notes, or both for request/client context?
> Structure is good where possible, but also surface raw notes when useful. 

29. Do you want the client record and the request record to stay separate in the UI, or do you want a single blended "case/order" object for speed?
> You decide, whatever would be the best UX. 

### 5. Volunteer Availability and Capacity

30. How should volunteer availability be captured in the MVP?
   Options: natural language only, structured date/time picker only, both.
> I think natural language only would be good enough. 

31. Should availability be mostly one-off per day, recurring weekly, or both?
> Both! Interpret the language to figure it out.

32. Which volunteer attributes matter for assignment right now?
   Candidate fields: available hours, home/start location, vehicle access, language, lifting ability, can enter home, food-safety training, refrigerated capability.
> all of the above, but for the demo, we can probably just focus on available hours, home/start location, and vehicle access.

33. Can volunteers use their own cars in the demo, or should every route require an explicit vehicle assignment from a fleet list?
> every route will just have like preset vehicles/preset everything really. keep it simple for demo purposes. 

34. Is volunteer fairness / burnout something we want to actively optimize, or just surface as a lightweight metric?
> yeah, it is — I think we want to have some part of the dashboard that shows like, volunteer hours this week per person or something, to make it visible and keep it in mind. and, in the driver view, do lots of congratulations, thanks, etc. And also: we are ensuring we do not give people routes that are going to be tight at all time-wise — we have our 66% to 75% rule, so we are giving them a buffer, so they don't feel overwhelmed.

35. If a volunteer no-shows or drops off a route mid-demo, what should the dispatcher be able to do immediately?
> don't worry about it for demo. 

### 6. Routing and Dispatch Rules

36. What is the actual objective function for route generation?
   Some possibilities: maximize urgent deliveries, maximize total stops, maximize perishables moved, minimize drive time, fit volunteer availability, or a weighted combination.
> weighted combination. make it solid. 

37. Your notes mention filling about 60% to 75% of a volunteer's available time. Do you want that to be a hard rule, a target band, or just a soft heuristic?
> hard rule — but we can go under that, just never over. also, allot 2 minutes per stop (in that limit band)

38. Should route creation always start from the `today` queue and only pull `tomorrow` / `later` jobs when they are nearby, or is there another rule you want?
> I think starting with `today` makes the most sense, but if there are `tomorrow` jobs that are along the way (or like, we have covered all of the today options), we can pull those in too.

39. How should we define "along the same route" when pulling in tomorrow/later stops?
   Options: same cluster, small detour threshold, same postal area, same direction from depot, manual dispatcher choice.
> you figure it out! I trust your judgement on this one.

40. Do you want route optimization done across all volunteers together for the day, or one volunteer at a time as availability comes in?
> it should be done across all available, yes. 

41. What manual controls must the dispatcher have over a suggested route?
   Candidate controls: reorder, add stop, remove stop, pin first stop, switch volunteer, switch vehicle, lock a stop, split route, merge routes.
> honestly, for the demo, don't worry too much about it. Add this to a low-priority, bonus-features list. 

42. What explanation should the route screen give for why a route was suggested?
   Candidate explanation elements: ETA, total drive time, stops selected, urgency, perishability, inventory fit, skipped requests, capacity usage.
> All of the above, but don't overwhelm anyone. 

43. If a route becomes overloaded or breaks a rule, should the UI block it completely or allow a force-override with warning?
> Yeah, if an admin is editing, they can do whatever, just warn them. 

44. What should happen to the rest of the route when a stop is marked `couldn't deliver`?
   Options: continue automatically, ask dispatcher, auto-reorder, send back to queue.
> Continue automatically for the demo, but ideally, we would want to ask what to do next.

1.  Do we need route version history for the MVP, or just the current route plus a simple activity log?
> No, current only is totally fine. Don't even worry about an activity log. 

1.  How important is an optimizer that is genuinely strong versus a transparent heuristic that is easier to explain in a hackathon demo?
> As good as possible, without being slow or annoying. 

### 7. Inventory, Meals, and Allocation

47. What are we actually tracking in inventory for the MVP?
   Options: prepared meals only, hamper components only, ingredient stock only, or a hybrid.
> meals and ingredients. figure out the best UX. 

1.  What is the planning unit that matters most on screen?
   Options: meal units, food boxes, ingredient counts, or budget/cost.
> meal units probably. but ingredients are important too.

1.  Should receipt scanning add raw ingredients to inventory, ready-to-deliver items, or both with a confirmation step?
> both, with confirmation, of course.

1.  For non-receipt input, how should inventory be added?
   Options: manual text, voice transcription, document OCR, all of the above.
> all of the above, but for the demo, manual text only is probably fine. 

1.  How should perishability ranking work in the MVP?
   Options: deterministic shelf-life table, LLM suggestion with confirmation, manual sort only.
> LLM suggestion with confirmation is good for the demo. making a whole table is a lot of work. just get the LLM to be like low-temp/consistent. 

1.  When a route is built, do you want exact items reserved to each stop, or just meal-category quantities reserved at the route level?
> yeah, you need items/meals per stop, of course. 

1.  If a delivery fails, what should happen to inventory on return?
   Options: auto-return to stock, require staff confirmation, mark as spoiled if cold chain/time exceeded, mixed behavior by item type.
> don't worry about it for MVP. 

1.  Do you want cost / budget visibility in the MVP, or is that a background data field only?
> don't worry about it for MVP. 

### 8. Driver Mobile Flow and Live Tracking

55. What is the exact happy-path driver flow from opening the app to finishing the route?
> For demo purposes: open the app, choose how much time they have available, accept the suggested route, see the map and ETA, and then for each stop, mark it delivered or not delivered.

56. Should the driver app include in-app navigation, or just show the stop and launch Apple/Google Maps?
> Yes, we absolutely need in-app navigation for the demo. It is a critical part of the value prop and the magic ✨.

57. Do you want the stop outcome to stay intentionally binary in MVP: `Delivered` or `Couldn't deliver`?
> Yeah, that's good enough for the demo. 

58. If `Couldn't deliver` is tapped, should we require a reason, a note, both, or neither?
> Neither for now, just move on to the next stop. 

59. Do we need proof-of-delivery like photo or signature, or should we skip that for speed?
> No, no need. 

60. How real does location tracking need to be for demo day?
   Options: actual browser geolocation, periodic manual pings, fully simulated motion, hybrid.
> Actual location, but a couple simulated drivers doesn't hurt too. 

61. Should the driver be able to skip, pause, or reorder stops, or do you want the mobile flow kept very locked down?
> Keep it locked down for the demo, to make it as easy as possible. 

62. What route progress should the dashboard show live?
   Candidate signals: current stop, next stop, ETA, delivered count, failed count, current location, route percent complete.
> honestly just location, delivered count, reamining count, is good enough for demo. 

### 9. Public View and Demo Wrapper

63. For the public-facing surface, do you want one landing page with two calls to action (`Request food`, `Volunteer`), or separate pages?
> Yeah, one page, with two clear calls to action.

64. What is the minimum public request form needed for the demo?
> as above — name, address, some sort of contact. the rest is a bonus. 

65. What is the minimum public volunteer signup form needed for the demo?
> name, contact info, availability, maybe some basic questions about vehicle access, etc. but keep it as simple as possible.

66. When someone submits a public form, should it appear as a raw inbox item, or become a structured request/profile immediately?
> it should get parsed/strucutred/ready to accept automatically

67. In the desktop demo wrapper, what controls do you want outside the app frame?
   Candidate controls: switch role, trigger incoming message, simulate next stop, switch active driver, inject urgent request, toggle live GPS.
> switch role, trigger incoming message, simluate next stop (which should smoothly move the map along), switch driver, toggle live vs. fake GPS

68. On a real phone, should the app always drop straight into driver mode, or should it still allow mode choice?
> yeah, always right into driver mode, but with a little welcome screen 

69. Do you want the phone frame only in the desktop demo wrapper, or also in tablet-sized views?
> yeah, tablet size should just have same functaionlity as desktop

### 10. Integrations, AI, and Trust

70. For LinkedIn specifically, do you want a real integration to your account, a seeded/simulated inbox that looks real, or a hybrid where we manually inject realistic messages?
> actually, we are doing email, and yes, real integration would be the best

71. Which other channel, if any, is worth doing as a real integration this weekend?
   My instinct: Gmail is realistic, LinkedIn maybe semi-simulated, Instagram/Messenger likely simulated.
> gmail is all we need. the rest we can have icons for or whatever, but we don't need real integrations for the demo.

72. Which AI jobs are actually high-value and worth shipping?
   Candidate jobs: message parsing, urgency classification, address cleanup, dietary extraction, OCR for receipts/docs, voice transcription, perishability ranking, route explanation.
> all of the above, except route explanation. 

73. Which AI outputs must require human confirmation before they become real data?
> almost all of them, I think. But the approval should be as easy, pretty, intuitive as possible. where logical, show source and parsed versions. 

74. Do you want the raw source artifact stored and visible alongside the parsed output for trust and debugging?
> yes. 

### 11. Data Strategy and Demo Data

75. Do you want to import Track 2 mostly as-is and build around it, or curate a slimmer Mealflo-specific dataset and only borrow what we need?
> I think honeslty, we create our own dataset — based on track 2, but more curated, realistic, and focused 

76. Do you want us to replace most visible seed clients and addresses with curated Victoria-area demo data?
> Yeah, we need real Victoria addresses for the demo, with reasonable population-desntiy spread. otherwise the demo doesn't work at all. 

77. Roughly how much data should the demo show at once so it feels real without becoming noisy?
   Please react in terms of counts for volunteers, active requests, routes, vehicles, and inventory items.
> For the demo, we can have like 20 active requests, 10 volunteers, 5 routes, 5 vehicles, and 20 inventory items. We want it to feel busy and real, but not overwhelming.

78. Do you want a deterministic demo script with hand-picked personas and routes, or a more open sandbox where the app can be poked around freely?
> it should be pretty open, and react (and like, write/read the db) to inputs/outputs — but not overly, like drivers should never actually get completed (like I outlined above), it's all about feeling as realistic as possible but still being an effective demo. s

79. Which visible data absolutely needs to feel local and believable?
   Candidate areas: street names, depot names, organizations, food items, volunteer names, message senders.
> all of the above. 

### 12. Success Criteria for the Next Spec

80. By the end of the hackathon, what does "we nailed it" mean to you?
> mealflo is beautiful, useful, intuitive, and magical. The demo flows smoothly, the judges understand the value prop immediately, and everyone is blown away by how much we got done in a week. 

81. Which parts must be truly working in the product, versus acceptable as simulated demo scaffolding?
> honestly, as long as it *seems* like it works, I'm not plussed about what really does. This is a hackathon, not a production product. 

82. What are the 3 things you most want the detailed spec document to lock down after this question round?
> There are many more than three things - let's lock down it all!

83. Are there any decisions you already know you do not want me to spend time debating in the next round?
> Just a couple notes — theyse may be stated elsewhere, but worth mentioning again.
> When you are out doing deliveries, when you arrive at the location, it would be amazing if you could see the exact mesage sent by the person who you are about to deliver to (if applicable), so you have proper context. 
> For the demo, too — I am imagining like, we put up a QR code, everyone scans, they then choose how much time they have to volunteer (from a list of four options say), and then it shows you the route interface — but remember, infinite people should be able to have the same route active, for purposes of the demo. 
