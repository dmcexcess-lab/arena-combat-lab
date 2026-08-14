extends RefCounted

# Read-only adapter over the live creature source of truth.
const RuntimeCreatures = preload("res://scripts/MainArenaDevCreatures.gd")

static func kinds() -> Array:
    return RuntimeCreatures.DEV_CREATURE_ORDER.duplicate()

static func default_roster() -> Dictionary:
    return RuntimeCreatures.DEFAULT_ROSTER.duplicate(true)

static func definition(kind: String) -> Dictionary:
    return RuntimeCreatures.catalog_definition(kind)
