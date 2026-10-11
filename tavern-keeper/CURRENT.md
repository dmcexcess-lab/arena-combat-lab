# CURRENT — Tavern Keeper

## Current operation
Major Change 9 — Interactive JRPG Boss Encounters

## Status
Major Change 4 was implemented as a deliberate new progression generation. The browser save key changes, so this build force-starts Tavern Keeper from a fresh tavern rather than importing the prior three-founder/speed-control economy.

## Progression reset
- New tavern starts with exactly one founding hero: Edrin Vale.
- Contract Board starts with two low-threat jobs and can expand to a maximum of five.
- Board access is gated by BOTH tavern level and reputation.
- Tavern level comes from facility, service and seating improvements.
- Reputation comes from patrons served, lifetime tavern revenue and successful contracts.
- Current board ladder exposes 2 → 3 → 4 → 4 → 5 jobs while harder threats unlock with progression.
- Heroes are assigned from a dropdown on the Contract Board.
- Heroes' Table has no Deploy action; it is preparation, equipment and career management only.

## Contract economy / time
- One simulation speed only. Pause, ×4, ×12 and manual-step controls are removed.
- Contract ladder:
  - Threat 1: base +1 g/s · 15 min
  - Threat 2: base +2 g/s · 30 min
  - Threat 3: base +3 g/s · 1h 30m
  - Threat 4: base +5 g/s · 4 hr
  - Threat 6: base +8 g/s · 8 hr
- Gold accrues continuously at the advertised base job g/s while deployed; existing performance events can still add rewards.
- Autonomous combat, route and objective logic remains active.
- Death or retreat can end a job early.
- Completing the objective starts a return journey; successful settlement occurs at the listed duration.
- Threat 6's 8-hour duration intentionally matches the offline progression cap.

## Default experience
- The app now opens directly into a live animated tavern room instead of a long dashboard.
- The tavern itself is the navigation surface. Physical objects open focused systems:
  - Bar counter → Tavern Floor / facilities / upgrades
  - Contract notice board → Contract Board
  - Heroes' table → Roster / preparation / loadout / deployment
  - Workbench → Workshop / stash / crafting / maintenance
  - Merchant corner → Visiting Merchant
  - Front door → Applicants
  - Ledger → Tavern Chronicle
  - Wall map → Expeditions / completed reports
- Each management destination is a separate app screen with Back to Tavern.
- Escape and tapping the Tavern Keeper title return to the tavern.
- Deploying a hero opens the Expeditions road-map screen.

## Animated tavern state
- Patron actors persist by TavernEconomy patron ID with coordinates, route goals and stable seat assignments.
- New patrons originate on the exterior road.
- Waiting patrons line up entirely outside the building.
- Queued patrons who receive a seat walk to the exterior door, cross the interior threshold and continue to their assigned seat.
- Patrons leaving the tavern walk back outside before their actor disappears.
- Served patrons visually distinguish food/drink state and animate mug use.
- Only living, non-deployed heroes appear at the heroes' table; deployed heroes are physically absent.
- Current visiting merchant and current applicant appear in their actual room locations.
- Staff count follows `serviceSlots()`; each staff actor walks from the bar to the actual unserved patron selected by the economy service order, then returns home.
- Scene badges mirror selected contract, active expeditions, Chronicle entries, Workshop level, home heroes, service level, merchant/applicant presence.
- The newest tavern service event appears as an ambient room status line.
- Patron/staff translation is state-driven with `requestAnimationFrame`; CSS animation is limited to fire, lamps, rain, walking limbs, serving arms and mugs.
- `prefers-reduced-motion` disables continuous animation.

## Rendering / phone behavior
- The underlying simulation continues globally regardless of which screen is open.
- Only the currently visible management screen repaints live; hidden screens no longer rebuild every 250 ms.
- Scene actor DOM is signature-gated and only rebuilds when patron/hero/visitor membership or state changes.
- Scene objects are touch targets; existing coarse-pointer controls remain at least 44px high.
- Portrait layout repositions the physical room objects rather than reverting to a dashboard.

## Unchanged simulation contract
- All Slice 1–15 systems remain authoritative: tavern economy, preparation/facilities, persistent heroes, contracts/objectives, crafting, merchants, recruitment, durability/death, concurrent expeditions, offline progression, Chronicle and release balance.
- No save migration was required; this is a presentation/navigation change.

## Tests
CI gate now includes:

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
node tests/test_contracts.js
node tests/test_recruitment.js
node tests/test_durability.js
node tests/test_concurrency.js
node tests/test_objectives.js
node tests/test_facilities.js
node tests/test_offline.js
node tests/test_chronicle.js
node tests/test_release.js
node tests/test_scene_ui.js
```

## Known limitations
- The room is CSS/DOM art rather than final illustrated sprite art.
- Spatial movement is waypoint/path simulation tied to authoritative tavern states rather than collision/navmesh pathfinding.
- Physical-device Safari/Firefox feel, object hit-box comfort and scene composition still require human playtesting.
- Offline progression remains capped at 8 hours.

## 2026-10-08 CI recovery and release acceptance
- Fixed obsolete regression fixtures that assumed the previous three-founder tavern or universal contract-board access. Multi-hero concurrency, recruiting, crafting, offline, and Chronicle coverage is preserved using explicit test heroes.
- Added job-board regression checks for dual level/reputation gates and the 2 → 3 → 4 → 4 → 5 job ladder.
- Corrected timed Chronicle acceptance to respect the new 15-minute minimum contract.
- Rebalanced Threat 3 / Threat 4 internal action pacing to 120s / 300s per action. Advertised 90-minute / 4-hour durations and +3 / +5 g/s base income are unchanged.
- Release acceptance across 250 seeded runs per profile/contract now measures aggregate founding-profile success at 100%, 99.07%, 27.07%, 24.93%, and 15.20% for Threat 1 / 2 / 3 / 4 / 6.
- The full 16-suite Tavern Keeper gate, headless Arena smoke test, web exports, and GitHub Pages deployment passed on commit `fc110efbc6bef3f7f3ff0f1ba1a3294c48b6bf25` (Actions run `37894123434`).
- Remaining acceptance: hands-on Safari/Firefox and small-screen touch playtesting. No real-device session was performed in this CI recovery.

## Major Change 5 — illustrated 2D fantasy presentation
- The real playable room now uses a purpose-built 1200×760 overhead illustrated SVG terrain/floor plan, wooden planks, stone foundation, tavern tables, hearth, barrels, lanterns, garden and the exterior road/queue, aligned to unchanged simulated world coordinates.
- Eight separate overhead prop sprites are mounted on the original physical buttons. Selecting the objects still opens the same dedicated systems.
- Patron/server/hero/merchant/applicant figures use reusable fantasy-character SVG sprites; their positions, seat assignments, walking and serving continue to follow TavernEconomy rather than a decorative animation.
- The existing single-founder reset, threat/reputation job board, contract pacing, saves, offline progression and expedition rules remain unchanged.
- On small screens the scene becomes a 900px-wide side-scrollable stage with an Interior/Outside shortcut; objects and patrons retain legible touch sizes rather than being miniature.
- Illustrated art files are included in the GitHub Pages web bundle. The scene UI acceptance gate checks art and animation wiring; CI also parses all three SVG files as XML.
- Reduced-motion users receive static figure visuals while simulated state changes remain active.
- Known limitation: sprite styling is custom vector art, not a hand-painted raster atlas; Safari/Firefox real-device visual and touch QA is still needed.

## Major Change 6 — sustained progression economics (2026-10-11)
- Root cause: five minutes of ordinary tavern sales previously generated about 77g, versus 20–34g for the first permanent improvements. A 30-minute successful contract could deliver around 5,600g, financing essentially the upgrade tree.
- Contract BASE rates and listed lengths remain +1 / +2 / +3 / +5 / +8 g/s at 15m / 30m / 90m / 4h / 8h. Gold remains held with the hero until contract resolution; poor returns still bank partial performance income.
- Actual contract performance g/s now caps at 150% of the listed rate (and loaded in-progress expeditions respect that cap). Objectives still add small one-off bonuses.
- Tavern permanent improvements have starting costs of 700–1,300g and triple on each successive tier. Five tiers for each of seven upgrade types require sustained reinvestment; the short-away payoff cannot buy all first tiers.
- Unattended **tavern** service receives 100% of earned receipts through 15m, 25% for minutes 15–60, then no more idle tavern gold. Patrons and visitors continue simulating; offline revenue records and funds use the same scaled payouts.
- Expeditions keep their full simulated time and contract payout up to the preexisting **8-hour** offline simulation cap. A long contract is not artificially shortened or penalized for being completed offline.
- Existing saves remain intact: no forced restart, prior upgrades are not revoked, current treasury remains unchanged. Economy rules apply to future activity. For fresh pacing use New Tavern.
- Added `test_economy_balance.js` to enforce affordability windows, exponential upgrade capital, contract g/s ceiling and offline yield tiers. Updated offline, release, tavern, facility checks plus the return summary.
- Maintain the illustrated scene and all existing acceptance checks.

## Major Change 7 — two income streams and adventure homecoming (2026-10-11)
- The tavern has two treasury income sources: customers buying food/drink (actual patron sales), and active hero salaries (g/s while deployed). Both are spendable as earned.
- A hero's hourly-rate salary is credited directly to shared funds via `ExpeditionManager.tickAll(dt, roster)` during online AND offline simulation. `wageGold` and `creditedWages` are persisted with each expedition; reloading, recurring ticks, and settlement cannot duplicate wages. Older expeditions missing a salary ledger still receive outstanding accumulated pay upon settlement.
- Job ladder: Threat 1 = 1h at 0.3 g/s + ~260g success reward; Threat 2 = 2h at 0.5 g/s + ~420g; Threat 3 = 3h at 0.75 g/s + ~850g; Threat 4 = 5h at 1.0 g/s + ~1,400g; Threat 6 = 8h at 1.5 g/s + ~2,600g. Combat/action intervals grow with each longer adventure; threat and combat remain authoritative.
- On returning, an expedition adds separately tracked `returnGold` plus any objective gold and collected crafting materials. Unsuccessful runs bring back a smaller payment proportional to performance; salary already earned is retained. Successful contracts guarantee one primary material besides route scavenging.
- Settlement deposits only unpaid salary and return reward; `Expedition.gold` still records lifetime total for career statistics/Chronicle, and return rewards are paid once only.
- 8-hour offline simulation cap and 15m/60m unattended **tavern-sales** taper remain; the taper does not reduce hero salary. Offline summary now shows tavern receipts, hero g/s earned, and completed-quest rewards separately.
- UI now labels food/drink g/s and adventurer g/s in the top bar and quotes the time-based income and completion reward on each contract.
- Contract state snapshots evolve to version 7 and load older data. Existing saves are preserved; currently deployed quests adopt the new listed durations when restored from contract IDs.
- CI adds `test_income_streams.js` with wage-credit, snapshot, once-only settlement, offline revenue accounting and guaranteed return-reward regressions.

## Major Change 8 — the tavern floor and mercenary economy (2026-10-11)
- Economic hierarchy: patron food/drink sales are the durable minimum income. A high-tier mercenary on a dangerous contract is the engine of major wealth; permanently losing that mercenary eliminates their ongoing g/s and may cost their expensive equipment.
- Threat 1 and 2 remain 1h / 2h at +0.30 / +0.50 g/s. The three harder quests last 3h / 5h / 8h and advertise **up to +1.50 / +4.00 / +9.00 g/s**. Completion bonuses and loot remain separate on return.
- High-tier pay depends on the *assigned mercenary's threat assessment*: Comfortable/Reasonable = 100%, Risky = 90%, Extremely Dangerous = 65%, Likely Fatal = 2% of the listed base g/s. Every living hero remains selectable for any **unlocked** job. The board shows actual selected-hero starting rate as well as contract potential. Tactical objective performance can still raise g/s, capped at 1.5× posted base.
- Expanded recruitment from three to five quality tiers, unlocked by tavern investment: stat ranges Q1 3–6, Q2 4–7, Q3 5–8, Q4 6–9, Q5 7–10. Higher-tier recruits arrive with stronger equipment, healthier needs, and traits, and cost orders of magnitude more. First-tier rescue recruits remain affordable from ordinary food/drink sales even with no heroes alive.
- Gear prices better reflect capital at risk: ordinary replacement weapons/armor cost roughly 85–400g; steel sword 2400g, chain mail 3100g. Permanent death and existing gear-recovery/durability rules remain authoritative.
- Total party wipe does not require reset: if no heroes remain, a Tier-1 recruit replaces any visiting expensive elite. Tavern services keep operating. After the first offline hour, a **10% recovery-only service trickle** persists until the existing eight-hour cap; normal active-roster saves still have zero unattended sales after hour one.
- Founders and previously hired recruits, equipped gear, saves, upgrade ownership and earlier progression are preserved. The new rates, prices and recovery policy apply going forward.
- Seeded risk/regression coverage protects meaningful late-tier payout contrast, the still-possible permanent death of an expensive starting mercenary, one-time pay settlement, and post-wipe recruitment.

## NEXT OPERATION
Test the actual economy on desktop and phone: 1h/2h base income + return rewards, high-tier selected-hero salary quotes, expensive starter equipment/recruitment, death terminating income, and bankruptcy recovery from patron sales with 8h offline limits. Continue balancing upper-tier outcome rates and upgrade cadence only from measured results.

## Major Change 9 — player-controlled boss battles (2026-10-11)
- Boss encounters marked `encounter.boss` are now player-controlled during real browser gameplay, not ordinary autonomous combat. Wren Bridge has a required troll boss; Blackroot Mine's optional Brood Chamber has a two-stalker miniboss. Other enemies and optional Wren Lair troll remain autonomous.
- When an expedition reaches a boss, it enters `isBossPending()`: **that expedition's duration, wages and autonomous decisions pause** until the player resolves combat. The tavern, other expeditions, visiting merchants, recruitment and the offline 8h world simulation continue at normal speed.
- A persistent alert opens Road Map and selects the waiting expedition. The JRPG battle panel shows hero/boss figures, health bars, combat feedback and five commands: Attack, Power Strike, Guard, Potion and Retreat. Each valid command advances one hero/enemy turn, with the boss's third-turn crushing attack made visible; Retreat can fail. Consumables, injuries, gear wear and permanent death are real and shared with the hero roster.
- Victory records the existing boss objective and resumes the original route; on death or retreat, original career/settlement/gear-loss outcomes apply. No extra speed control, bypass, or free g/s while stopped.
- Boss turn, enemy HP, RNG, equipment/supplies and waiting state serialize with the expedition (snapshot v8). Reopening or long absence cannot auto-resolve the fight. Older in-flight expedition saves can still load.
- The browser scene adds `art/bosses.svg` and `art/boss.css`; GitHub Pages includes the new files. The CI suite `test_boss_battle.js` verifies pause/salary freeze, other active work, offline waiting, deterministic snapshot recovery, command validity, victory, optional mine boss, and alert/UI wiring. Standalone noninteractive simulation remains automatic for seeded game-balance testing.
- Remaining manual acceptance: iPhone Safari touch comfort and visual clarity, several boss attempts with ordinary mercenaries, reload while mid-battle, and balancing hero actions versus boss damage.
