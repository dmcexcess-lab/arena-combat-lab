# Arena Combat Lab — AI Project Context

> **AI-only current-state handoff. Read after `README_SOPS.md` and before coding.**
>
> This file answers: **What is true in the project right now?**  
> Future intent belongs in `ROADMAP.md`; history belongs in `CHANGELOG.md`; work procedure belongs in `README_SOPS.md`.

**Snapshot:** 2026-08-13  
**Repo:** `dmcexcess-lab/arena-combat-lab`  
**Live:** https://dmcexcess-lab.github.io/arena-combat-lab/

---

## 1. Current product

Arena Combat Lab is the combat/equipment systems lab for **Boundless Adventure**. The playable build is currently a **single-player procedural-dungeon alpha**, not yet the prison + arena game described in the roadmap.

Current run loop:

1. Pick one of four fixed Common starter kits.
2. Pick exact Walker population.
3. Generate a connected dungeon and spawn on its stair.
4. Explore, fight or avoid Walkers.
5. Step on 4 chests to roll gear.
6. Recover the cache.
7. Return to the stair to win.

No full clear is required.

There are **no player levels**. Every run uses the same baseline human; equipment creates the build.

Walker is the current **easy benchmark monster**, not a “level 1” enemy.

---

## 2. Current combat model

Established systems:

- variable action-time/tick timeline;
- directional facing/FOV;
- LOS and fog/exploration memory;
- last-known enemy positions rather than unseen live tracking;
- physical cell-propagated sound with obstruction/attenuation;
- rear/unaware attacks and stealth;
- HP, Fear and Fatigue;
- gear-modified action tick costs;
- weapon/offhand active feats with tick cooldowns;
- knockback, crowd pressure, doors and explosive casks;
- global `!! SPOTTED !!` warning;
- no noise-based spawning or AI-director enemy creation.

Speed is not a universal stat: actions themselves have tick costs.

---

## 3. Fixed player baseline

| Value | Base |
|---|---:|
| Might | 2 |
| Finesse | 2 |
| Awareness | 2 |
| Vitality | 2 |
| Will | 2 |
| HP | 22 |
| Fear | 0/100 |
| Fatigue | 0/100 |

Intent:

- **Might:** melee damage/force.
- **Finesse:** accuracy and weapon-action speed.
- **Awareness:** ranged accuracy/perception/sound localization.
- **Vitality:** HP and fatigue resistance.
- **Will:** fear resistance/recovery.

Fear bands: Steady 0–24, Pressured 25–49, Frightened 50–74, Panicked 75–99, Break 100.

Fatigue bands: Fresh 0–24, Winded 25–49, Tired 50–74, Exhausted 75–99, Spent 100.

---

## 4. Current equipment system

Slots:

`Weapon, Offhand, Head, Gloves, Cloak, Armor, Belt, Boots, Ring 1, Ring 2, Amulet`

Chest **Armor** anchors physical compatibility. Rings and Amulet are unrestricted hybridization slots.

### Stealth

- Main: Stiletto, Dirk, Long Knife.
- Offhand: throwing-knife kits, Stiletto, Dirk.
- Small-blade dual wield only.
- Finesse/Awareness, silence, rear/unaware play.

### Ranged

- Short Bow: range 5, 6–9 ranged damage, defining **Quick Shot**.
- Quick Shot: only Short Bow; diagonal adjacency; reduced accuracy/damage; no knockback.
- Long Bow: range 8, 8–12 damage, knockback 2, slower/more fatigue, **no Quick Shot**.
- Light Crossbow: Piercing Bolt identity.
- Normal close positioning is intentionally dangerous.

### Guard

- Iron Mace, Short Sword, War Hammer.
- Buckler, Kite Shield, Tower Shield.
- Vitality/Will, armor, block/brace, multi-target control.
- Lower single-target identity than Ravager.

### Ravager

- Great Axe, Execution Sword, Maul.
- Can offhand full Ravager weapons.
- Fixed starter currently uses Great Axe + Execution Sword offhand.
- Might, heavy single-target damage, higher tick/fatigue cost.
- Guard—not Ravager—owns the crowd-control identity.

### Compatibility summary

- **Stealth armor:** Stealth Weapon/Offhand/Cloak/Boots; may borrow Ranged Head/Gloves/Belt.
- **Ranged armor:** Ranged Weapon; no normal Offhand; Ranged Gloves/Belt; may borrow Stealth Head/Cloak/Boots.
- **Guard armor:** Guard Weapon/Shield/Gloves/Belt; may borrow Ravager Head/Cloak/Boots.
- **Ravager armor:** Ravager Weapon/Offhand/Gloves/Cloak/Boots; may borrow Guard Head/Belt.
- Rings/Amulet unrestricted.
- Incompatible items are greyed/blocked; armor changes eject incompatible physical gear.

---

## 5. Current loot and feats

Enabled rarity:

`Common -> Uncommon -> Rare -> Enchanted`

**Epic is disabled. No magic or cross-class rule breaking is active.**

Chest odds:

- Common 45%
- Uncommon 30%
- Rare 18%
- Enchanted 7%

Quality progression:

- Common: native package + native combat special.
- Uncommon: +1 generated stat + 1 legal property.
- Rare: +2 stats + 1 property + 1 extra Weapon/Offhand feat.
- Enchanted: +3 stats + 2 properties + 2 extra feats.

Current generated property vocabulary includes:

`Reinforced, Stout, Lightened, Quickened, Enduring, Steady, Silent, Sure-Gripped, True-Aimed, Deep-Pocketed, Braced, Forceful, Efficient`.

Starter kits are fixed Common gear, not randomized.

HUD exposes up to **6 feat buttons**. Cooldowns use combat ticks, not seconds. Targeted feats arm, then fire on target tap.

**Dual Strike** is implemented for legal Stealth/Ravager dual wield: main-hand hit + separate offhand hit at 60% offhand damage, longer action, extra fatigue, 240-tick cooldown.

---

## 6. Walker benchmark and AI

| Value | Current |
|---|---:|
| HP | 12 |
| Hit | 45% |
| Damage | 3–5 |
| Move | 130 ticks |
| Attack | 105 ticks |
| Sight | 7 |
| Hearing threshold | 12 |
| AI Intelligence | 1 |

No hidden Walker stat RNG, armor, levels or magic.

Current AI states:

- **IDLE**
- **CHASE** — direct acquisition.
- **FOLLOW** — remembered/shared location, not exact tracking.
- **INVESTIGATE** — brief search after losing active spot.

Current rules:

- A successful damaging hit reveals the player.
- If the target survives, it directly spots the attacker.
- A lethal stealth hit can still alert nearby Walkers around the impact.
- Walker Intel 1 shares awareness about 1 tile.
- Shared awareness gives FOLLOW, not omniscience.
- `!! SPOTTED !!` persists while a Walker still remembers the player.
- Walkers crudely follow player breadcrumbs and intentionally search poorly.
- Spot memory is mostly AI-Intelligence-driven; armor weight is a smaller modifier (roughly Stealth 210t, Ranged 230t, Ravager 250t, Guard 270t at Intel 1).

---

## 7. Current input/UI

### Desktop / Firefox

- WASD movement/facing.
- Mouse/map targeting/context.
- 1–6 selects visible feats.

### Mobile / Safari

- Portrait HUD.
- Compact left-side 90-degree movement/facing controls.
- Up to six right-side feat buttons.
- Map taps target enemies/objects and context interactions.
- Touch is authoritative; one touch should produce at most one action until release.

`MainMobileWeb.gd` touch routing is critical. Do not add an early `_unhandled_input()` return without checking the parent dispatcher.

---

## 8. Live runtime chain

`main.tscn` -> `scripts/MainAlphaAI.gd`

```text
MainAlphaAI
 -> MainAlphaDual
 -> MainAlphaWeapons
 -> MainAlphaGear
 -> MainAlphaWrapper
 -> MainAlphaCombat
 -> MainAlphaState
 -> MainBoundless
 -> MainDungeon
 -> MainMobileWeb
 -> MainMobile
 -> MainPerception
 -> Main
```

**Most-derived overrides are authoritative.** Older parents contain superseded prototype constants/comments. In particular, old `MainBoundless.gd` gear assumptions and `AlphaGearCore.gd`'s Hunting Bow are overridden by the current Alpha layers / `AlphaGearCoreV2.gd`.

---

## 9. Source map

| Concern | Source |
|---|---|
| Walker AI / top runtime | `scripts/MainAlphaAI.gd` |
| Dual wield | `scripts/MainAlphaDual.gd` |
| Short/Long Bow, Quick Shot | `scripts/MainAlphaWeapons.gd` |
| Current gear catalog overrides | `scripts/AlphaGearCoreV2.gd` |
| Base gear generator/rarity | `scripts/AlphaGearCore.gd` |
| Gear/inventory HUD | `scripts/MainAlphaGear.gd` |
| Combat HUD/cooldowns/setup | `scripts/MainAlphaWrapper.gd` |
| Feat/combat formulas | `scripts/MainAlphaCombat.gd` |
| HP/Fear/Fatigue/chests runtime | `scripts/MainAlphaState.gd` |
| Procgen / Walker constants | `scripts/MainBoundless.gd` |
| Safari touch routing | `scripts/MainMobileWeb.gd` |
| Perception | `scripts/MainPerception.gd` |
| Base combat | `scripts/Main.gd` |
| Entry | `main.tscn` |

---

## 10. Current test status

Latest gameplay pass implemented Short Bow/Long Bow separation, Stealth/Ravager dual wield, Dual Strike, hit-reveals-stealth, AI Intelligence, local awareness sharing and CHASE/FOLLOW/INVESTIGATE memory.

It passed the hardened Godot Web export and Pages deploy. **User runtime feedback on that latest gameplay pass had not yet been reported when this snapshot was written.**

For future intent, read `ROADMAP.md`. For exact work/deploy procedure, read `README_SOPS.md`.
