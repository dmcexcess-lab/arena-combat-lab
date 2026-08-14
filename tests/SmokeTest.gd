extends SceneTree

var failures: Array[String] = []
const PlayerProfile = preload("res://scripts/player/PlayerProfile.gd")
const ArenaScenario = preload("res://scripts/arena/ArenaScenario.gd")
const CreatureCatalog = preload("res://scripts/catalogs/CreatureCatalog.gd")
const DevGearFactory = preload("res://scripts/dev/DevGearFactory.gd")
const EXPECTED_FAMILIES := ["Stealth","Ranged","Guard","Ravager"]
const EXPECTED_RARITIES := ["Common","Uncommon","Rare","Enchanted"]
const DIR4 := [Vector2i(0,-1),Vector2i(1,0),Vector2i(0,1),Vector2i(-1,0)]

func _init(): call_deferred("_run")

func check(ok: bool, label: String):
    if not ok:
        failures.append(label)
        push_error("SMOKE FAIL: %s" % label)

func _run():
    var profile = PlayerProfile.normalize({"name":"Smoke Gladiator","appearance":{"body":99,"skin":-5,"hair_style":2,"hair_color":3,"test":"ok"}})
    check(str(profile["name"])=="Smoke Gladiator","player profile normalizes name")
    check(int(profile["appearance"].get("body",-1))==2,"player profile clamps body appearance")
    check(int(profile["appearance"].get("skin",-1))==0,"player profile clamps skin appearance")
    check(str(profile["appearance"].get("test",""))=="ok","player profile preserves open appearance data")
    check(PlayerProfile.appearance_label(profile["appearance"],"hair_style")=="Long","player profile appearance labels")
    var name_rng=RandomNumberGenerator.new();name_rng.seed=7
    var fantasy_name=PlayerProfile.random_fantasy_name(name_rng)
    check(fantasy_name in PlayerProfile.FANTASY_NAMES,"random creator name comes from fantasy pool")

    var roster = CreatureCatalog.default_roster()
    roster["Ghoul"] = 2
    var scenario = ArenaScenario.from_dev(1, roster)
    check(int(scenario["starter_index"])==1,"scenario starter index")
    check(ArenaScenario.expanded_roster(scenario).size()==14,"scenario expands generic roster")
    check(CreatureCatalog.kinds().size()>=9,"expanded creature catalog is live")
    check("Juggernaut" in CreatureCatalog.kinds(),"expanded creature catalog includes late-page monsters")
    check(int(CreatureCatalog.definition("Brute").get("hp",0))==28,"creature catalog preserves base definitions")
    check(int(CreatureCatalog.definition("Juggernaut").get("hp",0))==38,"creature catalog exposes expanded definitions")

    var packed = load("res://main.tscn")
    check(packed is PackedScene,"main.tscn loads")
    if not packed is PackedScene: quit(1); return
    var game = packed.instantiate()
    root.add_child(game)
    await process_frame

    check(game.starter_loadouts.size()==4,"four starter identities")
    check(game.has_method("open_dev_screen"),"developer screen public entry point is live")
    check(game.DEV_PAGES==["CHARACTER","GEAR","CREATURES","SUMMARY"],"developer screen page contract")
    check(game.name_editor is LineEdit,"creator uses real LineEdit for mobile keyboard")
    check(bool(game.name_editor.virtual_keyboard_enabled),"creator LineEdit enables virtual keyboard")
    check(bool(game.name_editor.virtual_keyboard_show_on_focus),"creator LineEdit shows keyboard on focus")
    check(not game._creator_preview_gear().has("Head"),"creator preview hides headgear so hair stays visible")
    check(game.has_method("_draw_player_paper_doll"),"paper doll renderer is live")
    var paper_axes = game._pd_axes(Vector2i(0,-1))
    var paper_forward: Vector2 = paper_axes[0]
    var paper_head: Vector2 = game._pd_head_center(Vector2.ZERO, 1.0, paper_forward)
    var paper_crown: Vector2 = game._pd_hair_crown(paper_head, 1.0, paper_forward)
    check(paper_head.dot(paper_forward)>0.0,"paper doll head sits forward of torso")
    check(paper_crown.dot(paper_forward)>paper_head.dot(paper_forward),"paper doll hair crown sits above face")

    for i in range(min(4,game.starter_loadouts.size())):
        var loadout: Dictionary = game.starter_loadouts[i]
        var family = str(loadout.get("family",""))
        check(family==EXPECTED_FAMILIES[i],"starter %d family"%i)
        var gear: Dictionary = loadout.get("gear",{})
        check(gear.has("Armor") and str(gear["Armor"].get("family",""))==family,"starter %s armor anchor"%family)
        for item in gear.values(): check(str(item.get("rarity",""))=="Common","starter %s is Common"%family)

    var factory_rng=RandomNumberGenerator.new();factory_rng.seed=99
    var factory=DevGearFactory.new(game.gear_core,factory_rng)
    for rarity in EXPECTED_RARITIES:
        for n in range(12):
            var exact:Dictionary=factory.random_item(rarity)
            check(str(exact.get("rarity",""))==rarity,"dev random gear exact rarity %s"%rarity)
    var custom_options:Dictionary=factory.parameter_options("Great Axe","Enchanted")
    check(int(custom_options["stat_budget"])==3,"custom gear exposes rarity stat budget")
    check(int(custom_options["property_budget"])==2,"custom gear exposes property budget")
    check(int(custom_options["feat_budget"])==2,"custom gear exposes feat budget")
    var custom:Dictionary=factory.make_custom("Great Axe","Enchanted",{"Might":2,"Vitality":1},["Forceful","Efficient"],["Overhead Smash","Relentless Strike"])
    check(str(custom["rarity"])=="Enchanted","custom gear keeps requested rarity")
    check(int(custom["stats"]["Might"])>=4,"custom gear applies explicit bonus stats on top of native stats")
    check("Forceful" in custom["properties"],"custom gear applies legal property")
    check("Overhead Smash" in custom["specials"],"custom gear applies legal extra feat")

    game.player_profile=PlayerProfile.normalize({"name":"Smoke Gladiator","appearance":{"body":2,"skin":3,"hair_style":4,"hair_color":1}})
    game.name_editor.text="Smoke Gladiator"
    game.selected_starter=0
    game.creature_spawn_counts=CreatureCatalog.default_roster()
    game.creature_spawn_counts["Ghoul"]=2
    game.dev_spawn_items=[factory.random_item("Rare")]
    game._start_dungeon()
    await process_frame
    check(str(game.player.get("name",""))=="Smoke Gladiator","profile name reaches live player")
    check(int(game.player.get("appearance",{}).get("body",-1))==2,"profile appearance reaches live player")
    check(game.inventory.size()>=1 and str(game.inventory[0].get("rarity",""))=="Rare","dev-spawn gear reaches starting inventory")
    check(not game.floor_cells.is_empty(),"arena has floor")
    check(game.loot_chests.size()==4,"arena has four chests")
    check(game.exit_cell!=game.objective,"exit differs from objective")
    check(_reachable(game,game.exit_cell,game.objective),"exit and objective connected")

    var counts={}
    for kind in CreatureCatalog.kinds(): counts[kind]=0
    for z in game.zombies:
        var kind=str(z.get("kind","Walker"))
        if counts.has(kind): counts[kind]+=1
    check(counts["Walker"]==8,"default Walker count")
    check(counts["Ripper"]==3,"default Ripper count")
    check(counts["Brute"]==1,"default Brute count")
    check(counts["Ghoul"]==2,"generic roster spawns added creature types")

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
