extends "res://scripts/MainAlphaGear.gd"

const GearCoreV2 = preload("res://scripts/AlphaGearCoreV2.gd")

func _ready():
    super._ready()
    gear_core = GearCoreV2.new(rng)
    _roll_starting_loadouts()

func _allowed_families_for_slot(armor_family:String, slot:String)->Array:
    if armor_family == "Ravager" and slot == "Offhand": return ["Ravager"]
    return super._allowed_families_for_slot(armor_family, slot)

func _rebuild_player_from_gear(heal_full:bool=false):
    super._rebuild_player_from_gear(heal_full)
    player["offhand_weapon"] = {}
    if equipped.has("Offhand"):
        var item:Dictionary = equipped["Offhand"]
        var name = str(item.get("base_name", ""))
        if str(item.get("family", "")) in ["Stealth", "Ravager"] and name in ["Stiletto", "Dirk", "Great Axe", "Execution Sword", "Maul"]:
            player["offhand_weapon"] = gear_core.weapon_data(name)

func feat_cd_total(feat:String)->int:
    if feat == "Quick Shot": return 120
    if feat == "Dual Strike": return 240
    return super.feat_cd_total(feat)

func _is_diagonal_close_target(zi:int)->bool:
    if zi < 0 or zi >= zombies.size() or zombies[zi].dead: return false
    var d:Vector2i = zombies[zi].pos - player.pos
    return max(abs(d.x),abs(d.y)) == 1 and abs(d.x) == 1 and abs(d.y) == 1

func _use_target_feat(zi:int, feat:String):
    if bool(player.weapon.get("ranged",false)) and _is_diagonal_close_target(zi):
        if feat != "Quick Shot":
            msg = "Too close for that shot. Only Short Bow Quick Shot works diagonally adjacent."
            queue_redraw()
            return
    if feat == "Quick Shot":
        if feat_cd_left(feat) > 0:
            msg = "%s ready in %d ticks." % [feat, feat_cd_left(feat)]
            queue_redraw()
            return
        var started = tick
        _quick_shot(zi)
        if tick > started: _begin_cd(feat, started)
        return
    super._use_target_feat(zi, feat)

func _quick_shot(zi:int):
    if not _is_diagonal_close_target(zi) or str(player.weapon.get("name","")) != "Short Bow":
        msg = "Quick Shot needs a diagonally adjacent target and a Short Bow."
        queue_redraw()
        return
    if int(player.ammo) <= 0:
        msg = "No ammunition."
        queue_redraw()
        return
    var delta:Vector2i = zombies[zi].pos - player.pos
    player.facing = dominant(delta)
    var acc = .55 + max(0,int(player["attrs"]["Awareness"])-BASE_STAT)*.03 + float(gear_runtime.get("ranged_acc",0.0))
    acc += float(gear_runtime.get("quick_shot_penalty",-.20)) - attack_penalty()
    var time = max(40,int(round(float(player.weapon.rtime)*float(gear_runtime.get("weapon_tick_mult",1.0))*float(gear_runtime.get("ranged_tick_mult",1.0))*_state_tick_mult())))
    player.ammo -= 1
    stats.shots += 1
    if rng.randf() <= clamp(acc,.08,.96):
        var d = max(1,int(round(float(rng.randi_range(int(player.weapon.rdmin),int(player.weapon.rdmax)))*.80)))
        zombies[zi].hp -= d
        msg = "Quick Shot hits for %d." % d
        if int(zombies[zi].hp) <= 0: kill_zombie(zi,false)
    else:
        msg = "Quick Shot misses."
    emit_noise(player.pos,int(player.weapon.get("shot_noise",11)),"bowshot",true)
    _add_fatigue(float(player.weapon.fatigue),true,false,true)
    _mark_strenuous(time)
    commit_action(time)

func click_target(cell:Vector2i):
    var zi = zombie_at(cell)
    if zi != -1 and bool(player.weapon.get("ranged",false)) and selected_feat == "" and _is_diagonal_close_target(zi):
        msg = "Diagonal close fire requires Short Bow Quick Shot."
        queue_redraw()
        return
    super.click_target(cell)
