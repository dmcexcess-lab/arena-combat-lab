extends "res://scripts/MainAlphaAI.gd"

# Mixed creature roster and scalable AI. No player levels: creatures differ through
# physical capability, senses, behavior, and AI intelligence.

const CREATURES := {
    "Walker": {
        "hp":12, "hit":.45, "dmin":3, "dmax":5, "move":130, "attack":105,
        "sight":7, "hearing":12, "ai":1, "fear":8, "spot_fear":6,
        "wander":.25, "vocal_chance":.05, "vocal_power":22, "vocal":"moan",
        "share_bonus":0, "track_bonus":0, "crouch_penalty":2,
        "door_ticks":145, "door_noise":30,
        "desc":"easy, slow, short memory"
    },
    "Ripper": {
        "hp":9, "hit":.52, "dmin":2, "dmax":4, "move":72, "attack":82,
        "sight":9, "hearing":8, "ai":3, "fear":7, "spot_fear":8,
        "wander":.48, "vocal_chance":.08, "vocal_power":18, "vocal":"hiss",
        "share_bonus":1, "track_bonus":1, "crouch_penalty":1,
        "door_ticks":95, "door_noise":20,
        "desc":"fast hunter, sharp senses, pack alert"
    },
    "Brute": {
        "hp":28, "hit":.58, "dmin":5, "dmax":8, "move":175, "attack":145,
        "sight":6, "hearing":15, "ai":1, "fear":14, "spot_fear":10,
        "wander":.12, "vocal_chance":.08, "vocal_power":30, "vocal":"growl",
        "share_bonus":0, "track_bonus":0, "crouch_penalty":2,
        "door_ticks":110, "door_noise":60, "door_smash":true,
        "desc":"slow tank, heavy hit, smashes gates"
    }
}
const CREATURE_ORDER := ["Walker", "Ripper", "Brute"]

var ripper_spawn_count := 3
var brute_spawn_count := 1

func _creature_def(kind: String) -> Dictionary:
    var key = kind if CREATURES.has(kind) else "Walker"
    return CREATURES[key]

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

    var roster: Array = []
    for n in range(zombie_spawn_count):
        roster.append("Walker")
    for n in range(ripper_spawn_count):
        roster.append("Ripper")
    for n in range(brute_spawn_count):
        roster.append("Brute")
    roster.shuffle()

    var actual = min(roster.size(), candidates.size())
    for i in range(actual):
        var kind = str(roster[i])
        var data = _creature_def(kind)
        zombies.append({
            "id":i, "kind":kind, "pos":candidates[i],
            "facing":DIRS[rng.randi_range(0, 3)],
            "hp":int(data.hp), "max_hp":int(data.hp),
            "hit":float(data.hit), "dmin":int(data.dmin), "dmax":int(data.dmax),
            "move_ticks":int(data.move), "attack_ticks":int(data.attack),
            "sight":int(data.sight), "hearing":int(data.hearing), "ai_intel":int(data.ai),
            "fear":int(data.fear), "spot_fear":int(data.spot_fear),
            "wander":float(data.wander), "vocal_chance":float(data.vocal_chance),
            "vocal_power":int(data.vocal_power), "vocal":str(data.vocal),
            "share_bonus":int(data.get("share_bonus", 0)),
            "track_bonus":int(data.get("track_bonus", 0)),
            "crouch_penalty":int(data.get("crouch_penalty", 2)),
            "door_ticks":int(data.get("door_ticks", 145)),
            "door_noise":int(data.get("door_noise", 30)),
            "door_smash":bool(data.get("door_smash", false)),
            "state":"IDLE", "target":Vector2i(-1, -1), "heard":Vector2i(-1, -1),
            "next":rng.randi_range(40, 170), "alerted":false, "dead":false,
            "spot_until":-1, "last_seen_player":Vector2i(-1, -1),
            "last_seen_tick":-10000, "follow_budget":0, "search_until":-1
        })

func _spread_spot_from(source_pos: Vector2i, target: Vector2i, ai: int, skip: int = -1):
    var bonus = 0
    if skip >= 0 and skip < zombies.size():
        bonus = int(zombies[skip].get("share_bonus", 0))
    var radius = 1 + int(floor(float(ai) / 4.0)) + bonus
    for j in range(zombies.size()):
        if j == skip or zombies[j].dead:
            continue
        if manhattan(source_pos, zombies[j].pos) <= radius:
            _mark_shared_spot(j, target)

func alert(i: int):
    if i < 0 or i >= zombies.size() or zombies[i].dead or bool(zombies[i].alerted):
        return
    zombies[i].alerted = true
    stats.alerted += 1
    var fear_amount = int(zombies[i].get("spot_fear", 6))
    add_fear(max(1, int(round(float(fear_amount) * float(gear_runtime.get("spot_fear_mult", 1.0))))))

func _reveal_damage_hits():
    for i in range(zombies.size()):
        var before = int(zombie_hp_snapshot.get(i, int(zombies[i].get("max_hp", WALKER_HP))))
        if int(zombies[i].hp) < before:
            var ai = int(zombies[i].get("ai_intel", WALKER_AI_INTEL))
            if zombies[i].dead:
                _spread_spot_from(zombies[i].pos, player.pos, ai, i)
            else:
                _mark_direct_spot(i)

func _next_trail_target(z: Dictionary) -> Vector2i:
    if int(z.get("follow_budget", 0)) <= 0:
        return z.pos
    var ai = int(z.get("ai_intel", WALKER_AI_INTEL))
    var radius = _track_radius(ai) + int(z.get("track_bonus", 0))
    var since = int(z.get("last_seen_tick", -10000))
    for entry in player_trail:
        if int(entry.time) <= since:
            continue
        var p: Vector2i = entry.pos
        if manhattan(z.pos, p) <= radius:
            return p
    return z.pos

func zombie_sees(z: Dictionary) -> bool:
    var sight = int(z.get("sight", WALKER_SIGHT))
    if player.crouched:
        sight -= int(z.get("crouch_penalty", 2))
    return in_cone(z.pos, z.facing, player.pos, max(2, sight), .40) and has_los(z.pos, player.pos)

func emit_noise(source: Vector2i, intensity: int, label: String, player_made: bool):
    stats.noise = max(int(stats.noise), intensity)
    var costs = sound_map(source, intensity)
    for i in range(zombies.size()):
        if zombies[i].dead:
            continue
        var received = intensity - int(costs.get(zombies[i].pos, 99999))
        var threshold = int(zombies[i].get("hearing", WALKER_HEARING))
        if received >= threshold:
            if zombies[i].state != "CHASE":
                zombies[i].state = "INVESTIGATE"
                zombies[i].heard = source
                zombies[i].target = source
                var ai = int(zombies[i].get("ai_intel", WALKER_AI_INTEL))
                zombies[i].search_until = max(int(zombies[i].get("search_until", -1)), tick + _search_ticks(ai))
            if player_made and received >= threshold + 16:
                alert(i)
    if not player_made:
        var heard = intensity - int(costs.get(player.pos, 99999))
        if heard + awareness() * 2.0 >= 14:
            var fuzz = 2 if heard < 30 else (1 if heard < 50 else 0)
            fuzz = max(0, fuzz - int(gear_runtime.get("sound_fuzz_reduction", 0)))
            var approx = source + Vector2i(rng.randi_range(-fuzz, fuzz), rng.randi_range(-fuzz, fuzz))
            sound_marks.append({"pos":clamp_cell(approx), "source":source, "label":label.to_lower(), "time":tick})
            while sound_marks.size() > 5:
                sound_marks.pop_front()

func zombie_move(i: int, target: Vector2i) -> bool:
    var z = zombies[i]
    var step = next_step(z.pos, target)
    if step == z.pos:
        zombies[i].next = tick + max(70, int(round(float(z.get("move_ticks", WALKER_MOVE)) * .85)))
        return false
    z.facing = dominant(step - z.pos)
    if doors.has(step) and not doors[step]:
        doors[step] = true
        var smash = bool(z.get("door_smash", false))
        emit_noise(step, int(z.get("door_noise", 30)), "gate smash" if smash else "door", false)
        zombies[i] = z
        zombies[i].next = tick + int(z.get("door_ticks", 145))
        return true
    if glass.has(step):
        glass.erase(step)
        emit_noise(step, 44, "breaking glass", false)
        zombies[i] = z
        zombies[i].next = tick + 135
        return true
    if zombie_at(step) != -1:
        zombies[i] = z
        zombies[i].next = tick + max(45, int(round(float(z.get("move_ticks", WALKER_MOVE)) * .55)))
        return true
    if step != player.pos:
        z.pos = step
    zombies[i] = z
    return true

func zombie_act(i: int):
    if zombies[i].dead:
        return
    if zombie_sees(zombies[i]):
        _mark_direct_spot(i)
        if manhattan(zombies[i].pos, player.pos) == 1:
            zombies[i].facing = player.pos - zombies[i].pos
            zombie_attack(i)
            return
        zombie_move(i, player.pos)
        _finish_monster_action(i, true)
        return

    var z = zombies[i]
    var moved = false
    if _is_spotted_by(z):
        z.state = "FOLLOW"
        if z.pos == z.target:
            var trail_target = _next_trail_target(z)
            if trail_target != z.pos:
                z.target = trail_target
                z.follow_budget = max(0, int(z.follow_budget) - 1)
        zombies[i] = z
        if zombies[i].pos != zombies[i].target:
            moved = zombie_move(i, zombies[i].target)
    else:
        if z.state in ["CHASE", "FOLLOW"]:
            z.state = "INVESTIGATE"
            z.target = z.get("last_seen_player", z.target)
            z.heard = z.target
            z.search_until = tick + _search_ticks(int(z.get("ai_intel", WALKER_AI_INTEL)))
            zombies[i] = z
        if zombies[i].state == "INVESTIGATE" and tick < int(zombies[i].get("search_until", -1)):
            if zombies[i].pos != zombies[i].target:
                moved = zombie_move(i, zombies[i].target)
            elif rng.randf() < .35:
                moved = _wander_monster(i)
        else:
            zombies[i].state = "IDLE"
            zombies[i].heard = Vector2i(-1, -1)
            if rng.randf() < float(zombies[i].get("wander", .25)):
                moved = _wander_monster(i)
            if rng.randf() < float(zombies[i].get("vocal_chance", .05)):
                emit_noise(zombies[i].pos, int(zombies[i].get("vocal_power", 22)), str(zombies[i].get("vocal", "moan")), false)
    _finish_monster_action(i, moved)

func _wander_monster(i: int) -> bool:
    var d = DIRS[rng.randi_range(0, 3)]
    var p = zombies[i].pos + d
    zombies[i].facing = d
    if not blocked(p) and zombie_at(p) == -1 and p != player.pos:
        zombies[i].pos = p
        return true
    return false

func _finish_monster_action(i: int, moved: bool):
    if i < 0 or i >= zombies.size() or zombies[i].dead:
        return
    if int(zombies[i].next) > tick:
        return
    var mt = int(zombies[i].get("move_ticks", WALKER_MOVE))
    zombies[i].next = tick + (mt if moved else mt + 35)

func zombie_attack(i: int):
    var z = zombies[i]
    var pressure = crowd_pressure()
    var chance = clamp(float(z.get("hit", WALKER_HIT)) + min(.28, pressure * .05), .15, .92)
    var kind = str(z.get("kind", "Walker"))
    if rng.randf() <= chance:
        var raw = rng.randi_range(int(z.get("dmin", WALKER_DMIN)), int(z.get("dmax", WALKER_DMAX)))
        hurt(raw, "%s attack" % kind.to_lower())
        msg = "%s hits for %d after armor. Pressure %.1f." % [kind, last_damage_taken, pressure]
    else:
        msg = "%s attack misses." % kind
    var fear_amount = int(z.get("fear", 8)) + int(round(pressure * 2.0))
    add_fear(int(round(float(fear_amount) * float(gear_runtime.get("crowd_fear_mult", 1.0)))))
    emit_noise(z.pos, 28 if kind == "Brute" else 18, "struggle", false)
    if not zombies[i].dead:
        zombies[i].next = tick + int(z.get("attack_ticks", WALKER_ATTACK))

# Ravager fresh/wounded effects must use each creature's own health pool.
func _single_melee_attack(zi: int, feat: String):
    if zi < 0 or zi >= zombies.size() or zombies[zi].dead:
        return
    if feat != "" and float(player.get("fatigue", 0.0)) >= 100:
        msg = "Too fatigued for special attacks."
        queue_redraw()
        return
    _clear_defense_on_offense()
    var z = zombies[zi]
    var target_max_hp = max(1, int(z.get("max_hp", WALKER_HP)))
    var stealth = stealth_attack(z)
    var dmg_mult = _might_mult()
    var acc_extra = .15 if stealth else 0.0
    var time = int(player.weapon.time)
    var fatigue = float(player.weapon.fatigue)
    var push = int(player.weapon.push) + int(gear_runtime.get("force_bonus", 0))
    push += int(floor(float(max(0, int(player["attrs"]["Might"]) - BASE_STAT)) / 3.0))
    var delay = 0
    var disengage = false
    var secondary = 0.0
    if stealth:
        dmg_mult *= 1.10
    match feat:
        "Backstab":
            if not stealth:
                msg = "Backstab requires an unaware/rear target."
                queue_redraw()
                return
            dmg_mult *= 1.60; time += 10; fatigue += 1
        "Quick Cut": dmg_mult *= .75; time = int(round(float(time) * .70))
        "Hamstring": dmg_mult *= .75; delay = 50
        "Feint": dmg_mult *= .50
        "Deep Cut": dmg_mult *= 1.10; delay = 30; time += 10; fatigue += 1
        "Disengaging Cut": dmg_mult *= .70; disengage = true
        "Cleave": secondary = .60; time = 105; fatigue = 5
        "Driving Blow": dmg_mult *= .80; push = max(push, 2); fatigue += 2
        "Guarded Strike": dmg_mult *= .80; defense_mult = .75; defense_hits = 1
        "Execution":
            if int(z.hp) > int(ceil(float(target_max_hp) * .50)):
                msg = "Execution requires a wounded target."; queue_redraw(); return
            dmg_mult *= 1.50; time = 130; fatigue = 9
        "Focused Strike":
            if not _isolated(zi):
                msg = "Focused Strike requires an isolated target."; queue_redraw(); return
            acc_extra += .20; dmg_mult *= 1.25; time = 125; fatigue = 8
        "Crushing Blow": dmg_mult *= 1.30; push = max(push, 2); time = 170; fatigue = 13
        "Opening Blow":
            if int(z.hp) < target_max_hp:
                msg = "Opening Blow requires a fresh target."; queue_redraw(); return
            dmg_mult *= 1.35; time += 15; fatigue += 2
        "Relentless Strike":
            if int(z.id) != last_weapon_target_id:
                msg = "Relentless Strike requires your previous target."; queue_redraw(); return
            dmg_mult *= 1.25; time += 10; fatigue += 2
        "Overhead Smash": dmg_mult *= 1.50; acc_extra -= .15; time += 30; fatigue += 4
    if stealth:
        dmg_mult *= float(gear_runtime.get("rear_damage", 1.0))
    if int(z.hp) <= int(ceil(float(target_max_hp) * .50)):
        dmg_mult *= float(gear_runtime.get("low_hp_damage", 1.0))
    if _isolated(zi):
        dmg_mult *= float(gear_runtime.get("isolated_damage", 1.0))
    if kill_haste:
        time = int(round(float(time) * .90)); kill_haste = false
    var heavy = bool(player.weapon.get("heavy", false))
    var ticks = float(gear_runtime.get("weapon_tick_mult", 1.0))
    if heavy:
        ticks *= float(gear_runtime.get("heavy_tick_mult", 1.0))
    ticks *= max(.80, 1.0 - max(0, int(player["attrs"]["Finesse"]) - BASE_STAT) * .02)
    ticks *= _state_tick_mult()
    time = max(35, int(round(float(time) * ticks)))
    if rng.randf() <= _melee_accuracy(acc_extra):
        var d = max(1, int(round(float(rng.randi_range(int(player.weapon.dmin), int(player.weapon.dmax))) * dmg_mult)))
        zombies[zi].hp -= d
        msg = "%s hits for %d%s." % [str(player.weapon.name), d, " - %s" % feat if feat != "" else ""]
        if delay > 0: zombies[zi].next += delay
        if feat == "Feint": zombies[zi].facing = DIRS[posmod(DIRS.find(zombies[zi].facing) + 1, 4)]
        if int(zombies[zi].hp) <= 0: kill_zombie(zi, stealth)
        elif push > 0: _push_steps(zi, player.facing, push)
        if secondary > 0: _cleave_secondary(zi, secondary)
    else:
        msg = "%s misses%s." % [str(player.weapon.name), " - %s" % feat if feat != "" else ""]
    last_weapon_target_id = int(z.id)
    emit_noise(player.pos, int(player.weapon.noise), "melee", true)
    _add_fatigue(fatigue, true, heavy, feat != "")
    _mark_strenuous(time)
    commit_action(time)
    if disengage and not game_over:
        var back = player.pos - player.facing
        if not blocked(back) and zombie_at(back) == -1:
            player.pos = back; recalc_visibility(); refresh_intents(); queue_redraw()
