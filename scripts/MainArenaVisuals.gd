extends "res://scripts/MainArenaBaseVisuals.gd"

func _pd_item(gear: Dictionary, slot: String) -> Dictionary:
    var value = gear.get(slot, {})
    return value if typeof(value) == TYPE_DICTIONARY else {}

func _pd_color(family: String) -> Color:
    if family == "Stealth":
        return Color(.22, .23, .31)
    if family == "Ranged":
        return Color(.24, .38, .25)
    if family == "Guard":
        return Color(.42, .48, .54)
    if family == "Ravager":
        return Color(.48, .24, .18)
    return Color(.30, .36, .44)

func _pd_axes(facing: Vector2i) -> Array:
    var forward = Vector2(float(facing.x), float(facing.y))
    if forward.length_squared() < .5:
        forward = Vector2.UP
    forward = forward.normalized()
    return [forward, Vector2(-forward.y, forward.x)]

func _pd_head_center(center: Vector2, scale: float, forward: Vector2) -> Vector2:
    return center + forward * 8.0 * scale

func _pd_hair_crown(head_center: Vector2, scale: float, forward: Vector2) -> Vector2:
    return head_center + forward * 2.2 * scale

func _pd_weapon_kind(base_name: String) -> String:
    if base_name.contains("Bow") and not base_name.contains("Crossbow"):
        return "bow"
    if base_name.contains("Crossbow"):
        return "crossbow"
    if base_name in ["Stiletto", "Dirk", "Long Knife", "Throwing Knife Sheath", "Balanced Knife Roll"]:
        return "knife"
    if base_name.contains("Sword"):
        return "sword"
    if base_name.contains("Mace"):
        return "mace"
    if base_name.contains("Hammer") or base_name == "Maul":
        return "hammer"
    if base_name.contains("Axe"):
        return "axe"
    return "weapon"

func _pd_draw_hand_item(center: Vector2, scale: float, forward: Vector2, right: Vector2, item: Dictionary, side: float):
    if item.is_empty():
        return

    var hand = center + right * side * 7.0 * scale
    var base_name = str(item.get("base_name", ""))
    var kind = _pd_weapon_kind(base_name)
    var steel = Color(.78, .81, .84)
    var wood = Color(.43, .28, .14)
    var width = maxf(1.0, 1.35 * scale)

    if kind == "bow":
        var bend = hand + right * side * 5.0 * scale
        draw_line(hand + forward * 10.0 * scale, bend, wood, width)
        draw_line(bend, hand - forward * 8.0 * scale, wood, width)
        draw_line(hand + forward * 10.0 * scale, hand - forward * 8.0 * scale, Color(.78, .76, .65), maxf(1.0, .5 * scale))
        return

    if kind == "crossbow":
        var nose = hand + forward * 8.0 * scale
        draw_line(hand - forward * 4.0 * scale, nose, wood, width)
        draw_line(nose - right * 5.0 * scale, nose + right * 5.0 * scale, steel, maxf(1.0, 1.1 * scale))
        draw_line(nose - right * 5.0 * scale, hand - forward * 1.0 * scale, Color(.78, .76, .65), maxf(1.0, .45 * scale))
        draw_line(nose + right * 5.0 * scale, hand - forward * 1.0 * scale, Color(.78, .76, .65), maxf(1.0, .45 * scale))
        return

    if kind == "knife":
        var knife_tip = hand + forward * 7.0 * scale
        draw_line(hand - forward * 2.0 * scale, knife_tip, steel, width)
        draw_line(hand - right * 1.8 * scale, hand + right * 1.8 * scale, wood, maxf(1.0, 1.1 * scale))
        if base_name in ["Throwing Knife Sheath", "Balanced Knife Roll"]:
            draw_line(hand + right * side * 2.0 * scale - forward * 1.0 * scale, knife_tip + right * side * 2.0 * scale, steel, maxf(1.0, .8 * scale))
        return

    var tip_distance = 11.0
    if kind in ["hammer", "axe"]:
        tip_distance = 10.0
    var tip = hand + forward * tip_distance * scale
    draw_line(hand - forward * 3.0 * scale, tip, steel if kind in ["sword", "weapon"] else wood, width)

    if kind == "sword":
        draw_line(hand - right * 3.0 * scale, hand + right * 3.0 * scale, steel, maxf(1.0, 1.3 * scale))
    elif kind == "mace":
        draw_circle(tip, 2.6 * scale, steel)
    elif kind == "hammer":
        draw_line(tip - right * 4.0 * scale, tip + right * 4.0 * scale, steel, maxf(1.0, 2.1 * scale))
    elif kind == "axe":
        var blade = PackedVector2Array([
            tip,
            tip - forward * 4.0 * scale + right * side * 1.0 * scale,
            tip - forward * 1.0 * scale + right * side * 5.0 * scale
        ])
        draw_colored_polygon(blade, steel)

func _pd_draw_shield(center: Vector2, scale: float, forward: Vector2, right: Vector2, item: Dictionary):
    var shield_center = center - right * 7.0 * scale
    var name = str(item.get("base_name", ""))
    var fill = _pd_color("Guard")
    var rim = Color(.80, .82, .83)

    if name == "Buckler":
        draw_circle(shield_center, 5.0 * scale, fill)
        draw_circle(shield_center, 5.0 * scale, rim, false, maxf(1.0, scale))
        return

    if name == "Tower Shield":
        var points = PackedVector2Array([
            shield_center + forward * 7.0 * scale - right * 4.5 * scale,
            shield_center + forward * 7.0 * scale + right * 4.5 * scale,
            shield_center - forward * 7.0 * scale + right * 4.5 * scale,
            shield_center - forward * 7.0 * scale - right * 4.5 * scale
        ])
        draw_colored_polygon(points, fill)
        draw_polyline(PackedVector2Array([points[0], points[1], points[2], points[3], points[0]]), rim, maxf(1.0, scale))
        return

    var kite = PackedVector2Array([
        shield_center + forward * 6.0 * scale,
        shield_center + right * 5.0 * scale,
        shield_center - forward * 7.0 * scale,
        shield_center - right * 5.0 * scale,
        shield_center + forward * 6.0 * scale
    ])
    draw_colored_polygon(PackedVector2Array([kite[0], kite[1], kite[2], kite[3]]), fill)
    draw_polyline(kite, rim, maxf(1.0, scale))

func _pd_draw_armor_detail(center: Vector2, scale: float, forward: Vector2, right: Vector2, body_width: float, armor: Dictionary):
    if armor.is_empty():
        return
    var family = str(armor.get("family", ""))
    var trim = _pd_color(family).lightened(.24)

    if family == "Guard":
        draw_line(center + forward * 3.0 * scale, center - forward * 4.0 * scale, trim, maxf(1.0, .8 * scale))
        draw_line(center + forward * 2.5 * scale - right * 4.0 * body_width * scale, center + forward * 2.5 * scale + right * 4.0 * body_width * scale, trim, maxf(1.0, .7 * scale))
    elif family == "Ravager":
        draw_line(center + forward * 3.0 * scale - right * 4.0 * body_width * scale, center - forward * 4.0 * scale + right * 3.5 * body_width * scale, trim, maxf(1.0, .8 * scale))
        draw_line(center + forward * 3.0 * scale + right * 4.0 * body_width * scale, center - forward * 4.0 * scale - right * 3.5 * body_width * scale, trim, maxf(1.0, .8 * scale))
    elif family == "Ranged":
        draw_line(center + forward * 3.0 * scale - right * 4.0 * body_width * scale, center - forward * 4.0 * scale + right * 3.0 * body_width * scale, trim, maxf(1.0, .8 * scale))
    elif family == "Stealth":
        draw_line(center + forward * 3.0 * scale - right * 2.0 * body_width * scale, center + forward * 1.0 * scale, trim, maxf(1.0, .8 * scale))
        draw_line(center + forward * 3.0 * scale + right * 2.0 * body_width * scale, center + forward * 1.0 * scale, trim, maxf(1.0, .8 * scale))

func _pd_draw_hair(head_center: Vector2, scale: float, forward: Vector2, right: Vector2, style: int, hair: Color):
    if style == 4:
        return

    var crown = _pd_hair_crown(head_center, scale, forward)
    if style == 0:
        draw_circle(crown, 3.3 * scale, hair)
    elif style == 1:
        draw_circle(crown, 4.0 * scale, hair)
        draw_line(head_center - right * 3.0 * scale, crown - right * 3.0 * scale, hair, maxf(1.0, 1.3 * scale))
        draw_line(head_center + right * 3.0 * scale, crown + right * 3.0 * scale, hair, maxf(1.0, 1.3 * scale))
    elif style == 2:
        draw_circle(crown, 4.2 * scale, hair)
        draw_line(head_center - right * 3.2 * scale, head_center - right * 4.2 * scale - forward * 5.0 * scale, hair, maxf(1.0, 2.0 * scale))
        draw_line(head_center + right * 3.2 * scale, head_center + right * 4.2 * scale - forward * 5.0 * scale, hair, maxf(1.0, 2.0 * scale))
    elif style == 3:
        draw_line(head_center - forward * 1.0 * scale, crown + forward * 2.8 * scale, hair, maxf(1.0, 2.0 * scale))

func _pd_draw_headgear(head_center: Vector2, scale: float, forward: Vector2, right: Vector2, item: Dictionary):
    if item.is_empty():
        return

    var name = str(item.get("base_name", ""))
    var family = str(item.get("family", ""))
    var metal = _pd_color(family).lightened(.15)

    if name in ["Shadow Hood", "Scout Hood"]:
        draw_circle(head_center, 5.2 * scale, metal)
        draw_circle(head_center + forward * .6 * scale, 3.4 * scale, Color(.10, .11, .13))
        return

    if name == "Greathelm":
        draw_circle(head_center, 5.2 * scale, metal)
        draw_line(head_center - right * 3.2 * scale + forward * 1.0 * scale, head_center + right * 3.2 * scale + forward * 1.0 * scale, Color(.13, .14, .16), maxf(1.0, 1.2 * scale))
        return

    if name == "Open War Helm":
        draw_arc(head_center, 5.1 * scale, 0.0, TAU, 20, metal, maxf(1.0, 1.8 * scale))
        draw_line(head_center - right * 4.0 * scale + forward * 2.0 * scale, head_center - right * 5.5 * scale + forward * 5.0 * scale, metal, maxf(1.0, 1.2 * scale))
        draw_line(head_center + right * 4.0 * scale + forward * 2.0 * scale, head_center + right * 5.5 * scale + forward * 5.0 * scale, metal, maxf(1.0, 1.2 * scale))
        return

    draw_arc(head_center, 5.0 * scale, 0.0, TAU, 16, metal, maxf(1.0, 1.6 * scale))

func _draw_player_paper_doll(center: Vector2, scale: float, facing: Vector2i, appearance: Dictionary, gear: Dictionary):
    var axes = _pd_axes(facing)
    var forward: Vector2 = axes[0]
    var right: Vector2 = axes[1]
    var widths = [.85, 1.0, 1.18]
    var body_width = float(widths[clampi(int(appearance.get("body", 1)), 0, 2)])
    var skins = [Color(.92, .76, .64), Color(.76, .56, .42), Color(.50, .32, .22), Color(.30, .19, .15)]
    var hairs = [Color(.08, .07, .06), Color(.24, .13, .08), Color(.72, .56, .27), Color(.48, .18, .09), Color(.64, .66, .68)]
    var skin = skins[clampi(int(appearance.get("skin", 1)), 0, 3)]
    var hair = hairs[clampi(int(appearance.get("hair_color", 0)), 0, 4)]

    var armor = _pd_item(gear, "Armor")
    var cloak = _pd_item(gear, "Cloak")
    var head = _pd_item(gear, "Head")
    var gloves = _pd_item(gear, "Gloves")
    var belt = _pd_item(gear, "Belt")
    var boots = _pd_item(gear, "Boots")
    var primary = _pd_item(gear, "Weapon")
    var secondary = _pd_item(gear, "Offhand")

    if not cloak.is_empty():
        var cape = _pd_color(str(cloak.get("family", ""))).darkened(.18)
        draw_colored_polygon(PackedVector2Array([
            center - right * 6.0 * body_width * scale - forward * 2.0 * scale,
            center + right * 6.0 * body_width * scale - forward * 2.0 * scale,
            center + right * 7.0 * body_width * scale - forward * 10.0 * scale,
            center - right * 7.0 * body_width * scale - forward * 10.0 * scale
        ]), cape)

    var leg_color = _pd_color(str(boots.get("family", ""))).darkened(.12) if not boots.is_empty() else Color(.18, .20, .23)
    draw_line(center - right * 3.0 * body_width * scale - forward * 4.0 * scale, center - right * 3.0 * body_width * scale - forward * 11.0 * scale, leg_color, maxf(1.0, 2.5 * scale))
    draw_line(center + right * 3.0 * body_width * scale - forward * 4.0 * scale, center + right * 3.0 * body_width * scale - forward * 11.0 * scale, leg_color, maxf(1.0, 2.5 * scale))

    var torso_color = _pd_color(str(armor.get("family", ""))) if not armor.is_empty() else Color(.28, .38, .48)
    draw_colored_polygon(PackedVector2Array([
        center + forward * 4.0 * scale - right * 5.0 * body_width * scale,
        center + forward * 4.0 * scale + right * 5.0 * body_width * scale,
        center - forward * 5.0 * scale + right * 4.0 * body_width * scale,
        center - forward * 5.0 * scale - right * 4.0 * body_width * scale
    ]), torso_color)
    _pd_draw_armor_detail(center, scale, forward, right, body_width, armor)

    var arm_color = _pd_color(str(gloves.get("family", ""))) if not gloves.is_empty() else skin
    draw_line(center - right * 4.0 * body_width * scale + forward * 2.0 * scale, center - right * 7.0 * body_width * scale, arm_color, maxf(1.0, 2.4 * scale))
    draw_line(center + right * 4.0 * body_width * scale + forward * 2.0 * scale, center + right * 7.0 * body_width * scale, arm_color, maxf(1.0, 2.4 * scale))

    if not belt.is_empty():
        draw_line(center - right * 4.0 * body_width * scale - forward * 2.0 * scale, center + right * 4.0 * body_width * scale - forward * 2.0 * scale, _pd_color(str(belt.get("family", ""))).lightened(.18), maxf(1.0, 1.3 * scale))

    var head_center = _pd_head_center(center, scale, forward)
    var hair_style = clampi(int(appearance.get("hair_style", 0)), 0, 4)

    # Draw the face first. Hair grows toward the crown (forward/away from the torso),
    # never back toward the chin. Equipped headgear hides the hairstyle.
    draw_circle(head_center, 4.0 * scale, skin)
    if head.is_empty():
        _pd_draw_hair(head_center, scale, forward, right, hair_style, hair)
    else:
        _pd_draw_headgear(head_center, scale, forward, right, head)

    if not secondary.is_empty() and str(secondary.get("family", "")) == "Guard":
        _pd_draw_shield(center, scale, forward, right, secondary)
    else:
        _pd_draw_hand_item(center, scale, forward, right, secondary, -1.0)
    _pd_draw_hand_item(center, scale, forward, right, primary, 1.0)

func draw_units():
    super.draw_units()
    var center = cell_to_screen(player.pos) + Vector2(TILE / 2, TILE / 2)
    draw_circle(center, 10.6, Color(.08, .09, .11))
    var look = player.get("appearance", {})
    if typeof(look) != TYPE_DICTIONARY:
        look = {}
    _draw_player_paper_doll(center, .72, player.facing, look, equipped)
    arrow(center, player.facing, Color(1, 1, 1, .84), 14)
    if player.crouched:
        draw_circle(center, 12, Color(.55, .75, 1), false, 1)

func draw_hud():
    super.draw_hud()
    if menu_open or character_open:
        return
    draw_rect(Rect2(112, 36, 478, 24), Color(.028, .033, .040, .99))
    draw_string(font, Vector2(112, 53), "%s | %s" % [str(player.get("name", "Arena Tester")), _build_name()], HORIZONTAL_ALIGNMENT_LEFT, 478, 11, Color(.68, .82, 1))

func draw_character_overlay():
    super.draw_character_overlay()
    draw_rect(Rect2(24, 76, 664, 30), Color(.018, .021, .028, .995))
    draw_string(font, Vector2(28, 98), "%s   IDENTITY: %s" % [str(player.get("name", "Arena Tester")).to_upper(), _build_name()], HORIZONTAL_ALIGNMENT_LEFT, 510, 15, Color(.68, .82, 1))
    var look = player.get("appearance", {})
    if typeof(look) != TYPE_DICTIONARY:
        look = {}
    _draw_player_paper_doll(Vector2(620, 150), 2.2, Vector2i(0, -1), look, equipped)
    draw_string(font, Vector2(548, 194), "EQUIPPED LOOK", HORIZONTAL_ALIGNMENT_CENTER, 144, 8, Color(.58, .63, .66))
