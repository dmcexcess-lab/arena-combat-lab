extends RefCounted

const SCHEMA := 2
const APPEARANCE_OPTIONS := {
    "body": ["Lean", "Standard", "Broad"],
    "skin": ["Light", "Warm", "Brown", "Deep"],
    "hair_style": ["Crop", "Short", "Long", "Mohawk", "Bald"],
    "hair_color": ["Black", "Brown", "Blond", "Red", "Silver"]
}

const FANTASY_NAMES := [
    "Aldren", "Aric", "Brenna", "Brin", "Caelen", "Corin", "Dain", "Dessa",
    "Edrin", "Elara", "Emric", "Faelan", "Fenna", "Garran", "Hale", "Hesta",
    "Ilyra", "Joren", "Kael", "Kessa", "Liora", "Marek", "Mira", "Nerys",
    "Orin", "Perrin", "Quillan", "Rhea", "Rhydan", "Sable", "Sera", "Tarin",
    "Thane", "Una", "Vael", "Vessa", "Wren", "Yara", "Zorin", "Avel",
    "Bram", "Cerys", "Doran", "Eira", "Fenric", "Galen", "Ivara", "Jessa",
    "Kellan", "Lyra", "Merric", "Nessa", "Orren", "Riven", "Sorrel", "Tressa",
    "Valen", "Weyra", "Ysra", "Zarek"
]

static func default_appearance() -> Dictionary:
    return {"body":1, "skin":1, "hair_style":0, "hair_color":0}

static func default_profile() -> Dictionary:
    return {"schema":SCHEMA, "id":"player", "name":"Arena Tester", "appearance":default_appearance()}

static func normalize(raw: Dictionary) -> Dictionary:
    var out = default_profile()
    out["id"] = str(raw.get("id", out["id"]))
    var display_name = str(raw.get("name", out["name"])).strip_edges()
    out["name"] = display_name if display_name != "" else "Arena Tester"

    var custom = raw.get("appearance", {})
    if typeof(custom) == TYPE_DICTIONARY:
        for key in custom.keys():
            if not APPEARANCE_OPTIONS.has(str(key)):
                out["appearance"][key] = custom[key]
        for key in APPEARANCE_OPTIONS.keys():
            var options: Array = APPEARANCE_OPTIONS[key]
            out["appearance"][key] = clampi(int(custom.get(key, out["appearance"][key])), 0, options.size() - 1)
    return out

static func appearance_label(appearance: Dictionary, key: String) -> String:
    if not APPEARANCE_OPTIONS.has(key):
        return ""
    var options: Array = APPEARANCE_OPTIONS[key]
    var index = clampi(int(appearance.get(key, 0)), 0, options.size() - 1)
    return str(options[index])

static func random_fantasy_name(randomizer: RandomNumberGenerator) -> String:
    if FANTASY_NAMES.is_empty():
        return "Arena Tester"
    return str(FANTASY_NAMES[randomizer.randi_range(0, FANTASY_NAMES.size() - 1)])
