extends "res://scripts/MainArenaMap.gd"

# Code-drawn Arena tile set and readable monster icons. Player intentionally remains
# a simple circle until the later paper-doll / visible-equipment pass.

func _tile_rect(p: Vector2i) -> Rect2:
    return Rect2(cell_to_screen(p), Vector2(TILE, TILE))

func _draw_floor_tile(p: Vector2i):
    var r = _tile_rect(p)
    var alt = ((p.x * 17 + p.y * 31) % 5) < 2
    var base = Color(.18, .185, .20) if alt else Color(.15, .155, .17)
    draw_rect(r, base)
    draw_rect(r.grow(-1), Color(.26, .27, .29, .42), false, 1)
    if (p.x + p.y) % 2 == 0:
        draw_line(r.position + Vector2(2, TILE * .52), r.position + Vector2(TILE - 2, TILE * .52), Color(.10, .105, .12, .7), 1)
    if (p.x * 3 + p.y) % 7 == 0:
        draw_line(r.position + Vector2(7, 8), r.position + Vector2(13, 12), Color(.28, .29, .31, .65), 1)
        draw_line(r.position + Vector2(13, 12), r.position + Vector2(10, 17), Color(.28, .29, .31, .65), 1)

func _draw_wall_tile(p: Vector2i):
    var r = _tile_rect(p)
    draw_rect(r, Color(.11, .115, .13))
    draw_rect(r.grow(-2), Color(.29, .30, .33))
    draw_line(r.position + Vector2(2, 3), r.position + Vector2(TILE - 2, 3), Color(.46, .47, .51, .75), 2)
    draw_line(r.position + Vector2(2, TILE - 3), r.position + Vector2(TILE - 2, TILE - 3), Color(.07, .075, .09), 2)
    draw_line(r.position + Vector2(2, TILE * .5), r.position + Vector2(TILE - 2, TILE * .5), Color(.16, .17, .19), 2)
    var split = 10 if (p.x + p.y) % 2 == 0 else 19
    draw_line(r.position + Vector2(split, 3), r.position + Vector2(split, TILE * .5), Color(.16, .17, .19), 2)

func _draw_pillar_tile(p: Vector2i):
    var c = cell_to_screen(p) + Vector2(TILE / 2, TILE / 2)
    draw_rect(Rect2(c - Vector2(11, 11), Vector2(22, 22)), Color(.12, .13, .15))
    draw_rect(Rect2(c - Vector2(8, 8), Vector2(16, 16)), Color(.38, .39, .42))
    draw_circle(c, 6, Color(.19, .20, .23))
    draw_circle(c, 7, Color(.57, .58, .61, .65), false, 1)

func _draw_door_tile(p: Vector2i, opened: bool):
    var r = _tile_rect(p)
    if opened:
        draw_rect(r.grow(-4), Color(.20, .21, .23), false, 3)
        draw_line(r.position + Vector2(7, 5), r.position + Vector2(13, TILE - 5), Color(.48, .29, .17), 5)
        return
    draw_rect(r.grow(-4), Color(.31, .17, .10))
    draw_line(r.position + Vector2(8, 6), r.position + Vector2(8, TILE - 6), Color(.52, .31, .18), 3)
    draw_line(r.position + Vector2(TILE - 8, 6), r.position + Vector2(TILE - 8, TILE - 6), Color(.19, .11, .07), 3)
    draw_line(r.position + Vector2(4, 10), r.position + Vector2(TILE - 4, 10), Color(.52, .54, .57), 3)
    draw_line(r.position + Vector2(4, TILE - 10), r.position + Vector2(TILE - 4, TILE - 10), Color(.52, .54, .57), 3)
    draw_circle(r.position + Vector2(TILE - 9, TILE * .5), 2, Color(.88, .71, .29))

func _draw_cask_tile(p: Vector2i):
    var c = cell_to_screen(p) + Vector2(TILE / 2, TILE / 2)
    draw_circle(c, 10, Color(.40, .18, .10))
    draw_rect(Rect2(c + Vector2(-10, -4), Vector2(20, 3)), Color(.48, .50, .52))
    draw_rect(Rect2(c + Vector2(-10, 4), Vector2(20, 3)), Color(.48, .50, .52))
    draw_line(c + Vector2(-3, -8), c + Vector2(3, 8), Color(.82, .36, .18), 2)

func _draw_stair_tile(p: Vector2i):
    var r = _tile_rect(p)
    for n in range(4):
        draw_rect(Rect2(r.position + Vector2(4 + n * 3, 5 + n * 4), Vector2(22 - n * 6, 4)), Color(.42 + n * .04, .46 + n * .04, .48 + n * .04))
    draw_rect(r, Color(.47, .77, .64, .8), false, 2)

func _draw_cache_tile(p: Vector2i):
    var r = _tile_rect(p)
    draw_rect(Rect2(r.position + Vector2(5, 9), Vector2(20, 15)), Color(.44, .35, .12))
    draw_rect(Rect2(r.position + Vector2(5, 9), Vector2(20, 15)), Color(.78, .66, .25), false, 2)
    draw_line(r.position + Vector2(15, 9), r.position + Vector2(15, 24), Color(.86, .74, .32), 2)
    draw_rect(r, Color(.95, .78, .30, .9), false, 2)

func _draw_chest_tile(p: Vector2i, active: bool):
    var r = _tile_rect(p)
    var mod = 1.0 if active else .42
    draw_rect(Rect2(r.position + Vector2(5, 11), Vector2(20, 13)), Color(.36 * mod, .20 * mod, .09 * mod, 1))
    draw_rect(Rect2(r.position + Vector2(5, 11), Vector2(20, 13)), Color(.72 * mod, .48 * mod, .18 * mod, 1), false, 2)
    draw_line(r.position + Vector2(5, 16), r.position + Vector2(25, 16), Color(.48 * mod, .50 * mod, .52 * mod, 1), 2)
    draw_rect(Rect2(r.position + Vector2(13, 15), Vector2(4, 5)), Color(.88 * mod, .71 * mod, .29 * mod, 1))

func draw_map():
    for y in range(H):
        for x in range(W):
            _draw_floor_tile(Vector2i(x, y))
    for p in walls.keys():
        _draw_wall_tile(p)
    for p in shelves.keys():
        _draw_pillar_tile(p)
    for p in doors.keys():
        _draw_door_tile(p, bool(doors[p]))
    for p in barrels.keys():
        _draw_cask_tile(p)
    _draw_stair_tile(exit_cell)
    if not objective_taken:
        _draw_cache_tile(objective)
    for p in loot_chests.keys():
        _draw_chest_tile(p, bool(loot_chests[p]))

func _draw_walker_icon(c: Vector2, alpha: float = 1.0):
    draw_circle(c + Vector2(0, 3), 8, Color(.31, .43, .28, alpha))
    draw_circle(c + Vector2(1, -7), 5, Color(.53, .61, .45, alpha))
    draw_line(c + Vector2(-6, 1), c + Vector2(-11, 7), Color(.42, .53, .36, alpha), 4)
    draw_line(c + Vector2(6, 1), c + Vector2(11, 6), Color(.42, .53, .36, alpha), 4)
    draw_line(c + Vector2(-3, 9), c + Vector2(-6, 13), Color(.42, .53, .36, alpha), 4)
    draw_line(c + Vector2(3, 9), c + Vector2(6, 13), Color(.42, .53, .36, alpha), 4)
    draw_circle(c + Vector2(-1, -8), 1.2, Color(.92, .82, .28, alpha))
    draw_circle(c + Vector2(3, -8), 1.2, Color(.92, .82, .28, alpha))

func _draw_ripper_icon(c: Vector2, alpha: float = 1.0):
    draw_circle(c + Vector2(-1, 3), 8, Color(.48, .16, .16, alpha))
    draw_circle(c + Vector2(7, -4), 4.5, Color(.69, .29, .22, alpha))
    draw_line(c + Vector2(-6, 4), c + Vector2(-12, 11), Color(.63, .25, .20, alpha), 3)
    draw_line(c + Vector2(2, 8), c + Vector2(-1, 14), Color(.63, .25, .20, alpha), 3)
    draw_line(c + Vector2(5, 6), c + Vector2(10, 13), Color(.63, .25, .20, alpha), 3)
    draw_line(c + Vector2(8, 0), c + Vector2(13, 6), Color(.63, .25, .20, alpha), 3)
    draw_circle(c + Vector2(8, -5), 1.2, Color(1, .78, .29, alpha))
    draw_line(c + Vector2(12, 2), c + Vector2(15, 4), Color(.88, .76, .60, alpha), 2)

func _draw_brute_icon(c: Vector2, alpha: float = 1.0):
    draw_rect(Rect2(c + Vector2(-10, -2), Vector2(20, 15)), Color(.35, .31, .41, alpha))
    draw_circle(c + Vector2(0, -8), 7, Color(.56, .50, .60, alpha))
    draw_circle(c + Vector2(-12, 4), 5, Color(.48, .42, .53, alpha))
    draw_circle(c + Vector2(12, 4), 5, Color(.48, .42, .53, alpha))
    draw_line(c + Vector2(-5, 12), c + Vector2(-7, 15), Color(.43, .38, .48, alpha), 5)
    draw_line(c + Vector2(5, 12), c + Vector2(7, 15), Color(.43, .38, .48, alpha), 5)
    draw_circle(c + Vector2(-2, -9), 1.3, Color(.94, .80, .32, alpha))
    draw_circle(c + Vector2(3, -9), 1.3, Color(.94, .80, .32, alpha))

func _draw_creature_icon(kind: String, c: Vector2, alpha: float = 1.0):
    if kind == "Ripper":
        _draw_ripper_icon(c, alpha)
    elif kind == "Brute":
        _draw_brute_icon(c, alpha)
    else:
        _draw_walker_icon(c, alpha)

func draw_units():
    for z in zombies:
        if z.dead and visible_cells.has(z.pos):
            var dc = cell_to_screen(z.pos) + Vector2(TILE / 2, TILE / 2)
            _draw_creature_icon(str(z.get("kind", "Walker")), dc, .45)
            draw_line(dc + Vector2(-9, -7), dc + Vector2(9, 7), Color(.60, .08, .08), 3)
            draw_line(dc + Vector2(-9, 7), dc + Vector2(9, -7), Color(.60, .08, .08), 3)

    for key in last_seen.keys():
        var i = int(key)
        if i < 0 or i >= zombies.size():
            continue
        var z = zombies[i]
        if z.dead or visible_cells.has(z.pos):
            continue
        var lp: Vector2i = last_seen[i].pos
        var lc = cell_to_screen(lp) + Vector2(TILE / 2, TILE / 2)
        _draw_creature_icon(str(z.get("kind", "Walker")), lc, .35)
        draw_string(font, lc + Vector2(-12, -14), "LAST", HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(.70, .72, .72, .8))

    for i in range(zombies.size()):
        var z = zombies[i]
        if z.dead or not visible_cells.has(z.pos):
            continue
        var c = cell_to_screen(z.pos) + Vector2(TILE / 2, TILE / 2)
        var kind = str(z.get("kind", "Walker"))
        _draw_creature_icon(kind, c)
        arrow(c, z.facing, Color(.94, .91, .73), 11)
        if z.state == "CHASE":
            draw_circle(c, 14, Color(1, .18, .12, .92), false, 2)
        else:
            var intent_text = str(intent_reads.get(i, "?"))
            if intent_text != "":
                draw_string(font, c + Vector2(-20, -15), intent_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(1, .85, .38))
        var hp_max = max(1, int(z.get("max_hp", z.hp)))
        var hp_ratio = clamp(float(z.hp) / float(hp_max), 0.0, 1.0)
        draw_rect(Rect2(c + Vector2(-11, 11), Vector2(22, 3)), Color(.12, .08, .08, .85))
        draw_rect(Rect2(c + Vector2(-11, 11), Vector2(22.0 * hp_ratio, 3)), Color(.72, .18, .16, .95))
        if debug_ai:
            draw_string(font, c + Vector2(-20, 27), "%s %s %d" % [kind, str(z.state), int(z.next) - tick], HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color.WHITE)

    var pc = cell_to_screen(player.pos) + Vector2(TILE / 2, TILE / 2)
    draw_circle(pc, 10, Color(.25, .55, .90))
    arrow(pc, player.facing, Color.WHITE, 13)
    if player.crouched:
        draw_circle(pc, 12, Color(.55, .75, 1), false, 1)
