extends "res://scripts/MainAlphaCombat.gd"

var feat_open=false
var btn_feats=Rect2(260,1118,200,84)
var btn_feat_close=Rect2(530,488,150,52)

func reset_run():
    feat_open=false;selected_feat="";super.reset_run()

func _handle_setup_touch(pos:Vector2):
    for i in range(starter_loadouts.size()):
        if _starter_rect(i).has_point(pos):selected_starter=i;queue_redraw();return
    if btn_setup_z_minus.has_point(pos):zombie_spawn_count=max(0,zombie_spawn_count-1);queue_redraw();return
    if btn_setup_z_plus.has_point(pos):zombie_spawn_count=min(40,zombie_spawn_count+1);queue_redraw();return
    if btn_setup_start.has_point(pos):_start_dungeon();return
    if btn_setup_exit.has_point(pos):exit_to_google()

func handle_touch_point(pos:Vector2):
    if setup_open:_handle_setup_touch(pos);return
    if feat_open:
        if btn_feat_close.has_point(pos):feat_open=false;queue_redraw();return
        var feats=_active_feats()
        for i in range(feats.size()):
            if _feat_row_rect(i).has_point(pos):feat_open=false;activate_feat(str(feats[i]["name"]));return
        return
    if character_open:
        if btn_char_close.has_point(pos):character_open=false;queue_redraw();return
        if btn_inv_prev.has_point(pos):inventory_page=max(0,inventory_page-1);queue_redraw();return
        if btn_inv_next.has_point(pos):inventory_page=min(max(0,int(ceil(float(inventory.size())/8.0))-1),inventory_page+1);queue_redraw();return
        for row in range(8):
            if _alpha_inventory_row_rect(row).has_point(pos):_equip_inventory_index(inventory_page*8+row);return
        return
    if not menu_open and btn_feats.has_point(pos):feat_open=true;queue_redraw();return
    super.handle_touch_point(pos)

func _feat_row_rect(index:int)->Rect2:return Rect2(70,560+index*72,580,58)
func _alpha_inventory_row_rect(row:int)->Rect2:return Rect2(36,635+row*56,648,50)

func draw_setup_screen():
    draw_rect(Rect2(0,0,SCREEN_W,SCREEN_H),Color(.018,.022,.027,1.0))
    draw_string(font,Vector2(32,48),"BOUNDLESS ADVENTURE",HORIZONTAL_ALIGNMENT_LEFT,-1,25,Color.WHITE)
    draw_string(font,Vector2(32,78),"CHOOSE A FIXED BASIC STARTER KIT",HORIZONTAL_ALIGNMENT_LEFT,656,13,Color(.72,.76,.80))
    for i in range(starter_loadouts.size()):
        var loadout:Dictionary=starter_loadouts[i];var rect=_starter_rect(i);var selected=i==selected_starter
        draw_rect(rect,Color(.15,.18,.20,.98) if selected else Color(.055,.065,.075,.98));draw_rect(rect,Color(.95,.80,.36) if selected else Color(.28,.32,.36),false,2 if selected else 1)
        var family=str(loadout.family);var gear:Dictionary=loadout.gear;var armor:Dictionary=gear["Armor"];var weapon:Dictionary=gear["Weapon"]
        var identity="rear attacks + throwing knives" if family=="Stealth" else ("bows + distance control" if family=="Ranged" else ("multi-target + shield" if family=="Guard" else "single-target execution"))
        draw_string(font,Vector2(rect.position.x+14,rect.position.y+25),family.to_upper(),HORIZONTAL_ALIGNMENT_LEFT,210,17,Color.WHITE)
        draw_string(font,Vector2(rect.position.x+220,rect.position.y+25),identity,HORIZONTAL_ALIGNMENT_LEFT,410,11,Color(.78,.82,.84))
        draw_string(font,Vector2(rect.position.x+14,rect.position.y+55),"WEAPON  %s"%str(weapon.base_name),HORIZONTAL_ALIGNMENT_LEFT,620,12,Color(.90,.92,.92))
        draw_string(font,Vector2(rect.position.x+14,rect.position.y+80),"ARMOR   %s"%str(armor.base_name),HORIZONTAL_ALIGNMENT_LEFT,620,12,Color(.90,.92,.92))
        draw_string(font,Vector2(rect.position.x+14,rect.position.y+108),"Fixed Common starter gear. New gear comes from dungeon chests.",HORIZONTAL_ALIGNMENT_LEFT,620,10,Color(.66,.70,.73))
        if selected:draw_string(font,Vector2(rect.position.x+540,rect.position.y+25),"SELECTED",HORIZONTAL_ALIGNMENT_LEFT,-1,10,Color(.95,.80,.36))
    draw_string(font,Vector2(0,858),"WALKERS IN THIS DUNGEON",HORIZONTAL_ALIGNMENT_CENTER,SCREEN_W,13,Color(.95,.80,.36))
    draw_touch_button(btn_setup_z_minus,"-",false,24);draw_string(font,Vector2(220,925),str(zombie_spawn_count),HORIZONTAL_ALIGNMENT_CENTER,280,28,Color.WHITE);draw_touch_button(btn_setup_z_plus,"+",false,24)
    draw_touch_button(btn_setup_start,"GENERATE DUNGEON",false,18);draw_touch_button(btn_setup_exit,"EXIT TO GOOGLE",false,13)
    draw_string(font,Vector2(32,1185),"4 loot chests per floor. Step onto a CHEST to roll one gear piece.",HORIZONTAL_ALIGNMENT_LEFT,656,10,Color(.65,.68,.72))
    draw_string(font,Vector2(32,1210),"Common / Uncommon / Rare / Enchanted active. Epic and magic disabled.",HORIZONTAL_ALIGNMENT_LEFT,656,10,Color(.65,.68,.72))

func draw_feat_overlay():
    draw_rect(Rect2(40,450,640,620),Color(.018,.021,.028,.99));draw_rect(Rect2(40,450,640,620),Color(.75,.68,.35),false,2)
    draw_string(font,Vector2(70,500),"ACTIVE COMBAT FEATS",HORIZONTAL_ALIGNMENT_LEFT,-1,21,Color.WHITE);draw_touch_button(btn_feat_close,"CLOSE",false,12)
    var feats=_active_feats()
    if feats.is_empty():draw_string(font,Vector2(70,575),"No weapon/offhand feats equipped.",HORIZONTAL_ALIGNMENT_LEFT,560,13,Color(.75,.78,.80));return
    for i in range(feats.size()):
        var r=_feat_row_rect(i);draw_rect(r,Color(.06,.07,.08,.97));draw_rect(r,Color(.30,.34,.37),false,1)
        draw_string(font,Vector2(r.position.x+12,r.position.y+24),str(feats[i]["name"]),HORIZONTAL_ALIGNMENT_LEFT,330,13,Color.WHITE)
        draw_string(font,Vector2(r.position.x+350,r.position.y+24),str(feats[i]["source"]),HORIZONTAL_ALIGNMENT_LEFT,180,11,Color(.70,.75,.80))
    draw_string(font,Vector2(70,1038),"Targeted feats arm your next tap. Arc/defense feats fire immediately.",HORIZONTAL_ALIGNMENT_LEFT,560,11,Color(.70,.74,.76))
