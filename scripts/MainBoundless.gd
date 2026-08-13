extends "res://scripts/MainDungeon.gd"

# Boundless Adventure systems lab.
# The wrapper now starts before the dungeon exists: roll/select a starting kit,
# choose zombie count, then generate the floor and spawn on its random stair.
# Gear is the loose class system. Torso armor anchors physical compatibility;
# weapons and accessories remain free so hybrid builds stay possible.

const ATTR_NAMES := ["Might", "Finesse", "Awareness", "Vitality", "Will"]
const BASE_ATTR := 1
const EQUIP_SLOTS := ["Weapon", "Helm", "Gloves", "Cloak", "Armor", "Belt", "Boots", "Ring 1", "Ring 2", "Amulet"]
const LOOT_SLOTS := ["Weapon", "Helm", "Gloves", "Cloak", "Armor", "Belt", "Boots", "Ring", "Amulet"]
const ACCESSORY_SLOTS := ["Ring", "Ring 1", "Ring 2", "Amulet"]
const FAMILIES := ["Stealth", "Ranged", "Guard", "Ravager"]
const FAMILY_CORES := {
    "Stealth": ["Finesse", "Awareness"],
    "Ranged": ["Awareness", "Finesse"],
    "Guard": ["Vitality", "Will"],
    "Ravager": ["Might", "Finesse"]
}
const FAMILY_GROUP := {
    "Stealth": "AGILE",
    "Ranged": "AGILE",
    "Guard": "MELEE",
    "Ravager": "MELEE"
}
const GEAR_NAMES := {
    "Stealth": {
        "Weapon": ["Stiletto", "Dirk", "Long Knife"],
        "Helm": ["Shadow Hood", "Soft Cowl", "Night Cap"],
        "Gloves": ["Grip Gloves", "Silent Wraps"],
        "Cloak": ["Dusk Cloak", "Ash Mantle"],
        "Armor": ["Silent Leathers", "Padded Jerkin", "Nightweave Coat"],
        "Belt": ["Lockpick Belt", "Knife Sash"],
        "Boots": ["Softstep Boots", "Quiet Soles"],
        "Ring": ["Whisper Ring", "Veiled Band"],
        "Amulet": ["Fox Charm", "Shadow Pendant"]
    },
    "Ranged": {
        "Weapon": ["Short Bow", "Hunting Bow", "Light Crossbow"],
        "Helm": ["Scout Hood", "Archer Cap", "Leather Coif"],
        "Gloves": ["Fletcher Gloves", "Draw Gloves"],
        "Cloak": ["Trail Cloak", "Green Mantle"],
        "Armor": ["Scout Leathers", "Ranger Coat", "Hide Vest"],
        "Belt": ["Quiver Belt", "Field Belt"],
        "Boots": ["Trail Boots", "Ridge Boots"],
        "Ring": ["Hawkeye Band", "Tracker Ring"],
        "Amulet": ["Falcon Charm", "Farshot Pendant"]
    },
    "Guard": {
        "Weapon": ["Iron Mace", "Short Sword", "War Hammer"],
        "Helm": ["Greathelm", "Barbute", "Iron Sallet"],
        "Gloves": ["Steel Gauntlets", "Plate Mitts"],
        "Cloak": ["Guard Mantle", "Tower Cloak"],
        "Armor": ["Plate Harness", "Heavy Brigandine", "Scale Harness"],
        "Belt": ["Reinforced Girdle", "Guard Belt"],
        "Boots": ["Sabatons", "Heavy Greaves"],
        "Ring": ["Bulwark Signet", "Iron Band"],
        "Amulet": ["Tower Medallion", "Stone Torc"]
    },
    "Ravager": {
        "Weapon": ["Great Axe", "Execution Sword", "Maul"],
        "Helm": ["Open War Helm", "Skull Cap", "Horned Helm"],
        "Gloves": ["Breaker Gloves", "War Wraps"],
        "Cloak": ["Wolf Cloak", "Blood Mantle"],
        "Armor": ["War Harness", "Open Mail", "Raider Plate"],
        "Belt": ["Trophy Belt", "Axe Girdle"],
        "Boots": ["Raider Boots", "War Greaves"],
        "Ring": ["Fury Band", "Conqueror Ring"],
        "Amulet": ["Fang Torc", "Rage Medallion"]
    }
}

const WALKER_HP := 12
const WALKER_HIT := 0.45
const WALKER_DMIN := 3
const WALKER_DMAX := 5
const WALKER_MOVE := 130
const WALKER_ATTACK := 105
const WALKER_SIGHT := 7
const WALKER_HEARING := 12

var zombie_spawn_count = 12
var dungeon_rooms: Array = []
var floor_cells: Array = []
var inventory: Array = []
var equipped = {}
var build_affinity = {"Stealth": 0, "Ranged": 0, "Guard": 0, "Ravager": 0}
var armor_total = 0
var character_open = false
var inventory_page = 0
var loot_serial = 0

var setup_open = true
var run_started = false
var starter_loadouts: Array = []
var selected_starter = 0

var btn_character = Rect2(602, 12, 106, 48)
var btn_char_close = Rect2(588, 28, 112, 48)
var btn_inv_prev = Rect2(300, 1160, 120, 62)
var btn_inv_next = Rect2(450, 1160, 120, 62)

var btn_setup_roll = Rect2(32, 112, 656, 58)
var btn_setup_z_minus = Rect2(100, 884, 120, 58)
var btn_setup_z_plus = Rect2(500, 884, 120, 58)
var btn_setup_start = Rect2(90, 992, 540, 74)
var btn_setup_exit = Rect2(210, 1090, 300, 54)

func _ready():
    alarm = Vector2i(-99, -99)
    super._ready()

func reset_run():
    character_open = false
    inventory_page = 0
    if not run_started:
        _open_setup()
        return
    super.reset_run()
    msg = "Find the cache and return to the stair."
    submsg = "Your armor controls physical gear compatibility; accessories can cross the line."
    queue_redraw()

func _open_setup():
    setup_open = true
    run_started = false
    menu_open = false
    character_open = false
    game_over = false
    won = false
    if starter_loadouts.is_empty():
        _roll_starting_loadouts()
    queue_redraw()

func _start_dungeon():
    if starter_loadouts.is_empty():
        _roll_starting_loadouts()
    selected_starter = clampi(selected_starter, 0, starter_loadouts.size() - 1)
    setup_open = false
    run_started = true
    menu_open = false
    character_open = false
    super.reset_run()
    msg = "Dungeon generated. Find the cache and return to this stair."
    submsg = "%s kit selected. Armor is your soft class anchor." % str(starter_loadouts[selected_starter].family)
    queue_redraw()

func _roll_starting_loadouts():
    starter_loadouts.clear()
    for family in FAMILIES:
        var gear = {}
        for equip_slot in EQUIP_SLOTS:
            var slot = str(equip_slot)
            var item_family = str(family)
            if slot in ["Ring 1", "Ring 2", "Amulet"]:
                item_family = str(FAMILIES[rng.randi_range(0, FAMILIES.size() - 1)])
            gear[slot] = _generate_item(_base_slot(slot), item_family)
        starter_loadouts.append({"family": str(family), "gear": gear})
    selected_starter = rng.randi_range(0, starter_loadouts.size() - 1)
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

    for y in range(H):
        for x in range(W):
            walls[Vector2i(x, y)] = true

    var attempts = 0
    while dungeon_rooms.size() < 7 and attempts < 280:
        attempts += 1
        var rw = rng.randi_range(4, 7)
        var rh = rng.randi_range(3, 5)
        var rx = rng.randi_range(1, W - rw - 2)
        var ry = rng.randi_range(1, H - rh - 2)
        var candidate = Rect2i(rx, ry, rw, rh)
        var okay = true
        for existing in dungeon_rooms:
            if _rooms_touch(candidate, existing, 1):
                okay = false
                break
        if not okay:
            continue
        dungeon_rooms.append(candidate)
        _carve_room(candidate)

    if dungeon_rooms.is_empty():
        var fallback = Rect2i(2, 6, 6, 5)
        dungeon_rooms.append(fallback)
        _carve_room(fallback)

    for i in range(1, dungeon_rooms.size()):
        _carve_corridor(_room_center(dungeon_rooms[i - 1]), _room_center(dungeon_rooms[i]))
    if dungeon_rooms.size() >= 5:
        _carve_corridor(_room_center(dungeon_rooms[0]), _room_center(dungeon_rooms[3]))
        _carve_corridor(_room_center(dungeon_rooms[2]), _room_center(dungeon_rooms[dungeon_rooms.size() - 1]))

    for x in range(W):
        walls[Vector2i(x, 0)] = true
        walls[Vector2i(x, H - 1)] = true
    for y in range(H):
        walls[Vector2i(0, y)] = true
        walls[Vector2i(W - 1, y)] = true

    for y in range(1, H - 1):
        for x in range(1, W - 1):
            var p = Vector2i(x, y)
            if not walls.has(p):
                floor_cells.append(p)

    var stair_room = rng.randi_range(0, dungeon_rooms.size() - 1)
    exit_cell = _room_center(dungeon_rooms[stair_room])
    objective_spots.clear()
    for i in range(dungeon_rooms.size()):
        if i == stair_room:
            continue
        var c = _room_center(dungeon_rooms[i])
        if manhattan(c, exit_cell) >= 7:
            objective_spots.append(c)
    if objective_spots.is_empty():
        var farthest = exit_cell
        var far_dist = -1
        for room in dungeon_rooms:
            var c = _room_center(room)
            var d = manhattan(c, exit_cell)
            if d > far_dist:
                farthest = c
                far_dist = d
        objective_spots.append(farthest)

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
    if rng.randf() < 0.5:
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
        var ns = not walls.has(p + Vector2i(0, -1)) and not walls.has(p + Vector2i(0, 1))
        var ew = not walls.has(p + Vector2i(-1, 0)) and not walls.has(p + Vector2i(1, 0))
        var walls_lr = walls.has(p + Vector2i(-1, 0)) and walls.has(p + Vector2i(1, 0))
        var walls_ud = walls.has(p + Vector2i(0, -1)) and walls.has(p + Vector2i(0, 1))
        if (ns and walls_lr) or (ew and walls_ud):
            candidates.append(p)
    candidates.shuffle()
    for i in range(min(10, candidates.size())):
        doors[candidates[i]] = false

func _place_room_obstacles():
    for i in range(dungeon_rooms.size()):
        if rng.randf() > 0.72:
            continue
        var r: Rect2i = dungeon_rooms[i]
        var p = Vector2i(
            rng.randi_range(r.position.x + 1, r.end.x - 2),
            rng.randi_range(r.position.y + 1, r.end.y - 2)
        )
        if p == exit_cell or p == _room_center(r) or doors.has(p):
            continue
        var open_neighbors = 0
        for d in DIRS:
            if not walls.has(p + d):
                open_neighbors += 1
        if open_neighbors >= 3:
            shelves[p] = true

func _place_casks():
    var candidates: Array = []
    for p in floor_cells:
        if manhattan(p, exit_cell) < 6 or doors.has(p) or shelves.has(p):
            continue
        var open_neighbors = 0
        for d in DIRS:
            if not walls.has(p + d):
                open_neighbors += 1
        if open_neighbors >= 3:
            candidates.append(p)
    candidates.shuffle()
    for i in range(min(3, candidates.size())):
        barrels[candidates[i]] = true

# -----------------------------------------------------------------------------
# GEAR = LOOSE CLASS
# -----------------------------------------------------------------------------

func make_player():
    equipped.clear()
    inventory.clear()
    build_affinity = {"Stealth": 0, "Ranged": 0, "Guard": 0, "Ravager": 0}
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
        "facing": DIRS[rng.randi_range(0, DIRS.size() - 1)],
        "last_dir": Vector2i.ZERO,
        "move_state": "STILL",
        "crouched": false
    }

    if starter_loadouts.is_empty():
        _roll_starting_loadouts()
    var starter: Dictionary = starter_loadouts[selected_starter]
    var gear: Dictionary = starter.gear
    for equip_slot in EQUIP_SLOTS:
        var slot = str(equip_slot)
        if gear.has(slot):
            equipped[slot] = gear[slot].duplicate(true)

    _rebuild_player_from_gear(true)
    _roll_inventory(12)

func _blank_attrs() -> Dictionary:
    var a = {}
    for stat in ATTR_NAMES:
        a[stat] = BASE_ATTR
    return a

func _base_slot(slot: String) -> String:
    return "Ring" if slot.begins_with("Ring") else slot

func _generate_item(slot: String, forced_family: String = "") -> Dictionary:
    loot_serial += 1
    var family = forced_family
    if family == "":
        family = str(FAMILIES[rng.randi_range(0, FAMILIES.size() - 1)])

    var rarity = "Common"
    var extra_points = 1
    var roll = rng.randf()
    if roll < 0.18:
        rarity = "Rare"
        extra_points = 3
    elif roll < 0.55:
        rarity = "Enchanted"
        extra_points = 2

    var bonuses = {}
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
    var item = {
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
    if family == "Guard":
        if slot == "Armor":
            return 5
        if slot in ["Helm", "Gloves", "Boots"]:
            return 2
    if family == "Ranged":
        return 2 if slot == "Armor" else 0
    if family == "Stealth":
        return 1 if slot == "Armor" else 0
    if family == "Ravager":
        return 1 if slot == "Armor" else 0
    return 0

func _item_noise(slot: String, family: String) -> int:
    if family == "Guard":
        return 2 if slot == "Armor" else (1 if slot in ["Helm", "Boots"] else 0)
    if family == "Ravager" and slot == "Armor":
        return 1
    return 0

func _weapon_for_family(family: String, display_name: String) -> Dictionary:
    if family == "Stealth":
        return {"name": display_name, "dmin": 4, "dmax": 6, "time": 76, "noise": 2, "push": 0, "stealth": 7, "ranged": false}
    if family == "Ranged":
        return {"name": display_name, "dmin": 2, "dmax": 3, "time": 95, "noise": 3, "push": 0, "stealth": 1, "ranged": true, "rdmin": 5, "rdmax": 8, "rtime": 92, "shot_noise": 18}
    if family == "Guard":
        return {"name": display_name, "dmin": 3, "dmax": 5, "time": 112, "noise": 8, "push": 2, "stealth": 0, "ranged": false}
    return {"name": display_name, "dmin": 7, "dmax": 11, "time": 128, "noise": 12, "push": 1, "stealth": 0, "ranged": false}

func _fists() -> Dictionary:
    return {"name": "Fists", "dmin": 2, "dmax": 3, "time": 100, "noise": 4, "push": 0, "stealth": 0, "ranged": false}

func _roll_inventory(count: int):
    inventory.clear()
    for i in range(count):
        var slot = str(LOOT_SLOTS[rng.randi_range(0, LOOT_SLOTS.size() - 1)])
        inventory.append(_generate_item(slot))
    inventory_page = 0

func _armor_family() -> String:
    if equipped.has("Armor"):
        return str(equipped["Armor"].family)
    return ""

func _item_compatible_with_armor(item: Dictionary) -> bool:
    var slot = str(item.get("slot", ""))
    if slot in ACCESSORY_SLOTS or slot in ["Weapon", "Armor"]:
        return true
    var armor_family = _armor_family()
    if armor_family == "":
        return true
    var item_family = str(item.get("family", ""))
    return str(FAMILY_GROUP.get(item_family, "")) == str(FAMILY_GROUP.get(armor_family, ""))

func _eject_incompatible_gear():
    for equip_slot in EQUIP_SLOTS:
        var slot = str(equip_slot)
        if slot in ACCESSORY_SLOTS or slot in ["Weapon", "Armor"]:
            continue
        if not equipped.has(slot):
            continue
        var item: Dictionary = equipped[slot]
        if not _item_compatible_with_armor(item):
            inventory.append(item)
            equipped.erase(slot)

func _rebuild_player_from_gear(heal_full: bool = false):
    var old_max = int(player.get("max_hp", 19))
    var old_hp = int(player.get("hp", old_max))
    var missing_hp = max(0, old_max - old_hp)
    var attrs = _blank_attrs()
    armor_total = 0
    var noise_total = 0
    build_affinity = {"Stealth": 0, "Ranged": 0, "Guard": 0, "Ravager": 0}
    var weapon_data = _fists()

    for equip_slot in EQUIP_SLOTS:
        var slot = str(equip_slot)
        if not equipped.has(slot):
            continue
        var item: Dictionary = equipped[slot]
        for stat in ATTR_NAMES:
            attrs[stat] += int(item.bonuses.get(stat, 0))
        armor_total += int(item.get("armor", 0))
        noise_total += int(item.get("noise", 0))
        var family = str(item.get("family", ""))
        if build_affinity.has(family):
            build_affinity[family] += 1
        if slot == "Weapon" and item.has("weapon_data"):
            weapon_data = item.weapon_data.duplicate(true)

    player["attrs"] = attrs
    player["weapon"] = weapon_data
    player["clothes"] = {"name": "Equipped gear", "prot": armor_total, "noise": noise_total}
    if bool(weapon_data.get("ranged", false)):
        player["gun"] = str(weapon_data.name)
        if int(player.get("ammo", 0)) <= 0:
            player["ammo"] = 12
    else:
        player["gun"] = ""
        player["ammo"] = 0
    player["max_hp"] = 16 + int(attrs["Vitality"]) * 3
    if heal_full:
        player["hp"] = player.max_hp
    else:
        player["hp"] = max(1, int(player.max_hp) - missing_hp)

func _build_name() -> String:
    var ranked: Array = FAMILIES.duplicate()
    ranked.sort_custom(func(a, b): return int(build_affinity[a]) > int(build_affinity[b]))
    var first = str(ranked[0])
    var second = str(ranked[1])
    var a = int(build_affinity[first])
    var b = int(build_affinity[second])
    if b > 0 and abs(a - b) <= 1:
        return "%s / %s" % [first.to_upper(), second.to_upper()]
    return first.to_upper()

func _gear_score(item: Dictionary) -> int:
    var score = int(item.get("armor", 0)) * 2
    for stat in ATTR_NAMES:
        score += int(item.bonuses.get(stat, 0))
    return score

func _equip_inventory_index(index: int):
    if index < 0 or index >= inventory.size():
        return
    var item: Dictionary = inventory[index]
    if not _item_compatible_with_armor(item):
        msg = "%s is blocked by %s armor." % [str(item.name), _armor_family()]
        queue_redraw()
        return

    inventory.remove_at(index)
    var slot = str(item.slot)
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
    if slot == "Armor":
        _eject_incompatible_gear()
    _rebuild_player_from_gear(false)
    msg = "Equipped %s. Build: %s" % [item.name, _build_name()]
    var max_page = max(0, int(ceil(float(inventory.size()) / 8.0)) - 1)
    inventory_page = min(inventory_page, max_page)
    queue_redraw()

# -----------------------------------------------------------------------------
# PLAYER COMBAT FROM GEAR STATS
# -----------------------------------------------------------------------------

func melee(target: Vector2i):
    var zi = zombie_at(target)
    if zi == -1:
        msg = "Nothing in melee range."
        queue_redraw()
        return
    var z = zombies[zi]
    var stealth = stealth_attack(z)
    var finesse = int(player.attrs["Finesse"])
    var might = int(player.attrs["Might"])
    var chance = clamp(.52 + finesse * .045 - attack_penalty() + (.30 if stealth else 0.0), .12, .97)
    if rng.randf() <= chance:
        var d = rng.randi_range(int(player.weapon.dmin), int(player.weapon.dmax)) + int(floor(might * .65))
        if stealth:
            d = int(round(float(d + int(player.weapon.stealth)) * 1.45))
        zombies[zi].hp -= d
        msg = "%s hit for %d%s." % [player.weapon.name, d, " - STEALTH" if stealth else ""]
        if int(zombies[zi].hp) <= 0:
            kill_zombie(zi, stealth)
        else:
            var push = int(player.weapon.push) + int(floor(might / 5.0))
            if push > 0:
                push_zombie(zi, player.facing)
    else:
        msg = "%s misses." % player.weapon.name
    emit_noise(player.pos, int(player.weapon.noise), "melee", true)
    var cost = max(50, int(player.weapon.time) - finesse * 3)
    commit_action(cost)

func shoot(i: int):
    if player.gun == "" or int(player.ammo) <= 0:
        msg = "No ranged weapon ready."
        queue_redraw()
        return
    var z = zombies[i]
    if z.dead or not visible_cells.has(z.pos):
        return
    player.facing = dominant(z.pos - player.pos)
    var dist = manhattan(player.pos, z.pos)
    var finesse = int(player.attrs["Finesse"])
    var awareness_stat = int(player.attrs["Awareness"])
    var chance = clamp(.48 + finesse * .045 + awareness_stat * .025 - max(0, dist - 3) * .04 - attack_penalty(), .12, .95)
    player.ammo -= 1
    stats.shots += 1
    if rng.randf() <= chance:
        var d = rng.randi_range(int(player.weapon.get("rdmin", 5)), int(player.weapon.get("rdmax", 8))) + int(floor(finesse * .35))
        zombies[i].hp -= d
        msg = "%s hits for %d." % [player.gun, d]
        if int(zombies[i].hp) <= 0:
            kill_zombie(i, false)
    else:
        msg = "%s misses." % player.gun
    emit_noise(player.pos, int(player.weapon.get("shot_noise", 18)), "bowshot", true)
    commit_action(int(player.weapon.get("rtime", 92)))

func shoot_barrel(cell: Vector2i):
    if player.gun == "" or int(player.ammo) <= 0:
        msg = "Need a ranged weapon."
        queue_redraw()
        return
    player.ammo -= 1
    stats.shots += 1
    barrels.erase(cell)
    msg = "Cask detonates."
    for i in range(zombies.size()):
        if zombies[i].dead:
            continue
        var d = manhattan(cell, zombies[i].pos)
        if d <= 3:
            zombies[i].hp -= max(3, rng.randi_range(10, 17) - d * 2)
            if int(zombies[i].hp) <= 0:
                kill_zombie(i, false)
            else:
                push_zombie(i, dominant(zombies[i].pos - cell))
    if manhattan(cell, player.pos) <= 3:
        hurt(max(1, 12 - manhattan(cell, player.pos) * 3), "blast")
    emit_noise(cell, 125, "explosion", false)
    commit_action(int(player.weapon.get("rtime", 92)))

func awareness() -> float:
    return max(0.0, float(player.attrs["Awareness"]) - float(player.fear) / 40.0)

func view_range() -> int:
    return clamp(6 + int(floor(float(player.attrs["Awareness"]) / 2.0)), 6, 12)

func attack_penalty() -> float:
    return max(0.0, float(player.fear - 45) * .0018)

func add_fear(n: int):
    var resist = int(player.attrs["Will"])
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
    var actual = min(zombie_spawn_count, candidates.size())
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
    var r = WALKER_SIGHT - (2 if player.crouched else 0)
    return in_cone(z.pos, z.facing, player.pos, r, .40) and has_los(z.pos, player.pos)

func zombie_attack(i: int):
    var pressure = crowd_pressure()
    var chance = clamp(WALKER_HIT + min(.28, pressure * .05), .18, .88)
    if rng.randf() <= chance:
        var d = max(1, rng.randi_range(WALKER_DMIN, WALKER_DMAX) - armor_total)
        hurt(d, "walker attack")
        msg = "Walker hits for %d. Armor %d. Pressure %.1f." % [d, armor_total, pressure]
    else:
        msg = "Walker attack misses."
    add_fear(8 + int(round(pressure * 2.0)))
    emit_noise(zombies[i].pos, 18, "struggle", false)
    if not zombies[i].dead:
        zombies[i].next = tick + WALKER_ATTACK

# -----------------------------------------------------------------------------
# INPUT / WRAPPER
# -----------------------------------------------------------------------------

func _unhandled_input(e):
    if setup_open:
        if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_ENTER:
            _start_dungeon()
            get_viewport().set_input_as_handled()
        return
    if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_I:
        character_open = not character_open
        queue_redraw()
        get_viewport().set_input_as_handled()
        return
    super._unhandled_input(e)

func handle_touch_point(pos: Vector2):
    if setup_open:
        _handle_setup_touch(pos)
        return

    if character_open:
        if btn_char_close.has_point(pos):
            character_open = false
            queue_redraw()
            return
        if btn_inv_prev.has_point(pos):
            inventory_page = max(0, inventory_page - 1)
            queue_redraw()
            return
        if btn_inv_next.has_point(pos):
            var max_page = max(0, int(ceil(float(inventory.size()) / 8.0)) - 1)
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

    if menu_open and btn_menu_new.has_point(pos):
        _open_setup()
        return

    super.handle_touch_point(pos)

func _handle_setup_touch(pos: Vector2):
    if btn_setup_roll.has_point(pos):
        _roll_starting_loadouts()
        return
    for i in range(starter_loadouts.size()):
        if _starter_rect(i).has_point(pos):
            selected_starter = i
            queue_redraw()
            return
    if btn_setup_z_minus.has_point(pos):
        zombie_spawn_count = max(0, zombie_spawn_count - 1)
        queue_redraw()
        return
    if btn_setup_z_plus.has_point(pos):
        zombie_spawn_count = min(40, zombie_spawn_count + 1)
        queue_redraw()
        return
    if btn_setup_start.has_point(pos):
        _start_dungeon()
        return
    if btn_setup_exit.has_point(pos):
        exit_to_google()

func _starter_rect(index: int) -> Rect2:
    return Rect2(32, 194 + index * 158, 656, 142)

func _inventory_row_rect(row: int) -> Rect2:
    return Rect2(36, 716 + row * 50, 648, 44)

func _item_bonus_text(item: Dictionary) -> String:
    var parts: Array[String] = []
    var short = {"Might": "MGT", "Finesse": "FIN", "Awareness": "AWR", "Vitality": "VIT", "Will": "WIL"}
    for stat in ATTR_NAMES:
        var v = int(item.bonuses.get(stat, 0))
        if v > 0:
            parts.append("%s+%d" % [short[stat], v])
    if int(item.get("armor", 0)) > 0:
        parts.append("ARM+%d" % int(item.armor))
    return " ".join(parts)

# -----------------------------------------------------------------------------
# DRAWING
# -----------------------------------------------------------------------------

func _draw():
    if setup_open:
        draw_setup_screen()
        return
    super._draw()

func draw_setup_screen():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(.018, .022, .027, 1.0))
    draw_string(font, Vector2(32, 48), "BOUNDLESS ADVENTURE", HORIZONTAL_ALIGNMENT_LEFT, -1, 25, Color.WHITE)
    draw_string(font, Vector2(32, 76), "ROLL A KIT, PICK YOUR START, THEN BUILD THE DUNGEON", HORIZONTAL_ALIGNMENT_LEFT, 656, 12, Color(.72, .76, .80))
    draw_touch_button(btn_setup_roll, "ROLL STARTING GEAR", false, 16)

    for i in range(starter_loadouts.size()):
        var loadout: Dictionary = starter_loadouts[i]
        var rect = _starter_rect(i)
        var selected = i == selected_starter
        var fill = Color(.15, .18, .20, .98) if selected else Color(.055, .065, .075, .98)
        var edge = Color(.95, .80, .36) if selected else Color(.28, .32, .36)
        draw_rect(rect, fill)
        draw_rect(rect, edge, false, 2 if selected else 1)
        var family = str(loadout.family)
        var gear: Dictionary = loadout.gear
        var armor: Dictionary = gear["Armor"]
        var weapon: Dictionary = gear["Weapon"]
        var identity = "quiet rear kills" if family == "Stealth" else ("distance + limited ammo" if family == "Ranged" else ("low damage / high defense" if family == "Guard" else "high damage / low defense"))
        draw_string(font, Vector2(rect.position.x + 14, rect.position.y + 25), family.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, 210, 17, Color.WHITE)
        draw_string(font, Vector2(rect.position.x + 220, rect.position.y + 25), identity, HORIZONTAL_ALIGNMENT_LEFT, 410, 11, Color(.78, .82, .84))
        draw_string(font, Vector2(rect.position.x + 14, rect.position.y + 55), "WEAPON  %s" % str(weapon.name), HORIZONTAL_ALIGNMENT_LEFT, 620, 12, Color(.90, .92, .92))
        draw_string(font, Vector2(rect.position.x + 14, rect.position.y + 80), "ARMOR   %s  | ARM %d" % [str(armor.name), int(armor.armor)], HORIZONTAL_ALIGNMENT_LEFT, 620, 12, Color(.90, .92, .92))
        draw_string(font, Vector2(rect.position.x + 14, rect.position.y + 108), "Accessories are mixed rolls; armor only gates physical gear groups.", HORIZONTAL_ALIGNMENT_LEFT, 620, 10, Color(.66, .70, .73))
        if selected:
            draw_string(font, Vector2(rect.position.x + 540, rect.position.y + 25), "SELECTED", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(.95, .80, .36))

    draw_string(font, Vector2(0, 858), "ZOMBIES IN THIS DUNGEON", HORIZONTAL_ALIGNMENT_CENTER, SCREEN_W, 13, Color(.95, .80, .36))
    draw_touch_button(btn_setup_z_minus, "-", false, 24)
    draw_string(font, Vector2(220, 925), str(zombie_spawn_count), HORIZONTAL_ALIGNMENT_CENTER, 280, 28, Color.WHITE)
    draw_touch_button(btn_setup_z_plus, "+", false, 24)
    draw_touch_button(btn_setup_start, "GENERATE DUNGEON", false, 18)
    draw_touch_button(btn_setup_exit, "EXIT TO GOOGLE", false, 13)
    draw_string(font, Vector2(32, 1185), "STEALTH + RANGED physical gear mix together. GUARD + RAVAGER physical gear mix together.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.65, .68, .72))
    draw_string(font, Vector2(32, 1210), "Rings and amulets always cross groups. Weapons always remain swappable.", HORIZONTAL_ALIGNMENT_LEFT, 656, 10, Color(.65, .68, .72))

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
    var ranged_text = " | AMMO %d" % int(player.ammo) if player.gun != "" else ""
    draw_string(font, Vector2(18, 234), "%s%s" % [player.weapon.name, ranged_text], HORIZONTAL_ALIGNMENT_LEFT, 680, 13, Color.WHITE)
    draw_string(font, Vector2(18, 258), "Armor anchor: %s   |   Walkers: %d" % [_armor_family().to_upper(), zombies.size()], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(.76, .78, .8))

    draw_string(font, Vector2(18, 292), "OBJECTIVE", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 315), "CACHE ACQUIRED - RETURN TO STAIR" if objective_taken else "FIND THE DUNGEON CACHE", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
    draw_string(font, Vector2(18, 344), msg, HORIZONTAL_ALIGNMENT_LEFT, 684, 12, Color(.93, .94, .90))
    draw_string(font, Vector2(18, 370), submsg, HORIZONTAL_ALIGNMENT_LEFT, 684, 11, Color(.68, .72, .68))
    draw_string(font, Vector2(18, 400), "Kills %d  Alerted %d  Stealth %d  Shots %d  Noise %d" % [stats.kills, stats.alerted, stats.stealth, stats.shots, stats.noise], HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(.75, .78, .75))

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
        draw_string(font, Vector2(150, 842), "MENU > NEW SETUP", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.8, .82, .8))

    if menu_open:
        draw_menu_overlay()
    if character_open:
        draw_character_overlay()

func draw_menu_overlay():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(0, 0, 0, .76))
    draw_rect(Rect2(70, 390, 580, 430), Color(.035, .04, .05, .995))
    draw_rect(Rect2(70, 390, 580, 430), Color(.75, .68, .35), false, 2)
    draw_string(font, Vector2(110, 438), "BOUNDLESS ADVENTURE", HORIZONTAL_ALIGNMENT_LEFT, -1, 23, Color.WHITE)
    draw_touch_button(btn_resume, "RESUME", false)
    draw_touch_button(btn_menu_new, "NEW SETUP", false)
    draw_touch_button(btn_exit_google, "EXIT TO GOOGLE", false)
    draw_string(font, Vector2(110, 790), "New Setup returns to gear + zombie selection before generating another floor.", HORIZONTAL_ALIGNMENT_LEFT, 500, 11, Color(.72, .75, .72))

func draw_character_overlay():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(.018, .021, .028, .995))
    draw_string(font, Vector2(28, 52), "CHARACTER / INVENTORY", HORIZONTAL_ALIGNMENT_LEFT, -1, 23, Color.WHITE)
    draw_touch_button(btn_char_close, "CLOSE", false)

    var a: Dictionary = player.attrs
    draw_string(font, Vector2(28, 96), "%s   BUILD: %s" % [player.name, _build_name()], HORIZONTAL_ALIGNMENT_LEFT, 660, 16, Color(.68, .82, 1))
    draw_string(font, Vector2(28, 126), "MGT %d   FIN %d   AWR %d   VIT %d   WIL %d" % [a.Might, a.Finesse, a.Awareness, a.Vitality, a.Will], HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
    draw_string(font, Vector2(28, 151), "HP %d/%d   ARM %d   ARMOR ANCHOR: %s" % [player.hp, player.max_hp, armor_total, _armor_family().to_upper()], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(.8, .82, .84))
    draw_string(font, Vector2(28, 184), "PHYSICAL GEAR FOLLOWS ARMOR GROUP - ACCESSORIES + WEAPONS DO NOT", HORIZONTAL_ALIGNMENT_LEFT, 660, 11, Color(.95, .8, .36))

    for i in range(EQUIP_SLOTS.size()):
        var col = i / 5
        var row = i % 5
        var x = 28.0 + col * 346.0
        var y = 218.0 + row * 54.0
        var slot = str(EQUIP_SLOTS[i])
        draw_string(font, Vector2(x, y), slot.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(.65, .68, .72))
        var text = "- empty -"
        var detail = ""
        if equipped.has(slot):
            var item: Dictionary = equipped[slot]
            text = str(item.name)
            detail = "%s | %s" % [item.family, _item_bonus_text(item)]
        draw_string(font, Vector2(x, y + 17), text, HORIZONTAL_ALIGNMENT_LEFT, 326, 11, Color.WHITE)
        draw_string(font, Vector2(x, y + 34), detail, HORIZONTAL_ALIGNMENT_LEFT, 326, 9, Color(.70, .74, .78))

    draw_string(font, Vector2(28, 690), "INVENTORY - grey items are blocked by your current armor", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    var start = inventory_page * 8
    for row in range(8):
        var idx = start + row
        var rect = _inventory_row_rect(row)
        draw_rect(rect, Color(.055, .065, .075, .96))
        draw_rect(rect, Color(.25, .29, .33), false, 1)
        if idx < inventory.size():
            var item: Dictionary = inventory[idx]
            var compatible = _item_compatible_with_armor(item)
            var text_color = Color.WHITE if compatible else Color(.42, .44, .46)
            var detail_color = Color(.72, .78, .82) if compatible else Color(.34, .36, .38)
            var suffix = "" if compatible else "  [BLOCKED BY %s ARMOR]" % _armor_family().to_upper()
            draw_string(font, Vector2(rect.position.x + 10, rect.position.y + 18), "%s   [%s / %s]%s" % [item.name, item.family, item.slot, suffix], HORIZONTAL_ALIGNMENT_LEFT, 620, 11, text_color)
            draw_string(font, Vector2(rect.position.x + 10, rect.position.y + 36), _item_bonus_text(item), HORIZONTAL_ALIGNMENT_LEFT, 620, 10, detail_color)

    var pages = max(1, int(ceil(float(inventory.size()) / 8.0)))
    draw_touch_button(btn_inv_prev, "PREV", false)
    draw_touch_button(btn_inv_next, "NEXT", false)
    draw_string(font, Vector2(580, 1197), "%d/%d" % [inventory_page + 1, pages], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(.8, .82, .84))
    draw_string(font, Vector2(32, 1252), "Changing armor automatically unequips physical pieces that its group cannot support.", HORIZONTAL_ALIGNMENT_LEFT, 650, 10, Color(.62, .66, .70))
