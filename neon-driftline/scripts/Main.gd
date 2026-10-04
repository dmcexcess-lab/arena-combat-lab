extends Node2D

const W := 390.0
const H := 844.0
const PLAYER_Y := 680.0
const LEFT := 32.0
const RIGHT := 358.0
const RUN_TIME := 60.0

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
var spawn_clock := 0.0
var pickup_clock := 0.0
var shake := 0.0
var objects: Array[Dictionary] = []
var particles: Array[Dictionary] = []
var last_near_ids: Dictionary = {}

func _ready() -> void:
    rng.randomize()
    set_process(true)
    queue_redraw()

func _process(delta: float) -> void:
    if not playing:
        queue_redraw()
        return
    elapsed += delta
    invuln = maxf(0.0, invuln - delta)
    flash = maxf(0.0, flash - delta)
    shake = maxf(0.0, shake - delta * 28.0)
    player_x = lerpf(player_x, target_x, minf(1.0, delta * 13.0))
    target_x = clampf(target_x, LEFT, RIGHT)
    spawn_clock -= delta
    pickup_clock -= delta
    var difficulty := clampf(elapsed / RUN_TIME, 0.0, 1.0)
    if spawn_clock <= 0.0:
        _spawn_hazard(difficulty)
        spawn_clock = lerpf(0.64, 0.28, difficulty) * rng.randf_range(0.82, 1.18)
    if pickup_clock <= 0.0:
        _spawn_pickup()
        pickup_clock = rng.randf_range(1.6, 2.5)
    _move_objects(delta)
    _move_particles(delta)
    score += int(delta * (20.0 + difficulty * 20.0) * combo)
    if elapsed >= RUN_TIME:
        _finish(true)
    queue_redraw()

func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            if not playing:
                _start_game()
            else:
                target_x = event.position.x
    elif event is InputEventScreenDrag:
        if playing:
            target_x = event.position.x
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
        if not playing:
            _start_game()
        else:
            target_x = event.position.x
    elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        if playing:
            target_x = event.position.x

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
    spawn_clock = 0.45
    pickup_clock = 1.0
    objects.clear()
    particles.clear()
    last_near_ids.clear()

func _finish(success: bool) -> void:
    playing = false
    game_over = true
    won = success
    if success:
        score += energy * 250 + hp * 1000
    queue_redraw()

func _spawn_hazard(difficulty: float) -> void:
    var kind := rng.randi_range(0, 2 if difficulty > 0.45 else 1)
    var radius := rng.randf_range(18.0, 28.0)
    var speed := rng.randf_range(250.0, 335.0) + difficulty * 120.0
    var x := rng.randf_range(LEFT + radius, RIGHT - radius)
    var drift := 0.0
    if kind == 1:
        drift = rng.randf_range(-75.0, 75.0)
    elif kind == 2:
        radius = rng.randf_range(11.0, 16.0)
        speed += 90.0
    objects.append({"id": rng.randi(), "type": "hazard", "kind": kind, "x": x, "y": -40.0, "r": radius, "speed": speed, "drift": drift})

func _spawn_pickup() -> void:
    objects.append({"id": rng.randi(), "type": "energy", "x": rng.randf_range(LEFT + 16.0, RIGHT - 16.0), "y": -30.0, "r": 12.0, "speed": rng.randf_range(225.0, 280.0), "drift": rng.randf_range(-18.0, 18.0)})

func _move_objects(delta: float) -> void:
    var next: Array[Dictionary] = []
    for obj in objects:
        obj.y += obj.speed * delta
        obj.x += obj.drift * delta
        if obj.x < LEFT + obj.r or obj.x > RIGHT - obj.r:
            obj.drift *= -1.0
            obj.x = clampf(obj.x, LEFT + obj.r, RIGHT - obj.r)
        var dy: float = obj.y - PLAYER_Y
        var dx: float = absf(obj.x - player_x)
        if obj.type == "hazard":
            var hit_dist: float = obj.r + 14.0
            if absf(dy) < hit_dist and dx < hit_dist:
                if invuln <= 0.0:
                    _take_hit()
                    _burst(Vector2(obj.x, obj.y), 12)
                continue
            var near_dist: float = obj.r + 37.0
            if obj.y > PLAYER_Y + obj.r and not last_near_ids.has(obj.id):
                last_near_ids[obj.id] = true
                if dx < near_dist:
                    combo = mini(combo + 1, 8)
                    best_combo = maxi(best_combo, combo)
                    score += 150 * combo
                    _burst(Vector2(player_x, PLAYER_Y), 5)
        else:
            if absf(dy) < obj.r + 18.0 and dx < obj.r + 20.0:
                energy += 1
                score += 300 * combo
                combo = mini(combo + 1, 8)
                best_combo = maxi(best_combo, combo)
                _burst(Vector2(obj.x, obj.y), 8)
                continue
        if obj.y < H + 60.0:
            next.append(obj)
    objects = next

func _take_hit() -> void:
    hp -= 1
    combo = 1
    invuln = 1.0
    flash = 0.22
    shake = 7.0
    if hp <= 0:
        _finish(false)

func _burst(pos: Vector2, count: int) -> void:
    for i in count:
        var a := rng.randf_range(0.0, TAU)
        var s := rng.randf_range(55.0, 150.0)
        particles.append({"x": pos.x, "y": pos.y, "vx": cos(a) * s, "vy": sin(a) * s, "life": rng.randf_range(0.22, 0.5), "max": 0.5})

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
        draw_circle(Vector2(p.x, p.y) + offset, 3.0, Color(0.35, 0.95, 1.0, alpha))
    _draw_player(offset)
    _draw_hud()
    if flash > 0.0:
        draw_rect(Rect2(Vector2.ZERO, Vector2(W, H)), Color(1.0, 0.2, 0.35, flash * 1.8))
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
        var y := float(i) * 72.0 - fmod(t * 170.0, 72.0)
        draw_line(Vector2(190, y), Vector2(200, y), Color(0.2, 0.8, 0.95, 0.18), 2.0)

func _draw_player(offset: Vector2) -> void:
    var pos := Vector2(player_x, PLAYER_Y) + offset
    var c := Color("77f7ff") if invuln <= 0.0 or int(Time.get_ticks_msec() / 90) % 2 == 0 else Color(0.4, 0.4, 0.5, 0.5)
    draw_circle(pos, 20.0, Color(0.2, 0.9, 1.0, 0.12))
    draw_colored_polygon(PackedVector2Array([pos + Vector2(0,-18), pos + Vector2(13,15), pos, pos + Vector2(-13,15)]), c)
    draw_line(pos + Vector2(0, 18), pos + Vector2(0, 38), Color(0.3, 0.85, 1.0, 0.35), 5.0)

func _draw_object(obj: Dictionary, offset: Vector2) -> void:
    var p := Vector2(obj.x, obj.y) + offset
    if obj.type == "energy":
        draw_circle(p, obj.r + 6.0, Color(0.2, 1.0, 0.65, 0.12))
        draw_circle(p, obj.r, Color("6bffb0"))
        draw_circle(p, obj.r * 0.42, Color("e8fff3"))
        return
    var col := Color("ff426f") if obj.kind != 2 else Color("ffb347")
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
    for i in 3:
        var c := Color("ff4f78") if i < hp else Color(0.3,0.3,0.38,0.55)
        draw_circle(Vector2(28 + i * 26, 122), 8.0, c)
    var progress := clampf(elapsed / RUN_TIME, 0.0, 1.0)
    draw_rect(Rect2(Vector2(20, 145), Vector2(350, 6)), Color(0.2,0.25,0.3,0.7))
    draw_rect(Rect2(Vector2(20, 145), Vector2(350 * progress, 6)), Color("77f7ff"))

func _draw_title() -> void:
    _text("NEON", Vector2(102, 238), 52, Color("77f7ff"))
    _text("DRIFTLINE", Vector2(54, 294), 47, Color("f0fbff"))
    _text("SURVIVE 60 SECONDS", Vector2(82, 372), 21, Color("ffd166"))
    _text("DRAG LEFT / RIGHT", Vector2(92, 438), 20, Color("bdeef4"))
    _text("Collect green energy. Skim hazards", Vector2(48, 486), 16, Color("8ea9b8"))
    _text("for multipliers. Three hits ends the run.", Vector2(34, 511), 16, Color("8ea9b8"))
    draw_rect(Rect2(Vector2(54, 590), Vector2(282, 76)), Color("123544"), true)
    draw_rect(Rect2(Vector2(54, 590), Vector2(282, 76)), Color("77f7ff"), false, 3.0)
    _text("TAP TO LAUNCH", Vector2(92, 640), 24, Color("f0fbff"))

func _draw_results() -> void:
    draw_rect(Rect2(Vector2(30, 210), Vector2(330, 410)), Color(0.03,0.05,0.09,0.94), true)
    draw_rect(Rect2(Vector2(30, 210), Vector2(330, 410)), Color("77f7ff") if won else Color("ff426f"), false, 3.0)
    _text("EXTRACTION!" if won else "SIGNAL LOST", Vector2(70 if won else 78, 275), 34, Color("77f7ff") if won else Color("ff6687"))
    _text("SCORE  %07d" % score, Vector2(82, 350), 24, Color("f0fbff"))
    _text("ENERGY %02d" % energy, Vector2(112, 396), 20, Color("6bffb0"))
    _text("BEST COMBO x%d" % best_combo, Vector2(97, 435), 20, Color("ffd166"))
    _text("TAP TO RUN AGAIN", Vector2(80, 560), 22, Color("bdeef4"))

func _text(s: String, pos: Vector2, size: int, color: Color) -> void:
    draw_string(ThemeDB.fallback_font, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, size, color)
