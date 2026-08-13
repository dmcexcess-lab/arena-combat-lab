extends "res://scripts/MainAlphaDual.gd"

const WALKER_AI_INTEL := 1

var player_trail:Array = []
var last_trail_pos := Vector2i(-999,-999)
var zombie_hp_snapshot := {}

func reset_run():
    player_trail.clear()
    zombie_hp_snapshot.clear()
    last_trail_pos = Vector2i(-999,-999)
    super.reset_run()
    _snapshot_zombie_hp()

func spawn_zombies():
    super.spawn_zombies()
    for i in range(zombies.size()):
        zombies[i]["ai_intel"] = WALKER_AI_INTEL
        zombies[i]["spot_until"] = -1
        zombies[i]["last_seen_player"] = Vector2i(-1,-1)
        zombies[i]["last_seen_tick"] = -10000
        zombies[i]["follow_budget"] = 0
        zombies[i]["search_until"] = -1
    _snapshot_zombie_hp()

func _armor_track_weight()->int:
    var family = _armor_family()
    if family == "Guard": return 3
    if family == "Ravager": return 2
    if family == "Ranged": return 1
    return 0

func _spot_memory_ticks(ai:int)->int:
    return 120 + ai * 90 + _armor_track_weight() * 20

func _follow_budget(ai:int)->int:
    return 1 + int(floor(float(ai)/3.0)) + (1 if _armor_track_weight() >= 2 else 0)

func _share_radius(ai:int)->int:
    return 1 + int(floor(float(ai)/4.0))

func _track_radius(ai:int)->int:
    return 1 + int(floor(float(ai)/3.0)) + int(floor(float(_armor_track_weight())/2.0))

func _search_ticks(ai:int)->int:
    return 60 + ai * 40

func _is_spotted_by(z:Dictionary)->bool:
    return not bool(z.get("dead",false)) and tick < int(z.get("spot_until",-1))

func _snapshot_zombie_hp():
    zombie_hp_snapshot.clear()
    for i in range(zombies.size()):
        zombie_hp_snapshot[i] = int(zombies[i].hp)

func _record_player_trail():
    if player.is_empty(): return
    if player.pos == last_trail_pos: return
    last_trail_pos = player.pos
    player_trail.append({"pos":player.pos,"time":tick})
    while player_trail.size() > 14:
        player_trail.pop_front()

func _mark_shared_spot(i:int,target:Vector2i):
    if i < 0 or i >= zombies.size() or zombies[i].dead: return
    var ai = int(zombies[i].get("ai_intel",WALKER_AI_INTEL))
    zombies[i]["state"] = "FOLLOW"
    zombies[i]["target"] = target
    zombies[i]["heard"] = target
    zombies[i]["last_seen_player"] = target
    zombies[i]["last_seen_tick"] = tick
    zombies[i]["spot_until"] = tick + int(round(float(_spot_memory_ticks(ai))*.70))
    zombies[i]["follow_budget"] = max(1,_follow_budget(ai)-1)
    if not bool(zombies[i].alerted):
        zombies[i].alerted = true
        stats.alerted += 1

func _spread_spot_from(source_pos:Vector2i,target:Vector2i,ai:int,skip:int=-1):
    var radius = _share_radius(ai)
    for j in range(zombies.size()):
        if j == skip or zombies[j].dead: continue
        if manhattan(source_pos,zombies[j].pos) <= radius:
            _mark_shared_spot(j,target)

func _mark_direct_spot(i:int):
    if i < 0 or i >= zombies.size() or zombies[i].dead: return
    var ai = int(zombies[i].get("ai_intel",WALKER_AI_INTEL))
    var first = not _is_spotted_by(zombies[i])
    zombies[i]["state"] = "CHASE"
    zombies[i]["target"] = player.pos
    zombies[i]["heard"] = player.pos
    zombies[i]["last_seen_player"] = player.pos
    zombies[i]["last_seen_tick"] = tick
    zombies[i]["spot_until"] = tick + _spot_memory_ticks(ai)
    zombies[i]["follow_budget"] = _follow_budget(ai)
    if first: super.alert(i)
    _spread_spot_from(zombies[i].pos,player.pos,ai,i)

func _reveal_damage_hits():
    for i in range(zombies.size()):
        var before = int(zombie_hp_snapshot.get(i,WALKER_HP))
        if int(zombies[i].hp) < before:
            if zombies[i].dead:
                _spread_spot_from(zombies[i].pos,player.pos,WALKER_AI_INTEL,i)
            else:
                _mark_direct_spot(i)

func _next_trail_target(z:Dictionary)->Vector2i:
    if int(z.get("follow_budget",0)) <= 0: return z.pos
    var ai = int(z.get("ai_intel",WALKER_AI_INTEL))
    var radius = _track_radius(ai)
    var since = int(z.get("last_seen_tick",-10000))
    for entry in player_trail:
        if int(entry["time"]) <= since: continue
        var p:Vector2i = entry["pos"]
        if manhattan(z.pos,p) <= radius:
            return p
    return z.pos

func commit_action(cost:int):
    _record_player_trail()
    _reveal_damage_hits()
    super.commit_action(cost)
    _snapshot_zombie_hp()

func zombie_act(i:int):
    if zombies[i].dead: return
    var sees = zombie_sees(zombies[i])
    if sees:
        _mark_direct_spot(i)
        if manhattan(zombies[i].pos,player.pos) == 1:
            zombies[i].facing = player.pos-zombies[i].pos
            zombie_attack(i)
            return
        zombie_move(i,player.pos)
        if not zombies[i].dead: zombies[i].next = tick + WALKER_MOVE
        return

    var z = zombies[i]
    var moved = false
    if _is_spotted_by(z):
        z.state = "FOLLOW"
        if z.pos == z.target:
            var trail_target = _next_trail_target(z)
            if trail_target != z.pos:
                z.target = trail_target
                z.follow_budget = max(0,int(z.follow_budget)-1)
        zombies[i] = z
        if zombies[i].pos != zombies[i].target:
            moved = zombie_move(i,zombies[i].target)
    else:
        if z.state in ["CHASE","FOLLOW"]:
            z.state = "INVESTIGATE"
            z.target = z.get("last_seen_player",z.target)
            z.heard = z.target
            z.search_until = tick + _search_ticks(int(z.get("ai_intel",WALKER_AI_INTEL)))
            zombies[i] = z
        if zombies[i].state == "INVESTIGATE" and tick < int(zombies[i].get("search_until",-1)):
            if zombies[i].pos != zombies[i].target:
                moved = zombie_move(i,zombies[i].target)
            elif rng.randf() < .35:
                var d = DIRS[rng.randi_range(0,3)]
                var p = zombies[i].pos+d
                zombies[i].facing = d
                if not blocked(p) and zombie_at(p) == -1 and p != player.pos:
                    zombies[i].pos = p
                    moved = true
        else:
            zombies[i].state = "IDLE"
            zombies[i].heard = Vector2i(-1,-1)
            if rng.randf() < .25:
                var d = DIRS[rng.randi_range(0,3)]
                var p = zombies[i].pos+d
                zombies[i].facing = d
                if not blocked(p) and zombie_at(p) == -1 and p != player.pos:
                    zombies[i].pos = p
                    moved = true
            if rng.randf() < .05: emit_noise(zombies[i].pos,22,"moan",false)

    if not zombies[i].dead:
        zombies[i].next = tick + (WALKER_MOVE if moved else 165)

func any_zombie_spotted_player()->bool:
    for z in zombies:
        if z.dead: continue
        if _is_spotted_by(z) or zombie_sees(z): return true
    return false

func stealth_attack(z:Dictionary)->bool:
    if _is_spotted_by(z): return false
    return super.stealth_attack(z)

func refresh_intents():
    super.refresh_intents()
    for i in range(zombies.size()):
        if zombies[i].dead or not visible_cells.has(zombies[i].pos): continue
        if zombies[i].state == "FOLLOW": intent_reads[i] = "FOLLOW"
