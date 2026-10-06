# Tavern Keeper — Slice 14: Chronicle & Tavern Legacy

The tavern now remembers what happened there.

## Slice 14

- Founding heroes and recruited applicants have persistent origins.
- Every resolved contract becomes a Chronicle entry.
- Boss kills, full rescues and strong escorts become named feats.
- Rank/title growth becomes visible career history.
- Dead heroes receive permanent memorial entries.
- Exceptional careers become living or fallen **Tavern Legends**.
- Tavern upgrades and long-term patron/revenue/contract thresholds become milestones.
- Seven persistent records track the strongest careers and individual expeditions.
- Fallen heroes can retain records and legend status after death.
- Old saves reconstruct as much Chronicle history as their existing ledgers support.
- Offline-resolved contracts write the same Chronicle history as live contracts.

## Records

Most Contracts · Most Successes · Most Kills · Most Career Gold · Highest Rank · Best Objective Score · Largest Contract Payout

## Run

Open `index.html` directly or serve the folder locally with `python3 -m http.server 8000`.

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
node tests/test_durability.js
node tests/test_concurrency.js
node tests/test_objectives.js
node tests/test_facilities.js
node tests/test_offline.js
node tests/test_chronicle.js
```

## Next Operation (Slice 15)

Run **Balance, UX & Release Acceptance** with architecture frozen: seeded balance batches, economy/readiness/pathology checks, mobile/desktop usability and final release closure rather than another large system expansion.
