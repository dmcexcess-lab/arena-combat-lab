extends "res://scripts/MainArenaVisuals.gd"

const PlayerProfileScript = preload("res://scripts/player/PlayerProfile.gd")
const DevGearFactoryScript = preload("res://scripts/dev/DevGearFactory.gd")
const CreatureCatalog = preload("res://scripts/catalogs/CreatureCatalog.gd")

const DEV_PAGES := ["CHARACTER", "GEAR", "CREATURES", "SUMMARY"]
const CREATOR_KEYS := ["body", "skin", "hair_style", "hair_color"]
const CREATOR_LABELS := ["BODY", "SKIN", "HAIR", "HAIR COLOR"]
const CREATURES_PER_PAGE := 5
const MAX_DEV_CREATURES := 40

var player_profile: Dictionary = PlayerProfileScript.default_profile()
var dev_page := 0
var creature_page := 0
var dev_spawn_items: Array = []
var dev_rng: RandomNumberGenerator
var dev_factory
var name_editor: LineEdit

var random_rarity_index := 0
var custom_family_index := 0
var custom_slot_index := 0
var custom_base_index := 0
var custom_rarity_index := 0
var custom_bonus_stats := {"Might":0, "Finesse":0, "Awareness":0, "Vitality":0, "Will":0}
var custom_properties: Array[String] = ["", ""]
var custom_feats: Array[String] = ["", ""]

var btn_creator_name = Rect2(150, 458, 410, 58)
var btn_creator_random_name = Rect2(572, 458, 116, 58)
var btn_creator_random_look = Rect2(64, 960, 272, 64)
var btn_creator_next = Rect2(384, 960, 272, 64)
var btn_random_spawn = Rect2(384, 350, 288, 58)
var btn_clear_queue = Rect2(48, 1166, 250, 58)
var btn_custom_spawn = Rect2(322, 1166, 350, 58)
var btn_creature_prev = Rect2(50, 1035, 160, 56)
var btn_creature_next = Rect2(510, 1035, 160, 56)
var btn_creature_summary = Rect2(180, 1120, 360, 64)
var btn_summary_generate = Rect2(90, 1090, 540, 72)
var btn_summary_exit = Rect2(210, 1180, 300, 52)

func _ready():
    zombie_spawn_count = 8
    super._ready()
    dev_rng = RandomNumberGenerator.new()
    dev_rng.seed = int(Time.get_ticks_usec()) ^ 0xD3A5C0DE
    dev_factory = DevGearFactoryScript.new(gear_core, dev_rng)
    _create_name_editor()
    _sanitize_custom_parameters()
    _update_name_editor_visibility()

func _open_setup():
    open_dev_screen(true)

func open_dev_screen(reset_character: bool = true):
    setup_open = true
    run_started = false
    menu_open = false
    character_open = false
    game_over = false
    won = false
    dev_page = 0
    creature_page = 0
    if starter_loadouts.is_empty():
        _roll_starting_loadouts()
    if reset_character:
        player_profile = PlayerProfileScript.default_profile()
        selected_starter = 0
        dev_spawn_items.clear()
        creature_spawn_counts = CreatureCatalog.default_roster()
        custom_family_index = 0
        custom_slot_index = 0
        custom_base_index = 0
        custom_rarity_index = 0
        random_rarity_index = 0
        custom_bonus_stats = {"Might":0, "Finesse":0, "Awareness":0, "Vitality":0, "Will":0}
        custom_properties = ["", ""]
        custom_feats = ["", ""]
    _sync_name_editor()
    _update_name_editor_visibility()
    queue_redraw()

func make_player():
    super.make_player()
    player_profile = PlayerProfileScript.normalize(player_profile)
    player["profile_id"] = str(player_profile["id"])
    player["name"] = str(player_profile["name"])
    player["appearance"] = player_profile["appearance"].duplicate(true)
    for item in dev_spawn_items:
        inventory.append(item.duplicate(true))

func _start_dungeon():
    _commit_name_editor()
    dev_page = DEV_PAGES.size() - 1
    _update_name_editor_visibility()
    super._start_dungeon()
    submsg = "%s | %d creatures | %d dev items" % [_current_starter_family(), _creature_total(), dev_spawn_items.size()]
    queue_redraw()

func _create_name_editor():
    name_editor = LineEdit.new()
    name_editor.position = btn_creator_name.position
    name_editor.size = btn_creator_name.size
    name_editor.max_length = 22
    name_editor.placeholder_text = "Survivor name"
    name_editor.virtual_keyboard_enabled = true
    name_editor.virtual_keyboard_show_on_focus = true
    name_editor.keep_editing_on_text_submit = false
    name_editor.focus_mode = Control.FOCUS_ALL
    name_editor.z_index = 20
    name_editor.add_theme_font_size_override("font_size", 18)
    name_editor.text = str(player_profile.get("name", ""))
    name_editor.text_changed.connect(_on_name_changed)
    name_editor.text_submitted.connect(_on_name_submitted)
    add_child(name_editor)

func _on_name_changed(text: String):
    player_profile["name"] = text
    queue_redraw()

func _on_name_submitted(_text: String):
    _commit_name_editor()

func _sync_name_editor():
    if not is_instance_valid(name_editor):
        return
    var text = str(player_profile.get("name", ""))
    if name_editor.text != text:
        name_editor.text = text

func _commit_name_editor():
    if is_instance_valid(name_editor):
        player_profile["name"] = name_editor.text
        name_editor.unedit()
        name_editor.release_focus()
    player_profile = PlayerProfileScript.normalize(player_profile)
    _sync_name_editor()

func _update_name_editor_visibility():
    if not is_instance_valid(name_editor):
        return
    var should_show = setup_open and dev_page == 0
    name_editor.visible = should_show
    if not should_show and name_editor.has_focus():
        name_editor.unedit()
        name_editor.release_focus()

func _set_dev_page(page: int):
    _commit_name_editor()
    dev_page = clampi(page, 0, DEV_PAGES.size() - 1)
    _update_name_editor_visibility()
    queue_redraw()

func _tab_rect(index: int) -> Rect2:
    return Rect2(24 + index * 170, 96, 160, 52)

func _creator_row_y(row: int) -> float:
    return 572.0 + float(row) * 82.0

func _creator_minus_rect(row: int) -> Rect2:
    return Rect2(72, _creator_row_y(row), 72, 58)

func _creator_plus_rect(row: int) -> Rect2:
    return Rect2(576, _creator_row_y(row), 72, 58)

func _random_name():
    if not is_instance_valid(dev_rng):
        dev_rng = RandomNumberGenerator.new()
        dev_rng.seed = int(Time.get_ticks_usec())
    player_profile["name"] = PlayerProfileScript.random_fantasy_name(dev_rng)
    _sync_name_editor()
    queue_redraw()

func _random_look():
    if not is_instance_valid(dev_rng):
        return
    var appearance: Dictionary = player_profile["appearance"]
    for key in CREATOR_KEYS:
        var options: Array = PlayerProfileScript.APPEARANCE_OPTIONS[key]
        appearance[key] = dev_rng.randi_range(0, options.size() - 1)
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

func _creator_preview_gear() -> Dictionary:
    var gear: Dictionary = {}
    if selected_starter >= 0 and selected_starter < starter_loadouts.size():
        gear = starter_loadouts[selected_starter]["gear"].duplicate(true)
        gear.erase("Head")
    return gear

func _current_starter_family() -> String:
    if selected_starter < 0 or selected_starter >= starter_loadouts.size():
        return "UNARMORED"
    return str(starter_loadouts[selected_starter]["family"]).to_upper()

func _starter_family_rect(index: int) -> Rect2:
    return Rect2(32 + index * 166, 178, 158, 52)

func _select_minus_rect(y: float) -> Rect2:
    return Rect2(48, y, 64, 52)

func _select_plus_rect(y: float) -> Rect2:
    return Rect2(608, y, 64, 52)

func _select_value_rect(y: float) -> Rect2:
    return Rect2(124, y, 472, 52)

func _current_random_rarity() -> String:
    return str(DevGearFactoryScript.RARITIES[clampi(random_rarity_index, 0, DevGearFactoryScript.RARITIES.size() - 1)])

func _custom_families() -> Array:
    return dev_factory.families() if dev_factory != null else ["Stealth", "Ranged", "Guard", "Ravager"]

func _custom_family() -> String:
    var families = _custom_families()
    custom_family_index = clampi(custom_family_index, 0, max(0, families.size() - 1))
    return str(families[custom_family_index])

func _custom_slots() -> Array:
    return dev_factory.slots_for_family(_custom_family()) if dev_factory != null else []

func _custom_slot() -> String:
    var slots = _custom_slots()
    if slots.is_empty():
        return ""
    custom_slot_index = clampi(custom_slot_index, 0, slots.size() - 1)
    return str(slots[custom_slot_index])

func _custom_bases() -> Array:
    return dev_factory.bases_for(_custom_family(), _custom_slot()) if dev_factory != null else []

func _custom_base() -> String:
    var bases = _custom_bases()
    if bases.is_empty():
        return ""
    custom_base_index = clampi(custom_base_index, 0, bases.size() - 1)
    return str(bases[custom_base_index])

func _current_custom_rarity() -> String:
    return str(DevGearFactoryScript.RARITIES[clampi(custom_rarity_index, 0, DevGearFactoryScript.RARITIES.size() - 1)])

func _custom_options() -> Dictionary:
    if dev_factory == null or _custom_base() == "":
        return {"stat_budget":0, "property_budget":0, "feat_budget":0, "properties":[], "feats":[]}
    return dev_factory.parameter_options(_custom_base(), _current_custom_rarity())

func _sanitize_custom_parameters():
    if dev_factory == null:
        return
    var slots = _custom_slots()
    if slots.is_empty():
        return
    custom_slot_index = clampi(custom_slot_index, 0, slots.size() - 1)
    var bases = _custom_bases()
    if bases.is_empty():
        return
    custom_base_index = clampi(custom_base_index, 0, bases.size() - 1)
    var options = _custom_options()
    var stat_budget = int(options["stat_budget"])
    var total = 0
    for stat in ATTR_NAMES:
        custom_bonus_stats[stat] = clampi(int(custom_bonus_stats.get(stat, 0)), 0, 2)
        total += int(custom_bonus_stats[stat])
    if total > stat_budget:
        for i in range(ATTR_NAMES.size() - 1, -1, -1):
            var stat = str(ATTR_NAMES[i])
            while total > stat_budget and int(custom_bonus_stats[stat]) > 0:
                custom_bonus_stats[stat] = int(custom_bonus_stats[stat]) - 1
                total -= 1
    var legal_props: Array = options["properties"]
    var property_budget = int(options["property_budget"])
    for i in range(2):
        if i >= property_budget or custom_properties[i] not in legal_props or (i == 1 and custom_properties[i] == custom_properties[0]):
            custom_properties[i] = ""
    var legal_feats: Array = options["feats"]
    var feat_budget = int(options["feat_budget"])
    for i in range(2):
        if i >= feat_budget or custom_feats[i] not in legal_feats or (i == 1 and custom_feats[i] == custom_feats[0]):
            custom_feats[i] = ""

func _cycle_random_rarity(delta: int):
    random_rarity_index = (random_rarity_index + delta + DevGearFactoryScript.RARITIES.size()) % DevGearFactoryScript.RARITIES.size()
    queue_redraw()

func _cycle_custom_family(delta: int):
    var families = _custom_families()
    custom_family_index = (custom_family_index + delta + families.size()) % families.size()
    custom_slot_index = 0
    custom_base_index = 0
    _sanitize_custom_parameters()
    queue_redraw()

func _cycle_custom_slot(delta: int):
    var slots = _custom_slots()
    if slots.is_empty():
        return
    custom_slot_index = (custom_slot_index + delta + slots.size()) % slots.size()
    custom_base_index = 0
    _sanitize_custom_parameters()
    queue_redraw()

func _cycle_custom_base(delta: int):
    var bases = _custom_bases()
    if bases.is_empty():
        return
    custom_base_index = (custom_base_index + delta + bases.size()) % bases.size()
    _sanitize_custom_parameters()
    queue_redraw()

func _cycle_custom_rarity(delta: int):
    custom_rarity_index = (custom_rarity_index + delta + DevGearFactoryScript.RARITIES.size()) % DevGearFactoryScript.RARITIES.size()
    _sanitize_custom_parameters()
    queue_redraw()

func _custom_stat_rect(index: int) -> Rect2:
    return Rect2(32 + index * 132, 760, 120, 54)

func _cycle_custom_stat(index: int):
    if index < 0 or index >= ATTR_NAMES.size():
        return
    var options = _custom_options()
    var budget = int(options["stat_budget"])
    var stat = str(ATTR_NAMES[index])
    var current = int(custom_bonus_stats.get(stat, 0))
    var next = (current + 1) % 3
    var total = 0
    for name in ATTR_NAMES:
        total += int(custom_bonus_stats.get(name, 0))
    if total - current + next > budget:
        if current > 0:
            next = 0
        else:
            msg = "Custom stat budget is %d for %s." % [budget, _current_custom_rarity()]
            queue_redraw()
            return
    custom_bonus_stats[stat] = next
    queue_redraw()

func _cycle_custom_property(index: int, delta: int):
    var options = _custom_options()
    if index >= int(options["property_budget"]):
        return
    var values: Array = [""]
    values.append_array(options["properties"])
    if values.size() <= 1:
        return
    var current = values.find(custom_properties[index])
    if current < 0:
        current = 0
    for tries in range(values.size()):
        current = (current + delta + values.size()) % values.size()
        var candidate = str(values[current])
        if candidate == "" or candidate != custom_properties[1 - index]:
            custom_properties[index] = candidate
            break
    queue_redraw()

func _cycle_custom_feat(index: int, delta: int):
    var options = _custom_options()
    if index >= int(options["feat_budget"]):
        return
    var values: Array = [""]
    values.append_array(options["feats"])
    if values.size() <= 1:
        return
    var current = values.find(custom_feats[index])
    if current < 0:
        current = 0
    for tries in range(values.size()):
        current = (current + delta + values.size()) % values.size()
        var candidate = str(values[current])
        if candidate == "" or candidate != custom_feats[1 - index]:
            custom_feats[index] = candidate
            break
    queue_redraw()

func _spawn_random_item():
    if dev_factory == null:
        return
    var item: Dictionary = dev_factory.random_item(_current_random_rarity())
    dev_spawn_items.append(item)
    msg = "Queued %s" % str(item["name"])
    queue_redraw()

func _spawn_custom_item():
    if dev_factory == null or _custom_base() == "":
        return
    var item: Dictionary = dev_factory.make_custom(_custom_base(), _current_custom_rarity(), custom_bonus_stats, custom_properties, custom_feats)
    dev_spawn_items.append(item)
    msg = "Queued custom %s" % str(item["name"])
    queue_redraw()

func _clear_dev_items():
    dev_spawn_items.clear()
    msg = "Dev gear queue cleared."
    queue_redraw()

func _creature_kinds() -> Array:
    return CreatureCatalog.kinds()

func _creature_page_count() -> int:
    return max(1, int(ceil(float(_creature_kinds().size()) / float(CREATURES_PER_PAGE))))

func _creature_row_y(row: int) -> float:
    return 190.0 + float(row) * 154.0

func _creature_minus_rect(row: int) -> Rect2:
    return Rect2(536, _creature_row_y(row) + 35, 52, 50)

func _creature_plus_rect(row: int) -> Rect2:
    return Rect2(632, _creature_row_y(row) + 35, 52, 50)

func _creature_total() -> int:
    var total = 0
    for kind in _creature_kinds():
        total += int(creature_spawn_counts.get(kind, 0))
    return total

func _adjust_creature(kind: String, delta: int):
    var current = int(creature_spawn_counts.get(kind, 0))
    if delta > 0 and _creature_total() >= MAX_DEV_CREATURES:
        msg = "Arena roster limit is %d creatures." % MAX_DEV_CREATURES
        queue_redraw()
        return
    creature_spawn_counts[kind] = clampi(current + delta, 0, MAX_DEV_CREATURES)
    queue_redraw()

func _roster_summary_parts() -> Array[String]:
    var parts: Array[String] = []
    for kind in _creature_kinds():
        var count = int(creature_spawn_counts.get(kind, 0))
        if count > 0:
            parts.append("%s %d" % [kind, count])
    return parts

func _handle_character_touch(pos: Vector2):
    if btn_creator_name.has_point(pos):
        name_editor.visible = true
        name_editor.grab_focus()
        name_editor.edit()
        return
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
    if btn_creator_next.has_point(pos):
        _set_dev_page(1)

func _handle_gear_touch(pos: Vector2):
    for i in range(starter_loadouts.size()):
        if _starter_family_rect(i).has_point(pos):
            selected_starter = i
            queue_redraw()
            return
    if _select_minus_rect(284).has_point(pos): _cycle_random_rarity(-1); return
    if _select_plus_rect(284).has_point(pos): _cycle_random_rarity(1); return
    if btn_random_spawn.has_point(pos): _spawn_random_item(); return
    if _select_minus_rect(472).has_point(pos): _cycle_custom_family(-1); return
    if _select_plus_rect(472).has_point(pos): _cycle_custom_family(1); return
    if _select_minus_rect(536).has_point(pos): _cycle_custom_slot(-1); return
    if _select_plus_rect(536).has_point(pos): _cycle_custom_slot(1); return
    if _select_minus_rect(600).has_point(pos): _cycle_custom_base(-1); return
    if _select_plus_rect(600).has_point(pos): _cycle_custom_base(1); return
    if _select_minus_rect(664).has_point(pos): _cycle_custom_rarity(-1); return
    if _select_plus_rect(664).has_point(pos): _cycle_custom_rarity(1); return
    for i in range(ATTR_NAMES.size()):
        if _custom_stat_rect(i).has_point(pos):
            _cycle_custom_stat(i)
            return
    for row in range(2):
        var py = 852.0 + row * 64.0
        if _select_minus_rect(py).has_point(pos): _cycle_custom_property(row, -1); return
        if _select_plus_rect(py).has_point(pos): _cycle_custom_property(row, 1); return
        var fy = 980.0 + row * 64.0
        if _select_minus_rect(fy).has_point(pos): _cycle_custom_feat(row, -1); return
        if _select_plus_rect(fy).has_point(pos): _cycle_custom_feat(row, 1); return
    if btn_clear_queue.has_point(pos): _clear_dev_items(); return
    if btn_custom_spawn.has_point(pos): _spawn_custom_item(); return

func _handle_creature_touch(pos: Vector2):
    var kinds = _creature_kinds()
    var start = creature_page * CREATURES_PER_PAGE
    for row in range(CREATURES_PER_PAGE):
        var index = start + row
        if index >= kinds.size():
            break
        var kind = str(kinds[index])
        if _creature_minus_rect(row).has_point(pos): _adjust_creature(kind, -1); return
        if _creature_plus_rect(row).has_point(pos): _adjust_creature(kind, 1); return
    if btn_creature_prev.has_point(pos):
        creature_page = max(0, creature_page - 1); queue_redraw(); return
    if btn_creature_next.has_point(pos):
        creature_page = min(_creature_page_count() - 1, creature_page + 1); queue_redraw(); return
    if btn_creature_summary.has_point(pos):
        _set_dev_page(3)

func _handle_summary_touch(pos: Vector2):
    if btn_summary_generate.has_point(pos):
        _start_dungeon()
        return
    if btn_summary_exit.has_point(pos):
        exit_to_google()

func _handle_setup_touch(pos: Vector2):
    for i in range(DEV_PAGES.size()):
        if _tab_rect(i).has_point(pos):
            _set_dev_page(i)
            return
    if dev_page == 0:
        _handle_character_touch(pos)
    elif dev_page == 1:
        _handle_gear_touch(pos)
    elif dev_page == 2:
        _handle_creature_touch(pos)
    else:
        _handle_summary_touch(pos)

func _unhandled_input(e):
    if setup_open and e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_ENTER:
        if dev_page < DEV_PAGES.size() - 1:
            _set_dev_page(dev_page + 1)
        else:
            _start_dungeon()
        get_viewport().set_input_as_handled()
        return
    super._unhandled_input(e)

func _draw_dev_header():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(.018, .022, .027, 1.0))
    draw_string(font, Vector2(28, 48), "ARENA DEVELOPER SCREEN", HORIZONTAL_ALIGNMENT_LEFT, 660, 24, Color.WHITE)
    draw_string(font, Vector2(28, 76), "Future prison entry point: open_dev_screen()", HORIZONTAL_ALIGNMENT_LEFT, 660, 10, Color(.60, .66, .70))
    for i in range(DEV_PAGES.size()):
        draw_touch_button(_tab_rect(i), str(DEV_PAGES[i]), i == dev_page, 10)

func _draw_select_row(label: String, y: float, value: String, enabled: bool = true):
    draw_string(font, Vector2(48, y - 9), label, HORIZONTAL_ALIGNMENT_LEFT, 180, 9, Color(.62, .67, .71))
    draw_touch_button(_select_minus_rect(y), "-", false, 18)
    draw_rect(_select_value_rect(y), Color(.050, .060, .070, .98) if enabled else Color(.030, .035, .040, .92))
    draw_rect(_select_value_rect(y), Color(.24, .29, .33), false, 1)
    draw_string(font, Vector2(124, y + 33), value if enabled else "N/A", HORIZONTAL_ALIGNMENT_CENTER, 472, 12, Color.WHITE if enabled else Color(.42, .46, .48))
    draw_touch_button(_select_plus_rect(y), "+", false, 18)

func _draw_character_page():
    draw_string(font, Vector2(32, 184), "NEW CHARACTER", HORIZONTAL_ALIGNMENT_LEFT, 300, 16, Color(.95, .80, .36))
    draw_string(font, Vector2(32, 208), "Cosmetic only. The selected starter kit supplies the combat build.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.70, .74, .78))
    var preview_gear = _creator_preview_gear()
    _draw_player_paper_doll(Vector2(360, 320), 5.0, Vector2i(0, -1), player_profile["appearance"], preview_gear)
    draw_string(font, Vector2(0, 414), "%s PREVIEW - HELM HIDDEN" % _current_starter_family(), HORIZONTAL_ALIGNMENT_CENTER, SCREEN_W, 11, Color(.95, .80, .36))
    draw_string(font, Vector2(72, 446), "NAME", HORIZONTAL_ALIGNMENT_LEFT, 70, 9, Color(.65, .68, .72))
    draw_touch_button(btn_creator_random_name, "FANTASY", false, 9)
    var appearance: Dictionary = player_profile["appearance"]
    for row in range(CREATOR_KEYS.size()):
        var key = str(CREATOR_KEYS[row])
        var y = _creator_row_y(row)
        draw_string(font, Vector2(72, y - 10), str(CREATOR_LABELS[row]), HORIZONTAL_ALIGNMENT_LEFT, 180, 9, Color(.65, .68, .72))
        draw_touch_button(_creator_minus_rect(row), "-", false, 20)
        draw_rect(Rect2(164, y, 392, 58), Color(.045, .055, .065, .98))
        draw_rect(Rect2(164, y, 392, 58), Color(.22, .26, .30), false, 1)
        draw_string(font, Vector2(164, y + 36), PlayerProfileScript.appearance_label(appearance, key).to_upper(), HORIZONTAL_ALIGNMENT_CENTER, 392, 14, Color.WHITE)
        draw_touch_button(_creator_plus_rect(row), "+", false, 20)
    draw_touch_button(btn_creator_random_look, "RANDOM LOOK", false, 13)
    draw_touch_button(btn_creator_next, "NEXT: GEAR", false, 14)
    draw_string(font, Vector2(32, 1068), "The actual text field is a native Godot LineEdit so mobile Safari can focus it.", HORIZONTAL_ALIGNMENT_LEFT, 656, 9, Color(.58, .63, .66))

func _draw_gear_page():
    draw_string(font, Vector2(32, 174), "STARTER KIT", HORIZONTAL_ALIGNMENT_LEFT, 260, 12, Color(.95, .80, .36))
    for i in range(starter_loadouts.size()):
        draw_touch_button(_starter_family_rect(i), str(starter_loadouts[i]["family"]).to_upper(), i == selected_starter, 10)
    draw_string(font, Vector2(32, 260), "RANDOM GEAR - exact rarity", HORIZONTAL_ALIGNMENT_LEFT, 320, 12, Color(.95, .80, .36))
    _draw_select_row("RARITY", 284, _current_random_rarity())
    draw_touch_button(btn_random_spawn, "SPAWN RANDOM ITEM", false, 12)
    draw_string(font, Vector2(48, 430), "QUEUED FOR STARTING INVENTORY: %d" % dev_spawn_items.size(), HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.68, .78, .88))

    draw_string(font, Vector2(32, 456), "CUSTOM ITEM", HORIZONTAL_ALIGNMENT_LEFT, 320, 12, Color(.95, .80, .36))
    _draw_select_row("FAMILY", 472, _custom_family())
    _draw_select_row("SLOT", 536, _custom_slot())
    _draw_select_row("BASE ITEM", 600, _custom_base())
    _draw_select_row("RARITY / BUDGET", 664, _current_custom_rarity())

    var options = _custom_options()
    draw_string(font, Vector2(32, 744), "BONUS STATS %d points - tap a stat to cycle 0/1/2" % int(options["stat_budget"]), HORIZONTAL_ALIGNMENT_LEFT, 656, 9, Color(.62, .67, .71))
    var short = ["MGT", "FIN", "AWR", "VIT", "WIL"]
    for i in range(ATTR_NAMES.size()):
        draw_touch_button(_custom_stat_rect(i), "%s %d" % [short[i], int(custom_bonus_stats[ATTR_NAMES[i]])], false, 10)

    var property_budget = int(options["property_budget"])
    for row in range(2):
        _draw_select_row("PROPERTY %s" % char(65 + row), 852.0 + row * 64.0, custom_properties[row] if custom_properties[row] != "" else "NONE", row < property_budget)
    var feat_budget = int(options["feat_budget"])
    for row in range(2):
        _draw_select_row("EXTRA FEAT %s" % char(65 + row), 980.0 + row * 64.0, custom_feats[row] if custom_feats[row] != "" else "NONE", row < feat_budget)

    draw_touch_button(btn_clear_queue, "CLEAR QUEUE", false, 10)
    draw_touch_button(btn_custom_spawn, "CREATE + SPAWN ITEM", false, 11)
    if not dev_spawn_items.is_empty():
        draw_string(font, Vector2(48, 1254), "LAST: %s" % str(dev_spawn_items[-1]["name"]).left(72), HORIZONTAL_ALIGNMENT_LEFT, 624, 9, Color(.65, .72, .78))

func _draw_creature_page():
    var kinds = _creature_kinds()
    var pages = _creature_page_count()
    creature_page = clampi(creature_page, 0, pages - 1)
    draw_string(font, Vector2(32, 176), "CREATURE ROSTER", HORIZONTAL_ALIGNMENT_LEFT, 280, 13, Color(.95, .80, .36))
    draw_string(font, Vector2(430, 176), "TOTAL %d / %d" % [_creature_total(), MAX_DEV_CREATURES], HORIZONTAL_ALIGNMENT_LEFT, 240, 10, Color(.68, .72, .75))
    var start = creature_page * CREATURES_PER_PAGE
    for row in range(CREATURES_PER_PAGE):
        var index = start + row
        if index >= kinds.size():
            break
        var kind = str(kinds[index])
        var data = CreatureCatalog.definition(kind)
        var y = _creature_row_y(row)
        draw_rect(Rect2(32, y, 656, 132), Color(.040, .048, .056, .96))
        draw_rect(Rect2(32, y, 656, 132), Color(.22, .27, .31), false, 1)
        _draw_creature_icon(kind, Vector2(60, y + 58))
        draw_string(font, Vector2(92, y + 28), kind.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, 180, 14, Color.WHITE)
        draw_string(font, Vector2(92, y + 51), str(data["desc"]), HORIZONTAL_ALIGNMENT_LEFT, 420, 9, Color(.72, .77, .80))
        draw_string(font, Vector2(92, y + 78), "HP %d  HIT %d%%  DMG %d-%d  MOVE %dt  AI %d" % [int(data["hp"]), int(round(float(data["hit"]) * 100.0)), int(data["dmin"]), int(data["dmax"]), int(data["move"]), int(data["ai"])], HORIZONTAL_ALIGNMENT_LEFT, 420, 9, Color(.58, .64, .68))
        draw_string(font, Vector2(92, y + 102), "SIGHT %d  HEAR %d" % [int(data["sight"]), int(data["hearing"])], HORIZONTAL_ALIGNMENT_LEFT, 300, 9, Color(.58, .64, .68))
        draw_touch_button(_creature_minus_rect(row), "-", false, 18)
        draw_string(font, Vector2(588, y + 69), str(int(creature_spawn_counts.get(kind, 0))), HORIZONTAL_ALIGNMENT_CENTER, 44, 16, Color.WHITE)
        draw_touch_button(_creature_plus_rect(row), "+", false, 18)
    draw_touch_button(btn_creature_prev, "PREV", creature_page > 0, 11)
    draw_touch_button(btn_creature_next, "NEXT", creature_page < pages - 1, 11)
    draw_string(font, Vector2(280, 1070), "PAGE %d / %d" % [creature_page + 1, pages], HORIZONTAL_ALIGNMENT_CENTER, 160, 11, Color(.75, .78, .80))
    draw_touch_button(btn_creature_summary, "REVIEW SUMMARY", false, 13)
    draw_string(font, Vector2(32, 1225), "Roster pages are catalog-driven; adding a creature automatically adds it here.", HORIZONTAL_ALIGNMENT_LEFT, 656, 9, Color(.58, .63, .66))

func _draw_summary_page():
    draw_string(font, Vector2(32, 178), "SCENARIO SUMMARY", HORIZONTAL_ALIGNMENT_LEFT, 320, 15, Color(.95, .80, .36))
    var appearance: Dictionary = player_profile["appearance"]
    _draw_player_paper_doll(Vector2(74, 250), 2.3, Vector2i(0, -1), appearance, _creator_preview_gear())
    draw_string(font, Vector2(120, 220), str(player_profile.get("name", "Arena Tester")).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, 520, 15, Color.WHITE)
    draw_string(font, Vector2(120, 246), "STARTER: %s" % _current_starter_family(), HORIZONTAL_ALIGNMENT_LEFT, 520, 10, Color(.72, .80, .86))
    var look = "%s / %s / %s %s" % [PlayerProfileScript.appearance_label(appearance, "body"), PlayerProfileScript.appearance_label(appearance, "skin"), PlayerProfileScript.appearance_label(appearance, "hair_style"), PlayerProfileScript.appearance_label(appearance, "hair_color")]
    draw_string(font, Vector2(120, 270), look, HORIZONTAL_ALIGNMENT_LEFT, 520, 9, Color(.62, .68, .72))

    draw_string(font, Vector2(32, 330), "DEV GEAR QUEUE (%d)" % dev_spawn_items.size(), HORIZONTAL_ALIGNMENT_LEFT, 300, 11, Color(.95, .80, .36))
    if dev_spawn_items.is_empty():
        draw_string(font, Vector2(48, 357), "None - starter kit only.", HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.62, .67, .71))
    else:
        var shown = min(6, dev_spawn_items.size())
        var first = max(0, dev_spawn_items.size() - shown)
        for row in range(shown):
            var item: Dictionary = dev_spawn_items[first + row]
            draw_string(font, Vector2(48, 358 + row * 29), "%s [%s/%s]" % [str(item["name"]), str(item["family"]), str(item["slot"])], HORIZONTAL_ALIGNMENT_LEFT, 620, 9, Color(.78, .82, .84))
        if dev_spawn_items.size() > shown:
            draw_string(font, Vector2(48, 358 + shown * 29), "+ %d earlier queued items" % (dev_spawn_items.size() - shown), HORIZONTAL_ALIGNMENT_LEFT, 620, 9, Color(.58, .63, .66))

    var roster_y = 570.0
    draw_string(font, Vector2(32, roster_y), "CREATURES (%d / %d)" % [_creature_total(), MAX_DEV_CREATURES], HORIZONTAL_ALIGNMENT_LEFT, 300, 11, Color(.95, .80, .36))
    var parts = _roster_summary_parts()
    if parts.is_empty():
        draw_string(font, Vector2(48, roster_y + 30), "No creatures selected.", HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.62, .67, .71))
    else:
        for i in range(parts.size()):
            var col = i % 2
            var row = i / 2
            draw_string(font, Vector2(48 + col * 310, roster_y + 32 + row * 34), parts[i], HORIZONTAL_ALIGNMENT_LEFT, 290, 10, Color(.78, .82, .84))

    draw_string(font, Vector2(32, 790), "ARENA", HORIZONTAL_ALIGNMENT_LEFT, 300, 11, Color(.95, .80, .36))
    draw_string(font, Vector2(48, 820), "Open procgen arena | 4 loot chests | cache + stair objective", HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.72, .76, .79))
    draw_string(font, Vector2(48, 848), "Common / Uncommon / Rare / Enchanted active. Epic remains disabled.", HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.62, .67, .71))
    draw_string(font, Vector2(48, 900), "This is the review gate. GENERATE is only available from this page.", HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.68, .78, .88))
    draw_touch_button(btn_summary_generate, "GENERATE ARENA", false, 18)
    draw_touch_button(btn_summary_exit, "EXIT STANDALONE", false, 11)

func draw_setup_screen():
    _update_name_editor_visibility()
    _draw_dev_header()
    if dev_page == 0:
        _draw_character_page()
    elif dev_page == 1:
        _draw_gear_page()
    elif dev_page == 2:
        _draw_creature_page()
    else:
        _draw_summary_page()
