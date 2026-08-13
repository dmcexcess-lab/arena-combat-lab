extends "res://scripts/MainMobile.gd"

# Alpha 0.7 web/mobile compatibility layer.
# iPhone Safari can surface touch input differently from desktop browsers, so
# touch-capable web devices use touch events only. A short action guard also
# prevents duplicate press events from becoming duplicate game actions.

var web_touch_capable := false
var last_action_ms := -10000

func _ready():
    # TURN buttons are the primary thumb actions and sit level with each other.
    # Secondary controls are smaller and offset beneath their matching side.
    btn_turn_left = Rect2(18, 1118, 230, 84)
    btn_turn_right = Rect2(472, 1118, 230, 84)
    btn_crouch = Rect2(66, 1214, 164, 52)
    btn_forward = Rect2(472, 1214, 108, 52)
    btn_back = Rect2(594, 1214, 108, 52)

    if OS.has_feature("web"):
        web_touch_capable = bool(JavaScriptBridge.eval("navigator.maxTouchPoints > 0"))

    super._ready()

func _accept_action() -> bool:
    var now := Time.get_ticks_msec()
    if now - last_action_ms < 160:
        return false
    last_action_ms = now
    return true

func _unhandled_input(e):
    if e is InputEventScreenTouch and e.pressed:
        if _accept_action():
            handle_touch_point(e.position)
        get_viewport().set_input_as_handled()
        return

    if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
        # On a touch-capable browser, mouse events associated with taps are not
        # gameplay input. Desktop browsers still use the mouse normally.
        if OS.has_feature("web") and web_touch_capable:
            get_viewport().set_input_as_handled()
            return
        if _accept_action():
            handle_touch_point(e.position)
        get_viewport().set_input_as_handled()
        return

    if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_ESCAPE:
        menu_open = not menu_open
        queue_redraw()
        get_viewport().set_input_as_handled()
        return

    if not menu_open:
        # Keyboard remains a desktop/debug fallback.
        super._unhandled_input(e)

func handle_touch_point(pos: Vector2):
    # While the menu is visible, the MENU button underneath is completely
    # disabled. Only explicit menu choices can change state.
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

    if btn_menu.has_point(pos):
        menu_open = true
        queue_redraw()
        return

    super.handle_touch_point(pos)

func draw_touch_button(rect: Rect2, text: String, active: bool):
    var fill = Color(.24, .30, .25, .92) if active else Color(.08, .10, .09, .90)
    var edge = Color(.95, .8, .36) if active else Color(.70, .74, .70)
    draw_rect(rect, fill)
    draw_rect(rect, edge, false, 2)
    var baseline_y := rect.position.y + rect.size.y * .5 + 6.0
    var size := 18 if text.begins_with("TURN") else 14
    draw_string(font, Vector2(rect.position.x, baseline_y), text, HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, size, Color.WHITE)
