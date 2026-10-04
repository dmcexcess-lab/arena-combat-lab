# Neon Driftline

A phone-first Godot arcade roguelite with persistent research between runs.

## Outer loop

The game now has a real wrapper:

1. Start from the **main menu**.
2. Run levels, shops, enemies, dash scoring, and weapon progression as before.
3. When the run ends, **all score still held at death is banked into permanent Research**.
4. Research currency accumulates across runs and persists in `user://`.
5. Spend it from the main menu on permanent ship upgrades, then launch another run.

Quitting from the pause screen also banks the score currently held in that run.

## Permanent research

Research is deliberately slow and permanent.

- **Ship Speed** — +4% level/world scroll speed per level. Faster travel means levels complete in less real time and hazards/station geometry scroll faster. It also adds **+8% near-miss score per level**.
- **Dash** — +25 px maximum dash distance and +100 px/s dash speed per level, up to five levels. It also adds **+12% dash-near-miss score per level**.
- **Damage** — +3% damage to every player weapon per research level.
- **Hits** — +1 starting hit per level, up to five additional hits. Expensive, but cheaper than the shield unlock.
- **Shield** — 15,000 research. Gives one shield charge at the start of every run. It absorbs exactly **one enemy projectile**; it does not protect against body collisions or lethal station walls.

Ship Speed and Dash therefore increase both risk and score potential: higher scroll speed raises ordinary and dash near-miss payouts, while Dash research adds an additional premium specifically to dash near-misses.

## Pause and mobile/browser safety

An active run automatically pauses when its game window loses focus and when the OS reports the application being paused. The paused screen offers:

- **Resume**
- **Quit + Bank Score**

The active run is snapshotted to `user://neon_run.cfg` when paused. If the app/browser process is suspended or killed after that snapshot, the next launch restores the run into the pause screen rather than advancing it in the background.

Godot's web window-focus notification is handled alongside the mobile application-pause notification so browser tab/app switching and phone sleep use the same run-pause path.

## Run economy

In-run score remains separate from accumulated Research currency.

- Circle kill: 1
- Moving square kill: 2
- Shooting rhomboid kill: 4
- Smart yellow diamond kill: 5
- Ordinary near miss: tens
- Dash near miss: hundreds
- Energy: 10 normally / 20 base in hard lane

Weapon prices remain intentionally expensive:

- Single Auto D1: **300**
- Dual Auto D1x2: **1,000**
- Thin Laser: **2,500**
- Cone Cannon: **5,000**
- Heat Seeker: **10,000**
- Repair +1 hit: **75**

Spending run score in shops reduces what remains available to bank if that run later ends.

## Enemy progression

- **Level 1:** sparse lazy circles, with small circle bunches in its single short hard lane.
- **Level 2:** moving squares begin.
- **Level 4:** strong tracking yellow diamonds begin.
- **Level 6:** shooting purple rhomboids begin.

Levels lengthen gradually, station splits become longer and more numerous, and enemy density/speed increase slowly.

## Dash

The base dash still surges almost to the top of the screen and then coasts while the world scrolls back under the ship. Permanent Dash research extends and accelerates that burst without changing the touch-control scheme.

## Technical target

- Godot 4.7.2 stable
- Compatibility renderer
- 390×844 portrait reference viewport
- Touch-first, mouse fallback
- Browser/mobile focus-loss pause handling
- Persistent research and paused-run snapshot through Godot `ConfigFile`

## Automated smoke test

`godot --headless --path . --script res://tests/SmokeTest.gd`
