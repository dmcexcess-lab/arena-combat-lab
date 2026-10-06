# Tavern Keeper — Slice 9: Equipment Durability & Maintenance

Equipment is now a persistent managed asset instead of a permanent stat label.

## Slice 9

- Every durable weapon/armor copy has its own persistent condition.
- Serviceable gear keeps full stats; Worn, Damaged and Broken gear progressively loses combat value.
- Weapons wear through attacks and armor wears from landed enemy hits.
- Equipped or stored gear can be repaired at the tavern using gold, time and Scrap Iron.
- Crafting and merchant purchases create pristine copies.
- Equipment swaps preserve the physical copy's condition.
- Death before 50% contract progress loses equipped durable gear.
- Death at/after 50% recovers equipped durable gear into tavern stock, but at no more than 35% condition.
- Slice 8 saves migrate old gear to pristine condition.

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
```

## Next Operation (Slice 10)

Build **Concurrent Expeditions & Hero Assignment** so multiple heroes can be deployed independently while the tavern continues operating.
