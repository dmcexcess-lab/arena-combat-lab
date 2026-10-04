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

    for method_name in ["_start_game", "_dash", "_fire_weapon", "_weapon_interval", "_weapon_damage", "_weapon_label", "_obstacle_max_hp", "_move_shots", "_consume_shot_hit", "_apply_laser_damage", "_spawn_weapon_pickup", "_spawn_repair", "_register_near_miss", "_begin_lane_event", "_end_lane_event", "_station_at_player", "_station_barrier_rects", "_check_station_collision", "_begin_finale", "_spawn_extraction_gate", "_lane_score_multiplier", "_dash_score_multiplier"]:
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

    # Obstacle durability must scale by shape: circle < square < yellow diamond.
    if not (scene._obstacle_max_hp(0) < scene._obstacle_max_hp(1) and scene._obstacle_max_hp(1) < scene._obstacle_max_hp(2)):
        print("SMOKE FAIL: obstacle health ordering is incorrect")
        quit(1)
        return
    if scene._obstacle_max_hp(2) != 12.0:
        print("SMOKE FAIL: yellow diamond should be the tankiest obstacle")
        quit(1)
        return

    # Single auto: one accurate D2 projectile.
    scene.shots.clear()
    scene.current_weapon = "single"
    scene._fire_weapon()
    if scene.shots.size() != 1 or float(scene.shots[0].damage) != scene.SINGLE_DAMAGE:
        print("SMOKE FAIL: single auto weapon profile is wrong")
        quit(1)
        return

    # Dual auto: two D1 projectiles.
    scene.shots.clear()
    scene.current_weapon = "dual"
    scene._fire_weapon()
    if scene.shots.size() != 2:
        print("SMOKE FAIL: dual auto did not fire two shots")
        quit(1)
        return
    for shot in scene.shots:
        if float(shot.damage) != scene.DUAL_DAMAGE:
            print("SMOKE FAIL: dual auto damage is wrong")
            quit(1)
            return

    # Cone cannon: slow three-way D3 spread.
    scene.shots.clear()
    scene.current_weapon = "cone"
    scene._fire_weapon()
    if scene.shots.size() != 3 or scene._weapon_interval() <= scene.DUAL_INTERVAL:
        print("SMOKE FAIL: cone weapon cadence/spread is wrong")
        quit(1)
        return
    if not (float(scene.shots[0].vx) < 0.0 and float(scene.shots[1].vx) == 0.0 and float(scene.shots[2].vx) > 0.0):
        print("SMOKE FAIL: cone shots do not form a spread")
        quit(1)
        return

    # Heat seeker: one slow, powerful D7 homing projectile.
    scene.shots.clear()
    scene.current_weapon = "seeker"
    scene._fire_weapon()
    if scene.shots.size() != 1 or not scene.shots[0].homing or float(scene.shots[0].damage) != scene.SEEKER_DAMAGE:
        print("SMOKE FAIL: heat seeker profile is wrong")
        quit(1)
        return
    if scene._weapon_interval() <= scene.CONE_INTERVAL:
        print("SMOKE FAIL: heat seeker should be the slowest projectile weapon")
        quit(1)
        return

    # Projectiles must respect obstacle HP rather than one-shot every shape.
    scene.shots.clear()
    scene.current_weapon = "single"
    scene.objects.clear()
    var circle_hp: float = scene._obstacle_max_hp(0)
    var target := {
        "id": 999001,
        "type": "hazard",
        "kind": 0,
        "hp": circle_hp,
        "max_hp": circle_hp,
        "hard": false,
        "x": scene.player_x,
        "y": scene.player_y - 120.0,
        "r": 18.0,
        "speed": 0.0,
        "drift": 0.0,
        "lane_min": scene.LEFT,
        "lane_max": scene.RIGHT
    }
    scene.objects.append(target)
    scene._spawn_shot(float(target.x), float(target.y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if scene.objects.is_empty():
        print("SMOKE FAIL: D2 single shot incorrectly one-shot a 3 HP circle")
        quit(1)
        return
    if absf(float(scene.objects[0].hp) - 1.0) > 0.01:
        print("SMOKE FAIL: obstacle damage was not applied correctly")
        quit(1)
        return
    scene._spawn_shot(float(scene.objects[0].x), float(scene.objects[0].y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if not scene.objects.is_empty():
        print("SMOKE FAIL: depleted obstacle was not destroyed")
        quit(1)
        return

    # Thin laser is continuous, weak DPS and removes an obstacle only after enough exposure.
    scene.objects.clear()
    scene.current_weapon = "laser"
    scene.player_x = 195.0
    var laser_hp: float = scene._obstacle_max_hp(0)
    scene.objects.append({
        "id": 999002,
        "type": "hazard",
        "kind": 0,
        "hp": laser_hp,
        "max_hp": laser_hp,
        "hard": false,
        "x": scene.player_x,
        "y": scene.player_y - 180.0,
        "r": 18.0,
        "speed": 0.0,
        "drift": 0.0,
        "lane_min": scene.LEFT,
        "lane_max": scene.RIGHT
    })
    scene._apply_laser_damage(0.5)
    if scene.objects.is_empty() or float(scene.objects[0].hp) >= laser_hp:
        print("SMOKE FAIL: laser did not apply continuous weak damage")
        quit(1)
        return
    scene._apply_laser_damage(0.6)
    if not scene.objects.is_empty():
        print("SMOKE FAIL: laser did not eventually destroy depleted target")
        quit(1)
        return

    # Weapon pickups must offer a different weapon and swap on collection.
    scene.objects.clear()
    scene.current_weapon = "single"
    scene._spawn_weapon_pickup()
    if scene.objects.size() != 1 or scene.objects[0].type != "weapon" or String(scene.objects[0].weapon) == "single":
        print("SMOKE FAIL: weapon pickup did not offer a different weapon")
        quit(1)
        return
    var offered_weapon := String(scene.objects[0].weapon)
    scene.objects[0].x = scene.player_x
    scene.objects[0].y = scene.player_y
    scene.objects[0].speed = 0.0
    scene.objects[0].drift = 0.0
    scene._move_objects(0.0)
    if scene.current_weapon != offered_weapon:
        print("SMOKE FAIL: weapon pickup did not swap current weapon")
        quit(1)
        return

    # Repair core restores exactly one lost hit and never exceeds the cap.
    scene.objects.clear()
    scene.hp = 1
    scene._spawn_repair()
    if scene.objects.size() != 1 or scene.objects[0].type != "repair":
        print("SMOKE FAIL: repair core did not spawn while damaged")
        quit(1)
        return
    scene.objects[0].x = scene.player_x
    scene.objects[0].y = scene.player_y
    scene.objects[0].speed = 0.0
    scene.objects[0].drift = 0.0
    scene._move_objects(0.0)
    if scene.hp != 2:
        print("SMOKE FAIL: repair core did not restore exactly one hit")
        quit(1)
        return
    scene.objects.clear()
    scene.hp = 3
    scene._spawn_repair()
    if not scene.objects.is_empty():
        print("SMOKE FAIL: repair core should not spawn at full health")
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
    scene._process(0.20)
    if scene.dash_cooldown <= 0.0 or scene.dash_timer <= 0.0:
        print("SMOKE FAIL: dash did not stay active long enough for extended travel")
        quit(1)
        return
    if dash_start_y - scene.player_y < 145.0:
        print("SMOKE FAIL: dash did not travel far enough forward")
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

    var far_y: float = scene.player_y
    scene._process(0.12)
    if scene.dash_timer > 0.0:
        print("SMOKE FAIL: dash should be transitioning into return")
        quit(1)
        return
    scene._process(0.08)
    if scene.player_y >= scene.PLAYER_Y - 55.0:
        print("SMOKE FAIL: return to flight line is too fast")
        quit(1)
        return
    if scene.player_y <= far_y:
        print("SMOKE FAIL: ship did not begin returning after dash")
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
