extends "res://scripts/MainAlphaWeapons.gd"

func _use_target_feat(zi:int, feat:String):
    if feat == "Dual Strike":
        if feat_cd_left(feat) > 0:
            msg = "%s ready in %d ticks." % [feat, feat_cd_left(feat)]
            queue_redraw()
            return
        var started = tick
        _dual_strike(zi)
        if tick > started: _begin_cd(feat, started)
        return
    super._use_target_feat(zi, feat)

func _dual_strike(zi:int):
    if zi < 0 or zi >= zombies.size() or zombies[zi].dead: return
    if manhattan(player.pos, zombies[zi].pos) != 1:
        msg = "Dual Strike requires an adjacent target."
        queue_redraw()
        return
    var off:Dictionary = player.get("offhand_weapon", {})
    if off.is_empty() or bool(player.weapon.get("ranged", false)):
        msg = "Dual Strike requires two melee weapons."
        queue_redraw()
        return
    if float(player.get("fatigue", 0.0)) >= 100.0:
        msg = "Too fatigued for Dual Strike."
        queue_redraw()
        return

    _clear_defense_on_offense()
    player.facing = zombies[zi].pos - player.pos
    var stealth = stealth_attack(zombies[zi])
    var mult = _might_mult()
    if stealth: mult *= 1.10 * float(gear_runtime.get("rear_damage", 1.0))
    var total = 0
    var hit_any = false

    if rng.randf() <= _melee_accuracy(.10 if stealth else 0.0):
        var d1 = max(1, int(round(float(rng.randi_range(int(player.weapon.dmin), int(player.weapon.dmax))) * mult)))
        zombies[zi].hp -= d1
        total += d1
        hit_any = true

    if int(zombies[zi].hp) > 0 and rng.randf() <= _melee_accuracy(.05 if stealth else -0.03):
        var d2 = max(1, int(round(float(rng.randi_range(int(off.dmin), int(off.dmax))) * mult * .60)))
        zombies[zi].hp -= d2
        total += d2
        hit_any = true

    if int(zombies[zi].hp) <= 0: kill_zombie(zi, stealth)

    var heavy = bool(player.weapon.get("heavy", false)) or bool(off.get("heavy", false))
    var tick_mult = float(gear_runtime.get("weapon_tick_mult",1.0)) * (float(gear_runtime.get("heavy_tick_mult",1.0)) if heavy else 1.0)
    tick_mult *= max(.80, 1.0 - max(0, int(player["attrs"]["Finesse"]) - BASE_STAT) * .02) * _state_tick_mult()
    var cost = int(round((float(player.weapon.time) + float(off.time) * .60) * tick_mult))
    var fatigue = float(player.weapon.fatigue) + float(off.fatigue) * .60
    msg = "Dual Strike deals %d damage." % total if hit_any else "Dual Strike misses twice."
    emit_noise(player.pos, max(int(player.weapon.noise), int(off.noise)) + 2, "dual strike", true)
    _add_fatigue(fatigue, true, heavy, true)
    _mark_strenuous(cost)
    commit_action(max(60, cost))
