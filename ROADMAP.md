# Arena Combat Lab — Roadmap

This document is the **human + AI vision document** for where Arena Combat Lab is going. It describes intended product scope and development order, not current implementation truth. For current implementation state, AI agents should use `PROJECT_CONTEXT.md`.

No dates are implied. The sequence can change as playtesting exposes better priorities.

---

# 1. Final game shape

The finished small game should have **two connected modes**:

## Prison RPG

A compact sim-style prison life between arena contracts.

The player should be able to:

- eat;
- sleep;
- recover from fights;
- train;
- manage Fear/Fatigue/health consequences;
- earn and spend money;
- buy and manage better equipment;
- improve lodgings inside the prison;
- accept Arena Master contracts of varying difficulty;
- bet on their own fights;
- bet on other gladiators;
- prepare a loadout before entering the Arena.

The prison should make the combat character feel persistent without adding traditional character levels. Improvement comes primarily from **gear, resources, training effects, condition, knowledge and access**.

## Arena

The Arena is the tactical combat half of the game.

Contracts provide controlled combat situations with different:

- enemy rosters;
- enemy intelligence/behavior;
- arena layouts;
- objectives;
- difficulty;
- rewards/purses;
- risk;
- special contract conditions.

Combat retains the current core: variable ticks, facing, LOS/fog, physical sound, stealth, Fear, Fatigue, equipment identities, active feats and enemy intelligence.

The player returns to prison after the contract, carrying the economic and physical consequences of the fight.

---

# 2. Second purpose: shared combat test ground

Arena Combat Lab should also become the **canonical proving ground for creatures and equipment used across our games**.

A creature, weapon, armor set, accessory, feat or combat mechanic made for another game should be testable here without needing that entire game running around it.

The long-term rule is:

> If we make a combat creature or equipment system for one of our games, Arena should be capable of exercising it in isolation.

This makes Arena both a game and a reusable systems laboratory.

That does **not** mean every other game's progression, story or world systems belong here. Arena imports the things useful to combat testing: actors, stats, AI capabilities, equipment, attacks, effects and relevant environmental interactions.

---

# 3. Development tracks

## Track A — Combat foundation

This is the current focus.

Target state:

- reliable variable-tick combat;
- clear mobile and desktop input;
- strong melee/ranged/stealth/control identities;
- robust equipment restrictions and hybridization;
- HP/Fear/Fatigue interactions;
- physical sound and visibility;
- scalable enemy intelligence;
- procedural combat spaces;
- enough enemy and equipment variety to expose balance problems.

Current Alpha systems already provide much of this foundation.

## Track B — Developer Portal

Build this **before content volume becomes large** so every later monster/item can be tested quickly.

The Developer Portal should be accessible outside normal progression and allow direct setup of controlled tests.

Minimum portal capabilities:

### Player setup

- choose any armor identity;
- equip any legal item directly;
- choose generated or exact rarity;
- inspect full item stats/properties/feats;
- create specific dual-wield/shield/ranged combinations;
- set HP, Fear and Fatigue;
- reset to baseline instantly.

### Creature setup

- spawn any implemented creature;
- choose exact quantity;
- inspect its combat stats;
- set/inspect AI Intelligence;
- place creatures manually or use generated placement;
- mix multiple creature types in one test.

### Arena setup

- choose/generated map;
- set seed when useful;
- place player/enemies/objects;
- toggle or inspect doors, hazards and environmental pieces;
- rapidly restart the exact scenario.

### Debug visibility

- show LOS/FOV;
- show sound propagation;
- show AI state and last-known target;
- show CHASE/FOLLOW/INVESTIGATE information;
- show tick order/action costs/cooldowns;
- show hit chance, damage and mitigation calculations;
- show Fear/Fatigue changes;
- show gear compatibility decisions.

### Test convenience

- one-click fixed benchmark loadouts;
- one-click benchmark monsters;
- save/reload useful test setups where practical;
- clear all actors/reset combat without reloading the entire game.

The Dev Portal is not a cheat menu for normal play. It is a separate testing surface.

## Track C — Creature library

Once the portal exists, grow beyond the Walker benchmark.

Creatures should vary across independent dimensions rather than simply becoming larger bags of HP:

- physical durability;
- damage;
- movement/action speed;
- perception;
- hearing;
- AI Intelligence;
- memory/tracking;
- communication/awareness sharing;
- morale/fear behavior where relevant;
- attacks/feats;
- armor/resistances;
- size/space control;
- environmental interactions.

The Walker remains useful as the low-intelligence/easy baseline even after stronger creatures exist.

Whenever another project creates a useful creature, add an Arena-compatible representation so it can be benchmarked here.

## Track D — Equipment library

Expand the current Common → Enchanted system without losing readable identities.

Near-term equipment remains non-magical and class-shaped by armor:

- Stealth;
- Ranged;
- Guard;
- Ravager;
- unrestricted accessories for hybridization.

As the system matures, Arena should support equipment imported or adapted from other projects.

### Later rarity tier: Epic

Epic is intentionally disabled in the current Alpha.

When enabled, **Epic is where rule-breaking and overt magic begin**, for example:

- flaming weapons;
- limited-use spell-granting accessories;
- armor that permits a normally locked slot/family;
- unusual cross-class interactions.

Magic should feel exceptional because normal equipment establishes understandable rules first.

## Track E — Arena contracts

Replace the current pure test-wrapper run with a contract model that can also be launched directly from the Dev Portal.

Arena Master contracts should define at least:

- difficulty/risk description;
- opponent roster;
- objective;
- purse/reward;
- arena/environment;
- special conditions;
- player wager availability.

Contract difficulty should come from the actual simulation: enemy stats, intelligence, numbers, layout and conditions—not hidden level scaling.

Possible objective structures can reuse current principles such as extraction/recovery rather than requiring every contract to be a total clear.

## Track F — Prison RPG

Build the persistent between-fight layer once the combat/contract loop is strong enough to support it.

### Daily needs

- food;
- sleep;
- recovery;
- training;
- preparation.

The prison should create reasons to spend time/resources between fights without becoming a giant life simulator.

### Training

Training should improve combat readiness without turning into conventional XP levels.

Exact long-term form can be tuned, but it should interact with the existing physical model rather than replacing gear as the main build system.

### Economy

Money should come primarily from:

- contract purses;
- wagers;
- potentially results involving other gladiators.

Money should leave through:

- equipment;
- food/recovery;
- training/access;
- improved lodging;
- betting losses;
- other prison services as needed.

### Lodgings

The player starts with poor prison accommodations and can earn access to better living conditions.

Better lodgings should provide practical advantages such as improved recovery, storage, preparation or convenience rather than merely being a cosmetic number.

### Arena Master

The Arena Master is the contract gateway.

The player uses the Arena Master to evaluate and accept available fights with visibly different risks and rewards.

## Track G — Betting and other gladiators

The prison should contain other gladiators as persistent enough entities to support an arena ecosystem.

The player can eventually:

- bet on themselves;
- inspect odds before a contract;
- bet on other gladiators;
- see outcomes affect money and potentially future context.

Odds should be grounded in known matchup information rather than arbitrary casino randomness where possible.

Other-gladiator bouts do not need the player to manually fight both sides; the same combat model can eventually support simulation or observation where useful.

## Track H — Integration platform for our other games

Once Arena has enough content, formalize the content boundary so new projects can contribute combat assets cleanly.

For reusable content, aim for data definitions that can describe:

- creature identity and stats;
- AI capability values;
- attacks/feats;
- equipment slots/restrictions;
- item stats/properties;
- status/effect hooks;
- visuals/labels needed by Arena.

Avoid tightly coupling Arena to another game's campaign code.

The goal is **shared combat definitions where practical, adapters where necessary**.

---

# 4. Intended player loop

At mature scope, the basic loop should read clearly:

**Wake / recover → eat / train / shop / prepare → inspect contracts → choose risk → wager if desired → fight in Arena → receive consequences/reward → return to prison → improve circumstances → repeat.**

The loop should support both short sessions and longer build/economy arcs without requiring a huge world.

---

# 5. Intended progression philosophy

There are still **no traditional character levels** planned as the core progression system.

Progress should primarily emerge from:

- acquiring better or stranger equipment;
- building synergistic loadouts;
- earning access to better prison resources/lodgings;
- managing money;
- training/preparation;
- learning enemy behavior;
- selecting contracts intelligently;
- surviving long enough to benefit from accumulated advantages.

The same underlying human becoming dangerous because of preparation, equipment and experience is more important than a level number increasing.

---

# 6. Scope guardrails

Keep the final game small enough to finish.

The core world is **Prison + Arena**, not an open-world RPG.

Do not require:

- a giant overworld;
- dozens of towns;
- traditional quest-map sprawl;
- MMO-style progression;
- hundreds of bespoke systems before the core loop works.

Depth should come from interactions among combat, AI, equipment, prison economy and contract choice.

The reusable test-lab role should make additions to this game valuable even when they originate in another project.

---

# 7. Milestone order

The current intended order is:

1. **Stabilize current combat/gear/AI Alpha.**
2. **Build the Developer Portal.**
3. **Add enough creature/equipment variety to prove the portal and balance model.**
4. **Turn test runs into Arena Master-style contracts.**
5. **Add persistent prison state and the eat/sleep/train/recover loop.**
6. **Add economy, gear purchasing and lodging progression.**
7. **Add betting and other-gladiator ecosystem.**
8. **Formalize cross-game creature/equipment integration.**
9. **Polish content, balance, presentation and replayability into the small complete game.**

This order is a guide, not a promise. Current-system problems discovered in testing outrank roadmap sequencing.
