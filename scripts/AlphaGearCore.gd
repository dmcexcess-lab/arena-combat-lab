extends RefCounted

# Complete non-magical alpha gear generator. Epic is intentionally absent.

const ATTRS := ["Might", "Finesse", "Awareness", "Vitality", "Will"]
const FAMILIES := ["Stealth", "Ranged", "Guard", "Ravager"]
const SLOTS := ["Weapon", "Offhand", "Head", "Gloves", "Cloak", "Armor", "Belt", "Boots", "Ring", "Amulet"]

const CATALOG := {
    "Stealth": {
        "Weapon": ["Stiletto", "Dirk", "Long Knife"],
        "Offhand": ["Throwing Knife Sheath", "Balanced Knife Roll"],
        "Head": ["Shadow Hood"], "Gloves": ["Silent Wraps"], "Cloak": ["Dusk Cloak"],
        "Armor": ["Silent Leathers", "Padded Jerkin", "Nightweave Coat"],
        "Belt": ["Knife Sash"], "Boots": ["Softstep Boots"],
        "Ring": ["Whisper Ring", "Veiled Band"], "Amulet": ["Fox Charm", "Shadow Pendant"]
    },
    "Ranged": {
        "Weapon": ["Short Bow", "Hunting Bow", "Light Crossbow"],
        "Head": ["Scout Hood"], "Gloves": ["Draw Gloves"], "Cloak": ["Trail Cloak"],
        "Armor": ["Scout Leathers", "Ranger Coat", "Hide Vest"],
        "Belt": ["Quiver Belt"], "Boots": ["Trail Boots"],
        "Ring": ["Hawkeye Band", "Tracker Ring"], "Amulet": ["Falcon Charm", "Farshot Pendant"]
    },
    "Guard": {
        "Weapon": ["Iron Mace", "Short Sword", "War Hammer"],
        "Offhand": ["Buckler", "Kite Shield", "Tower Shield"],
        "Head": ["Greathelm"], "Gloves": ["Steel Gauntlets"], "Cloak": ["Guard Mantle"],
        "Armor": ["Plate Harness", "Heavy Brigandine", "Scale Harness"],
        "Belt": ["Reinforced Girdle"], "Boots": ["Sabatons"],
        "Ring": ["Bulwark Signet", "Iron Band"], "Amulet": ["Tower Medallion", "Stone Torc"]
    },
    "Ravager": {
        "Weapon": ["Great Axe", "Execution Sword", "Maul"],
        "Head": ["Open War Helm"], "Gloves": ["Breaker Gloves"], "Cloak": ["Wolf Cloak"],
        "Armor": ["War Harness", "Open Mail", "Raider Plate"],
        "Belt": ["Trophy Belt"], "Boots": ["Raider Boots"],
        "Ring": ["Fury Band", "Conqueror Ring"], "Amulet": ["Fang Torc", "Rage Medallion"]
    }
}

const STARTERS := {
    "Stealth": {"Weapon":"Stiletto", "Offhand":"Throwing Knife Sheath", "Head":"Shadow Hood", "Gloves":"Silent Wraps", "Cloak":"Dusk Cloak", "Armor":"Silent Leathers", "Belt":"Knife Sash", "Boots":"Softstep Boots", "Ring 1":"Whisper Ring", "Ring 2":"Veiled Band", "Amulet":"Fox Charm"},
    "Ranged": {"Weapon":"Short Bow", "Head":"Scout Hood", "Gloves":"Draw Gloves", "Cloak":"Trail Cloak", "Armor":"Scout Leathers", "Belt":"Quiver Belt", "Boots":"Trail Boots", "Ring 1":"Hawkeye Band", "Ring 2":"Tracker Ring", "Amulet":"Falcon Charm"},
    "Guard": {"Weapon":"Iron Mace", "Offhand":"Buckler", "Head":"Greathelm", "Gloves":"Steel Gauntlets", "Cloak":"Guard Mantle", "Armor":"Plate Harness", "Belt":"Reinforced Girdle", "Boots":"Sabatons", "Ring 1":"Bulwark Signet", "Ring 2":"Iron Band", "Amulet":"Tower Medallion"},
    "Ravager": {"Weapon":"Great Axe", "Head":"Open War Helm", "Gloves":"Breaker Gloves", "Cloak":"Wolf Cloak", "Armor":"War Harness", "Belt":"Trophy Belt", "Boots":"Raider Boots", "Ring 1":"Fury Band", "Ring 2":"Conqueror Ring", "Amulet":"Fang Torc"}
}

const NATIVE_FEAT := {
    "Stiletto":"Backstab", "Dirk":"Quick Cut", "Long Knife":"Hamstring",
    "Throwing Knife Sheath":"Throw Knife", "Balanced Knife Roll":"Throw Knife",
    "Short Bow":"Snap Shot", "Hunting Bow":"Power Shot", "Light Crossbow":"Piercing Bolt",
    "Iron Mace":"Sweep", "Short Sword":"Cleave", "War Hammer":"Crowd Shove",
    "Buckler":"Block", "Kite Shield":"Block", "Tower Shield":"Block",
    "Great Axe":"Execution", "Execution Sword":"Focused Strike", "Maul":"Crushing Blow"
}

const FEAT_POOLS := {
    "Stealth": ["Backstab", "Quick Cut", "Hamstring", "Feint", "Deep Cut", "Disengaging Cut"],
    "Throwing": ["Throw Knife", "Quick Toss", "Low Toss", "Double Toss", "Silent Toss"],
    "Ranged": ["Snap Shot", "Power Shot", "Piercing Bolt", "Pinning Shot", "Precise Shot", "Driving Shot"],
    "Guard": ["Sweep", "Cleave", "Crowd Shove", "Driving Blow", "Guarded Strike", "Wide Arc"],
    "Shield": ["Block", "Shield Bash", "Brace", "Hold Ground"],
    "Ravager": ["Execution", "Focused Strike", "Crushing Blow", "Opening Blow", "Relentless Strike", "Overhead Smash"]
}

var rng: RandomNumberGenerator
var serial := 0

func _init(randomizer: RandomNumberGenerator):
    rng = randomizer

func zero_stats() -> Dictionary:
    return {"Might":0, "Finesse":0, "Awareness":0, "Vitality":0, "Will":0}

func blank_mods() -> Dictionary:
    return {
        "move_mult":1.0, "crouch_mult":1.0, "fear_mult":1.0, "crowd_fear_mult":1.0,
        "fatigue_mult":1.0, "weapon_fatigue_mult":1.0, "heavy_fatigue_mult":1.0,
        "weapon_tick_mult":1.0, "heavy_tick_mult":1.0, "ranged_tick_mult":1.0,
        "melee_acc":0.0, "ranged_acc":0.0, "long_ranged_acc":0.0,
        "rear_damage":1.0, "low_hp_damage":1.0, "isolated_damage":1.0,
        "ammo_bonus":0, "throw_bonus":0, "knock_resist":0, "force_bonus":0,
        "special_fatigue_reduction":0, "sound_fuzz_reduction":0,
        "quick_shot_penalty":-0.20, "range_bonus":0, "kill_fear":0, "kill_fatigue":0,
        "kill_attack_haste":false, "kill_move_haste":false, "spot_fear_mult":1.0
    }

func identity_for(base_name: String) -> Dictionary:
    for family in CATALOG.keys():
        var family_slots: Dictionary = CATALOG[family]
        for slot in family_slots.keys():
            if base_name in family_slots[slot]: return {"family":str(family), "slot":str(slot)}
    return {"family":"Stealth", "slot":"Weapon"}

func _shell(base_name: String, family: String, slot: String, rarity: String) -> Dictionary:
    serial += 1
    return {"id":serial, "base_name":base_name, "name":"%s %s"%[rarity,base_name], "rarity":rarity,
        "family":family, "slot":slot, "stats":zero_stats(), "armor":0, "hp_bonus":0, "noise":0,
        "properties":[], "specials":[], "mods":blank_mods()}

func make_named(base_name: String, rarity: String = "Common", randomize_quality: bool = false) -> Dictionary:
    var ident = identity_for(base_name)
    var item = _shell(base_name, str(ident["family"]), str(ident["slot"]), rarity)
    _apply_native(item)
    if NATIVE_FEAT.has(base_name): item["specials"].append(str(NATIVE_FEAT[base_name]))
    if randomize_quality:
        for n in range(stat_points_for(rarity)): _roll_bonus_stat(item)
        for n in range(property_count_for(rarity)): _roll_property(item)
        for n in range(extra_feats_for(rarity)): _roll_extra_feat(item)
    _refresh_name(item)
    return item

func make_starter(family: String) -> Dictionary:
    var result = {}
    var defs: Dictionary = STARTERS[family]
    for slot in defs.keys(): result[str(slot)] = make_named(str(defs[slot]), "Common", false)
    return result

func roll_loot() -> Dictionary:
    var family = str(FAMILIES[rng.randi_range(0,FAMILIES.size()-1)])
    var family_slots: Dictionary = CATALOG[family]
    var valid = family_slots.keys()
    var slot = str(valid[rng.randi_range(0,valid.size()-1)])
    var names: Array = family_slots[slot]
    return make_named(str(names[rng.randi_range(0,names.size()-1)]), roll_rarity(), true)

func roll_rarity() -> String:
    var r = rng.randf()
    if r < .07: return "Enchanted"
    if r < .25: return "Rare"
    if r < .55: return "Uncommon"
    return "Common"

func stat_points_for(rarity: String) -> int:
    if rarity == "Enchanted": return 3
    if rarity == "Rare": return 2
    if rarity == "Uncommon": return 1
    return 0

func property_count_for(rarity: String) -> int:
    if rarity == "Enchanted": return 2
    if rarity in ["Rare","Uncommon"]: return 1
    return 0

func extra_feats_for(rarity: String) -> int:
    if rarity == "Enchanted": return 2
    if rarity == "Rare": return 1
    return 0

func weapon_data(base_name: String) -> Dictionary:
    match base_name:
        "Stiletto": return {"name":base_name,"dmin":4,"dmax":6,"time":70,"fatigue":2,"noise":1,"push":0,"ranged":false,"heavy":false}
        "Dirk": return {"name":base_name,"dmin":5,"dmax":7,"time":80,"fatigue":2,"noise":2,"push":0,"ranged":false,"heavy":false}
        "Long Knife": return {"name":base_name,"dmin":5,"dmax":8,"time":90,"fatigue":3,"noise":2,"push":0,"ranged":false,"heavy":false}
        "Short Bow": return {"name":base_name,"dmin":2,"dmax":3,"time":90,"fatigue":3,"noise":3,"push":0,"ranged":true,"rdmin":6,"rdmax":9,"rtime":90,"range":5,"shot_noise":12,"knock":1,"heavy":false}
        "Hunting Bow": return {"name":base_name,"dmin":2,"dmax":3,"time":105,"fatigue":4,"noise":3,"push":0,"ranged":true,"rdmin":7,"rdmax":10,"rtime":105,"range":7,"shot_noise":14,"knock":1,"heavy":false}
        "Light Crossbow": return {"name":base_name,"dmin":2,"dmax":3,"time":120,"fatigue":3,"noise":4,"push":0,"ranged":true,"rdmin":8,"rdmax":11,"rtime":120,"range":6,"shot_noise":18,"knock":1,"heavy":false}
        "Iron Mace": return {"name":base_name,"dmin":3,"dmax":5,"time":105,"fatigue":4,"noise":7,"push":1,"ranged":false,"heavy":false}
        "Short Sword": return {"name":base_name,"dmin":4,"dmax":5,"time":90,"fatigue":3,"noise":5,"push":0,"ranged":false,"heavy":false}
        "War Hammer": return {"name":base_name,"dmin":4,"dmax":6,"time":120,"fatigue":6,"noise":9,"push":1,"ranged":false,"heavy":false}
        "Great Axe": return {"name":base_name,"dmin":8,"dmax":12,"time":125,"fatigue":8,"noise":12,"push":1,"ranged":false,"heavy":true}
        "Execution Sword": return {"name":base_name,"dmin":7,"dmax":11,"time":110,"fatigue":7,"noise":10,"push":1,"ranged":false,"heavy":true}
        "Maul": return {"name":base_name,"dmin":9,"dmax":13,"time":145,"fatigue":10,"noise":14,"push":1,"ranged":false,"heavy":true}
    return {"name":"Fists","dmin":2,"dmax":3,"time":100,"fatigue":2,"noise":4,"push":0,"ranged":false,"heavy":false}

func _apply_native(item: Dictionary):
    var family = str(item["family"]); var slot = str(item["slot"]); var name = str(item["base_name"])
    var s: Dictionary = item["stats"]; var m: Dictionary = item["mods"]
    if family == "Stealth":
        if slot == "Armor": s["Finesse"]+=2; s["Awareness"]+=2
        elif slot == "Head" or slot == "Cloak": s["Awareness"]+=1
        elif slot in ["Gloves","Belt","Boots","Weapon","Offhand"]: s["Finesse"]+=1
    elif family == "Ranged":
        if slot == "Armor": s["Awareness"]+=2; s["Finesse"]+=1
        elif slot in ["Head","Cloak","Belt","Weapon"]: s["Awareness"]+=1
        elif slot in ["Gloves","Boots"]: s["Finesse"]+=1
    elif family == "Guard":
        if slot == "Armor": s["Vitality"]+=2; s["Will"]+=2
        elif slot in ["Gloves","Belt","Boots","Weapon"]: s["Vitality"]+=1
        elif slot in ["Head","Cloak","Offhand"]: s["Will"]+=1
    else:
        if slot == "Armor": s["Might"]+=2; s["Vitality"]+=1
        elif slot in ["Head","Gloves","Belt"]: s["Might"]+=1
        elif slot in ["Cloak","Boots"]: s["Finesse"]+=1
        elif slot == "Weapon": s["Might"]+=2
    match name:
        "Silent Leathers": item["armor"]=1; item["noise"]-=1; m["move_mult"]*=.95
        "Padded Jerkin": item["armor"]=2; item["hp_bonus"]+=2; m["fatigue_mult"]*=.95
        "Nightweave Coat": item["armor"]=1; item["noise"]-=2; m["crouch_mult"]*=.90
        "Shadow Hood": m["spot_fear_mult"]*=.75
        "Silent Wraps": m["weapon_tick_mult"]*=.95
        "Dusk Cloak": item["noise"]-=1
        "Knife Sash": m["throw_bonus"]+=2
        "Softstep Boots": item["noise"]-=1; m["move_mult"]*=.95
        "Whisper Ring": s["Finesse"]+=1; item["noise"]-=1
        "Veiled Band": s["Awareness"]+=1; m["rear_damage"]*=1.10
        "Fox Charm": s["Awareness"]+=1; m["fear_mult"]*=.92
        "Shadow Pendant": s["Finesse"]+=1; m["crouch_mult"]*=.92
        "Scout Leathers": item["armor"]=2; m["move_mult"]*=.95; m["weapon_fatigue_mult"]*=.90
        "Ranger Coat": item["armor"]=3; m["ammo_bonus"]+=2
        "Hide Vest": item["armor"]=2; item["hp_bonus"]+=3; m["fear_mult"]*=.95
        "Scout Hood": m["long_ranged_acc"]+=.03
        "Draw Gloves": m["ranged_tick_mult"]*=.95
        "Trail Cloak": item["noise"]-=1
        "Quiver Belt": m["ammo_bonus"]+=4
        "Trail Boots": m["move_mult"]*=.95
        "Hawkeye Band": s["Awareness"]+=1; m["long_ranged_acc"]+=.04
        "Tracker Ring": s["Awareness"]+=1; m["sound_fuzz_reduction"]+=1
        "Falcon Charm": s["Finesse"]+=1; m["quick_shot_penalty"]=-.10
        "Farshot Pendant": s["Awareness"]+=1; m["range_bonus"]+=1
        "Plate Harness": item["armor"]=5; item["noise"]+=2; m["move_mult"]*=1.10; m["fatigue_mult"]*=1.20
        "Heavy Brigandine": item["armor"]=4; item["hp_bonus"]+=3; item["noise"]+=1; m["move_mult"]*=1.05; m["fatigue_mult"]*=1.10
        "Scale Harness": item["armor"]=4; item["noise"]+=2; m["move_mult"]*=1.05; m["fear_mult"]*=.95; m["knock_resist"]+=1
        "Greathelm": item["armor"]=2; s["Awareness"]-=1; m["fear_mult"]*=.92
        "Steel Gauntlets": item["armor"]=1; m["special_fatigue_reduction"]+=1
        "Guard Mantle": m["crowd_fear_mult"]*=.90
        "Reinforced Girdle": item["hp_bonus"]+=3
        "Sabatons": item["armor"]=2; m["knock_resist"]+=1; m["move_mult"]*=1.03
        "Buckler": item["armor"]=1
        "Kite Shield": item["armor"]=2
        "Tower Shield": item["armor"]=3; m["move_mult"]*=1.05
        "Bulwark Signet": s["Vitality"]+=1; item["armor"]+=1
        "Iron Band": s["Will"]+=1; m["fear_mult"]*=.95
        "Tower Medallion": s["Will"]+=1; m["knock_resist"]+=1
        "Stone Torc": s["Vitality"]+=1; item["hp_bonus"]+=3
        "War Harness": item["armor"]=2; item["noise"]+=1; m["heavy_tick_mult"]*=.95
        "Open Mail": item["armor"]=2; item["noise"]+=1; m["move_mult"]*=.97
        "Raider Plate": item["armor"]=3; item["hp_bonus"]+=3; item["noise"]+=2; m["move_mult"]*=1.05; m["heavy_fatigue_mult"]*=.95
        "Open War Helm": item["armor"]=1; m["kill_fear"]+=2
        "Breaker Gloves": m["heavy_fatigue_mult"]*=.90
        "Wolf Cloak": m["kill_move_haste"]=true
        "Trophy Belt": m["kill_fatigue"]+=2
        "Fury Band": s["Might"]+=1; m["isolated_damage"]*=1.10
        "Conqueror Ring": s["Might"]+=1; m["kill_attack_haste"]=true
        "Fang Torc": s["Finesse"]+=1; m["low_hp_damage"]*=1.10
        "Rage Medallion": s["Might"]+=1; m["weapon_fatigue_mult"]*=.90

func _roll_family_stat(family: String) -> String:
    var r = rng.randf()
    if family == "Stealth":
        if r<.50:return "Finesse"
        if r<.85:return "Awareness"
        if r<.90:return "Might"
        if r<.95:return "Vitality"
        return "Will"
    if family == "Ranged":
        if r<.50:return "Awareness"
        if r<.85:return "Finesse"
        if r<.90:return "Might"
        if r<.95:return "Vitality"
        return "Will"
    if family == "Guard":
        if r<.50:return "Vitality"
        if r<.85:return "Will"
        if r<.90:return "Might"
        if r<.95:return "Finesse"
        return "Awareness"
    if r<.55:return "Might"
    if r<.80:return "Finesse"
    if r<.95:return "Vitality"
    if r<.98:return "Will"
    return "Awareness"

func _native_floor(base_name: String, stat: String) -> int:
    var ident=identity_for(base_name); var temp=_shell(base_name,str(ident["family"]),str(ident["slot"]),"Common"); _apply_native(temp)
    return int(temp["stats"][stat])

func _roll_bonus_stat(item: Dictionary):
    var accessory = str(item["slot"]) in ["Ring","Amulet"]
    for tries in range(20):
        var stat = str(ATTRS[rng.randi_range(0,ATTRS.size()-1)]) if accessory and rng.randf()<.50 else _roll_family_stat(str(item["family"]))
        if int(item["stats"][stat])-_native_floor(str(item["base_name"]),stat)<2:
            item["stats"][stat]+=1; return
    item["stats"][_roll_family_stat(str(item["family"]))]+=1

func _legal_properties(item: Dictionary) -> Array:
    var legal=[]; var slot=str(item["slot"]); var family=str(item["family"])
    if slot in ["Armor","Head","Gloves","Boots"] or (slot=="Offhand" and family=="Guard"):legal.append("Reinforced")
    if slot in ["Armor","Belt","Ring","Amulet"]:legal.append("Stout")
    if slot in ["Armor","Cloak","Boots"]:legal.append("Lightened")
    if slot in ["Weapon","Gloves","Ring","Amulet"]:legal.append("Quickened")
    if slot in ["Armor","Belt","Boots","Amulet"]:legal.append("Enduring")
    if slot in ["Head","Cloak","Ring","Amulet"]:legal.append("Steady")
    if family in ["Stealth","Ranged"] and slot in ["Armor","Cloak","Boots"]:legal.append("Silent")
    if family!="Ranged" and slot in ["Weapon","Gloves","Ring"]:legal.append("Sure-Gripped")
    if family=="Ranged" and slot in ["Weapon","Gloves","Ring","Amulet"]:legal.append("True-Aimed")
    if (family=="Stealth" and slot in ["Belt","Offhand"]) or (family=="Ranged" and slot=="Belt"):legal.append("Deep-Pocketed")
    if family in ["Guard","Ravager"] and (slot in ["Armor","Boots"] or (family=="Guard" and slot=="Offhand")):legal.append("Braced")
    if slot=="Weapon" and family in ["Ranged","Guard","Ravager"]:legal.append("Forceful")
    if slot in ["Weapon","Offhand"]:legal.append("Efficient")
    return legal

func _roll_property(item: Dictionary):
    var legal=_legal_properties(item)
    for p in item["properties"]:legal.erase(p)
    if legal.is_empty():return
    var prop=str(legal[rng.randi_range(0,legal.size()-1)]);item["properties"].append(prop);_apply_property(item,prop)

func _apply_property(item: Dictionary, prop: String):
    var m:Dictionary=item["mods"]
    match prop:
        "Reinforced":item["armor"]+=1
        "Stout":item["hp_bonus"]+=3
        "Lightened":m["move_mult"]*=.95
        "Quickened":m["weapon_tick_mult"]*=.95
        "Enduring":m["fatigue_mult"]*=.90
        "Steady":m["fear_mult"]*=.92
        "Silent":item["noise"]-=1
        "Sure-Gripped":m["melee_acc"]+=.04
        "True-Aimed":m["ranged_acc"]+=.04
        "Deep-Pocketed":
            if str(item["family"])=="Ranged":m["ammo_bonus"]+=2
            else:m["throw_bonus"]+=2
        "Braced":m["knock_resist"]+=1
        "Forceful":m["force_bonus"]+=1
        "Efficient":m["special_fatigue_reduction"]+=1

func _feat_pool(item: Dictionary) -> Array:
    var slot=str(item["slot"]);var family=str(item["family"])
    if slot=="Offhand":return FEAT_POOLS["Shield"].duplicate() if family=="Guard" else FEAT_POOLS["Throwing"].duplicate()
    if slot=="Weapon":return FEAT_POOLS[family].duplicate()
    return []

func _roll_extra_feat(item: Dictionary):
    var pool=_feat_pool(item)
    for f in item["specials"]:pool.erase(f)
    if not pool.is_empty():item["specials"].append(str(pool[rng.randi_range(0,pool.size()-1)]))

func _refresh_name(item: Dictionary):
    var prefix=str(item["rarity"])
    if not item["properties"].is_empty():prefix+=" "+" ".join(item["properties"])
    item["name"]="%s %s"%[prefix,str(item["base_name"])]
