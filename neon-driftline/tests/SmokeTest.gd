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

    for method_name in ["_start_game", "_dash", "_register_near_miss", "_begin_lane_event", "_end_lane_event", "_station_at_player", "_station_barrier_rects", "_check_station_collision", "_begin_finale", "_spawn_extraction_gate", "_lane_score_multiplier", "_dash_score_multiplier"]:
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

    if scene.lane_event_active or scene._lane_score_multiplier() != 1.0:
        print("SMOKE FAIL: station lanes should be absent during open-field play")
        quit(1)
        return

    scene._begin_lane_event()
    if not scene.lane_event_active or scene.station_top >= 0.0:
        print("SMOKE FAIL: station lane segment did not approach from above")
        quit(1)
        return

    scene.hard_lane_right = true
    scene.player_x = 290.0
    if scene._station_at_player() or scene._lane_score_multiplier() != 1.0:
        print("SMOKE FAIL: hard-lane reward should not begin before the station reaches the player")
        quit(1)
        return

    scene.station_top = scene.player_y - 120.0
    if not scene._station_at_player():
        print("SMOKE FAIL: station should overlap the player at test position")
        quit(1)
        return

    scene.player_x = 100.0
    scene._check_station_collision()
    if not scene.playing or scene.station_locked_side != "LEFT":
        print("SMOKE FAIL: safe left corridor did not lock correctly")
        quit(1)
        return

    scene.player_x = 290.0
    var right_hard: float = scene._lane_score_multiplier()
    scene.player_x = 100.0
    var left_easy: float = scene._lane_score_multiplier()
    if right_hard <= left_easy:
        print("SMOKE FAIL: hard corridor does not reward risk while inside station")
        quit(1)
        return

    scene._end_lane_event()
    if scene.lane_event_active or scene._station_at_player():
        print("SMOKE FAIL: station segment did not clear back to open field")
        quit(1)
        return

    # Dash must move forward (up-screen), not act as a lateral burst.
    scene.player_x = 195.0
    scene.target_x = 195.0
    scene.player_y = scene.PLAYER_Y
    scene.dash_cooldown = 0.0
    scene._dash()
    var dash_start_y: float = scene.player_y
    scene._process(0.05)
    if scene.dash_cooldown <= 0.0 or scene.dash_timer <= 0.0:
        print("SMOKE FAIL: dash did not activate")
        quit(1)
        return
    if scene.player_y >= dash_start_y:
        print("SMOKE FAIL: dash did not move the ship forward")
        quit(1)
        return
    if absf(scene.player_x - 195.0) > 0.5:
        print("SMOKE FAIL: centered forward dash introduced lateral movement")
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

    # Station structure remains lethal during ordinary dash invulnerability.
    scene._begin_lane_event()
    scene.station_top = scene.player_y - 120.0
    scene.player_x = scene.LANE_SPLIT
    scene.invuln = 999.0
    scene._check_station_collision()
    if scene.playing or scene.hp != 0 or scene.result_reason != "STATION COLLISION":
        print("SMOKE FAIL: station barrier contact was not an instant kill")
        quit(1)
        return

    print("NEON DRIFTLINE SMOKE OK")
    quit(0)
