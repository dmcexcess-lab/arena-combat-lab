# CURRENT — Tavern Keeper

## Current slice
Slice 3 — Persistent Heroes

## Status
Implemented as a standalone browser vertical slice on top of the Slice 1 autonomous contract core and Slice 2 preparation loop.

## Core rules implemented
- Tavern owns a persistent multi-hero roster with shared funds, materials and preparation time.
- Starter roster contains three distinct heroes: Edrin Vale, Mara Fen and Borin Hale.
- Each hero independently persists health, hunger, fatigue, morale, injuries, equipment, supplies, traits, titles, career XP, career rank, skills and contract history.
- Career skills are Melee, Ranged and Survival; skills improve from actual expedition performance and feed back into readiness/combat.
- Contract completion/failure awards performance-derived career XP rather than a flat static amount.
- Career milestones can add systemic traits/titles such as Veteran, Survivor, Battle Hardened, Ratbane, Road Regular, Greymill Veteran, Ratcatcher and Scarred Survivor.
- Surviving heroes return to the roster in their actual post-contract condition.
- Dead heroes are permanently removed from the living roster and stored in the Fallen archive with their final career/history.
- Shared expedition gold/materials settle into the tavern exactly once.
- Preparation remains hero-specific while spending shared tavern funds.
- Threat Level remains advisory; any living roster hero may deploy regardless of readiness.
- Browser state auto-saves to localStorage.
- Tavern roster/economy/death archive and an active expedition can be serialized/restored.
- Active expedition restore includes RNG state, current combat, progress, AI/debug state and accumulated rewards so refreshing mid-contract resumes deterministically.
- Slice 1 autonomous AI/combat/performance gold and Slice 2 condition/injury systems remain authoritative.

## Tests
Run:

\`\`\`bash
node tests/test_core.js
node tests/test_preparation.js
node tests/test_roster.js
\`\`\`

CI also syntax-checks \`core.js\` and \`app.js\`.

## Known limitations
- Only one expedition may be active at a time.
- Starter roster is fixed for now; the real recruitment system is a later slice.
- If all heroes die, the current prototype requires New Tavern / Clear Save to restart.
- Tavern funds are still mostly expedition-funded; patron gold/sec arrives in Slice 4.
- Persistence is browser-local only and intentionally has no cloud/account save yet.
- Contract content remains one test contract.

## NEXT OPERATION
Slice 4 — Tavern Economy: add patrons, food/drink service, seating/throughput and a stable tavern gold/sec engine that shares the same persistent tavern state without displacing expedition income.
