extends "res://scripts/MainPerception.gd"

# Alpha 0.3 mobile input layer.
# The arena is designed for landscape phone play. Keyboard controls remain in
# the parent script strictly as a desktop/debug fallback.

var touch_sprint := false

var btn_turn_left := Rect2(836, 500, 98, 56)
var btn_turn_right := Rect2(942, 500, 98, 56)
var btn_crouch := Rect2(1048, 500, 98, 56)
var btn_sprint := Rect2(1154, 500, 98, 56)
var btn_melee := Rect2(836, 566, 98, 56)
var btn_shoot := Rect2(942, 566, 98, 56)
var btn_use := Rect2(1048, 566, 98, 56)
var btn_new := Rect2(1154, 566, 98, 56)

func reset_run():
    touch_sprint = false
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

    # Keep the existing keyboard input as a debug fallback only.
    super._unhandled_input(e)

func handle_touch_point(pos: Vector2):
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

func draw_touch_button(rect: Rect2, text: String, active: bool):
    var fill = Color(.24, .30, .25, .98) if active else Color(.12, .15, .13, .98)
    var edge = Color(.95, .8, .36) if active else Color(.42, .48, .43)
    draw_rect(rect, fill)
    draw_rect(rect, edge, false, 2)
    var baseline = rect.position + Vector2(10, 34)
    draw_string(font, baseline, text, HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 16, 12, Color.WHITE)
