extends "res://scripts/MainMobileWeb.gd"

# Arena dungeon layer.
# Keeps the combat/perception/mobile stack intact while swapping the authored
# convenience-store board for a dense stone dungeon test map.

func _ready():
    exit_cell = Vector2i(2, 16)
    objective_spots = [
        Vector2i(11, 4),
        Vector2i(16, 7),
        Vector2i(20, 3),
        Vector2i(23, 4),
        Vector2i(19, 11)
    ]
    # The dungeon has no store alarm interaction.
    alarm = Vector2i(-99, -99)
    super._ready()

func reset_run():
    super.reset_run()
    msg = "Find the cache hidden in the dungeon and escape."
    submsg = "Stone walls choke sight and sound. Every zombie already exists here."
    queue_redraw()

func build_map():
    walls.clear()
    shelves.clear()
    glass.clear()
    doors.clear()
    barrels.clear()

    # Outer stone shell.
    for x in range(W):
        walls[Vector2i(x, 0)] = true
        walls[Vector2i(x, H - 1)] = true
    for y in range(H):
        walls[Vector2i(0, y)] = true
        walls[Vector2i(W - 1, y)] = true

    # Entrance crypt / lower-left chambers.
    for x in range(1, 9):
        walls[Vector2i(x, 13)] = true
    for y in range(9, 17):
        walls[Vector2i(8, y)] = true
    for x in range(1, 14):
        walls[Vector2i(x, 9)] = true

    # Upper-left crypt chambers.
    for x in range(1, 10):
        walls[Vector2i(x, 5)] = true
    for y in range(1, 10):
        walls[Vector2i(9, y)] = true

    # Central spine and chambers.
    for y in range(1, 14):
        walls[Vector2i(13, y)] = true
    for x in range(13, 19):
        walls[Vector2i(x, 5)] = true
    for y in range(1, 14):
        walls[Vector2i(18, y)] = true

    # Eastern crypts and lower gallery.
    for x in range(13, 25):
        walls[Vector2i(x, 9)] = true
    for y in range(1, 10):
        walls[Vector2i(22, y)] = true
    for x in range(13, 25):
        walls[Vector2i(x, 13)] = true

    # Carve doorways after all intersecting walls exist.
    var door_cells := [
        Vector2i(5, 13), Vector2i(8, 12), Vector2i(8, 15),
        Vector2i(3, 9), Vector2i(11, 9),
        Vector2i(5, 5), Vector2i(9, 3), Vector2i(9, 7),
        Vector2i(13, 4), Vector2i(13, 7), Vector2i(13, 11),
        Vector2i(15, 5),
        Vector2i(18, 3), Vector2i(18, 7), Vector2i(18, 11),
        Vector2i(16, 9), Vector2i(21, 9), Vector2i(22, 6),
        Vector2i(16, 13), Vector2i(21, 13)
    ]
    for p in door_cells:
        walls.erase(p)
        doors[p] = false

    # Stone sarcophagi / collapsed blocks. Reuse the existing solid-obstacle
    # container so LOS, pathing and sound propagation continue to work.
    var tombs := [
        Vector2i(2, 11), Vector2i(6, 11),
        Vector2i(3, 7), Vector2i(6, 7),
        Vector2i(4, 3), Vector2i(5, 3),
        Vector2i(10, 3), Vector2i(11, 3),
        Vector2i(10, 7), Vector2i(11, 7),
        Vector2i(15, 2), Vector2i(16, 2),
        Vector2i(20, 6), Vector2i(23, 11),
        Vector2i(10, 15), Vector2i(11, 15)
    ]
    for p in tombs:
        shelves[p] = true

    # Volatile old casks preserve Arena's explosion/noise test mechanic.
    for p in [Vector2i(7, 10), Vector2i(17, 15), Vector2i(23, 3)]:
        barrels[p] = true

func spawn_zombies():
    zombies.clear()
    var pts := [
        Vector2i(4, 11), Vector2i(6, 6), Vector2i(3, 4),
        Vector2i(10, 11), Vector2i(11, 6), Vector2i(11, 2),
        Vector2i(15, 3), Vector2i(16, 8),
        Vector2i(20, 4), Vector2i(23, 7),
        Vector2i(16, 11), Vector2i(21, 11),
        Vector2i(15, 15), Vector2i(20, 15)
    ]
    for i in range(pts.size()):
        zombies.append({
            "id": i,
            "pos": pts[i],
            "facing": DIRS[rng.randi_range(0, 3)],
            "hp": rng.randi_range(8, 13),
            "state": "IDLE",
            "target": Vector2i(-1, -1),
            "heard": Vector2i(-1, -1),
            "next": rng.randi_range(60, 180),
            "alerted": false,
            "dead": false
        })

func draw_map():
    # Cold stone floor instead of the store footprint.
    for y in range(H):
        for x in range(W):
            var p := Vector2i(x, y)
            var shade := .105 if (x + y) % 2 == 0 else .118
            var c := Color(shade, shade, shade + .012)
            draw_rect(Rect2(cell_to_screen(p), Vector2(TILE, TILE)), c)
            draw_rect(Rect2(cell_to_screen(p), Vector2(TILE, TILE)), Color(.055, .058, .065), false, 1)

    for p in walls.keys():
        tile(p, Color(.245, .25, .275))
        draw_rect(Rect2(cell_to_screen(p) + Vector2(3, 3), Vector2(TILE - 6, TILE - 6)), Color(.19, .195, .215), false, 1)

    for p in shelves.keys():
        tile(p, Color(.30, .305, .325))
        draw_rect(Rect2(cell_to_screen(p) + Vector2(5, 7), Vector2(TILE - 10, TILE - 14)), Color(.16, .165, .18), false, 2)

    for p in doors.keys():
        tile(p, Color(.20, .29, .24) if doors[p] else Color(.35, .22, .12))
        label_at(p, "D", 14)

    for p in barrels.keys():
        tile(p, Color(.48, .18, .10))
        label_at(p, "CASK", 7)

    tile(exit_cell, Color(.12, .36, .28))
    label_at(exit_cell, "STAIR", 7)

    if not objective_taken:
        tile(objective, Color(.52, .43, .12))
        label_at(objective, "CACHE", 7)
