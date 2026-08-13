# Arena Combat Lab — AI Coding SOP

> **AI-only. HARD RULE: for every user prompt that will edit code, reread this file and `PROJECT_CONTEXT.md` once before the first code edit.** One read per prompt is enough; refetch changed source/SHAs as needed during the prompt.
>
> Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md` · History: `CHANGELOG.md` · Regression contract: `TEST_MATRIX.md`

## 1. Before coding
1. Read SOP + Context once for the prompt.
2. Fetch current `main` and every source file being touched; record SHAs.
3. Confirm `main.tscn` and the live inheritance chain for runtime work.
4. Read the deploy workflow when build assumptions matter.
5. Choose the GitHub write strategy before drafting a large patch.
6. For risky refactors, record the last known-good immutable commit SHA before changing `main`.

If the batch changes current architecture/mechanics/status, update Context before finishing so the next prompt reads fresh truth.

## 2. Code best practices

### One source of truth
- A gameplay rule, catalog, stat definition or compatibility table should have **one authoritative implementation**.
- Do not leave an obsolete implementation underneath a newer override merely as history; Git already stores history.
- Prefer data tables for creature/item differences over copied functions.

### Inheritance discipline
- Add a layer only when it owns a durable responsibility, not to patch one function temporarily.
- Before adding a new layer, first ask whether the change belongs in the existing authoritative layer.
- Most-derived overrides are authoritative, but excessive override chains are a smell: merge superseded patches when safe.
- Use `super` deliberately. Know which ancestor implementation it reaches; avoid relying on accidental lexical-super behavior.

### Behavior-preserving refactors
- Delete code proven unreachable/fully overridden before rewriting active behavior.
- Preserve public method names, dictionary keys and state contracts while pruning internals.
- Do not combine cleanup with balance/design changes unless requested; make regressions attributable.
- Prefer several focused files with clear ownership over one giant script or dozens of one-function patch layers.
- Keep `_ready()` side effects minimal; initialization order across inheritance is easy to break.

### GDScript / dynamic data
- Be conservative with `:=` on Variant-heavy expressions; prefer explicit types or `=`.
- Prefer explicit `float`/`clampf` where inference is fragile.
- Treat Dictionary schemas as APIs: use stable keys (`max_hp`, `ai_intel`, etc.), sensible `.get()` fallbacks, and smoke-test required keys.
- Avoid hidden benchmark RNG unless randomness itself is under test.

### Input
- Desktop Firefox: WASD + mouse/map + optional 1–6 feats.
- Mobile Safari: 90-degree movement/facing pad, touch authoritative, one contact → at most one action, map taps + visible feat buttons.
- Inspect `MainMobileWeb.gd` before changing input routing; do not add early returns that bypass its touch dispatcher.

## 3. Test before publish
- `TEST_MATRIX.md` is the regression contract.
- CI must run the headless Arena smoke test before Web export.
- Smoke tests should verify startup, fixed starters, procgen/objective connectivity, mixed roster, four chests, and gear schema/rarity rules.
- Manual Safari/Firefox checks remain necessary for touch/mouse/UI behavior that headless CI cannot prove.
- When fixing a bug, add/strengthen a smoke assertion when practical so the same class of failure cannot silently return.

## 4. GitHub best practices

### Small/medium text change — Contents API
Fetch first, use the current blob SHA, update once. Never parallel-write the same path or reuse a stale SHA.

### Large/coordinated change — Git Data API
Preferred for refactors: current head/tree → create all replacement blobs → create one tree → one commit → fast-forward `main`. Preflight the entire file set before moving the ref.

### Actions installer — fallback only
Use only when normal connector routes are structurally blocked. Installer must remove staging artifacts **and itself**, commit once, and push. A `GITHUB_TOKEN` push normally will not trigger another push workflow, so use one legitimate normal connector-authored persistent update afterward if a final deploy trigger is required.

### Stop-thrashing rule
Once a transport fails for a known structural reason (payload/safety/stale SHA), change strategy once. Do not keep renaming files, retrying equivalent payloads, or distort architecture to satisfy the transport.

### Refactor safety
- Keep the last known-good commit SHA handy; Git history is the rollback mechanism even if branch creation is unavailable.
- Prefer one coherent refactor commit over many half-migrated commits.
- Never delete the old implementation until the replacement files/blob/tree are prepared in the same commit.
- Do not leave temporary workflows, encoded staging files, marker files or orphaned test scaffolding.
- Compare the final tree/entrypoint against the intended file list before declaring completion.

## 5. Build/deploy truth
Workflow: `.github/workflows/deploy-web.yml` · Godot 4.7.1 Web.

A build is **compiled and live** only when, for the exact final `main` SHA:
1. headless Arena smoke test succeeds;
2. **Export Web build and reject script errors** succeeds;
3. no `SCRIPT ERROR`, `Parse Error`, or `Failed to load script` appears;
4. Pages artifact upload succeeds;
5. deploy job succeeds.

Godot has previously packaged parse errors despite a successful-looking exporter result. Never trust exporter exit code or an older green SHA alone.

Keep SHA-specific exported asset names, `.nojekyll`, `vram_texture_compression/for_mobile=false`, official editor/templates and both smoke/export guards.

## 6. Documentation contract
- `README.md` — humans: concise game/current alpha/controls/links.
- `ROADMAP.md` — humans + AIs: future intent/order.
- `CHANGELOG.md` — humans + AIs: meaningful history.
- `README_SOPS.md` — AIs: coding/GitHub/test/deploy procedure.
- `PROJECT_CONTEXT.md` — AIs: compact current implementation truth.
- `TEST_MATRIX.md` — humans + AIs: regression contract.

Gameplay/system change → Changelog. Current truth → Context. Future scope → Roadmap. New engineering lesson → SOP. Human-facing identity/controls → README. Regression requirement → Test Matrix. Do not duplicate full sections across docs.

## 7. Gameplay invariants
Check Context before intentionally changing: no player levels; same baseline human; equipment creates build; variable-tick combat; no noise-spawn director; physical LOS/sound/facing/fog; armor-anchored Stealth/Ranged/Guard/Ravager; active feats mainly Weapon/Offhand; Epic/magic disabled; global `!! SPOTTED !!` intentional.

## 8. Final self-check
- SOP + Context read once before first code edit this prompt?
- Current source/SHAs refetched after intermediate writes as needed?
- Dead code removed only after proving it superseded?
- No temporary artifacts/workflows left?
- Context/Changelog/Test Matrix/SOP maintained by role?
- `main.tscn` reaches intended runtime?
- Exact final SHA passed smoke + guarded export + Pages deploy?

For meaningful deployed Arena updates finish with:
- **Play:** `https://dmcexcess-lab.github.io/arena-combat-lab/?v=<fresh-token>`
- **Changelog:** `https://github.com/dmcexcess-lab/arena-combat-lab/blob/main/CHANGELOG.md`
