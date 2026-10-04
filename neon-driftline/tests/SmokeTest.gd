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
        "_weapon_label", "_obstacle_max_hp", "_kill_score", "_enemy_kind_cap_for_level",
        "_spawn_circle_bunch", "_move_shots", "_consume_shot_hit",
        "_apply_laser_damage", "_fire_enemy_shot", "_move_enemy_shots", "_spawn_repair", "_register_near_miss",
        "_begin_lane_event", "_end_lane_event", "_station_at_player",
        "_station_barrier_rects", "_check_station_collision", "_lane_score_multiplier",
        "_dash_score_multiplier", "_level_duration", "_split_count_for_level",
        "_station_height_for_level", "_first_split_time", "_level_difficulty", "_spawn_interval",
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
    if scene.current_weapon != "none":
        _fail("new run should start unarmed")
        return
    if scene._level_duration() != 18.0:
        _fail("level 1 should be the shortest at 18 seconds")
        return
    if scene._split_count_for_level() != 1:
        _fail("level 1 should contain exactly one split")
        return
    if scene._station_height_for_level() != scene.STATION_HEIGHT_BASE:
        _fail("level 1 should use the shortest station split")
        return
    scene.elapsed = scene._first_split_time()
    scene._begin_lane_event()
    if scene.lane_events_started != 1 or scene.station_height != scene.STATION_HEIGHT_BASE:
        _fail("level 1 did not start exactly one short split")
        return
    if scene.next_lane_event_at <= scene._level_duration():
        _fail("level 1 scheduled an extra split")
        return
    scene._end_lane_event()
    scene.elapsed = 0.0
    scene.lane_events_started = 0
    scene.next_lane_event_at = scene._first_split_time()

    # Unarmed means genuinely no automatic fire.
    scene.shots.clear()
    scene.fire_clock = 0.0
    scene.neutral_spawn_clock = 999.0
    scene.easy_spawn_clock = 999.0
    scene.hard_spawn_clock = 999.0
    scene.pickup_clock = 999.0
    scene.repair_clock = 999.0
    scene._process(0.05)
    if not scene.shots.is_empty():
        _fail("unarmed ship fired a projectile")
        return

    # Level 1 starts deliberately light and later levels scale upward.
    scene.elapsed = 0.0
    scene.level = 1
    var level_one_start: float = scene._level_difficulty()
    scene.elapsed = scene._level_duration()
    var level_one_end: float = scene._level_difficulty()
    scene.elapsed = 0.0
    scene.level = 2
    var level_two_duration: float = scene._level_duration()
    var level_two_splits: int = scene._split_count_for_level()
    var level_two_height: float = scene._station_height_for_level()
    scene.level = 3
    var level_three_start: float = scene._level_difficulty()
    if level_one_start > 0.01 or level_one_end <= level_one_start or level_three_start <= level_one_start:
        _fail("level difficulty does not ramp correctly")
        return
    if level_two_duration != 21.0 or scene._level_duration() != 24.0:
        _fail("level duration does not increase gradually")
        return
    if level_two_splits != 1 or scene._split_count_for_level() != 2:
        _fail("split count does not increase gradually")
        return
    if level_two_height <= scene.STATION_HEIGHT_BASE or scene._station_height_for_level() <= level_two_height:
        _fail("station split length does not increase by level")
        return
    if scene._spawn_interval(1.10, 0.43, level_one_start) <= scene._spawn_interval(1.10, 0.43, level_three_start):
        _fail("later levels should have denser hazard cadence")
        return

    # Restore clean level-1 state for combat tests.
    scene._start_game()

    # Enemy ladder: L1 circles only, then squares, diamonds, and shooting rhomboids unlock later.
    if scene._enemy_kind_cap_for_level() != 0:
        _fail("level 1 should unlock circles only")
        return
    scene.level = 2
    if scene._enemy_kind_cap_for_level() != 1:
        _fail("moving squares should unlock at level 2")
        return
    scene.level = 4
    if scene._enemy_kind_cap_for_level() != 2:
        _fail("smart diamonds should unlock at level 4")
        return
    scene.level = 6
    if scene._enemy_kind_cap_for_level() != 3:
        _fail("shooting rhomboids should unlock at level 6")
        return

    scene._start_game()
    scene.objects.clear()
    for i in 40:
        scene._spawn_hazard(1.65, false, false)
    for obj in scene.objects:
        if int(obj.kind) != 0:
            _fail("level 1 spawned anything other than a lazy circle")
            return
        if absf(float(obj.drift)) > 0.01:
            _fail("level 1 circle should not move laterally")
            return
    scene.objects.clear()

    # Level 1 hard lane creates a small bunched circle cluster.
    scene._spawn_circle_bunch(true, 3)
    if scene.objects.size() != 3:
        _fail("level 1 hard-lane bunch did not spawn three circles")
        return
    var bunch_min_x := 9999.0
    var bunch_max_x := -9999.0
    for obj in scene.objects:
        if int(obj.kind) != 0 or not bool(obj.hard):
            _fail("hard-lane bunch contained a non-circle or non-hard enemy")
            return
        bunch_min_x = minf(bunch_min_x, float(obj.x))
        bunch_max_x = maxf(bunch_max_x, float(obj.x))
    if bunch_max_x - bunch_min_x > 55.0:
        _fail("level 1 hard-lane circles were not bunched")
        return
    scene.objects.clear()

    # Obstacle durability: circle < square < rhomboid < yellow diamond.
    if not (scene._obstacle_max_hp(0) < scene._obstacle_max_hp(1) and scene._obstacle_max_hp(1) < scene._obstacle_max_hp(3) and scene._obstacle_max_hp(3) < scene._obstacle_max_hp(2)):
        _fail("enemy health ordering is incorrect")
        return
    if scene._obstacle_max_hp(2) != 12.0:
        _fail("yellow diamond should remain the tankiest enemy")
        return
    if scene._kill_score(0) != 1 or scene._kill_score(1) != 2 or scene._kill_score(2) != 5 or scene._kill_score(3) != 4:
        _fail("kill scores should stay in single digits")
        return

    # First purchasable gun is intentionally weak: one D1 projectile.
    scene.shots.clear()
    scene.current_weapon = "single"
    scene._fire_weapon()
    if scene.SINGLE_DAMAGE != 1.0 or scene.shots.size() != 1 or float(scene.shots[0].damage) != 1.0:
        _fail("single auto should be the weak D1 starter purchase")
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
    scene.score = 0
    scene._spawn_shot(float(scene.objects[0].x), float(scene.objects[0].y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if scene.objects.is_empty() or absf(float(scene.objects[0].hp) - 2.0) > 0.01:
        _fail("D1 single shot did not leave correct persistent circle HP")
        return
    if scene.score != 0:
        _fail("nonlethal damage should not award score")
        return
    scene._spawn_shot(float(scene.objects[0].x), float(scene.objects[0].y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if scene.objects.is_empty() or absf(float(scene.objects[0].hp) - 1.0) > 0.01:
        _fail("second D1 shot did not leave correct persistent circle HP")
        return
    scene._spawn_shot(float(scene.objects[0].x), float(scene.objects[0].y), 0.0, 0.0, scene.SINGLE_DAMAGE)
    scene._move_objects(0.0)
    if not scene.objects.is_empty():
        _fail("third D1 shot did not destroy 3 HP circle")
        return
    if scene.score != 1:
        _fail("circle kill should award exactly one point")
        return

    # Score scale: ordinary near misses are tens; dash near misses are hundreds.
    scene.lane_event_active = false
    scene.score = 0
    scene.combo = 1
    scene.dash_score_timer = 0.0
    scene._register_near_miss()
    var ordinary_near_score: int = scene.score
    if ordinary_near_score < 10 or ordinary_near_score >= 100:
        _fail("ordinary near miss should score in the tens")
        return
    scene.score = 0
    scene.combo = 1
    scene.dash_score_timer = 0.5
    scene._register_near_miss()
    var dash_near_score: int = scene.score
    if dash_near_score < 100 or dash_near_score >= 1000:
        _fail("dash near miss should score in the hundreds")
        return

    # Smart yellow diamonds steer toward the player.
    scene.objects.clear()
    scene.level = 4
    scene.player_x = 300.0
    scene.player_y = scene.PLAYER_Y
    scene.objects.append({
        "id": 990001, "type": "hazard", "kind": 2,
        "hp": 12.0, "max_hp": 12.0, "hard": false,
        "x": 100.0, "y": 120.0, "r": 15.0,
        "speed": 0.0, "drift": 0.0, "shoot_clock": 999.0,
        "lane_min": scene.LEFT, "lane_max": scene.RIGHT
    })
    scene._move_objects(0.1)
    if float(scene.objects[0].drift) <= 0.0:
        _fail("smart diamond did not steer toward player")
        return

    # Rhomboids aim and fire at the player on later levels.
    scene.objects.clear()
    scene.enemy_shots.clear()
    scene.level = 6
    scene.player_x = 195.0
    scene.objects.append({
        "id": 990002, "type": "hazard", "kind": 3,
        "hp": 8.0, "max_hp": 8.0, "hard": false,
        "x": 195.0, "y": 120.0, "r": 16.0,
        "speed": 0.0, "drift": 0.0, "shoot_clock": 0.0,
        "lane_min": scene.LEFT, "lane_max": scene.RIGHT
    })
    scene._move_objects(0.1)
    if scene.enemy_shots.size() != 1 or float(scene.enemy_shots[0].vy) <= 0.0:
        _fail("shooting rhomboid did not fire toward the player")
        return
    scene.objects.clear()
    scene.enemy_shots.clear()

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

    # Economy should be on the compact score scale.
    if scene.SHOP_SINGLE_COST != 45 or scene.SHOP_REPAIR_COST != 75 or scene.SHOP_SEEKER_COST != 160:
        _fail("shop prices were not tightened with score scale")
        return

    # Level clear opens a frozen shop and awards a clear bonus.
    scene.score = 3000
    scene.hp = 1
    scene.current_weapon = "none"
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
    if not scene.objects.is_empty() or not scene.shots.is_empty() or not scene.enemy_shots.is_empty():
        _fail("shop did not freeze and clear active gameplay objects")
        return

    # Shop repair spends score and restores one hit.
    var before_repair: int = scene.score
    if not scene._buy_repair() or scene.hp != 2 or scene.score != before_repair - scene.SHOP_REPAIR_COST:
        _fail("shop repair purchase failed")
        return

    # First shop can turn the unarmed ship into the weak single auto.
    var before_single: int = scene.score
    if not scene._buy_weapon("single"):
        _fail("first shop could not buy single auto from unarmed state")
        return
    if scene.current_weapon != "single" or scene.score != before_single - scene.SHOP_SINGLE_COST:
        _fail("single auto shop cost/swap is incorrect")
        return
    if scene._buy_weapon("single"):
        _fail("shop should not charge for currently equipped weapon")
        return

    # Higher weapons remain available as later purchases.
    var before_weapon: int = scene.score
    if not scene._buy_weapon("dual"):
        _fail("shop dual purchase failed")
        return
    if scene.current_weapon != "dual" or scene.score != before_weapon - scene.SHOP_DUAL_COST:
        _fail("dual shop cost/swap is incorrect")
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
    scene.elapsed = scene._level_duration() - 0.01
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

    # Dash surges almost to the top, then coasts back very slowly while the world scrolls.
    scene._start_next_level()
    scene.player_x = 195.0
    scene.target_x = 195.0
    scene.player_y = scene.PLAYER_Y
    scene.dash_cooldown = 0.0
    scene._dash()
    scene._process(0.40)
    if scene.player_y > 155.0:
        _fail("dash did not reach near the top of the screen")
        return
    var coast_y: float = scene.player_y
    scene._process(0.80)
    if scene.player_y >= scene.PLAYER_Y - 180.0:
        _fail("dash coast returned toward baseline too quickly")
        return
    if scene.player_y <= coast_y:
        _fail("dash coast did not begin a gradual return")
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
