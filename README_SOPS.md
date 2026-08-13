# GPT CODING / GITHUB SOP — ARENA COMBAT LAB

> **MANDATORY ENTRY CONDITION FOR GPT:** Before changing code in this repository, fetch and read this file first, then fetch and read `PROJECT_CONTEXT.md`. After that inspect current `main`, the files to be changed, and the active deployment workflow. Do not code from remembered repository state.

This file exists primarily for ChatGPT/Arena Bot. It records the working habits, GitHub connector behavior, Godot pitfalls, deployment rules, and project conventions learned while building this repo with the user.

`PROJECT_CONTEXT.md` is the companion current-state handoff: it describes what the game is, what is implemented now, the live runtime chain, and established scope boundaries. This SOP describes **how to work**; Project Context describes **what currently exists**.

---

## 0. Operating principles

1. **Current repo state beats memory.** Always fetch current files and SHAs before editing.
2. **Direct `main` is the normal workflow.** The user prefers implementation and live testing over PR ceremony.
3. **Batch coherent changes.** Avoid a chain of tiny commits when one cohesive system pass is possible.
4. **Do not invent compatibility/migration baggage during alpha.** Prefer clean invalidation/removal when the user has not asked to preserve legacy behavior.
5. **Never claim “compiled” because GitHub is green or Godot returned 0.** Arena has already produced a packaged Web build containing GDScript parse errors. Use the hardened guard and verify the exact final head.
6. **End every deployed Arena update with both links:**
   - Play: `https://dmcexcess-lab.github.io/arena-combat-lab/?v=<fresh-token>`
   - Changelog: `https://github.com/dmcexcess-lab/arena-combat-lab/blob/main/CHANGELOG.md`
7. **Update `CHANGELOG.md` for every meaningful deployed gameplay/system change.**

---

## 1. Required pre-code checklist

Do this before implementing a new piece:

1. Fetch and read **this file** (`README_SOPS.md`).
2. Fetch and read **`PROJECT_CONTEXT.md`** for current scope/status. Do not use old chat memory as a substitute.
3. Fetch current repo/head metadata or current `main` commit.
4. Fetch the exact source files that will be touched; record each blob SHA.
5. Fetch `.github/workflows/deploy-web.yml` if deployment/build assumptions matter.
6. Confirm `main.tscn` / current script entrypoint when changing inheritance or runtime layers.
7. If the task depends on current gameplay architecture, inspect the live inheritance chain instead of assuming the remembered chain is still correct.
8. Decide the GitHub write strategy **before** generating a giant patch.

Do not ask the user to repeat repo information that GitHub can answer.

---

## 2. GitHub write-path decision tree

### Path A — small/simple change: GitHub Contents API

Use `fetch_file` + `update_file` / `create_file` when:

- one or a few reasonably small text files are changing;
- the complete replacement content comfortably fits the connector;
- no massive generated source payload is involved.

SOP:

1. `fetch_file` first.
2. Use the returned current blob SHA.
3. `update_file` once with the complete new file.
4. If sequentially updating the same path again, use the newly returned `content_sha`; never reuse a stale SHA.
5. Do not issue parallel writes against the same file.

### Path B — large or multi-file source change: Git Data API

Prefer Git blobs/tree/commit/ref for a genuinely large coordinated change, if the connector accepts it:

1. Fetch current `main` commit and base tree.
2. Create source blobs.
3. Create one tree based on the current tree.
4. Create one commit with the current head as parent.
5. Move `main` to that commit with `update_ref`.

**Important:** attempt this route once. If the connector blocks `create_commit`/`update_ref` for the prepared change, do not spend the next ten calls trying tiny variations of the same thing. Switch immediately to Path C.

### Path C — one-shot Actions installer: fallback only

Use only when the Contents/Git Data path is blocked by connector payload/safety behavior.

Preferred pattern:

1. Prepare the intended source as Git blobs first when possible; avoid giant handwritten base64 files in the repo.
2. Create one temporary workflow that checks out `main`, installs/writes the prepared files, updates changelog if appropriate, removes any staging artifacts **and removes itself**, commits once, and pushes to `main`.
3. Verify the installer job succeeded and fetch the resulting commit.
4. **Critical GitHub behavior:** a push made by a workflow using `GITHUB_TOKEN` normally does **not** trigger another push workflow. Therefore the installer’s final push may not start `deploy-web.yml`.
5. After an installer push, make exactly one normal connector-authored persistent repo update (prefer the already-required changelog/version/documentation update, not a disposable marker) to trigger the deploy workflow externally.
6. If a disposable trigger is absolutely unavoidable, remove it promptly and ensure the subsequently published source tree still matches the cleaned tree. Do not leave staging/base64/workflow garbage behind.

### Stop thrashing rule

Once a GitHub method fails for a known structural reason (payload too large, connector safety block, stale SHA), **change strategy once**. Do not repeatedly retry equivalent writes under different filenames or inheritance layers merely to appease the connector.

Architectural file splitting is good when it makes the game cleaner. It is bad when done only because several API payload attempts failed.

---

## 3. Arena compile/deploy truth table

Arena Web deployment workflow: `.github/workflows/deploy-web.yml`.

The workflow currently uses Godot 4.7.1 and contains the essential script-error guard.

### Why the guard exists

Godot has previously:

- emitted `SCRIPT ERROR` / `Parse Error`;
- still produced/exported Web artifacts;
- returned a successful-looking exporter exit status;
- allowed a broken Safari black-screen build to look green at a superficial level.

Therefore “Godot exit code 0” is **not** enough.

### A build may be called good only when all are true

1. Determine the **final current `main` SHA** after all cleanup/changelog commits.
2. Find the deployment workflow run whose `head_sha` equals that exact SHA.
3. Build job completed `success`.
4. Step **`Export Web build and reject script errors`** completed `success`.
5. The guard found none of:
   - `SCRIPT ERROR`
   - `Parse Error`
   - `Failed to load script`
6. Pages artifact upload completed.
7. Deploy job completed `success`.
8. Only then tell the user it is live.

If cleanup commits happen after a successful deploy, the old deploy is no longer proof for the final head. Either trigger/verify a final-head deployment or explicitly state the mismatch.

---

## 4. Arena cache-busting rules

The workflow exports a SHA-specific basename:

- `arena-${SHORT_SHA}.html`
- matching SHA-specific `.pck`
- HTML is renamed to `index.html`

This SHA-named asset is the **real cache busting**.

A URL query such as `?v=aiweapons1` is just a convenient user-facing refresh token. Do not treat the query string itself as proof that new game assets deployed.

Do not regress the workflow to a static PCK basename.

Keep:

- `.nojekyll`
- `vram_texture_compression/for_mobile=false`
- official Godot/export templates
- script-error guard

---

## 5. GDScript/Godot coding traps already encountered

1. **Be conservative with local `:=` inference on Variant-heavy expressions.** Godot 4.7.1 has rejected inference in code that looked reasonable. Prefer explicit types or `=` when values are dynamic.
2. For floats, prefer explicit `float` typing and `clampf` where appropriate.
3. Dynamic dictionaries are everywhere in this prototype. Do not assume dictionary fields infer strongly.
4. When adding an inheritance layer, confirm the new script is actually referenced by `main.tscn`; otherwise perfectly compiling code can be dead code.
5. When overriding touch/input, inspect the parent routing first. A prior wrapper froze all Safari buttons because `_unhandled_input()` returned before the mobile-web touch dispatcher could translate taps.
6. When a child override needs base behavior, confirm exactly which ancestor implements it. This repo has a deep inheritance stack.
7. Avoid hidden/random gameplay state in benchmark systems unless intentionally part of the test. Arena exists to compare systems cleanly.

---

## 6. Mobile/Desktop input conventions

Treat browser targets as different input surfaces, not identical control schemes.

### Desktop / Firefox

- WASD movement is intentional and should remain natural desktop movement.
- Keyboard feat shortcuts may coexist with map/mouse targeting.

### Mobile / Safari

- Existing 90-degree movement/facing buttons are intentional.
- Touch is authoritative; do not reintroduce mouse-emulation double firing.
- One touch contact should produce at most one action until release.
- Map taps are useful for targeting and context interaction (enemy, door, chest, etc.).
- Feats should be visible/selectable buttons when timing matters.

When touching input code, test the routing order mentally and inspect the mobile-web parent before adding early returns.

---

## 7. Gameplay architecture rules to preserve unless explicitly changed

- No player levels.
- Same baseline human; equipment creates the build.
- Walker is an **easy monster**, not a “level 1” monster.
- Variable action-time/tick combat.
- Simulation/emergent behavior over AI-director cheats.
- No noise-based zombie spawning.
- Existing zombies react to sight/sound/awareness.
- Facing, directional FOV, fog, physical sound, stealth/rear attacks, pressure/fear and persistent consequences matter.
- Armor anchors Stealth/Ranged/Guard/Ravager identities; accessories are the hybridization space.
- Epic/magic/cross-class rule-breaking remains disabled until explicitly enabled.
- User likes real systems more than fake alpha placeholders. If a system is introduced, implement the actual loop at small scope rather than pretending with scripted outcomes.

---

## 8. Change packaging SOP

For a coherent gameplay pass:

1. Identify data/schema changes.
2. Implement data/generator layer first.
3. Implement runtime mechanics second.
4. Implement UI/input exposure third.
5. Update starter/test scenario so the new mechanic is immediately testable.
6. Update `CHANGELOG.md` in the same overall pass.
7. Update `PROJECT_CONTEXT.md` if the change alters current scope, architecture, mechanics, or implementation status.
8. Verify final `main` entrypoint and no temporary files/workflows remain.
9. Trigger final build.
10. Verify exact final-head guarded export and Pages deploy.
11. Give the user the Play + Changelog links.

Avoid committing half a system live unless the user explicitly wants an intermediate test.

---

## 9. Communication SOP with this user

- Implementation-first; minimal ceremony.
- Do not repeatedly ask clarification when a sensible system-consistent choice can be made.
- For a long change, give short progress updates and surface discoveries/errors early.
- Be transparent when GitHub/Godot blocks something, but do not drown the user in low-level API noise.
- Batch related fixes.
- When the user says “don’t program yet,” do not touch the repo.
- When the user asks for a design pass, make it complete enough that implementation does not invent new foundational rules mid-code.

---

## 10. Known efficient recovery patterns

### Stale SHA / HTTP 409

Do not retry with the old SHA. Fetch the file again, obtain current blob SHA, then update.

### Contents API rejects a giant file

Do not split gameplay into arbitrary files just to retry the same payload. Move to Git Data API; if blocked once, use the one-shot installer fallback.

### Workflow bot push does not deploy

Expected. `GITHUB_TOKEN` push suppression is a GitHub anti-recursion behavior. Trigger deploy once using a normal connector-authored persistent update, then verify exact head.

### Safari black screen after green Actions

Assume script/runtime packaging problem until disproven. Inspect the guarded export step/log. Do not tell the user to clear cache as the first explanation.

### Build is green but wrong commit deployed

Fetch current `main` SHA and compare against workflow `head_sha`. A successful workflow for an older SHA is not a successful final build.

---

## 11. Final self-check before saying “done”

Ask internally:

- Did I read this SOP first?
- Did I read `PROJECT_CONTEXT.md` for current project truth?
- Did I fetch current source instead of trusting memory?
- Did I choose a GitHub write path once instead of thrashing?
- Are there any temp workflows, staging files, encoded blobs, or marker files left in the tree?
- Is `CHANGELOG.md` updated when appropriate?
- Is `PROJECT_CONTEXT.md` updated when current truth changed?
- Does `main.tscn` point at the intended runtime?
- Did the exact final SHA pass the guarded Godot export?
- Did Pages deploy that exact final SHA?
- Am I giving both required links?

If any answer is no, the task is not finished.
