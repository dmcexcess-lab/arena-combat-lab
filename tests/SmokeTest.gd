extends SceneTree

var failures: Array[String] = []
const PlayerProfile = preload("res://scripts/player/PlayerProfile.gd")
const ArenaScenario = preload("res://scripts/arena/ArenaScenario.gd")
const CreatureCatalog = preload("res://scripts/catalogs/CreatureCatalog.gd")
const EXPECTED_FAMILIES := ["Stealth","Ranged","Guard","Ravager"]
const EXPECTED_RARITIES := ["Common","Uncommon","Rare","Enchanted"]
const DIR4 := [Vector2i(0,-1),Vector2i(1,0),Vector2i(0,1),Vector2i(-1,0)]

func _init(): call_deferred("_run")

func check(ok: bool, label: String):
    if not ok:
        failures.append(label)
        push_error("SMOKE FAIL: %s" % label)

func _run():
    var profile = PlayerProfile.normalize({"name":"Smoke Gladiator","appearance":{"test":"ok"}})
    check(str(profile["name"])=="Smoke Gladiator","player profile normalizes name")
    check(str(profile["appearance"].get("test",""))=="ok","player profile preserves appearance data")

    var scenario = ArenaScenario.normalize({"starter_index":1,"roster":{"Walker":8,"Ripper":3,"Brute":1}})
    check(int(scenario["starter_index"])==1,"scenario starter index")
    check(ArenaScenario.expanded_roster(scenario).size()==12,"scenario expands roster")
    check(CreatureCatalog.kinds()==["Walker","Ripper","Brute"],"creature catalog order")
    check(int(CreatureCatalog.definition("Brute").get("hp",0))==28,"creature catalog exposes live definitions")

    var packed = load("res://main.tscn")
    check(packed is PackedScene,"main.tscn loads")
    if not packed is PackedScene: quit(1); return
    var game = packed.instantiate()
    root.add_child(game)
    await process_frame

    check(game.starter_loadouts.size()==4,"four starter identities")
    for i in range(min(4,game.starter_loadouts.size())):
        var loadout: Dictionary = game.starter_loadouts[i]
        var family = str(loadout.get("family",""))
        check(family==EXPECTED_FAMILIES[i],"starter %d family"%i)
        var gear: Dictionary = loadout.get("gear",{})
        check(gear.has("Armor") and str(gear["Armor"].get("family",""))==family,"starter %s armor anchor"%family)
        for item in gear.values(): check(str(item.get("rarity",""))=="Common","starter %s is Common"%family)
    if game.starter_loadouts.size()>=4:
        check(str(game.starter_loadouts[1]["gear"]["Weapon"].get("base_name",""))=="Short Bow","Ranged starts Short Bow")
        check("Quick Shot" in game.starter_loadouts[1]["gear"]["Weapon"].get("specials",[]),"Short Bow has Quick Shot")
        check("Dual Strike" in game.starter_loadouts[3]["gear"]["Offhand"].get("specials",[]),"Ravager starter has Dual Strike")

    game.selected_starter=0
    game._start_dungeon()
    await process_frame
    check(not game.floor_cells.is_empty(),"arena has floor")
    check(game.loot_chests.size()==4,"arena has four chests")
    check(game.exit_cell!=game.objective,"exit differs from objective")
    check(_reachable(game,game.exit_cell,game.objective),"exit and objective connected")

    var counts={"Walker":0,"Ripper":0,"Brute":0}
    for z in game.zombies:
        var kind=str(z.get("kind","Walker"))
        if counts.has(kind): counts[kind]+=1
    check(counts["Walker"]==8,"default Walker count")
    check(counts["Ripper"]==3,"default Ripper count")
    check(counts["Brute"]==1,"default Brute count")

    var required=["name","base_name","rarity","family","slot","stats","armor","hp_bonus","noise","properties","specials","mods"]
    for n in range(100):
        var item: Dictionary = game.gear_core.roll_loot()
        check(str(item.get("rarity","")) in EXPECTED_RARITIES,"loot rarity enabled")
        for key in required: check(item.has(key),"loot key %s"%key)

    game.queue_free()
    if failures.is_empty():
        print("ARENA SMOKE OK")
        quit(0)
    else:
        print("ARENA SMOKE FAILED: %d checks"%failures.size())
        quit(1)

func _reachable(game, start: Vector2i, goal: Vector2i) -> bool:
    var open: Array = [start]
    var seen = {start:true}
    while not open.is_empty():
        var cur: Vector2i = open.pop_front()
        if cur==goal:return true
        for d in DIR4:
            var p=cur+d
            if seen.has(p) or not game.inside(p):continue
            if game.walls.has(p) or game.shelves.has(p) or game.barrels.has(p):continue
            seen[p]=true
            open.append(p)
    return false
