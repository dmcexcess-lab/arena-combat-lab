# Tavern Keeper — Slice 8: Recruitment & Applicants

A standalone browser prototype where the tavern now produces its own evolving hero roster instead of relying forever on three fixed starting characters.

## Run

Open `index.html` in a browser. No build step or external dependencies are required.

Local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The browser build auto-saves applicant visits, recruited heroes and recruitment history alongside the roster, active expedition, selected contract, tavern economy, crafting and merchants.

## Tests

```bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
node tests/test_tavern.js
node tests/test_crafting.js
node tests/test_merchants.js
node tests/test_contracts.js
node tests/test_recruitment.js
```

## Slice 8

- Applicants arrive at the operating tavern on a persistent finite visit timer.
- Each applicant is a generated person with a stable name/ID, varied stats, AI-relevant traits, current condition, personal gear and supplies.
- Applicants are generated once; pressing Recruit accepts that exact candidate instead of rerolling.
- Tavern development determines applicant Quality 1–3.
- Higher quality raises stat floors, condition quality, traits and starting-equipment potential.
- Hiring costs shared tavern gold and the price reflects applicant quality/stats/equipment.
- Recruited heroes enter at career rank 1 and thereafter use the exact same systems as founding heroes.
- Recruited heroes can be prepared, equipped from shared stock, sent to any contract, gain career progression, survive, retreat or permanently die.
- A complete roster wipe is recoverable because the tavern keeps operating and future applicants can be hired.
- Recruitment RNG, active applicant, timers, visit history/counters and recruitment history persist through refresh.
- Slice 7 saves migrate automatically to a scheduled applicant visit.

## Applicant quality

- **Quality 1:** rougher stats/condition and basic Wood Axe/Rusty Sword + no/Padded Armor range.
- **Quality 2:** stronger baseline with Rusty Sword/Hunting Bow and Padded/Leather Armor range.
- **Quality 3:** higher stat floor, two starting traits and access to Hunting Bow/Steel Sword plus Leather/Chain Mail.
- Premium Steel Sword and Chain Mail are ordinary high-grade gear available through strong merchants or strong applicants; crafted-only equipment remains exclusive to crafting.

## Retained foundations

- Slice 1: autonomous AI/combat, readable decisions and performance gold/sec.
- Slice 2: needs, injuries, preparation and treatment.
- Slice 3: persistent careers and permanent death.
- Slice 4: patron service and stable tavern income.
- Slice 5: material crafting and shared inventory ownership.
- Slice 6: timed merchants and procurement.
- Slice 7: five-contract threat ladder with unrestricted deployment and paid failure.

## Architecture

`core.js` remains the single gameplay authority.

- `RecruitmentSystem` owns applicant timing, quality, deterministic generation and visit persistence.
- `applicantQuality()` derives candidate tier from persistent tavern development.
- `TavernRoster.recruitApplicant()` is the authoritative gold transaction and exact-person transfer into the roster.
- Recruited heroes are normal `heroTemplate()` records after hiring; there is no separate recruit-only hero class.
- `app.js` renders applicant state and invokes recruitment without duplicating generation/cost rules.

## Known limitations

- One applicant at a time; no negotiation or manual pass system.
- No dedicated recruitment facilities/reputation yet.
- No gear durability/repair system yet.
- One active expedition at a time.
- No offline progression.

## Next Operation (Slice 9)

Build **Equipment Durability & Maintenance**: persistent gear wear from expeditions, tavern repairs using resources, real damaged/broken penalties, and explicit equipment recovery/loss on hero death.
