extends SceneTree

func _initialize() -> void:
    var packed := load("res://main.tscn")
    if packed == null:
        print("SMOKE FAIL: main scene did not load")
        quit(1)
        return
    var scene = packed.instantiate()
    if scene == null:
        print("SMOKE FAIL: main scene did not instantiate")
        quit(1)
        return
    root.add_child(scene)
    await process_frame
    if not scene.has_method("_start_game"):
        print("SMOKE FAIL: gameplay script missing")
        quit(1)
        return
    scene._start_game()
    await process_frame
    if scene.playing != true or scene.hp != 3:
        print("SMOKE FAIL: run did not initialize")
        quit(1)
        return
    print("NEON DRIFTLINE SMOKE OK")
    quit(0)
