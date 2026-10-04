extends Node2D

const W := 390.0
const H := 844.0
const PLAYER_Y := 680.0
const LEFT := 32.0
const RIGHT := 358.0
const LEVEL_TIME := 30.0
const SHOP_REPAIR_COST := 500
const SHOP_SINGLE_COST := 350
const SHOP_DUAL_COST := 650
const SHOP_CONE_COST := 900
const SHOP_SEEKER_COST := 1150
const SHOP_LASER_COST := 850
const LANE_SPLIT := W * 0.5
const LEFT_LANE_MIN := LEFT
const LEFT_LANE_MAX := LANE_SPLIT - 7.0
const RIGHT_LANE_MIN := LANE_SPLIT + 7.0
const RIGHT_LANE_MAX := RIGHT
const DASH_RECT := Rect2(278.0, 748.0, 92.0, 64.0)
const SHOP_REPAIR_RECT := Rect2(35.0, 236.0, 320.0, 56.0)
const SHOP_SINGLE_RECT := Rect2(35.0, 318.0, 150.0, 58.0)
const SHOP_DUAL_RECT := Rect2(205.0, 318.0, 150.0, 58.0)
const SHOP_CONE_RECT := Rect2(35.0, 394.0, 150.0, 58.0)
const SHOP_SEEKER_RECT := Rect2(205.0, 394.0, 150.0, 58.0)
const SHOP_LASER_RECT := Rect2(35.0, 470.0, 320.0, 58.0)
const SHOP_CONTINUE_RECT := Rect2(35.0, 562.0, 320.0, 72.0)
const DASH_COOLDOWN := 2.4
const DASH_DURATION := 0.23
const DASH_FORWARD_SPEED := 760.0
const DASH_FORWARD_DISTANCE := 170.0
const DASH_RETURN_RATE := 4.0
const DASH_SCORE_DURATION := 0.9
const LANE_EVENT_FIRST := 7.0
const LANE_EVENT_INTERVAL := 12.0
const PLAYER_RADIUS := 14.0
const STATION_HEIGHT := 560.0
const STATION_SPEED := 210.0
const STATION_START_TOP := -550.0
const STATION_CENTER_WALL := 24.0
const STATION_EDGE_WALL := 42.0
const SHOT_RADIUS := 4.0
const SINGLE_INTERVAL := 0.24
const DUAL_INTERVAL := 0.32
const CONE_INTERVAL := 0.72
const SEEKER_INTERVAL := 1.05
const LASER_INTERVAL := 0.06
const SINGLE_DAMAGE := 2.0
const DUAL_DAMAGE := 1.0
const CONE_DAMAGE := 3.0
const SEEKER_DAMAGE := 7.0
const LASER_DPS := 3.0
const REPAIR_INTERVAL_MIN := 24.0
const REPAIR_INTERVAL_MAX := 34.0
const REPAIR_RETRY_FULL := 6.0

var rng := RandomNumberGenerator.new()
var playing := false
var game_over := false
var won := false
var elapsed := 0.0
var level := 1
var shop_open := false
var last_level_bonus := 0
var score := 0
var energy := 0
var combo := 1
var best_combo := 1
var hp := 3
var player_x := W * 0.5
var player_y := PLAYER_Y
var target_x := W * 0.5
var invuln := 0.0
var flash := 0.0
var cyan_flash := 0.0
var shake := 0.0
var easy_spawn_clock := 0.0
var hard_spawn_clock := 0.0
var pickup_clock := 0.0
var dash_cooldown := 0.0
var dash_timer := 0.0
var dash_touch_index := -1
var dash_score_timer := 0.0
var near_miss_timer := 0.0
var near_miss_text := ""
var slowmo_timer := 0.0
var finale_active := false
var finale_banner_timer := 0.0
var extraction_spawned := false
var extraction_lane := ""
var result_reason := ""
var hard_lane_right := true
var lane_event_active := false
var lane_event_timer := 0.0
var next_lane_event_at := LANE_EVENT_FIRST
var lane_choice_banner_timer := 0.0
var neutral_spawn_clock := 0.0
var fire_clock := 0.0
var repair_clock := 0.0
var current_weapon := "single"
var weapon_banner_timer := 0.0
var weapon_banner_text := ""
var station_top := STATION_START_TOP
var station_locked_side := ""
var objects: Array[Dictionary] = []
var shots: Array[Dictionary] = []
var particles: Array[Dictionary] = []
var last_near_ids: Dictionary = {}
var sfx_player: AudioStreamPlayer
var near_sfx: AudioStreamWAV
var dash_sfx: AudioStreamWAV
var finale_sfx: AudioStreamWAV

func _ready() -> void:
    rng.randomize()
    _setup_audio()
    set_process(true)
    queue_redraw()

func _setup_audio() -> void:
    sfx_player = AudioStreamPlayer.new()
    add_child(sfx_player)
    near_sfx = _make_tone(940.0, 0.085, 0.22)
    dash_sfx = _make_tone(360.0, 0.07, 0.18)
    finale_sfx = _make_tone(620.0, 0.16, 0.2)

func _make_tone(freq: float, duration: float, volume: float) -> AudioStreamWAV:
    var rate := 22050
    var sample_count := int(rate * duration)
    var data := PackedByteArray()
    data.resize(sample_count * 2)
    for i in sample_count:
        var t := float(i) / float(rate)
        var envelope := 1.0 - float(i) / float(sample_count)
        var sample := int(sin(TAU * freq * t) * 32767.0 * volume * envelope)
        data.encode_s16(i * 2, sample)
    var wav := AudioStreamWAV.new()
    wav.format = AudioStreamWAV.FORMAT_16_BITS
    wav.mix_rate = rate
    wav.stereo = false
    wav.data = data
    return wav

func _play_sfx(stream: AudioStreamWAV) -> void:
    if sfx_player == null or stream == null:
        return
    sfx_player.stream = stream
    sfx_player.play()

func _process(delta: float) -> void:
    if not playing:
        queue_redraw()
        return

    near_miss_timer = maxf(0.0, near_miss_timer - delta)
    weapon_banner_timer = maxf(0.0, weapon_banner_timer - delta)
    lane_choice_banner_timer = maxf(0.0, lane_choice_banner_timer - delta)
    finale_banner_timer = maxf(0.0, finale_banner_timer - delta)
    flash = maxf(0.0, flash - delta)
    cyan_flash = maxf(0.0, cyan_flash - delta)
    shake = maxf(0.0, shake - delta * 28.0)
    dash_cooldown = maxf(0.0, dash_cooldown - delta)
    dash_score_timer = maxf(0.0, dash_score_timer - delta)
    slowmo_timer = maxf(0.0, slowmo_timer - delta)

    var game_delta := delta * (0.52 if slowmo_timer > 0.0 else 1.0)
    elapsed += game_delta
    invuln = maxf(0.0, invuln - game_delta)

    player_x = lerpf(player_x, target_x, minf(1.0, game_delta * 13.0))
    player_x = clampf(player_x, LEFT, RIGHT)
    target_x = clampf(target_x, LEFT, RIGHT)

    if dash_timer > 0.0:
        dash_timer = maxf(0.0, dash_timer - game_delta)
        player_y = maxf(PLAYER_Y - DASH_FORWARD_DISTANCE, player_y - DASH_FORWARD_SPEED * game_delta)
    else:
        player_y = lerpf(player_y, PLAYER_Y, minf(1.0, game_delta * DASH_RETURN_RATE))

    easy_spawn_clock -= game_delta
    hard_spawn_clock -= game_delta
    neutral_spawn_clock -= game_delta
    pickup_clock -= game_delta
    fire_clock -= game_delta
    repair_clock -= game_delta
    var difficulty := _level_difficulty()

    if current_weapon == "laser":
        _apply_laser_damage(game_delta)
    elif fire_clock <= 0.0:
        _fire_weapon()
        fire_clock = _weapon_interval()

    if repair_clock <= 0.0:
        if hp < 3:
            _spawn_repair()
            repair_clock = rng.randf_range(REPAIR_INTERVAL_MIN, REPAIR_INTERVAL_MAX)
        else:
            repair_clock = REPAIR_RETRY_FULL

    if lane_event_active:
        station_top += STATION_SPEED * game_delta
        lane_event_timer = maxf(0.0, lane_event_timer - game_delta)
        _check_station_collision()
        if not playing:
            queue_redraw()
            return
        if easy_spawn_clock <= 0.0:
            _spawn_hazard(difficulty, false, true)
            easy_spawn_clock = _spawn_interval(1.05, 0.52, difficulty) * rng.randf_range(0.88, 1.18)
        if hard_spawn_clock <= 0.0:
            _spawn_hazard(difficulty, true, true)
            hard_spawn_clock = _spawn_interval(0.82, 0.34, difficulty) * rng.randf_range(0.84, 1.14)
        if station_top > H + 40.0:
            _end_lane_event()
    else:
        if neutral_spawn_clock <= 0.0:
            _spawn_hazard(difficulty, false, false)
            neutral_spawn_clock = _spawn_interval(1.10, 0.43, difficulty) * rng.randf_range(0.86, 1.18)
        if elapsed >= next_lane_event_at and elapsed < LEVEL_TIME - 8.0:
            _begin_lane_event()

    if pickup_clock <= 0.0:
        _spawn_pickup()
        pickup_clock = rng.randf_range(1.8, 2.7)

    _move_shots(game_delta)
    _move_objects(game_delta)
    _move_particles(delta)
    score += int(game_delta * (22.0 + minf(difficulty, 1.5) * 22.0) * combo * _lane_score_multiplier() * _dash_score_multiplier())

    if elapsed >= LEVEL_TIME and playing:
        _open_shop()
        queue_redraw()
        return
    queue_redraw()

func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            if shop_open:
                _handle_shop_tap(event.position)
                return
            if not playing:
                _start_game()
                return
            if DASH_RECT.has_point(event.position):
                dash_touch_index = event.index
                _dash()
            else:
                _set_target(event.position.x)
        elif event.index == dash_touch_index:
            dash_touch_index = -1
    elif event is InputEventScreenDrag:
        if playing and event.index != dash_touch_index:
            _set_target(event.position.x)
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
        if shop_open:
            _handle_shop_tap(event.position)
        elif not playing:
            _start_game()
        elif DASH_RECT.has_point(event.position):
            _dash()
        else:
            _set_target(event.position.x)
    elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        if playing and not DASH_RECT.has_point(event.position):
            _set_target(event.position.x)

func _set_target(x: float) -> void:
    target_x = clampf(x, LEFT, RIGHT)

func _dash() -> void:
    if not playing or dash_cooldown > 0.0 or dash_timer > 0.0:
        return
    dash_timer = DASH_DURATION
    dash_cooldown = DASH_COOLDOWN
    dash_score_timer = DASH_SCORE_DURATION
    invuln = maxf(invuln, 0.24)
    shake = maxf(shake, 3.5)
    _burst(Vector2(player_x, player_y), 10, Color("77f7ff"))
    _play_sfx(dash_sfx)

func _start_game() -> void:
    playing = true
    game_over = false
    won = false
    elapsed = 0.0
    level = 1
    shop_open = false
    last_level_bonus = 0
    score = 0
    energy = 0
    combo = 1
    best_combo = 1
    hp = 3
    player_x = W * 0.5
    player_y = PLAYER_Y
    target_x = player_x
    invuln = 0.0
    flash = 0.0
    cyan_flash = 0.0
    shake = 0.0
    easy_spawn_clock = 0.90
    hard_spawn_clock = 0.72
    pickup_clock = 1.3
    neutral_spawn_clock = 0.95
    fire_clock = 0.18
    repair_clock = 18.0
    current_weapon = "single"
    weapon_banner_timer = 0.0
    weapon_banner_text = ""
    dash_cooldown = 0.0
    dash_timer = 0.0
    dash_score_timer = 0.0
    near_miss_timer = 0.0
    slowmo_timer = 0.0
    finale_active = false
    finale_banner_timer = 0.0
    extraction_spawned = false
    extraction_lane = ""
    result_reason = ""
    hard_lane_right = true
    lane_event_active = false
    lane_event_timer = 0.0
    next_lane_event_at = LANE_EVENT_FIRST
    lane_choice_banner_timer = 0.0
    station_top = STATION_START_TOP
    station_locked_side = ""
    objects.clear()
    shots.clear()
    particles.clear()
    last_near_ids.clear()

func _level_difficulty() -> float:
    var level_pressure := float(level - 1) * 0.18
    var stage_pressure := clampf(elapsed / LEVEL_TIME, 0.0, 1.0) * 0.24
    return minf(1.65, level_pressure + stage_pressure)

func _spawn_interval(easy_value: float, hard_value: float, difficulty: float) -> float:
    var base := lerpf(easy_value, hard_value, clampf(difficulty, 0.0, 1.0))
    if difficulty > 1.0:
        base /= 1.0 + (difficulty - 1.0) * 0.42
    return maxf(0.24, base)

func _shop_weapon_cost(weapon: String) -> int:
    match weapon:
        "single":
            return SHOP_SINGLE_COST
        "dual":
            return SHOP_DUAL_COST
        "cone":
            return SHOP_CONE_COST
        "seeker":
            return SHOP_SEEKER_COST
        "laser":
            return SHOP_LASER_COST
    return 999999

func _open_shop() -> void:
    if shop_open or game_over:
        return
    playing = false
    shop_open = true
    last_level_bonus = 350 + level * 100
    score += last_level_bonus
    combo = 1
    dash_timer = 0.0
    dash_score_timer = 0.0
    invuln = 0.0
    objects.clear()
    shots.clear()
    lane_event_active = false
    lane_event_timer = 0.0
    station_locked_side = ""
    station_top = STATION_START_TOP
    queue_redraw()

func _buy_repair() -> bool:
    if not shop_open or hp >= 3 or score < SHOP_REPAIR_COST:
        return false
    score -= SHOP_REPAIR_COST
    hp += 1
    return true

func _buy_weapon(weapon: String) -> bool:
    if not shop_open or weapon == current_weapon:
        return false
    var cost := _shop_weapon_cost(weapon)
    if score < cost:
        return false
    score -= cost
    current_weapon = weapon
    return true

func _start_next_level() -> void:
    if not shop_open:
        return
    level += 1
    elapsed = 0.0
    shop_open = false
    playing = true
    player_x = W * 0.5
    player_y = PLAYER_Y
    target_x = player_x
    combo = 1
    invuln = 0.0
    flash = 0.0
    cyan_flash = 0.0
    shake = 0.0
    easy_spawn_clock = 0.72
    hard_spawn_clock = 0.54
    neutral_spawn_clock = 0.72
    pickup_clock = 1.2
    fire_clock = 0.15
    repair_clock = rng.randf_range(18.0, 24.0)
    dash_cooldown = 0.0
    dash_timer = 0.0
    dash_score_timer = 0.0
    near_miss_timer = 0.0
    slowmo_timer = 0.0
    finale_active = false
    extraction_spawned = false
    extraction_lane = ""
    lane_event_active = false
    lane_event_timer = 0.0
    next_lane_event_at = LANE_EVENT_FIRST
    lane_choice_banner_timer = 0.0
    station_top = STATION_START_TOP
    station_locked_side = ""
    objects.clear()
    shots.clear()
    last_near_ids.clear()

func _handle_shop_tap(pos: Vector2) -> void:
    if SHOP_REPAIR_RECT.has_point(pos):
        _buy_repair()
    elif SHOP_SINGLE_RECT.has_point(pos):
        _buy_weapon("single")
    elif SHOP_DUAL_RECT.has_point(pos):
        _buy_weapon("dual")
    elif SHOP_CONE_RECT.has_point(pos):
        _buy_weapon("cone")
    elif SHOP_SEEKER_RECT.has_point(pos):
        _buy_weapon("seeker")
    elif SHOP_LASER_RECT.has_point(pos):
        _buy_weapon("laser")
    elif SHOP_CONTINUE_RECT.has_point(pos):
        _start_next_level()
    queue_redraw()

func _finish(success: bool) -> void:
    playing = false
    game_over = true
    won = success
    if success:
        score += energy * 250 + hp * 1000
        result_reason = "CLEAN EXTRACTION"
    elif result_reason.is_empty():
        result_reason = "SIGNAL LOST"
    queue_redraw()

func _lane_score_multiplier() -> float:
    return 1.35 if _station_at_player() and _is_hard_position(player_x) else 1.0

func _dash_score_multiplier() -> float:
    return 2.0 if dash_score_timer > 0.0 else 1.0

func _begin_lane_event() -> void:
    lane_event_active = true
    station_top = STATION_START_TOP
    station_locked_side = ""
    lane_event_timer = (H + 40.0 - STATION_START_TOP) / STATION_SPEED
    next_lane_event_at += LANE_EVENT_INTERVAL
    hard_lane_right = rng.randf() < 0.5
    lane_choice_banner_timer = 2.4
    easy_spawn_clock = 0.12
    hard_spawn_clock = 0.08
    shake = maxf(shake, 1.8)

func _end_lane_event() -> void:
    lane_event_active = false
    lane_event_timer = 0.0
    lane_choice_banner_timer = 0.0
    station_locked_side = ""
    station_top = STATION_START_TOP

func _station_at_player() -> bool:
    if not lane_event_active:
        return false
    return player_y + PLAYER_RADIUS >= station_top and player_y - PLAYER_RADIUS <= station_top + STATION_HEIGHT

func _station_barrier_rects() -> Array[Rect2]:
    return [
        Rect2(0.0, station_top, STATION_EDGE_WALL, STATION_HEIGHT),
        Rect2(LANE_SPLIT - STATION_CENTER_WALL * 0.5, station_top, STATION_CENTER_WALL, STATION_HEIGHT),
        Rect2(W - STATION_EDGE_WALL, station_top, STATION_EDGE_WALL, STATION_HEIGHT)
    ]

func _check_station_collision() -> void:
    if not _station_at_player():
        return

    var player_rect := Rect2(
        Vector2(player_x - PLAYER_RADIUS, player_y - PLAYER_RADIUS),
        Vector2(PLAYER_RADIUS * 2.0, PLAYER_RADIUS * 2.0)
    )

    for barrier in _station_barrier_rects():
        if player_rect.intersects(barrier):
            hp = 0
            combo = 1
            flash = 0.45
            shake = 12.0
            result_reason = "STATION COLLISION"
            _burst(Vector2(player_x, player_y), 24, Color("ffb347"))
            _finish(false)
            return

    if station_locked_side.is_empty():
        station_locked_side = "RIGHT" if player_x > LANE_SPLIT else "LEFT"

func _is_hard_position(x: float) -> bool:
    if x >= RIGHT_LANE_MIN:
        return hard_lane_right
    if x <= LEFT_LANE_MAX:
        return not hard_lane_right
    return false

func _lane_bounds(hard_lane: bool) -> Vector2:
    var use_right := hard_lane == hard_lane_right
    if use_right:
        return Vector2(RIGHT_LANE_MIN, RIGHT_LANE_MAX)
    return Vector2(LEFT_LANE_MIN, LEFT_LANE_MAX)

func _lane_center(hard_lane: bool) -> float:
    var bounds := _lane_bounds(hard_lane)
    return (bounds.x + bounds.y) * 0.5

func _spawn_hazard(difficulty: float, hard_lane: bool, lane_mode: bool = true) -> void:
    var kind_threshold := 0.28 if hard_lane and lane_mode else 0.5
    var kind_max := 2 if difficulty > kind_threshold else 1
    var kind := rng.randi_range(0, kind_max)
    var radius := rng.randf_range(17.0, 26.0)
    var base_speed := rng.randf_range(205.0, 275.0) + difficulty * 125.0
    var speed := base_speed
    if lane_mode:
        speed *= 1.16 if hard_lane else 0.9
    var bounds := _lane_bounds(hard_lane) if lane_mode else Vector2(LEFT, RIGHT)
    var lane_min := bounds.x
    var lane_max := bounds.y
    var x := rng.randf_range(lane_min + radius, lane_max - radius)
    var drift := 0.0
    if kind == 1:
        drift = rng.randf_range(-64.0, 64.0) * (1.18 if hard_lane else 0.86)
    elif kind == 2:
        radius = rng.randf_range(11.0, 16.0)
        speed += 95.0 if hard_lane else 65.0
    var obstacle_hp := _obstacle_max_hp(kind)
    objects.append({
        "id": rng.randi(),
        "type": "hazard",
        "kind": kind,
        "hp": obstacle_hp,
        "max_hp": obstacle_hp,
        "hard": hard_lane and lane_mode,
        "x": x,
        "y": -40.0,
        "r": radius,
        "speed": speed,
        "drift": drift,
        "lane_min": lane_min,
        "lane_max": lane_max
    })

func _weapon_interval() -> float:
    match current_weapon:
        "single":
            return SINGLE_INTERVAL
        "dual":
            return DUAL_INTERVAL
        "cone":
            return CONE_INTERVAL
        "seeker":
            return SEEKER_INTERVAL
        "laser":
            return LASER_INTERVAL
    return SINGLE_INTERVAL

func _weapon_damage(weapon: String) -> float:
    match weapon:
        "single":
            return SINGLE_DAMAGE
        "dual":
            return DUAL_DAMAGE
        "cone":
            return CONE_DAMAGE
        "seeker":
            return SEEKER_DAMAGE
        "laser":
            return LASER_DPS
    return SINGLE_DAMAGE

func _weapon_label(weapon: String) -> String:
    match weapon:
        "single":
            return "SINGLE D2"
        "dual":
            return "DUAL D1x2"
        "cone":
            return "CONE D3x3"
        "seeker":
            return "SEEKER D7"
        "laser":
            return "LASER 3 DPS"
    return "SINGLE D2"

func _weapon_icon(weapon: String) -> String:
    match weapon:
        "single":
            return "1"
        "dual":
            return "2"
        "cone":
            return "C"
        "seeker":
            return "H"
        "laser":
            return "L"
    return "?"

func _obstacle_max_hp(kind: int) -> float:
    match kind:
        0:
            return 3.0
        1:
            return 6.0
        2:
            return 12.0
    return 3.0

func _spawn_shot(x: float, y: float, vx: float, vy: float, damage: float, homing: bool = false) -> void:
    shots.append({
        "x": x,
        "y": y,
        "vx": vx,
        "vy": vy,
        "r": SHOT_RADIUS,
        "damage": damage,
        "homing": homing
    })

func _fire_weapon() -> void:
    if not playing:
        return
    match current_weapon:
        "single":
            _spawn_shot(player_x, player_y - 22.0, 0.0, -690.0, SINGLE_DAMAGE)
        "dual":
            _spawn_shot(player_x - 10.0, player_y - 20.0, 0.0, -650.0, DUAL_DAMAGE)
            _spawn_shot(player_x + 10.0, player_y - 20.0, 0.0, -650.0, DUAL_DAMAGE)
        "cone":
            _spawn_shot(player_x, player_y - 22.0, -145.0, -520.0, CONE_DAMAGE)
            _spawn_shot(player_x, player_y - 24.0, 0.0, -560.0, CONE_DAMAGE)
            _spawn_shot(player_x, player_y - 22.0, 145.0, -520.0, CONE_DAMAGE)
        "seeker":
            _spawn_shot(player_x, player_y - 24.0, 0.0, -370.0, SEEKER_DAMAGE, true)
        "laser":
            pass

func _nearest_hazard_position(from_pos: Vector2) -> Vector2:
    var best := Vector2(from_pos.x, -40.0)
    var best_d := INF
    for obj in objects:
        if obj.type != "hazard":
            continue
        var p := Vector2(float(obj.x), float(obj.y))
        if p.y >= from_pos.y:
            continue
        var d := from_pos.distance_squared_to(p)
        if d < best_d:
            best_d = d
            best = p
    return best

func _move_shots(delta: float) -> void:
    var next: Array[Dictionary] = []
    for shot in shots:
        if shot.homing:
            var pos := Vector2(float(shot.x), float(shot.y))
            var target := _nearest_hazard_position(pos)
            var desired := (target - pos).normalized() * 430.0
            shot.vx = lerpf(float(shot.vx), desired.x, minf(1.0, delta * 4.5))
            shot.vy = lerpf(float(shot.vy), desired.y, minf(1.0, delta * 4.5))
        shot.x += float(shot.vx) * delta
        shot.y += float(shot.vy) * delta

        var blocked := false
        if lane_event_active:
            var point := Vector2(shot.x, shot.y)
            for barrier in _station_barrier_rects():
                if barrier.has_point(point):
                    blocked = true
                    break
        if not blocked and shot.y > -45.0 and shot.y < H + 40.0 and shot.x > -40.0 and shot.x < W + 40.0:
            next.append(shot)
    shots = next

func _apply_damage_to_hazard(obj: Dictionary, damage: float) -> bool:
    obj.hp = maxf(0.0, float(obj.hp) - damage)
    score += int(18.0 * damage * combo * _dash_score_multiplier())
    if float(obj.hp) <= 0.0:
        score += int((90.0 + float(obj.max_hp) * 28.0) * combo * _dash_score_multiplier())
        _burst(Vector2(obj.x, obj.y), 10, Color("ffd166"))
        return true
    if damage >= 1.0:
        _burst(Vector2(obj.x, obj.y), 3, Color("fff4c2"))
    return false

func _consume_shot_hit(obj: Dictionary) -> bool:
    for i in range(shots.size() - 1, -1, -1):
        var shot: Dictionary = shots[i]
        var dx := absf(float(shot.x) - float(obj.x))
        var dy := absf(float(shot.y) - float(obj.y))
        if dx < float(obj.r) + float(shot.r) and dy < float(obj.r) + float(shot.r):
            var damage := float(shot.damage)
            shots.remove_at(i)
            return _apply_damage_to_hazard(obj, damage)
    return false

func _apply_laser_damage(delta: float) -> void:
    if current_weapon != "laser" or not playing:
        return
    var target_index := -1
    var target_y := -INF
    for i in objects.size():
        var obj: Dictionary = objects[i]
        if obj.type != "hazard":
            continue
        if float(obj.y) >= player_y:
            continue
        if absf(float(obj.x) - player_x) > float(obj.r) + 4.0:
            continue
        if float(obj.y) > target_y:
            target_y = float(obj.y)
            target_index = i
    if target_index < 0:
        return
    var target: Dictionary = objects[target_index]
    if _apply_damage_to_hazard(target, LASER_DPS * delta):
        objects.remove_at(target_index)

func _spawn_weapon_pickup() -> void:
    var choices: Array[String] = ["single", "dual", "cone", "seeker", "laser"]
    choices.erase(current_weapon)
    var weapon: String = choices[rng.randi_range(0, choices.size() - 1)]
    var hard_lane := lane_event_active and rng.randf() < 0.5
    var bounds := _lane_bounds(hard_lane) if lane_event_active else Vector2(LEFT, RIGHT)
    objects.append({
        "id": rng.randi(),
        "type": "weapon",
        "weapon": weapon,
        "hard": false,
        "x": rng.randf_range(bounds.x + 18.0, bounds.y - 18.0),
        "y": -34.0,
        "r": 14.0,
        "speed": rng.randf_range(210.0, 245.0),
        "drift": rng.randf_range(-10.0, 10.0),
        "lane_min": bounds.x,
        "lane_max": bounds.y
    })

func _spawn_repair() -> void:
    if hp >= 3:
        return
    var lane_hard := lane_event_active and rng.randf() < 0.5
    var bounds := _lane_bounds(lane_hard) if lane_event_active else Vector2(LEFT, RIGHT)
    objects.append({
        "id": rng.randi(),
        "type": "repair",
        "hard": false,
        "x": rng.randf_range(bounds.x + 18.0, bounds.y - 18.0),
        "y": -34.0,
        "r": 14.0,
        "speed": rng.randf_range(210.0, 245.0),
        "drift": rng.randf_range(-12.0, 12.0),
        "lane_min": bounds.x,
        "lane_max": bounds.y
    })

func _spawn_pickup() -> void:
    var hard_lane := lane_event_active and rng.randf() < 0.66
    var bounds := _lane_bounds(hard_lane) if lane_event_active else Vector2(LEFT, RIGHT)
    var lane_min := bounds.x
    var lane_max := bounds.y
    objects.append({
        "id": rng.randi(),
        "type": "energy",
        "hard": hard_lane,
        "x": rng.randf_range(lane_min + 16.0, lane_max - 16.0),
        "y": -30.0,
        "r": 12.0,
        "speed": rng.randf_range(225.0, 280.0),
        "drift": rng.randf_range(-16.0, 16.0),
        "lane_min": lane_min,
        "lane_max": lane_max
    })

func _begin_finale() -> void:
    finale_active = true
    finale_banner_timer = 2.4
    hard_spawn_clock = minf(hard_spawn_clock, 0.16)
    easy_spawn_clock = minf(easy_spawn_clock, 0.28)
    shake = maxf(shake, 2.0)
    _play_sfx(finale_sfx)

func _spawn_extraction_gate() -> void:
    extraction_spawned = true
    var gate_right := rng.randf() < 0.5
    extraction_lane = "RIGHT" if gate_right else "LEFT"
    var x := (RIGHT_LANE_MIN + RIGHT_LANE_MAX) * 0.5 if gate_right else (LEFT_LANE_MIN + LEFT_LANE_MAX) * 0.5
    objects.append({
        "id": rng.randi(),
        "type": "extraction",
        "x": x,
        "y": -80.0,
        "r": 0.0,
        "speed": 120.0,
        "drift": 0.0,
        "half_width": 55.0
    })
    finale_banner_timer = 2.8
    _play_sfx(finale_sfx)

func _move_objects(delta: float) -> void:
    var next: Array[Dictionary] = []
    for obj in objects:
        obj.y += obj.speed * delta
        obj.x += obj.drift * delta

        if obj.type != "extraction":
            if obj.x < obj.lane_min + obj.r or obj.x > obj.lane_max - obj.r:
                obj.drift *= -1.0
                obj.x = clampf(obj.x, obj.lane_min + obj.r, obj.lane_max - obj.r)

        var dy: float = obj.y - player_y
        var dx: float = absf(obj.x - player_x)

        if obj.type == "hazard":
            if _consume_shot_hit(obj):
                continue
            var hit_dist: float = obj.r + 14.0
            if absf(dy) < hit_dist and dx < hit_dist:
                if invuln <= 0.0:
                    _take_hit()
                    _burst(Vector2(obj.x, obj.y), 13, Color("ff426f"))
                continue

            var near_dist: float = obj.r + 40.0
            if obj.y > player_y + obj.r and not last_near_ids.has(obj.id):
                last_near_ids[obj.id] = true
                if dx < near_dist:
                    _register_near_miss()
        elif obj.type == "energy":
            if absf(dy) < obj.r + 18.0 and dx < obj.r + 20.0:
                energy += 1
                var pickup_base := 450 if obj.hard and lane_event_active else 300
                score += int(pickup_base * combo * _dash_score_multiplier())
                combo = mini(combo + 1, 8)
                best_combo = maxi(best_combo, combo)
                _burst(Vector2(obj.x, obj.y), 9, Color("6bffb0"))
                continue
        elif obj.type == "repair":
            if absf(dy) < obj.r + 18.0 and dx < obj.r + 20.0:
                if hp < 3:
                    hp += 1
                    score += int(250 * _dash_score_multiplier())
                    _burst(Vector2(obj.x, obj.y), 12, Color("e8fff3"))
                continue
        elif obj.type == "weapon":
            if absf(dy) < obj.r + 18.0 and dx < obj.r + 20.0:
                current_weapon = String(obj.weapon)
                fire_clock = 0.04
                weapon_banner_text = _weapon_label(current_weapon)
                weapon_banner_timer = 1.35
                score += int(180 * _dash_score_multiplier())
                _burst(Vector2(obj.x, obj.y), 12, Color("a882ff"))
                continue
        elif obj.type == "extraction":
            if absf(dy) < 19.0:
                if dx <= obj.half_width - 10.0:
                    _burst(Vector2(player_x, player_y), 22, Color("77f7ff"))
                    _finish(true)
                    continue
            if obj.y > player_y + 32.0:
                result_reason = "MISSED THE GATE"
                _finish(false)
                continue

        if obj.y < H + 80.0:
            next.append(obj)
    objects = next

func _register_near_miss() -> void:
    combo = mini(combo + 1, 8)
    best_combo = maxi(best_combo, combo)
    score += int(180 * combo * _dash_score_multiplier())
    near_miss_text = "NEAR MISS  x%d" % combo
    near_miss_timer = 0.62
    slowmo_timer = 0.11
    cyan_flash = 0.13
    shake = maxf(shake, 2.8)
    dash_cooldown = maxf(0.0, dash_cooldown - 0.2)
    _burst(Vector2(player_x, player_y), 10, Color("77f7ff"))
    _play_sfx(near_sfx)

func _take_hit() -> void:
    hp -= 1
    combo = 1
    invuln = 1.0
    flash = 0.22
    shake = 7.0
    if hp <= 0:
        _finish(false)

func _burst(pos: Vector2, count: int, color: Color) -> void:
    for i in count:
        var a := rng.randf_range(0.0, TAU)
        var s := rng.randf_range(55.0, 160.0)
        particles.append({
            "x": pos.x,
            "y": pos.y,
            "vx": cos(a) * s,
            "vy": sin(a) * s,
            "life": rng.randf_range(0.22, 0.5),
            "max": 0.5,
            "color": color
        })

func _move_particles(delta: float) -> void:
    var next: Array[Dictionary] = []
    for p in particles:
        p.life -= delta
        p.x += p.vx * delta
        p.y += p.vy * delta
        p.vx *= 0.96
        p.vy *= 0.96
        if p.life > 0.0:
            next.append(p)
    particles = next

func _draw() -> void:
    var offset := Vector2(rng.randf_range(-shake, shake), rng.randf_range(-shake, shake)) if shake > 0.0 else Vector2.ZERO
    draw_rect(Rect2(Vector2.ZERO, Vector2(W, H)), Color("080b14"))
    _draw_background()

    if shop_open:
        _draw_shop()
        return

    if not playing and not game_over:
        _draw_title()
        return

    for obj in objects:
        _draw_object(obj, offset)

    for shot in shots:
        var sp := Vector2(shot.x, shot.y) + offset
        var col := Color("ffd166") if not shot.homing else Color("ff8fa6")
        draw_line(sp - Vector2(float(shot.vx), float(shot.vy)).normalized() * -10.0, sp, col, 4.0)
        draw_circle(sp, 3.0 if not shot.homing else 5.0, Color("fff4c2"))

    if current_weapon == "laser" and playing:
        var laser_x := player_x + offset.x
        draw_line(Vector2(laser_x, player_y - 20.0 + offset.y), Vector2(laser_x, 0.0), Color(0.65, 0.95, 1.0, 0.78), 2.0)

    _draw_station(offset)

    for p in particles:
        var alpha: float = clampf(p.life / p.max, 0.0, 1.0)
        var pc: Color = p.color
        draw_circle(Vector2(p.x, p.y) + offset, 3.0, Color(pc.r, pc.g, pc.b, alpha))

    _draw_player(offset)
    _draw_hud()
    _draw_dash_button()

    if lane_choice_banner_timer > 0.0 and lane_event_active:
        var choice := "STATION SPLIT — CHOOSE A LANE"
        draw_rect(Rect2(Vector2(38, 192), Vector2(314, 42)), Color(0.02, 0.04, 0.07, 0.92), true)
        _text(choice, Vector2(62, 220), 16, Color("ffd166"))

    if weapon_banner_timer > 0.0:
        draw_rect(Rect2(Vector2(78, 244), Vector2(234, 38)), Color(0.08, 0.04, 0.16, 0.9), true)
        _text("WEAPON: %s" % weapon_banner_text, Vector2(91, 270), 17, Color("d4b8ff"))

    if near_miss_timer > 0.0:
        var pulse := 0.78 + sin(Time.get_ticks_msec() * 0.035) * 0.12
        _text(near_miss_text, Vector2(92, 608), 26, Color(0.47, 0.97, 1.0, pulse))

    if finale_banner_timer > 0.0:
        var label := "EXTRACTION INBOUND"
        if extraction_spawned:
            label = "GATE: %s LANE" % extraction_lane
        _text(label, Vector2(70 if not extraction_spawned else 84, 188), 22, Color("ffd166"))

    if flash > 0.0:
        draw_rect(Rect2(Vector2.ZERO, Vector2(W, H)), Color(1.0, 0.2, 0.35, flash * 1.8))
    if cyan_flash > 0.0:
        draw_rect(Rect2(Vector2.ZERO, Vector2(W, H)), Color(0.25, 0.95, 1.0, cyan_flash * 1.5))
    if game_over:
        _draw_results()

func _draw_background() -> void:
    var t := Time.get_ticks_msec() / 1000.0

    for i in 18:
        var y := fmod(float(i) * 57.0 + t * (55.0 + (i % 3) * 12.0), H + 80.0) - 40.0
        var x := 18.0 + float((i * 73) % 354)
        draw_circle(Vector2(x, y), 1.5 + float(i % 2), Color(0.2, 0.45, 0.7, 0.24))

    draw_line(Vector2(26, 0), Vector2(26, H), Color(0.15, 0.55, 0.72, 0.28), 2.0)
    draw_line(Vector2(364, 0), Vector2(364, H), Color(0.15, 0.55, 0.72, 0.28), 2.0)

    for i in 13:
        var y := float(i) * 72.0 - fmod(t * (170.0 if not finale_active else 250.0), 72.0)
        draw_line(Vector2(190, y), Vector2(200, y), Color(0.2, 0.8, 0.95, 0.18), 2.0)

    if finale_active:
        var pulse := 0.12 + (sin(t * 8.0) + 1.0) * 0.04
        draw_rect(Rect2(Vector2.ZERO, Vector2(W, H)), Color(1.0, 0.08, 0.15, pulse), true)

func _draw_station(offset: Vector2) -> void:
    if not lane_event_active:
        return

    var easy_tint := Color(0.12, 0.34, 0.38, 0.13)
    var hard_tint := Color(0.48, 0.08, 0.14, 0.16)
    var left_tint := easy_tint if hard_lane_right else hard_tint
    var right_tint := hard_tint if hard_lane_right else easy_tint
    var y0 := station_top
    var y1 := station_top + STATION_HEIGHT

    draw_rect(Rect2(Vector2(STATION_EDGE_WALL, y0), Vector2(LANE_SPLIT - STATION_CENTER_WALL * 0.5 - STATION_EDGE_WALL, STATION_HEIGHT)), left_tint, true)
    draw_rect(Rect2(Vector2(LANE_SPLIT + STATION_CENTER_WALL * 0.5, y0), Vector2(W - STATION_EDGE_WALL - (LANE_SPLIT + STATION_CENTER_WALL * 0.5), STATION_HEIGHT)), right_tint, true)

    var metal := Color("596777")
    var metal_dark := Color("1e2833")
    var edge := Color("9aa9b8")
    var warning := Color("ffb347")

    for barrier in _station_barrier_rects():
        var shifted := Rect2(barrier.position + offset, barrier.size)
        draw_rect(shifted, metal_dark, true)
        draw_rect(shifted, metal, false, 4.0)
        var strip_y := shifted.position.y + 24.0
        while strip_y < shifted.end.y - 12.0:
            draw_line(Vector2(shifted.position.x + 4.0, strip_y), Vector2(shifted.end.x - 4.0, strip_y + 18.0), warning, 4.0)
            draw_line(Vector2(shifted.position.x + 4.0, strip_y + 18.0), Vector2(shifted.end.x - 4.0, strip_y), metal_dark, 4.0)
            strip_y += 62.0

    var panel_y := y0 + 38.0
    while panel_y < y1 - 24.0:
        draw_circle(Vector2(LANE_SPLIT, panel_y) + offset, 4.0, edge)
        panel_y += 74.0

    if _station_at_player() and not station_locked_side.is_empty():
        _text("LOCKED %s" % station_locked_side, Vector2(135, 650), 17, Color("ffd166"))

func _draw_player(offset: Vector2) -> void:
    var pos := Vector2(player_x, player_y) + offset
    var c := Color("77f7ff") if invuln <= 0.0 or int(Time.get_ticks_msec() / 90) % 2 == 0 else Color(0.4, 0.4, 0.5, 0.5)
    if dash_timer > 0.0:
        draw_line(pos + Vector2(0, 58.0), pos, Color(0.35, 0.95, 1.0, 0.42), 10.0)
    draw_circle(pos, 20.0, Color(0.2, 0.9, 1.0, 0.12))
    draw_colored_polygon(PackedVector2Array([pos + Vector2(0,-18), pos + Vector2(13,15), pos, pos + Vector2(-13,15)]), c)
    draw_line(pos + Vector2(0, 18), pos + Vector2(0, 38), Color(0.3, 0.85, 1.0, 0.35), 5.0)

func _draw_object(obj: Dictionary, offset: Vector2) -> void:
    var p := Vector2(obj.x, obj.y) + offset

    if obj.type == "extraction":
        var half_width: float = obj.half_width
        draw_rect(Rect2(Vector2(p.x - half_width - 12.0, p.y - 12.0), Vector2(12.0, 24.0)), Color("77f7ff"), true)
        draw_rect(Rect2(Vector2(p.x + half_width, p.y - 12.0), Vector2(12.0, 24.0)), Color("77f7ff"), true)
        draw_line(Vector2(p.x - half_width, p.y), Vector2(p.x + half_width, p.y), Color(0.45, 0.97, 1.0, 0.45), 4.0)
        draw_rect(Rect2(Vector2(p.x - half_width, p.y - 18.0), Vector2(half_width * 2.0, 36.0)), Color(0.3, 0.95, 1.0, 0.08), true)
        return

    if obj.type == "weapon":
        draw_circle(p, obj.r + 8.0, Color(0.66, 0.45, 1.0, 0.18))
        draw_circle(p, obj.r, Color("a882ff"))
        _text(_weapon_icon(String(obj.weapon)), p + Vector2(-5, 6), 16, Color("ffffff"))
        return

    if obj.type == "repair":
        draw_circle(p, obj.r + 7.0, Color(0.85, 1.0, 0.95, 0.14))
        draw_circle(p, obj.r, Color("d9fff2"))
        draw_rect(Rect2(p - Vector2(3.0, 9.0), Vector2(6.0, 18.0)), Color("187f68"), true)
        draw_rect(Rect2(p - Vector2(9.0, 3.0), Vector2(18.0, 6.0)), Color("187f68"), true)
        return

    if obj.type == "energy":
        var glow := Color(0.2, 1.0, 0.65, 0.17 if obj.hard else 0.12)
        draw_circle(p, obj.r + 6.0, glow)
        draw_circle(p, obj.r, Color("6bffb0"))
        draw_circle(p, obj.r * 0.42, Color("e8fff3"))
        return

    var col := Color("ff426f") if obj.kind != 2 else Color("ffb347")
    if obj.hard:
        col = col.lightened(0.1)
    draw_circle(p, obj.r + 4.0, Color(col.r, col.g, col.b, 0.11))
    if obj.kind == 0:
        draw_circle(p, obj.r, col)
        draw_circle(p, obj.r * 0.48, Color("310a18"))
    elif obj.kind == 1:
        draw_rect(Rect2(p - Vector2(obj.r, obj.r), Vector2(obj.r * 2.0, obj.r * 2.0)), col)
        draw_line(p + Vector2(-obj.r, -obj.r), p + Vector2(obj.r, obj.r), Color("410b1c"), 4.0)
    else:
        draw_colored_polygon(PackedVector2Array([p + Vector2(0,-obj.r), p + Vector2(obj.r,0), p + Vector2(0,obj.r), p + Vector2(-obj.r,0)]), col)

    if obj.has("hp") and float(obj.hp) < float(obj.max_hp):
        var bw := maxf(18.0, float(obj.r) * 1.8)
        var ratio := clampf(float(obj.hp) / float(obj.max_hp), 0.0, 1.0)
        draw_rect(Rect2(Vector2(p.x - bw * 0.5, p.y + obj.r + 7.0), Vector2(bw, 3.0)), Color(0.15,0.15,0.18,0.85), true)
        draw_rect(Rect2(Vector2(p.x - bw * 0.5, p.y + obj.r + 7.0), Vector2(bw * ratio, 3.0)), Color("ffd166"), true)

func _draw_hud() -> void:
    _text("%02d" % int(maxf(0.0, LEVEL_TIME - elapsed)), Vector2(20, 50), 30, Color("f0fbff"))
    _text("L%d  SCORE %06d" % [level, score], Vector2(120, 46), 19, Color("bdeef4"))
    _text("ENERGY %02d" % energy, Vector2(20, 88), 18, Color("6bffb0"))
    _text("x%d" % combo, Vector2(310, 88), 24, Color("ffd166"))

    if lane_event_active:
        var left_hard := not hard_lane_right
        _text("HARD +35%" if left_hard else "EASY", Vector2(55 if left_hard else 72, 122), 15, Color("ff8fa6") if left_hard else Color("82d8e8"))
        _text("HARD +35%" if hard_lane_right else "EASY", Vector2(238 if hard_lane_right else 267, 122), 15, Color("ff8fa6") if hard_lane_right else Color("82d8e8"))
    else:
        _text("OPEN FIELD", Vector2(145, 122), 15, Color("82d8e8"))

    if dash_score_timer > 0.0:
        _text("DASH x2 SCORE", Vector2(134, 146), 16, Color("ffd166"))
    else:
        _text(_weapon_label(current_weapon), Vector2(118, 146), 14, Color("ffd166"))

    for i in 3:
        var c := Color("ff4f78") if i < hp else Color(0.3,0.3,0.38,0.55)
        draw_circle(Vector2(28 + i * 26, 146), 8.0, c)

    var progress := clampf(elapsed / LEVEL_TIME, 0.0, 1.0)
    draw_rect(Rect2(Vector2(20, 169), Vector2(350, 6)), Color(0.2,0.25,0.3,0.7))
    draw_rect(Rect2(Vector2(20, 169), Vector2(350 * progress, 6)), Color("77f7ff"))

func _draw_dash_button() -> void:
    var ready := dash_cooldown <= 0.0
    var fill := Color("123544") if ready else Color(0.12, 0.14, 0.18, 0.86)
    var border := Color("77f7ff") if ready else Color(0.35, 0.42, 0.46, 0.7)
    draw_rect(DASH_RECT, fill, true)
    draw_rect(DASH_RECT, border, false, 3.0)
    _text("DASH" if ready else "%.1f" % dash_cooldown, Vector2(298, 788), 19, Color("f0fbff") if ready else Color("8ea9b8"))

func _draw_title() -> void:
    _text("NEON", Vector2(102, 220), 52, Color("77f7ff"))
    _text("DRIFTLINE", Vector2(54, 276), 47, Color("f0fbff"))
    _text("SURVIVE 30 SEC. SHOP. REPEAT.", Vector2(43, 351), 19, Color("ffd166"))
    _text("LEVEL 1 STARTS LIGHT", Vector2(91, 416), 18, Color("6bffb0"))
    _text("EVERY LEVEL GETS HARDER", Vector2(70, 444), 18, Color("bdeef4"))
    _text("STATION WALLS = INSTANT DEATH", Vector2(55, 476), 16, Color("ff8fa6"))
    _text("SPEND SCORE ON GUNS + REPAIRS", Vector2(50, 506), 16, Color("ffd166"))
    _text("FIELD REPAIRS ARE RARE", Vector2(84, 533), 16, Color("6bffb0"))
    _text("DASH FORWARD = x2 SCORE", Vector2(82, 560), 16, Color("bdeef4"))
    draw_rect(Rect2(Vector2(54, 606), Vector2(282, 76)), Color("123544"), true)
    draw_rect(Rect2(Vector2(54, 606), Vector2(282, 76)), Color("77f7ff"), false, 3.0)
    _text("TAP TO LAUNCH", Vector2(92, 656), 24, Color("f0fbff"))

func _draw_shop_button(rect: Rect2, label: String, cost: int, enabled: bool, owned: bool = false) -> void:
    var fill := Color("17303b") if enabled else Color(0.09, 0.10, 0.13, 0.92)
    var border := Color("77f7ff") if enabled else Color(0.28, 0.32, 0.36, 0.8)
    if owned:
        fill = Color(0.13, 0.20, 0.16, 0.95)
        border = Color("6bffb0")
    draw_rect(rect, fill, true)
    draw_rect(rect, border, false, 2.0)
    var suffix := "OWNED" if owned else ("%d" % cost)
    _text(label, rect.position + Vector2(10, 24), 15, Color("f0fbff"))
    _text(suffix, rect.position + Vector2(10, 47), 14, Color("6bffb0") if owned else Color("ffd166"))

func _draw_shop() -> void:
    draw_rect(Rect2(Vector2.ZERO, Vector2(W, H)), Color("080b14"))
    _text("LEVEL %d CLEAR" % level, Vector2(92, 82), 28, Color("77f7ff"))
    _text("+%d CLEAR BONUS" % last_level_bonus, Vector2(112, 112), 16, Color("6bffb0"))
    _text("SCORE / CREDITS  %06d" % score, Vector2(75, 154), 20, Color("ffd166"))
    _text("HP %d/3   %s" % [hp, _weapon_label(current_weapon)], Vector2(74, 187), 16, Color("bdeef4"))

    var can_repair := hp < 3 and score >= SHOP_REPAIR_COST
    _draw_shop_button(SHOP_REPAIR_RECT, "REPAIR +1 HIT", SHOP_REPAIR_COST, can_repair, hp >= 3)

    _draw_shop_button(SHOP_SINGLE_RECT, "SINGLE D2", SHOP_SINGLE_COST, score >= SHOP_SINGLE_COST and current_weapon != "single", current_weapon == "single")
    _draw_shop_button(SHOP_DUAL_RECT, "DUAL D1x2", SHOP_DUAL_COST, score >= SHOP_DUAL_COST and current_weapon != "dual", current_weapon == "dual")
    _draw_shop_button(SHOP_CONE_RECT, "CONE D3x3", SHOP_CONE_COST, score >= SHOP_CONE_COST and current_weapon != "cone", current_weapon == "cone")
    _draw_shop_button(SHOP_SEEKER_RECT, "SEEKER D7", SHOP_SEEKER_COST, score >= SHOP_SEEKER_COST and current_weapon != "seeker", current_weapon == "seeker")
    _draw_shop_button(SHOP_LASER_RECT, "THIN LASER 3 DPS", SHOP_LASER_COST, score >= SHOP_LASER_COST and current_weapon != "laser", current_weapon == "laser")

    draw_rect(SHOP_CONTINUE_RECT, Color("123544"), true)
    draw_rect(SHOP_CONTINUE_RECT, Color("77f7ff"), false, 3.0)
    _text("START LEVEL %d" % (level + 1), SHOP_CONTINUE_RECT.position + Vector2(71, 43), 21, Color("f0fbff"))
    _text("NEXT LEVEL: MORE SPEED + DENSITY", Vector2(62, 680), 15, Color("ffb347"))
    _text("FIELD REPAIRS ARE RARE", Vector2(92, 710), 15, Color("8ea9b8"))

func _draw_results() -> void:
    draw_rect(Rect2(Vector2(30, 210), Vector2(330, 410)), Color(0.03,0.05,0.09,0.94), true)
    draw_rect(Rect2(Vector2(30, 210), Vector2(330, 410)), Color("77f7ff") if won else Color("ff426f"), false, 3.0)
    _text("EXTRACTION!" if won else "RUN ENDED", Vector2(70 if won else 91, 275), 34, Color("77f7ff") if won else Color("ff6687"))
    _text(result_reason, Vector2(94, 314), 17, Color("8ea9b8"))
    _text("LEVEL  %02d" % level, Vector2(118, 350), 22, Color("bdeef4"))
    _text("SCORE  %07d" % score, Vector2(82, 392), 24, Color("f0fbff"))
    _text("ENERGY %02d" % energy, Vector2(112, 435), 20, Color("6bffb0"))
    _text("BEST COMBO x%d" % best_combo, Vector2(97, 474), 20, Color("ffd166"))
    _text("TAP TO RUN AGAIN", Vector2(80, 560), 22, Color("bdeef4"))

func _text(s: String, pos: Vector2, size: int, color: Color) -> void:
    draw_string(ThemeDB.fallback_font, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size, color)
