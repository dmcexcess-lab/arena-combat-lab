const assert=require('assert');
const P=require('../profiles.js');
const C=require('../core.js');
class MemoryStorage{
  constructor(seed={}){this.data=new Map(Object.entries(seed));this.calls=[];}
  getItem(key){return this.data.has(key)?this.data.get(key):null;}
  setItem(key,val){this.calls.push(['set',key]);this.data.set(key,String(val));}
  removeItem(key){this.calls.push(['remove',key]);this.data.delete(key);}
}
function makeSave(funds,heroes=1,time=1){
  return {version:6,savedAtMs:time,roster:{heroes:Array.from({length:heroes},(_,i)=>({id:'merc'+i,alive:true})),funds},
    expeditions:{entries:[]}};
}

// Fresh device creates an empty starter slot, not a forced restart on every launch.
const storage=new MemoryStorage();
const profiles=new P.ProfileStore(storage);
profiles.initialize(100);
assert.equal(profiles.activeId(),'slot1');
assert.equal(profiles.get('slot1').name,'Tavern 1');
assert.equal(profiles.read(),null);
assert.deepStrictEqual(profiles.list().slots.map(Boolean),[true,false,false]);
profiles.write('slot1',makeSave(1234,2,1000),1000);
assert.equal(profiles.read().roster.funds,1234);
assert.equal(profiles.get('slot1').summary.heroes,2);
assert.equal(profiles.get('slot1').summary.funds,1234);
assert.equal(profiles.get('slot1').updatedAtMs,1000);

// Three independent profile slots and private snapshots.
profiles.create('slot2','  Heroic   Inn  ',2000);
profiles.setActive('slot2');
assert.equal(profiles.activeId(),'slot2');
assert.equal(profiles.get('slot2').name,'Heroic Inn');
assert.equal(profiles.read(),null);
profiles.write('slot2',makeSave(77,1,2005),2005);
profiles.create('slot3','Fortune & Ale',3000);
profiles.setActive('slot3');
profiles.write('slot3',makeSave(30000,5,3005),3005);
assert.equal(profiles.read('slot1').roster.funds,1234);
assert.equal(profiles.read('slot2').roster.funds,77);
assert.equal(profiles.read('slot3').roster.funds,30000);
profiles.rename('slot2','Second Save');
assert.equal(profiles.get('slot2').name,'Second Save');
assert.throws(()=>profiles.rename('slot2','   '),/blank/);
assert.throws(()=>profiles.create('slot1','Overwrite existing'),/already exists/);
assert.throws(()=>profiles.create('slot4','Invalid'),/Unknown/);

// Restart erases ONLY selected slot. Other profiles, including their expedition
// state and wealth, remain intact. A freshly started run begins with one founder.
profiles.restart('slot2',4000);
assert.equal(profiles.read('slot2'),null);
assert.equal(profiles.get('slot2').name,'Second Save');
assert.equal(profiles.read('slot1').roster.funds,1234);
assert.equal(profiles.read('slot3').roster.funds,30000);
assert.equal(profiles.get('slot2').summary,null);
const fresh=new C.TavernRoster({funds:30});
assert.equal(fresh.aliveHeroes().length,1);
assert.equal(fresh.funds,30);
profiles.write('slot2',{version:6,savedAtMs:4001,roster:fresh.snapshot(),expeditions:new C.ExpeditionManager().snapshot()},4001);
assert.equal(profiles.read('slot2').roster.funds,30);
assert.equal(profiles.read('slot2').roster.heroes.length,1);

// Deleting active slot selects another existing profile; last slot protected.
const afterDelete=profiles.delete('slot3');
assert.equal(afterDelete,'slot1');
assert.equal(profiles.activeId(),'slot1');
assert.equal(profiles.get('slot3'),null);
assert.equal(profiles.read('slot1').roster.funds,1234);
assert.equal(profiles.read('slot2').roster.funds,30);
profiles.delete('slot2');
assert.throws(()=>profiles.delete('slot1'),/last profile/);

// Relaunch retrieves the same selection and progress.
const reopened=new P.ProfileStore(storage);
reopened.initialize(9999);
assert.equal(reopened.activeId(),'slot1');
assert.equal(reopened.read().roster.funds,1234);
assert.equal(reopened.get('slot1').updatedAtMs,1000);

// Existing single-save users transparently migrate without deleting original.
const legacySave=makeSave(98765,3,123456);
const legacy=new MemoryStorage({[P.LEGACY_KEY]:JSON.stringify(legacySave)});
const migrated=new P.ProfileStore(legacy);
migrated.initialize(200000);
assert.equal(migrated.read().roster.funds,98765);
assert.equal(migrated.get('slot1').summary.heroes,3);
assert.equal(migrated.get('slot1').updatedAtMs,123456);
assert.equal(legacy.getItem(P.LEGACY_KEY),JSON.stringify(legacySave),'original save remains a backup');
new P.ProfileStore(legacy).initialize(300000);
assert.equal(legacy.getItem(P.SLOT_PREFIX+'slot1'),JSON.stringify(legacySave),'migration does not reimport older backup');
assert.equal(legacy.getItem(P.INDEX_KEY)!==null,true);

// Malformed profiles and saves must not be automatically erased/overwritten.
const broken=new MemoryStorage({[P.INDEX_KEY]:'{corrupted'});
assert.throws(()=>new P.ProfileStore(broken).initialize(),/damaged/);
assert.equal(broken.getItem(P.INDEX_KEY),'{corrupted');
const brokenLegacy=new MemoryStorage({[P.LEGACY_KEY]:'{corrupted'});
assert.throws(()=>new P.ProfileStore(brokenLegacy).initialize(),/unreadable/);
assert.equal(brokenLegacy.getItem(P.INDEX_KEY),null);
const brokenSave=new MemoryStorage();
const damaged=new P.ProfileStore(brokenSave);
damaged.initialize();
brokenSave.setItem(P.SLOT_PREFIX+'slot1','{corrupted');
assert.throws(()=>damaged.read(),/unreadable/);
assert.equal(brokenSave.getItem(P.SLOT_PREFIX+'slot1'),'{corrupted');

// UI contains a reachable profile manager and two-step destructive confirmation.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'art','profiles.css'),'utf8');
for(const id of ['openProfiles','profileManager','profileSlots','profileConfirm',
  'confirmProfileAction','cancelProfileAction','profileMessage','closeProfiles','newTavern']){
  assert.ok(html.includes('id="'+id+'"'),'missing profile manager control '+id);
}
assert.ok(html.includes('<script src="profiles.js"></script>'));
assert.ok(html.includes('href="art/profiles.css"'));
assert.ok(css.includes('.profile-overlay[hidden]'));
assert.ok(css.includes('@media(max-width:680px)'));
assert.ok(app.includes('function renderProfileManager()'));
assert.ok(app.includes('function confirmProfileAction()'));
assert.ok(app.includes('function activateProfile(id,create=false)'));
assert.ok(app.includes('profileStore.write(profileStore.activeId()'));
assert.ok(app.includes('profileStore.restart(id)'));
assert.ok(app.includes('profileStore.delete(id)'));
assert.ok(app.includes('profileStore.read()'));
assert.ok(!app.includes('localStorage.removeItem(SAVE_KEY)'));
assert.ok(html.includes('Profiles / Restart Tavern'));

console.log('PASS Tavern Keeper save profiles',JSON.stringify({
  slots:P.MAX_SLOTS,migratesOldSave:true,slotIsolation:true,
  safeRestart:true,deleteProtection:true,corruptSavePreserved:true,
  interface:'top header + Heroes Table',confirmationRequired:true
},null,2));
