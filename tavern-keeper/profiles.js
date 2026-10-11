/* Tavern Keeper local save-slot manager. No network/cloud storage. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.TavernKeeperProfiles=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const LEGACY_KEY='tavernKeeper.reputationBoard.v1';
  const INDEX_KEY='tavernKeeper.profiles.v1';
  const SLOT_PREFIX='tavernKeeper.saveSlot.v1.';
  const MAX_SLOTS=3;
  const ids=['slot1','slot2','slot3'];
  const slotKey=id=>SLOT_PREFIX+id;
  function checkId(id){if(!ids.includes(id))throw Error('Unknown profile slot');return id;}
  function nameFor(id){return 'Tavern '+(ids.indexOf(id)+1);}
  function cleanName(name){
    const result=String(name==null?'':name).trim().replace(/\s+/g,' ').slice(0,32);
    if(!result)throw Error('Profile name cannot be blank');
    return result;
  }
  function validateSave(save){
    if(!save||typeof save!=='object'||!save.roster||!Array.isArray(save.roster.heroes))throw Error('Invalid Tavern Keeper save');
    return save;
  }
  function summarise(save){
    return {funds:Math.round((Number(save.roster.funds)||0)*10)/10,
      heroes:save.roster.heroes.filter(h=>h&&h.alive!==false).length,
      expeditions:Array.isArray(save.expeditions?.entries)?save.expeditions.entries.filter(e=>e.expedition?.state==='deployed').length:0};
  }
  function clone(o){return JSON.parse(JSON.stringify(o));}
  class ProfileStore{
    constructor(storage){
      if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Browser storage unavailable');
      this.storage=storage;
      this.data=null;
    }
    initialize(now=Date.now()){
      const raw=this.storage.getItem(INDEX_KEY);
      if(raw!==null){
        let data;
        try{data=JSON.parse(raw);}catch(_){throw Error('Profile index is damaged; existing saves have not been changed');}
        if(data?.version!==1||!Array.isArray(data.slots)||data.slots.length!==MAX_SLOTS||
          !ids.includes(data.activeId)||
          data.slots.some((slot,i)=>slot!==null&&(slot.id!==ids[i]||typeof slot.name!=='string'))||
          !data.slots.some(slot=>slot?.id===data.activeId)){
          throw Error('Profile index is invalid; existing saves have not been changed');
        }
        this.data=data;
        return this.list();
      }
      const existing=this.storage.getItem(LEGACY_KEY);
      let migrated=null;
      if(existing!==null){
        try{migrated=validateSave(JSON.parse(existing));}
        catch(_){throw Error('Legacy save is unreadable; it was not overwritten');}
      }
      const first={id:'slot1',name:'Tavern 1',createdAtMs:now,updatedAtMs:migrated?(Number(migrated.savedAtMs)||now):null,summary:migrated?summarise(migrated):null};
      const data={version:1,activeId:'slot1',slots:[first,null,null]};
      // Commit the migrated copy before the manifest; preserve the old save as backup.
      if(migrated)this.storage.setItem(slotKey('slot1'),existing);
      this.storage.setItem(INDEX_KEY,JSON.stringify(data));
      this.data=data;
      return this.list();
    }
    ensure(){if(!this.data)this.initialize();return this.data;}
    list(){return clone(this.ensure());}
    activeId(){return this.ensure().activeId;}
    get(id){checkId(id);return this.ensure().slots[ids.indexOf(id)];}
    saveIndex(next){this.storage.setItem(INDEX_KEY,JSON.stringify(next));this.data=next;}
    read(id=this.activeId()){
      if(!this.get(id))throw Error('Profile slot is empty');
      const raw=this.storage.getItem(slotKey(id));
      if(raw===null)return null;
      let save;
      try{save=validateSave(JSON.parse(raw));}
      catch(_){throw Error('Profile save is unreadable; it was not overwritten');}
      return save;
    }
    write(id,save,now=Date.now()){
      if(!this.get(id))throw Error('Profile slot is empty');
      validateSave(save);
      const next=this.list();
      const ix=ids.indexOf(id);
      next.slots[ix].updatedAtMs=now;
      next.slots[ix].summary=summarise(save);
      // Preserve a valid snapshot even if updating index fails.
      this.storage.setItem(slotKey(id),JSON.stringify(save));
      this.saveIndex(next);
    }
    create(id,name=nameFor(id),now=Date.now()){
      checkId(id);
      if(this.get(id))throw Error('That profile already exists');
      const next=this.list();
      next.slots[ids.indexOf(id)]={id,name:cleanName(name),createdAtMs:now,updatedAtMs:null,summary:null};
      this.saveIndex(next);
      return this.get(id);
    }
    setActive(id){
      if(!this.get(id))throw Error('Cannot select an empty profile');
      const next=this.list();next.activeId=id;this.saveIndex(next);
    }
    rename(id,name){
      if(!this.get(id))throw Error('Cannot rename an empty profile');
      const next=this.list();next.slots[ids.indexOf(id)].name=cleanName(name);this.saveIndex(next);
      return next.slots[ids.indexOf(id)].name;
    }
    restart(id,now=Date.now()){
      if(!this.get(id))throw Error('Cannot restart an empty profile');
      // Keep the slot and its name; remove all roster, money and adventure progress.
      const next=this.list(),meta=next.slots[ids.indexOf(id)];
      meta.updatedAtMs=null;meta.summary=null;meta.createdAtMs=now;
      this.storage.removeItem(slotKey(id));
      this.saveIndex(next);
    }
    delete(id){
      if(!this.get(id))throw Error('Cannot delete an empty profile');
      const next=this.list();
      if(next.slots.filter(Boolean).length===1)throw Error('The last profile cannot be deleted; use Restart instead');
      next.slots[ids.indexOf(id)]=null;
      if(next.activeId===id)next.activeId=next.slots.find(Boolean).id;
      this.saveIndex(next);
      this.storage.removeItem(slotKey(id));
      return next.activeId;
    }
  }
  return {ProfileStore,LEGACY_KEY,INDEX_KEY,SLOT_PREFIX,MAX_SLOTS,ids,cleanName};
});
