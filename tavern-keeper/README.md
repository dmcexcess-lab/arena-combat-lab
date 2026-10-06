# Tavern Keeper — Slice 15 Release Candidate

Run a fantasy tavern, prepare persistent heroes, send them into autonomous contracts, collect what they earn, and remember whoever comes back.

## Core loop

**Earn → recruit → prepare → equip → choose risk → deploy → watch the autonomous expedition → collect partial/full rewards → recover or memorialize → improve the tavern → repeat.**

Heroes are not directly controlled in combat. Threat is advisory rather than a gate. Failure still pays for actual performance. Death is permanent for the hero, not for the tavern.

## Release systems

- Persistent heroes with careers, traits, titles, injuries and permanent death.
- Five discrete autonomous contract types with explicit partial objectives.
- Concurrent expeditions with individual Pause / 1× / 4× / 12× speeds.
- Dynamic expedition gold/sec plus separate stable tavern income.
- Tavern facilities that materially improve meals, morale, rest, treatment and maintenance.
- Crafting, merchants, equipment condition and repair.
- Recruitment that can rebuild the roster even after total hero loss.
- Up to 8 hours of deterministic offline progression.
- Persistent Chronicle, legends, memorials, milestones and record-holders.

## Release balance

Seeded release acceptance checks the full founding roster across the board. Aggregate success is approximately:

- Threat 1: **100%**
- Threat 2: **99%**
- Threat 3: **27%**
- Threat 4: **25%**
- Threat 6: **15%**

These are roster-level acceptance figures, not promised odds for an individual hero. Builds and personality matter substantially.

## Run

Open `index.html` directly or serve the folder locally with `python3 -m http.server 8000`.

## Release gate

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
```

## Status

Feature architecture is frozen after Slice 15. Future work should be evidence-driven bug fixing, balancing, accessibility and polish rather than automatic scope expansion.
