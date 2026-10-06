const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');

const screenNames=[...html.matchAll(/class="[^"]*\bapp-screen\b[^"]*"[^>]*data-screen="([^"]+)"/g)].map(m=>m[1]);
const expected=['scene','tavern','merchant','applicants','workshop','contracts','chronicle','heroes','expeditions'];
assert.deepStrictEqual(screenNames,expected);
assert.equal(new Set(screenNames).size,screenNames.length);

const hotspots=[...html.matchAll(/data-open-screen="([^"]+)"/g)].map(m=>m[1]);
assert.equal(hotspots.length,8);
assert.deepStrictEqual([...hotspots].sort(),expected.filter(x=>x!=='scene').sort());
assert.equal((html.match(/data-back-tavern/g)||[]).length,8);

// The room itself is the default presentation and contains physical, tappable destinations.
assert.ok(html.includes('class="tavern-room"'));
for(const id of ['sceneOutside','scenePatrons','sceneHeroes','sceneVisitor','sceneStaff','sceneToast'])assert.ok(html.includes('id="'+id+'"'));
for(const cls of ['contract-board-object','wall-map-object','ledger-object','workshop-object','hero-table-object','bar-object','merchant-object','door-object']){
  assert.ok(html.includes(cls),'missing physical scene object '+cls);
}

// Each old subsystem is still present, but behind a focused screen rather than in one global dashboard.
for(const cls of ['economy-panel','merchant-panel','applicant-panel','crafting-panel','contract-board-panel','chronicle-panel','roster-panel','tavern','expedition','summary']){
  assert.ok(html.includes(cls),'missing subsystem '+cls);
}
assert.ok(html.indexOf('data-screen="scene"')<html.indexOf('data-screen="tavern"'),'scene must be the first app screen');

// Runtime navigation and live-scene projection.
assert.ok(app.includes("currentScreen='scene'"));
assert.ok(app.includes('function openScreen(name)'));
assert.ok(app.includes("openScreen('scene')"));
assert.ok(app.includes("openScreen('expeditions')"));
assert.ok(app.includes("document.querySelectorAll('[data-open-screen]')"));
assert.ok(app.includes("document.querySelectorAll('[data-back-tavern]')"));
assert.ok(app.includes("if(e.key==='Escape'&&currentScreen!=='scene')openScreen('scene')"));
assert.ok(app.includes('function renderScene(force=false)'));
assert.ok(app.includes('roster.tavern'));
assert.ok(app.includes('expeditions.activeEntries()'));
assert.ok(app.includes('roster.aliveHeroes().filter'));
assert.ok(app.includes('roster.merchants.active'));
assert.ok(app.includes('roster.recruitment.active'));
assert.ok(app.includes("tavern.queue.forEach(function(p,i)"));
assert.ok(app.includes("tavern.active.forEach(function(p,i)"));
assert.ok(app.includes("homeHeroes.slice(0,6).map(function(h,i)"));

// Patrons have persistent spatial identity and state-driven paths rather than looping position animation.
assert.ok(app.includes('scenePatronActors=new Map()'));
assert.ok(app.includes('sceneStaffActors=new Map()'));
assert.ok(app.includes('function syncPatronSceneActors(tavern)'));
assert.ok(app.includes('function syncStaffSceneActors(tavern)'));
assert.ok(app.includes('function routeSceneActor('));
assert.ok(app.includes('function sceneMotionFrame(now)'));
assert.ok(app.includes('requestAnimationFrame(sceneMotionFrame)'));
assert.ok(app.includes("phase='leaving'"));
assert.ok(app.includes("goalKey:''"));
assert.ok(app.includes('removeWhenDone'));
assert.ok(app.includes('SCENE_GEOMETRY.doorOutside'));
assert.ok(app.includes('SCENE_GEOMETRY.doorInside'));

// Exterior geometry owns the door and queue.
assert.ok(html.includes('class="outside-yard"'));
assert.ok(html.includes('class="queue-marker"'));
assert.ok(html.includes('exterior-door'));
assert.ok(css.includes('.outside-yard{'));
assert.ok(css.includes('.door-object{left:81.5%'));
assert.ok(app.includes('queue:[[91,58],[94,64],[91,70],[95,76],[90,82]]'));
assert.ok(app.includes("94,53,62,'present outside'"));

// Scene membership rendering remains signature-gated for heroes/visitors.
assert.ok(app.includes('sceneSignature'));
assert.ok(app.includes('if(!force&&sig===sceneSignature)return'));

// Animated tavern visual contract: ambience loops, people translate from simulation state.
for(const anim of ['rainDrop','fireGlow','flame','lampFlicker','mugLift','walkBob','walkLegs','serveArm']){
  assert.ok(css.includes('@keyframes '+anim),'missing animation '+anim);
}
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(css.includes('pointer-events:none'));
assert.ok(css.includes('.scene-object:hover'));
assert.ok(css.includes('.app-screen{display:none}'));
assert.ok(css.includes('.app-screen.active{display:block}'));
assert.ok(css.includes('.focused-grid{display:grid'));
assert.ok(css.includes('@media(max-width:620px)'));

// Touch interaction remains large enough on coarse-pointer devices.
assert.ok(css.includes('@media(hover:none),(pointer:coarse)'));
assert.ok(css.includes('button{min-height:44px}'));

console.log('PASS scene UI',JSON.stringify({
  screens:screenNames,
  hotspots,
  animations:8,
  spatialSimulation:true,
  exteriorQueue:true,
  defaultScreen:'scene'
},null,2));
