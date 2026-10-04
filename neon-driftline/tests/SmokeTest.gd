extends SceneTree

func _initialize() -> void:
    var packed := load("res://main.tscn")
    if packed == null:
        print("SMOKE FAIL: main scene did not load")
        quit(1)
        return

    var scene = packed.instantiate()
    if scene == null:
        print("SMOKE FAIL: main scene did not instantiate")
        quit(1)
        return

    root.add_child(scene)
    await process_frame

    for method_name in ["_start_game", "_dash", "_register_near_miss", "_begin_lane_event", "_end_lane_event", "_begin_finale", "_spawn_extraction_gate", "_lane_score_multiplier", "_dash_score_multiplier", "_is_hard_position", "_lane_bounds"]:
        if not scene.has_method(method_name):
            print("SMOKE FAIL: missing gameplay method ", method_name)
            quit(1)
            return

    scene._start_game()
    await process_frame
    if scene.playing != true or scene.hp != 3:
        print("SMOKE FAIL: run did not initialize")
        quit(1)
        return

    scene.player_x = 290.0
    if scene.lane_event_active or scene._lane_score_multiplier() != 1.0:
        print("SMOKE FAIL: lanes should be absent during normal open-field play")
        quit(1)
        return

    scene._begin_lane_event()
    if not scene.lane_event_active or scene.lane_event_timer <= 0.0:
        print("SMOKE FAIL: periodic lane event did not activate")
        quit(1)
        return

    scene.hard_lane_right = true
    scene.player_x = 100.0
    var left_easy: float = scene._lane_score_multiplier()
    scene.player_x = 290.0
    var right_hard: float = scene._lane_score_multiplier()
    if right_hard <= left_easy:
        print("SMOKE FAIL: right-hard lane event does not reward risk")
        quit(1)
        return

    scene.hard_lane_right = false
    scene.player_x = 100.0
    var left_hard: float = scene._lane_score_multiplier()
    scene.player_x = 290.0
    var right_easy: float = scene._lane_score_multiplier()
    if left_hard <= right_easy:
        print("SMOKE FAIL: left-hard lane event does not reward risk")
        quit(1)
        return

    scene._end_lane_event()
    scene.player_x = 100.0
    if scene.lane_event_active or scene._lane_score_multiplier() != 1.0:
        print("SMOKE FAIL: lane event did not collapse back to open field")
        quit(1)
        return

    scene.target_x = 340.0
    scene.dash_cooldown = 0.0
    scene._dash()
    if scene.dash_cooldown <= 0.0 or scene.dash_timer <= 0.0:
        print("SMOKE FAIL: dash did not activate")
        quit(1)
        return
    if scene._dash_score_multiplier() <= 1.0 or scene.dash_score_timer <= 0.0:
        print("SMOKE FAIL: dash score multiplier did not activate")
        quit(1)
        return

    var combo_before: int = scene.combo
    scene._register_near_miss()
    if scene.combo <= combo_before or scene.near_miss_timer <= 0.0 or scene.slowmo_timer <= 0.0:
        print("SMOKE FAIL: near-miss feedback did not activate")
        quit(1)
        return

    scene._begin_finale()
    scene._spawn_extraction_gate()
    if not scene.finale_active or not scene.extraction_spawned or scene.extraction_lane.is_empty():
        print("SMOKE FAIL: extraction finale did not initialize")
        quit(1)
        return
    if scene.extraction_lane != "LEFT" and scene.extraction_lane != "RIGHT":
        print("SMOKE FAIL: extraction gate should use physical side, not lane difficulty")
        quit(1)
        return

    print("NEON DRIFTLINE SMOKE OK")
    quit(0)
