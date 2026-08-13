extends "res://scripts/MainPerception.gd"

# Alpha 0.5 portrait mobile layer.
# The board is panned horizontally and enlarged for phone play. Keyboard input
# remains available only as a desktop/debug fallback.

const SCREEN_W := 720.0
const SCREEN_H := 1280.0
const INFO_H := 420.0
const MAP_TOP := 430.0
const MAP_SCALE := 1.25

var menu_open := false

var btn_menu := Rect2(12, 12, 92, 48)
var btn_forward := Rect2(300, 870, 120, 64)
var btn_crouch := Rect2(300, 944, 120, 64)
var btn_back := Rect2(300, 1018, 120, 64)
var btn_turn_left := Rect2(18, 1018, 132, 64)
var btn_turn_right := Rect2(570, 1018, 132, 64)

var btn_resume := Rect2(110, 500, 500, 74)
var btn_menu_new := Rect2(110, 592, 500, 74)
var btn_exit_google := Rect2(110, 684, 500, 74)

func reset_run():
    menu_open = false
    super.reset_run()

func _unhandled_input(e):
    if e is InputEventScreenTouch and e.pressed:
        handle_touch_point(e.position)
        get_viewport().set_input_as_handled()
        return

    # Mouse follows the exact phone path for desktop testing.
    if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
        handle_touch_point(e.position)
        get_viewport().set_input_as_handled()
        return

    if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_ESCAPE:
        menu_open = not menu_open
        queue_redraw()
        get_viewport().set_input_as_handled()
        return

    if not menu_open:
        super._unhandled_input(e)

func handle_touch_point(pos: Vector2):
    if btn_menu.has_point(pos):
        menu_open = not menu_open
        queue_redraw()
        return

    if menu_open:
        if btn_resume.has_point(pos):
            menu_open = false
            queue_redraw()
            return
        if btn_menu_new.has_point(pos):
            reset_run()
            return
        if btn_exit_google.has_point(pos):
            exit_to_google()
            return
        return

    if btn_turn_left.has_point(pos):
        rotate_player(-1)
        return
    if btn_turn_right.has_point(pos):
        rotate_player(1)
        return
    if btn_forward.has_point(pos):
        step_forward()
        return
    if btn_back.has_point(pos):
        step_backward()
        return
    if btn_crouch.has_point(pos):
        toggle_crouch()
        return

    # The top strip is information only. Everything beneath it is board space.
    if pos.y < MAP_TOP or game_over:
        return

    var game_pos := screen_to_game(pos)
    var cell := screen_to_cell(game_pos)
    if not inside(cell):
        return

    var delta: Vector2i = cell - player.pos
    if manhattan(player.pos, cell) == 1:
        player.facing = delta
        recalc_visibility()
        refresh_intents()

        if zombie_at(cell) != -1:
            melee(cell)
            return
        if doors.has(cell) or glass.has(cell) or cell == alarm:
            interact()
            return
        try_move(delta, false)
        return

    # Distant taps are only for visible targets. This keeps shooting direct and
    # removes the need for a permanent SHOOT button.
    if visible_cells.has(cell) and (zombie_at(cell) != -1 or barrels.has(cell)):
        click_target(cell)
        return

    msg = "Use FORWARD/BACK to move, or tap a nearby tile."
    queue_redraw()

func step_forward():
    if game_over:
        return
    var cell: Vector2i = player.pos + player.facing
    if zombie_at(cell) != -1:
        melee(cell)
        return
    if doors.has(cell) or glass.has(cell) or cell == alarm:
        interact()
        return
    try_move(player.facing, false)

func step_backward():
    if game_over:
        return
    var keep_facing: Vector2i = player.facing
    try_move(-keep_facing, false)
    # Backing up does not magically turn the survivor around.
    player.facing = keep_facing
    player.last_dir = Vector2i.ZERO
    if not player.crouched and not game_over:
        player.move_state = "WALK"
    recalc_visibility()
    refresh_intents()
    queue_redraw()

func toggle_crouch():
    player.crouched = not player.crouched
    player.move_state = "CROUCH" if player.crouched else "STILL"
    msg = "Crouched: quieter, slower." if player.crouched else "Standing."
    recalc_visibility()
    refresh_intents()
    queue_redraw()

func exit_to_google():
    if OS.has_feature("web"):
        JavaScriptBridge.eval("window.location.href='https://www.google.com';")
    else:
        OS.shell_open("https://www.google.com")

func map_draw_origin() -> Vector2:
    # The map is wider than a portrait phone, so follow the player horizontally
    # while always keeping the complete north/south span visible.
    var scaled_left := ORIGIN.x * MAP_SCALE
    var scaled_right := (ORIGIN.x + W * TILE) * MAP_SCALE
    var left_aligned := -scaled_left
    var right_aligned := SCREEN_W - scaled_right
    var player_center := (ORIGIN.x + (float(player.pos.x) + .5) * TILE) * MAP_SCALE
    var ideal_x := SCREEN_W * .5 - player_center
    var x := clamp(ideal_x, right_aligned, left_aligned)
    var y := MAP_TOP - ORIGIN.y * MAP_SCALE
    return Vector2(x, y)

func screen_to_game(pos: Vector2) -> Vector2:
    return (pos - map_draw_origin()) / MAP_SCALE

func any_zombie_spotted_player() -> bool:
    for z in zombies:
        if not z.dead and z.state == "CHASE":
            return true
    return false

func _draw():
    var map_origin := map_draw_origin()
    draw_set_transform(map_origin, 0.0, Vector2(MAP_SCALE, MAP_SCALE))
    draw_map()
    draw_units()
    draw_fog()
    draw_sounds()
    draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
    draw_hud()

func draw_hud():
    # Opaque portrait information strip. It intentionally covers any map cells
    # that would otherwise scroll underneath it.
    draw_rect(Rect2(0, 0, SCREEN_W, INFO_H), Color(.035, .045, .04, .99))
    draw_rect(Rect2(0, INFO_H - 2, SCREEN_W, 2), Color(.38, .42, .38))

    var s = player.skills
    draw_touch_button(btn_menu, "MENU", menu_open)
    draw_string(font, Vector2(120, 34), "ARENA COMBAT LAB", HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color.WHITE)
    draw_string(font, Vector2(120, 61), player.name, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(.65, .82, 1))

    draw_string(font, Vector2(18, 94), "HP %d/%d   FEAR %d   TICK %d   FACING %s" % [player.hp, player.max_hp, player.fear, tick, DIR_NAMES[DIRS.find(player.facing)]], HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
    draw_string(font, Vector2(18, 119), "Status: %s" % ", ".join(player.status), HORIZONTAL_ALIGNMENT_LEFT, 680, 13, Color(.82, .84, .82))

    draw_string(font, Vector2(18, 151), "SKILLS", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 174), "Combat %d   Scav %d   Survival %d" % [s.Combat, s.Scavenging, s.Survival], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)
    draw_string(font, Vector2(18, 195), "Medical %d   Technical %d   Social %d" % [s.Medical, s.Technical, s.Social], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)

    draw_string(font, Vector2(18, 228), "GEAR", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 251), "%s | %s | %s | Ammo %d" % [player.weapon.name, player.clothes.name, player.gun if player.gun != "" else "No gun", player.ammo], HORIZONTAL_ALIGNMENT_LEFT, 684, 13, Color.WHITE)

    draw_string(font, Vector2(18, 286), "OBJECTIVE", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))
    draw_string(font, Vector2(18, 309), "CACHE ACQUIRED - ESCAPE" if objective_taken else "GET THE SUPPLY CACHE", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
    draw_string(font, Vector2(18, 338), msg, HORIZONTAL_ALIGNMENT_LEFT, 684, 13, Color(.93, .94, .90))
    draw_string(font, Vector2(18, 363), submsg, HORIZONTAL_ALIGNMENT_LEFT, 684, 11, Color(.68, .72, .68))
    draw_string(font, Vector2(18, 396), "Kills %d  Alerted %d  Stealth %d  Shots %d  Noise %d" % [stats.kills, stats.alerted, stats.stealth, stats.shots, stats.noise], HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(.75, .78, .75))

    # Global danger state stays deliberately blunt. The red ring identifies the
    # specific zombie when visible; this warning tells you that somewhere, one
    # of them currently has eyes on you.
    if any_zombie_spotted_player() and not game_over:
        draw_string(font, Vector2(0, 458), "!! SPOTTED !!", HORIZONTAL_ALIGNMENT_CENTER, SCREEN_W, 22, Color(1, .24, .18))

    # Minimal controls float directly over the tactical board.
    draw_touch_button(btn_forward, "FORWARD", false)
    draw_touch_button(btn_crouch, "CROUCH", player.crouched)
    draw_touch_button(btn_back, "BACK", false)
    draw_touch_button(btn_turn_left, "TURN L", false)
    draw_touch_button(btn_turn_right, "TURN R", false)

    if game_over:
        draw_rect(Rect2(120, 770, 480, 100), Color(.02, .025, .02, .94))
        draw_rect(Rect2(120, 770, 480, 100), Color(.85, .72, .30), false, 2)
        draw_string(font, Vector2(150, 812), "OBJECTIVE COMPLETE" if won else "RUN FAILED", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color.WHITE)
        draw_string(font, Vector2(150, 842), "MENU > NEW RUN to continue", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.8, .82, .8))

    if menu_open:
        draw_menu_overlay()

func draw_menu_overlay():
    draw_rect(Rect2(0, 0, SCREEN_W, SCREEN_H), Color(0, 0, 0, .74))
    draw_rect(Rect2(70, 390, 580, 430), Color(.035, .045, .04, .995))
    draw_rect(Rect2(70, 390, 580, 430), Color(.75, .68, .35), false, 2)
    draw_string(font, Vector2(110, 438), "ARENA COMBAT LAB", HORIZONTAL_ALIGNMENT_LEFT, -1, 25, Color.WHITE)
    draw_string(font, Vector2(110, 468), "Browser prototype - nothing is installed on your phone.", HORIZONTAL_ALIGNMENT_LEFT, 500, 12, Color(.72, .75, .72))
    draw_touch_button(btn_resume, "RESUME", false)
    draw_touch_button(btn_menu_new, "NEW RUN", false)
    draw_touch_button(btn_exit_google, "EXIT TO GOOGLE", false)
    draw_string(font, Vector2(110, 790), "Exit leaves the game page and opens google.com.", HORIZONTAL_ALIGNMENT_LEFT, 500, 11, Color(.72, .75, .72))

func draw_touch_button(rect: Rect2, text: String, active: bool):
    var fill = Color(.24, .30, .25, .88) if active else Color(.08, .10, .09, .82)
    var edge = Color(.95, .8, .36) if active else Color(.70, .74, .70)
    draw_rect(rect, fill)
    draw_rect(rect, edge, false, 2)
    draw_string(font, rect.position + Vector2(0, 40), text, HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, 14, Color.WHITE)
