extends "res://scripts/MainAlphaWrapper.gd"

func _item_stat_text(item:Dictionary)->String:
    var parts:Array[String]=[]
    var short={"Might":"MGT","Finesse":"FIN","Awareness":"AWR","Vitality":"VIT","Will":"WIL"}
    for stat in ATTR_NAMES:
        var v=int(item["stats"].get(stat,0))
        if v!=0:parts.append("%s%+d"%[short[stat],v])
    if int(item.get("armor",0))>0:parts.append("ARM+%d"%int(item.armor))
    if int(item.get("hp_bonus",0))>0:parts.append("HP+%d"%int(item.hp_bonus))
    return " ".join(parts)

func _fatigue_word()->String:
    var f=float(player.get("fatigue",0.0))
    if f>=100:return "SPENT"
    if f>=75:return "EXHAUSTED"
    if f>=50:return "TIRED"
    if f>=25:return "WINDED"
    return "FRESH"

func draw_hud():
    super.draw_hud()
    if not menu_open and not character_open and not feat_open:
        draw_touch_button(btn_feats,"FEATS" if selected_feat=="" else selected_feat,false,13)
        draw_string(font,Vector2(18,198),"FATIGUE %d/100   %s"%[int(round(float(player.get("fatigue",0.0)))),_fatigue_word()],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.86,.86,.78))
        if int(player.get("ammo_max",0))>0:draw_string(font,Vector2(360,258),"ARROWS %d/%d"%[player.ammo,player.ammo_max],HORIZONTAL_ALIGNMENT_LEFT,-1,11,Color(.78,.82,.84))
        elif int(player.get("throwing_max",0))>0:draw_string(font,Vector2(360,258),"KNIVES %d/%d"%[player.throwing_ammo,player.throwing_max],HORIZONTAL_ALIGNMENT_LEFT,-1,11,Color(.78,.82,.84))
    if feat_open:draw_feat_overlay()

func draw_character_overlay():
    draw_rect(Rect2(0,0,SCREEN_W,SCREEN_H),Color(.018,.021,.028,.995));draw_string(font,Vector2(28,52),"CHARACTER / INVENTORY",HORIZONTAL_ALIGNMENT_LEFT,-1,23,Color.WHITE);draw_touch_button(btn_char_close,"CLOSE",false)
    var a:Dictionary=player.attrs
    draw_string(font,Vector2(28,94),"ARENA TESTER   IDENTITY: %s"%_build_name(),HORIZONTAL_ALIGNMENT_LEFT,660,16,Color(.68,.82,1))
    draw_string(font,Vector2(28,122),"MGT %d  FIN %d  AWR %d  VIT %d  WIL %d"%[a.Might,a.Finesse,a.Awareness,a.Vitality,a.Will],HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color.WHITE)
    draw_string(font,Vector2(28,147),"HP %d/%d   ARM %d (DR %d)   FEAR %d   FATIGUE %d"%[player.hp,player.max_hp,armor_total,int(floor(float(armor_total)/5.0)),player.fear,int(round(float(player.fatigue)))],HORIZONTAL_ALIGNMENT_LEFT,-1,11,Color(.80,.82,.84))
    draw_string(font,Vector2(28,174),"ARMOR SETS THE TEMPLATE. ACCESSORIES NEVER LOCK.",HORIZONTAL_ALIGNMENT_LEFT,660,11,Color(.95,.80,.36))
    for i in range(ALPHA_SLOTS.size()):
        var col=i/6;var row=i%6;var x=28.0+col*346.0;var y=205.0+row*66.0;var slot=str(ALPHA_SLOTS[i])
        draw_string(font,Vector2(x,y),slot.to_upper(),HORIZONTAL_ALIGNMENT_LEFT,-1,9,Color(.65,.68,.72));var text="- locked/empty -";var detail=""
        if equipped.has(slot):
            var item:Dictionary=equipped[slot];text=str(item.name);detail="%s | %s"%[str(item.family),_item_stat_text(item)]
        draw_string(font,Vector2(x,y+17),text,HORIZONTAL_ALIGNMENT_LEFT,326,10,Color.WHITE);draw_string(font,Vector2(x,y+34),detail,HORIZONTAL_ALIGNMENT_LEFT,326,8,Color(.70,.74,.78))
        if equipped.has(slot) and not equipped[slot]["specials"].is_empty():draw_string(font,Vector2(x,y+50),"FEATS: %s"%", ".join(equipped[slot]["specials"]),HORIZONTAL_ALIGNMENT_LEFT,326,8,Color(.85,.76,.42))
    draw_string(font,Vector2(28,610),"INVENTORY - grey items are blocked by current armor",HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color(.95,.80,.36))
    var start=inventory_page*8
    for row in range(8):
        var idx=start+row;var rect=_alpha_inventory_row_rect(row);draw_rect(rect,Color(.055,.065,.075,.96));draw_rect(rect,Color(.25,.29,.33),false,1)
        if idx<inventory.size():
            var item:Dictionary=inventory[idx];var compatible=_item_compatible_with_armor(item);var tc=Color.WHITE if compatible else Color(.42,.44,.46);var dc=Color(.72,.78,.82) if compatible else Color(.34,.36,.38);var suffix="" if compatible else " [LOCKED]"
            draw_string(font,Vector2(rect.position.x+10,rect.position.y+19),"%s [%s/%s]%s"%[item.name,item.family,item.slot,suffix],HORIZONTAL_ALIGNMENT_LEFT,620,10,tc)
            var extra=_item_stat_text(item)
            if not item["specials"].is_empty():extra+=" | F:%s"%",".join(item["specials"])
            draw_string(font,Vector2(rect.position.x+10,rect.position.y+39),extra,HORIZONTAL_ALIGNMENT_LEFT,620,8,dc)
    var pages=max(1,int(ceil(float(inventory.size())/8.0)))
    btn_inv_prev=Rect2(300,1100,120,58);btn_inv_next=Rect2(450,1100,120,58);draw_touch_button(btn_inv_prev,"PREV",false);draw_touch_button(btn_inv_next,"NEXT",false);draw_string(font,Vector2(585,1135),"%d/%d"%[inventory_page+1,pages],HORIZONTAL_ALIGNMENT_LEFT,-1,11,Color(.8,.82,.84))
    draw_string(font,Vector2(32,1195),"Chest rarity: Common 45% / Uncommon 30% / Rare 18% / Enchanted 7%.",HORIZONTAL_ALIGNMENT_LEFT,650,10,Color(.62,.66,.70))
    draw_string(font,Vector2(32,1220),"Epic disabled: no magic and no cross-class rule breaking in this alpha.",HORIZONTAL_ALIGNMENT_LEFT,650,10,Color(.62,.66,.70))
