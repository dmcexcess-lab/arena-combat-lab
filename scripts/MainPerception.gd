extends "res://scripts/Main.gd"

# Alpha 0.5 perception/readability layer.
# Visible threat state is physical/readable; survivor awareness changes how
# precisely hidden sounds and subtler zombie behavior can be interpreted.

var last_seen := {}

func reset_run():
    last_seen.clear()
    super.reset_run()

func zombie_act(i: int):
    if zombies[i].dead:
        return
    var z = zombies[i]
    var sees_player := zombie_sees(z)

    if sees_player:
        if z.state != "CHASE":
            alert(i)
        z.state = "CHASE"
        z.target = player.pos
        z.heard = player.pos
    elif z.state == "CHASE":
        # Once sight is broken, the zombie only knows the last place it really
        # saw the player. It no longer tracks the player through fog/walls.
        z.state = "INVESTIGATE"
        z.target = z.heard

    if sees_player and manhattan(z.pos, player.pos) == 1:
        z.facing = player.pos - z.pos
        zombies[i] = z
        zombie_attack(i)
        return

    var moved := false
    if z.state == "CHASE":
        zombies[i] = z
        moved = zombie_move(i, z.target)
    elif z.heard != Vector2i(-1, -1):
        z.state = "INVESTIGATE"
        z.target = z.heard
        zombies[i] = z
        if z.pos == z.target:
            zombies[i].heard = Vector2i(-1, -1)
            zombies[i].state = "IDLE"
        else:
            moved = zombie_move(i, z.target)
    else:
        if rng.randf() < .35:
            var d = DIRS[rng.randi_range(0, 3)]
            var p = z.pos + d
            z.facing = d
            if not blocked(p) and zombie_at(p) == -1 and p != player.pos:
                z.pos = p
                moved = true
        zombies[i] = z
        if rng.randf() < .06:
            emit_noise(z.pos, 22, "moan", false)

    if not zombies[i].dead:
        zombies[i].next = tick + (130 if moved else 165)

func emit_noise(source: Vector2i, intensity: int, label: String, player_made: bool):
    stats.noise = max(int(stats.noise), intensity)
    var costs = sound_map(source, intensity)

    for i in range(zombies.size()):
        if zombies[i].dead:
            continue
        var received = intensity - int(costs.get(zombies[i].pos, 99999))
        if received >= 12:
            if zombies[i].state != "CHASE":
                zombies[i].state = "INVESTIGATE"
                zombies[i].heard = source
                zombies[i].target = source
            if player_made and received >= 30:
                alert(i)

    if not player_made:
        var heard = intensity - int(costs.get(player.pos, 99999))
        if heard + awareness() * 2.0 >= 14:
            # Better awareness means the yellow word lands closer to the real
            # source. Loud noises are also naturally easier to locate.
            var a := awareness()
            var fuzz := 4
            if a >= 1.5: fuzz = 3
            if a >= 3.0: fuzz = 2
            if a >= 4.5: fuzz = 1
            if a >= 6.0: fuzz = 0
            if heard >= 50: fuzz = max(0, fuzz - 1)
            var approx = source + Vector2i(rng.randi_range(-fuzz, fuzz), rng.randi_range(-fuzz, fuzz))
            sound_marks.append({
                "pos": clamp_cell(approx),
                "source": source,
                "label": label.to_lower(),
                "time": tick
            })
            while sound_marks.size() > 5:
                sound_marks.pop_front()

func refresh_intents():
    intent_reads.clear()
    var a = awareness()

    for i in range(zombies.size()):
        var z = zombies[i]
        if z.dead:
            last_seen.erase(i)
            continue

        if visible_cells.has(z.pos):
            last_seen[i] = {"pos": z.pos, "time": tick}

            # Chase is communicated only by the red ring. No floating text is
            # needed once the physical danger is obvious.
            if z.state == "CHASE":
                intent_reads[i] = ""
                continue

            if a < 2.2:
                intent_reads[i] = "?"
                continue

            var chance = clamp(.22 + a * .075 - float(player.fear) * .0035, .12, .93)
            if rng.randf() <= chance:
                intent_reads[i] = "SEARCH" if z.state == "INVESTIGATE" else "IDLE"
            else:
                intent_reads[i] = ["IDLE", "SEARCH", "?"][rng.randi_range(0, 2)]
        elif last_seen.has(i):
            var remembered: Vector2i = last_seen[i]["pos"]
            # If the old position is currently visible and empty, stop showing
            # the stale marker. We know it moved, but not where it went.
            if visible_cells.has(remembered):
                last_seen.erase(i)

func draw_units():
    # Dead bodies are only shown when the tile is actually visible.
    for z in zombies:
        if z.dead and visible_cells.has(z.pos):
            var c = cell_to_screen(z.pos) + Vector2(TILE / 2, TILE / 2)
            draw_line(c + Vector2(-8, -5), c + Vector2(8, 5), Color(.35, .08, .08), 3)
            draw_line(c + Vector2(-8, 5), c + Vector2(8, -5), Color(.35, .08, .08), 3)

    # Remembered zombies are ghosts at their last confirmed position. This is
    # memory, not live tracking.
    for key in last_seen.keys():
        var i := int(key)
        if i < 0 or i >= zombies.size():
            continue
        var z = zombies[i]
        if z.dead or visible_cells.has(z.pos):
            continue
        var lp: Vector2i = last_seen[i]["pos"]
        var lc = cell_to_screen(lp) + Vector2(TILE / 2, TILE / 2)
        draw_circle(lc, 9, Color(.55, .58, .55, .55), false, 2)
        draw_string(font, lc + Vector2(-11, -13), "LAST", HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(.65, .68, .65, .8))

    for i in range(zombies.size()):
        var z = zombies[i]
        if z.dead or not visible_cells.has(z.pos):
            continue
        var c = cell_to_screen(z.pos) + Vector2(TILE / 2, TILE / 2)
        draw_circle(c, 10, Color(.35, .52, .31))
        arrow(c, z.facing, Color(.76, .90, .70), 11)

        if z.state == "CHASE":
            draw_circle(c, 13, Color(1, .18, .12, .9), false, 2)
        else:
            var intent_text = str(intent_reads.get(i, "?"))
            if intent_text != "":
                draw_string(font, c + Vector2(-20, -14), intent_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(1, .85, .38))

        if debug_ai:
            draw_string(font, c + Vector2(-12, 27), "%s %d" % [z.state, int(z.next) - tick], HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color.WHITE)

    var pc = cell_to_screen(player.pos) + Vector2(TILE / 2, TILE / 2)
    draw_circle(pc, 10, Color(.25, .55, .90))
    arrow(pc, player.facing, Color.WHITE, 13)
    if player.crouched:
        draw_circle(pc, 12, Color(.55, .75, 1), false, 1)

func draw_sounds():
    # Sounds are fuzzy yellow words on the map, not radar rings. The stored
    # position is an awareness-dependent estimate made when the sound occurs.
    for s in sound_marks:
        if tick - int(s.time) > 650:
            continue
        if s.has("source") and visible_cells.has(s.source):
            continue
        var c = cell_to_screen(s.pos) + Vector2(TILE / 2, TILE / 2)
        draw_string(font, c + Vector2(-18, 4), str(s.label), HORIZONTAL_ALIGNMENT_CENTER, 36, 10, Color(.98, .85, .36))
