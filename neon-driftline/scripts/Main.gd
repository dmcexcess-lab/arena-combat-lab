extends Node2D

const W := 390.0
const H := 844.0
const PLAYER_Y := 680.0
const LEFT := 32.0
const RIGHT := 358.0
const RUN_TIME := 60.0
const FINALE_TIME := 50.0
const EXTRACTION_SPAWN_TIME := 53.5
const LANE_SPLIT := W * 0.5
const LEFT_LANE_MIN := LEFT
const LEFT_LANE_MAX := LANE_SPLIT - 7.0
const RIGHT_LANE_MIN := LANE_SPLIT + 7.0
const RIGHT_LANE_MAX := RIGHT
const DASH_RECT := Rect2(278.0, 748.0, 92.0, 64.0)
const DASH_COOLDOWN := 2.4
const DASH_DURATION := 0.14
const DASH_SPEED := 760.0
const DASH_SCORE_DURATION := 0.9
const LANE_EVENT_FIRST := 7.0
const LANE_EVENT_INTERVAL := 10.0
const LANE_EVENT_DURATION := 4.0

var rng := RandomNumberGenerator.new()
var playing := false
var game_over := false
var won := false
var elapsed := 0.0
var score := 0
var energy := 0
var combo := 1
var best_combo := 1
var hp := 3
var player_x := W * 0.5
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
var dash_dir := 1.0
var last_move_dir := 1.0
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
var objects: Array[Dictionary] = []
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

    if dash_timer > 0.0:
        dash_timer = maxf(0.0, dash_timer - game_delta)
        player_x += dash_dir * DASH_SPEED * game_delta
        target_x = player_x
    else:
        player_x = lerpf(player_x, target_x, minf(1.0, game_delta * 13.0))
    player_x = clampf(player_x, LEFT, RIGHT)
    target_x = clampf(target_x, LEFT, RIGHT)

    easy_spawn_clock -= game_delta
    hard_spawn_clock -= game_delta
    neutral_spawn_clock -= game_delta
    pickup_clock -= game_delta
    var difficulty := clampf(elapsed / RUN_TIME, 0.0, 1.0)

    if lane_event_active:
        lane_event_timer = maxf(0.0, lane_event_timer - game_delta)
        if easy_spawn_clock <= 0.0:
            _spawn_hazard(difficulty, false, true)
            easy_spawn_clock = lerpf(0.92, 0.54, difficulty) * rng.randf_range(0.86, 1.17)
        if hard_spawn_clock <= 0.0:
            _spawn_hazard(difficulty, true, true)
            hard_spawn_clock = lerpf(0.61, 0.31, difficulty) * rng.randf_range(0.82, 1.12)
        if lane_event_timer <= 0.0:
            _end_lane_event()
    else:
        if neutral_spawn_clock <= 0.0:
            _spawn_hazard(difficulty, false, false)
            neutral_spawn_clock = lerpf(0.70, 0.38, difficulty) * rng.randf_range(0.84, 1.16)
        if elapsed >= next_lane_event_at and elapsed < FINALE_TIME - 5.0:
            _begin_lane_event()

    if pickup_clock <= 0.0:
        _spawn_pickup()
        pickup_clock = rng.randf_range(1.45, 2.25)

    if elapsed >= FINALE_TIME and not finale_active:
        _begin_finale()
    if elapsed >= EXTRACTION_SPAWN_TIME and not extraction_spawned:
        _spawn_extraction_gate()

    _move_objects(game_delta)
    _move_particles(delta)
    score += int(game_delta * (24.0 + difficulty * 24.0) * combo * _lane_score_multiplier() * _dash_score_multiplier())

    if elapsed >= RUN_TIME + 2.5 and playing:
        result_reason = "EXTRACTION MISSED"
        _finish(false)
    queue_redraw()

func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
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
        if not playing:
            _start_game()
        elif DASH_RECT.has_point(event.position):
            _dash()
        else:
            _set_target(event.position.x)
    elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        if playing and not DASH_RECT.has_point(event.position):
            _set_target(event.position.x)

func _set_target(x: float) -> void:
    var delta_x := x - target_x
    if absf(delta_x) > 2.0:
        last_move_dir = signf(delta_x)
    target_x = clampf(x, LEFT, RIGHT)

func _dash() -> void:
    if not playing or dash_cooldown > 0.0 or dash_timer > 0.0:
        return
    var desired := target_x - player_x
    if absf(desired) > 5.0:
        dash_dir = signf(desired)
    else:
        dash_dir = last_move_dir
    if absf(dash_dir) < 0.5:
        dash_dir = 1.0
    dash_timer = DASH_DURATION
    dash_cooldown = DASH_COOLDOWN
    dash_score_timer = DASH_SCORE_DURATION
    invuln = maxf(invuln, 0.24)
    shake = maxf(shake, 3.5)
    _burst(Vector2(player_x, PLAYER_Y), 10, Color("77f7ff"))
    _play_sfx(dash_sfx)

func _start_game() -> void:
    playing = true
    game_over = false
    won = false
    elapsed = 0.0
    score = 0
    energy = 0
    combo = 1
    best_combo = 1
    hp = 3
    player_x = W * 0.5
    target_x = player_x
    invuln = 0.0
    flash = 0.0
    cyan_flash = 0.0
    shake = 0.0
    easy_spawn_clock = 0.55
    hard_spawn_clock = 0.38
    pickup_clock = 0.9
    neutral_spawn_clock = 0.45
    dash_cooldown = 0.0
    dash_timer = 0.0
    dash_score_timer = 0.0
    dash_dir = 1.0
    last_move_dir = 1.0
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
    objects.clear()
    particles.clear()
    last_near_ids.clear()

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
    return 1.35 if lane_event_active and _is_hard_position(player_x) else 1.0

func _dash_score_multiplier() -> float:
    return 2.0 if dash_score_timer > 0.0 else 1.0

func _begin_lane_event() -> void:
    lane_event_active = true
    lane_event_timer = LANE_EVENT_DURATION
    next_lane_event_at += LANE_EVENT_INTERVAL
    hard_lane_right = rng.randf() < 0.5
    lane_choice_banner_timer = 1.7
    easy_spawn_clock = 0.12
    hard_spawn_clock = 0.08
    shake = maxf(shake, 1.8)

func _end_lane_event() -> void:
    lane_event_active = false
    lane_event_timer = 0.0
    lane_choice_banner_timer = 0.0

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
    var base_speed := rng.randf_range(245.0, 320.0) + difficulty * 115.0
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
    objects.append({
        "id": rng.randi(),
        "type": "hazard",
        "kind": kind,
        "hard": hard_lane and lane_mode,
        "x": x,
        "y": -40.0,
        "r": radius,
        "speed": speed,
        "drift": drift,
        "lane_min": lane_min,
        "lane_max": lane_max
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

        var dy: float = obj.y - PLAYER_Y
        var dx: float = absf(obj.x - player_x)

        if obj.type == "hazard":
            var hit_dist: float = obj.r + 14.0
            if absf(dy) < hit_dist and dx < hit_dist:
                if invuln <= 0.0:
                    _take_hit()
                    _burst(Vector2(obj.x, obj.y), 13, Color("ff426f"))
                continue

            var near_dist: float = obj.r + 40.0
            if obj.y > PLAYER_Y + obj.r and not last_near_ids.has(obj.id):
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
        elif obj.type == "extraction":
            if absf(dy) < 19.0:
                if dx <= obj.half_width - 10.0:
                    _burst(Vector2(player_x, PLAYER_Y), 22, Color("77f7ff"))
                    _finish(true)
                    continue
            if obj.y > PLAYER_Y + 32.0:
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
    _burst(Vector2(player_x, PLAYER_Y), 10, Color("77f7ff"))
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

    if not playing and not game_over:
        _draw_title()
        return

    for obj in objects:
        _draw_object(obj, offset)

    for p in particles:
        var alpha: float = clampf(p.life / p.max, 0.0, 1.0)
        var pc: Color = p.color
        draw_circle(Vector2(p.x, p.y) + offset, 3.0, Color(pc.r, pc.g, pc.b, alpha))

    _draw_player(offset)
    _draw_hud()
    _draw_dash_button()

    if lane_choice_banner_timer > 0.0 and lane_event_active:
        var choice := "LANES!  LEFT EASY | RIGHT HARD" if hard_lane_right else "LANES!  LEFT HARD | RIGHT EASY"
        draw_rect(Rect2(Vector2(38, 192), Vector2(314, 42)), Color(0.02, 0.04, 0.07, 0.92), true)
        _text(choice, Vector2(48, 220), 16, Color("ffd166"))

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

    if lane_event_active:
        var easy_col := Color(0.08, 0.18, 0.22, 0.28)
        var hard_col := Color(0.24, 0.07, 0.12, 0.34 if not finale_active else 0.45)
        var left_col := easy_col if hard_lane_right else hard_col
        var right_col := hard_col if hard_lane_right else easy_col
        draw_rect(Rect2(Vector2(LEFT_LANE_MIN, 0), Vector2(LEFT_LANE_MAX - LEFT_LANE_MIN, H)), left_col)
        draw_rect(Rect2(Vector2(RIGHT_LANE_MIN, 0), Vector2(RIGHT_LANE_MAX - RIGHT_LANE_MIN, H)), right_col)
        draw_line(Vector2(LANE_SPLIT, 0), Vector2(LANE_SPLIT, H), Color(0.45, 0.75, 0.85, 0.35), 3.0)

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

func _draw_player(offset: Vector2) -> void:
    var pos := Vector2(player_x, PLAYER_Y) + offset
    var c := Color("77f7ff") if invuln <= 0.0 or int(Time.get_ticks_msec() / 90) % 2 == 0 else Color(0.4, 0.4, 0.5, 0.5)
    if dash_timer > 0.0:
        draw_line(pos - Vector2(dash_dir * 54.0, 0), pos, Color(0.35, 0.95, 1.0, 0.42), 10.0)
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

func _draw_hud() -> void:
    _text("%02d" % int(maxf(0.0, RUN_TIME - elapsed)), Vector2(20, 50), 30, Color("f0fbff"))
    _text("SCORE %07d" % score, Vector2(145, 46), 20, Color("bdeef4"))
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

    for i in 3:
        var c := Color("ff4f78") if i < hp else Color(0.3,0.3,0.38,0.55)
        draw_circle(Vector2(28 + i * 26, 146), 8.0, c)

    var progress := clampf(elapsed / RUN_TIME, 0.0, 1.0)
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
    _text("SURVIVE. THEN EXTRACT.", Vector2(57, 351), 21, Color("ffd166"))
    _text("LANES APPEAR PERIODICALLY", Vector2(62, 416), 18, Color("ffd166"))
    _text("READ THEM. CHOOSE FAST.", Vector2(82, 444), 18, Color("bdeef4"))
    _text("DASH = x2 SCORE BURST", Vector2(87, 476), 17, Color("ffd166"))
    _text("Drag to steer. Tap DASH to burst.", Vector2(54, 506), 16, Color("bdeef4"))
    _text("Near misses slow time + build combo.", Vector2(48, 533), 16, Color("8ea9b8"))
    _text("At 50 sec: reach the extraction gate.", Vector2(43, 560), 16, Color("8ea9b8"))
    draw_rect(Rect2(Vector2(54, 606), Vector2(282, 76)), Color("123544"), true)
    draw_rect(Rect2(Vector2(54, 606), Vector2(282, 76)), Color("77f7ff"), false, 3.0)
    _text("TAP TO LAUNCH", Vector2(92, 656), 24, Color("f0fbff"))

func _draw_results() -> void:
    draw_rect(Rect2(Vector2(30, 210), Vector2(330, 410)), Color(0.03,0.05,0.09,0.94), true)
    draw_rect(Rect2(Vector2(30, 210), Vector2(330, 410)), Color("77f7ff") if won else Color("ff426f"), false, 3.0)
    _text("EXTRACTION!" if won else "RUN ENDED", Vector2(70 if won else 91, 275), 34, Color("77f7ff") if won else Color("ff6687"))
    _text(result_reason, Vector2(94, 314), 17, Color("8ea9b8"))
    _text("SCORE  %07d" % score, Vector2(82, 370), 24, Color("f0fbff"))
    _text("ENERGY %02d" % energy, Vector2(112, 416), 20, Color("6bffb0"))
    _text("BEST COMBO x%d" % best_combo, Vector2(97, 455), 20, Color("ffd166"))
    _text("TAP TO RUN AGAIN", Vector2(80, 560), 22, Color("bdeef4"))

func _text(s: String, pos: Vector2, size: int, color: Color) -> void:
    draw_string(ThemeDB.fallback_font, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size, color)
