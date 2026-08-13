extends "res://scripts/MainMobile.gd"

# Web/mobile input shield.
# A single physical touch contact may only dispatch one game action. This is
# intentionally separate from MainMobile so the tactical UI stays easy to edit.

var active_touch_ids := {}
var last_web_action := ""
var last_web_action_ms := -10000

func _unhandled_input(e):
    if e is InputEventScreenTouch:
        get_viewport().set_input_as_handled()
        var touch_id := int(e.index)
        if e.pressed:
            # Ignore duplicate "pressed" events for the same finger until a
            # matching release arrives.
            if active_touch_ids.has(touch_id):
                return
            active_touch_ids[touch_id] = true
            dispatch_web_point(e.position)
        else:
            active_touch_ids.erase(touch_id)
        return

    if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
        # On a real touchscreen, do not accept a parallel mouse path at all.
        # Desktop browsers without touch still use mouse normally for testing.
        if DisplayServer.is_touchscreen_available():
            get_viewport().set_input_as_handled()
            return
        if e.pressed:
            dispatch_web_point(e.position)
            get_viewport().set_input_as_handled()
        return

    # Keyboard remains a desktop/debug fallback.
    super._unhandled_input(e)

func dispatch_web_point(pos: Vector2):
    var action := ""
    if btn_turn_left.has_point(pos):
        action = "TURN_L"
    elif btn_turn_right.has_point(pos):
        action = "TURN_R"
    elif btn_menu.has_point(pos):
        action = "MENU"

    # Secondary safety net for browsers that somehow report two separate touch
    # contacts for one tap. This only guards the actions that were exhibiting
    # duplicate behavior; normal movement taps stay fully responsive.
    if action != "":
        var now := Time.get_ticks_msec()
        if action == last_web_action and now - last_web_action_ms < 350:
            return
        last_web_action = action
        last_web_action_ms = now

    handle_touch_point(pos)
