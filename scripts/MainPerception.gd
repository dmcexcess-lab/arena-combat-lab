extends "res://scripts/Main.gd"

# Alpha 0.2 perception/readability layer.
# Keep the original combat prototype intact underneath while we iterate on what
# information the player should actually receive.

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
            var band := "FAINT"
            if heard >= 50:
                band = "LOUD"
            elif heard >= 30:
                band = "CLEAR"
            sound_marks.append({
                "dir": compass_dir(player.pos, source),
                "label": label,
                "band": band,
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

            # If it currently sees you, everyone understands that. Survivor
            # skill only affects the subtler prediction of what it is doing.
            if z.state == "CHASE":
                intent_reads[i] = "! SEES YOU"
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

func compass_dir(from: Vector2i, to: Vector2i) -> String:
    var d = to - from
    var sx = sign(d.x)
    var sy = sign(d.y)
    if sx == 0 and sy < 0: return "N"
    if sx > 0 and sy < 0: return "NE"
    if sx > 0 and sy == 0: return "E"
    if sx > 0 and sy > 0: return "SE"
    if sx == 0 and sy > 0: return "S"
    if sx < 0 and sy > 0: return "SW"
    if sx < 0 and sy == 0: return "W"
    if sx < 0 and sy < 0: return "NW"
    return "HERE"

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

        var intent_text = str(intent_reads.get(i, "?"))
        var intent_color = Color(1, .32, .24) if z.state == "CHASE" else Color(1, .85, .38)
        if z.state == "CHASE":
            draw_circle(c, 13, Color(1, .18, .12, .9), false, 2)
        draw_string(font, c + Vector2(-20, -14), intent_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, intent_color)

        if debug_ai:
            draw_string(font, c + Vector2(-12, 27), "%s %d" % [z.state, int(z.next) - tick], HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color.WHITE)

    var pc = cell_to_screen(player.pos) + Vector2(TILE / 2, TILE / 2)
    draw_circle(pc, 10, Color(.25, .55, .90))
    arrow(pc, player.facing, Color.WHITE, 13)
    if player.crouched:
        draw_circle(pc, 12, Color(.55, .75, 1), false, 1)

func draw_sounds():
    # A zombie actively seeing the player is never hidden behind an awareness
    # roll. If the threat is outside the player's cone, this global warning is
    # still shown; when visible, its red ring identifies which zombie it is.
    var spotted := false
    for z in zombies:
        if not z.dead and z.state == "CHASE":
            spotted = true
            break
    if spotted:
        draw_string(font, Vector2(300, 30), "!! SPOTTED !!", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(1, .25, .18))

    # Sounds are now relative information, not fake pins that look like hidden
    # creatures. Show the two freshest cues next to the player.
    var recent: Array = []
    for s in sound_marks:
        if tick - int(s.time) <= 650:
            recent.append(s)

    var pc = cell_to_screen(player.pos) + Vector2(TILE / 2, TILE / 2)
    var shown := 0
    for n in range(recent.size() - 1, -1, -1):
        var s = recent[n]
        var yy = float(22 + shown * 12)
        draw_string(font, pc + Vector2(18, yy), "HEARD %s %s - %s" % [s.dir, s.band, s.label], HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(.98, .85, .36))
        shown += 1
        if shown >= 2:
            break
