extends "res://scripts/MainPerception.gd"

# Alpha 0.4 mobile input layer.
# Landscape phone play is the primary interface. Keyboard controls remain in
# the parent script strictly as a desktop/debug fallback.

var touch_sprint := false
var menu_open := false

var btn_turn_left := Rect2(836, 500, 98, 56)
var btn_turn_right := Rect2(942, 500, 98, 56)
var btn_crouch := Rect2(1048, 500, 98, 56)
var btn_sprint := Rect2(1154, 500, 98, 56)
var btn_melee := Rect2(836, 566, 98, 56)
var btn_shoot := Rect2(942, 566, 98, 56)
var btn_use := Rect2(1048, 566, 98, 56)
var btn_new := Rect2(1154, 566, 98, 56)

var btn_menu := Rect2(1150, 18, 102, 44)
var btn_resume := Rect2(470, 270, 340, 62)
var btn_menu_new := Rect2(470, 346, 340, 62)
var btn_exit_google := Rect2(470, 422, 340, 62)

func reset_run():
    touch_sprint = false
    menu_open = false
    super.reset_run()

func _unhandled_input(e):
    # Native phone touch.
    if e is InputEventScreenTouch and e.pressed:
        handle_touch_point(e.position)
        get_viewport().set_input_as_handled()
        return

    # Mouse clicks run through the same touch path so the phone UI can be
    # tested on desktop without an Android build.
    if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
        handle_touch_point(e.position)
        get_viewport().set_input_as_handled()
        return

    # Escape toggles the same menu during desktop testing.
    if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_ESCAPE:
        menu_open = not menu_open
        queue_redraw()
        get_viewport().set_input_as_handled()
        return

    # Keep the existing keyboard input as a debug fallback only, but do not
    # allow gameplay input while the menu is open.
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
    if btn_crouch.has_point(pos):
        player.crouched = not player.crouched
        if player.crouched:
            touch_sprint = false
            player.move_state = "CROUCH"
            msg = "Crouched: quieter, slower."
        else:
            player.move_state = "STILL"
            msg = "Standing."
        recalc_visibility()
        refresh_intents()
        queue_redraw()
        return
    if btn_sprint.has_point(pos):
        if player.crouched:
            player.crouched = false
        touch_sprint = not touch_sprint
        player.move_state = "STILL"
        msg = "Sprint mode ON." if touch_sprint else "Walk mode ON."
        recalc_visibility()
        refresh_intents()
        queue_redraw()
        return
    if btn_melee.has_point(pos):
        melee(player.pos + player.facing)
        return
    if btn_shoot.has_point(pos):
        shoot_nearest()
        return
    if btn_use.has_point(pos):
        interact()
        return
    if btn_new.has_point(pos):
        reset_run()
        return

    # Board touch: adjacent tiles are context sensitive. This removes the need
    # for separate move/attack/interact modes on a small screen.
    var cell := screen_to_cell(pos)
    if not inside(cell) or game_over:
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
        try_move(delta, touch_sprint)
        return

    # A visible distant enemy or explosive is a natural tap-to-target action.
    if visible_cells.has(cell) and (zombie_at(cell) != -1 or barrels.has(cell)):
        click_target(cell)
        return

    msg = "Tap an adjacent tile to move. Tap visible enemies to attack."
    queue_redraw()

func exit_to_google():
    # On the web this leaves the game completely. On desktop this opens the
    # same destination in the normal browser so the menu is testable there too.
    if OS.has_feature("web"):
        JavaScriptBridge.eval("window.location.href='https://www.google.com';")
    else:
        OS.shell_open("https://www.google.com")

func draw_hud():
    super.draw_hud()

    # Cover the old keyboard-help area with the actual phone controls. The
    # underlying keyboard remains available for desktop debugging.
    draw_rect(Rect2(820, 475, 444, 174), Color(.035, .045, .04, .97))
    draw_string(font, Vector2(836, 493), "TOUCH CONTROLS", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(.95, .8, .36))

    draw_touch_button(btn_turn_left, "TURN <", false)
    draw_touch_button(btn_turn_right, "TURN >", false)
    draw_touch_button(btn_crouch, "CROUCH", player.crouched)
    draw_touch_button(btn_sprint, "SPRINT", touch_sprint)
    draw_touch_button(btn_melee, "MELEE", false)
    draw_touch_button(btn_shoot, "SHOOT", false)
    draw_touch_button(btn_use, "USE", false)
    draw_touch_button(btn_new, "NEW", false)

    draw_string(font, Vector2(836, 642), "Tap adjacent tile = move | tap zed = attack", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(.72, .75, .72))

    draw_touch_button(btn_menu, "MENU", menu_open)

    if menu_open:
        draw_menu_overlay()

func draw_menu_overlay():
    draw_rect(Rect2(0, 0, 1280, 720), Color(0, 0, 0, .72))
    draw_rect(Rect2(430, 190, 420, 340), Color(.035, .045, .04, .99))
    draw_rect(Rect2(430, 190, 420, 340), Color(.75, .68, .35), false, 2)
    draw_string(font, Vector2(470, 232), "ARENA COMBAT LAB", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color.WHITE)
    draw_string(font, Vector2(470, 254), "Browser prototype - nothing is installed on your phone.", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(.72, .75, .72))
    draw_touch_button(btn_resume, "RESUME", false)
    draw_touch_button(btn_menu_new, "NEW RUN", false)
    draw_touch_button(btn_exit_google, "EXIT TO GOOGLE", false)
    draw_string(font, Vector2(470, 510), "Exit leaves this game page and opens google.com.", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(.72, .75, .72))

func draw_touch_button(rect: Rect2, text: String, active: bool):
    var fill = Color(.24, .30, .25, .98) if active else Color(.12, .15, .13, .98)
    var edge = Color(.95, .8, .36) if active else Color(.42, .48, .43)
    draw_rect(rect, fill)
    draw_rect(rect, edge, false, 2)
    var baseline = rect.position + Vector2(10, 34)
    draw_string(font, baseline, text, HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 16, 12, Color.WHITE)
