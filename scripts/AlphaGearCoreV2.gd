extends "res://scripts/AlphaGearCore.gd"

# Alpha gear revision: Short Bow owns Quick Shot, Long Bow owns reach/power,
# Stealth may offhand small blades, and Ravager may offhand full weapons.

const V2_CATALOG := {
    "Stealth": {
        "Weapon": ["Stiletto", "Dirk", "Long Knife"],
        "Offhand": ["Throwing Knife Sheath", "Balanced Knife Roll", "Stiletto", "Dirk"],
        "Head": ["Shadow Hood"], "Gloves": ["Silent Wraps"], "Cloak": ["Dusk Cloak"],
        "Armor": ["Silent Leathers", "Padded Jerkin", "Nightweave Coat"],
        "Belt": ["Knife Sash"], "Boots": ["Softstep Boots"],
        "Ring": ["Whisper Ring", "Veiled Band"], "Amulet": ["Fox Charm", "Shadow Pendant"]
    },
    "Ranged": {
        "Weapon": ["Short Bow", "Long Bow", "Light Crossbow"],
        "Head": ["Scout Hood"], "Gloves": ["Draw Gloves"], "Cloak": ["Trail Cloak"],
        "Armor": ["Scout Leathers", "Ranger Coat", "Hide Vest"],
        "Belt": ["Quiver Belt"], "Boots": ["Trail Boots"],
        "Ring": ["Hawkeye Band", "Tracker Ring"], "Amulet": ["Falcon Charm", "Farshot Pendant"]
    },
    "Guard": CATALOG["Guard"],
    "Ravager": {
        "Weapon": ["Great Axe", "Execution Sword", "Maul"],
        "Offhand": ["Great Axe", "Execution Sword", "Maul"],
        "Head": ["Open War Helm"], "Gloves": ["Breaker Gloves"], "Cloak": ["Wolf Cloak"],
        "Armor": ["War Harness", "Open Mail", "Raider Plate"],
        "Belt": ["Trophy Belt"], "Boots": ["Raider Boots"],
        "Ring": ["Fury Band", "Conqueror Ring"], "Amulet": ["Fang Torc", "Rage Medallion"]
    }
}

func _is_dual_weapon(item: Dictionary) -> bool:
    if str(item.get("slot", "")) != "Offhand": return false
    var name = str(item.get("base_name", ""))
    return name in ["Stiletto", "Dirk", "Great Axe", "Execution Sword", "Maul"]

func make_for_slot(base_name: String, family: String, slot: String, rarity: String = "Common", randomize_quality: bool = false) -> Dictionary:
    var item = _shell(base_name, family, slot, rarity)
    _apply_native(item)
    if family == "Ravager" and slot == "Offhand": item["stats"]["Might"] += 2
    item["native_stats"] = item["stats"].duplicate(true)
    if _is_dual_weapon(item): item["specials"].append("Dual Strike")
    elif base_name == "Short Bow": item["specials"].append("Quick Shot")
    elif base_name == "Long Bow": item["specials"].append("Power Shot")
    elif NATIVE_FEAT.has(base_name): item["specials"].append(str(NATIVE_FEAT[base_name]))
    if randomize_quality:
        for n in range(stat_points_for(rarity)): _roll_v2_bonus_stat(item)
        for n in range(property_count_for(rarity)): _roll_property(item)
        for n in range(extra_feats_for(rarity)): _roll_extra_feat(item)
    _refresh_name(item)
    return item

func make_starter(family: String) -> Dictionary:
    var result = {}
    var defs: Dictionary = STARTERS[family]
    for equip_slot in defs.keys():
        var slot = str(equip_slot)
        var base_slot = "Ring" if slot.begins_with("Ring") else slot
        result[slot] = make_for_slot(str(defs[equip_slot]), family, base_slot, "Common", false)
    if family == "Ravager":
        result["Offhand"] = make_for_slot("Execution Sword", "Ravager", "Offhand", "Common", false)
    return result

func roll_loot() -> Dictionary:
    var family = str(FAMILIES[rng.randi_range(0, FAMILIES.size() - 1)])
    var family_slots: Dictionary = V2_CATALOG[family]
    var slots = family_slots.keys()
    var slot = str(slots[rng.randi_range(0, slots.size() - 1)])
    var names: Array = family_slots[slot]
    var base_name = str(names[rng.randi_range(0, names.size() - 1)])
    return make_for_slot(base_name, family, slot, roll_rarity(), true)

func _roll_v2_bonus_stat(item: Dictionary):
    var accessory = str(item["slot"]) in ["Ring", "Amulet"]
    var native: Dictionary = item.get("native_stats", zero_stats())
    for tries in range(20):
        var stat = str(ATTRS[rng.randi_range(0, ATTRS.size() - 1)]) if accessory and rng.randf() < .50 else _roll_family_stat(str(item["family"]))
        if int(item["stats"][stat]) - int(native.get(stat, 0)) < 2:
            item["stats"][stat] += 1
            return
    item["stats"][_roll_family_stat(str(item["family"]))] += 1

func _legal_properties(item: Dictionary) -> Array:
    var legal = super._legal_properties(item)
    if _is_dual_weapon(item):
        legal.erase("Deep-Pocketed")
        legal.erase("Reinforced")
        for prop in ["Quickened", "Sure-Gripped", "Efficient"]:
            if prop not in legal: legal.append(prop)
        if str(item["family"]) == "Ravager" and "Forceful" not in legal: legal.append("Forceful")
    return legal

func _feat_pool(item: Dictionary) -> Array:
    if _is_dual_weapon(item): return []
    return super._feat_pool(item)

func weapon_data(base_name: String) -> Dictionary:
    if base_name == "Short Bow":
        return {"name":base_name,"dmin":2,"dmax":3,"time":88,"fatigue":3,"noise":3,"push":0,"ranged":true,"rdmin":6,"rdmax":9,"rtime":88,"range":5,"shot_noise":11,"knock":0,"heavy":false}
    if base_name == "Long Bow":
        return {"name":base_name,"dmin":2,"dmax":3,"time":120,"fatigue":5,"noise":4,"push":0,"ranged":true,"rdmin":8,"rdmax":12,"rtime":120,"range":8,"shot_noise":16,"knock":2,"heavy":false}
    return super.weapon_data(base_name)
