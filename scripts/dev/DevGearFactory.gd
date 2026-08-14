extends RefCounted

# Dev-screen adapter over the authoritative AlphaGearCore rules.
# It never duplicates gear stats/properties/feat legality; it asks the live core.
const GearCoreScript = preload("res://scripts/AlphaGearCore.gd")
const RARITIES := ["Common", "Uncommon", "Rare", "Enchanted"]

var core
var rng: RandomNumberGenerator

func _init(gear_core, randomizer: RandomNumberGenerator):
    core = gear_core
    rng = randomizer

func families() -> Array:
    return GearCoreScript.FAMILIES.duplicate()

func normalize_rarity(rarity: String) -> String:
    return rarity if rarity in RARITIES else "Common"

func slots_for_family(family: String) -> Array:
    if not GearCoreScript.CATALOG.has(family):
        return []
    var family_slots: Dictionary = GearCoreScript.CATALOG[family]
    var out: Array = []
    for slot in GearCoreScript.SLOTS:
        if family_slots.has(slot):
            out.append(slot)
    return out

func bases_for(family: String, slot: String) -> Array:
    if not GearCoreScript.CATALOG.has(family):
        return []
    var family_slots: Dictionary = GearCoreScript.CATALOG[family]
    if not family_slots.has(slot):
        return []
    return family_slots[slot].duplicate()

func random_item(rarity: String) -> Dictionary:
    var exact_rarity = normalize_rarity(rarity)
    var family = str(GearCoreScript.FAMILIES[rng.randi_range(0, GearCoreScript.FAMILIES.size() - 1)])
    var slots = slots_for_family(family)
    var slot = str(slots[rng.randi_range(0, slots.size() - 1)])
    var bases = bases_for(family, slot)
    var base_name = str(bases[rng.randi_range(0, bases.size() - 1)])
    return core.make_named(base_name, exact_rarity, true)

func legal_properties(base_name: String) -> Array:
    var ident: Dictionary = core.identity_for(base_name)
    return core._legal_properties({"family":str(ident["family"]), "slot":str(ident["slot"])})

func legal_extra_feats(base_name: String) -> Array:
    var ident: Dictionary = core.identity_for(base_name)
    var pool: Array = core._feat_pool({"family":str(ident["family"]), "slot":str(ident["slot"])})
    if GearCoreScript.NATIVE_FEAT.has(base_name):
        pool.erase(str(GearCoreScript.NATIVE_FEAT[base_name]))
    return pool

func parameter_options(base_name: String, rarity: String) -> Dictionary:
    var exact_rarity = normalize_rarity(rarity)
    return {
        "stat_budget":core.stat_points_for(exact_rarity),
        "property_budget":core.property_count_for(exact_rarity),
        "feat_budget":core.extra_feats_for(exact_rarity),
        "properties":legal_properties(base_name),
        "feats":legal_extra_feats(base_name)
    }

func make_custom(base_name: String, rarity: String, bonus_stats: Dictionary, properties: Array, extra_feats: Array) -> Dictionary:
    var exact_rarity = normalize_rarity(rarity)
    var item: Dictionary = core.make_named(base_name, exact_rarity, false)

    var remaining_stats = core.stat_points_for(exact_rarity)
    for stat in GearCoreScript.ATTRS:
        if remaining_stats <= 0:
            break
        var requested = clampi(int(bonus_stats.get(stat, 0)), 0, 2)
        var applied = min(requested, remaining_stats)
        item["stats"][stat] = int(item["stats"].get(stat, 0)) + applied
        remaining_stats -= applied

    var remaining_properties = core.property_count_for(exact_rarity)
    var legal_props = core._legal_properties(item)
    for raw_prop in properties:
        if remaining_properties <= 0:
            break
        var prop = str(raw_prop)
        if prop == "" or prop not in legal_props or prop in item["properties"]:
            continue
        item["properties"].append(prop)
        core._apply_property(item, prop)
        remaining_properties -= 1

    var remaining_feats = core.extra_feats_for(exact_rarity)
    var legal_feats = core._feat_pool(item)
    for existing in item["specials"]:
        legal_feats.erase(existing)
    for raw_feat in extra_feats:
        if remaining_feats <= 0:
            break
        var feat = str(raw_feat)
        if feat == "" or feat not in legal_feats or feat in item["specials"]:
            continue
        item["specials"].append(feat)
        legal_feats.erase(feat)
        remaining_feats -= 1

    core._refresh_name(item)
    return item
