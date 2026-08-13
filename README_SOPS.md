# Arena Combat Lab — AI Coding SOP

> **AI-only. HARD RULE: for every user prompt that will edit code, reread this file and `PROJECT_CONTEXT.md` once before the first code edit.**
>
> One read per prompt is enough. Follow-up patches, CI fixes, input tweaks and hotfixes within that same prompt do **not** require another reread. Documentation-only prompts do not require the startup reread.
>
> Current truth: `PROJECT_CONTEXT.md` · Future: `ROADMAP.md` · History: `CHANGELOG.md`

## 1. Before the first code edit in each prompt

1. Reread `README_SOPS.md`.
2. Reread `PROJECT_CONTEXT.md`.
3. Fetch current `main` and the exact files being touched; note current SHAs.
4. Confirm `main.tscn` / live inheritance when runtime behavior is involved.
5. Inspect `.github/workflows/deploy-web.yml` when build/deploy assumptions matter.
6. Choose the GitHub write path before drafting a huge patch.

If CI fails and code needs another fix within the same prompt, keep working from current repo state without repeating steps 1–2. Still refetch any file whose content/SHA may have changed.

If the code batch changes current architecture, mechanics, runtime chain, balance truth or implemented status, update `PROJECT_CONTEXT.md` before finishing the prompt so the next prompt reads fresh truth.

## 2. Working style

- Direct `main` is normal; user prefers live testing over PR ceremony.
- Batch coherent systems, not chains of tiny patches.
- Build real small-scope systems, not fake scripted placeholders.
- During alpha, remove/invalidate obsolete behavior instead of accumulating migration baggage unless preservation is requested.
- If the user says **do not program yet**, do not touch code.
- Complete design first when requested so coding does not invent foundational rules mid-pass.

## 3. GitHub write decision

### A — Contents API
Default for small/medium text changes: fetch first, use current blob SHA, never parallel-write the same path.

### B — Git Data API
For large/coordinated changes: current head/tree → blobs → one tree → one commit → move `main`. Attempt once.

### C — self-cleaning Actions installer
Fallback only when normal connector paths are structurally blocked. It must checkout `main`, install intended files, remove staging artifacts **and itself**, commit once, and push.

A `GITHUB_TOKEN` workflow push normally does not trigger another push workflow. After installer cleanup, use one appropriate normal connector-authored persistent update (usually required docs/changelog) to trigger the final deploy.

**Stop-thrashing rule:** once a method fails for a known structural reason (payload/safety/stale SHA), change strategy once. Do not retry equivalent writes under different names or create nonsense architecture solely for transport.

## 4. Godot rules learned the hard way

- Be conservative with local `:=` inference in Variant-heavy code; prefer explicit types or `=`.
- Prefer explicit `float` / `clampf` when inference is fragile.
- Dynamic dictionary fields are not strongly typed just because values look obvious.
- After adding an inheritance layer, verify `main.tscn` reaches it.
- Before overriding input, inspect the parent dispatcher; an early return previously froze Safari touch.
- Most-derived runtime override is authoritative; old parent constants/comments may be residue.
- Benchmark systems should avoid hidden RNG unless randomness is the thing under test.

## 5. Input invariants

**Desktop / Firefox:** WASD, mouse/map targeting, optional keyboard feat shortcuts.

**Mobile / Safari:** 90-degree movement/facing buttons, touch authoritative, one contact → at most one action until release, map taps for targeting/context, visible feat buttons for timed choices.

Touch changes require inspection of `MainMobileWeb.gd` first.

## 6. Build/deploy truth

Workflow: `.github/workflows/deploy-web.yml` · Godot: 4.7.1 Web.

A build is **compiled and live** only when all are true for the exact final `main` SHA:

1. build job succeeds;
2. **Export Web build and reject script errors** succeeds;
3. guard accepts no `SCRIPT ERROR`, `Parse Error`, or `Failed to load script`;
4. Pages artifact upload succeeds;
5. deploy job succeeds.

Godot has previously packaged parse errors despite a successful-looking export. Never trust exporter exit code alone. A green run for an older SHA is not proof.

Keep SHA-specific exported asset names, `.nojekyll`, `vram_texture_compression/for_mobile=false`, official editor/templates, and the script-error guard.

## 7. Documentation contract

- `README.md` — humans: concise game/current alpha/controls/links.
- `ROADMAP.md` — humans + AIs: future product vision/order.
- `CHANGELOG.md` — humans + AIs: meaningful chronological history.
- `README_SOPS.md` — AIs: workflow/tooling/coding/deploy rules.
- `PROJECT_CONTEXT.md` — AIs: compact current implementation truth.

Maintenance:
- gameplay/system change → Changelog;
- current architecture/mechanics/status → Context;
- future scope/order → Roadmap;
- workflow/tooling lesson → SOP;
- human-facing current identity/controls → README.

Do not duplicate full sections across docs.

## 8. Gameplay invariants

Check Context before changing these intentionally established rules:

- no player levels;
- same baseline human; gear creates build;
- easy monster ≠ level-one monster;
- variable-tick combat;
- no noise-spawn director;
- physical LOS/sound/facing/fog;
- armor-anchored Stealth/Ranged/Guard/Ravager identities;
- active feats primarily from Weapon/Offhand;
- Epic/magic disabled until intentionally enabled;
- global `!! SPOTTED !!` is intentional.

## 9. Final self-check

Before saying done:

- SOP + Context reread once before the first code edit for this prompt?
- current source refetched as needed after intermediate commits?
- Context updated if current game truth changed?
- sane write path chosen without thrashing?
- no temporary workflow/staging/encoded artifact left?
- docs maintained by role?
- correct live entrypoint?
- exact final SHA passed guarded export?
- exact final SHA deployed to Pages?

For meaningful deployed Arena gameplay updates finish with:
- **Play:** `https://dmcexcess-lab.github.io/arena-combat-lab/?v=<fresh-token>`
- **Changelog:** `https://github.com/dmcexcess-lab/arena-combat-lab/blob/main/CHANGELOG.md`
