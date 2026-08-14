extends RefCounted

const SCHEMA := 1

static func default_profile() -> Dictionary:
    return {"schema":SCHEMA, "id":"player", "name":"Arena Tester", "appearance":{}}

static func normalize(raw: Dictionary) -> Dictionary:
    var out = default_profile()
    out["id"] = str(raw.get("id", out["id"]))
    var display_name = str(raw.get("name", out["name"])).strip_edges()
    out["name"] = display_name if display_name != "" else "Arena Tester"
    var custom = raw.get("appearance", {})
    out["appearance"] = custom.duplicate(true) if typeof(custom) == TYPE_DICTIONARY else {}
    return out
