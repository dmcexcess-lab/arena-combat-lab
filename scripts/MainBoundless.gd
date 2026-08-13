extends "res://scripts/MainDungeon.gd"

# Boundless Adventure systems lab.
# Arena remains the disposable combat sandbox; this layer replaces First Fire
# stats with gear-driven attributes, generates connected dungeon floors, gives
# us a controlled Walker benchmark, and adds a character/inventory test screen.

const ATTR_NAMES := ["Might", "Finesse", "Awareness", "Vitality", "Will"]
const BASE_ATTR := 1
const EQUIP_SLOTS := ["Weapon", "Helm", "Gloves", "Cloak", "Armor", "Belt", "Boots", "Ring 1", "Ring 2", "Amulet"]
const LOOT_SLOTS := ["Weapon", "Helm", "Gloves", "Cloak", "Armor", "Belt", "Boots", "Ring", "Amulet"]
const FAMILIES := ["Warrior", "Ranger", "Wizard"]
const FAMILY_CORES := {
    "Warrior": ["Might", "Vitality"],
    "Ranger": ["Finesse", "Awareness"],
    "Wizard": ["Will", "Awareness"]
}
const GEAR_NAMES := {
    "Warrior": {
        "Weapon": ["Iron Sword", "War Axe", "Flanged Mace"],
        "Helm": ["Greathelm", "Barbute", "Iron Sallet"],
        "Gloves": ["Steel Gauntlets", "War Gloves"],
        "Cloak": ["War Mantle", "Lion Cloak"],
        "Armor": ["Plate Harness", "Brigandine", "Scale Coat"],
        "Belt": ["War Belt", "Iron Girdle"],
        "Boots": ["Sabatons", "Marching Greaves"],
        "Ring": ["Iron Signet", "Conqueror Band"],
        "Amulet": ["War Torc", "Valor Medallion"]
    },
    "Ranger": {
        "Weapon": ["Long Knife", "Hunting Spear", "Short Sword"],
        "Helm": ["Hunter Hood", "Scout Cap", "Leather Coif"],
        "Gloves": ["Grip Gloves", "Falconer's Gloves"],
        "Cloak": ["Trail Cloak", "Leaf Mantle"],
        "Armor": ["Leather Jerkin", "Scout Leathers", "Hide Coat"],
        "Belt": ["Utility Belt", "Trail Belt"],
        "Boots": ["Trail Boots", "Softstep Boots"],
        "Ring": ["Tracker Band", "Greenwood Ring"],
        "Amulet": ["Fang Charm", "Hawkeye Pendant"]
    },
    "Wizard": {
        "Weapon": ["Ash Staff", "Runed Wand", "Ritual Knife"],
        "Gloves": ["Rune Gloves", "Silk Handwraps"],
        "Cloak": ["Star Cloak", "Veiled Mantle"],
        "Armor": ["Runed Robes", "Scholar Robes", "Warded Vestments"],
        "Belt": ["Focus Sash", "Rune Cord"],
        "Boots": ["Soft Boots", "Astral Slippers"],
        "Ring": ["Rune Ring", "Sage Band"],
        "Amulet": ["Focus Amulet", "Crystal Pendant"]
    }
}

# Walker v1 is intentionally boring and fixed. Gear changes should be what we
# feel during testing, not hidden monster stat variance.
const WALKER_HP := 12
const WALKER_HIT := 0.45
const WALKER_DMIN := 3
const WALKER_DMAX := 5
const WALKER_MOVE := 130
const WALKER_ATTACK := 105
const WALKER_SIGHT := 7
const WALKER_HEARING := 12

var zombie_spawn_count := 12
var dungeon_rooms: Array = []
var floor_cells: Array = []
var inventory: Array = []
var equipped := {}
var build_affinity := {"Warrior": 0, "Ranger": 0, "Wizard": 0}
var armor_total := 0
var character_open := false
var inventory_page := 0
var loot_serial := 0

var btn_character := Rect2(602, 12, 106, 48)
var btn_char_close := Rect2(588, 28, 112, 48)
var btn_roll_loot := Rect2(32, 1160, 238, 62)
var btn_inv_prev := Rect2(300, 1160, 120, 62)
var btn_inv_next := Rect2(450, 1160, 120, 62)
var btn_z_minus := Rect2(130, 780, 100, 56)
var btn_z_plus := Rect2(490, 780, 100, 56)

func _ready():
    alarm = Vector2i(-99, -99)
    super._ready()

func reset_run():
    character_open = false
    inventory_page = 0
    super.reset_run()
    msg = "Boundless lab: find the cache and return to the stair."
    submsg = "Random dungeon. Gear is the class system. Walkers are the benchmark."
    queue_redraw()

# -----------------------------------------------------------------------------
# RANDOM DUNGEON
# -----------------------------------------------------------------------------

func build_map():
    walls.clear()
    shelves.clear()
    glass.clear()
    doors.clear()
    barrels.clear()
    dungeon_rooms.clear()
    floor_cells.clear()

    # Begin as solid stone, then carve rooms and one-tile corridors.
    for y in range(H):
        for x in range(W):
            walls[Vector2i(x, y)] = true

    # Fixed entrance room keeps the start readable while the rest changes.
    var entrance := Rect2i(1, H - 5, 6, 4)
    dungeon_rooms.append(entrance)
    _carve_room(entrance)

    var attempts := 0
    while dungeon_rooms.size() < 7 and attempts < 220:
        attempts += 1
        var rw := rng.randi_range(4, 7)
        var rh := rng.randi_range(3, 5)
        var rx := rng.randi_range(1, W - rw - 2)
        var ry := rng.randi_range(1, H - rh - 2)
        var candidate := Rect2i(rx, ry, rw, rh)
        var okay := true
        for r in dungeon_rooms:
            if _rooms_touch(candidate, r, 1):
                okay = false
                break
        if not okay:
            continue
        dungeon_rooms.append(candidate)
        _carve_room(candidate)

    # Every room connects to the previous room, guaranteeing one connected
    # dungeon. Two extra links create loops so the floor is not just a chain.
    for i in range(1, dungeon_rooms.size()):
        _carve_corridor(_room_center(dungeon_rooms[i - 1]), _room_center(dungeon_rooms[i]))
    if dungeon_rooms.size() >= 5:
        _carve_corridor(_room_center(dungeon_rooms[0]), _room_center(dungeon_rooms[3]))
        _carve_corridor(_room_center(dungeon_rooms[2]), _room_center(dungeon_rooms[dungeon_rooms.size() - 1]))

    # Restore the indestructible outer shell.
    for x in range(W):
        walls[Vector2i(x, 0)] = true
        walls[Vector2i(x, H - 1)] = true
    for y in range(H):
        walls[Vector2i(0, y)] = true
        walls[Vector2i(W - 1, y)] = true

    for y in range(1, H - 1):
        for x in range(1, W - 1):
            var p := Vector2i(x, y)
            if not walls.has(p):
                floor_cells.append(p)

    exit_cell = _room_center(dungeon_rooms[0])
    objective_spots.clear()
    for i in range(1, dungeon_rooms.size()):
        var c := _room_center(dungeon_rooms[i])
        if manhattan(c, exit_cell) >= 8:
            objective_spots.append(c)
    if objective_spots.is_empty():
        objective_spots.append(_room_center(dungeon_rooms[dungeon_rooms.size() - 1]))

    _place_dungeon_doors()
    _place_room_obstacles()
    _place_casks()

func _rooms_touch(a: Rect2i, b: Rect2i, margin: int) -> bool:
    return not (
        a.end.x + margin <= b.position.x or
        b.end.x + margin <= a.position.x or
        a.end.y + margin <= b.position.y or
        b.end.y + margin <= a.position.y
    )

func _carve_room(r: Rect2i):
    for y in range(r.position.y, r.end.y):
        for x in range(r.position.x, r.end.x):
            walls.erase(Vector2i(x, y))

func _room_center(r: Rect2i) -> Vector2i:
    return Vector2i(r.position.x + r.size.x / 2, r.position.y + r.size.y / 2)

func _carve_corridor(a: Vector2i, b: Vector2i):
    var horizontal_first := rng.randf() < 0.5
    if horizontal_first:
        _carve_h(a.x, b.x, a.y)
        _carve_v(a.y, b.y, b.x)
    else:
        _carve_v(a.y, b.y, a.x)
        _carve_h(a.x, b.x, b.y)

func _carve_h(x1: int, x2: int, y: int):
    for x in range(min(x1, x2), max(x1, x2) + 1):
        if inside(Vector2i(x, y)):
            walls.erase(Vector2i(x, y))

func _carve_v(y1: int, y2: int, x: int):
    for y in range(min(y1, y2), max(y1, y2) + 1):
        if inside(Vector2i(x, y)):
            walls.erase(Vector2i(x, y))

func _place_dungeon_doors():
    var candidates: Array = []
    for p in floor_cells:
        if manhattan(p, exit_cell) <= 2:
            continue
        var ns := not walls.has(p + Vector2i(0, -1)) and not walls.has(p + Vector2i(0, 1))
        var ew := not walls.has(p + Vector2i(-1, 0)) and not walls.has(p + Vector2i(1, 0))
        var walls_lr := walls.has(p + Vector2i(-1, 0)) and walls.has(p + Vector2i(1, 0))
        var walls_ud := walls.has(p + Vector2i(0, -1)) and walls.has(p + Vector2i(0, 1))
        if (ns and walls_lr) or (ew and walls_ud):
            candidates.append(p)
    candidates.shuffle()
    var count := min(10, candidates.size())
    for i in range(count):
        doors[candidates[i]] = false

func _place_room_obstacles():
    for i in range(1, dungeon_rooms.size()):
        if rng.randf() > 0.72:
            continue
        var r: Rect2i = dungeon_rooms[i]
        var p := Vector2i(
            rng.randi_range(r.position.x + 1, r.end.x - 2),
            rng.randi_range(r.position.y + 1, r.end.y - 2)
        )
        if p == _room_center(r) or doors.has(p):
            continue
        var open_neighbors := 0
        for d in DIRS:
            if not walls.has(p + d):
                open_neighbors += 1
        if open_neighbors >= 3:
            shelves[p] = true

func _place_casks():
    var candidates: Array = []
    for p in floor_cells:
        if manhattan(p, exit_cell) < 7 or doors.has(p) or shelves.has(p):
            continue
        var open_neighbors := 0
        for d in DIRS:
            if not walls.has(p + d):
                open_neighbors += 1
        if open_neighbors >= 3:
            candidates.append(p)
    candidates.shuffle()
    for i in range(min(3, candidates.size())):
        barrels[candidates[i]] = true

# -----------------------------------------------------------------------------
# GEAR = CLASS
# -----------------------------------------------------------------------------

func make_player():
    equipped.clear()
    inventory.clear()
    build_affinity = {"Warrior": 0, "Ranger": 0, "Wizard": 0}
    armor_total = 0

    player = {
        "name": names[rng.randi_range(0, names.size() - 1)],
        "attrs": _blank_attrs(),
        "weapon": _fists(),
        "clothes": {"name": "Unarmored", "prot": 0, "noise": 0},
        "gun": "", "ammo": 0,
        "status": [],
        "hp": 19, "max_hp": 19,
        "fear": 0,
        "pos": exit_cell,
        "facing": Vector2i(1, 0),
        "last_dir": Vector2i.ZERO,
        "move_state": "STILL",
        "crouched": false
    }

    var starter_family := FAMILIES[rng.randi_range(0, FAMILIES.size() - 1)]
    for slot in EQUIP_SLOTS:
        if starter_family == "Wizard" and slot == "Helm":
            continue
        equipped[slot] = _generate_item(_base_slot(slot), starter_family)

    _rebuild_player_from_gear(true)
    _roll_inventory(12)

func _blank_attrs() -> Dictionary:
    var a := {}
    for stat in ATTR_NAMES:
        a[stat] = BASE_ATTR
    return a

func _base_slot(slot: String) -> String:
    return "Ring" if slot.begins_with("Ring") else slot

func _generate_item(slot: String, forced_family: String = "") -> Dictionary:
    loot_serial += 1
    var family := forced_family
    if family == "":
        family = FAMILIES[rng.randi_range(0, FAMILIES.size() - 1)]
    if slot == "Helm" and family == "Wizard":
        family = ["Warrior", "Ranger"][rng.randi_range(0, 1)]

    var rarity := "Common"
    var extra_points := 1
    var roll := rng.randf()
    if roll < 0.18:
        rarity = "Rare"
        extra_points = 3
    elif roll < 0.55:
        rarity = "Enchanted"
        extra_points = 2

    var bonuses := {}
    for stat in ATTR_NAMES:
        bonuses[stat] = 0
    var cores: Array = FAMILY_CORES[family]
    bonuses[cores[0]] += 1
    bonuses[cores[1]] += 1

    var weighted: Array = [cores[0], cores[0], cores[1], cores[1]]
    weighted.append_array(ATTR_NAMES)
    for n in range(extra_points):
        var stat = weighted[rng.randi_range(0, weighted.size() - 1)]
        bonuses[stat] += 1

    var options: Array = GEAR_NAMES[family][slot]
    var base_name: String = options[rng.randi_range(0, options.size() - 1)]
    var item := {
        "id": loot_serial,
        "name": "%s %s" % [rarity, base_name],
        "rarity": rarity,
        "family": family,
        "slot": slot,
        "bonuses": bonuses,
        "armor": _item_armor(slot, family),
        "noise": _item_noise(slot, family)
    }
    if slot == "Weapon":
        item["weapon_data"] = _weapon_for_family(family, base_name)
    return item

func _item_armor(slot: String, family: String) -> int:
    if slot in ["Ring", "Amulet", "Weapon", "Cloak", "Belt"]:
        return 0
    if family == "Warrior":
        return 3 if slot == "Armor" else 1
    if family == "Ranger":
        return 1 if slot == "Armor" else 0
    return 0

func _item_noise(slot: String, family: String) -> int:
    if family == "Warrior" and slot in ["Armor", "Helm", "Boots"]:
        return 1
    return 0

func _weapon_for_family(family: String, display_name: String) -> Dictionary:
    if family == "Warrior":
        return {"name": display_name, "dmin": 5, "dmax": 8, "time": 110, "noise": 7, "push": 1, "stealth": 1}
    if family == "Ranger":
        return {"name": display_name, "dmin": 4, "dmax": 6, "time": 82, "noise": 3, "push": 0, "stealth": 4}
    return {"name": display_name, "dmin": 3, "dmax": 5, "time": 96, "noise": 2, "push": 0, "stealth": 2}

func _fists() -> Dictionary:
    return {"name": "Fists", "dmin": 2, "dmax": 3, "time": 100, "noise": 4, "push": 0, "stealth": 0}

func _roll_inventory(count: int):
    inventory.clear()
    for i in range(count):
        var slot := LOOT_SLOTS[rng.randi_range(0, LOOT_SLOTS.size() - 1)]
        inventory.append(_generate_item(slot))
    inventory_page = 0

func _rebuild_player_from_gear(heal_full: bool = false):
    var old_max := int(player.get("max_hp", 19))
    var old_hp := int(player.get("hp", old_max))
    var missing_hp := max(0, old_max - old_hp)
    var attrs := _blank_attrs()
    armor_total = 0
    var noise_total := 0
    build_affinity = {"Warrior": 0, "Ranger": 0, "Wizard": 0}
    var weapon_data := _fists()

    for slot in EQUIP_SLOTS:
        if not equipped.has(slot):
            continue
        var item: Dictionary = equipped[slot]
        for stat in ATTR_NAMES:
            attrs[stat] += int(item.bonuses.get(stat, 0))
        armor_total += int(item.get("armor", 0))
        noise_total += int(item.get("noise", 0))
        var family := str(item.get("family", ""))
        if build_affinity.has(family):
            build_affinity[family] += 1
        if slot == "Weapon" and item.has("weapon_data"):
            weapon_data = item.weapon_data.duplicate(true)

    player["attrs"] = attrs
    player["weapon"] = weapon_data
    player["clothes"] = {"name": "Equipped gear", "prot": armor_total, "noise": noise_total}
    player["max_hp"] = 16 + int(attrs["Vitality"]) * 3
    if heal_full:
        player["hp"] = player.max_hp
    else:
        player["hp"] = max(1, int(player.max_hp) - missing_hp)

func _build_name() -> String:
    var first := "Warrior"
    var second := "Ranger"
    for family in FAMILIES:
        if int(build_affinity[family]) > int(build_affinity[first]):
            second = first
            first = family
        elif family != first and int(build_affinity[family]) > int(build_affinity[second]):
            second = family
    var a := int(build_affinity[first])
    var b := int(build_affinity[second])
    if b > 0 and abs(a - b) <= 1:
        return "%s / %s HYBRID" % [first.to_upper(), second.to_upper()]
    return first.to_upper()

func _gear_score(item: Dictionary) -> int:
    var score := int(item.get("armor", 0)) * 2
    for stat in ATTR_NAMES:
        score += int(item.bonuses.get(stat, 0))
    return score

func _equip_inventory_index(index: int):
    if index < 0 or index >= inventory.size():
        return
    var item: Dictionary = inventory[index]
    inventory.remove_at(index)
    var slot := str(item.slot)
    if slot == "Ring":
        if not equipped.has("Ring 1"):
            slot = "Ring 1"
        elif not equipped.has("Ring 2"):
            slot = "Ring 2"
        else:
            slot = "Ring 1" if _gear_score(equipped["Ring 1"]) <= _gear_score(equipped["Ring 2"]) else "Ring 2"
    if equipped.has(slot):
        inventory.append(equipped[slot])
    equipped[slot] = item
    _rebuild_player_from_gear(false)
    msg = "Equipped %s. Build: %s" % [item.name, _build_name()]
    var max_page := max(0, int(ceil(float(inventory.size()) / 8.0)) - 1)
    inventory_page = min(inventory_page, max_page)
    queue_redraw()

# -----------------------------------------------------------------------------
# PLAYER COMBAT FROM GEAR STATS
# -----------------------------------------------------------------------------

func melee(target: Vector2i):
    var zi := zombie_at(target)
    if zi == -1:
        msg = "Nothing in melee range."
        queue_redraw()
        return
    var z = zombies[zi]
    var stealth := stealth_attack(z)
    var finesse := int(player.attrs["Finesse"])
    var might := int(player.attrs["Might"])
    var chance := clamp(.52 + finesse * .045 - attack_penalty() + (.30 if stealth else 0.0), .12, .97)
    if rng.randf() <= chance:
        var d := rng.randi_range(int(player.weapon.dmin), int(player.weapon.dmax)) + int(floor(might * .65))
        if stealth:
            d = int(round(float(d + int(player.weapon.stealth)) * 1.45))
        zombies[zi].hp -= d
        msg = "%s hit for %d%s." % [player.weapon.name, d, " — STEALTH" if stealth else ""]
        if int(zombies[zi].hp) <= 0:
            kill_zombie(zi, stealth)
        else:
            var push := int(player.weapon.push) + int(floor(might / 5.0))
            if push > 0:
                push_zombie(zi, player.facing)
    else:
        msg = "%s misses." % player.weapon.name
    emit_noise(player.pos, int(player.weapon.noise), "melee", true)
    var cost := max(50, int(player.weapon.time) - finesse * 3)
    commit_action(cost)

func awareness() -> float:
    return max(0.0, float(player.attrs["Awareness"]) - float(player.fear) / 40.0)

func view_range() -> int:
    return clamp(6 + int(floor(float(player.attrs["Awareness"]) / 2.0)), 6, 12)

func attack_penalty() -> float:
    return max(0.0, float(player.fear - 45) * .0018)

func add_fear(n: int):
    var resist := int(player.attrs["Will"])
    player.fear = clamp(int(player.fear) + max(1, n - int(floor(resist / 3.0))), 0, 100)

func fear_recovery() -> int:
    return 1 + int(floor(float(player.attrs["Will"]) / 4.0))

# -----------------------------------------------------------------------------
# WALKER V1
# -----------------------------------------------------------------------------

func spawn_zombies():
    zombies.clear()
    var candidates: Array = []
    for p in floor_cells:
        if p == exit_cell or p == objective or doors.has(p) or blocked(p):
            continue
        if manhattan(p, exit_cell) < 6:
            continue
        candidates.append(p)
    candidates.shuffle()
    var actual := min(zombie_spawn_count, candidates.size())
    for i in range(actual):
        zombies.append({
            "id": i,
            "pos": candidates[i],
            "facing": DIRS[rng.randi_range(0, 3)],
            "hp": WALKER_HP,
            "state": "IDLE",
            "target": Vector2i(-1, -1),
            "heard": Vector2i(-1, -1),
            "next": rng.randi_range(60, 180),
            "alerted": false,
            "dead": false
        })

func zombie_sees(z: Dictionary) -> bool:
    var r := WALKER_SIGHT - (2 if player.crouched else 0)
    return in_cone(z.pos, z.facing, player.pos, r, .40) and has_los(z.pos, player.pos)

func zombie_attack(i: int):
    var pressure := crowd_pressure()
    var chance := clamp(WALKER_HIT + min(.28, pressure * .05), .18, .88)
    if rng.randf() <= chance:
        var d := max(1, rng.randi_range(WALKER_DMIN, WALKER_DMAX) - armor_total)
        hurt(d, "walker attack")
        msg = "Walker hits for %d. Armor %d. Pressure %.1f." % [d, armor_total, pressure]
    else:
        msg = "Walker attack misses."
    add_fear(8 + int(round(pressure * 2.0)))
    emit_noise(zombies[i].pos, 18, "struggle", false)
    if not zombies[i].dead:
        zombies[i].next = tick + WALKER_ATTACK

# -----------------------------------------------------------------------------
# CHARACTER / INVENTORY + LAB SETTINGS
# -----------------------------------------------------------------------------

func _unhandled_input(e):
    if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_I:
        character_open = not character_open
        queue_redraw()
        get_viewport().set_input_as_handled()
        return
    super._unhandled_input(e)

func handle_touch_point(pos: Vector2):
    if character_open:
        if btn_char_close.has_point(pos):
            character_open = false
            queue_redraw()
            return
        if btn_roll_loot.has_point(pos):
            _roll_inventory(12)
            queue_redraw()
            return
        if btn_inv_prev.has_point(pos):
            inventory_page = max(0, inventory_page - 1)
            queue_redraw()
            return
        if btn_inv_next.has_point(pos):
            var max_page := max(0, int(ceil(float(inventory.size()) / 8.0)) - 1)
            inventory_page = min(max_page, inventory_page + 1)
            queue_redraw()
            return
        for row in range(8):
            if _inventory_row_rect(row).has_point(pos):
                _equip_inventory_index(inventory_page * 8 + row)
                return
        return

    if not menu_open and btn_character.has_point(pos):
        character_open = true
        queue_redraw()
        return

    if menu_open:
        if btn_z_minus.has_point(pos):
            zombie_spawn_count = max(0, zombie_spawn_count - 1)
            queue_redraw()
            return
        if btn_z_plus.has_point(pos):
            zombie_spawn_count = min(40, zombie_spawn_count + 1)
            queue_redraw()
            return

    super.handle_touch_point(pos)

func _inventory_row_rect(row: int) -> Rect2:
    return Rect2(36, 716 + row * 50, 648, 44)

func _item_bonus_text(item: Dictionary) -> String:
    var parts: Array[String] = []
    var short := {"Might": "MGT", "Finesse": "FIN", "Awareness": "AWR", "Vitality": "VIT", "Will": "WIL"}
    for stat in ATTR_NAMES:
        var v := int(item.bonuses.get(stat, 0))
        if v > 0:
            parts.append("%s+%d" % [short[stat], v])
    if int(item.get("armor", 0)) > 0:
        parts.append("ARM+%d" % int(item.armor))
    return " ".join(parts)

func draw_hud():
    draw_rect(Rect2(0, 0, SCREEN_W, INFO_H), Color(.035, .04, .05, .99))
    draw_rect(Rect2(0, INFO_H - 2, SCREEN_W, 2), Color(.38, .42, .46))

    if not menu_open and not character_open:
        draw_touch_button(btn_menu, "MENU", false)
        draw_touch_button(btn_character, "CHAR", false)

    draw_string(font, Vector2(120, 34), "BOUNDLESS ADVENTURE LAB", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color.WHITE)
    draw_string(font, Vector2(120, 61), "%s  |  %s" % [player.name, _build_name()], HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(.68, .82, 1))
    draw_string(font, Vector2(18, 94), "HP %d/%d   ARM %d   FEAR %d   TICK %d   FACING %s" % [player.hp, player.max_hp, armor_total, player.fear, tick, DIR_NAMES[DIRS.find(player.facing)]], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)

    var a: Dictionary = player.attrs
    draw_string(font, Vector2(18, 130), "GEAR ATTRIBUTES", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 154), "Might %d   Finesse %d   Awareness %d" % [a.Might, a.Finesse, a.Awareness], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)
    draw_string(font, Vector2(18, 176), "Vitality %d   Will %d" % [a.Vitality, a.Will], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)

    draw_string(font, Vector2(18, 211), "EQUIPMENT", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 234), "%s" % player.weapon.name, HORIZONTAL_ALIGNMENT_LEFT, 680, 13, Color.WHITE)
    draw_string(font, Vector2(18, 258), "Affinity W:%d  R:%d  M:%d   |   Walkers: %d" % [build_affinity.Warrior, build_affinity.Ranger, build_affinity.Wizard, zombies.size()], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(.76, .78, .8))

    draw_string(font, Vector2(18, 292), "OBJECTIVE", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 315), "CACHE ACQUIRED - RETURN TO STAIR" if objective_taken else "FIND THE DUNGEON CACHE", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
    draw_string(font, Vector2(18, 344), msg, HORIZONTAL_ALIGNMENT_LEFT, 684, 12, Color(.93, .94, .90))
    draw_string(font, Vector2(18, 370), submsg, HORIZONTAL_ALIGNMENT_LEFT, 684, 11, Color(.68, .72, .68))
    draw_string(font, Vector2(18, 400), "Kills %d  Alerted %d  Stealth %d  Noise %d" % [stats.kills, stats.alerted, stats.stealth, stats.noise], HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(.75, .78, .75))

    if any_zombie_spotted_player() and not game_over:
        draw_string(font, Vector2(0, 458), "!! SPOTTED !!", HORIZONTAL_ALIGNMENT_CENTER, SCREEN_W, 22, Color(1, .24, .18))

    draw_rect(Rect2(0, CONTROL_SHELF_TOP, SCREEN_W, SCREEN_H - CONTROL_SHELF_TOP), Color(.025, .032, .035, .86))
    draw_rect(Rect2(0, CONTROL_SHELF_TOP, SCREEN_W, 2), Color(.38, .42, .46))
    draw_touch_button(btn_turn_left, "TURN L", false, 18)
    draw_touch_button(btn_crouch, "CROUCH", player.crouched, 13)
    draw_touch_button(btn_forward, "FORWARD", false, 13)
    draw_touch_button(btn_turn_right, "TURN R", false, 18)
    draw_touch_button(btn_back, "BACK", false, 13)

    if game_over:
        draw_rect(Rect2(120, 770, 480, 100), Color(.02, .025, .02, .94))
        draw_rect(Rect2(120, 770, 480, 100), Color(.85, .72, .30), false, 2)
        draw_string(font, Vector2(150, 812), "OBJECTIVE COMPLETE" if won else "RUN FAILED", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color.WHITE)
        draw_string(font, Vector2(150, 842), "MENU > NEW DUNGEON", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.8, .82, .8))

    if menu_open:
        draw_menu_overlay()
    if character_open:
        draw_character_overlay()

func draw_menu_overlay():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(0, 0, 0, .76))
    draw_rect(Rect2(70, 330, 580, 610), Color(.035, .04, .05, .995))
    draw_rect(Rect2(70, 330, 580, 610), Color(.75, .68, .35), false, 2)
    draw_string(font, Vector2(110, 378), "BOUNDLESS ADVENTURE LAB", HORIZONTAL_ALIGNMENT_LEFT, -1, 23, Color.WHITE)
    draw_string(font, Vector2(110, 408), "Random dungeon + controlled Walker benchmark.", HORIZONTAL_ALIGNMENT_LEFT, 500, 12, Color(.72, .75, .78))
    draw_touch_button(btn_resume, "RESUME", false)
    draw_touch_button(btn_menu_new, "NEW DUNGEON", false)
    draw_touch_button(btn_exit_google, "EXIT TO GOOGLE", false)
    draw_string(font, Vector2(110, 758), "ZOMBIES ON NEXT DUNGEON", HORIZONTAL_ALIGNMENT_LEFT, 500, 12, Color(.95, .8, .36))
    draw_touch_button(btn_z_minus, "-", false, 22)
    draw_string(font, Vector2(230, 816), str(zombie_spawn_count), HORIZONTAL_ALIGNMENT_CENTER, 260, 24, Color.WHITE)
    draw_touch_button(btn_z_plus, "+", false, 22)
    draw_string(font, Vector2(110, 870), "WALKER v1  HP12 | HIT45% | DMG3-5 | MOVE130 | ATK105", HORIZONTAL_ALIGNMENT_LEFT, 500, 11, Color(.72, .75, .78))
    draw_string(font, Vector2(110, 894), "SIGHT7 | HEARING12 | ARMOR0 | FEAR IMMUNE", HORIZONTAL_ALIGNMENT_LEFT, 500, 11, Color(.72, .75, .78))

func draw_character_overlay():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(.018, .021, .028, .995))
    draw_string(font, Vector2(28, 52), "CHARACTER / INVENTORY", HORIZONTAL_ALIGNMENT_LEFT, -1, 23, Color.WHITE)
    draw_touch_button(btn_char_close, "CLOSE", false)

    var a: Dictionary = player.attrs
    draw_string(font, Vector2(28, 96), "%s   BUILD: %s" % [player.name, _build_name()], HORIZONTAL_ALIGNMENT_LEFT, 660, 16, Color(.68, .82, 1))
    draw_string(font, Vector2(28, 126), "MGT %d   FIN %d   AWR %d   VIT %d   WIL %d" % [a.Might, a.Finesse, a.Awareness, a.Vitality, a.Will], HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
    draw_string(font, Vector2(28, 151), "HP %d/%d   ARM %d   AFFINITY W:%d R:%d M:%d" % [player.hp, player.max_hp, armor_total, build_affinity.Warrior, build_affinity.Ranger, build_affinity.Wizard], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(.8, .82, .84))
    draw_string(font, Vector2(28, 184), "GEAR CREATES THE CLASS", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))

    for i in range(EQUIP_SLOTS.size()):
        var col := i / 5
        var row := i % 5
        var x := 28.0 + col * 346.0
        var y := 218.0 + row * 54.0
        var slot: String = EQUIP_SLOTS[i]
        draw_string(font, Vector2(x, y), slot.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(.65, .68, .72))
        var text := "— empty —"
        var detail := ""
        if equipped.has(slot):
            var item: Dictionary = equipped[slot]
            text = str(item.name)
            detail = "%s | %s" % [item.family, _item_bonus_text(item)]
        draw_string(font, Vector2(x, y + 17), text, HORIZONTAL_ALIGNMENT_LEFT, 326, 11, Color.WHITE)
        draw_string(font, Vector2(x, y + 34), detail, HORIZONTAL_ALIGNMENT_LEFT, 326, 9, Color(.70, .74, .78))

    draw_string(font, Vector2(28, 690), "INVENTORY — tap an item to equip it", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    var start := inventory_page * 8
    for row in range(8):
        var idx := start + row
        var rect := _inventory_row_rect(row)
        draw_rect(rect, Color(.055, .065, .075, .96))
        draw_rect(rect, Color(.25, .29, .33), false, 1)
        if idx < inventory.size():
            var item: Dictionary = inventory[idx]
            draw_string(font, Vector2(rect.position.x + 10, rect.position.y + 18), "%s   [%s / %s]" % [item.name, item.family, item.slot], HORIZONTAL_ALIGNMENT_LEFT, 620, 11, Color.WHITE)
            draw_string(font, Vector2(rect.position.x + 10, rect.position.y + 36), _item_bonus_text(item), HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.72, .78, .82))

    var pages := max(1, int(ceil(float(inventory.size()) / 8.0)))
    draw_touch_button(btn_roll_loot, "ROLL 12 LOOT", false)
    draw_touch_button(btn_inv_prev, "PREV", false)
    draw_touch_button(btn_inv_next, "NEXT", false)
    draw_string(font, Vector2(570, 1197), "%d/%d" % [inventory_page + 1, pages], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(.8, .82, .84))
    draw_string(font, Vector2(32, 1252), "LAB RULE: gear swapping is free for now. Later it will consume dungeon time.", HORIZONTAL_ALIGNMENT_LEFT, 650, 10, Color(.62, .66, .70))
