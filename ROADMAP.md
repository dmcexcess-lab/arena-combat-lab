# Arena Combat Lab — Roadmap

**Human + AI vision.** This describes intended future scope, not current implementation. AI agents use `PROJECT_CONTEXT.md` for current truth.

## Final game: Prison + Arena

### Prison RPG
A compact sim-style prison life between fights. The player can eat, sleep, recover, train, manage HP/Fear/Fatigue, earn and spend money, buy gear, improve lodgings, inspect Arena Master contracts, prepare loadouts, and place wagers on themselves or other gladiators.

Progression should avoid a traditional level treadmill. Growth comes from gear, preparation, resources, condition, access, lodgings and player knowledge. Better lodgings should improve practical things like recovery, storage or preparation.

### Arena
Contracts provide tactical fights with varying enemy rosters, AI intelligence, layouts, objectives, rewards, special conditions and risk. Difficulty comes from the simulation rather than hidden level scaling. The player returns to prison carrying the financial and physical consequences.

## Shared combat laboratory

Arena should also become the **canonical test ground for creatures and equipment across our games**. Combat-relevant creatures, weapons, armor, accessories, feats and effects from another project should be testable here without importing that project's campaign/world systems.

Goal: **shared combat definitions where practical, adapters where necessary.**

## Developer Screen

The first Developer Screen foundation is now part of the current alpha; see `PROJECT_CONTEXT.md` for implemented truth. Its long-term role remains a separate testing surface, not normal progression. The future prison game should open this surface when the developer/testing action is invoked rather than reimplementing its controls.

Continue expanding it toward:

- equip any implemented item and exact/generated rarity directly;
- inspect every stat, property and feat;
- build exact dual-wield/shield/ranged loadouts with fewer post-launch inventory steps;
- set/reset HP, Fear and Fatigue;
- spawn any implemented creature in exact quantities or mixed groups;
- inspect creature stats and AI Intelligence;
- choose/generate a map or seed and place actors/objects/hazards;
- rapidly restart the same scenario;
- visualize LOS/FOV, sound propagation, AI state/last-known target, tick order, cooldowns, hit/damage math, Fear/Fatigue and gear compatibility.

The target remains: **test this exact monster with this exact gear in seconds.**

## Creature + equipment growth

Creature difficulty should vary through durability, damage, action speed, perception, hearing, AI Intelligence, tracking/memory, awareness sharing, morale, attacks/feats, armor/resistance, size and environment behavior. Walker remains the easy low-intelligence benchmark.

Equipment keeps the readable **Stealth / Ranged / Guard / Ravager** armor identities, with accessories as the hybrid space.

**Epic remains disabled for now.** When eventually enabled, Epic is where overt magic and rule-breaking begin: flaming weapons, limited-use spells, normally forbidden gear combinations and other exceptional effects.

## Arena Master contracts

Once combat is stable, replace the pure test wrapper with contracts that clearly expose opponents, objective, risk, reward, environment, special conditions and wager availability. Not every contract must require a full clear; recovery, extraction and survival objectives should remain valid.

The Developer Screen should also launch contract-like scenarios directly for testing.

## Prison systems

After contracts work, add persistent between-fight life:

- **Daily life:** eat, sleep, recover, train, prepare.
- **Economy:** contract rewards and wagers fund gear, recovery, training, lodging and prison services.
- **Arena Master:** compare and accept visibly different risks/rewards.
- **Other gladiators:** support odds, wagering and eventually simulated/observable bouts using the same combat model where practical.

Keep the prison deep enough for meaningful tradeoffs without turning it into a giant life sim.

## Mature player loop

**Wake/recover → eat/train/shop/prepare → inspect contracts → choose risk → wager → fight → receive injury/reward → return to prison → improve circumstances → repeat.**

## Scope guardrail

Keep this a **small finishable game**. Core world: **Prison + Arena**. Do not require an overworld, towns, MMO progression or quest-map sprawl. Depth should come from combat, AI, equipment, prison economy and contract choice.

## Milestone order

1. Stabilize current combat / gear / AI alpha through extensive testing.
2. Expand the live Developer Screen with direct equip/state/map/debug controls as testing demands.
3. Add enough creatures/equipment to prove the test platform and give each creature genuinely distinct behavior where useful.
4. Convert test runs into Arena Master contracts.
5. Add persistent prison eat/sleep/train/recover state and wire its dev/testing action to `open_dev_screen()`.
6. Add economy, gear purchasing and lodging progression.
7. Add wagering and other-gladiator ecosystem.
8. Formalize cross-game creature/equipment integration.
9. Polish into the small complete game.

Current playtest problems outrank roadmap order.
