extends "res://scripts/MainArenaBaseVisuals.gd"

func _pd_item(gear:Dictionary, slot:String)->Dictionary:
    var v=gear.get(slot,{})
    return v if typeof(v)==TYPE_DICTIONARY else {}

func _pd_color(family:String)->Color:
    if family=="Stealth":return Color(.22,.23,.31)
    if family=="Ranged":return Color(.24,.38,.25)
    if family=="Guard":return Color(.42,.48,.54)
    if family=="Ravager":return Color(.48,.24,.18)
    return Color(.30,.36,.44)

func _pd_axes(facing:Vector2i)->Array:
    var f=Vector2(float(facing.x),float(facing.y))
    if f.length_squared()<.5:f=Vector2.UP
    f=f.normalized()
    return [f,Vector2(-f.y,f.x)]

func _pd_hand(c:Vector2,s:float,f:Vector2,r:Vector2,item:Dictionary,side:float):
    if item.is_empty():return
    var p=c+r*side*7.0*s
    var family=str(item.get("family",""))
    var ink=Color(.78,.81,.84)
    var w=maxf(1.0,1.5*s)
    if family=="Ranged":
        var bend=p+r*side*5.0*s
        draw_line(p+f*10*s,bend,Color(.43,.28,.14),w)
        draw_line(bend,p-f*8*s,Color(.43,.28,.14),w)
        draw_line(p+f*10*s,p-f*8*s,Color(.78,.76,.65),maxf(1.0,.5*s))
        return
    var variant=abs(str(item.get("base_name","")).hash())%3
    var tip=p+f*(9.0+float(variant)*2.5)*s
    draw_line(p-f*3*s,tip,ink,w)
    if variant==1:draw_line(tip-r*3*s,tip+r*3*s,ink,w*1.6)
    elif variant==2:draw_circle(tip,2.2*s,ink)

func _draw_player_paper_doll(c:Vector2,s:float,facing:Vector2i,appearance:Dictionary,gear:Dictionary):
    var axes=_pd_axes(facing);var f:Vector2=axes[0];var r:Vector2=axes[1]
    var widths=[.85,1.0,1.18]
    var bw=float(widths[clampi(int(appearance.get("body",1)),0,2)])
    var skins=[Color(.92,.76,.64),Color(.76,.56,.42),Color(.50,.32,.22),Color(.30,.19,.15)]
    var hairs=[Color(.08,.07,.06),Color(.24,.13,.08),Color(.72,.56,.27),Color(.48,.18,.09),Color(.64,.66,.68)]
    var skin=skins[clampi(int(appearance.get("skin",1)),0,3)]
    var hair=hairs[clampi(int(appearance.get("hair_color",0)),0,4)]
    var armor=_pd_item(gear,"Armor");var cloak=_pd_item(gear,"Cloak");var head=_pd_item(gear,"Head")
    var gloves=_pd_item(gear,"Gloves");var belt=_pd_item(gear,"Belt");var boots=_pd_item(gear,"Boots")
    var primary=_pd_item(gear,"Weapon");var secondary=_pd_item(gear,"Offhand")
    if not cloak.is_empty():
        var cape=_pd_color(str(cloak.get("family",""))).darkened(.18)
        draw_colored_polygon(PackedVector2Array([c-r*6*bw*s-f*2*s,c+r*6*bw*s-f*2*s,c+r*7*bw*s-f*10*s,c-r*7*bw*s-f*10*s]),cape)
    var leg=_pd_color(str(boots.get("family",""))).darkened(.12) if not boots.is_empty() else Color(.18,.20,.23)
    draw_line(c-r*3*bw*s-f*4*s,c-r*3*bw*s-f*11*s,leg,maxf(1.0,2.5*s))
    draw_line(c+r*3*bw*s-f*4*s,c+r*3*bw*s-f*11*s,leg,maxf(1.0,2.5*s))
    var torso=_pd_color(str(armor.get("family",""))) if not armor.is_empty() else Color(.28,.38,.48)
    draw_colored_polygon(PackedVector2Array([c+f*4*s-r*5*bw*s,c+f*4*s+r*5*bw*s,c-f*5*s+r*4*bw*s,c-f*5*s-r*4*bw*s]),torso)
    var arms=_pd_color(str(gloves.get("family",""))) if not gloves.is_empty() else skin
    draw_line(c-r*4*bw*s+f*2*s,c-r*7*bw*s,arms,maxf(1.0,2.4*s))
    draw_line(c+r*4*bw*s+f*2*s,c+r*7*bw*s,arms,maxf(1.0,2.4*s))
    if not belt.is_empty():
        draw_line(c-r*4*bw*s-f*2*s,c+r*4*bw*s-f*2*s,_pd_color(str(belt.get("family",""))).lightened(.18),maxf(1.0,1.3*s))
    var hc=c+f*8*s;var hs=clampi(int(appearance.get("hair_style",0)),0,4)
    if hs!=4:draw_circle(hc-f*s,4.7*s,hair)
    draw_circle(hc+f*.5*s,3.8*s,skin)
    if hs==2:
        draw_line(hc-r*3*s,hc-r*4*s-f*5*s,hair,maxf(1.0,2*s))
        draw_line(hc+r*3*s,hc+r*4*s-f*5*s,hair,maxf(1.0,2*s))
    elif hs==3:draw_line(hc-f*4*s,hc+f*s,hair,maxf(1.0,1.8*s))
    if not head.is_empty():
        draw_arc(hc,5*s,0,TAU,16,_pd_color(str(head.get("family",""))).lightened(.15),maxf(1.0,1.6*s))
    if not secondary.is_empty() and str(secondary.get("family",""))=="Guard":
        var sp=c-r*7*s
        draw_circle(sp,6*s,_pd_color("Guard"));draw_circle(sp,6*s,Color(.80,.82,.83),false,maxf(1.0,s))
    else:_pd_hand(c,s,f,r,secondary,-1.0)
    _pd_hand(c,s,f,r,primary,1.0)

func draw_units():
    super.draw_units()
    var c=cell_to_screen(player.pos)+Vector2(TILE/2,TILE/2)
    draw_circle(c,10.6,Color(.08,.09,.11))
    var look=player.get("appearance",{})
    if typeof(look)!=TYPE_DICTIONARY:look={}
    _draw_player_paper_doll(c,.72,player.facing,look,equipped)
    arrow(c,player.facing,Color(1,1,1,.84),14)
    if player.crouched:draw_circle(c,12,Color(.55,.75,1),false,1)

func draw_hud():
    super.draw_hud()
    if menu_open or character_open:return
    draw_rect(Rect2(112,36,478,24),Color(.028,.033,.040,.99))
    draw_string(font,Vector2(112,53),"%s | %s"%[str(player.get("name","Arena Tester")),_build_name()],HORIZONTAL_ALIGNMENT_LEFT,478,11,Color(.68,.82,1))

func draw_character_overlay():
    super.draw_character_overlay()
    draw_rect(Rect2(24,76,664,30),Color(.018,.021,.028,.995))
    draw_string(font,Vector2(28,98),"%s   IDENTITY: %s"%[str(player.get("name","Arena Tester")).to_upper(),_build_name()],HORIZONTAL_ALIGNMENT_LEFT,510,15,Color(.68,.82,1))
    var look=player.get("appearance",{})
    if typeof(look)!=TYPE_DICTIONARY:look={}
    _draw_player_paper_doll(Vector2(620,150),2.2,Vector2i(0,-1),look,equipped)
    draw_string(font,Vector2(548,194),"EQUIPPED LOOK",HORIZONTAL_ALIGNMENT_CENTER,144,8,Color(.58,.63,.66))
