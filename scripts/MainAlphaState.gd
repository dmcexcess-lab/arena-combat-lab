extends "res://scripts/MainBoundless.gd"

const GearCoreScript = preload("res://scripts/AlphaGearCore.gd")
const ALPHA_SLOTS := ["Weapon", "Offhand", "Head", "Gloves", "Cloak", "Armor", "Belt", "Boots", "Ring 1", "Ring 2", "Amulet"]
const BASE_STAT := 2
const BASE_HP := 22
const CHEST_COUNT := 4

var gear_core
var loot_chests = {}
var gear_runtime = {}
var selected_feat = ""
var last_strenuous_tick = -10000
var panic_pending = false
var defense_mult = 1.0
var defense_hits = 0
var temp_knock_resist = 0
var last_weapon_target_id = -1
var kill_haste = false
var kill_move_haste = false
var last_damage_taken = 0

func _ready():
    gear_core = GearCoreScript.new(rng)
    super._ready()

func _blank_attrs() -> Dictionary:
    return {"Might":BASE_STAT,"Finesse":BASE_STAT,"Awareness":BASE_STAT,"Vitality":BASE_STAT,"Will":BASE_STAT}

func _roll_starting_loadouts():
    starter_loadouts.clear()
    for family in GearCoreScript.FAMILIES:
        starter_loadouts.append({"family":str(family),"gear":gear_core.make_starter(str(family))})
    selected_starter = clampi(selected_starter,0,starter_loadouts.size()-1)
    queue_redraw()

func build_map():
    super.build_map()
    loot_chests.clear()
    var candidates=[]
    for p in floor_cells:
        if p==exit_cell or doors.has(p) or shelves.has(p) or barrels.has(p):continue
        if manhattan(p,exit_cell)<5:continue
        var near_objective=false
        for o in objective_spots:
            if p==o or manhattan(p,o)<=1:near_objective=true;break
        if not near_objective:candidates.append(p)
    candidates.shuffle()
    for i in range(min(CHEST_COUNT,candidates.size())):loot_chests[candidates[i]]=true

func draw_map():
    super.draw_map()
    for p in loot_chests.keys():
        if bool(loot_chests[p]):tile(p,Color(.42,.25,.08));label_at(p,"CHEST",7)

func make_player():
    equipped.clear();inventory.clear();armor_total=0
    build_affinity={"Stealth":0,"Ranged":0,"Guard":0,"Ravager":0}
    selected_feat="";panic_pending=false;defense_mult=1.0;defense_hits=0;temp_knock_resist=0
    last_weapon_target_id=-1;kill_haste=false;kill_move_haste=false;last_strenuous_tick=-10000
    player={"name":"Arena Tester","attrs":_blank_attrs(),"weapon":_fists(),"clothes":{"name":"Unarmored","prot":0,"noise":0},
        "gun":"","ammo":0,"ammo_max":0,"throwing_ammo":0,"throwing_max":0,"status":[],"hp":BASE_HP,"max_hp":BASE_HP,
        "fear":0,"fatigue":0.0,"pos":exit_cell,"facing":Vector2i(1,0),"last_dir":Vector2i.ZERO,"move_state":"STILL","crouched":false}
    if starter_loadouts.is_empty():_roll_starting_loadouts()
    var gear:Dictionary=starter_loadouts[selected_starter]["gear"]
    for slot in gear.keys():equipped[str(slot)]=gear[slot].duplicate(true)
    _rebuild_player_from_gear(true)

func _armor_family()->String:
    return str(equipped["Armor"]["family"]) if equipped.has("Armor") else ""

func _allowed_families_for_slot(armor_family:String,slot:String)->Array:
    if slot in ["Ring","Ring 1","Ring 2","Amulet","Armor"]:return GearCoreScript.FAMILIES.duplicate()
    if armor_family=="Stealth":
        if slot in ["Weapon","Offhand","Cloak","Boots"]:return ["Stealth"]
        return ["Stealth","Ranged"]
    if armor_family=="Ranged":
        if slot=="Weapon":return ["Ranged"]
        if slot=="Offhand":return []
        if slot in ["Gloves","Belt"]:return ["Ranged"]
        return ["Stealth","Ranged"]
    if armor_family=="Guard":
        if slot in ["Weapon","Offhand","Gloves","Belt"]:return ["Guard"]
        return ["Guard","Ravager"]
    if armor_family=="Ravager":
        if slot=="Weapon":return ["Ravager"]
        if slot=="Offhand":return []
        if slot in ["Gloves","Cloak","Boots"]:return ["Ravager"]
        return ["Guard","Ravager"]
    return GearCoreScript.FAMILIES.duplicate()

func _item_compatible_with_armor(item:Dictionary)->bool:
    var slot=str(item.get("slot",""))
    if slot in ["Ring","Amulet","Armor"]:return true
    var family=_armor_family()
    if family=="":return true
    return str(item.get("family","")) in _allowed_families_for_slot(family,slot)

func _eject_incompatible_gear():
    for equip_slot in ALPHA_SLOTS:
        var slot=str(equip_slot)
        if slot in ["Ring 1","Ring 2","Amulet","Armor"] or not equipped.has(slot):continue
        var item:Dictionary=equipped[slot]
        if not _item_compatible_with_armor(item):inventory.append(item);equipped.erase(slot)

func _merge_mods(dst:Dictionary,src:Dictionary):
    for k in src.keys():
        if typeof(src[k])==TYPE_BOOL:dst[k]=bool(dst.get(k,false)) or bool(src[k])
        elif k in ["move_mult","crouch_mult","fear_mult","crowd_fear_mult","fatigue_mult","weapon_fatigue_mult","heavy_fatigue_mult","weapon_tick_mult","heavy_tick_mult","ranged_tick_mult","rear_damage","low_hp_damage","isolated_damage"]:dst[k]=float(dst.get(k,1.0))*float(src[k])
        elif k=="quick_shot_penalty":dst[k]=max(float(dst.get(k,-.20)),float(src[k]))
        else:dst[k]=dst.get(k,0)+src[k]

func _rebuild_player_from_gear(heal_full:bool=false):
    var old_max=int(player.get("max_hp",BASE_HP));var old_hp=int(player.get("hp",old_max));var missing=max(0,old_max-old_hp)
    var old_weapon=str(player.get("weapon",{}).get("name",""));var old_offhand=str(player.get("offhand_name",""))
    var attrs=_blank_attrs();armor_total=0;var hp_bonus=0;var noise_total=0;gear_runtime=gear_core.blank_mods()
    build_affinity={"Stealth":0,"Ranged":0,"Guard":0,"Ravager":0};var weapon_data=_fists();var weapon_item={};var offhand_item={}
    for equip_slot in ALPHA_SLOTS:
        var slot=str(equip_slot)
        if not equipped.has(slot):continue
        var item:Dictionary=equipped[slot]
        for stat in ATTR_NAMES:attrs[stat]+=int(item["stats"].get(stat,0))
        armor_total+=int(item.get("armor",0));hp_bonus+=int(item.get("hp_bonus",0));noise_total+=int(item.get("noise",0));_merge_mods(gear_runtime,item["mods"])
        if build_affinity.has(str(item["family"])):build_affinity[str(item["family"]]+=1)
        if slot=="Weapon":weapon_item=item;weapon_data=gear_core.weapon_data(str(item["base_name"]))
        elif slot=="Offhand":offhand_item=item
    player["attrs"]=attrs;player["weapon"]=weapon_data;player["weapon_item"]=weapon_item;player["offhand_item"]=offhand_item;player["offhand_name"]=str(offhand_item.get("base_name",""))
    player["clothes"]={"name":"Equipped gear","prot":armor_total,"noise":noise_total};player["max_hp"]=BASE_HP+max(0,int(attrs["Vitality"])-BASE_STAT)*2+hp_bonus
    player["hp"]=int(player["max_hp"]) if heal_full else max(1,int(player["max_hp"])-missing)
    if bool(weapon_data.get("ranged",false)):
        player["gun"]=str(weapon_data["name"]);player["ammo_max"]=12+int(gear_runtime["ammo_bonus"])
        player["ammo"]=int(player["ammo_max"]) if old_weapon!=str(weapon_data["name"]) else min(int(player.get("ammo",0)),int(player["ammo_max"]))
    else:player["gun"]="";player["ammo"]=0;player["ammo_max"]=0
    if not offhand_item.is_empty() and str(offhand_item["family"])=="Stealth":
        var base_cap=4 if str(offhand_item["base_name"])=="Throwing Knife Sheath" else 3;player["throwing_max"]=base_cap+int(gear_runtime["throw_bonus"])
        player["throwing_ammo"]=int(player["throwing_max"]) if old_offhand!=str(offhand_item["base_name"]) else min(int(player.get("throwing_ammo",0)),int(player["throwing_max"]))
    else:player["throwing_ammo"]=0;player["throwing_max"]=0

func _build_name()->String:
    var family=_armor_family();return family.to_upper() if family!="" else "UNARMORED"

func _gear_score(item:Dictionary)->int:
    var score=int(item.get("armor",0))*2+int(item.get("hp_bonus",0))
    for stat in ATTR_NAMES:score+=int(item["stats"].get(stat,0))
    return score+item["properties"].size()*2+item["specials"].size()*2

func _equip_inventory_index(index:int):
    if index<0 or index>=inventory.size():return
    var item:Dictionary=inventory[index]
    if not _item_compatible_with_armor(item):msg="%s is locked by %s armor."%[str(item["name"]),_armor_family()];queue_redraw();return
    inventory.remove_at(index);var slot=str(item["slot"])
    if slot=="Ring":
        if not equipped.has("Ring 1"):slot="Ring 1"
        elif not equipped.has("Ring 2"):slot="Ring 2"
        else:slot="Ring 1" if _gear_score(equipped["Ring 1"])<=_gear_score(equipped["Ring 2"]) else "Ring 2"
    if equipped.has(slot):inventory.append(equipped[slot])
    equipped[slot]=item
    if slot=="Armor":_eject_incompatible_gear()
    _rebuild_player_from_gear(false);msg="Equipped %s. Identity: %s"%[str(item["name"]),_build_name()]
    inventory_page=min(inventory_page,max(0,int(ceil(float(inventory.size())/8.0))-1));queue_redraw()

func _open_chest_at(p:Vector2i):
    if not loot_chests.has(p) or not bool(loot_chests[p]):return
    loot_chests[p]=false;var item=gear_core.roll_loot();inventory.append(item);msg="CHEST: %s"%str(item["name"]);submsg="Added to inventory. CHAR to inspect/equip it.";emit_noise(p,5,"chest",true);queue_redraw()

func _state_tick_mult()->float:
    var mult=1.0;var fear=int(player.get("fear",0));var fatigue=float(player.get("fatigue",0.0))
    if fear>=75:mult*=1.15
    elif fear>=50:mult*=1.05
    if fatigue>=100:mult*=1.50
    elif fatigue>=75:mult*=1.30
    elif fatigue>=50:mult*=1.15
    elif fatigue>=25:mult*=1.05
    return mult

func attack_penalty()->float:
    var p=0.0;var fear=int(player.get("fear",0));var fatigue=float(player.get("fatigue",0.0))
    if fear>=75:p+=.20
    elif fear>=50:p+=.12
    elif fear>=25:p+=.05
    if fatigue>=75:p+=.10
    return p

func _add_fatigue(amount:float,weapon_action:bool=false,heavy:bool=false,special:bool=false):
    var vit=int(player["attrs"]["Vitality"]);var mult=float(gear_runtime.get("fatigue_mult",1.0))*max(.55,1.0-max(0,vit-BASE_STAT)*.03)
    if weapon_action:mult*=float(gear_runtime.get("weapon_fatigue_mult",1.0))
    if heavy:mult*=float(gear_runtime.get("heavy_fatigue_mult",1.0))
    if special:amount=max(1.0,amount-float(gear_runtime.get("special_fatigue_reduction",0)))
    player["fatigue"]=clamp(float(player.get("fatigue",0.0))+amount*mult,0.0,100.0)

func _mark_strenuous(cost:int):last_strenuous_tick=tick+cost

func add_fear(n:int):
    var will=int(player["attrs"]["Will"]);var mult=float(gear_runtime.get("fear_mult",1.0))*max(.35,1.0-max(0,will-BASE_STAT)*.05)
    player["fear"]=clampi(int(player.get("fear",0))+max(1,int(round(float(n)*mult))),0,100)
    if int(player["fear"])>=100:panic_pending=true

func fear_recovery()->int:return 1+int(floor(float(max(0,int(player["attrs"]["Will"])-BASE_STAT))/3.0))

func commit_action(cost:int):
    if game_over:queue_redraw();return
    var end_tick=tick+max(1,cost);process_zombies(end_tick);tick=end_tick
    if not any_zombie_spotted_player():player["fear"]=max(0,int(player["fear"])-fear_recovery())
    if tick-last_strenuous_tick>=100:player["fatigue"]=max(0.0,float(player.get("fatigue",0.0))-2.0*float(max(1,cost))/100.0)
    recalc_visibility();refresh_intents();apply_pressure_fear();queue_redraw()

func _panic_reaction()->bool:
    if not panic_pending:return false
    panic_pending=false;player["fear"]=75;selected_feat="";var closest=Vector2i(-99,-99);var best=999
    for z in zombies:
        if z.dead or not visible_cells.has(z.pos):continue
        var d=manhattan(player.pos,z.pos)
        if d<best:best=d;closest=z.pos
    var moved=false
    if best<999:
        var options=[]
        for d in DIRS:
            var p=player.pos+d
            if not blocked(p) and zombie_at(p)==-1:options.append({"p":p,"d":manhattan(p,closest)})
        options.sort_custom(func(a,b):return int(a["d"])>int(b["d"]))
        if not options.is_empty():player["pos"]=options[0]["p"];moved=true
    msg="PANIC - you recoil from the threat." if moved else "PANIC - frozen in place.";last_strenuous_tick=tick+100;commit_action(100);return true

func try_move(dir:Vector2i,sprint:bool):
    if _panic_reaction():return
    var dest=player.pos+dir;player.facing=dir;recalc_visibility();refresh_intents();var blocker=zombie_at(dest)
    if blocked(dest) or blocker!=-1:msg="A zombie blocks the way." if blocker!=-1 and visible_cells.has(dest) else "Blocked.";player.move_state="STILL";queue_redraw();return
    var base_cost=100;var noise=7;var fatigue=.60
    if player.crouched:base_cost=140;noise=2;fatigue=.45;player.move_state="CROUCH"
    else:player.move_state="WALK"
    var mult=float(gear_runtime.get("move_mult",1.0))*(float(gear_runtime.get("crouch_mult",1.0)) if player.crouched else 1.0)
    if kill_move_haste:base_cost=max(20,base_cost-15);kill_move_haste=false
    var cost=max(20,int(round(float(base_cost)*mult*_state_tick_mult())));player.pos=dest;player.last_dir=dir;emit_noise(dest,max(0,noise+int(player.clothes.noise)),"movement",true);_add_fatigue(fatigue)
    if dest==objective and not objective_taken:objective_taken=true;msg="CACHE RECOVERED. Return to the stair.";submsg="You do not need to clear the floor.";emit_noise(dest,10,"rummaging",true)
    if dest==exit_cell:
        if objective_taken:win_run();return
        msg="The stair is here; the cache is still out there."
    commit_action(cost);_open_chest_at(player.pos)

func rotate_player(step:int):
    if _panic_reaction():return
    var idx=posmod(DIRS.find(player.facing)+step,4);player.facing=DIRS[idx];player.last_dir=Vector2i.ZERO;player.move_state="STILL";msg="Turned %s."%DIR_NAMES[idx];commit_action(max(10,int(round(20.0*_state_tick_mult()))))

func toggle_crouch():
    if not _panic_reaction():super.toggle_crouch()

func interact():
    if not _panic_reaction():super.interact()

func hurt(d:int,source:String):
    var reduced=max(1,d-int(floor(float(armor_total)/5.0)))
    if defense_hits>0:
        reduced=max(1,int(ceil(float(reduced)*defense_mult)))
        if defense_hits<99:defense_hits-=1
        if defense_hits<=0:defense_mult=1.0;temp_knock_resist=0
    last_damage_taken=reduced;player.hp-=reduced;stats.damage+=reduced
    if int(player.hp)<=0:player.hp=0;game_over=true;won=false;msg="RUN FAILED - %s."%source;submsg="MENU > NEW SETUP"

func zombie_attack(i:int):
    var pressure=crowd_pressure();var chance=clamp(WALKER_HIT+min(.28,pressure*.05),.18,.88)
    if rng.randf()<=chance:
        var raw=rng.randi_range(WALKER_DMIN,WALKER_DMAX);hurt(raw,"walker attack");msg="Walker hits for %d after armor. Pressure %.1f."%[last_damage_taken,pressure]
    else:msg="Walker attack misses."
    add_fear(int(round(float(8+int(round(pressure*2.0)))*float(gear_runtime.get("crowd_fear_mult",1.0)))));emit_noise(zombies[i].pos,18,"struggle",false)
    if not zombies[i].dead:zombies[i].next=tick+WALKER_ATTACK

func alert(i:int):
    var first=not bool(zombies[i].alerted);super.alert(i)
    if first:add_fear(max(1,int(round(6.0*float(gear_runtime.get("spot_fear_mult",1.0))))))

func kill_zombie(i:int,stealth:bool):
    var was_dead=bool(zombies[i].dead);super.kill_zombie(i,stealth)
    if was_dead:return
    player.fear=max(0,int(player.fear)-int(gear_runtime.get("kill_fear",0)));player.fatigue=max(0.0,float(player.fatigue)-float(gear_runtime.get("kill_fatigue",0)))
    if bool(gear_runtime.get("kill_attack_haste",false)):kill_haste=true
    if bool(gear_runtime.get("kill_move_haste",false)):kill_move_haste=true

func emit_noise(source:Vector2i,intensity:int,label:String,player_made:bool):
    stats.noise=max(int(stats.noise),intensity);var costs=sound_map(source,intensity)
    for i in range(zombies.size()):
        if zombies[i].dead:continue
        var received=intensity-int(costs.get(zombies[i].pos,99999))
        if received>=WALKER_HEARING:
            if zombies[i].state!="CHASE":zombies[i].state="INVESTIGATE";zombies[i].heard=source;zombies[i].target=source
            if player_made and received>=30:alert(i)
    if not player_made:
        var heard=intensity-int(costs.get(player.pos,99999))
        if heard+awareness()*2.0>=14:
            var fuzz=2 if heard<30 else (1 if heard<50 else 0);fuzz=max(0,fuzz-int(gear_runtime.get("sound_fuzz_reduction",0)))
            var approx=source+Vector2i(rng.randi_range(-fuzz,fuzz),rng.randi_range(-fuzz,fuzz));sound_marks.append({"pos":clamp_cell(approx),"label":label,"time":tick})
            while sound_marks.size()>5:sound_marks.pop_front()

func awareness()->float:return max(0.0,float(player["attrs"]["Awareness"])-float(player.fear)/40.0)
func view_range()->int:return clamp(6+int(floor(float(max(0,int(player["attrs"]["Awareness"])-BASE_STAT))/3.0)),6,12)
