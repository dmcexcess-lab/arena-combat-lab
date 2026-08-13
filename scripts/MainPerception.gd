extends "res://scripts/Main.gd"

# Perception/readability only: confirmed memory, intent reads, and fuzzy sounds.
var last_seen := {}

func reset_run():
    last_seen.clear()
    super.reset_run()

func refresh_intents():
    intent_reads.clear()
    var a = awareness()
    for i in range(zombies.size()):
        var z = zombies[i]
        if z.dead:
            last_seen.erase(i)
            continue
        if visible_cells.has(z.pos):
            last_seen[i] = {"pos":z.pos,"time":tick}
            if z.state == "CHASE":
                intent_reads[i] = ""
            elif a < 2.2:
                intent_reads[i] = "?"
            else:
                var chance = clamp(.22 + a*.075 - float(player.fear)*.0035, .12, .93)
                if rng.randf() <= chance: intent_reads[i] = "SEARCH" if z.state == "INVESTIGATE" else "IDLE"
                else: intent_reads[i] = ["IDLE","SEARCH","?"][rng.randi_range(0,2)]
        elif last_seen.has(i):
            var remembered: Vector2i = last_seen[i]["pos"]
            if visible_cells.has(remembered): last_seen.erase(i)

func draw_sounds():
    for s in sound_marks:
        if tick - int(s.time) > 650: continue
        if s.has("source") and visible_cells.has(s.source): continue
        var center = cell_to_screen(s.pos) + Vector2(TILE/2,TILE/2)
        draw_string(font, center + Vector2(-18,4), str(s.label), HORIZONTAL_ALIGNMENT_CENTER, 36, 10, Color(.98,.85,.36))
