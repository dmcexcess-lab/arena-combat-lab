## 2026-11-08 — Route Lab game correctness slice one
- Rejected false starts and offside calls now advance a game-state attempt seed, so retrying the same snap cannot deterministically repeat the same pre-snap event.
- Defensive fumble recoveries use the return tackle path without re-entering the offensive runner tackle code; the recovered defender can no longer be recorded as tackling itself.
- An exhausted depth slot now reports no active roster player and blocks the snap/kick instead of silently reusing an unavailable player; kicks also require an available kicker or punter and returner.
- Throwaways stop the clock and try attempts consume no game time. The QB read now receives the actual down-to-gain from exhibition and campaign situations.
- CPU fourth-down kicks are staged when the next play is selected. Run play executes the kick, while changing the play clears the staged kick and allows the player to go for it.

## 2026-11-08 — Route Lab between-play and field markings
- Continue to next play now resets the down, lets the CPU choose the next offense and defense calls, and waits for the player to press Run play. Scrimmage Next is hidden so it cannot accidentally snap the ball.
- Both full-field and tactics views show the line of scrimmage and the 10-yard line to gain, aligned to the current snap and field spot.

## 2026-11-08 — Route Lab press release slice
- Man coverage can now use Press at the line. The targeted receiver and corner resolve a seeded release contest from route-running/agility against coverage/strength/agility, with a short route delay on a lost release and a play-report event.
- Added the technique to the inspector and encyclopedia and covered the spatial effect and repeatability with a fixed-seed regression.

## 2026-11-08 — Route Lab match-zone handoffs
- Match defenders now keep route ownership through overlapping zones to prevent frame-by-frame nearest-player churn, then pass the route to the next zone defender as it crosses the boundary.
- The event log reports the transferring and receiving defenders. A seeded crossing-route regression verifies timing, actual player movement, and repeatability.

## 2026-11-07 — Route Lab play-action read slice
- Play Action Cross now shows a back crossing the mesh while the ball stays with the QB; the pass release window is delayed and run-fit linebackers can bite on the fake or stay disciplined according to awareness.
- The event report records the fake and the seeded position regression verifies the moving back, held ball, delayed QB decision and awareness-based fit response.

## 2026-11-07 — Route Lab advance-state display
- A completed snap now advances the scoreboard and full-field marker to its result immediately; during replay, the ball moves across the full field from the original snap spot. The lower tactics field keeps its snap-relative yard grid while showing the same live ball spot.
- The Next play action is unavailable during an active replay, then runs the next CPU-selected call after the result is shown.

## 2026-11-07 — Route Lab one-click opening kickoff and field locator
- The coin-toss CPU-lineup action now runs the opening kickoff immediately; selecting Done from the depth chart does the same. Situation jump still enters its chosen state without starting a kickoff.
- The lower tactics field now labels and marks the ball at the same possession spot shown in the full-field game view. CPU play selection remains automatic, and Next play runs that call.

## 2026-11-07 — Route Lab missed field-goal returns
- A seeded short field-goal miss can now stay inbounds beyond the line, where a receiving player can field it and continue through the existing spatial return and tackle simulation. Untouched misses retain the kick-spot/receiver-20 dead-ball ruling.
- The special-teams report identifies a fielded missed kick, and the rules audit records this as a bounded case with muff and boundary exceptions still open.

## 2026-11-07 — Route Lab fair-catch officiating
- Fair-catch signals now run through the kick replay's moving-player frames. Actual contact by coverage inside the receiver's catch window can produce a rare, evidence-backed interference foul.
- The officials award the fair catch and advance the receiving team 15 yards from the contact spot; the play report and game book identify the player, time, spot and frame evidence.

## 2026-11-07 — Route Lab between-play clock reset
- Moving from a completed play to the next lineup now immediately simulates the 27–35 second reset (capped under a 25-second administrative play clock) and deducts it from a running game clock. The game book records the elapsed time; no player walk-back animation is shown.
- Scrimmage snaps, punts and field goals consume the prepared lineup without charging the same interval twice. Stopped clocks do not burn game time, and a reset can reach a two-minute warning or period end before a snap.

## 2026-11-07 — Route Lab timing, medical events and foul exposure
- Added per-player tackle/block contact records and movement exposure to the live 11-on-11 simulation. Seeded medical events now cause recorded evaluations, limited availability or game removal, with automatic depth-chart substitution and replay/report evidence.
- Added close-rusher false starts, coverage-based defensive holding, post-release roughing, tackle facemasks, and support blocks in the back, while conditioning existing holding and illegal-contact hazards on the actual engagement. Tightened defender break, pursuit and tackle geometry and balanced CPU first-down calls. No player-facing frequency slider or scheduled event count.
- Improved injury timeout and late-game runoff administration, out-of-bounds clock restarts, change-of-possession play clocks, overtime toss and initial-possession resolution. Added deterministic scenario coverage and a repeatable eight-game rate audit.
- Updated `route-lab/RULES_AUDIT.md` with published NFL frequency references and explicit remaining calibration and rule gaps.

## 2026-11-07 — Route Lab officiating slice
- Added frame-evidenced offensive holding, illegal contact and defensive pass interference calls with player, time and field spot in the replay report and game book.
- Live-ball flags now offer Accept and Decline choices; a one-button Next uses the default, and opposing pre-possession-change fouls offset with a replayed down.
- Near first-down markers, the chain crew announces a measured on-field spot. Coaches can challenge that spot before the next snap; the replay official handles final-two-minute, overtime and fourth-down-short reviews. Reviews use the precise simulation spot, track challenges, and charge a timeout for an unsuccessful coach challenge. Remaining Rule 14/15 limits are documented in `route-lab/RULES_AUDIT.md`.

## 2026-11-07 — Route Lab special teams slice
- Replaced summary-only kick returns with seeded 22-player full-field frames: coverage, rush/protection, return blocking, lane choices, contact, loose-ball pursuit and return touchdowns are visible in the replay and report.
- Added receiving-team fair-catch selection, muffed kick and blocked punt/field-goal/try recovery, including change of possession and returns where the ball remains live.
- Applied 2026 dynamic kickoff and onside alignments, the pre-landing movement restriction with a five-yard rekick, landing-zone short-kick awards, safety-kick awards, and 35/20-yard kickoff and punt touchbacks. Remaining special-teams exceptions are listed in `route-lab/RULES_AUDIT.md`.


## 2026-11-06 — Route Lab live-ball possession slice
- Fumbles from contact, sacks, and muffed handoffs now release a moving ball that all 22 players pursue and can recover. Recovery can change possession and continue as a return; the replay and report show who lost and recovered the ball.
- Added a designed backward-pass target and release time to the play editor, plus a Pitch Back play that the CPU can call. A pass is released only when its target is behind the carrier; a loose pitch remains recoverable by either team.
- Game-state officiating now applies backward/forward fumble out-of-bounds spots, end-zone touchbacks and safeties, fourth-down and late-half teammate recovery limits, and interception end-zone/momentum spots. This remains a simplified single-loose-ball-per-snap model.

## 2026-11-06 — Route Lab exhibition setup and game rhythm
- Added a Free / Campaign / Load start menu, a saved first-time coin call and home uniform color, and an animated toss for every new Free exhibition.
- Fresh games generate randomized ratings and two candidates for each team depth-chart slot. Home starters chosen before kickoff dress the live 11-on-11 plays; skipping setup uses the CPU lineup.
- The menu can reopen coin-call and uniform setup. Generated jersey numbers use position ranges and stay unique within each team; special teams depth rows show the ratings relevant to each job.
- Added quarter/clock/score/possession/spot jump controls, local exhibition resume, and one-button Next with situational CPU offense, defense, kicks and tries. Player playbook and custom-play overrides remain available.
- Running-clock snaps now consume a capped 27–35 second line reset, while snap-anticipation offside and a geometry-based defensive pass interference call can change the live result. Exhibition has no season W/L record.
- Grouped future possession, special teams, officiating and timing work into follow-on slices in `route-lab/RULES_AUDIT.md`.

## 2026-11-06 — Route Lab player ratings and simulation depth
- Expanded player ratings to 16 with stamina, pass rush, pursuit, route running and runner vision; older saved play records inherit role defaults for missing attributes.
- Added momentum-sensitive cuts, within-play fatigue, vision-guided run paths, rated man reaction and defensive pursuit, pass-rush versus blocking contact, and missed-tackle recovery.
- Reworked QB pass lead and defender catch-point contests so coverage can produce broken passes instead of automatic deep completions. Replay frames now carry player energy.
- Added seeded regression checks for rating effects, pass contests and exact replay determinism; refreshed Mission One's counterplay route for the revised pursuit model.

## 2026-11-06 — Route Lab Mission One assignment scout
- Made the opening 3v1 run lesson an observe → adjust → test exercise: the unchanged rep is film study, and advancement requires editing the RB path and earning the stated simulated gain.
- Added a live assignment brief for each player in Mission One, including blocking/coverage jobs and the RB-versus-MLB matchup; retained the same roster while Scout, Man, Zone and Blitz rotate.
- Added tests for baseline gating, RB counterplay across all four defensive looks, and standalone HTML/module parity.

## 2026-11-06 — Route Lab opponent ladder, ratings and tactical overlays
- Added editable player scouting attributes (1–99) and connected speed/acceleration, blocking and strength, coverage, QB passing accuracy, hands and tackling to deterministic simulator decisions.
- Added seven coaching overlay modes: assignments, coverage shell, pass protection, pressure paths, run fits, open turf and matchup advantage; color legend and player-rating inspector.
- Reworked first five stages of both campaigns into four-opponent scrimmage rotations: SCOUT, MAN, ZONE, BLITZ. Opponents are deterministic and require a tactical re-edit; lesson progression waits for full rotation, while finales retain the touchdown drive / defensive stand.
- Scales training roster 3v1 → 3v3 → 5v5 → 7v7 → 11v11, with explicit virtual-snap 3v3 exception rather than confusing it with a legal NFL formation.
- Existing playbooks, encyclopedia and independent Arena / Tavern Keeper games are preserved.

## 2026-11-06 — Route Lab tactical QB, teaching clinics and encyclopedia
- Replaced static primary receiver targeting with seeded tactical QB read evaluation (projected catch-point separation, throwing lane risk, pressure, timing, depth, first-down value and read priority), weighted viable-target selection and throwaway decisions.
- Added QB Film Room exposing chosen target, reasons, alternative reads, tactical separation and risk scores. Repeated Run uses a new seed; prior seed can be re-entered for deterministic replay.
- Added 57+ searchable, categorized football encyclopedia entries, accessible during any campaign or free play, with rules references and interactive lesson links.
- Deepened all 12 campaign lessons with reading, plan construction exercises, analysis prompts, and mandatory knowledge checks alongside existing real simulation objectives.
- Added curriculum, choice-variation and reference consistency tests; preserved prior engine, Arena and Tavern Keeper regressions.
- Simulation remains a teaching approximation: no NFL-tracking calibration, full route recognition, or exhaustive enforcement.

## 2026-11-06 — Route Lab offense and defense teaching campaigns
- Added twelve interactive lessons (six offense, six defense) with small-sided scrimmages that progress into legal 11v11 play design.
- Offensive route, blocker, hot-read and snap-formation exercises culminate in a multi-down custom touchdown drive.
- Defensive pursuit, man assignment, pass rush, zone and coordinated shell lessons culminate in a multi-down defensive stand.
- Lesson outcomes use live deterministic football simulation; edited assignments are checked before advancement; progress persists per browser.
- Kept sandbox playbooks and original Arena/Tavern Keeper independent; added Route Lab Node regression checks to the Pages pipeline.
- Training explicitly relaxes full-squad formation checks for instructional small-sided drills, while 11v11 stages retain the existing validator.

## 2026-11-06 — Route Lab hosted sibling prototype
- Added self-contained 11-on-11 football play designer at `route-lab/index.html` and deployed it under the existing GitHub Pages site at `/route-lab/`.
- Extended Pages packaging to include Route Lab without changing the Arena or Tavern Keeper entrypoints.
- Route Lab has 11 offensive / 8 defensive presets, custom assignments, validation and seeded replay; alpha-level fidelity.

# Arena Combat Lab — Changelog

## 2026-10-11 — Tavern Keeper: Local Profiles & Safe Restart
- Added three independent save-slot profiles with editable names, current-slot indicator, save summary and last saved time.
- Added a prominent Profiles / Restart button in the game header; the Heroes' Table action now opens the manager rather than erasing the game immediately.
- Added create, switch, rename, restart and delete controls. Restart and delete require a second explicit confirmation, with separate actions for each. Last profile cannot be deleted.
- Migrates the existing `tavernKeeper.reputationBoard.v1` save into Slot 1 without wiping the original, maintaining legacy progress and active boss turn state.
- Preserves independent real-time/offline catch-up per profile, protects unreadable saves against silent overwrites, and notes that storage is device/browser-local.
- Added `profiles.js`, `art/profiles.css`, and automated profile lifecycle/migration tests to CI/deployment.

## 2026-10-11 — Tavern Keeper: Player-Controlled JRPG Boss Battles
- Converted flagged encounters into an interactive turn-based RPG panel for real browser-game deployments: the required Wren Bridge Troll and optional Blackroot Brood Chamber miniboss.
- Paused only the affected expedition's action timer and income until player input, while food/drink sales and other expeditions continue normally through offline catch-up.
- Added Attack, Power Strike, Guard, Potion and risk-based Retreat choices, boss attack telegraphs, gear durability, injury/death, objective rewards and route continuation.
- Added a persistent battle-ready alert, illustrated vector boss/hero sprites, responsive arena, HP bars and battle logs, without altering non-boss autonomous combat.
- Preserved boss HP/turn and player-wait state in version 8 expedition snapshots; existing saves migrate without a forced reset.
- Expanded CI with interactive boss simulation, pause persistence and scene-art wiring checks; deploy packages `bosses.svg` and `boss.css`.

Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md`

## 2026-10-11 — Tavern Keeper: Mercenary Risk/Reward and Bankruptcy Recovery
- Preserved patron food/drink g/s as the recovery floor; made risky, longer expedition salaries the principal high-end income driver. Later contract potential is +1.5 / +4 / +9 g/s at 3h / 5h / 8h, while easy 1h/2h jobs stay +0.3/+0.5 g/s.
- Made actual starting hard-contract income depend on hero readiness, so an underprepared recruit does not profitably earn the top wage just by waiting to die. The contract board quotes the selected hero's actual g/s and the posted potential.
- Repriced mercenary recruitment with five meaningful quality tiers and scaled stat/gear/readiness: low-tier recruits can be hired on service earnings, while top-tier recruits can cost ~30k gold and still suffer permadeath.
- Raised ordinary and premium weapon/armor prices to make re-equipping a veteran a real capital choice; preserved durability and partial gear recovery on death.
- Preserved rebuilding after total wipe: automatic low-cost applicant access even when the upgraded tavern normally attracts elites; added a capped 10% after-hour offline tavern recovery trickle only if no mercenaries remain.
- Added risk / income / elite death / recovery simulation coverage and kept all prior contract and snapshot checks.

## 2026-10-11 — Tavern Keeper: Two Income Streams & Longer Quests
- Split the treasury into food/drink patron sales and continuously credited adventurer salaries, each shown as a distinct g/s source.
- Increased easy quests to 1h and 2h at +0.30 / +0.50 g/s. Scaled later contracts to 3h/5h/8h; the mercenary risk/reward revision immediately above replaces their initial provisional +0.75/+1.0/+1.5 rates.
- Added success return bounties of ~260g and ~420g for the easy quests (higher for dangerous runs) plus mission materials. Partial/failed journeys still pay proportional completion compensation.
- Updated live/offline pay ledgers so hero wages are added each tick and are not duplicated on settlement, reload or completion. Persisted wage-credit and bonus fields in expedition save snapshots.
- Updated contract board, header stats, return summary, acceptance assertions, and added deterministic CI coverage for separate salary and return reward streams.
- Preserved the offline patron-receipts taper, eight-hour mission simulation cap, one-founder start, navigation and graphics.

## 2026-10-11 — Tavern Keeper: Long-Contract & Offline Economy Rebalance
- Corrected runaway affordability: baseline five-minute tavern income was ~77g against 20–34g upgrade costs, while half-hour contract settlements routinely paid thousands.
- Changed first permanent-improvement costs to 700–1,300g, with 3× cost per subsequent level; all seven upgrade lines now represent longer-term capital investments.
- Capped positive expedition performance-rate bonuses to 1.5× the advertised base g/s, without altering contract lengths, base rates, risk, objective-score rules or partial-payment policy.
- Added an offline tavern cashbox policy: 100% receipts in the first 15 minutes, 25% through 60 minutes, then no additional idle tavern sales gold. All service/revenue ledger amounts match the actual awarded amount.
- Preserved uninterrupted expedition simulation and earned contract escrow through the existing eight-hour offline limit; no save wipe or automatic repricing of already-owned upgrades.
- Added explicit affordability/pay-ceiling tests, offline cap boundaries, and updated release tests; extended CI's Tavern Keeper test suite to 17.

## 2026-10-08 — Tavern Keeper: Illustrated 2D Top-Down Graphics
- Replaced the visual room presentation with an illustrated overhead tavern map and exterior road, keeping authoritative spatial paths and actors.
- Added eight separate interactive illustrated prop sprites for the physical management destinations.
- Added reusable overhead patron, hero, server, and visitor character sprites; serving and walking remain driven by the real game simulation.
- Added horizontally scrollable phone staging and explicit Interior/Outside camera controls, plus reduced-motion styling.
- Added SVG bundle/XML verification and scene-art acceptance checks to the deployment gate; no changes to save data or progression.

## 2026-10-08 — Tavern Keeper: CI Repair & Contract Release Balance
- Repaired post-reset tests to use the single-founder initial state and explicit multi-hero fixtures for multi-hero scenarios.
- Corrected contracts and recruitment tests to respect reputation/tavern-level board access while preserving unrestricted hero risk choice for unlocked contracts.
- Corrected Chronicle offline contract settlement tests for real 15-minute duration; expanded roster regression coverage across all five board tiers.
- Found and corrected a long-form pacing balance regression: mid-tier encounter-heavy contracts now perform actions every 120s (Threat 3) / 300s (Threat 4), without changing listed durations or base contract income.
- Verified 250-seed/profile aggregates of 100% / 99.07% / 27.07% / 24.93% / 15.20% success across Threats 1 / 2 / 3 / 4 / 6.
- All 16 Tavern Keeper Node suites, headless Arena smoke test, web export and GitHub Pages deployment passed in Actions run 37894123434 at commit fc110efbc6bef3f7f3ff0f1ba1a3294c48b6bf25.
- Next: physical phone/desktop playtest of the fresh-start contract board, patron spatial movement, and eight-hour offline behavior.

## 2026-10-05 — Tavern Keeper: Spatial Tavern Simulation
- Replaced patron position loops with persistent stateful scene actors keyed by authoritative TavernEconomy patron IDs.
- New patrons now originate on the exterior road and physically walk toward the tavern.
- Waiting patrons queue outside the building; the queue no longer appears inside the tavern.
- When a queued patron receives a seat, the visual actor walks from the outside queue through the exterior door and interior threshold to a stable assigned seat.
- Patrons leaving the authoritative active/queue state now walk back through the door and off the road before their actor is removed.
- Added an explicit outside road/yard/porch zone and moved the front door plus applicant presence outside the interior boundary.
- Added stateful staff actors based on TavernEconomy.serviceSlots(); staff walk to the actual unserved patrons selected by the service order and return to bar-home positions.
- Actor translation is now driven by requestAnimationFrame and route targets; CSS animation remains only for ambient fire/rain/lamps and local walk/serve/mug motion.
- Preserved the existing Slice 15 economy/service timing, save format, offline progression and balance.
- Strengthened `test_scene_ui.js` to require persistent actor maps, route simulation, exterior queue geometry and staff service routing.

## 2026-10-05 — Tavern Keeper: Animated Tavern Shell & Diegetic Navigation
- Reopened the post-release presentation architecture while leaving the Slice 15 simulation unchanged.
- Replaced the dashboard-first default with a full-screen animated tavern interior.
- Added eight diegetic destinations: bar/tavern management, contract board, heroes' table, workshop, merchant corner, front door/applicants, Chronicle ledger and expedition road map.
- Split the former long scrolling dashboard into eight focused management screens, each with a single Back to Tavern path; Escape and the title also return home.
- Deploying a hero now naturally transitions to the expedition/road-map screen.
- The tavern scene mirrors authoritative state: seated and queued patrons, served food/drink states, non-deployed heroes, active merchant, active applicant, facility/service status, selected contract, Chronicle total and active expeditions.
- Added animated fireplace, lamps, rain, patron bob/queue behavior, mug lifting and a working server, with `prefers-reduced-motion` support.
- Added touch-oriented scene hit areas and retained 44px coarse-pointer controls.
- Optimized mobile rendering so hidden menu screens stop repainting every 250 ms while the underlying simulation continues globally.
- Added `test_scene_ui.js` and updated release UX acceptance to require the tavern scene/navigation architecture.

## 2026-10-05 — Tavern Keeper Slice 15: Balance, UX & Release Acceptance
- Froze Tavern Keeper architecture for release acceptance; no new major gameplay system was introduced.
- Ran broad seeded batches across every contract and the prepared/ranged/reckless/unprepared hero profiles.
- Fixed the major threat inversion: reduced excess Blackroot Mine encounter density and strengthened the Wren Bridge troll to make Threat 6 the hardest aggregate contract.
- Release batch now measures founding-roster aggregate success at roughly 100% / 99% / 27% / 25% / 15% across Threat 1 / 2 / 3 / 4 / 6.
- Preserved personality risk: cautious heroes typically retreat from lethal contracts while reckless Borin retains high permanent-death exposure on upper-tier work.
- Verified deliberately unprepared heroes cannot brute-force the board and upper-tier failures retain positive performance/objective pay.
- Verified seeded five-minute tavern income remains bounded: baseline about 76.8g, fully developed about 232.65g.
- Added a four-step onboarding panel explaining earn → prepare → choose risk → autonomous deployment.
- Improved phone layout: compact two-column header stats, 44px coarse-pointer controls and 16px numeric inputs to avoid iOS zoom/readability problems.
- Added `test_release.js`, covering seeded threat bands, preparation separation, death behavior, paid failure, economy bands, offline constants and static phone/desktop UX requirements.
- Slice 15 closes the planned feature-slice sequence; subsequent work is evidence-driven maintenance, tuning and polish.

## 2026-10-05 — Tavern Keeper Slice 14: Chronicle & Tavern Legacy
- Added a persistent Chronicle owned by TavernRoster, with up to 1,000 event entries, one-time milestones and record-holders.
- Fresh taverns record the opening and founding roster; recruited heroes retain explicit applicant origin/quality/cost history.
- Every settled contract adds a readable Chronicle result with outcome, objective score, payout and kills.
- Major objective feats create dedicated entries for designated boss kills, full miner rescues and strong caravan escorts.
- Rank/title advancement, first-time legend status and permanent deaths create career/legend/memorial entries.
- Tavern upgrades create history; Level 3/6 facilities plus patron, service-revenue and resolved-contract thresholds create one-time milestones.
- Added persistent records for most contracts, successes, kills, career gold, highest rank, best objective score and largest single-contract payout.
- Fallen heroes remain eligible for records and legends.
- Slice 13/older saves reconstruct founders, recruitment origins, contract history, death memorials and records from existing saved ledgers.
- Added TavernRoster snapshot v11, Chronicle UI, and test_chronicle.js.

## 2026-10-05 — Tavern Keeper Slice 13: Offline Progression & Return Summary
- Added wall-clock save checkpoints and browser save version 4.
- Added authoritative offline catch-up capped at 8 hours using the exact same 0.25-second tavern and expedition tick order as live play.
- Preserved per-expedition Pause/1×/4×/12× speed offline; manually paused heroes do not advance.
- Centralized resolved-expedition settlement in core so online and offline gold/material/career/death/durability outcomes share one path.
- Tavern patrons, merchants and applicants continue advancing while the browser is closed or suspended.
- Added mobile/browser visibility handling: hidden pages checkpoint and stop live ticking; visible resume performs one catch-up, preventing double-counted background timer time.
- Added a While You Were Away report for tavern income, expedition payouts/results, patron/visitor activity, active progress, paused runs and 8-hour cap truncation.
- Legacy saves without a checkpoint do not receive speculative retroactive progress.
- Added test_offline.js; staged regression proves offline state is identical to the equivalent sequence of live 0.25-second ticks.

## 2026-10-05 — Tavern Keeper Slice 12: Tavern Facilities & Preparation Depth
- Added permanent Lodging, Infirmary and Workshop levels to the tavern alongside existing Kitchen and Bar/Commons progression.
- Kitchen levels strengthen meal hunger/morale recovery, shorten meal preparation and increase Hearty Meal buff duration/potency.
- Bar/Commons levels strengthen Unwind morale/fatigue recovery; developed commons grant a persistent Good Company readiness/combat/retreat benefit.
- Lodging levels strengthen Nap/Full Rest recovery, shorten rest actions and increase Good Sleep duration/potency.
- Infirmary levels strengthen healing, shorten treatment and remove more injury severity/additional injuries at high quality.
- Workshop levels reduce repair gold/time costs, can reduce Scrap Iron consumption on major repairs, and shorten crafting time.
- Added authoritative preparation/crafting quote APIs so UI estimates and execution use the same facility formulas.
- Prep action UI now shows responsible facility level and exact facility-adjusted time; repair/crafting UI shows Workshop effects.
- Added TavernEconomy snapshot v2 and TavernRoster snapshot v10 migration; old saves default new facilities to level 1.
- Added test_facilities.js and wired all twelve Tavern Keeper suites into the deployment gate.

## 2026-10-05 — Tavern Keeper Slice 11: Objective Mechanics & Partial Contract Scoring
- Added explicit contract sub-objective metadata and persistent objective scorecards.
- Hunt now tracks the pack trail, wolf culls and den clearance.
- Extermination tracks infestation reach, vermin kills and main-nest destruction.
- Escort tracks checkpoint protection and caravan integrity; the contract can fail with the hero alive if the caravan is destroyed.
- Delve tracks deep-area discoveries, finding the missing miners and the number rescued.
- Boss Hunt tracks only the designated bridge boss for cumulative damage milestones and kill credit.
- Sub-objectives immediately award banked gold and performance gold/sec growth, preserving useful progress on retreat, failure or death.
- Successful contracts close the objective score at 100; partial failures retain their actual score, objective events and bonus gold.
- Career XP now recognizes objective score when it exceeds simple route progress.
- Expedition snapshot version 4 persists objective state/events/awards; Slice 10 snapshots migrate safely.
- Added objective score/state UI, detailed final scorecards and test_objectives.js.

## 2026-10-05 — Tavern Keeper Slice 10: Concurrent Expeditions & Hero Assignment
- Added persistent `ExpeditionManager` support for multiple simultaneous hero contracts.
- Each expedition now has an independent ID, hero assignment, simulation state, speed, RNG, income, condition, settlement state and report.
- A hero cannot be deployed twice and remains assigned until the current expedition is settled.
- Added per-expedition pause/1×/4×/12× speed while other expeditions continue at their own speeds.
- Reworked the browser expedition panel into selectable expedition tabs; the focused run can be inspected without pausing others.
- Tavern service, merchants, applicants, crafting and preparation/equipment work for non-deployed heroes continue while expeditions run.
- Settlement now accepts persistent expedition IDs so identical repeat runs by the same hero/contract/seed cannot collide with prior payout keys.
- Added migration from the Slice 9 single-expedition browser save shape into the multi-expedition manager.
- Added test_concurrency.js and wired it into the deployment gate.

## 2026-10-05 — Tavern Keeper Slice 9: Equipment Durability & Maintenance
- Added persistent per-copy durability for equipped and stored weapons/armor.
- Serviceable gear retains full stats; Worn, Damaged and Broken tiers apply progressively stronger combat/readiness penalties.
- Weapons wear when used in combat; armor wears when hostile hits land.
- Added tavern repairs for equipped or stored gear using gold, preparation time and Scrap Iron for substantial wear.
- Crafting and merchant procurement create pristine durable copies; equipment swaps preserve each physical copy's condition.
- Added deterministic death gear resolution: at 50%+ objective progress, equipped durable gear is recovered into shared stock at at most 35% durability; earlier deaths lose equipped gear.
- Added save-version-9 migration from Slice 8 durability-less gear.
- Added test_durability.js and wired it into the deployment gate.

## 2026-10-05 — Tavern Keeper Slice 8: Recruitment & Applicants
- Added persistent timed applicant visits driven by the live tavern clock; applicants remain for a finite window and move on if not hired.
- Added deterministic generated applicant identities with varied stats, AI-relevant traits, health/hunger/fatigue/morale, personal starting gear and supplies.
- Applicant Quality 1–3 is derived from tavern Seating, Service, Kitchen and Bar development; higher quality raises stat floors, condition quality, trait count and starting-gear ceiling.
- Added explicit gold recruitment costs derived from applicant quality, stats and starting equipment.
- Hiring transfers the exact inspected applicant into the persistent roster at career rank 1; applicants are not rerolled/recreated on acceptance.
- Recruited heroes use the existing preparation, shared inventory transfer, unrestricted contract board, career progression and permanent-death/Fallen systems.
- Total living-roster wipe is now recoverable through tavern income plus future applicants instead of requiring New Tavern.
- Steel Sword / Chain Mail are now treated as premium ordinary gear rather than merchant-exclusive because Quality 3 applicants may arrive owning them; crafted-only gear remains crafting-exclusive.
- Recruitment state/history now persists and Slice 7 saves migrate to a scheduled applicant visit.
- Added test_recruitment.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 7: Contract Board & Threat Ladder
- Replaced the single hard-coded Greymill contract with an authoritative data-driven five-contract catalog spanning Threat 1, 2, 3, 4 and 6.
- Added Wolves at Briar Farm (Hunt), Ashroad Caravan (Escort), Blackroot Mine (Delve) and The Wren Bridge Troll (Boss Hunt) while retaining Rats Below Greymill (Extermination).
- Added Wolf, Bandit, Road Raider, Cave Crawler, Cave Stalker and Bridge Troll enemy definitions used by the new contracts.
- Contracts now define their own route graph, optional-risk branches, enemy composition, material profile and performance-income multiplier.
- Higher-threat contracts raise potential performance gold/sec through the existing performance-pay mechanic rather than a separate payout system.
- Added a persistent Contract Board selection and hero-relative risk display; every living hero remains deployable to every contract.
- Active expedition saves now persist contract ID so refresh/resume cannot silently fall back to Greymill; old expedition saves still migrate to Greymill.
- Settlement keys now include contract ID to prevent cross-contract payout collisions.
- Added test_contracts.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 6: Merchants & Procurement
- Added persistent timed merchant visits driven by the live tavern clock, with deterministic arrival/departure, finite rotating offers and visit history.
- Added merchant quality derived from tavern Seating, Service, Kitchen and Bar development; better taverns unlock higher-quality stock pools.
- Merchants sell ordinary recovered materials, baseline equipment and limited premium Healing Potions into the same shared material/item inventories used by crafting and hero loadouts.
- Added merchant-only Quality 3 Steel Sword and Chain Mail so tavern development materially improves procurement.
- Preserved crafting identity: Scrap Spear, Plated Vest and Field Bandages never appear in merchant stock.
- Purchases spend exact shared gold, decrement finite visit stock and persist in purchase history; sold-out/insufficient-fund purchases are atomic failures.
- Merchant state, RNG, active visit, timers, offers and purchase history now persist; Slice 5 saves migrate to a scheduled merchant visit.
- Merchant UI updates on the live tavern clock and contract settlement now immediately refreshes crafting inventory.
- Added test_merchants.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 5: Loot & Crafting
- Added an authoritative compact crafting catalog using the materials already recovered by contracts.
- Added Scrap Spear, Plated Vest, Healing Potion and Field Bandages recipes with exact material costs and preparation-time costs.
- Added persistent shared tavern item stock separate from raw material stash.
- Equipping stored gear now transfers a real item from tavern stock to the selected hero and returns replaced gear to stock; the UI no longer provides free weapon/armor dropdown swapping.
- Crafted consumables must be transferred from tavern stock into hero supplies with carrying caps.
- Added autonomous Field Bandage use in combat; bandages heal moderate wounds and reduce a lingering injury.
- Retired the direct invisible Buy Potion preparation shortcut so potions now come from crafting until merchant procurement is implemented.
- Craft inventory/history now persists and old Slice 4 saves migrate with empty crafting stock.
- Added test_crafting.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 4: Tavern Economy
- Added a real patron-service economy to the persistent tavern state instead of a synthetic flat gold timer.
- Patrons deterministically arrive, take limited seats or queue, order food/drink, consume service capacity, pay, linger and leave; overflow patrons can walk away.
- Added projected and rolling tavern gold/sec plus live seated/queued patron and recent-service presentation.
- Added bounded Seating, Service, Kitchen and Bar upgrades. Seating/service change throughput bottlenecks; kitchen/bar increase patron spend.
- Tavern patron income deposits continuously into the same shared funds used by hero preparation and upgrades, while expedition performance income remains a separate volatile stream.
- Tavern service continues in real time while a hero expedition is running or hero simulation is paused.
- Tavern state, patron queue, active patrons, RNG state, revenue history and upgrades now persist through the existing browser save.
- Added test_tavern.js and wired it into the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 3: Persistent Heroes
- Added a real multi-hero tavern roster with Edrin Vale, Mara Fen and Borin Hale as distinct persistent starter heroes.
- Added per-hero career XP/rank, Melee/Ranged/Survival skill growth, contract history, evolving traits and earned titles.
- Career skills now feed back into readiness and combat rather than existing as display-only progression.
- Added shared tavern settlement around hero-specific preparation: funds/materials are shared while condition/equipment/progression remain per hero.
- Permanent deaths now remove heroes from the living roster and preserve their final career in a Fallen archive.
- Added full roster serialization plus active-expedition snapshot/restore including RNG/combat/progress state for deterministic refresh/resume.
- Browser localStorage now auto-saves roster selection, preparation, loadouts, expedition progress and settlement.
- Added test_roster.js plus JavaScript syntax checks to the Pages CI gate.

## 2026-10-05 — Tavern Keeper Slice 2: Preparation & Condition
- Replaced the Slice 1 developer sliders with a real tavern-side preparation loop while preserving the autonomous contract core.
- Added persistent post-contract health, hunger, fatigue, morale, supplies and combat injuries for surviving heroes.
- Added preparation actions for meals, rest, morale recovery, first aid, physician treatment and potion purchase; actions cost prototype gold and preparation time.
- Added one-contract preparation effects (Hearty Meal, Good Sleep, Patched Up) that modify actual readiness/need decay/combat behavior.
- Added persistent injury generation/severity and treatment; injuries alter readiness, combat effectiveness and retreat pressure.
- Expedition gold and materials now settle into tavern state exactly once; dead heroes cannot be prepared or redeployed.
- Added a dedicated Slice 2 Node regression suite and wired it into Pages CI.

## 2026-10-05 — Tavern Keeper Slice 1 Hosted
- Added `tavern-keeper/` as a sibling browser prototype without changing the Arena Godot runtime.
- Published the autonomous contract Slice 1 through the existing Pages artifact at `/tavern-keeper/`.
- Added CI coverage for the Tavern Keeper deterministic simulation/regression suite before Pages export.

## 2026-08-13 — Developer Screen Final Pre-Test Pass
- Reframed the standalone pre-run setup as the four-page **Developer Screen** intended to be opened from the future prison game through `open_dev_screen()`.
- Replaced the hand-rolled creator name input with a real Godot `LineEdit`, keeping native virtual-keyboard behavior available for mobile Safari; random names now come from a dedicated fantasy-name pool.
- Character preview now deliberately removes equipped headgear while editing appearance so hair style/color can always be inspected.
- Added exact-rarity random gear spawning and a custom item builder. Custom items reuse live gear rules for base items, rarity stat/property/feat budgets, legal properties and legal extra feats; generated items enter starting inventory.
- Expanded the live creature test catalog from 3 to 9: Walker, Ripper, Brute, Ghoul, Hound, Stalker, Marauder, Warden and Juggernaut.
- Replaced the fixed three-counter spawn boundary with a catalog-driven roster dictionary and generic spawn loop; the Developer Screen paginates automatically across the full catalog with a combined cap of 40.
- Added a Summary review gate for character, starter kit, dev gear queue and creature roster; Arena generation now happens from that final page.
- Extended CI smoke coverage for Safari-ready name input structure, fantasy names, helm-hidden creator preview, exact-rarity/custom dev gear, expanded creature catalog, arbitrary scenario rosters and dev-gear handoff into starting inventory.

## 2026-08-13 — Character Creator / Paper Doll Finish
- Fixed head/crown orientation so hair stays on the crown instead of reading as chin hair.
- Equipped headgear now replaces/hides hair, matching the creator note.
- Replaced hash-derived weapon marks with named silhouettes for knives, swords, bows, crossbows, maces, hammers and axes; Guard shields and headgear also gained distinct shapes.
- Added a geometry smoke assertion for crown direction and expanded manual paper-doll checks.

## 2026-08-13 — Character Creator + Equipped Paper Doll
- Wired `PlayerProfile` into the live setup/session boundary; the created name and appearance now reach the runtime player.
- Added a mobile-first creator with editable name, body build, skin tone, hair style/color, random name/look, and a live selected-starter preview.
- Replaced the blue player circle with a layered code-drawn paper doll that rotates with facing and visibly renders equipped armor, cloak, headgear, gloves, belt, boots, weapon and offhand.
- Character/inventory and combat HUD now show the created identity; the character overlay includes a larger equipped-look preview.
- Appearance is cosmetic only: the fixed baseline human and equipment-driven build rules are unchanged.
- Strengthened smoke coverage for appearance normalization, setup→runtime profile wiring and the live paper-doll renderer.

## 2026-08-13 — Razor Refactor + Regression Gate
- Audited the entire GDScript runtime stack and separated proven-dead prototype code from active Arena behavior.
- Removed obsolete `MainDungeon.gd`; current Arena procgen is authoritative and Boundless now inherits directly from the mobile-web shell.
- Cut `MainBoundless.gd` down from the old class/map/prototype implementation to the live setup/run shell and shared Arena helpers.
- Cut `MainPerception.gd` down to its live responsibilities: intent reads, last-seen memory and fuzzy sound rendering.
- Net razor commit: **1,329 lines removed / 263 added** while preserving the current gameplay chain.
- Added `TEST_MATRIX.md` and a headless Godot smoke test before Web export; it verifies scene startup, four fixed starters, mixed 8/3/1 creature roster, connected Arena objective, four chests, and enabled gear schema/rarities.
- Updated the AI SOP with code ownership, inheritance, dictionary-contract, refactor safety, testing, rollback and GitHub transport best practices.
- Active AI/dual-wield/bow layers were deliberately retained because they still own live behavior; cleanup stopped rather than turn into an unrequested combat rewrite.
- SOP + Context are now read once before the first code edit of each coding prompt; Context is refreshed after a batch when current truth changes.

## 2026-08-13 — Arena Tiles + Creature Roster
- Added code-drawn stone Arena tiles, gates, pillars, casks, stairs, cache and chests.
- Added distinct **Walker, Ripper and Brute** icons with HP bars.
- Ripper is the fast, perceptive, higher-intelligence hunter; Brute is the slow, durable, low-intelligence physical threat.
- Launch menu originally controlled each of the three creature counts independently, combined cap 40, default 8/3/1.
- Procgen creates a large central space, four satellite rooms, wide lanes, loops and sparse cover.

## 2026-08-13 — Docs + Long-Term Shape
- Added Prison RPG + Arena contract roadmap, Developer Portal vision and cross-game combat-test role.
- Split README / Roadmap / Changelog / SOP / Context by audience and purpose.

## 2026-08-13 — Weapon + Awareness Pass
- Short Bow owns Quick Shot; Long Bow owns reach/power and no Quick Shot.
- Added Stealth/Ravager dual wield and Dual Strike.
- Added hit-reveals-attacker, AI-driven awareness sharing, memory, FOLLOW/INVESTIGATE and persistent `!! SPOTTED !!`.

## 2026-08-13 — Combat HUD + Equipment
- Added Boundless desktop/mobile combat HUD and tick-based feat cooldowns.
- Fixed baseline human; gear became the build system with Offhand, compatibility and Common → Enchanted generation; Epic disabled.
- Added four procedural gear chests.

## 2026-08-13 — Run + Dungeon Foundation
- Added pre-run setup, procedural stair/cache floor and return-to-stair objective.
- Established Stealth/Ranged/Guard/Ravager and fixed Walker benchmark.
- Fixed Safari wrapper touch routing.

## Earlier Arena Foundation
- Variable-tick combat, facing/FOV/fog, remembered enemies, physical sound, stealth, Fear, doors/hazards and `!! SPOTTED !!`.
- Noise changes existing enemy behavior; it never spawns enemies.

## 2026-11-06 — Route Lab after-catch movement and rules scope
- Let receivers advance beyond route endpoints after a completion, with vision-guided open-field lanes, nearby support blocks, and whole-defense pursuit.
- Kept interceptions live for returns and changed-possession scoring; preserved signed gains in campaign downs and added basic safeties on end-zone sacks/tackles.
- Tightened full-squad jersey-report validation and ball landing boundaries; documented implemented slices and gaps against the official 2026 NFL rulebook in `route-lab/RULES_AUDIT.md`.
- Added seeded regression cases for receiver advance, zone pursuit, interception returns, negative gains, safeties, and formation legality.

## 2026-11-06 — Route Lab position and decision depth audit
- Fixed an unreachable RB carry branch so designed runs now use live hole selection and advance past the last path point; established runs trigger defensive pursuit.
- Corrected slot WR, X/Z receiver, nickel, TE, and linebacker role mappings and speed branches; improved safety top leverage and QB pressure recognition by awareness.
- Added spatial juke, spin, and stiff arm attempts with success/failure effects, structured move records, a visible special-move play report, and per-player movement/contact records.
- Audited QB, RB, receivers, TE, line, front, linebackers, corners, nickel, and safeties in `route-lab/POSITION_AUDIT.md`; noted RPO, play action, screen timing and NFL-calibration gaps.
- Added deterministic counterfactual checks for open lanes, awareness, pursuit, move effects, and all 22 player records.
## 2026-11-07 — Route Lab free-kick out-of-bounds ruling
- Free-kick flight now follows a seeded lateral trajectory influenced by the kicker's accuracy. An untouched kickoff, safety kick or declared onside kick that crosses a sideline before landing stops at the crossing.
- Officials automatically award the receiving team the more favorable legal choice between the inbounds sideline spot and 25 yards from the kick spot. The replay, event log and play report expose the crossing, choices and selected spot.
- Documented the bounded rule scope and remaining touching/end-zone cases in the audit and project context.


## 2026-11-07 — Route Lab progression and synchronized field views
- Keep the settled play result visible during the snap replay while preserving it for the next-play/reset and official ruling flow.
- Track the same live ball spot in the overview situation line, full-field overview and tactical field, then show the settled next spot at the final replay frame.
- Keep the tactical view anchored at the snap alignment during playback, disable advance controls while the snap is active, and resume CPU play selection on Next.

## 2026-11-08 — Route Lab explicit continue action
- Added a visible Continue to next play button after replay finishes; it runs the same progression path as Next play, letting the CPU choose the next call and run the next snap.
- Kept Set next play as the separate lineup and play override action.

## 2026-11-08 — Route Lab game fatigue and rotation
- Carry per-player fatigue from one full-game snap into the next; stamina loss is produced by the live movement simulation and stored on the roster player who actually played.
- Recover some energy during the between-play huddle, and automatically rotate a heavily fatigued starter to the least-fatigued available depth-chart option.
- Preserve deterministic replay behavior and extend engine, game, and depth-chart regression coverage. Fatigue remains a bounded teaching model, not a calibrated NFL workload model.

## 2026-11-08 — Route Lab man-coverage leverage
- Added inside shade, outside shade, trail, and balanced techniques to individual man assignments. Defender target landmarks now reflect the selected technique as receivers release.
- Added coaching-board controls and an encyclopedia entry explaining the tactical tradeoff; seeded regression checks confirm each choice changes defender position reproducibly.

## 2026-11-08 — Route Lab man-coverage leverage
- Added inside shade, outside shade, trail, and balanced techniques to individual man assignments. Defender target landmarks now reflect the selected technique as receivers release.
- Added coaching-board controls and an encyclopedia entry explaining the tactical tradeoff; seeded regression checks confirm each choice changes defender position reproducibly.

## 2026-11-08 — Route Lab zone route response
- Added an individual zone response choice: spot-drop protects its landmark and closes on nearby threats, while match response carries a receiver's route inside the assigned area and recovers to the landmark after the route exits.
- Exposed the choice in the player inspector and encyclopedia; matched the maintained engine, app and encyclopedia in the standalone hosted HTML.
- Added seeded movement checks for distinct spot/match behavior and hosted UI/reference availability. This remains a coaching abstraction rather than a claim of full NFL pattern-match rules.

## 2026-11-08 — Route Lab zone route distribution
- Match-zone defenders now share receiver ownership in overlapping zones: the nearest eligible defender, adjusted by awareness, carries each route while other defenders protect their areas. Live carriers remain a team pursuit responsibility.
- Documented the coverage tradeoff in the inspector and encyclopedia and added a seeded overlap check.

## 2026-11-08 — Route Lab defensive ball skills
- Defenders now break toward a projected pass after an awareness-based read delay; awareness also improves pursuit pace and coverage continues to influence the catch contest.
- Hands, awareness, and coverage now affect whether a very close breakup becomes a live interception. Added deterministic checks for read timing and a seed where hands changes a breakup into an interception.

## 2026-11-08 — Route Lab ball exchanges and possession
- Animate the center-to-QB snap and validate the center-to-QB distance; QB movement and passing begin after the snap is secured.
- Require the QB and runner to meet at the designed handoff mesh. If the mesh is missed during live play, the QB keeps the ball and scrambles; invalid, unreachable custom meshes are rejected before the snap.
- Resolve loose balls through live pursuit and recovery, out-of-bounds rulings, or ball-settling behavior. Replace the fixed play-duration whistle with a diagnostic watchdog that rejects unresolved simulations without changing game state.
- Track defensive recovery as the live carrier into return pursuit and test that the offense tackles the defender rather than self-contact occurring.
- Added focused snap, mesh, ownership, unreachable-exchange and watchdog scenarios; all 74 regression scenarios and the eight-game audit completed.
## 2026-11-08 — Route Lab slice three: contact resolution and situational calls
- Blocking now builds a sustained engagement using blocker technique, awareness, strength, fatigue and defender rush skill. Leverage shapes the pocket/run lane; some defenders shed after the engagement and return to pursuit.
- A successful runner tackle now shows a brief wrap with the ball carrier’s forward progress continuing through contact before the dead-ball spot is set.
- Pre-snap flags stage fresh CPU O/X calls at the penalty spot after the reset, without running a live play. Invalid editor alignment now leaves the game spot and clock untouched.
- The play selector identifies backed-up, open-field, red-zone, goal-to-go and goal-line situations. CPU calls now include a dedicated Goal Line Power run and goal-line defense as the offense closes on the end zone.

