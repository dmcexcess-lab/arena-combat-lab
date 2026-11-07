# Route Lab rules scope — 2026 NFL season

Authority: [2026 Official Playing Rules of the NFL](https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf). This is an educational 11-on-11 scrimmage play simulator, not a complete NFL game or officiating engine. Reduced-player campaign drills are explicitly training scenarios.

| Rulebook area | Current Route Lab behavior | Limit |
| --- | --- | --- |
| Rule 7 §5, position at snap; Rule 5 §3, jersey reporting | Checks 11 players in full play, at least seven on the line, eligible ends, ineligible interior players, a backfield snap receiver, one center, player overlap, neutral zone position, and required reporting for an ineligible-numbered player in the backfield or at the end of the line. | Does not judge every shift, motion, substitution, or alignment detail. Reporting is a play-editor flag, not an official announcement. |
| Rule 8 §1, forward pass and completed/intercepted catch | Models a thrown ball, incomplete pass, pass breakup, completion, and interception. A completed receiver can turn upfield and advance; an interceptor gets a live return until a tackle, boundary, touchdown, or play time limit. | The 2D catch check does not model hand control, both feet/body inbounds, an act common to the game, contact with the ground, simultaneous possession, or all end-zone/touchback cases. |
| Rule 7 §2, dead ball; Rule 7 §3, new series | A tackle, out-of-bounds runner, incomplete pass, touchdown, and selected sacks end the play. Campaign downs use signed yardage, including losses, and reset after a conversion, turnover, or fourth-down failure. | Forward progress, exact ball spot, fumbles, down-by-contact detail, and full possession/series administration are not modeled. |
| Rule 11 §2 and §5, touchdown and safety | Crossing the offensive goal line scores a touchdown; a sack or tackle behind the offense's own goal line can be a safety. A defensive interception return can score. | Other safety causes, try plays, field goals, scoring administration, and kickoff after a score are absent. |

## Unimplemented rule systems

The simulator does not yet support NFL game clock and periods, timeouts, overtime, kickoffs and 2026 kickoff changes, punts, field goals, fair catches, fumbles, detailed penalty detection/enforcement, challenges/replay, equipment and roster administration, or complete blocking and player-safety restrictions. Its 1–99 ratings, contacts, catch probabilities, running paths, and coaching decisions are deterministic teaching models, not calibrated NFL player tracking or officiating judgments. It therefore must not be described as following *all* NFL rules or as proving that players execute every assignment correctly.

The next rules implementation should use explicit ball/possession and dead-ball state, preserve the forward-progress spot, and separate rule outcomes from the current movement model. Each new rule needs an official rulebook reference and a deterministic scenario check.
