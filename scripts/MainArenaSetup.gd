extends "res://scripts/MainArenaVisuals.gd"

func _ready():
    zombie_spawn_count = 8
    btn_setup_start = Rect2(90, 1008, 540, 68)
    btn_setup_exit = Rect2(210, 1092, 300, 50)
    super._ready()

func _start_dungeon():
    super._start_dungeon()
    submsg = "%s | Walkers %d  Rippers %d  Brutes %d" % [str(starter_loadouts[selected_starter].family), zombie_spawn_count, ripper_spawn_count, brute_spawn_count]
    queue_redraw()

func _monster_row_y(row: int) -> float: return 832.0 + float(row) * 52.0
func _monster_minus_rect(row: int) -> Rect2: return Rect2(536, _monster_row_y(row) + 4, 42, 40)
func _monster_plus_rect(row: int) -> Rect2: return Rect2(646, _monster_row_y(row) + 4, 42, 40)
func _monster_count(row: int) -> int:
    if row == 1: return ripper_spawn_count
    if row == 2: return brute_spawn_count
    return zombie_spawn_count
func _set_monster_count(row: int, value: int):
    value = clampi(value, 0, 40)
    if row == 1: ripper_spawn_count = value
    elif row == 2: brute_spawn_count = value
    else: zombie_spawn_count = value
func _monster_total() -> int: return zombie_spawn_count + ripper_spawn_count + brute_spawn_count
func _adjust_monster_count(row: int, delta: int):
    if delta > 0 and _monster_total() >= 40:
        msg = "Arena roster limit is 40 creatures."
        queue_redraw(); return
    _set_monster_count(row, _monster_count(row) + delta)
    queue_redraw()

func _handle_setup_touch(pos: Vector2):
    for row in range(3):
        if _monster_minus_rect(row).has_point(pos): _adjust_monster_count(row, -1); return
        if _monster_plus_rect(row).has_point(pos): _adjust_monster_count(row, 1); return
    if pos.y < 812 or btn_setup_start.has_point(pos) or btn_setup_exit.has_point(pos):
        super._handle_setup_touch(pos)

func _draw_monster_setup_row(row: int, kind: String):
    var data = _creature_def(kind)
    var y = _monster_row_y(row)
    _draw_creature_icon(kind, Vector2(52, y + 24))
    draw_string(font, Vector2(82, y + 18), kind.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, 95, 14, Color.WHITE)
    draw_string(font, Vector2(174, y + 17), str(data.desc), HORIZONTAL_ALIGNMENT_LEFT, 340, 10, Color(.74, .78, .81))
    draw_string(font, Vector2(82, y + 39), "HP %d HIT %d%% DMG %d-%d MOVE %dt AI %d" % [int(data.hp), int(round(float(data.hit) * 100.0)), int(data.dmin), int(data.dmax), int(data.move), int(data.ai)], HORIZONTAL_ALIGNMENT_LEFT, 430, 9, Color(.61, .66, .70))
    draw_touch_button(_monster_minus_rect(row), "-", false, 19)
    draw_string(font, Vector2(580, y + 31), str(_monster_count(row)), HORIZONTAL_ALIGNMENT_CENTER, 64, 18, Color.WHITE)
    draw_touch_button(_monster_plus_rect(row), "+", false, 19)

func draw_setup_screen():
    super.draw_setup_screen()
    draw_rect(Rect2(0, 812, SCREEN_W, 410), Color(.018, .022, .027, 1.0))
    draw_string(font, Vector2(32, 824), "CREATURE ROSTER", HORIZONTAL_ALIGNMENT_LEFT, 300, 12, Color(.95, .80, .36))
    draw_string(font, Vector2(420, 824), "TOTAL %d / 40" % _monster_total(), HORIZONTAL_ALIGNMENT_LEFT, 260, 10, Color(.68, .72, .75))
    _draw_monster_setup_row(0, "Walker"); _draw_monster_setup_row(1, "Ripper"); _draw_monster_setup_row(2, "Brute")
    draw_touch_button(btn_setup_start, "GENERATE ARENA", false, 18)
    draw_touch_button(btn_setup_exit, "EXIT", false, 13)
    draw_string(font, Vector2(32, 1160), "4 loot chests. Common / Uncommon / Rare / Enchanted active; Epic disabled.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.65, .68, .72))
    draw_string(font, Vector2(32, 1185), "Open rooms, wide lanes, sparse pillars and gated passages.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.65, .68, .72))
