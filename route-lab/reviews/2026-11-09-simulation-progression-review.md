# Route Lab simulation and game progression review

Reviewed 2026-11-09. Latest repository commit observed: `ff3ba419591361f2281717441de6f38a3c276079`.

Scope: `engine.js`, `game.js`, and the exhibition flow in `app.js`. All six scripts embedded in `index.html` match their maintained source files. This was a review with targeted executable reproductions, not an implementation or a complete NFL compliance audit. No gameplay source was changed or published.

Seven confirmed findings follow. P1 means a high-priority correctness repair; P2 means a narrower but actionable defect.

## 1. P1 — Pass breakups can become first downs

Location: `game.js:250–255`, near-line measurement and marked result construction.

The measurement predicate excludes verdicts containing `Incomplete`, but not `Pass broken up`. It then treats the airborne ball's final location (`deadBallY`) as an advancement spot and replaces the legitimate zero-yard result with a rounded positive gain. The downstream down/possession logic accepts that gain.

Actual simulation reproduction: default Shotgun Mesh against 4–3 Cover 2, seed 24. Engine result: `Pass broken up by CB`, `yards: 0`, `deadBallY: 10.74`. Settling that result on third-and-10 at midfield with the normal play objects produces first-and-10 at field yard 60.5. The offense receives 10.5 yards for an incomplete pass.

Repair: use an explicit outcome type / successful live-ball advancement eligibility for measurement. Pass incompletions and breakups must retain the previous spot regardless of the flight endpoint.

## 2. P1 — Overtime touchdowns skip required conversion attempts

Location: `game.js:283`; analogous overtime shortcuts also appear in loose-ball and kick-return touchdowns.

The scoring path unconditionally selects `kickoff` whenever `quarter === 5`, bypassing `try`. It therefore omits the first possession's extra point or two-point choice even while the opponent is still entitled to a possession. Matching touchdowns are compared without their conversions, changing the conditions for winning or tying.

Reproduction: first overtime possession, home ball at the opponent five, tied score, 400 seconds remaining. A five-yard touchdown returns home 6–away 0 and `phase: kickoff`, rather than offering a try.

Repair: decide whether the game is already over, and otherwise stage a try after a touchdown. Finalize overtime opportunities only after all applicable scoring has resolved. See NFL Rules 11 and 16.

## 3. P1 — Formation changes can injure or fatigue the wrong roster player

Locations: `game.js:131–132` and `game.js:270`; compare `dressPlay` at `game.js:36`.

Dressing a formation correctly resolves a changed role by its label when the formation ID belongs to another position. Writing fatigue and injuries back instead takes the first row matching either ID or label. In Nickel Cover 3, the NB uses formation ID `dS`, which is the base linebacker slot. The NB's roster index is consequently applied to that linebacker row.

Reproduction: exhibition seed 71, away Nickel Cover 3. On-field NB Jalen Hayes has ID `dS`. A participation record with fatigue 0.7 writes 0.7 to linebacker Noah Price and leaves Hayes at zero. A targeted tackle-exposure reproduction using play seed 384 reports Hayes leaving for evaluation, but marks Price unavailable through play 2; Hayes remains available.

Repair: attach a stable roster-person/slot identity when dressing each play and use it consistently for fatigue, injury, substitutions and reports. Do not resolve persistent identity again with an ID-or-label search.

## 4. P1 — Turnover on downs restarts the clock before the new offense snaps

Location: `game.js:284`.

`newSeries` correctly stops the clock after the change of possession. The remainder of the ordinary-play branch overwrites that setting from the old play's tackle/out-of-bounds verdict. An inbounds failed fourth down therefore leaves the new offense with a running clock.

Reproduction: fourth-and-10 at midfield, Q4 1:40, four-second play gaining two yards. Away receives the ball at 1:36, but `clockRunning` is true. Continue/reset burns another 23 seconds to 1:13 before any snap by the new offense. With less time remaining, it can end regulation before that offense gets a play.

Repair: preserve the new-series stopped clock when possession changes. Apply the ordinary inbounds clock rule only when the same offense retains possession. See NFL Rule 4-3-2 and 4-4(i).

## 5. P2 — Legal backward passes inherit fumble-only advancement restrictions

Location: `game.js:197–199`.

The teammate-advance restriction checks down, time and recovery identity without requiring `loose.kind === 'fumble'`. The engine also represents a designed backward pass using this loose-ball record. Thus a teammate legally receiving/recovering a backward pass on fourth down is stopped at the earlier origin/recovery spot in the game ruling, even though the replay advances the ball.

Reproduction: fourth-and-5 at midfield; RB pitches from local yard 0, QB receives at -2 and finishes at +10. The ruling is a turnover on downs at home 48 instead of an offensive first down at away 40.

Repair: distinguish backward-pass status from fumble status before applying teammate advancement limits. The NFL rulebook's approved ruling A.R. 8.102 explicitly distinguishes them on fourth down.

## 6. P2 — Defenders behind the line are excluded from screen catch contests

Locations: `engine.js:791` and `engine.js:139`.

Both nearest-defender lookup and pickup coverage discard defenders with `y < -0.5`. This filtering ignores physical coverage at a valid screen catch point behind the line, even when a defender has followed the back there. Those defenders cannot contest/intercept the pass in this branch.

Reproduction: reduced-player HB Screen, QB/RB versus a man CB covering the RB; RB route [(4,-3),(5,-3)], CB starts at (4,1) with speed/coverage/awareness/hands 99, seed 3. At the catch the CB is at (4.265,-3.805), only 1.38 yards from the receiver. The catch report nevertheless says `defender: none`, `defenderDistance: Infinity`, and `disruptionChance: 0`.

Repair: evaluate eligible defenders by their physical distance to the catch point, including behind the line. Keep any rule-specific eligibility separate from a field-position cutoff.

## 7. P2 — Legal behind-line outlets can leave the QB stuck until the watchdog

Location: `engine.js:724`, feeding the progression and fallback selection below it; rejection path in `app.js:405`.

The QB discards every projected target behind -0.2 yards unless the play carries the special screen configuration. Ordinary legal checkdowns behind the line cannot be considered. With no eligible candidate, both progression and late fallback have nothing to select; there is no terminal QB decision for this situation.

Reproduction: a full, valid Shotgun Mesh formation whose five route players each run to their own x coordinate at y=-3 then y=-6, against a valid deep defense. Validation returns no errors or warnings. Seed 71 runs to 20 seconds with the QB holding at (0,-6.94), no decisions or reads, and a watchdog rejection. The app keeps the game state and seed unchanged, so repeated Run clicks reproduce the rejection until the user changes something.

Repair: allow legal behind-line receiving targets for ordinary passes and supply an actual QB escape/throwaway decision when no viable target exists. Retain watchdog rejection as an engine diagnostic rather than awarding a fabricated outcome.

## Evidence and recommended sequence

Executed two actual seeded simulation counterexamples (pass-breakup yardage and covered screen), a full-formation QB/watchdog example, and targeted game-state cases for overtime scoring, turnover clock, backward-pass advancement and roster health attribution. No full regression-suite result is claimed for this review.

Repair order: invalid pass yardage; turnover clock and overtime scoring; stable roster identity; backward-pass enforcement; behind-line QB and defensive catch logic. Add focused regressions for these counterexamples before returning to the planned safety-help feature.

NFL rule checks: [2026 Official Playing Rules](https://media.nfl.com/content/dam/communications/Official%20Playing%20Rules/2026%20Official%20Playing%20Rules.pdf), Rules 4, 8, 11 and 16; approved ruling A.R. 8.102. Broader rules coverage, special-teams edge cases, safety-help behavior, campaign progression and NFL frequency calibration remain outside the conclusions of this focused review.


## Repair slices

1. **Incomplete-pass spotting — implemented in this update:** exclude incomplete, broken-up, and thrown-away passes from chain measurement; test that the ball stays at the prior spot and no first down is awarded.
2. **Possession-change clock — implemented in this update:** preserve the stopped clock after an interception, turnover on downs, or other new series until the receiving offense's next snap; verify that huddle time does not run off and the next live play does.
3. **Overtime touchdown progression — implemented in this update:** stage tries when the score can still change the winner; end on a decisive touchdown when both initial opportunities are complete or the second team is already ahead. Defensive return touchdowns end immediately after both teams have possessed. Regression coverage includes both initial possessions, loose-ball scores, kickoff-return decision cases, ties, and sudden death.
4. **Stable roster identity — implemented in this update:** carry the selected depth-chart slot and person index with each dressed player; use that stable identity when applying fatigue and medical availability, even if a role label changes or names collide.
5. **Backward-pass advancement — implemented in this update:** limit fourth-down, two-minute, and try teammate-recovery restrictions to fumbles; allow backward-pass teammates to advance, including across the line to gain. Do not treat overtime as having a two-minute warning.
6. **Behind-line pass contests:** include defenders at the actual catch point on screens and other legal passes, independent of their downfield coordinate.
7. **QB outlet and dead-ball fallback:** allow legal ordinary checkdowns behind the line and resolve the play with a QB run or throwaway if no target is eligible.

The repairs remain separate so each behavioral change has its own regression and reviewable result. Slices 1–5 are implemented; slices 6–7 remain.
