# Arena Combat Lab — AI Coding SOP

> **AI-only operating procedure. Read this first. Then read `PROJECT_CONTEXT.md`.**
>
> This file answers: **How should an AI work in this repo?**  
> Current game truth: `PROJECT_CONTEXT.md`  
> Future vision: `ROADMAP.md`  
> History: `CHANGELOG.md`

---

## 1. Mandatory startup

Before coding:

1. Read `README_SOPS.md`.
2. Read `PROJECT_CONTEXT.md`.
3. Fetch current `main` head.
4. Fetch every source file to be touched and note current blob SHAs.
5. Confirm `main.tscn` / live inheritance if runtime behavior is involved.
6. Read `.github/workflows/deploy-web.yml` when build/deploy assumptions matter.
7. Choose the GitHub write path **before** drafting a huge patch.

Current repo beats memory. Never code from chat history alone.

---

## 2. Working style

- Direct `main` is normal; user prefers live testing over PR ceremony.
- Batch coherent system changes instead of chains of tiny patches.
- Implement real small-scope systems, not scripted placeholders.
- During alpha, remove/invalidate obsolete behavior instead of accumulating migration baggage unless preservation is requested.
- If the user says **do not program yet**, do not touch the repo.
- When design is requested first, make it complete enough that implementation does not invent foundational rules mid-code.

---

## 3. GitHub write-path decision

### A. Contents API — default for small/medium text changes

Use `fetch_file` + `update_file` / `create_file` when content comfortably fits.

Rules:

- fetch first;
- use current blob SHA;
- sequential same-file updates use the newly returned SHA;
- never parallel-write the same path.

### B. Git Data API — large or coordinated multi-file changes

Use blobs/tree/commit/ref when a full-file Contents write is too large.

Sequence:

1. fetch current head + base tree;
2. create intended blobs;
3. create one tree based on current tree;
4. create one commit with current head as parent;
5. move `main` to the new commit.

Attempt this route once. If the connector blocks the structural operation, move to C.

### C. Self-cleaning Actions installer — fallback only

Use only after the normal connector paths are structurally blocked.

The temporary workflow must:

- checkout current `main`;
- write/install the intended files;
- remove staging artifacts;
- remove **itself**;
- commit once;
- push to `main`.

Important: a workflow push using `GITHUB_TOKEN` normally does **not** trigger another push workflow. After an installer commit, make one normal connector-authored **persistent** update (documentation/changelog/version if already appropriate) to trigger the final deploy. Avoid disposable marker files.

### Stop-thrashing rule

When a method fails for a known structural reason—payload size, safety block, stale SHA—**change strategy once**. Do not retry the same idea under different filenames or split code into nonsense layers merely to appease the API.

---

## 4. Godot coding rules learned the hard way

- Be conservative with local `:=` inference in Variant-heavy code. Prefer explicit types or `=`.
- Prefer explicit `float` + `clampf` when type inference is fragile.
- Dynamic dictionary fields are not strongly typed just because their values look obvious.
- After adding an inheritance layer, verify `main.tscn` actually reaches it.
- Before overriding input, inspect the parent input dispatcher. A previous early return froze Safari touch controls.
- Most-derived runtime override wins; old parent constants/comments may be historical residue.
- Benchmark systems should avoid hidden RNG unless randomness is specifically under test.

---

## 5. Input conventions

### Desktop / Firefox

- WASD behavior is intentional.
- Mouse/map targeting is intentional.
- Keyboard feat shortcuts may coexist.

### Mobile / Safari

- 90-degree movement/facing buttons are intentional.
- Touch is authoritative; do not reintroduce duplicate mouse-emulation actions.
- One touch contact should cause at most one action until release.
- Map taps are appropriate for targeting/context.
- Feats that need player timing should remain visible/selectable buttons.

Touch changes require inspection of `MainMobileWeb.gd` routing first.

---

## 6. Build/deploy truth

Workflow: `.github/workflows/deploy-web.yml`  
Current Godot target: 4.7.1 Web.

Godot has previously emitted GDScript parse errors while still producing an apparently successful export artifact. Therefore exporter exit code alone is not proof.

A build may be called **compiled and live** only when:

1. identify the final current `main` SHA after every cleanup/doc/changelog commit;
2. find the deploy workflow whose `head_sha` is exactly that SHA;
3. build job succeeds;
4. **Export Web build and reject script errors** succeeds;
5. no `SCRIPT ERROR`, `Parse Error`, or `Failed to load script` is accepted by the guard;
6. Pages artifact upload succeeds;
7. deploy job succeeds.

A green run for an older SHA is not proof for current head.

Cache busting uses SHA-specific exported assets. User-facing `?v=<token>` is convenience only.

Keep:

- SHA-specific Web asset basename;
- `.nojekyll`;
- `vram_texture_compression/for_mobile=false`;
- official editor/templates;
- script-error guard.

---

## 7. Documentation contract

Each document has one job:

- **`README.md` — humans only:** concise introduction, current playable alpha, controls, links.
- **`ROADMAP.md` — humans + AIs:** future product vision and intended sequence.
- **`CHANGELOG.md` — humans + AIs:** chronological history of meaningful changes.
- **`README_SOPS.md` — AIs only:** workflow, GitHub, coding and deploy procedure.
- **`PROJECT_CONTEXT.md` — AIs only:** compact snapshot of what is implemented/current now.

Maintenance:

- gameplay/system change -> update `CHANGELOG.md`;
- change to current architecture/mechanics/status -> update `PROJECT_CONTEXT.md`;
- change to future scope/order -> update `ROADMAP.md`;
- change to workflow/tooling lessons -> update `README_SOPS.md`;
- human-facing identity/controls/link change -> update `README.md`.

Do not duplicate full sections across documents.

---

## 8. Gameplay invariants to check before accidental rewrites

Use `PROJECT_CONTEXT.md` as the authority, but especially verify before changing:

- no player levels;
- same baseline human; gear creates build;
- Walker = easy monster, not level 1;
- variable-tick combat;
- no noise-spawn director;
- physical LOS/sound/facing/fog;
- armor-anchored Stealth/Ranged/Guard/Ravager identities;
- active feats primarily from Weapon/Offhand;
- Epic/magic disabled until intentionally enabled;
- `!! SPOTTED !!` is intentional.

---

## 9. Long-task communication

- Give concise progress updates during multi-step repo work.
- Surface real bugs/blockers early.
- Do not narrate every API call.
- Be transparent about failures, then switch strategy rather than thrashing.
- Never tell the user a build is live until final-head verification is complete.

For every meaningful deployed Arena gameplay update, finish with:

- **Play:** `https://dmcexcess-lab.github.io/arena-combat-lab/?v=<fresh-token>`
- **Changelog:** `https://github.com/dmcexcess-lab/arena-combat-lab/blob/main/CHANGELOG.md`

---

## 10. Final self-check

Before saying done:

- SOP read?
- Context read?
- current source fetched?
- sane write path chosen once?
- no temp workflows/staging/encoded artifacts left?
- docs updated according to their roles?
- correct live entrypoint?
- exact final SHA passed guarded export?
- exact final SHA deployed to Pages?
- required user links included?

If a required answer is no, the task is not finished.
