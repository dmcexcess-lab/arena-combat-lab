extends "res://scripts/MainArenaCreatures.gd"

# Expanded creature catalog + generic roster boundary for the Developer Screen.
# The original Walker/Ripper/Brute definitions remain authoritative in the base layer.
const BaseCreatures = preload("res://scripts/MainArenaCreatures.gd")

const EXTRA_CREATURES := {
    "Ghoul": {
        "hp":10, "hit":.50, "dmin":3, "dmax":5, "move":90, "attack":90,
        "sight":8, "hearing":10, "ai":2, "fear":9, "spot_fear":8,
        "wander":.38, "vocal_chance":.07, "vocal_power":20, "vocal":"rasp",
        "share_bonus":0, "track_bonus":1, "crouch_penalty":1,
        "door_ticks":120, "door_noise":26,
        "desc":"quick scavenger, persistent pursuit"
    },
    "Hound": {
        "hp":8, "hit":.48, "dmin":2, "dmax":4, "move":60, "attack":75,
        "sight":7, "hearing":6, "ai":2, "fear":6, "spot_fear":7,
        "wander":.55, "vocal_chance":.10, "vocal_power":24, "vocal":"snarl",
        "share_bonus":1, "track_bonus":1, "crouch_penalty":1,
        "door_ticks":135, "door_noise":24,
        "desc":"very fast, fragile, keen hearing"
    },
    "Stalker": {
        "hp":11, "hit":.58, "dmin":4, "dmax":6, "move":85, "attack":95,
        "sight":11, "hearing":9, "ai":4, "fear":10, "spot_fear":12,
        "wander":.30, "vocal_chance":.02, "vocal_power":14, "vocal":"click",
        "share_bonus":1, "track_bonus":2, "crouch_penalty":0,
        "door_ticks":105, "door_noise":22,
        "desc":"smart tracker, long sight, low noise"
    },
    "Marauder": {
        "hp":16, "hit":.60, "dmin":4, "dmax":7, "move":100, "attack":100,
        "sight":8, "hearing":11, "ai":3, "fear":11, "spot_fear":9,
        "wander":.22, "vocal_chance":.05, "vocal_power":24, "vocal":"shout",
        "share_bonus":1, "track_bonus":1, "crouch_penalty":1,
        "door_ticks":100, "door_noise":35,
        "desc":"balanced fighter, accurate heavy pressure"
    },
    "Warden": {
        "hp":20, "hit":.62, "dmin":4, "dmax":6, "move":115, "attack":95,
        "sight":9, "hearing":10, "ai":5, "fear":12, "spot_fear":11,
        "wander":.16, "vocal_chance":.04, "vocal_power":22, "vocal":"order",
        "share_bonus":2, "track_bonus":1, "crouch_penalty":1,
        "door_ticks":85, "door_noise":28,
        "desc":"durable commander, strong awareness sharing"
    },
    "Juggernaut": {
        "hp":38, "hit":.62, "dmin":7, "dmax":10, "move":190, "attack":165,
        "sight":5, "hearing":16, "ai":1, "fear":18, "spot_fear":12,
        "wander":.08, "vocal_chance":.09, "vocal_power":36, "vocal":"bellow",
        "share_bonus":0, "track_bonus":0, "crouch_penalty":2,
        "door_ticks":80, "door_noise":75, "door_smash":true,
        "desc":"extreme tank, crushing damage, gate breaker"
    }
}

const DEV_CREATURE_ORDER := ["Walker", "Ripper", "Brute", "Ghoul", "Hound", "Stalker", "Marauder", "Warden", "Juggernaut"]
const DEFAULT_ROSTER := {
    "Walker":8, "Ripper":3, "Brute":1,
    "Ghoul":0, "Hound":0, "Stalker":0, "Marauder":0, "Warden":0, "Juggernaut":0
}

var creature_spawn_counts: Dictionary = DEFAULT_ROSTER.duplicate(true)

static func catalog_definition(kind: String) -> Dictionary:
    if EXTRA_CREATURES.has(kind):
        return EXTRA_CREATURES[kind].duplicate(true)
    var defs: Dictionary = BaseCreatures.CREATURES
    var key = kind if defs.has(kind) else "Walker"
    return defs[key].duplicate(true)

func _creature_def(kind: String) -> Dictionary:
    if EXTRA_CREATURES.has(kind):
        return EXTRA_CREATURES[kind]
    return super._creature_def(kind)

func spawn_zombies():
    zombies.clear()
    var candidates: Array = []
    for p in floor_cells:
        if p == exit_cell or p == objective or doors.has(p) or blocked(p):
            continue
        if manhattan(p, exit_cell) < 6:
            continue
        candidates.append(p)
    candidates.shuffle()

    var roster: Array = []
    for kind in DEV_CREATURE_ORDER:
        for n in range(max(0, int(creature_spawn_counts.get(kind, 0)))):
            roster.append(kind)
    roster.shuffle()

    var actual = min(roster.size(), candidates.size())
    for i in range(actual):
        var kind = str(roster[i])
        var data = _creature_def(kind)
        zombies.append({
            "id":i, "kind":kind, "pos":candidates[i],
            "facing":DIRS[rng.randi_range(0, 3)],
            "hp":int(data.hp), "max_hp":int(data.hp),
            "hit":float(data.hit), "dmin":int(data.dmin), "dmax":int(data.dmax),
            "move_ticks":int(data.move), "attack_ticks":int(data.attack),
            "sight":int(data.sight), "hearing":int(data.hearing), "ai_intel":int(data.ai),
            "fear":int(data.fear), "spot_fear":int(data.spot_fear),
            "wander":float(data.wander), "vocal_chance":float(data.vocal_chance),
            "vocal_power":int(data.vocal_power), "vocal":str(data.vocal),
            "share_bonus":int(data.get("share_bonus", 0)),
            "track_bonus":int(data.get("track_bonus", 0)),
            "crouch_penalty":int(data.get("crouch_penalty", 2)),
            "door_ticks":int(data.get("door_ticks", 145)),
            "door_noise":int(data.get("door_noise", 30)),
            "door_smash":bool(data.get("door_smash", false)),
            "state":"IDLE", "target":Vector2i(-1, -1), "heard":Vector2i(-1, -1),
            "next":rng.randi_range(40, 170), "alerted":false, "dead":false,
            "spot_until":-1, "last_seen_player":Vector2i(-1, -1),
            "last_seen_tick":-10000, "follow_budget":0, "search_until":-1
        })
