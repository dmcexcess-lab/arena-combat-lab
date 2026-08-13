extends "res://scripts/MainAlphaCombat.gd"

const COMBAT_MAP_TOP := 176.0
const COMBAT_DECK_TOP := 930.0
const FEAT_CD := {
"Backstab":180,"Quick Cut":120,"Hamstring":220,"Feint":160,"Deep Cut":220,"Disengaging Cut":180,
"Throw Knife":100,"Quick Toss":120,"Low Toss":180,"Double Toss":240,"Silent Toss":160,
"Snap Shot":140,"Power Shot":240,"Piercing Bolt":260,"Pinning Shot":220,"Precise Shot":180,"Driving Shot":240,
"Sweep":220,"Cleave":180,"Crowd Shove":260,"Driving Blow":220,"Guarded Strike":200,"Wide Arc":280,
"Block":160,"Shield Bash":180,"Brace":220,"Hold Ground":280,
"Execution":220,"Focused Strike":180,"Crushing Blow":300,"Opening Blow":240,"Relentless Strike":180,"Overhead Smash":300}
const NOW_FEATS := ["Sweep","Crowd Shove","Wide Arc","Block","Brace","Hold Ground"]

var feat_open=false
var feat_ready_at={}

func reset_run():
    feat_open=false;selected_feat="";feat_ready_at.clear();super.reset_run()

func feat_cd_left(feat:String)->int:
    return maxi(0,int(feat_ready_at.get(feat,0))-tick)

func feat_cd_total(feat:String)->int:
    return int(FEAT_CD.get(feat,180))

func _begin_cd(feat:String,start_tick:int):
    feat_ready_at[feat]=start_tick+feat_cd_total(feat);queue_redraw()

func activate_feat(feat:String):
    if feat_cd_left(feat)>0:
        msg="%s ready in %d ticks."%[feat,feat_cd_left(feat)];queue_redraw();return
    if float(player.get("fatigue",0.0))>=100.0:
        msg="Too fatigued for special attacks.";queue_redraw();return
    if feat in NOW_FEATS:
        var started=tick;super.activate_feat(feat)
        if tick>started:_begin_cd(feat,started)
        return
    selected_feat="" if selected_feat==feat else feat
    msg="Feat cancelled." if selected_feat=="" else "%s selected - tap a target."%feat
    queue_redraw()

func _use_target_feat(zi:int,feat:String):
    if feat_cd_left(feat)>0:
        msg="%s ready in %d ticks."%[feat,feat_cd_left(feat)];queue_redraw();return
    var started=tick;super._use_target_feat(zi,feat)
    if tick>started:_begin_cd(feat,started)

func melee(target:Vector2i):
    if selected_feat!="":
        var zi=zombie_at(target)
        if zi!=-1:
            var feat=selected_feat;selected_feat="";_use_target_feat(zi,feat);return
    super.melee(target)

func _handle_setup_touch(pos:Vector2):
    for i in range(starter_loadouts.size()):
        if _starter_rect(i).has_point(pos):selected_starter=i;queue_redraw();return
    if btn_setup_z_minus.has_point(pos):zombie_spawn_count=max(0,zombie_spawn_count-1);queue_redraw();return
    if btn_setup_z_plus.has_point(pos):zombie_spawn_count=min(40,zombie_spawn_count+1);queue_redraw();return
    if btn_setup_start.has_point(pos):_start_dungeon();return
    if btn_setup_exit.has_point(pos):exit_to_google()

func _move_forward_rect()->Rect2:return Rect2(105,950,110,58)
func _turn_left_rect()->Rect2:return Rect2(22,1018,110,68)
func _crouch_rect()->Rect2:return Rect2(142,1018,94,68)
func _turn_right_rect()->Rect2:return Rect2(246,1018,110,68)
func _move_back_rect()->Rect2:return Rect2(105,1096,110,58)
func _feat_button_rect(index:int)->Rect2:
    var col=index%2;var row=index/2
    return Rect2(372+col*170,950+row*96,160,84)
func _alpha_inventory_row_rect(row:int)->Rect2:return Rect2(36,635+row*56,648,50)

func map_draw_origin()->Vector2:
    var scaled_left=ORIGIN.x*MAP_SCALE
    var scaled_right=(ORIGIN.x+W*TILE)*MAP_SCALE
    var left_aligned=-scaled_left
    var right_aligned=SCREEN_W-scaled_right
    var player_center=(ORIGIN.x+(float(player.pos.x)+.5)*TILE)*MAP_SCALE
    var ideal_x=SCREEN_W*.5-player_center
    var x:float=clampf(ideal_x,right_aligned,left_aligned)
    return Vector2(x,COMBAT_MAP_TOP-ORIGIN.y*MAP_SCALE)

func screen_to_game(pos:Vector2)->Vector2:
    return (pos-map_draw_origin())/MAP_SCALE

func _unhandled_input(e):
    if not setup_open and not menu_open and not character_open and e is InputEventKey and e.pressed and not e.echo:
        var idx=-1
        if e.keycode>=KEY_1 and e.keycode<=KEY_6:idx=int(e.keycode-KEY_1)
        if idx>=0:
            var feats=_active_feats()
            if idx<feats.size():activate_feat(str(feats[idx]["name"]));get_viewport().set_input_as_handled();return
    super._unhandled_input(e)

func handle_touch_point(pos:Vector2):
    if setup_open:_handle_setup_touch(pos);return
    if character_open:
        if btn_char_close.has_point(pos):character_open=false;queue_redraw();return
        if btn_inv_prev.has_point(pos):inventory_page=max(0,inventory_page-1);queue_redraw();return
        if btn_inv_next.has_point(pos):inventory_page=min(max(0,int(ceil(float(inventory.size())/8.0))-1),inventory_page+1);queue_redraw();return
        for row in range(8):
            if _alpha_inventory_row_rect(row).has_point(pos):_equip_inventory_index(inventory_page*8+row);return
        return
    if menu_open:super.handle_touch_point(pos);return
    if btn_menu.has_point(pos):menu_open=true;queue_redraw();return
    if btn_character.has_point(pos):character_open=true;queue_redraw();return

    var feats=_active_feats()
    for i in range(min(6,feats.size())):
        if _feat_button_rect(i).has_point(pos):activate_feat(str(feats[i]["name"]));return

    if _move_forward_rect().has_point(pos):step_forward();return
    if _move_back_rect().has_point(pos):step_backward();return
    if _turn_left_rect().has_point(pos):rotate_player(-1);return
    if _turn_right_rect().has_point(pos):rotate_player(1);return
    if _crouch_rect().has_point(pos):toggle_crouch();return

    if pos.y<COMBAT_MAP_TOP or pos.y>=COMBAT_DECK_TOP or game_over:return
    var cell=screen_to_cell(screen_to_game(pos))
    if not inside(cell):return
    var delta:Vector2i=cell-player.pos
    if manhattan(player.pos,cell)==1:
        player.facing=delta;recalc_visibility();refresh_intents()
        if zombie_at(cell)!=-1:
            click_target(cell);return
        if doors.has(cell):interact();return
        try_move(delta,false);return
    if visible_cells.has(cell) and (zombie_at(cell)!=-1 or barrels.has(cell)):
        click_target(cell);return
    msg="Tap enemies to attack, doors to open/close, or use the movement pad.";queue_redraw()

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
