extends "res://scripts/MainArenaDevCreatures.gd"

# Open arena-style procgen: a large central fighting space, four satellite rooms,
# wide lanes, loops, sparse pillars, gates, casks and loot chests.

func build_map():
    walls.clear()
    shelves.clear()
    glass.clear()
    doors.clear()
    barrels.clear()
    dungeon_rooms.clear()
    floor_cells.clear()
    loot_chests.clear()
    for y in range(H):
        for x in range(W):
            walls[Vector2i(x, y)] = true

    var cw = rng.randi_range(10, 13)
    var ch = rng.randi_range(6, 8)
    var cx = clampi(int((W - cw) / 2) + rng.randi_range(-1, 1), 4, W - cw - 4)
    var cy = clampi(int((H - ch) / 2) + rng.randi_range(-1, 1), 3, H - ch - 3)
    var center_room = Rect2i(cx, cy, cw, ch)
    dungeon_rooms.append(center_room)
    _carve_room(center_room)
    for corner in range(4):
        var room = _make_corner_room(corner)
        dungeon_rooms.append(room)
        _carve_room(room)

    var center = _room_center(center_room)
    for i in range(1, dungeon_rooms.size()):
        _carve_arena_connection(_room_center(dungeon_rooms[i]), center, i % 2 == 0)
    _carve_arena_connection(_room_center(dungeon_rooms[1]), _room_center(dungeon_rooms[4]), true)

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

    var stair_room_index = rng.randi_range(1, dungeon_rooms.size() - 1)
    exit_cell = _room_center(dungeon_rooms[stair_room_index])
    objective_spots.clear()
    var farthest = center
    var farthest_dist = -1
    for i in range(1, dungeon_rooms.size()):
        if i == stair_room_index:
            continue
        var c = _room_center(dungeon_rooms[i])
        var dist = manhattan(c, exit_cell)
        if dist >= 8:
            objective_spots.append(c)
        if dist > farthest_dist:
            farthest = c
            farthest_dist = dist
    if objective_spots.is_empty():
        objective_spots.append(farthest)
    _place_arena_pillars()
    _place_arena_casks()
    _place_arena_chests()

func _make_corner_room(corner: int) -> Rect2i:
    var rw = rng.randi_range(6, 9)
    var rh = rng.randi_range(4, 6)
    var jx = rng.randi_range(0, 1)
    var jy = rng.randi_range(0, 1)
    var rx = 1 + jx
    var ry = 1 + jy
    if corner in [1, 3]:
        rx = W - rw - 1 - jx
    if corner in [2, 3]:
        ry = H - rh - 1 - jy
    return Rect2i(rx, ry, rw, rh)

func _carve_wide_h(x1: int, x2: int, y: int):
    _carve_h(x1, x2, y)
    _carve_h(x1, x2, y + 1)

func _carve_wide_v(y1: int, y2: int, x: int):
    _carve_v(y1, y2, x)
    _carve_v(y1, y2, x + 1)

func _carve_arena_connection(a: Vector2i, b: Vector2i, horizontal_first: bool):
    if horizontal_first:
        _carve_wide_h(a.x, b.x, a.y)
        _carve_wide_v(a.y, b.y, b.x)
        if abs(b.x - a.x) >= 6:
            var gx = int(round((a.x + b.x) * .5))
            _place_gate_pair(Vector2i(gx, a.y), Vector2i(gx, a.y + 1))
    else:
        _carve_wide_v(a.y, b.y, a.x)
        _carve_wide_h(a.x, b.x, b.y)
        if abs(b.y - a.y) >= 6:
            var gy = int(round((a.y + b.y) * .5))
            _place_gate_pair(Vector2i(a.x, gy), Vector2i(a.x + 1, gy))

func _place_gate_pair(a: Vector2i, b: Vector2i):
    if inside(a) and inside(b):
        walls.erase(a)
        walls.erase(b)
        doors[a] = false
        doors[b] = false

func _place_arena_pillars():
    for i in range(dungeon_rooms.size()):
        var room: Rect2i = dungeon_rooms[i]
        var count = 2 if i == 0 else rng.randi_range(0, 1)
        var placed = 0
        var tries = 0
        while placed < count and tries < 20:
            tries += 1
            var p = Vector2i(rng.randi_range(room.position.x + 1, room.end.x - 2), rng.randi_range(room.position.y + 1, room.end.y - 2))
            if p == exit_cell or doors.has(p) or shelves.has(p):
                continue
            var near_objective = false
            for o in objective_spots:
                if manhattan(p, o) <= 1:
                    near_objective = true
                    break
            if near_objective:
                continue
            shelves[p] = true
            placed += 1

func _place_arena_casks():
    var candidates: Array = []
    for p in floor_cells:
        if manhattan(p, exit_cell) < 5 or doors.has(p) or shelves.has(p):
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

func _place_arena_chests():
    var candidates: Array = []
    for p in floor_cells:
        if p == exit_cell or doors.has(p) or shelves.has(p) or barrels.has(p):
            continue
        if manhattan(p, exit_cell) < 5:
            continue
        var near_objective = false
        for o in objective_spots:
            if manhattan(p, o) <= 1:
                near_objective = true
                break
        if not near_objective:
            candidates.append(p)
    candidates.shuffle()
    for i in range(min(CHEST_COUNT, candidates.size())):
        loot_chests[candidates[i]] = true
