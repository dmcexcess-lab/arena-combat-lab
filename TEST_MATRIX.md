# Arena Combat Lab — Regression Matrix

Operational checklist for humans + AIs. Keep compact; add only behaviors whose regression would materially break the alpha.

## Automated CI smoke gate
### Tavern Keeper sibling prototype
- JavaScript syntax checks for core.js and app.js pass before Web export.
- test_core.js, test_preparation.js and test_roster.js pass before Web export.
- Seeded runs cover success, retreat and death; preparation materially changes outcomes; failed contracts retain nonzero rewards; expedition gold/sec stops on resolution.
- Slice 2 preparation: meals/rest/morale/treatment cost time/funds; long rest increases hunger; one-contract buffs alter real simulation state; injuries reduce readiness and can be treated.
- Slice 3 roster: starter heroes have unique IDs/state; hero-specific preparation cannot mutate other heroes; contract settlement grows only the deployed hero's career.
- Career XP/skills/history persist; skills affect readiness/combat; milestone traits/titles evolve from contract history.
- Death removes the hero from the living roster and preserves a Fallen memorial; settlement cannot pay twice.
- Roster/economy/death state round-trips through serialization; active expedition snapshot/restore produces the same deterministic continuation.
- Legacy Slice 2-shaped hero state normalizes into valid Slice 3 career state; threat assessment still never blocks deployment.
- Slice 4 tavern economy: patrons generate nonzero live service revenue through seating/service flow; patron simulation is deterministic for equal seeds/ticks; active patrons never exceed seats and queue never exceeds its cap.
- Seating and service upgrades improve throughput; kitchen/bar upgrades improve patron value; upgrade costs come from shared tavern funds and insufficient funds cannot mutate state.
- Tavern economy round-trips with roster persistence, old Slice 3 saves without tavern state migrate to a valid default tavern, and patron income continues even with no living heroes.
- Tavern revenue and expedition revenue remain additive but mechanically distinct.
- Slice 5 crafting: recipes consume exact material quantities atomically, advance preparation time and create the correct shared stock output; failed crafts do not mutate state.
- Stored weapons/armor must transfer from tavern inventory to a hero; replaced equipment returns to stock and crafted equipment changes real readiness/combat stats.
- Crafted Healing Potions and Field Bandages transfer from stock into capped hero supplies; autonomous Field Bandage use heals and reduces lingering injury in the real combat simulation.
- Expedition loot settles into the same raw-material stash consumed by recipes; crafting stock/history round-trip through persistence and Slice 4 saves migrate with empty crafting fields.
- Direct buy_potion preparation is absent; potion procurement is only through explicit crafting or the visible merchant system.
- Slice 6 merchants: merchant quality is derived only from tavern development; equal merchant seeds/state/ticks produce identical visits and stock.
- Merchant visits are timed, finite and rotating; generated offers are unique/bounded, obey quality gates, and never contain crafted-only Scrap Spear, Plated Vest or Field Bandages.
- Purchases spend exact shared gold, decrement finite merchant stock and add to the authoritative shared material/item inventories; insufficient funds and sold-out purchases are atomic failures.
- Quality 3 can surface Steel Sword / Chain Mail while lower-quality visits cannot; purchased gear uses the same inventory-to-hero equip path as crafted gear.
- Merchant state/purchase history round-trip through persistence, Slice 5 saves migrate to a future visit, and the merchant clock advances through TavernRoster.tickTavern.
- Slice 7 contract board: authoritative contract order is Threat 1/2/3/4/6 and every contract graph has valid locations/enemies/materials plus a reachable resolution and at least one optional-risk branch.
- Every living roster hero can start every contract regardless of hero-relative risk; threat assessment is advisory only and selected contract persists with TavernRoster.
- Equal hero/seed/contract inputs remain deterministic; active expedition snapshot/restore preserves contract ID and old snapshots without contract ID migrate to Greymill.
- Every contract has at least one successful seeded run for a strong prepared hero and at least one non-success run with positive partial performance gold for an overmatched hero.
- Contract income multipliers rise with threat, loot profiles produce differentiated material tendencies, and settlement keys include contract ID.
- Slice 8 recruitment: applicant quality is derived from tavern development; equal recruitment seed/tavern/ticks produce the exact same applicant record.
- Applicant stats/condition/traits/starting gear remain inside quality-tier bounds while repeated seeds generate varied people; crafted-only equipment never appears as applicant starting gear.
- Applicants expire after a finite visit; insufficient-fund hiring is atomic; successful hiring spends exact gold and transfers the exact inspected applicant into the roster at career rank 1.
- Recruited heroes can deploy to every contract regardless of threat and enter the same permanent-death/Fallen flow as founding heroes.
- A zero-living-hero tavern can continue earning, receive an applicant and rebuild the roster without a full reset.
- Recruitment state/history round-trip through persistence, Slice 7 saves migrate to a scheduled applicant, and the applicant clock advances through TavernRoster.tickTavern.
- Slice 9 durability: equipped and stored durable items preserve per-copy condition through inventory transfers and persistence; legacy Slice 8 gear migrates to pristine condition.
- Worn/Damaged/Broken condition materially reduces readiness/combat effectiveness; contract combat wears weapons on use and armor on landed hostile hits.
- Equipped/stored repairs spend exact gold/time/Scrap Iron and restore only the targeted physical copy; failed repairs are atomic.
- Death before 50% objective progress loses equipped durable gear; death at/after 50% recovers it into shared stock at damaged condition.
- Slice 10 concurrency: multiple different heroes can run independent expeditions simultaneously, while duplicate deployment of the same unsettled hero is rejected.
- Expedition pause/1×/4×/12× speed is per-entry; ticking one manager advances each active expedition according to its own speed without changing focus.
- Mixed concurrent success/retreat/death outcomes settle independently into the correct hero career/fallen state and additive shared funds/materials.
- Persistent expedition IDs make identical repeat hero/contract/seed runs settle separately while duplicate settlement of the same expedition ID remains blocked.
- Multi-expedition manager state round-trips active/completed entries, focus, speed and settlement state; the old single-expedition snapshot can be wrapped without changing expedition state.
- Slice 11 objectives: every contract exposes explicit sub-objectives/rules and each kind produces distinct objective state rather than only route labels.
- Hunt scores trail/quarry/den progress; Extermination scores infestation/vermin/nest progress; Escort scores checkpoints and caravan integrity; Delve scores discoveries/miner rescue; Boss Hunt scores designated-boss damage milestones and kill.
- Escort caravan destruction can end the contract as failure while the hero remains alive; earlier checkpoint rewards remain banked.
- Sub-objective gold and performance-rate rewards remain in the expedition total on retreat/failure/death; success closes objective score at 100 without erasing prior events.
- Objective state/events/bonus gold persist through snapshot/restore; Slice 10 snapshots without objective fields migrate from route progress.

### Arena
- Main scene instantiates without script/runtime errors.
- Four fixed starter identities exist and equip valid Common gear.
- `PlayerProfile` normalizes/clamps cosmetics, preserves open appearance data and supplies fantasy random names.
- Developer Screen exposes Character / Gear / Creatures / Summary pages plus public `open_dev_screen()` entry point.
- Character name input is a real `LineEdit` with virtual keyboard enabled/show-on-focus.
- Creator preview suppresses the Head slot so hair is visible while editing.
- Setup-level `PlayerProfile` name/appearance reaches the live runtime player.
- Live runtime exposes the paper-doll renderer and crown orientation keeps hair above the face.
- Dev gear factory generates exact requested rarity, exposes live rarity budgets and constructs legal custom stats/properties/feats.
- Queued dev gear reaches the new character's starting inventory.
- `ArenaScenario` normalizes arbitrary catalog rosters and expands them correctly.
- `CreatureCatalog` exposes at least the 9 current creatures without duplicating base creature stats.
- Generic creature roster spawning honors exact counts for base and expanded creature types.
- Arena generation produces floor cells, an exit, objective choices and four loot chests.
- Exit and objective are path-connected.
- Loot generation returns only Common/Uncommon/Rare/Enchanted and required item fields.

## Manual release smoke
### Desktop / Firefox
- Developer Screen opens to Character; all four page tabs work.
- Name field types/backspaces/submits normally; fantasy random name and random appearance update immediately.
- Creator preview never shows starter headgear; hair style/color remain visible.
- Gear page switches starter kit, queues exact-rarity random gear and creates custom gear with visible stat/property/feat budgets.
- Creature page paginates through the full catalog, +/- counts work and total cannot exceed 40.
- Summary accurately reflects character, starter kit, queued gear and nonzero creature counts; only Summary launches the Arena.
- WASD moves/faces correctly; mouse targets/interacts; 1–6 selects feats.
- Menu and character/inventory overlays open/close.
- Queued dev items appear in starting inventory and can be equipped normally.
- Paper doll rotates with facing and visibly changes when Weapon/Offhand/Armor/Head/Cloak/Gloves/Belt/Boots change.
- Hair stays on the crown for all four facings; equipped headgear hides/replaces it.
- Doors open/close; cache can be recovered; stair completes run only after cache.

### Mobile / Safari
- One finger contact causes at most one action.
- Tapping the Character name `LineEdit` opens the device keyboard; typed text updates the profile and submit closes editing without launching the Arena.
- Fantasy random name still works independently of keyboard input.
- Creator appearance controls are single-tap and the helm-hidden preview updates live.
- Gear/Creature/Summary controls remain single-tap with no duplicate mouse actions.
- Creature pagination and count controls remain usable in portrait layout.
- 90-degree movement/facing pad works without duplicate mouse actions.
- Feat buttons select/arm/fire and display tick cooldowns.
- Map taps attack creatures and interact with gates.
- Tactical paper doll remains readable at map scale and equipped weapon/offhand do not obscure facing.

### Combat identities
- Stealth: rear/unaware play, throwing knives, legal small-blade dual wield.
- Ranged: Short Bow Quick Shot only on diagonal adjacency; Long Bow has no Quick Shot.
- Guard: shield defense + multi-target control.
- Ravager: full-weapon dual wield + single-target feats use target max HP.

### Creatures
- Walker remains slow/easy/AI-1 baseline.
- Ripper remains fast and shares/tracks awareness better.
- Brute remains slow/durable and smashes gates loudly.
- Ghoul/Hound/Stalker/Marauder/Warden/Juggernaut spawn with their catalog HP/speed/sense/AI profiles.
- Damaging a creature reveals the attacker; `!! SPOTTED !!` persists through memory.

### Gear / loot
- Four chests open once and add an item to inventory.
- Exact-rarity dev generation never silently rolls a different rarity.
- Custom item builder cannot exceed rarity stat/property/feat budgets or apply illegal properties/feats.
- Armor restrictions grey/block incompatible physical gear.
- Accessories remain unrestricted.
- Epic/magic never rolls.
