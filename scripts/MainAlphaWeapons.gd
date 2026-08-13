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
