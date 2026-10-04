# Neon Driftline

A phone-first Godot arcade roguelite with persistent research between runs.

## True starting baseline

A fresh run now begins deliberately weak:

- **2 hits**
- **No weapon**
- **No shield**
- **Slow ship:** base level/world scroll multiplier is 0.72×
- **Short dash:** 160 px base distance at 700 px/s

The first level remains the easiest: sparse lazy circles, one short station split, and no advanced enemies.

## Permanent research

All score still held when a run ends is banked into persistent Research currency. Quitting through the pause screen also banks the current score.

### Ship Speed

Each level adds:

- +4% world/level scroll speed
- +8% near-miss score

Because level progress uses world scroll speed, a faster researched ship reaches the end of levels sooner in real time and faces faster incoming geometry.

### Dash

Each level adds:

- +35 px dash distance
- only +40 px/s dash speed
- +12% dash-near-miss score

Dash has 10 research levels. The baseline dash is intentionally short and slow; research extends its reach much more aggressively than its raw speed.

### Damage

Each level permanently adds **+3% player weapon damage**.

### Hits

Fresh ships begin with **2 hits**.

Hit research adds +1 starting hit per level, up to +5 extra hits. It deliberately starts expensive, but its price curve rises relatively gently:

- first extra hit: **5,000 Research**
- later hit costs grow by about **35% per level**

### Shields

Fresh ships begin with **0 shield charges**.

Each shield research level adds **one projectile block at the start of every run**, up to 5 charges. A charge absorbs one enemy projectile; it does not protect against enemy-body collisions or station walls.

Shield pricing starts cheap but escalates sharply:

- Shield 1: **500**
- Shield 2: **2,500**
- Shield 3: **12,500**
- Shield 4: **62,500**
- Shield 5: **312,500**

## Starting-weapon research

The in-run weapon shop remains unchanged, but Research can permanently unlock weapons as **starting loadouts**.

Each starting-weapon unlock costs exactly **10× its normal run-shop price**:

- Single Auto D1: **3,000 Research**
- Dual Auto D1x2: **10,000**
- Thin Laser: **25,000**
- Cone Cannon D3x3: **50,000**
- Heat Seeker D7: **100,000**

Unlocked starting weapons can be selected from the Research menu before a run. **NONE** is always selectable, so an unlocked weapon never forces a loadout.

Normal in-run weapon prices remain:

- Single Auto: 300
- Dual Auto: 1,000
- Thin Laser: 2,500
- Cone Cannon: 5,000
- Heat Seeker: 10,000
- Repair +1 hit: 75

## Score economy

- Circle kill: 1
- Moving square kill: 2
- Shooting rhomboid kill: 4
- Smart yellow diamond kill: 5
- Ordinary near misses: tens
- Dash near misses: hundreds
- Energy: 10 normally / 20 base in the hard lane
- Nonlethal damage gives no score

Ship Speed research raises all near-miss rewards. Dash research adds an additional multiplier specifically to dash near-misses.

## Space presentation and enemy archetypes

The playfield now reads as open space rather than a lane/road: layered scrolling stars and faint deep-space haze replace the old vertical guide lines. The pre-split center guide is gone; the station divider only exists when the physical station segment actually arrives.

- **Asteroids (kind 0, 3 HP):** irregular grey rocks with craters and slow spin. They mostly ride the scroll and only barely drift laterally.
- **Square drones (kind 1, 4 HP):** weak, dumb drones. They move downfield and make only a very slow lateral correction toward the player.
- **Diamond drones (kind 2, 12 HP):** faster, strongest, smarter pursuit drones. They lead toward the player's intended horizontal movement but their lateral pursuit is capped so they remain avoidable.
- **Trapezoid drones (kind 3, 4 HP):** weak ranged skirmishers. They can move both up and down, try to maintain a standoff above the player baseline, fire aimed shots, and dodge player projectiles that are on an intercept path. They never intentionally move below the player's baseline.

Enemy progression remains gradual:

- **Level 1:** sparse asteroids only; the short hard lane gets small asteroid clusters.
- **Level 2:** square drones begin.
- **Level 4:** smart diamond drones begin.
- **Level 6:** ranged trapezoid drones begin.

Levels gradually lengthen, station splits become longer and more numerous, and enemy pressure rises slowly.

## Split cleanup

Hard/easy lane difficulty now ends exactly when the station split ends. Surviving lane-bound objects are released back to full-width movement, their hard-lane tag is cleared, and any lane-only speed modifier is removed. New spawns after the split always use neutral full-width rules, so the former hard half cannot stay harder after the station has passed.

## Pause and persistence

Active runs pause automatically on browser-window focus loss, application focus loss, or mobile application suspension.

The pause screen offers:

- **Resume**
- **Quit + Bank Score**

Paused runs are snapshotted to `user://neon_run.cfg`. Persistent Research is stored separately in `user://neon_meta.cfg`.

## Technical target

- Godot 4.7.2 stable
- Compatibility renderer
- 390×844 portrait reference viewport
- Touch-first controls with mouse fallback
- Persistent meta progression and paused-run recovery

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
