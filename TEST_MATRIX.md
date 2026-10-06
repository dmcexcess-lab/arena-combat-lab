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
