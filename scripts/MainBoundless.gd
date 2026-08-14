extends "res://scripts/MainMobileWeb.gd"

# Boundless run shell: setup/run state, shared Arena map helpers, menu and ranged casks.
const ATTR_NAMES := ["Might","Finesse","Awareness","Vitality","Will"]
const WALKER_HP := 12
const WALKER_HIT := 0.45
const WALKER_DMIN := 3
const WALKER_DMAX := 5
const WALKER_MOVE := 130
const WALKER_ATTACK := 105
const WALKER_SIGHT := 7
const WALKER_HEARING := 12

var zombie_spawn_count = 12
var dungeon_rooms: Array = []
var floor_cells: Array = []
var inventory: Array = []
var equipped = {}
var build_affinity = {"Stealth":0,"Ranged":0,"Guard":0,"Ravager":0}
var armor_total = 0
var character_open = false
var inventory_page = 0
var setup_open = true
var run_started = false
var starter_loadouts: Array = []
var selected_starter = 0

var btn_character = Rect2(602,12,106,48)
var btn_char_close = Rect2(588,28,112,48)
var btn_inv_prev = Rect2(300,1160,120,62)
var btn_inv_next = Rect2(450,1160,120,62)
var btn_setup_z_minus = Rect2(100,884,120,58)
var btn_setup_z_plus = Rect2(500,884,120,58)
var btn_setup_start = Rect2(90,992,540,74)
var btn_setup_exit = Rect2(210,1090,300,54)

func _ready():
    alarm = Vector2i(-99,-99)
    super._ready()

func reset_run():
    character_open = false
    inventory_page = 0
    if not run_started:
        _open_setup()
        return
    super.reset_run()
    msg = "Find the cache and return to the stair."
    submsg = "Equipment creates the build; every creature already exists in the arena."
    queue_redraw()

func _open_setup():
    setup_open = true
    run_started = false
    menu_open = false
    character_open = false
    game_over = false
    won = false
    if starter_loadouts.is_empty(): _roll_starting_loadouts()
    queue_redraw()

func _roll_starting_loadouts(): pass
func draw_setup_screen(): pass

func _start_dungeon():
    if starter_loadouts.is_empty(): _roll_starting_loadouts()
    selected_starter = clampi(selected_starter,0,starter_loadouts.size()-1)
    setup_open = false
    run_started = true
    menu_open = false
    character_open = false
    super.reset_run()
    msg = "Arena generated. Find the cache and return to this stair."
    submsg = "%s kit selected." % str(starter_loadouts[selected_starter].family)
    queue_redraw()

# Shared carving primitives used by the current Arena generator.
func _carve_room(room: Rect2i):
    for y in range(room.position.y,room.end.y):
        for x in range(room.position.x,room.end.x): walls.erase(Vector2i(x,y))

func _room_center(room: Rect2i) -> Vector2i:
    return Vector2i(room.position.x + room.size.x/2, room.position.y + room.size.y/2)

func _carve_h(x1: int, x2: int, y: int):
    for x in range(min(x1,x2),max(x1,x2)+1):
        var p = Vector2i(x,y)
        if inside(p): walls.erase(p)

func _carve_v(y1: int, y2: int, x: int):
    for y in range(min(y1,y2),max(y1,y2)+1):
        var p = Vector2i(x,y)
        if inside(p): walls.erase(p)

func _fists() -> Dictionary:
    return {"name":"Fists","dmin":2,"dmax":3,"time":100,"fatigue":2,"noise":4,"push":0,"ranged":false,"heavy":false}

func shoot_barrel(cell: Vector2i):
    if player.gun == "" or int(player.ammo) <= 0:
        msg = "Need a ranged weapon."
        queue_redraw()
        return
    player.ammo -= 1
    stats.shots += 1
    barrels.erase(cell)
    msg = "Cask detonates."
    for i in range(zombies.size()):
        if zombies[i].dead: continue
        var distance = manhattan(cell,zombies[i].pos)
        if distance <= 3:
            zombies[i].hp -= max(3,rng.randi_range(10,17)-distance*2)
            if int(zombies[i].hp) <= 0: kill_zombie(i,false)
            else: push_zombie(i,dominant(zombies[i].pos-cell))
    if manhattan(cell,player.pos) <= 3:
        hurt(max(1,12-manhattan(cell,player.pos)*3),"blast")
    emit_noise(cell,125,"explosion",false)
    commit_action(int(player.weapon.get("rtime",92)))

func _unhandled_input(e):
    if setup_open:
        if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_ENTER:
            _start_dungeon()
            get_viewport().set_input_as_handled()
            return
        if e is InputEventScreenTouch or e is InputEventMouseButton: super._unhandled_input(e)
        return
    if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_I:
        character_open = not character_open
        queue_redraw()
        get_viewport().set_input_as_handled()
        return
    super._unhandled_input(e)

func handle_touch_point(pos: Vector2):
    if menu_open and btn_menu_new.has_point(pos):
        _open_setup()
        return
    super.handle_touch_point(pos)

func _starter_rect(index: int) -> Rect2: return Rect2(32,194+index*158,656,142)

func _draw():
    if setup_open:
        draw_setup_screen()
        return
    super._draw()

func draw_menu_overlay():
    draw_rect(Rect2(0,0,SCREEN_W,SCREEN_H),Color(0,0,0,.76))
    draw_rect(Rect2(70,390,580,430),Color(.035,.04,.05,.995))
    draw_rect(Rect2(70,390,580,430),Color(.75,.68,.35),false,2)
    draw_string(font,Vector2(110,438),"BOUNDLESS ADVENTURE",HORIZONTAL_ALIGNMENT_LEFT,-1,23,Color.WHITE)
    draw_touch_button(btn_resume,"RESUME",false)
    draw_touch_button(btn_menu_new,"DEV SCREEN",false)
    draw_touch_button(btn_exit_google,"EXIT TO GOOGLE",false)
    draw_string(font,Vector2(110,790),"Dev Screen creates a new test character + Arena scenario.",HORIZONTAL_ALIGNMENT_LEFT,500,11,Color(.72,.75,.72))
