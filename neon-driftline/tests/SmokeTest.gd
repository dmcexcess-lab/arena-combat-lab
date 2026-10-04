extends SceneTree

func _fail(message: String) -> void:
    print("SMOKE FAIL: " + message)
    quit(1)

func _initialize() -> void:
    var packed := load("res://main.tscn")
    if packed == null:
        _fail("main scene did not load")
        return

    var scene = packed.instantiate()
    if scene == null:
        _fail("main scene did not instantiate")
        return

    root.add_child(scene)
    await process_frame

    for method_name in [
        "_start_game", "_dash", "_fire_weapon", "_weapon_interval", "_weapon_damage",
        "_weapon_label", "_obstacle_max_hp", "_move_shots", "_consume_shot_hit",
        "_apply_laser_damage", "_spawn_repair", "_register_near_miss",
        "_begin_lane_event", "_end_lane_event", "_station_at_player",
        "_station_barrier_rects", "_check_station_collision", "_lane_score_multiplier",
        "_dash_score_multiplier", "_level_difficulty", "_spawn_interval",
        "_shop_weapon_cost", "_open_shop", "_buy_repair", "_buy_weapon",
        "_start_next_level", "_handle_shop_tap"
    ]:
        if not scene.has_method(method_name):
            _fail("missing gameplay method " + method_name)
            return

    scene._start_game()
    await process_frame
    if not scene.playing or scene.shop_open or scene.level != 1 or scene.hp != 3:
        _fail("run did not initialize as level 1 gameplay")
        return
    if scene.current_weapon != "single":
        _fail("new run should start with single auto")
        return
    if scene.LEVEL_TIME != 30.0:
        _fail("levels should last 30 seconds")
        return

    # Level 1 starts deliberately light and later levels scale upward.
    scene.elapsed = 0.0
    scene.level = 1
    var level_one_start: float = scene._level_difficulty()
    scene.elapsed = scene.LEVEL_TIME
    var level_one_end: float = scene._level_difficulty()
    scene.elapsed = 0.0
    scene.level = 3
    var level_three_start: float = scene._level_difficulty()
    if level_one_start > 0.01 or level_one_end <= level_one_start or level_three_start <= level_one_start:
        _fail("level difficulty does not ramp correctly")
        return
    if scene._spawn_interval(1.10, 0.43, level_one_start) <= scene._spawn_interval(1.10, 0.43, level_three_start):
        _fail("later levels should have denser hazard cadence")
        return

    # Restore clean level-1 state for combat tests.
    scene._start_game()

    # Obstacle durability: circle < square < yellow diamond.
    if not (scene._obstacle_max_hp(0) < scene._obstacle_max_hp(1) and scene._obstacle_max_hp(1) < scene._obstacle_max_hp(2)):
        _fail("obstacle health ordering is incorrect")
        return
    if scene._obstacle_max_hp(2) != 12.0:
        _fail("yellow diamond should be the tankiest obstacle")
        return

    # Single auto.
    scene.shots.clear()
    scene.current_weapon = "single"
    scene._fire_weapon()
    if scene.shots.size() != 1 or float(scene.shots[0].damage) != scene.SINGLE_DAMAGE:
        _fail("single auto weapon profile is wrong")
        return

    # Dual auto.
    scene.shots.clear()
    scene.current_weapon = "dual"
    scene._fire_weapon()
    if scene.shots.size() != 2:
        _fail("dual auto did not fire two shots")
        return
    for shot in scene.shots:
        if float(shot.damage) != scene.DUAL_DAMAGE:
            _fail("dual auto damage is wrong")
            return

    # Cone cannon.
    scene.shots.clear()
    scene.current_weapon = "cone"
    scene._fire_weapon()
    if scene.shots.size() != 3 or scene._weapon_interval() <= scene.DUAL_INTERVAL:
        _fail("cone weapon cadence/spread is wrong")
        return
    if not (float(scene.shots[0].vx) < 0.0 and float(scene.shots[1].vx) == 0.0 and float(scene.shots[2].vx) > 0.0):
        _fail("cone shots do not form a spread")
        return

    # Heat seeker.
    scene.shots.clear()
    scene.current_weapon = "seeker"
    scene._fire_weapon()
    if scene.shots.size() != 1 or not scene.shots[0].homing or float(scene.shots[0].damage) != scene.SEEKER_DAMAGE:
        _fail("heat seeker profile is wrong")
        return
    if scene._weapon_interval() <= scene.CONE_INTERVAL:
        _fail("heat seeker should be the slowest projectile weapon")
        return

    # Persistent obstacle HP.
    scene.shots.clear()
    scene.current_weapon = "single"
    scene.objects.clear()
    var circle_hp: float = scene._obstacle_max_hp(0)
    scene.objects.append({
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
    })
    scene._spawn_shot(float(scene.objects[0].x), float(scene.objects[0].y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if scene.objects.is_empty() or absf(float(scene.objects[0].hp) - 1.0) > 0.01:
        _fail("single shot did not leave correct persistent circle HP")
        return
    scene._spawn_shot(float(scene.objects[0].x), float(scene.objects[0].y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if not scene.objects.is_empty():
        _fail("depleted obstacle was not destroyed")
        return

    # Thin weak laser.
    scene.objects.clear()
    scene.current_weapon = "laser"
    scene.player_x = 195.0
    scene.objects.append({
        "id": 999002,
        "type": "hazard",
        "kind": 0,
        "hp": circle_hp,
        "max_hp": circle_hp,
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
    if scene.objects.is_empty() or float(scene.objects[0].hp) >= circle_hp:
        _fail("laser did not apply weak continuous damage")
        return
    scene._apply_laser_damage(0.6)
    if not scene.objects.is_empty():
        _fail("laser did not eventually destroy depleted target")
        return

    # Rare field repairs still restore exactly one hit when they appear.
    if scene.REPAIR_INTERVAL_MIN < 20.0 or scene.FIELD_REPAIR_CHANCE >= 0.5:
        _fail("field repairs are not rare enough")
        return
    scene.objects.clear()
    scene.hp = 1
    scene._spawn_repair()
    if scene.objects.size() != 1 or scene.objects[0].type != "repair":
        _fail("repair core did not spawn while damaged")
        return
    scene.objects[0].x = scene.player_x
    scene.objects[0].y = scene.player_y
    scene.objects[0].speed = 0.0
    scene.objects[0].drift = 0.0
    scene._move_objects(0.0)
    if scene.hp != 2:
        _fail("field repair did not restore exactly one hit")
        return

    # Level clear opens a frozen shop and awards a clear bonus.
    scene.score = 3000
    scene.hp = 1
    scene.current_weapon = "single"
    scene.objects.append({
        "id": 999003,
        "type": "energy",
        "hard": false,
        "x": 100.0,
        "y": 100.0,
        "r": 12.0,
        "speed": 0.0,
        "drift": 0.0,
        "lane_min": scene.LEFT,
        "lane_max": scene.RIGHT
    })
    var score_before_shop: int = scene.score
    scene._open_shop()
    if scene.playing or not scene.shop_open or scene.level != 1:
        _fail("level clear did not enter shop state")
        return
    if scene.score != score_before_shop + scene.last_level_bonus or scene.last_level_bonus <= 0:
        _fail("level clear bonus was not awarded")
        return
    if not scene.objects.is_empty() or not scene.shots.is_empty():
        _fail("shop did not freeze and clear active gameplay objects")
        return

    # Shop repair spends score and restores one hit.
    var before_repair: int = scene.score
    if not scene._buy_repair() or scene.hp != 2 or scene.score != before_repair - scene.SHOP_REPAIR_COST:
        _fail("shop repair purchase failed")
        return

    # Shop weapon purchase swaps weapon and spends score.
    var before_weapon: int = scene.score
    if not scene._buy_weapon("dual"):
        _fail("shop weapon purchase failed")
        return
    if scene.current_weapon != "dual" or scene.score != before_weapon - scene.SHOP_DUAL_COST:
        _fail("shop weapon cost/swap is incorrect")
        return
    if scene._buy_weapon("dual"):
        _fail("shop should not charge for currently equipped weapon")
        return

    # Insufficient score blocks a purchase.
    scene.score = 0
    if scene._buy_weapon("seeker"):
        _fail("shop allowed unaffordable weapon")
        return

    # Next level preserves run resources/equipment but increases difficulty.
    scene.score = 777
    var hp_before_next: int = scene.hp
    var weapon_before_next: String = scene.current_weapon
    var difficulty_before_next: float = scene._level_difficulty()
    scene._start_next_level()
    if not scene.playing or scene.shop_open or scene.level != 2 or scene.elapsed != 0.0:
        _fail("next level did not start correctly")
        return
    if scene.hp != hp_before_next or scene.current_weapon != weapon_before_next or scene.score != 777:
        _fail("next level did not preserve run state")
        return
    if scene._level_difficulty() <= difficulty_before_next:
        _fail("next level did not become harder")
        return

    # Timer reaching level duration must open the next shop rather than end the run.
    scene.elapsed = scene.LEVEL_TIME - 0.01
    scene.objects.clear()
    scene.shots.clear()
    scene.neutral_spawn_clock = 999.0
    scene.easy_spawn_clock = 999.0
    scene.hard_spawn_clock = 999.0
    scene.pickup_clock = 999.0
    scene.fire_clock = 999.0
    scene.repair_clock = 999.0
    scene._process(0.02)
    if not scene.shop_open or scene.game_over or scene.level != 2:
        _fail("level timer did not transition into shop")
        return

    # Dash remains long and forward.
    scene._start_next_level()
    scene.player_x = 195.0
    scene.target_x = 195.0
    scene.player_y = scene.PLAYER_Y
    scene.dash_cooldown = 0.0
    scene._dash()
    var dash_start_y: float = scene.player_y
    scene._process(0.20)
    if scene.player_y >= dash_start_y - 145.0:
        _fail("forward dash distance regressed")
        return

    # Station structure remains instant-lethal through invulnerability.
    scene._begin_lane_event()
    scene.station_top = scene.player_y - 120.0
    scene.player_x = scene.LANE_SPLIT
    scene.invuln = 999.0
    scene._check_station_collision()
    if scene.playing or scene.hp != 0 or scene.result_reason != "STATION COLLISION":
        _fail("station barrier contact was not an instant kill")
        return

    print("NEON DRIFTLINE SMOKE OK")
    quit(0)
