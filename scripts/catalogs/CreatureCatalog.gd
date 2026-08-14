extends RefCounted

# Read-only adapter over the live creature source of truth.
const RuntimeCreatures = preload("res://scripts/MainArenaCreatures.gd")
const ORDER := ["Walker", "Ripper", "Brute"]

static func kinds() -> Array:
    return ORDER.duplicate()

static func definition(kind: String) -> Dictionary:
    var defs: Dictionary = RuntimeCreatures.CREATURES
    var key = kind if defs.has(kind) else "Walker"
    return defs[key].duplicate(true)
