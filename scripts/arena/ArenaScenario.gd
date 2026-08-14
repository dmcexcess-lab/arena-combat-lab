extends RefCounted

const CreatureCatalog = preload("res://scripts/catalogs/CreatureCatalog.gd")
const MAX_CREATURES := 40

static func default_scenario() -> Dictionary:
    return {
        "schema":2,
        "source":"dev_screen",
        "starter_index":0,
        "layout":"open_arena",
        "seed":0,
        "roster":CreatureCatalog.default_roster()
    }

# Compatibility helper for the original three-creature setup boundary.
static func from_setup(starter_index: int, walker_count: int, ripper_count: int, brute_count: int) -> Dictionary:
    var roster = CreatureCatalog.default_roster()
    roster["Walker"] = walker_count
    roster["Ripper"] = ripper_count
    roster["Brute"] = brute_count
    return from_dev(starter_index, roster)

static func from_dev(starter_index: int, roster: Dictionary) -> Dictionary:
    return normalize({
        "schema":2,
        "source":"dev_screen",
        "starter_index":starter_index,
        "layout":"open_arena",
        "seed":0,
        "roster":roster
    })

static func normalize(raw: Dictionary) -> Dictionary:
    var out = default_scenario()
    out["source"] = str(raw.get("source", out["source"]))
    out["starter_index"] = clampi(int(raw.get("starter_index", 0)), 0, 3)
    out["layout"] = str(raw.get("layout", out["layout"]))
    out["seed"] = int(raw.get("seed", 0))
    var incoming: Dictionary = raw.get("roster", {})
    var roster := {}
    var remaining = MAX_CREATURES
    for kind in CreatureCatalog.kinds():
        var count = clampi(int(incoming.get(kind, 0)), 0, MAX_CREATURES)
        count = min(count, remaining)
        roster[kind] = count
        remaining -= count
    out["roster"] = roster
    return out

static func expanded_roster(raw: Dictionary) -> Array:
    var scenario = normalize(raw)
    var out: Array = []
    var roster: Dictionary = scenario["roster"]
    for kind in CreatureCatalog.kinds():
        for n in range(int(roster.get(kind, 0))):
            out.append(kind)
    return out

static func count(raw: Dictionary, kind: String) -> int:
    return int(normalize(raw)["roster"].get(kind, 0))
