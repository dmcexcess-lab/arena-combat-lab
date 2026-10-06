(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TavernKeeperCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  class RNG {
    constructor(seed=123456789){ this.state = (seed >>> 0) || 1; }
    nextU32(){
      let x = this.state;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      this.state = x >>> 0;
      return this.state;
    }
    float(){ return this.nextU32() / 4294967296; }
    range(min,max){ return min + (max-min)*this.float(); }
    int(min,max){ return Math.floor(this.range(min,max+1)); }
    chance(p){ return this.float() < p; }
    pick(arr){ return arr[Math.floor(this.float()*arr.length)]; }
  }

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  const EQUIPMENT = {
    rusty_sword:{id:'rusty_sword',name:'Rusty Sword',slot:'weapon',kind:'melee',damage:7,range:0,defense:0,weight:1},
    hunting_bow:{id:'hunting_bow',name:'Hunting Bow',slot:'weapon',kind:'ranged',damage:6,range:1,defense:0,weight:1},
    wood_axe:{id:'wood_axe',name:'Wood Axe',slot:'weapon',kind:'melee',damage:5,range:0,defense:0,weight:1},
    padded_armor:{id:'padded_armor',name:'Padded Armor',slot:'armor',kind:'armor',damage:0,range:0,defense:2,weight:2},
    leather_armor:{id:'leather_armor',name:'Leather Armor',slot:'armor',kind:'armor',damage:0,range:0,defense:3,weight:2},
    healing_potion:{id:'healing_potion',name:'Healing Potion',slot:'consumable',kind:'potion',heal:28}
  };

  const CONTRACT = {
    id:'greymill_rats',
    name:'Rats Below Greymill',
    threat:2,
    objective:'Clear the infestation beneath Greymill.',
    start:'entrance',
    locations:{
      entrance:{id:'entrance',name:'Mill Entrance',progress:8,next:['cellar'],encounter:null,materials:[['scrap_iron',0.35]]},
      cellar:{id:'cellar',name:'Storage Cellar',progress:18,next:['pantry','flooded'],encounter:{enemy:'giant_rat',count:[2,3]},materials:[['rat_tail',0.6],['medicinal_herb',0.25]]},
      pantry:{id:'pantry',name:'Collapsed Pantry',progress:16,next:['nest'],optional:true,risk:0.35,reward:0.8,encounter:{enemy:'giant_rat',count:[1,2]},materials:[['medicinal_herb',0.7],['scrap_iron',0.45]]},
      flooded:{id:'flooded',name:'Flooded Passage',progress:14,next:['nest'],optional:true,risk:0.2,reward:0.45,encounter:null,materials:[['medicinal_herb',0.35]]},
      nest:{id:'nest',name:'Rat Nest',progress:28,next:['old_shaft','resolution'],encounter:{enemy:'dire_rat',count:[2,3]},materials:[['rat_tail',0.9],['strange_gland',0.25]]},
      old_shaft:{id:'old_shaft',name:'Old Smuggler Shaft',progress:16,next:['resolution'],optional:true,risk:0.85,reward:1.4,encounter:{enemy:'dire_rat',count:[2,4]},materials:[['strange_gland',0.7],['scrap_iron',0.8]]},
      resolution:{id:'resolution',name:'Cleared Mill',progress:0,next:[],encounter:null,materials:[]}
    }
  };

  const ENEMIES = {
    giant_rat:{id:'giant_rat',name:'Giant Rat',hp:15,damage:[3,7],accuracy:0.67,defense:0,xp:1,danger:0.18},
    dire_rat:{id:'dire_rat',name:'Dire Rat',hp:25,damage:[5,10],accuracy:0.72,defense:1,xp:2,danger:0.35}
  };

  const MATERIAL_NAMES={rat_tail:'Rat Tail',medicinal_herb:'Medicinal Herb',scrap_iron:'Scrap Iron',strange_gland:'Strange Gland'};

  function heroTemplate(overrides={}){
    const base={
      id:'edrin', name:'Edrin Vale', alive:true,
      stats:{might:5,finesse:5,endurance:5,wits:5,resolve:5},
      maxHealth:100, health:100, hunger:20, fatigue:15, morale:65,
      traits:['Cautious','Resourceful'],
      equipment:{weapon:'rusty_sword',armor:'padded_armor'},
      supplies:{healing_potion:1},
      moodlets:[], injuries:[],
    };
    const h=JSON.parse(JSON.stringify(base));
    Object.assign(h,overrides);
    if(overrides.stats) h.stats=Object.assign(base.stats,overrides.stats);
    if(overrides.equipment) h.equipment=Object.assign(base.equipment,overrides.equipment);
    if(overrides.supplies) h.supplies=Object.assign(base.supplies,overrides.supplies);
    h.health=clamp(h.health,0,h.maxHealth);
    return h;
  }

  function deriveMoodlets(hero){
    const m=[];
    if(hero.hunger<=30) m.push('Well Fed');
    if(hero.hunger>=70) m.push('Hungry');
    if(hero.fatigue<=25) m.push('Rested');
    if(hero.fatigue>=70) m.push('Tired');
    if(hero.morale>=72) m.push('Confident');
    if(hero.morale<=30) m.push('Afraid');
    if(hero.health<=55) m.push('Injured');
    hero.moodlets=m;
    return m;
  }

  function gearPower(hero){
    const w=EQUIPMENT[hero.equipment.weapon]||EQUIPMENT.wood_axe;
    const a=EQUIPMENT[hero.equipment.armor]||{defense:0};
    return (w.damage||0)*1.3 + (a.defense||0)*3 + (hero.supplies.healing_potion||0)*4;
  }

  function readinessScore(hero){
    deriveMoodlets(hero);
    const s=hero.stats;
    let score=(s.might+s.finesse+s.endurance+s.wits+s.resolve)*1.6 + gearPower(hero);
    score += (hero.health/hero.maxHealth)*18;
    score += (100-hero.fatigue)*0.12;
    score += (100-hero.hunger)*0.08;
    score += hero.morale*0.08;
    if(hero.moodlets.includes('Confident'))score+=5;
    if(hero.moodlets.includes('Afraid'))score-=8;
    if(hero.moodlets.includes('Hungry'))score-=7;
    if(hero.moodlets.includes('Tired'))score-=9;
    return score;
  }

  function threatAssessment(hero, contract=CONTRACT){
    const ratio=readinessScore(hero)/(42 + contract.threat*22);
    if(ratio>=1.55)return 'Comfortable';
    if(ratio>=1.18)return 'Reasonable';
    if(ratio>=0.9)return 'Risky';
    if(ratio>=0.68)return 'Extremely Dangerous';
    return 'Likely Fatal';
  }

  function trait(hero,t){ return hero.traits.includes(t); }
  function effectiveDefense(hero){
    const armor=EQUIPMENT[hero.equipment.armor];
    return (armor?.defense||0) + Math.floor(hero.stats.endurance/4);
  }
  function weapon(hero){ return EQUIPMENT[hero.equipment.weapon] || EQUIPMENT.wood_axe; }

  class Expedition {
    constructor({hero=heroTemplate(),seed=1,contract=CONTRACT,debug=false}={}){
      this.rng=new RNG(seed); this.seed=seed; this.hero=JSON.parse(JSON.stringify(hero)); this.contract=contract; this.debug=debug;
      deriveMoodlets(this.hero);
      this.state='deployed'; this.locationId=contract.start; this.elapsed=0; this.goldRate=0.05; this.peakGoldRate=this.goldRate; this.gold=0;
      this.enemiesDefeated=0; this.areasExplored=[]; this.objectiveProgress=0; this.materials={}; this.log=[]; this.decisionDebug=[];
      this.currentCombat=null; this.retreatReason=null; this.lastDecision=null; this._entered=false; this._resolution=null;
      this.addLog(`Deployed to ${contract.name}.`, 'system');
    }
    addLog(text,type='event',reasons=[]){ this.log.push({time:this.elapsed,text,type,reasons}); if(this.log.length>250)this.log.shift(); }
    addMaterial(id,count=1){ this.materials[id]=(this.materials[id]||0)+count; }
    bumpRate(amount,reason){ const before=this.goldRate; this.goldRate=clamp(this.goldRate+amount,0,50); this.peakGoldRate=Math.max(this.peakGoldRate,this.goldRate); if(Math.abs(this.goldRate-before)>=0.009)this.addLog(`Performance ${before.toFixed(2)} → ${this.goldRate.toFixed(2)} gold/sec — ${reason}.`,'income'); }
    updateNeeds(dt){
      this.hero.hunger=clamp(this.hero.hunger+dt*0.11,0,100);
      this.hero.fatigue=clamp(this.hero.fatigue+dt*0.095,0,100);
      if(this.hero.hunger>80) this.hero.morale=clamp(this.hero.morale-dt*0.025,0,100);
      if(this.hero.fatigue>85) this.hero.morale=clamp(this.hero.morale-dt*0.03,0,100);
      deriveMoodlets(this.hero);
    }
    utility(action,ctx={}){
      const h=this.hero, moods=h.moodlets, health=h.health/h.maxHealth;
      let u=0,reasons=[];
      const add=(v,r)=>{u+=v;if(r)reasons.push({value:v,reason:r});};
      if(action==='continue'){
        add(34,'primary objective ahead'); add(h.stats.resolve*2,'resolve');
        add((health-0.5)*35,health>0.65?'healthy':'injured');
        add((50-h.fatigue)*0.22,h.fatigue<45?'rested':'fatigue');
        if(moods.includes('Confident'))add(15,'confident');
        if(moods.includes('Afraid'))add(-22,'afraid');
        if(trait(h,'Brave'))add(14,'brave'); if(trait(h,'Cautious'))add(-7,'cautious');
      } else if(action==='retreat'){
        add((1-health)*70,health<0.5?'low health':'health stable');
        add(Math.max(0,h.fatigue-50)*0.6,h.fatigue>50?'fatigue':null);
        add(Math.max(0,h.hunger-65)*0.45,h.hunger>65?'hungry':null);
        add(Math.max(0,45-h.morale)*0.6,h.morale<45?'low morale':null);
        if(h.supplies.healing_potion<=0)add(9,'no healing potion');
        if(trait(h,'Cautious'))add(14,'cautious'); if(trait(h,'Brave'))add(-10,'brave');
        if(moods.includes('Afraid'))add(18,'afraid');
      } else if(action==='optional'){
        add((ctx.reward||0)*28,'valuable opportunity'); add(-(ctx.risk||0)*28,'danger');
        add((health-0.55)*28,health>0.65?'healthy':'injured'); add((55-h.fatigue)*0.15,h.fatigue<55?'rested':'fatigue');
        if(trait(h,'Greedy'))add(18,'greedy'); if(trait(h,'Cautious'))add(-14,'cautious'); if(trait(h,'Brave'))add(8,'brave'); if(moods.includes('Confident'))add(10,'confident');
      } else if(action==='heal'){
        add((1-health)*100,health<0.65?'wounded':'not badly hurt');
        add(h.supplies.healing_potion>0?18:-999,h.supplies.healing_potion>0?'potion available':'no potion');
        if(trait(h,'Resourceful'))add(8,'resourceful');
      } else if(action==='fight'){
        add(42,'enemy blocks path'); add(health*20,'current health'); add(h.stats.might+h.stats.finesse,'combat ability');
        if(trait(h,'Brave'))add(10,'brave'); if(trait(h,'Cautious'))add(-6,'cautious');
      } else if(action==='maintain_distance'){
        const w=weapon(h); add(w.kind==='ranged'?32:-20,w.kind==='ranged'?'ranged weapon':'no ranged weapon'); add(h.stats.finesse*2,'finesse');
      }
      return {score:u,reasons:reasons.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,4).map(x=>x.reason)};
    }
    choose(actions,ctx={}){
      const scored=actions.map(a=>({action:a,...this.utility(a,ctx[a]||ctx)}));
      scored.forEach(x=>x.score += this.rng.range(-3.5,3.5));
      scored.sort((a,b)=>b.score-a.score);
      this.decisionDebug.push({time:this.elapsed,scored:JSON.parse(JSON.stringify(scored))}); if(this.decisionDebug.length>100)this.decisionDebug.shift();
      this.lastDecision=scored[0]; return scored[0];
    }
    enterLocation(){
      const loc=this.contract.locations[this.locationId];
      if(!this.areasExplored.includes(loc.id)){
        this.areasExplored.push(loc.id); this.objectiveProgress=clamp(this.objectiveProgress+loc.progress,0,100);
        this.addLog(`Entered ${loc.name}.`,'location'); this.bumpRate(0.06+loc.progress*0.004,'exploration progress');
        for(const [mat,p] of loc.materials){ if(this.rng.chance(p)){ const c=this.rng.chance(0.25)?2:1; this.addMaterial(mat,c); this.addLog(`Recovered ${c} ${MATERIAL_NAMES[mat]}${c>1?'s':''}.`,'loot'); this.bumpRate(0.035*c,'useful materials discovered'); } }
      }
      if(loc.encounter){
        const count=this.rng.int(loc.encounter.count[0],loc.encounter.count[1]);
        this.startCombat(loc.encounter.enemy,count); return;
      }
      this._entered=true;
    }
    startCombat(enemyId,count){
      const spec=ENEMIES[enemyId];
      this.currentCombat={enemyId,enemies:Array.from({length:count},()=>({hp:spec.hp,maxHp:spec.hp})),round:0,distance:1};
      this.addLog(`${this.hero.name} spotted ${count} ${spec.name}${count>1?'s':''}.`,'combat');
      const d=this.choose(['fight','retreat']);
      this.addLog(`${this.hero.name} chose to ${d.action}.`,'decision',d.reasons);
      if(d.action==='retreat' && this.canRetreat()){ this.finish('retreat','avoided combat'); }
    }
    canRetreat(){ return this.objectiveProgress>5; }
    combatRound(){
      const c=this.currentCombat;if(!c||this.state!=='deployed')return;
      const spec=ENEMIES[c.enemyId],h=this.hero,w=weapon(h); c.round++;
      deriveMoodlets(h);
      if(h.health<=48 && h.supplies.healing_potion>0){
        const heal=this.choose(['heal','fight']);
        if(heal.action==='heal'){
          const item=EQUIPMENT.healing_potion; h.supplies.healing_potion--; const before=h.health; h.health=clamp(h.health+item.heal+h.stats.wits,0,h.maxHealth);
          this.addLog(`${h.name} used a healing potion (${Math.round(before)} → ${Math.round(h.health)} HP).`,'decision',heal.reasons); this.bumpRate(0.015,'resourceful recovery');
          return;
        }
      }
      if(h.health<=32 && this.canRetreat()){
        const rr=this.choose(['retreat','fight']);
        if(rr.action==='retreat') { this.addLog(`${h.name} broke off the fight.`,'decision',rr.reasons); this.finish('retreat','combat retreat'); return; }
      }
      const style=w.kind==='ranged'?this.choose(['maintain_distance','fight']):{action:'fight',reasons:['melee weapon']};
      const target=c.enemies.find(e=>e.hp>0);
      if(target){
        const base=w.damage + h.stats.might*0.8 + (w.kind==='ranged'?h.stats.finesse*0.7:h.stats.finesse*0.25);
        const cond=(100-h.fatigue)*0.0025 + (100-h.hunger)*0.0015;
        const mood=(h.moodlets.includes('Confident')?0.12:0)+(h.moodlets.includes('Afraid')?-0.12:0)+(h.moodlets.includes('Tired')?-0.1:0);
        const hitChance=clamp(0.62+h.stats.finesse*0.025 + (w.kind==='ranged'?0.06:0)+mood,0.25,0.96);
        if(this.rng.chance(hitChance)){
          const dmg=Math.max(1,Math.round(base*this.rng.range(0.82,1.18)*(1+cond+mood)-spec.defense)); target.hp-=dmg; this.addLog(`${h.name} hit ${spec.name} for ${dmg}.`,'combat');
          if(target.hp<=0){this.enemiesDefeated++;this.addLog(`${h.name} killed ${spec.name}.`,'combat');this.bumpRate(0.08+spec.xp*0.035,'enemy defeated');}
        } else this.addLog(`${h.name} missed ${spec.name}.`,'combat');
      }
      const living=c.enemies.filter(e=>e.hp>0);
      if(living.length===0){this.currentCombat=null;this._entered=true;this.hero.morale=clamp(this.hero.morale+4,0,100);deriveMoodlets(h);return;}
      for(const enemy of living){
        let acc=spec.accuracy - h.stats.finesse*0.015;
        if(w.kind==='ranged' && style.action==='maintain_distance')acc-=0.16;
        if(this.rng.chance(clamp(acc,0.2,0.92))){
          const dmg=Math.max(1,Math.round(this.rng.range(spec.damage[0],spec.damage[1])-effectiveDefense(h)*0.6)); h.health-=dmg; this.addLog(`${spec.name} wounded ${h.name} for ${dmg}.`,'combat');
          if(h.health<=0){h.health=0;h.alive=false;deriveMoodlets(h);this.finish('death',`killed by ${spec.name}`);return;}
        }
      }
      h.fatigue=clamp(h.fatigue+1.7,0,100);h.hunger=clamp(h.hunger+0.5,0,100);deriveMoodlets(h);
    }
    chooseNext(){
      const loc=this.contract.locations[this.locationId];
      if(loc.id==='resolution'){ this.finish('success','primary objective completed'); return; }
      if(loc.next.length===0){this.finish('success','contract route completed');return;}
      if(loc.next.length===1){ this.locationId=loc.next[0];this._entered=false;return; }
      const nexts=loc.next.map(id=>this.contract.locations[id]);
      const optional=nexts.find(n=>n.optional);
      if(optional){
        const dec=this.choose(['optional','continue'],{optional:{risk:optional.risk,reward:optional.reward}});
        if(dec.action==='optional'){
          this.addLog(`${this.hero.name} chose ${optional.name}.`,'decision',dec.reasons);
          this.locationId=optional.id;this._entered=false;return;
        }
      }
      const normal=nexts.find(n=>!n.optional) || nexts[nexts.length-1]; this.locationId=normal.id; this._entered=false;
    }
    tick(dt=1){
      if(this.state!=='deployed')return;
      dt=clamp(dt,0.05,3);
      this.elapsed+=dt; this.gold+=this.goldRate*dt; this.updateNeeds(dt);
      if(this.hero.health<=0){this.finish('death','fatal injuries');return;}
      if(this.hero.fatigue>92 || this.hero.hunger>94 || this.hero.morale<12){
        const d=this.choose(['retreat','continue']);
        if(d.action==='retreat'&&this.canRetreat()){this.addLog(`${this.hero.name} decided to retreat.`,'decision',d.reasons);this.finish('retreat','condition collapse');return;}
      }
      if(this.currentCombat){this.combatRound();return;}
      if(!this._entered){this.enterLocation();return;}
      this.chooseNext();
    }
    finish(kind,reason){
      if(this.state!=='deployed')return;
      this.state=kind; this.retreatReason=reason; const finalRate=this.goldRate; this.goldRate=0;
      if(kind==='success'){this.objectiveProgress=100;this.hero.morale=clamp(this.hero.morale+10,0,100);this.addLog(`Contract completed. ${this.hero.name} returns alive.`,'result');}
      else if(kind==='retreat'){this.addLog(`Contract failed — ${this.hero.name} retreated (${reason}).`,'result');}
      else {this.hero.alive=false;this.addLog(`Contract failed — ${this.hero.name} died (${reason}).`,'result');}
      this._resolution={kind,reason,finalRate,summary:this.summary()};
    }
    summary(){
      return {contract:this.contract.name,outcome:this.state,reason:this.retreatReason,time:this.elapsed,enemiesDefeated:this.enemiesDefeated,areasExplored:this.areasExplored.length,totalAreas:Object.keys(this.contract.locations).length-1,objectiveProgress:Math.round(this.objectiveProgress),peakGoldRate:this.peakGoldRate,totalGold:this.gold,materials:Object.assign({},this.materials),heroAlive:this.hero.alive,health:this.hero.health,fatigue:this.hero.fatigue,hunger:this.hero.hunger,morale:this.hero.morale,seed:this.seed};
    }
    runToEnd(maxTicks=5000,dt=1){ let n=0;while(this.state==='deployed'&&n++<maxTicks)this.tick(dt);return this.summary(); }
  }

  function makePreset(name){
    if(name==='prepared')return heroTemplate({name:'Edrin Vale',health:100,hunger:10,fatigue:8,morale:78,traits:['Cautious','Resourceful'],equipment:{weapon:'rusty_sword',armor:'padded_armor'},supplies:{healing_potion:1}});
    if(name==='ranged')return heroTemplate({name:'Mara Fen',stats:{might:4,finesse:8,endurance:5,wits:7,resolve:6},health:100,hunger:14,fatigue:10,morale:75,traits:['Cautious','Resourceful'],equipment:{weapon:'hunting_bow',armor:'leather_armor'},supplies:{healing_potion:1}});
    if(name==='reckless')return heroTemplate({name:'Borin Hale',stats:{might:7,finesse:4,endurance:6,wits:3,resolve:8},health:100,hunger:25,fatigue:20,morale:82,traits:['Brave','Greedy'],equipment:{weapon:'rusty_sword',armor:null},supplies:{healing_potion:0}});
    if(name==='unprepared')return heroTemplate({name:'Tomas Reed',stats:{might:4,finesse:4,endurance:4,wits:4,resolve:4},health:78,hunger:82,fatigue:80,morale:32,traits:['Cautious'],equipment:{weapon:'wood_axe',armor:null},supplies:{healing_potion:0}});
    return heroTemplate();
  }

  return {RNG,EQUIPMENT,CONTRACT,ENEMIES,MATERIAL_NAMES,heroTemplate,deriveMoodlets,readinessScore,threatAssessment,Expedition,makePreset};
});
