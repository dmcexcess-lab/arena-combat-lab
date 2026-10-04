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
        "_start_next_level", "_handle_shop_tap", "_ship_speed_multiplier", "_dash_distance",
        "_dash_speed", "_damage_multiplier", "_near_miss_research_multiplier",
        "_research_cost", "_buy_research", "_weapon_research_cost", "_weapon_start_unlocked",
        "_buy_start_weapon_research", "_select_start_weapon", "_valid_starting_weapon",
        "_pause_run", "_resume_run", "_quit_run_with_score", "_bank_run_score", "_save_meta", "_save_run_snapshot",
        "_load_run_snapshot", "_clear_run_snapshot"
    ]:
        if not scene.has_method(method_name):
            _fail("missing gameplay method " + method_name)
            return

    scene._start_game()
    await process_frame
    if not scene.playing or scene.shop_open or scene.level != 1 or scene.hp != 2 or scene.max_hp != 2:
        _fail("run did not initialize with the two-hit baseline")
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

    # True baseline is intentionally weak.
    if scene._ship_speed_multiplier() >= 1.0:
        _fail("starting ship should scroll slower than nominal speed")
        return
    if scene.DASH_FORWARD_DISTANCE > 180.0 or scene.DASH_FORWARD_SPEED > 750.0:
        _fail("starting dash is not short/slow enough")
        return
    if scene.research_shield != 0 or scene.shield_charges != 0:
        _fail("baseline run should start with no shield")
        return

    # Permanent research modifies the intended systems and uses accumulated banked score.
    var base_ship_speed: float = scene._ship_speed_multiplier()
    var base_dash_distance: float = scene._dash_distance()
    var base_dash_speed: float = scene._dash_speed()
    scene.research_credits = 1000000
    if not scene._buy_research("ship") or not scene._buy_research("dash") or not scene._buy_research("damage") or not scene._buy_research("hits") or not scene._buy_research("shield"):
        _fail("research purchase flow failed")
        return
    if scene.research_ship_speed != 1 or scene.research_dash != 1 or scene.research_damage != 1 or scene.research_hits != 1 or scene.research_shield != 1:
        _fail("research levels did not increment correctly")
        return
    if scene._ship_speed_multiplier() <= base_ship_speed or scene._dash_distance() <= base_dash_distance or scene._dash_speed() <= base_dash_speed or scene._damage_multiplier() <= 1.0:
        _fail("research effects were not applied")
        return
    if absf((scene._dash_speed() - base_dash_speed) - 40.0) > 0.01:
        _fail("dash speed research should increase speed only slightly")
        return

    # Defense curves: shield begins cheap then explodes; hits begin expensive but climb gently.
    scene.research_shield = 0
    if scene._research_cost("shield") != 500:
        _fail("first shield research should be cheap")
        return
    scene.research_shield = 1
    var shield_second: int = scene._research_cost("shield")
    scene.research_shield = 2
    var shield_third: int = scene._research_cost("shield")
    if shield_second != 2500 or shield_third != 12500 or shield_third <= shield_second * 4:
        _fail("shield research does not rise steeply enough")
        return
    scene.research_hits = 0
    var hits_first: int = scene._research_cost("hits")
    scene.research_hits = 1
    var hits_second: int = scene._research_cost("hits")
    if hits_first != 5000 or hits_second <= hits_first or hits_second >= hits_first * 2:
        _fail("hit research should start expensive and rise gently")
        return
    scene.research_hits = 1
    scene.research_shield = 1

    # Starting-weapon research costs at least 10x the normal run-shop price.
    if scene._weapon_research_cost("single") != scene.SHOP_SINGLE_COST * 10     or scene._weapon_research_cost("dual") != scene.SHOP_DUAL_COST * 10     or scene._weapon_research_cost("laser") != scene.SHOP_LASER_COST * 10     or scene._weapon_research_cost("cone") != scene.SHOP_CONE_COST * 10     or scene._weapon_research_cost("seeker") != scene.SHOP_SEEKER_COST * 10:
        _fail("starting weapon research is not at least 10x run price")
        return
    for weapon in ["single", "dual", "laser", "cone", "seeker"]:
        if not scene._buy_start_weapon_research(weapon):
            _fail("starting weapon research unlock failed for " + weapon)
            return
    if not scene._select_start_weapon("single") or scene._valid_starting_weapon() != "single":
        _fail("researched starting weapon could not be selected")
        return

    scene._start_game()
    if scene.current_weapon != "single":
        _fail("selected researched weapon did not equip at run start")
        return
    scene.neutral_spawn_clock = 999.0
    scene.easy_spawn_clock = 999.0
    scene.hard_spawn_clock = 999.0
    scene.pickup_clock = 999.0
    scene.repair_clock = 999.0
    scene.fire_clock = 999.0
    var elapsed_before_speed: float = scene.elapsed
    scene._process(1.0)
    if scene.elapsed - elapsed_before_speed <= base_ship_speed:
        _fail("ship-speed research did not accelerate level scroll/progress")
        return

    # Ship speed and dash research both increase near-miss scoring.
    scene.lane_event_active = false
    scene.combo = 1
    scene.score = 0
    scene.research_ship_speed = 0
    scene.research_dash = 0
    scene.dash_score_timer = 0.0
    scene._register_near_miss()
    var base_near: int = scene.score
    scene.score = 0
    scene.combo = 1
    scene.research_ship_speed = 1
    scene._register_near_miss()
    var speed_near: int = scene.score
    if speed_near <= base_near:
        _fail("ship-speed research did not raise ordinary near-miss score")
        return
    scene.score = 0
    scene.combo = 1
    scene.dash_score_timer = 0.5
    scene.research_dash = 0
    scene._register_near_miss()
    var base_dash_near: int = scene.score
    scene.score = 0
    scene.combo = 1
    scene.dash_score_timer = 0.5
    scene.research_dash = 1
    scene._register_near_miss()
    if scene.score <= base_dash_near:
        _fail("dash research did not raise dash near-miss score")
        return
    if scene._near_miss_research_multiplier(false) <= 1.0 or scene._near_miss_research_multiplier(true) <= scene._near_miss_research_multiplier(false):
        _fail("near-miss research multipliers do not reflect speed and dash research")
        return

    # Starting a researched run applies permanent hits and shield charges.
    scene.research_hits = 1
    scene.research_shield = 1
    scene._start_game()
    if scene.max_hp != 3 or scene.hp != 3 or scene.shield_charges != 1:
        _fail("researched hits/shield did not apply to new run")
        return
    scene.current_weapon = "single"
    scene.shots.clear()
    scene._fire_weapon()
    if scene.shots.is_empty() or float(scene.shots[0].damage) <= scene.SINGLE_DAMAGE:
        _fail("permanent damage research did not raise weapon damage")
        return

    # Shield absorbs one projectile without consuming a hit.
    scene.enemy_shots.clear()
    scene.invuln = 0.0
    var hp_before_shield: int = scene.hp
    scene.enemy_shots.append({"x": scene.player_x, "y": scene.player_y, "vx": 0.0, "vy": 0.0, "r": scene.ENEMY_SHOT_RADIUS})
    scene._move_enemy_shots(0.0)
    if scene.hp != hp_before_shield or scene.shield_charges != 0:
        _fail("shield did not absorb exactly one projectile")
        return

    # Pause freezes the run; resume continues; quitting banks the remaining score.
    scene.score = 321
    scene.neutral_spawn_clock = 999.0
    scene.easy_spawn_clock = 999.0
    scene.hard_spawn_clock = 999.0
    scene.pickup_clock = 999.0
    scene.repair_clock = 999.0
    var elapsed_before_pause: float = scene.elapsed
    scene._pause_run()
    scene._process(1.0)
    if not scene.run_paused or scene.elapsed != elapsed_before_pause:
        _fail("paused run continued simulating")
        return
    scene._resume_run()
    if scene.run_paused:
        _fail("resume did not clear paused state")
        return
    var credits_before_quit: int = scene.research_credits
    scene._pause_run()
    scene._quit_run_with_score()
    if scene.playing or scene.run_paused or scene.research_credits != credits_before_quit + 321:
        _fail("quit-with-score did not bank run score and return to menu")
        return

    # Reset research to baseline for legacy gameplay balance tests.
    scene.research_ship_speed = 0
    scene.research_dash = 0
    scene.research_damage = 0
    scene.research_hits = 0
    scene.research_shield = 0
    scene.research_start_single = false
    scene.research_start_dual = false
    scene.research_start_laser = false
    scene.research_start_cone = false
    scene.research_start_seeker = false
    scene.starting_weapon = "none"
    scene.research_credits = 0
    scene._save_meta()
    scene._clear_run_snapshot()
    scene._start_game()
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
    scene._start_game()

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
    if scene.SHOP_SINGLE_COST != 300 or scene.SHOP_DUAL_COST != 1000 or scene.SHOP_LASER_COST != 2500 or scene.SHOP_CONE_COST != 5000 or scene.SHOP_SEEKER_COST != 10000:
        _fail("weapon prices do not span hundreds through ten-thousands")
        return
    if scene.SHOP_REPAIR_COST != 75:
        _fail("repair price should remain on the compact score scale")
        return

    # Level clear opens a frozen shop and awards a clear bonus.
    scene.score = 15000
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

    # Durable run snapshot preserves an active paused run.
    scene._start_game()
    scene.score = 432
    scene.level = 3
    scene.elapsed = 7.5
    scene.current_weapon = "dual"
    scene._pause_run()
    if not scene._load_run_snapshot():
        _fail("saved run snapshot could not be reloaded")
        return
    if scene.score != 432 or scene.level != 3 or absf(scene.elapsed - 7.5) > 0.01 or scene.current_weapon != "dual":
        _fail("run snapshot did not preserve core run state")
        return
    scene.run_paused = false

    # Baseline dash is deliberately short; research grows distance faster than speed.
    scene._start_next_level()
    scene.player_x = 195.0
    scene.target_x = 195.0
    scene.player_y = scene.PLAYER_Y
    scene.dash_cooldown = 0.0
    scene._dash()
    scene._process(0.30)
    var baseline_dash_distance: float = scene.PLAYER_Y - scene.player_y
    if baseline_dash_distance < 145.0 or baseline_dash_distance > 175.0:
        _fail("baseline dash should travel only about 160 pixels")
        return
    scene.research_dash = 3
    scene.player_y = scene.PLAYER_Y
    scene.dash_timer = 0.0
    scene.dash_cooldown = 0.0
    scene._dash()
    scene._process(0.40)
    var researched_dash_distance: float = scene.PLAYER_Y - scene.player_y
    if researched_dash_distance <= baseline_dash_distance + 80.0:
        _fail("dash research did not materially extend distance")
        return
    if scene._dash_speed() >= scene.DASH_FORWARD_SPEED + 150.0:
        _fail("dash research increased speed too aggressively")
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
