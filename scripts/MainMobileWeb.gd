extends "res://scripts/MainMobile.gd"

# Alpha 0.8 web/mobile compatibility layer.
# Touch-capable web devices use touch events only. Each physical finger contact
# may dispatch at most one action until its release arrives.

var web_touch_capable := false
var active_touch_ids := {}
var last_guard_action := ""
var last_guard_ms := -10000

func _ready():
    # TURN buttons are the primary thumb actions and sit level with each other.
    # Secondary controls are deliberately smaller and offset around them.
    btn_turn_left = Rect2(18, 1118, 230, 84)
    btn_turn_right = Rect2(472, 1118, 230, 84)
    btn_crouch = Rect2(66, 1214, 164, 52)
    btn_forward = Rect2(500, 1060, 164, 48)
    btn_back = Rect2(500, 1214, 164, 52)

    if OS.has_feature("web"):
        web_touch_capable = bool(JavaScriptBridge.eval("navigator.maxTouchPoints > 0"))

    super._ready()

func reset_run():
    active_touch_ids.clear()
    last_guard_action = ""
    last_guard_ms = -10000
    super.reset_run()

func _guard_action_for_point(pos: Vector2) -> bool:
    var action := ""
    if btn_turn_left.has_point(pos):
        action = "TURN_L"
    elif btn_turn_right.has_point(pos):
        action = "TURN_R"
    elif btn_menu.has_point(pos):
        action = "MENU"

    if action == "":
        return true

    var now := Time.get_ticks_msec()
    if action == last_guard_action and now - last_guard_ms < 400:
        return false
    last_guard_action = action
    last_guard_ms = now
    return true

func _dispatch_point(pos: Vector2):
    if _guard_action_for_point(pos):
        handle_touch_point(pos)

func _unhandled_input(e):
    if e is InputEventScreenTouch:
        get_viewport().set_input_as_handled()
        var touch_id := int(e.index)
        if e.pressed:
            # Ignore repeated press events for the same finger until release.
            if active_touch_ids.has(touch_id):
                return
            active_touch_ids[touch_id] = true
            _dispatch_point(e.position)
        else:
            active_touch_ids.erase(touch_id)
        return

    if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
        # A real touchscreen gets exactly one input path: touch. Desktop web
        # keeps mouse support so the same build remains easy to test.
        if OS.has_feature("web") and web_touch_capable:
            get_viewport().set_input_as_handled()
            return
        if e.pressed:
            _dispatch_point(e.position)
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
    # While the menu is showing, MENU beneath the overlay does not exist as an
    # action. Only an explicit menu choice can leave the overlay.
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

func draw_hud():
    super.draw_hud()
    if not menu_open:
        draw_string(font, Vector2(612, 30), "WEB 0.8", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(.55, .60, .55))
