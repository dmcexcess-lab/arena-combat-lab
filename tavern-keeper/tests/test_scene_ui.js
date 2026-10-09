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
assert.ok(html.includes('id="jobHeroSelect"'));
assert.ok(html.includes('id="jobDeploy"'));
assert.ok(!html.includes('data-speed='));
assert.ok(!html.includes('id="deploy"'));
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


// The published illustrated scene is assembled from real independent vector sprites,
// not a static screenshot pretending to animate. Actor positions still come from the simulation.
const sceneCss=fs.readFileSync(path.join(root,'art','scene.css'),'utf8');
const roomArt=fs.readFileSync(path.join(root,'art','room.svg'),'utf8');
const propArt=fs.readFileSync(path.join(root,'art','props.svg'),'utf8');
const figureArt=fs.readFileSync(path.join(root,'art','figures.svg'),'utf8');
assert.ok(html.includes('href="art/scene.css"'));
assert.ok(html.includes('id="sceneViewport"'));
assert.ok(html.includes('data-scene-pan="interior"'));
assert.ok(html.includes('data-scene-pan="outside"'));
assert.equal((html.match(/class="prop-sprite"/g)||[]).length,8);
for(const prop of ['contracts','map','chronicle','workshop','heroes','bar','merchant','door']){
  assert.ok(propArt.includes('id="prop-'+prop+'"'),'missing illustrated prop '+prop);
  assert.ok(html.includes('href="art/props.svg#prop-'+prop+'"'),'missing live prop rendering '+prop);
}
for(const figure of ['laborer','traveler','adventurer','merchant','hero','server','applicant','mage','dwarf']){
  assert.ok(figureArt.includes('id="figure-'+figure+'"'),'missing fantasy character sprite '+figure);
}
assert.ok(roomArt.includes('viewBox="0 0 1200 760"'));
assert.ok(sceneCss.includes('url("room.svg")'),'scene must use illustrated art as its floor and exterior');
assert.ok(sceneCss.includes('.scene-viewport{'),'room must support camera scrolling');
assert.ok(sceneCss.includes('width:900px'),'phone needs a readable stable-scale world');
assert.ok(sceneCss.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(app.includes('function sceneFigure(kind,index=0)'));
assert.ok(app.includes('sceneActorHtml(kind,Number(String(key)'));
assert.ok(app.includes("viewport.scrollTo({left:right?viewport.scrollWidth"));
assert.ok(html.includes('aria-label="Scrollable top-down tavern and exterior"'));

console.log('PASS scene UI',JSON.stringify({
  screens:screenNames,
  hotspots,
  animations:8,
  spatialSimulation:true,
  exteriorQueue:true,
  defaultScreen:'scene'
},null,2));
