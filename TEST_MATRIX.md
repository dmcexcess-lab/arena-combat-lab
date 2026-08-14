# Arena Combat Lab — Regression Matrix

Operational checklist for humans + AIs. Keep compact; add only behaviors whose regression would materially break the alpha.

## Automated CI smoke gate
- Main scene instantiates without script/runtime errors.
- Four fixed starter identities exist and equip valid Common gear.
- `PlayerProfile` normalizes/clamps known cosmetic fields while preserving open appearance data.
- Setup-level `PlayerProfile` name/appearance reaches the live runtime player.
- Live runtime exposes the `MainArenaVisuals` paper-doll renderer.
- `ArenaScenario` normalizes starter/roster data and expands the roster correctly.
- `CreatureCatalog` exposes the live Walker/Ripper/Brute definitions without duplicated stats.
- Arena generation produces floor cells, an exit, objective choices and four loot chests.
- Default mixed roster spawns Walker/Ripper/Brute counts correctly.
- Exit and objective are path-connected.
- Loot generation returns only Common/Uncommon/Rare/Enchanted and required item fields.

## Manual release smoke
### Desktop / Firefox
- Creator opens first; name typing/backspace/Enter works; appearance +/- and random buttons update the live preview.
- Setup profile strip reopens the creator and retains the chosen identity.
- WASD moves/faces correctly; mouse targets/interacts; 1–6 selects feats.
- Menu and character/inventory overlays open/close.
- Paper doll rotates with facing and visibly changes when Weapon/Offhand/Armor/Head/Cloak/Gloves/Belt/Boots change.
- Hair stays on the crown for all facings; equipped headgear hides/replaces hair instead of stacking over it.
- Knife/bow/crossbow/sword/mace/hammer/axe and Buckler/Kite/Tower silhouettes remain visually distinguishable in the large preview.
- Doors open/close; cache can be recovered; stair completes run only after cache.

### Mobile / Safari
- One finger contact causes at most one action.
- Creator name tap opens the device keyboard; Done returns to setup without launching the Arena.
- Creator appearance controls are single-tap and update the equipped preview.
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
- Ripper visibly moves faster and shares/tracks awareness better.
- Brute is slow/durable, hits harder and makes loud gate noise.
- Damaging a creature reveals the attacker; `!! SPOTTED !!` persists through memory.

### Gear / loot
- Four chests open once and add an item to inventory.
- Armor restrictions grey/block incompatible physical gear.
- Accessories remain unrestricted.
- Epic/magic never rolls.
