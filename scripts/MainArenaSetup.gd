extends "res://scripts/MainArenaVisuals.gd"

const PlayerProfileScript = preload("res://scripts/player/PlayerProfile.gd")
const CREATOR_KEYS := ["body", "skin", "hair_style", "hair_color"]
const CREATOR_LABELS := ["BODY", "SKIN", "HAIR", "HAIR COLOR"]

var player_profile: Dictionary = PlayerProfileScript.default_profile()
var creator_open := true
var profile_name_editing := false

var btn_profile_edit = Rect2(530, 108, 142, 56)
var btn_creator_name = Rect2(150, 458, 410, 58)
var btn_creator_random_name = Rect2(572, 458, 116, 58)
var btn_creator_random_look = Rect2(64, 960, 272, 64)
var btn_creator_done = Rect2(384, 960, 272, 64)

func _ready():
    player_profile = PlayerProfileScript.normalize(player_profile)
    zombie_spawn_count = 8
    btn_setup_start = Rect2(90, 1008, 540, 68)
    btn_setup_exit = Rect2(210, 1092, 300, 50)
    super._ready()

func make_player():
    super.make_player()
    player_profile = PlayerProfileScript.normalize(player_profile)
    player["profile_id"] = str(player_profile["id"])
    player["name"] = str(player_profile["name"])
    player["appearance"] = player_profile["appearance"].duplicate(true)

func _start_dungeon():
    _finish_profile_name_edit()
    creator_open = false
    super._start_dungeon()
    submsg = "%s | Walkers %d  Rippers %d  Brutes %d" % [str(starter_loadouts[selected_starter].family), zombie_spawn_count, ripper_spawn_count, brute_spawn_count]
    queue_redraw()

func _creator_row_y(row: int) -> float:
    return 572.0 + float(row) * 82.0

func _creator_minus_rect(row: int) -> Rect2:
    return Rect2(72, _creator_row_y(row), 72, 58)

func _creator_plus_rect(row: int) -> Rect2:
    return Rect2(576, _creator_row_y(row), 72, 58)

func _begin_profile_name_edit():
    profile_name_editing = true
    var text = str(player_profile.get("name", ""))
    DisplayServer.virtual_keyboard_show(text, Rect2(), DisplayServer.KEYBOARD_TYPE_DEFAULT, 22, text.length(), text.length())
    queue_redraw()

func _finish_profile_name_edit():
    if not profile_name_editing:
        return
    profile_name_editing = false
    player_profile = PlayerProfileScript.normalize(player_profile)
    DisplayServer.virtual_keyboard_hide()
    queue_redraw()

func _random_name():
    if names.is_empty():
        return
    var local_rng = RandomNumberGenerator.new()
    local_rng.seed = int(Time.get_ticks_usec())
    player_profile["name"] = str(names[local_rng.randi_range(0, names.size() - 1)])
    queue_redraw()

func _random_look():
    var local_rng = RandomNumberGenerator.new()
    local_rng.seed = int(Time.get_ticks_usec()) ^ 0x5A17
    var appearance: Dictionary = player_profile["appearance"]
    for key in CREATOR_KEYS:
        var options: Array = PlayerProfileScript.APPEARANCE_OPTIONS[key]
        appearance[key] = local_rng.randi_range(0, options.size() - 1)
    queue_redraw()

func _cycle_appearance(row: int, delta: int):
    if row < 0 or row >= CREATOR_KEYS.size():
        return
    var key = str(CREATOR_KEYS[row])
    var appearance: Dictionary = player_profile["appearance"]
    var options: Array = PlayerProfileScript.APPEARANCE_OPTIONS[key]
    var current = int(appearance.get(key, 0))
    appearance[key] = (current + delta + options.size()) % options.size()
    queue_redraw()

func _handle_creator_key(e: InputEventKey) -> bool:
    if not e.pressed or e.echo:
        return false
    if profile_name_editing:
        var current_name = str(player_profile.get("name", ""))
        if e.keycode == KEY_ENTER:
            _finish_profile_name_edit()
            return true
        if e.keycode == KEY_ESCAPE:
            _finish_profile_name_edit()
            return true
        if e.keycode == KEY_BACKSPACE:
            if not current_name.is_empty():
                player_profile["name"] = current_name.left(current_name.length() - 1)
                queue_redraw()
            return true
        if e.unicode >= 32 and e.unicode != 127:
            if current_name.length() < 22:
                player_profile["name"] = current_name + String.chr(e.unicode)
                queue_redraw()
            return true
        return true
    if e.keycode == KEY_ENTER or e.keycode == KEY_ESCAPE:
        creator_open = false
        queue_redraw()
        return true
    return false

func _unhandled_input(e):
    if setup_open and creator_open and e is InputEventKey:
        if _handle_creator_key(e):
            get_viewport().set_input_as_handled()
            return
    super._unhandled_input(e)

func _handle_creator_touch(pos: Vector2):
    if btn_creator_name.has_point(pos):
        _begin_profile_name_edit()
        return
    if profile_name_editing:
        _finish_profile_name_edit()
    if btn_creator_random_name.has_point(pos):
        _random_name()
        return
    for row in range(CREATOR_KEYS.size()):
        if _creator_minus_rect(row).has_point(pos):
            _cycle_appearance(row, -1)
            return
        if _creator_plus_rect(row).has_point(pos):
            _cycle_appearance(row, 1)
            return
    if btn_creator_random_look.has_point(pos):
        _random_look()
        return
    if btn_creator_done.has_point(pos):
        creator_open = false
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
    if creator_open:
        _handle_creator_touch(pos)
        return
    if btn_profile_edit.has_point(pos):
        creator_open = true
        queue_redraw()
        return
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

func _draw_profile_strip():
    var appearance: Dictionary = player_profile["appearance"]
    var gear: Dictionary = {}
    if selected_starter >= 0 and selected_starter < starter_loadouts.size():
        gear = starter_loadouts[selected_starter]["gear"]
    draw_rect(Rect2(32, 92, 656, 88), Color(.045, .055, .065, .98))
    draw_rect(Rect2(32, 92, 656, 88), Color(.28, .32, .36), false, 1)
    _draw_player_paper_doll(Vector2(66, 136), 1.25, Vector2i(0, -1), appearance, gear)
    draw_string(font, Vector2(100, 123), str(player_profile["name"]).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, 390, 14, Color.WHITE)
    var look = "%s / %s / %s %s" % [
        PlayerProfileScript.appearance_label(appearance, "body"),
        PlayerProfileScript.appearance_label(appearance, "skin"),
        PlayerProfileScript.appearance_label(appearance, "hair_style"),
        PlayerProfileScript.appearance_label(appearance, "hair_color")
    ]
    draw_string(font, Vector2(100, 151), look, HORIZONTAL_ALIGNMENT_LEFT, 410, 10, Color(.67, .72, .76))
    draw_touch_button(btn_profile_edit, "EDIT", false, 12)

func _draw_creator_screen():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(.018, .022, .027, 1.0))
    draw_string(font, Vector2(32, 48), "CREATE SURVIVOR", HORIZONTAL_ALIGNMENT_LEFT, -1, 25, Color.WHITE)
    draw_string(font, Vector2(32, 78), "Appearance is cosmetic. Equipment still creates the build.", HORIZONTAL_ALIGNMENT_LEFT, 656, 12, Color(.72, .76, .80))

    var gear: Dictionary = {}
    var family = "UNARMORED"
    if selected_starter >= 0 and selected_starter < starter_loadouts.size():
        gear = starter_loadouts[selected_starter]["gear"]
        family = str(starter_loadouts[selected_starter]["family"]).to_upper()
    _draw_player_paper_doll(Vector2(360, 268), 5.0, Vector2i(0, -1), player_profile["appearance"], gear)
    draw_string(font, Vector2(0, 402), "%s STARTER PREVIEW" % family, HORIZONTAL_ALIGNMENT_CENTER, SCREEN_W, 12, Color(.95, .80, .36))

    draw_string(font, Vector2(72, 446), "NAME", HORIZONTAL_ALIGNMENT_LEFT, 70, 10, Color(.65, .68, .72))
    draw_rect(btn_creator_name, Color(.055, .065, .075, .98))
    draw_rect(btn_creator_name, Color(.95, .80, .36) if profile_name_editing else Color(.28, .32, .36), false, 2 if profile_name_editing else 1)
    var shown_name = str(player_profile.get("name", ""))
    if profile_name_editing:
        shown_name += "|"
    draw_string(font, Vector2(btn_creator_name.position.x + 12, btn_creator_name.position.y + 36), shown_name, HORIZONTAL_ALIGNMENT_LEFT, btn_creator_name.size.x - 24, 16, Color.WHITE)
    draw_touch_button(btn_creator_random_name, "RND", false, 11)

    var appearance: Dictionary = player_profile["appearance"]
    for row in range(CREATOR_KEYS.size()):
        var key = str(CREATOR_KEYS[row])
        var y = _creator_row_y(row)
        draw_string(font, Vector2(72, y - 10), str(CREATOR_LABELS[row]), HORIZONTAL_ALIGNMENT_LEFT, 180, 10, Color(.65, .68, .72))
        draw_touch_button(_creator_minus_rect(row), "-", false, 20)
        draw_rect(Rect2(164, y, 392, 58), Color(.045, .055, .065, .98))
        draw_rect(Rect2(164, y, 392, 58), Color(.22, .26, .30), false, 1)
        draw_string(font, Vector2(164, y + 36), PlayerProfileScript.appearance_label(appearance, key).to_upper(), HORIZONTAL_ALIGNMENT_CENTER, 392, 14, Color.WHITE)
        draw_touch_button(_creator_plus_rect(row), "+", false, 20)

    draw_touch_button(btn_creator_random_look, "RANDOM LOOK", false, 13)
    draw_touch_button(btn_creator_done, "DONE", false, 16)
    draw_string(font, Vector2(32, 1082), "Tap NAME to type. Hair can be hidden by equipped headgear.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.62, .66, .70))
    draw_string(font, Vector2(32, 1110), "The tactical icon uses this body underneath whatever armor and weapons you equip.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.62, .66, .70))

func draw_setup_screen():
    if creator_open:
        _draw_creator_screen()
        return
    super.draw_setup_screen()
    draw_rect(Rect2(0, 812, SCREEN_W, 410), Color(.018, .022, .027, 1.0))
    draw_string(font, Vector2(32, 824), "CREATURE ROSTER", HORIZONTAL_ALIGNMENT_LEFT, 300, 12, Color(.95, .80, .36))
    draw_string(font, Vector2(420, 824), "TOTAL %d / 40" % _monster_total(), HORIZONTAL_ALIGNMENT_LEFT, 260, 10, Color(.68, .72, .75))
    _draw_monster_setup_row(0, "Walker"); _draw_monster_setup_row(1, "Ripper"); _draw_monster_setup_row(2, "Brute")
    draw_touch_button(btn_setup_start, "GENERATE ARENA", false, 18)
    draw_touch_button(btn_setup_exit, "EXIT", false, 13)
    draw_string(font, Vector2(32, 1160), "4 loot chests. Common / Uncommon / Rare / Enchanted active; Epic disabled.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.65, .68, .72))
    draw_string(font, Vector2(32, 1185), "Open rooms, wide lanes, sparse pillars and gated passages.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.65, .68, .72))
    _draw_profile_strip()
