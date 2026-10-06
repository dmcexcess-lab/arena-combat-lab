# Tavern Keeper — Slice 12: Tavern Facilities & Preparation Depth

Tavern upgrades now directly change how well heroes can be prepared for autonomous contracts.

## Slice 12

- **Kitchen:** stronger/faster meals; better Hearty Meal expedition buffs.
- **Commons / Bar:** stronger morale recovery; developed commons grant Good Company.
- **Lodging:** stronger/faster naps and full rest; better Good Sleep buffs.
- **Infirmary:** stronger/faster healing and increasingly effective injury treatment.
- **Workshop:** cheaper/faster repairs, lower major-repair Scrap Iron at higher levels, and faster crafting.
- All five hero-facing facilities use Levels 1–6 and permanent shared-tavern upgrades.
- Level 1 preserves the previous preparation/repair/crafting behavior.
- Preparation and crafting buttons display authoritative adjusted times rather than duplicated UI estimates.
- Save migration preserves Kitchen/Bar and defaults newly introduced facilities to Level 1.

## Why it matters

A richer tavern now produces measurably better-prepared heroes. Two otherwise identical heroes given the same preparation sequence in Level 1 versus developed facilities leave with different condition, buff quality, readiness and resource/time cost.

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
```

## Next Operation (Slice 13)

Build **Offline Progression & Return Summary**: safely advance tavern service and active expeditions across a bounded closed-browser interval and show exactly what happened on return.
