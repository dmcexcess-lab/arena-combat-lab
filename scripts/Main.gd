extends Node2D

const TILE := 30
const W := 26
const H := 18
const ORIGIN := Vector2(16, 16)
const HUD_X := 820.0
const DIRS := [Vector2i(0,-1), Vector2i(1,0), Vector2i(0,1), Vector2i(-1,0)]
const DIR_NAMES := ["N","E","S","W"]

var rng := RandomNumberGenerator.new()
var font: Font
var walls := {}
var shelves := {}
var glass := {}
var doors := {}
var barrels := {}
var alarm := Vector2i(17,3)
var alarm_spent := false
var exit_cell := Vector2i(2,16)
var objective_spots := [Vector2i(21,4), Vector2i(21,10), Vector2i(16,10), Vector2i(13,12)]
var objective := Vector2i.ZERO
var objective_taken := false
var player := {}
var zombies: Array = []
var visible := {}
var memory := {}
var sound_marks: Array = []
var intent_reads := {}
var tick := 0
var game_over := false
var won := false
var debug_ai := false
var msg := ""
var submsg := ""
var stats := {}

var names := ["Maya Torres","Eli Carter","Nina Reyes","Owen Price","Jules Mercer","Rosa Hale","Grant Bell","Tess Morgan"]
var weapons := [
    {"name":"Knife","dmin":4,"dmax":7,"time":80,"noise":3,"push":0,"stealth":5},
    {"name":"Crowbar","dmin":5,"dmax":8,"time":110,"noise":8,"push":1,"stealth":2},
    {"name":"Baseball Bat","dmin":6,"dmax":9,"time":125,"noise":10,"push":2,"stealth":1},
    {"name":"Hatchet","dmin":7,"dmax":11,"time":145,"noise":11,"push":1,"stealth":2}
]
var clothes := [
    {"name":"T-shirt","prot":0,"noise":0},
    {"name":"Hoodie","prot":1,"noise":0},
    {"name":"Work Jacket","prot":2,"noise":1},
    {"name":"Leather Jacket","prot":3,"noise":1}
]

func _ready():
    rng.randomize()
    font = ThemeDB.fallback_font
    reset_run()

func reset_run():
    tick = 0
    game_over = false
    won = false
    alarm_spent = false
    objective_taken = false
    memory.clear()
    sound_marks.clear()
    stats = {"kills":0,"alerted":0,"stealth":0,"shots":0,"noise":0,"damage":0}
    build_map()
    objective = objective_spots[rng.randi_range(0, objective_spots.size()-1)]
    make_player()
    spawn_zombies()
    msg = "Retrieve the supply cache and escape."
    submsg = "No enemies spawn from noise; every zombie already exists on the map."
    recalc_visibility()
    refresh_intents()
    queue_redraw()

func build_map():
    walls.clear(); shelves.clear(); glass.clear(); doors.clear(); barrels.clear()
    for x in range(W):
        walls[Vector2i(x,0)] = true
        walls[Vector2i(x,H-1)] = true
    for y in range(H):
        walls[Vector2i(0,y)] = true
        walls[Vector2i(W-1,y)] = true
    for x in range(7,24):
        walls[Vector2i(x,2)] = true
        walls[Vector2i(x,14)] = true
    for y in range(2,15):
        walls[Vector2i(7,y)] = true
        walls[Vector2i(23,y)] = true
    walls.erase(Vector2i(15,14)); doors[Vector2i(15,14)] = false
    walls.erase(Vector2i(23,6)); doors[Vector2i(23,6)] = false
    for x in range(10,14):
        walls.erase(Vector2i(x,14)); glass[Vector2i(x,14)] = true
    for y in range(3,10): walls[Vector2i(19,y)] = true
    walls.erase(Vector2i(19,6)); doors[Vector2i(19,6)] = false
    for y in [5,8,11]:
        for x in range(9,13): shelves[Vector2i(x,y)] = true
    for y in [5,8]:
        for x in range(14,18): shelves[Vector2i(x,y)] = true
    for x in range(9,13): shelves[Vector2i(x,12)] = true
    for p in [Vector2i(3,4),Vector2i(4,4),Vector2i(3,5),Vector2i(4,5),Vector2i(3,9),Vector2i(4,9),Vector2i(3,10),Vector2i(4,10)]: shelves[p] = true
    barrels[Vector2i(6,12)] = true
    barrels[Vector2i(21,12)] = true

func make_player():
    var skills := {"Combat":rng.randi_range(0,3),"Scavenging":rng.randi_range(0,3),"Survival":rng.randi_range(0,3),"Medical":rng.randi_range(0,3),"Technical":rng.randi_range(0,3),"Social":rng.randi_range(0,3)}
    var keys = skills.keys()
    var specialty = keys[rng.randi_range(0,keys.size()-1)]
    skills[specialty] = min(5, int(skills[specialty]) + rng.randi_range(1,2))
    var total := 0
    for k in keys: total += int(skills[k])
    while total < 10:
        var k = keys[rng.randi_range(0,keys.size()-1)]
        if int(skills[k]) < 5:
            skills[k] += 1
            total += 1
    var status: Array = []
    if rng.randf() < .36: status.append("Tired")
    if rng.randf() < .24: status.append("Nervous")
    if rng.randf() < .18: status.append("Leg Injury")
    if rng.randf() < .12: status.append("Arm Injury")
    if status.is_empty(): status.append("Healthy")
    var gun := ""
    var ammo := 0
    if rng.randf() < .58:
        gun = ["Revolver","9mm Pistol"][rng.randi_range(0,1)]
        ammo = rng.randi_range(2,7)
    player = {
        "name":names[rng.randi_range(0,names.size()-1)], "skills":skills, "specialty":specialty,
        "status":status, "weapon":weapons[rng.randi_range(0,weapons.size()-1)].duplicate(true),
        "clothes":clothes[rng.randi_range(0,clothes.size()-1)].duplicate(true),
        "gun":gun, "ammo":ammo, "hp":18, "max_hp":18, "fear":rng.randi_range(0,12),
        "pos":Vector2i(2,15), "facing":Vector2i(1,0), "last_dir":Vector2i.ZERO,
        "move_state":"STILL", "crouched":false
    }
    if status.has("Leg Injury"): player.hp = 15
    if status.has("Arm Injury"): player.hp = min(int(player.hp),16)

func spawn_zombies():
    zombies.clear()
    var pts := [Vector2i(6,4),Vector2i(5,8),Vector2i(6,15),Vector2i(11,16),Vector2i(9,4),Vector2i(12,4),Vector2i(16,4),Vector2i(21,4),Vector2i(10,7),Vector2i(15,7),Vector2i(21,7),Vector2i(9,10),Vector2i(16,10),Vector2i(21,10),Vector2i(14,13),Vector2i(22,13)]
    for i in range(pts.size()):
        zombies.append({"id":i,"pos":pts[i],"facing":DIRS[rng.randi_range(0,3)],"hp":rng.randi_range(8,13),"state":"IDLE","target":Vector2i(-1,-1),"heard":Vector2i(-1,-1),"next":rng.randi_range(60,180),"alerted":false,"dead":false})

func _unhandled_input(e):
    if e is InputEventKey and e.pressed and not e.echo:
        if e.keycode == KEY_R: reset_run(); return
        if e.keycode == KEY_F1: debug_ai = not debug_ai; queue_redraw(); return
        if game_over: return
        match e.keycode:
            KEY_W, KEY_UP: try_move(Vector2i(0,-1), e.shift_pressed)
            KEY_D, KEY_RIGHT: try_move(Vector2i(1,0), e.shift_pressed)
            KEY_S, KEY_DOWN: try_move(Vector2i(0,1), e.shift_pressed)
            KEY_A, KEY_LEFT: try_move(Vector2i(-1,0), e.shift_pressed)
            KEY_Q: rotate_player(-1)
            KEY_E: rotate_player(1)
            KEY_C:
                player.crouched = not player.crouched
                player.move_state = "CROUCH" if player.crouched else "STILL"
                msg = "Crouched: quieter, slower." if player.crouched else "Standing."
                queue_redraw()
            KEY_SPACE: melee(player.pos + player.facing)
            KEY_G: shoot_nearest()
            KEY_F: interact()
    elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT and not game_over:
        click_target(screen_to_cell(e.position))

func try_move(dir: Vector2i, sprint: bool):
    var dest: Vector2i = player.pos + dir
    player.facing = dir
    if blocked(dest) or zombie_at(dest) != -1:
        msg = "Blocked."
        player.move_state = "STILL"
        queue_redraw(); return
    var cost := 100
    var noise := 7
    if player.crouched:
        sprint = false; cost = 150; noise = 2; player.move_state = "CROUCH"
    elif sprint:
        if player.move_state == "SPRINT" and player.last_dir == dir: cost = 55
        elif player.move_state == "SPRINT" and player.last_dir == -dir: cost = 130
        elif player.move_state == "SPRINT": cost = 90
        else: cost = 80
        noise = 24; player.move_state = "SPRINT"
    else:
        if player.move_state == "SPRINT" and player.last_dir == -dir: cost = 135
        elif player.move_state == "SPRINT": cost = 115
        player.move_state = "WALK"
    if player.status.has("Leg Injury"): cost += 25
    if player.status.has("Tired"): cost += 10
    player.pos = dest
    player.last_dir = dir
    emit_noise(dest, noise + int(player.clothes.noise), "movement", true)
    if dest == objective and not objective_taken:
        objective_taken = true
        msg = "SUPPLY CACHE RECOVERED. Get back to the EXIT."
        submsg = "Killing the remaining zombies does not matter."
        emit_noise(dest, 10, "rummaging", true)
    if dest == exit_cell:
        if objective_taken: win_run(); return
        msg = "You can leave, but you still need the supply cache."
    commit_action(cost)

func rotate_player(step: int):
    var idx = DIRS.find(player.facing)
    idx = posmod(idx + step, 4)
    player.facing = DIRS[idx]
    player.last_dir = Vector2i.ZERO
    player.move_state = "STILL"
    msg = "Turned %s." % DIR_NAMES[idx]
    commit_action(20)

func interact():
    var p: Vector2i = player.pos + player.facing
    if doors.has(p):
        doors[p] = not doors[p]
        msg = "Door opened." if doors[p] else "Door closed."
        emit_noise(p,7,"door",true); commit_action(65); return
    if glass.has(p):
        glass.erase(p); msg = "You smash the glass. Loud."
        emit_noise(p,48,"breaking glass",true); commit_action(100); return
    if p == alarm and not alarm_spent:
        alarm_spent = true; msg = "You trigger the store alarm."
        submsg = "Zombies that hear it investigate this exact tile."
        emit_noise(alarm,76 + int(player.skills.Technical)*2,"ALARM",false); commit_action(85); return
    msg = "Nothing useful there."; queue_redraw()

func melee(target: Vector2i):
    var zi = zombie_at(target)
    if zi == -1: msg = "Nothing in melee range."; queue_redraw(); return
    var z = zombies[zi]
    var stealth := stealth_attack(z)
    var combat = int(player.skills.Combat)
    var chance = clamp(.55 + combat*.055 - attack_penalty() + (.32 if stealth else 0.0), .12, .97)
    if rng.randf() <= chance:
        var d = rng.randi_range(int(player.weapon.dmin), int(player.weapon.dmax))
        if stealth: d = int(round(float(d + int(player.weapon.stealth) + combat) * 1.55))
        zombies[zi].hp -= d
        msg = "%s hit for %d%s." % [player.weapon.name,d," — STEALTH" if stealth else ""]
        if int(zombies[zi].hp) <= 0: kill_zombie(zi, stealth)
        elif int(player.weapon.push) > 0: push_zombie(zi, player.facing)
    else: msg = "%s misses." % player.weapon.name
    emit_noise(player.pos,int(player.weapon.noise),"melee",true)
    commit_action(int(player.weapon.time))

func click_target(cell: Vector2i):
    if not visible.has(cell): msg = "You cannot target what you cannot see."; queue_redraw(); return
    var zi = zombie_at(cell)
    if zi != -1:
        if manhattan(player.pos,cell) == 1:
            player.facing = cell - player.pos; melee(cell)
        else: shoot(zi)
    elif barrels.has(cell): shoot_barrel(cell)

func shoot_nearest():
    if player.gun == "" or int(player.ammo) <= 0: msg = "No loaded firearm."; queue_redraw(); return
    var best := -1; var bd := 999
    for i in range(zombies.size()):
        var z = zombies[i]
        if z.dead or not visible.has(z.pos): continue
        if not in_cone(player.pos,player.facing,z.pos,view_range(),.25): continue
        var d = manhattan(player.pos,z.pos)
        if d < bd: bd = d; best = i
    if best == -1: msg = "No visible target in your facing cone."; queue_redraw(); return
    shoot(best)

func shoot(i: int):
    if player.gun == "" or int(player.ammo) <= 0: msg = "No loaded firearm."; queue_redraw(); return
    var z = zombies[i]
    if z.dead or not visible.has(z.pos): return
    player.facing = dominant(z.pos - player.pos)
    var dist = manhattan(player.pos,z.pos)
    var chance = clamp(.50 + int(player.skills.Combat)*.065 - max(0,dist-2)*.035 - attack_penalty(), .10, .94)
    player.ammo -= 1; stats.shots += 1
    if rng.randf() <= chance:
        var d = rng.randi_range(8,14) + int(floor(int(player.skills.Combat)/2.0))
        zombies[i].hp -= d; msg = "%s hits for %d." % [player.gun,d]
        if int(zombies[i].hp) <= 0: kill_zombie(i,false)
    else: msg = "%s misses." % player.gun
    emit_noise(player.pos,92,"GUNSHOT",true); commit_action(90)

func shoot_barrel(cell: Vector2i):
    if player.gun == "" or int(player.ammo) <= 0: msg = "Need a loaded firearm."; queue_redraw(); return
    player.ammo -= 1; stats.shots += 1
    barrels.erase(cell)
    msg = "EXPLODING BARREL. Problem solved. New problem created."
    for i in range(zombies.size()):
        if zombies[i].dead: continue
        var d = manhattan(cell,zombies[i].pos)
        if d <= 3:
            zombies[i].hp -= max(3,rng.randi_range(10,17)-d*2)
            if int(zombies[i].hp) <= 0: kill_zombie(i,false)
            else: push_zombie(i,dominant(zombies[i].pos-cell))
    for p in glass.keys().duplicate():
        if manhattan(cell,p) <= 3: glass.erase(p)
    if manhattan(cell,player.pos) <= 3: hurt(max(1,12-manhattan(cell,player.pos)*3),"blast")
    emit_noise(cell,125,"EXPLOSION",false); commit_action(90)

func commit_action(cost: int):
    if game_over: queue_redraw(); return
    var end_tick = tick + max(1,cost)
    process_zombies(end_tick)
    tick = end_tick
    player.fear = max(0,int(player.fear)-fear_recovery())
    recalc_visibility(); refresh_intents(); apply_pressure_fear(); queue_redraw()

func process_zombies(end_tick: int):
    var guard := 0
    while guard < 500:
        guard += 1
        var best := -1; var best_t := 2147483647
        for i in range(zombies.size()):
            if zombies[i].dead: continue
            var t = int(zombies[i].next)
            if t <= end_tick and t < best_t: best_t = t; best = i
        if best == -1: break
        tick = best_t; zombie_act(best)
        if game_over: break

func zombie_act(i: int):
    if zombies[i].dead: return
    var z = zombies[i]
    if zombie_sees(z):
        if z.state != "CHASE": alert(i)
        z.state = "CHASE"; z.target = player.pos; z.heard = player.pos
    if manhattan(z.pos,player.pos) == 1:
        z.facing = player.pos-z.pos; zombies[i]=z; zombie_attack(i); return
    var moved := false
    if z.state == "CHASE":
        z.target = player.pos; zombies[i]=z; moved = zombie_move(i,z.target)
    elif z.heard != Vector2i(-1,-1):
        z.state = "INVESTIGATE"; z.target = z.heard; zombies[i]=z
        if z.pos == z.target:
            zombies[i].heard = Vector2i(-1,-1); zombies[i].state = "IDLE"
        else: moved = zombie_move(i,z.target)
    else:
        if rng.randf() < .35:
            var d = DIRS[rng.randi_range(0,3)]
            var p = z.pos+d
            z.facing=d
            if not blocked(p) and zombie_at(p)==-1 and p!=player.pos: z.pos=p; moved=true
        zombies[i]=z
        if rng.randf() < .06: emit_noise(z.pos,22,"moan",false)
    if not zombies[i].dead: zombies[i].next = tick + (130 if moved else 165)

func zombie_move(i: int,target: Vector2i) -> bool:
    var z = zombies[i]
    var step = next_step(z.pos,target)
    if step == z.pos: zombies[i].next = tick+150; return false
    z.facing = dominant(step-z.pos)
    if doors.has(step) and not doors[step]:
        doors[step] = true; emit_noise(step,30,"door impact",false); zombies[i]=z; zombies[i].next=tick+145; return true
    if glass.has(step):
        glass.erase(step); emit_noise(step,44,"breaking glass",false); zombies[i]=z; zombies[i].next=tick+135; return true
    if zombie_at(step) != -1:
        zombies[i]=z; zombies[i].next=tick+80; return true
    if step != player.pos: z.pos=step
    zombies[i]=z; return true

func zombie_attack(i: int):
    var pressure = crowd_pressure()
    var chance = clamp(.40 + min(.30,pressure*.055),.18,.88)
    if rng.randf() <= chance:
        var d = max(1,rng.randi_range(2,5)-int(player.clothes.prot))
        hurt(d,"zombie attack"); msg = "Zombie hits for %d. Pressure %.1f." % [d,pressure]
    else: msg = "Zombie attack misses."
    add_fear(8+int(round(pressure*2.0)))
    emit_noise(zombies[i].pos,18,"struggle",false)
    if not zombies[i].dead: zombies[i].next=tick+105

func hurt(d: int, source: String):
    player.hp -= d; stats.damage += d
    if int(player.hp) <= 0:
        player.hp = 0; game_over=true; won=false; msg="RUN FAILED — %s." % source; submsg="Press R for a new survivor."

func kill_zombie(i: int, stealth: bool):
    if zombies[i].dead: return
    zombies[i].dead=true; zombies[i].hp=0; stats.kills+=1
    if stealth: stats.stealth+=1; submsg="Quiet kill. The body remains on the map."

func push_zombie(i: int, dir: Vector2i):
    var p = zombies[i].pos + dir
    if dir != Vector2i.ZERO and not blocked(p) and zombie_at(p)==-1 and p!=player.pos: zombies[i].pos=p

func alert(i: int):
    if not zombies[i].alerted: zombies[i].alerted=true; stats.alerted+=1

func emit_noise(source: Vector2i,intensity: int,label: String,player_made: bool):
    stats.noise = max(int(stats.noise),intensity)
    var costs = sound_map(source,intensity)
    for i in range(zombies.size()):
        if zombies[i].dead: continue
        var received = intensity - int(costs.get(zombies[i].pos,99999))
        if received >= 12:
            if zombies[i].state != "CHASE": zombies[i].state="INVESTIGATE"; zombies[i].heard=source; zombies[i].target=source
            if player_made and received >= 30: alert(i)
    if not player_made:
        var heard = intensity - int(costs.get(player.pos,99999))
        if heard + awareness()*2.0 >= 14:
            var fuzz = 2 if heard < 30 else (1 if heard < 50 else 0)
            var approx = source + Vector2i(rng.randi_range(-fuzz,fuzz),rng.randi_range(-fuzz,fuzz))
            sound_marks.append({"pos":clamp_cell(approx),"label":label,"time":tick})
            while sound_marks.size()>5: sound_marks.pop_front()

func sound_map(source: Vector2i,intensity: int) -> Dictionary:
    var dist := {source:0}; var open: Array = [source]
    while not open.is_empty():
        var cur: Vector2i = open.pop_front(); var base = int(dist[cur])
        for d in DIRS:
            var n=cur+d
            if not inside(n): continue
            var cost=4
            if walls.has(n): cost+=12
            if shelves.has(n): cost+=5
            if doors.has(n) and not doors[n]: cost+=8
            if glass.has(n): cost+=4
            var nc=base+cost
            if nc<=intensity and nc<int(dist.get(n,999999)):
                dist[n]=nc; open.append(n)
    return dist

func recalc_visibility():
    visible.clear(); var r=view_range()
    for y in range(max(0,player.pos.y-r),min(H,player.pos.y+r+1)):
        for x in range(max(0,player.pos.x-r),min(W,player.pos.x+r+1)):
            var p=Vector2i(x,y)
            if p==player.pos or (in_cone(player.pos,player.facing,p,r,.36) and has_los(player.pos,p)):
                visible[p]=true; memory[p]=true

func refresh_intents():
    intent_reads.clear(); var a=awareness()
    for i in range(zombies.size()):
        var z=zombies[i]
        if z.dead or not visible.has(z.pos): continue
        if a < 2.2: intent_reads[i]="?"; continue
        var chance=clamp(.22+a*.075-float(player.fear)*.0035,.12,.93)
        if rng.randf()<=chance: intent_reads[i] = "HUNT" if z.state=="CHASE" else ("HEAR" if z.state=="INVESTIGATE" else "IDLE")
        else: intent_reads[i]=["IDLE","HEAR","HUNT","?"][rng.randi_range(0,3)]

func awareness() -> float:
    var v=float(player.skills.Survival)*.65+float(player.skills.Combat)*.35
    if player.status.has("Tired"): v-=.8
    if player.status.has("Nervous"): v-=.4
    v-=float(player.fear)/45.0
    return max(0.0,v)

func view_range() -> int:
    var r=7+int(floor(float(player.skills.Survival)/2.0))
    if player.status.has("Tired"): r-=1
    return max(5,r)

func attack_penalty() -> float:
    var p=0.0
    if player.status.has("Tired"): p+=.08
    if player.status.has("Arm Injury"): p+=.12
    if player.status.has("Nervous"): p+=.05
    p+=max(0.0,float(player.fear-35))*.002
    return p

func stealth_attack(z: Dictionary) -> bool:
    if z.state=="CHASE": return false
    var delta=player.pos-z.pos
    return Vector2(z.facing).dot(Vector2(delta).normalized()) < -.30 and not zombie_sees(z)

func zombie_sees(z: Dictionary) -> bool:
    var r=7-(2 if player.crouched else 0)+(1 if player.move_state=="SPRINT" else 0)
    return in_cone(z.pos,z.facing,player.pos,r,.40) and has_los(z.pos,player.pos)

func crowd_pressure() -> float:
    var p=0.0
    for z in zombies:
        if z.dead: continue
        if manhattan(z.pos,player.pos)==1:
            p+=1.0
            var outward=z.pos-player.pos
            if zombie_at(z.pos+outward)!=-1: p+=.35
    return p

func apply_pressure_fear():
    var p=crowd_pressure()
    if p>=2.0: add_fear(int(round(p*2.0)))

func add_fear(n: int):
    var resist=int(player.skills.Combat)+int(player.skills.Survival)+int(player.skills.Social)/2
    player.fear=clamp(int(player.fear)+max(1,n-int(floor(resist/3.0))),0,100)

func fear_recovery() -> int:
    return 1+int(floor((int(player.skills.Combat)+int(player.skills.Survival))/6.0))

func next_step(start: Vector2i,target: Vector2i) -> Vector2i:
    if start==target: return start
    var q:Array=[start]; var came:={start:start}
    while not q.is_empty():
        var cur:Vector2i=q.pop_front()
        for d in DIRS:
            var n=cur+d
            if came.has(n) or not inside(n): continue
            if walls.has(n) or shelves.has(n) or barrels.has(n): continue
            came[n]=cur
            if n==target:
                var step=n
                while came[step]!=start: step=came[step]
                return step
            q.append(n)
    return start

func has_los(a:Vector2i,b:Vector2i)->bool:
    for p in line_cells(a,b):
        if p==a: continue
        if p==b: return true
        if walls.has(p) or shelves.has(p): return false
        if doors.has(p) and not doors[p]: return false
    return true

func line_cells(a:Vector2i,b:Vector2i)->Array:
    var out:Array=[]; var x0=a.x; var y0=a.y; var x1=b.x; var y1=b.y
    var dx=abs(x1-x0); var sx=1 if x0<x1 else -1; var dy=-abs(y1-y0); var sy=1 if y0<y1 else -1; var err=dx+dy
    while true:
        out.append(Vector2i(x0,y0))
        if x0==x1 and y0==y1: break
        var e2=2*err
        if e2>=dy: err+=dy; x0+=sx
        if e2<=dx: err+=dx; y0+=sy
    return out

func in_cone(o:Vector2i,f:Vector2i,t:Vector2i,r:int,dot_limit:float)->bool:
    var delta=t-o
    if delta==Vector2i.ZERO: return true
    return Vector2(delta).length()<=float(r)+.45 and Vector2(f).dot(Vector2(delta).normalized())>=dot_limit

func blocked(p:Vector2i)->bool:
    return not inside(p) or walls.has(p) or shelves.has(p) or barrels.has(p) or glass.has(p) or (doors.has(p) and not doors[p])

func zombie_at(p:Vector2i)->int:
    for i in range(zombies.size()):
        if not zombies[i].dead and zombies[i].pos==p: return i
    return -1

func inside(p:Vector2i)->bool: return p.x>=0 and p.x<W and p.y>=0 and p.y<H
func manhattan(a:Vector2i,b:Vector2i)->int: return abs(a.x-b.x)+abs(a.y-b.y)
func clamp_cell(p:Vector2i)->Vector2i: return Vector2i(clamp(p.x,1,W-2),clamp(p.y,1,H-2))
func dominant(d:Vector2i)->Vector2i:
    if abs(d.x)>=abs(d.y): return Vector2i(sign(d.x),0) if d.x!=0 else Vector2i(0,sign(d.y))
    return Vector2i(0,sign(d.y))

func win_run():
    won=true; game_over=true; msg="OBJECTIVE COMPLETE — escaped with the supplies."; submsg="Press R for a new randomized run."; queue_redraw()

func cell_to_screen(p:Vector2i)->Vector2: return ORIGIN+Vector2(p.x*TILE,p.y*TILE)
func screen_to_cell(p:Vector2)->Vector2i:
    var q=p-ORIGIN; return Vector2i(int(floor(q.x/TILE)),int(floor(q.y/TILE)))

func _draw():
    draw_map(); draw_units(); draw_fog(); draw_sounds(); draw_hud()

func draw_map():
    for y in range(H):
        for x in range(W):
            var p=Vector2i(x,y); var c=Color(.15,.17,.15)
            if x>=7 and x<=23 and y>=2 and y<=14: c=Color(.18,.19,.17)
            draw_rect(Rect2(cell_to_screen(p),Vector2(TILE,TILE)),c)
            draw_rect(Rect2(cell_to_screen(p),Vector2(TILE,TILE)),Color(.08,.09,.08),false,1)
    for p in walls.keys(): tile(p,Color(.29,.31,.29))
    for p in shelves.keys(): tile(p,Color(.34,.25,.16))
    for p in glass.keys(): tile(p,Color(.22,.45,.52,.72)); label_at(p,"GL",10)
    for p in doors.keys(): tile(p,Color(.20,.45,.27) if doors[p] else Color(.42,.25,.13)); label_at(p,"D",14)
    for p in barrels.keys(): tile(p,Color(.55,.18,.12)); label_at(p,"BOOM",8)
    if not alarm_spent: tile(alarm,Color(.48,.40,.10)); label_at(alarm,"AL",11)
    tile(exit_cell,Color(.12,.42,.25)); label_at(exit_cell,"EXIT",9)
    if not objective_taken: tile(objective,Color(.52,.45,.12)); label_at(objective,"LOOT",9)

func draw_units():
    for z in zombies:
        if z.dead:
            var c=cell_to_screen(z.pos)+Vector2(TILE/2,TILE/2)
            draw_line(c+Vector2(-8,-5),c+Vector2(8,5),Color(.35,.08,.08),3)
            draw_line(c+Vector2(-8,5),c+Vector2(8,-5),Color(.35,.08,.08),3)
    for i in range(zombies.size()):
        var z=zombies[i]
        if z.dead or not visible.has(z.pos): continue
        var c=cell_to_screen(z.pos)+Vector2(TILE/2,TILE/2)
        draw_circle(c,10,Color(.35,.52,.31)); arrow(c,z.facing,Color(.76,.90,.70),11)
        draw_string(font,c+Vector2(-13,-14),str(intent_reads.get(i,"?")),HORIZONTAL_ALIGNMENT_LEFT,-1,10,Color(1,.85,.38))
        if debug_ai: draw_string(font,c+Vector2(-12,27),"%s %d"%[z.state,int(z.next)-tick],HORIZONTAL_ALIGNMENT_LEFT,-1,8,Color.WHITE)
    var pc=cell_to_screen(player.pos)+Vector2(TILE/2,TILE/2)
    draw_circle(pc,10,Color(.25,.55,.90)); arrow(pc,player.facing,Color.WHITE,13)
    if player.crouched: draw_circle(pc,12,Color(.55,.75,1),false,1)

func draw_fog():
    for y in range(H):
        for x in range(W):
            var p=Vector2i(x,y)
            if visible.has(p): draw_rect(Rect2(cell_to_screen(p),Vector2(TILE,TILE)),Color(.85,.88,.70,.035))
            elif memory.has(p): draw_rect(Rect2(cell_to_screen(p),Vector2(TILE,TILE)),Color(.02,.025,.022,.58))
            else: draw_rect(Rect2(cell_to_screen(p),Vector2(TILE,TILE)),Color(.01,.012,.01,.92))

func draw_sounds():
    for s in sound_marks:
        if tick-int(s.time)>650 or visible.has(s.pos): continue
        var c=cell_to_screen(s.pos)+Vector2(TILE/2,TILE/2)
        draw_circle(c,10,Color(.95,.80,.28,.20),false,2); draw_string(font,c+Vector2(-4,5),"?",HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color(.98,.85,.36))

func draw_hud():
    var x=HUD_X; var y=32.0; var s=player.skills
    draw_string(font,Vector2(x,y),"ARENA COMBAT LAB — FF ALPHA 0.1",HORIZONTAL_ALIGNMENT_LEFT,-1,20,Color.WHITE); y+=30
    draw_string(font,Vector2(x,y),player.name,HORIZONTAL_ALIGNMENT_LEFT,-1,18,Color(.65,.82,1)); y+=22
    draw_string(font,Vector2(x,y),"HP %d/%d   FEAR %d   TICK %d"%[player.hp,player.max_hp,player.fear,tick],HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color.WHITE); y+=20
    draw_string(font,Vector2(x,y),"Facing %s   Move %s"%[DIR_NAMES[DIRS.find(player.facing)],player.move_state],HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color(.8,.82,.8)); y+=30
    draw_string(font,Vector2(x,y),"FIRST FIRE SKILLS",HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color(.95,.8,.36)); y+=20
    draw_string(font,Vector2(x,y),"Combat %d   Scavenging %d   Survival %d"%[s.Combat,s.Scavenging,s.Survival],HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color.WHITE); y+=18
    draw_string(font,Vector2(x,y),"Medical %d   Technical %d   Social %d"%[s.Medical,s.Technical,s.Social],HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color.WHITE); y+=18
    draw_string(font,Vector2(x,y),"Specialty: %s"%player.specialty,HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.75,.76,.75)); y+=28
    draw_string(font,Vector2(x,y),"EQUIPMENT / CONDITION",HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color(.95,.8,.36)); y+=20
    draw_string(font,Vector2(x,y),"%s | %s"%[player.weapon.name,player.clothes.name],HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color.WHITE); y+=18
    draw_string(font,Vector2(x,y),"%s | Ammo %d"%[player.gun if player.gun!="" else "No firearm",player.ammo],HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color.WHITE); y+=18
    draw_string(font,Vector2(x,y),"Status: %s"%", ".join(player.status),HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color.WHITE); y+=18
    draw_string(font,Vector2(x,y),"Awareness %.1f | Pressure %.1f"%[awareness(),crowd_pressure()],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.72,.75,.72)); y+=30
    draw_string(font,Vector2(x,y),"OBJECTIVE: %s"%("CACHE ACQUIRED — ESCAPE" if objective_taken else "GET THE SUPPLY CACHE"),HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color(.95,.8,.36)); y+=21
    draw_string(font,Vector2(x,y),"Kills %d | Alerted %d | Stealth %d"%[stats.kills,stats.alerted,stats.stealth],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color.WHITE); y+=18
    draw_string(font,Vector2(x,y),"Shots %d | Peak noise %d | Damage %d"%[stats.shots,stats.noise,stats.damage],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color.WHITE); y+=30
    draw_string(font,Vector2(x,y),msg,HORIZONTAL_ALIGNMENT_LEFT,430,14,Color(.93,.94,.90)); y+=38
    draw_string(font,Vector2(x,y),submsg,HORIZONTAL_ALIGNMENT_LEFT,430,12,Color(.68,.72,.68))
    y=600
    draw_string(font,Vector2(x,y),"WASD move | Shift sprint | C crouch | Q/E turn",HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.78,.8,.78)); y+=18
    draw_string(font,Vector2(x,y),"Space melee | G shoot | F interact | click target",HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.78,.8,.78)); y+=18
    draw_string(font,Vector2(x,y),"R new run | F1 AI debug",HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.78,.8,.78))
    if game_over:
        draw_rect(Rect2(Vector2(160,220),Vector2(470,120)),Color(.02,.025,.02,.94)); draw_rect(Rect2(Vector2(160,220),Vector2(470,120)),Color(.85,.72,.30),false,2)
        draw_string(font,Vector2(185,260),"OBJECTIVE COMPLETE" if won else "RUN FAILED",HORIZONTAL_ALIGNMENT_LEFT,-1,28,Color.WHITE)
        draw_string(font,Vector2(185,292),"Ticks %d | Kills %d | Alerted %d | Noise %d"%[tick,stats.kills,stats.alerted,stats.noise],HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color.WHITE)
        draw_string(font,Vector2(185,320),"Press R for a new randomized run.",HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color(.95,.8,.36))

func tile(p:Vector2i,c:Color): draw_rect(Rect2(cell_to_screen(p)+Vector2(1,1),Vector2(TILE-2,TILE-2)),c)
func label_at(p:Vector2i,t:String,size:int): draw_string(font,cell_to_screen(p)+Vector2(4,20),t,HORIZONTAL_ALIGNMENT_LEFT,-1,size,Color.WHITE)
func arrow(c:Vector2,d:Vector2i,col:Color,length:float):
    var v=Vector2(d); var tip=c+v*length; var side=Vector2(-v.y,v.x)
    draw_line(c,tip,col,2); draw_line(tip,tip-v*4+side*3,col,2); draw_line(tip,tip-v*4-side*3,col,2)
