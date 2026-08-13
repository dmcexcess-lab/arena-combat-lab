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

func _fear_word()->String:
    var f=int(player.get("fear",0))
    if f>=100:return "BREAK"
    if f>=75:return "PANICKED"
    if f>=50:return "FRIGHTENED"
    if f>=25:return "PRESSURED"
    return "STEADY"

func _draw_feat_button(index:int,feat:Dictionary):
    var r=_feat_button_rect(index)
    var name=str(feat["name"])
    var left=feat_cd_left(name)
    var selected=name==selected_feat
    var spent=float(player.get("fatigue",0.0))>=100.0
    var fill=Color(.18,.20,.13,.98) if selected else (Color(.055,.065,.075,.98) if left<=0 and not spent else Color(.035,.040,.045,.94))
    var edge=Color(.95,.80,.36) if selected else (Color(.60,.66,.68) if left<=0 and not spent else Color(.26,.29,.31))
    draw_rect(r,fill);draw_rect(r,edge,false,2 if selected else 1)
    var label=name.left(18)
    draw_string(font,Vector2(r.position.x+6,r.position.y+25),label,HORIZONTAL_ALIGNMENT_CENTER,r.size.x-12,11,Color.WHITE if left<=0 and not spent else Color(.50,.53,.55))
    var state="ARMED" if selected else ("%dt"%left if left>0 else ("SPENT" if spent else "READY"))
    draw_string(font,Vector2(r.position.x+6,r.position.y+48),state,HORIZONTAL_ALIGNMENT_CENTER,r.size.x-12,10,Color(.95,.80,.36) if selected else Color(.72,.76,.78))
    draw_string(font,Vector2(r.position.x+6,r.position.y+68),str(feat["source"]).to_upper(),HORIZONTAL_ALIGNMENT_CENTER,r.size.x-12,8,Color(.48,.53,.56))
    if left>0:
        var total=max(1,feat_cd_total(name));var pct=clampf(1.0-float(left)/float(total),0.0,1.0)
        draw_rect(Rect2(r.position.x+3,r.end.y-5,(r.size.x-6)*pct,3),Color(.70,.72,.62))

func draw_hud():
    # Compact status header. The map now owns most of the portrait screen.
    draw_rect(Rect2(0,0,SCREEN_W,COMBAT_MAP_TOP),Color(.028,.033,.040,.99))
    draw_rect(Rect2(0,COMBAT_MAP_TOP-2,SCREEN_W,2),Color(.38,.42,.46))
    if not menu_open and not character_open:
        draw_touch_button(btn_menu,"MENU",false,11);draw_touch_button(btn_character,"CHAR",false,11)
    draw_string(font,Vector2(112,30),"BOUNDLESS ADVENTURE",HORIZONTAL_ALIGNMENT_LEFT,470,19,Color.WHITE)
    draw_string(font,Vector2(112,53),"%s  |  %s"%[_build_name(),str(player.weapon.name)],HORIZONTAL_ALIGNMENT_LEFT,470,12,Color(.68,.82,1))
    draw_string(font,Vector2(18,84),"HP %d/%d   ARM %d/DR%d   FEAR %d %s"%[player.hp,player.max_hp,armor_total,int(floor(float(armor_total)/5.0)),player.fear,_fear_word()],HORIZONTAL_ALIGNMENT_LEFT,684,11,Color.WHITE)
    draw_string(font,Vector2(18,107),"FATIGUE %d %s   TICK %d"%[int(round(float(player.get("fatigue",0.0)))),_fatigue_word(),tick],HORIZONTAL_ALIGNMENT_LEFT,500,11,Color(.86,.86,.78))
    var ammo=""
    if int(player.get("ammo_max",0))>0:ammo="ARROWS %d/%d"%[player.ammo,player.ammo_max]
    elif int(player.get("throwing_max",0))>0:ammo="KNIVES %d/%d"%[player.throwing_ammo,player.throwing_max]
    if ammo!="":draw_string(font,Vector2(500,107),ammo,HORIZONTAL_ALIGNMENT_LEFT,200,10,Color(.78,.82,.84))
    var status="ARMED: %s - TAP TARGET"%selected_feat if selected_feat!="" else msg
    draw_string(font,Vector2(18,136),status,HORIZONTAL_ALIGNMENT_LEFT,684,10,Color(.95,.80,.36) if selected_feat!="" else Color(.80,.83,.80))
    draw_string(font,Vector2(18,157),"Tap enemy = attack   Tap door = open/close   WASD desktop / pad mobile",HORIZONTAL_ALIGNMENT_LEFT,684,9,Color(.58,.63,.66))
    if any_zombie_spotted_player() and not game_over:
        draw_string(font,Vector2(0,204),"!! SPOTTED !!",HORIZONTAL_ALIGNMENT_CENTER,SCREEN_W,19,Color(1,.24,.18))

    # Mobile combat deck: movement left, live feats right.
    draw_rect(Rect2(0,COMBAT_DECK_TOP,SCREEN_W,SCREEN_H-COMBAT_DECK_TOP),Color(.022,.027,.032,.99))
    draw_rect(Rect2(0,COMBAT_DECK_TOP,SCREEN_W,2),Color(.38,.42,.46))
    draw_touch_button(_move_forward_rect(),"FORWARD",false,11)
    draw_touch_button(_turn_left_rect(),"TURN L",false,11)
    draw_touch_button(_crouch_rect(),"CROUCH",player.crouched,10)
    draw_touch_button(_turn_right_rect(),"TURN R",false,11)
    draw_touch_button(_move_back_rect(),"BACK",false,11)
    var feats=_active_feats()
    for i in range(min(6,feats.size())):_draw_feat_button(i,feats[i])
    if feats.is_empty():draw_string(font,Vector2(380,1000),"NO EQUIPPED FEATS",HORIZONTAL_ALIGNMENT_CENTER,320,12,Color(.55,.58,.60))
    draw_string(font,Vector2(18,1264),"Feat cooldowns use combat ticks. 1-6 selects feats on desktop.",HORIZONTAL_ALIGNMENT_LEFT,680,9,Color(.52,.56,.59))

    if game_over:
        draw_rect(Rect2(120,720,480,100),Color(.02,.025,.02,.94));draw_rect(Rect2(120,720,480,100),Color(.85,.72,.30),false,2)
        draw_string(font,Vector2(150,762),"OBJECTIVE COMPLETE" if won else "RUN FAILED",HORIZONTAL_ALIGNMENT_LEFT,-1,23,Color.WHITE)
        draw_string(font,Vector2(150,792),"MENU > NEW SETUP",HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color(.8,.82,.8))
    if menu_open:draw_menu_overlay()
    if character_open:draw_character_overlay()

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
