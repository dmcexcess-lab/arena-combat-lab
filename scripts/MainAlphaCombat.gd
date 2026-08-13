extends "res://scripts/MainAlphaState.gd"

func _melee_accuracy(extra:float=0.0)->float:
    return clamp(.58+max(0,int(player["attrs"]["Finesse"])-BASE_STAT)*.03+float(gear_runtime.get("melee_acc",0.0))+extra-attack_penalty(),.10,.97)

func _might_mult()->float:
    return 1.0+max(0,int(player["attrs"]["Might"])-BASE_STAT)*.05

func _isolated(zi:int)->bool:
    var p:Vector2i=zombies[zi].pos
    for j in range(zombies.size()):
        if j!=zi and not zombies[j].dead and manhattan(p,zombies[j].pos)==1:return false
    return true

func _clear_defense_on_offense():
    if defense_hits>0:defense_mult=1.0;defense_hits=0;temp_knock_resist=0

func _push_steps(i:int,dir:Vector2i,steps:int):
    for n in range(steps):
        if i<0 or i>=zombies.size() or zombies[i].dead:return
        var dest=zombies[i].pos+dir;var other=zombie_at(dest)
        if other!=-1 and other!=i:
            zombies[i].hp-=2;zombies[other].hp-=2
            if int(zombies[i].hp)<=0:kill_zombie(i,false)
            if int(zombies[other].hp)<=0:kill_zombie(other,false)
            return
        if blocked(dest) or dest==player.pos:return
        zombies[i].pos=dest

func melee(target:Vector2i):
    if _panic_reaction():return
    var zi=zombie_at(target)
    if zi==-1:msg="Nothing in melee range.";queue_redraw();return
    if bool(player.weapon.get("ranged",false)):_ranged_attack(zi,selected_feat);selected_feat="";return
    if selected_feat!="":
        var feat=selected_feat;selected_feat="";_use_target_feat(zi,feat);return
    _single_melee_attack(zi,"")

func _single_melee_attack(zi:int,feat:String):
    if zi<0 or zi>=zombies.size() or zombies[zi].dead:return
    if feat!="" and float(player.get("fatigue",0.0))>=100:msg="Too fatigued for special attacks.";queue_redraw();return
    _clear_defense_on_offense();var z=zombies[zi];var stealth=stealth_attack(z);var dmg_mult=_might_mult();var acc_extra=.15 if stealth else 0.0
    var time=int(player.weapon.time);var fatigue=float(player.weapon.fatigue);var push=int(player.weapon.push)+int(gear_runtime.get("force_bonus",0))+int(floor(float(max(0,int(player["attrs"]["Might"])-BASE_STAT))/3.0));var delay=0;var disengage=false;var secondary=0.0
    if stealth:dmg_mult*=1.10
    match feat:
        "Backstab":
            if not stealth:msg="Backstab requires an unaware/rear target.";queue_redraw();return
            dmg_mult*=1.60;time+=10;fatigue+=1
        "Quick Cut":dmg_mult*=.75;time=int(round(float(time)*.70))
        "Hamstring":dmg_mult*=.75;delay=50
        "Feint":dmg_mult*=.50
        "Deep Cut":dmg_mult*=1.10;delay=30;time+=10;fatigue+=1
        "Disengaging Cut":dmg_mult*=.70;disengage=true
        "Cleave":secondary=.60;time=105;fatigue=5
        "Driving Blow":dmg_mult*=.80;push=max(push,2);fatigue+=2
        "Guarded Strike":dmg_mult*=.80;defense_mult=.75;defense_hits=1
        "Execution":
            if int(z.hp)>int(ceil(WALKER_HP*.50)):msg="Execution requires a wounded target.";queue_redraw();return
            dmg_mult*=1.50;time=130;fatigue=9
        "Focused Strike":
            if not _isolated(zi):msg="Focused Strike requires an isolated target.";queue_redraw();return
            acc_extra+=.20;dmg_mult*=1.25;time=125;fatigue=8
        "Crushing Blow":dmg_mult*=1.30;push=max(push,2);time=170;fatigue=13
        "Opening Blow":
            if int(z.hp)<WALKER_HP:msg="Opening Blow requires a fresh target.";queue_redraw();return
            dmg_mult*=1.35;time+=15;fatigue+=2
        "Relentless Strike":
            if int(z.id)!=last_weapon_target_id:msg="Relentless Strike requires your previous target.";queue_redraw();return
            dmg_mult*=1.25;time+=10;fatigue+=2
        "Overhead Smash":dmg_mult*=1.50;acc_extra-=.15;time+=30;fatigue+=4
    if stealth:dmg_mult*=float(gear_runtime.get("rear_damage",1.0))
    if int(z.hp)<=int(ceil(WALKER_HP*.50)):dmg_mult*=float(gear_runtime.get("low_hp_damage",1.0))
    if _isolated(zi):dmg_mult*=float(gear_runtime.get("isolated_damage",1.0))
    if kill_haste:time=int(round(float(time)*.90));kill_haste=false
    var heavy=bool(player.weapon.get("heavy",false));var ticks=float(gear_runtime.get("weapon_tick_mult",1.0))*(float(gear_runtime.get("heavy_tick_mult",1.0)) if heavy else 1.0)*max(.80,1.0-max(0,int(player["attrs"]["Finesse"])-BASE_STAT)*.02)*_state_tick_mult();time=max(35,int(round(float(time)*ticks)))
    if rng.randf()<=_melee_accuracy(acc_extra):
        var d=max(1,int(round(float(rng.randi_range(int(player.weapon.dmin),int(player.weapon.dmax)))*dmg_mult)));zombies[zi].hp-=d;msg="%s hits for %d%s."%[str(player.weapon.name),d," - %s"%feat if feat!="" else ""]
        if delay>0:zombies[zi].next+=delay
        if feat=="Feint":zombies[zi].facing=DIRS[posmod(DIRS.find(zombies[zi].facing)+1,4)]
        if int(zombies[zi].hp)<=0:kill_zombie(zi,stealth)
        elif push>0:_push_steps(zi,player.facing,push)
        if secondary>0:_cleave_secondary(zi,secondary)
    else:msg="%s misses%s."%[str(player.weapon.name)," - %s"%feat if feat!="" else ""]
    last_weapon_target_id=int(z.id);emit_noise(player.pos,int(player.weapon.noise),"melee",true);_add_fatigue(fatigue,true,heavy,feat!="");_mark_strenuous(time);commit_action(time)
    if disengage and not game_over:
        var back=player.pos-player.facing
        if not blocked(back) and zombie_at(back)==-1:player.pos=back;recalc_visibility();refresh_intents();queue_redraw()

func _cleave_secondary(primary:int,factor:float):
    for i in range(zombies.size()):
        if i==primary or zombies[i].dead:continue
        if manhattan(player.pos,zombies[i].pos)==1:
            var d=max(1,int(round(float(rng.randi_range(int(player.weapon.dmin),int(player.weapon.dmax)))*_might_mult()*factor)));zombies[i].hp-=d
            if int(zombies[i].hp)<=0:kill_zombie(i,false)
            return

func _range_dist(a:Vector2i,b:Vector2i)->int:
    return max(abs(a.x-b.x),abs(a.y-b.y))

func shoot(i:int):
    _ranged_attack(i,selected_feat);selected_feat=""

func _ranged_attack(i:int,feat:String):
    if _panic_reaction():return
    if player.gun=="" or int(player.ammo)<=0:msg="No ammunition.";queue_redraw();return
    if i<0 or i>=zombies.size() or zombies[i].dead or not visible_cells.has(zombies[i].pos):return
    if feat!="" and float(player.get("fatigue",0.0))>=100:msg="Too fatigued for special attacks.";queue_redraw();return
    _clear_defense_on_offense();var z=zombies[i];var delta:Vector2i=z.pos-player.pos;var dist=_range_dist(player.pos,z.pos);var max_range=int(player.weapon.get("range",5))+int(gear_runtime.get("range_bonus",0))
    if dist>max_range:msg="Out of range.";queue_redraw();return
    player.facing=dominant(delta);var acc=.55+max(0,int(player["attrs"]["Awareness"])-BASE_STAT)*.03+float(gear_runtime.get("ranged_acc",0.0));var dmg_mult=1.0;var time=int(player.weapon.get("rtime",player.weapon.time));var fatigue=float(player.weapon.fatigue);var knock=int(player.weapon.get("knock",0))+int(gear_runtime.get("force_bonus",0));var delay=0;var close=""
    if dist>=4:acc+=float(gear_runtime.get("long_ranged_acc",0.0));acc-=max(0,dist-3)*.03
    if dist==1:
        if abs(delta.x)==1 and abs(delta.y)==1:acc+=float(gear_runtime.get("quick_shot_penalty",-.20));dmg_mult*=.80;knock=0;close=" QUICK SHOT"
        else:acc-=.40;dmg_mult*=.65;time+=20;knock=0;close=" CROWDED"
    match feat:
        "Snap Shot":dmg_mult*=.75;acc-=.10;time-=20;knock=0
        "Power Shot":dmg_mult*=1.35;knock+=1;time+=35;fatigue+=3
        "Piercing Bolt":time+=10;fatigue+=1
        "Pinning Shot":dmg_mult*=.80;delay=50;time+=10;fatigue+=1
        "Precise Shot":dmg_mult*=.90;acc+=.20;time+=15
        "Driving Shot":dmg_mult*=.85;knock+=1;time+=20;fatigue+=2
    if kill_haste:time=int(round(float(time)*.90));kill_haste=false
    time=max(40,int(round(float(time)*float(gear_runtime.get("weapon_tick_mult",1.0))*float(gear_runtime.get("ranged_tick_mult",1.0))*_state_tick_mult())));acc=clamp(acc-attack_penalty(),.08,.96);player.ammo-=1;stats.shots+=1
    if rng.randf()<=acc:
        var d=max(1,int(round(float(rng.randi_range(int(player.weapon.rdmin),int(player.weapon.rdmax)))*dmg_mult)));zombies[i].hp-=d;msg="%s hits for %d%s%s."%[str(player.gun),d,close," - %s"%feat if feat!="" else ""]
        if delay>0:zombies[i].next+=delay
        if int(zombies[i].hp)<=0:kill_zombie(i,false)
        elif knock>0:_push_steps(i,dominant(delta),knock)
    else:msg="%s misses%s%s."%[str(player.gun),close," - %s"%feat if feat!="" else ""]
    emit_noise(player.pos,int(player.weapon.get("shot_noise",14)),"bowshot",true);_add_fatigue(fatigue,true,false,feat!="");_mark_strenuous(time);commit_action(time)

func _throw_attack(i:int,feat:String):
    if i<0 or i>=zombies.size() or zombies[i].dead or not visible_cells.has(zombies[i].pos):return
    if _range_dist(player.pos,zombies[i].pos)>2:msg="Throwing knives only reach 2 tiles.";queue_redraw();return
    var knives=2 if feat=="Double Toss" else 1
    if int(player.throwing_ammo)<knives:msg="Not enough throwing knives.";queue_redraw();return
    _clear_defense_on_offense();var base_name=str(player.offhand_name);var dmin=3 if base_name=="Throwing Knife Sheath" else 4;var dmax=5 if base_name=="Throwing Knife Sheath" else 6;var time=65 if base_name=="Throwing Knife Sheath" else 75;var fatigue=1.0;var dmg_mult=1.0;var acc=.60+max(0,int(player["attrs"]["Finesse"])-BASE_STAT)*.03-attack_penalty();var delay=0;var attacks=1
    if feat=="Quick Toss":dmg_mult*=.75;time-=20
    elif feat=="Low Toss":dmg_mult*=.70;delay=40
    elif feat=="Double Toss":attacks=2;dmg_mult*=.70;time=100;fatigue=2
    elif feat=="Silent Toss" and stealth_attack(zombies[i]):acc+=.20
    time=max(35,int(round(float(time)*_state_tick_mult())));player.throwing_ammo-=knives;stats.shots+=attacks;var total=0
    for n in range(attacks):
        if zombies[i].dead:break
        if rng.randf()<=clamp(acc,.10,.97):
            var d=max(1,int(round(float(rng.randi_range(dmin,dmax))*dmg_mult)));zombies[i].hp-=d;total+=d
            if int(zombies[i].hp)<=0:kill_zombie(i,stealth_attack(zombies[i]))
    if delay>0 and not zombies[i].dead:zombies[i].next+=delay
    msg="%s deals %d damage."%[feat,total] if total>0 else "%s misses."%feat;emit_noise(player.pos,1,"knife",true);_add_fatigue(fatigue,true,false,true);_mark_strenuous(time);commit_action(time)

func _arc_cells()->Array:
    var f:Vector2i=player.facing;var left=Vector2i(f.y,-f.x);var right=Vector2i(-f.y,f.x);return [player.pos+f+left,player.pos+f,player.pos+f+right]

func _guard_arc(feat:String):
    if float(player.get("fatigue",0.0))>=100:msg="Too fatigued for special attacks.";queue_redraw();return
    _clear_defense_on_offense();var factor=.70;var time=125;var fatigue=7.0;var push=0
    if feat=="Crowd Shove":factor=.50;time=140;fatigue=9;push=1
    elif feat=="Wide Arc":factor=.60;time=int(player.weapon.time)+30;fatigue=float(player.weapon.fatigue)+4
    var hits=0
    for p in _arc_cells():
        var zi=zombie_at(p)
        if zi!=-1 and rng.randf()<=_melee_accuracy():
            var d=max(1,int(round(float(rng.randi_range(int(player.weapon.dmin),int(player.weapon.dmax)))*_might_mult()*factor)));zombies[zi].hp-=d;hits+=1
            if int(zombies[zi].hp)<=0:kill_zombie(zi,false)
            elif push>0:_push_steps(zi,dominant(zombies[zi].pos-player.pos),push)
    msg="%s hits %d target%s."%[feat,hits,"s" if hits!=1 else ""];emit_noise(player.pos,int(player.weapon.noise),"melee",true);_add_fatigue(fatigue,true,false,true);time=int(round(float(time)*_state_tick_mult()));_mark_strenuous(time);commit_action(time)

func _shield_block():
    var name=str(player.offhand_name);var time=40;var fatigue=2.0;var mult=.65
    if name=="Kite Shield":time=50;fatigue=3;mult=.55
    elif name=="Tower Shield":time=60;fatigue=4;mult=.45
    defense_mult=mult;defense_hits=1;temp_knock_resist=0;msg="BLOCK ready.";_add_fatigue(fatigue,false,false,true);_mark_strenuous(time);commit_action(time)

func _shield_defense(feat:String):
    var time=50;var fatigue=1.0
    if feat=="Brace":defense_mult=.80;defense_hits=99;temp_knock_resist=2
    else:time=70;fatigue=2;defense_mult=.75;defense_hits=2;temp_knock_resist=99
    msg="%s ready."%feat;_add_fatigue(fatigue,false,false,true);_mark_strenuous(time);commit_action(time)

func _shield_bash(zi:int):
    _clear_defense_on_offense();var hit=rng.randf()<=_melee_accuracy()
    if hit:
        var d=rng.randi_range(2,4);zombies[zi].hp-=d;msg="Shield Bash hits for %d."%d
        if int(zombies[zi].hp)<=0:kill_zombie(zi,false)
        else:_push_steps(zi,player.facing,1)
    else:msg="Shield Bash misses."
    _add_fatigue(3,false,false,true);_mark_strenuous(60);commit_action(60)

func _use_target_feat(zi:int,feat:String):
    if feat in ["Throw Knife","Quick Toss","Low Toss","Double Toss","Silent Toss"]:_throw_attack(zi,feat)
    elif feat=="Shield Bash":_shield_bash(zi)
    elif feat in ["Snap Shot","Power Shot","Piercing Bolt","Pinning Shot","Precise Shot","Driving Shot"]:_ranged_attack(zi,feat)
    else:_single_melee_attack(zi,feat)

func _active_feats()->Array:
    var out=[]
    if equipped.has("Weapon"):
        for f in equipped["Weapon"]["specials"]:out.append({"name":str(f),"source":"Weapon"})
    if equipped.has("Offhand"):
        for f in equipped["Offhand"]["specials"]:out.append({"name":str(f),"source":"Offhand"})
    return out

func activate_feat(feat:String):
    if float(player.get("fatigue",0.0))>=100:msg="Too fatigued for special attacks.";queue_redraw();return
    if feat in ["Sweep","Crowd Shove","Wide Arc"]:_guard_arc(feat)
    elif feat=="Block":_shield_block()
    elif feat in ["Brace","Hold Ground"]:_shield_defense(feat)
    else:selected_feat=feat;msg="%s selected - tap a target."%feat;queue_redraw()

func click_target(cell:Vector2i):
    if not visible_cells.has(cell):msg="You cannot target what you cannot see.";queue_redraw();return
    var zi=zombie_at(cell)
    if zi!=-1:
        if selected_feat!="":
            var feat=selected_feat;selected_feat="";_use_target_feat(zi,feat)
        elif bool(player.weapon.get("ranged",false)):_ranged_attack(zi,"")
        elif manhattan(player.pos,cell)==1:player.facing=cell-player.pos;_single_melee_attack(zi,"")
        else:msg="That melee target is out of reach.";queue_redraw()
    elif barrels.has(cell) and bool(player.weapon.get("ranged",false)):shoot_barrel(cell)
