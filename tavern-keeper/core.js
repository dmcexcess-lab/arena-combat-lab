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
  const clone=v=>JSON.parse(JSON.stringify(v));

  const EQUIPMENT = {
    rusty_sword:{id:'rusty_sword',name:'Rusty Sword',slot:'weapon',kind:'melee',damage:7,range:0,defense:0,weight:1},
    hunting_bow:{id:'hunting_bow',name:'Hunting Bow',slot:'weapon',kind:'ranged',damage:6,range:1,defense:0,weight:1},
    wood_axe:{id:'wood_axe',name:'Wood Axe',slot:'weapon',kind:'melee',damage:5,range:0,defense:0,weight:1},
    padded_armor:{id:'padded_armor',name:'Padded Armor',slot:'armor',kind:'armor',damage:0,range:0,defense:2,weight:2},
    leather_armor:{id:'leather_armor',name:'Leather Armor',slot:'armor',kind:'armor',damage:0,range:0,defense:3,weight:2},
    healing_potion:{id:'healing_potion',name:'Healing Potion',slot:'consumable',kind:'potion',heal:28,crafted:true},
    field_bandage:{id:'field_bandage',name:'Field Bandage',slot:'consumable',kind:'bandage',heal:14,injuryRelief:1,crafted:true},
    scrap_spear:{id:'scrap_spear',name:'Scrap Spear',slot:'weapon',kind:'melee',damage:9,range:0,defense:0,weight:1,crafted:true},
    plated_vest:{id:'plated_vest',name:'Plated Vest',slot:'armor',kind:'armor',damage:0,range:0,defense:4,weight:3,crafted:true},
    steel_sword:{id:'steel_sword',name:'Steel Sword',slot:'weapon',kind:'melee',damage:10,range:0,defense:0,weight:2,premium:true},
    chain_mail:{id:'chain_mail',name:'Chain Mail',slot:'armor',kind:'armor',damage:0,range:0,defense:5,weight:4,premium:true}
  };

  const MAX_DURABILITY=100;
  function isDurableItem(itemId){
    const item=EQUIPMENT[itemId];
    return !!item&&['weapon','armor'].includes(item.slot);
  }
  function normalizeDurability(value){
    const n=Number(value);
    return clamp(Number.isFinite(n)?n:MAX_DURABILITY,0,MAX_DURABILITY);
  }
  function durabilityMultiplier(value){
    const d=normalizeDurability(value);
    if(d>=60)return 1;
    if(d>=30)return 0.8;
    if(d>0)return 0.6;
    return 0.25;
  }
  function durabilityCondition(value){
    const d=normalizeDurability(value);
    if(d>=85)return 'Pristine';
    if(d>=60)return 'Serviceable';
    if(d>=30)return 'Worn';
    if(d>0)return 'Damaged';
    return 'Broken';
  }
  function repairQuote(itemId,durability,workshopLevel=1){
    if(!isDurableItem(itemId))return null;
    const d=normalizeDurability(durability),missing=Math.ceil(MAX_DURABILITY-d);
    const workshop=clamp(Math.floor(Number(workshopLevel)||1),1,6);
    if(missing<=0)return{itemId,durability:d,missing:0,gold:0,scrapIron:0,minutes:0,workshopLevel:workshop};
    const item=EQUIPMENT[itemId],tier=item.premium?1.35:item.crafted?1.15:1;
    const baseGold=Math.max(1,Math.ceil(missing*0.12*tier));
    const baseMinutes=Math.max(10,Math.ceil(missing/10)*10);
    const gold=Math.max(1,Math.ceil(baseGold*Math.max(0.6,1-0.08*(workshop-1))));
    const minutes=Math.max(5,Math.ceil((baseMinutes*Math.max(0.5,1-0.1*(workshop-1)))/5)*5);
    const baseScrap=missing>=15?Math.ceil(missing/50):0;
    const scrapIron=Math.max(0,baseScrap-(workshop>=4?1:0));
    return {itemId,durability:d,missing,gold,scrapIron,minutes,workshopLevel:workshop};
  }

  const CRAFT_RECIPES = {
    scrap_spear:{id:'scrap_spear',name:'Scrap Spear',category:'weapon',output:'scrap_spear',outputCount:1,minutes:45,materials:{scrap_iron:3,rat_tail:1},description:'A stronger melee weapon built from recovered metal and tough binding.'},
    plated_vest:{id:'plated_vest',name:'Plated Vest',category:'armor',output:'plated_vest',outputCount:1,minutes:55,materials:{scrap_iron:3,rat_tail:2},description:'Improvised plates reinforce a travel vest for better protection.'},
    healing_potion:{id:'healing_potion',name:'Healing Potion',category:'consumable',output:'healing_potion',outputCount:1,minutes:30,materials:{medicinal_herb:2,strange_gland:1},description:'A strong emergency potion heroes can use autonomously in combat.'},
    field_bandage:{id:'field_bandage',name:'Field Bandages',category:'consumable',output:'field_bandage',outputCount:2,minutes:20,materials:{medicinal_herb:2,rat_tail:1},description:'Two compact dressings for moderate wounds and lingering injuries.'}
  };

  const INJURY_TYPES = {
    sprain:{id:'sprain',name:'Sprain',readinessPenalty:5,attackPenalty:0.04,retreatPressure:4},
    bruised_ribs:{id:'bruised_ribs',name:'Bruised Ribs',readinessPenalty:7,attackPenalty:0.06,retreatPressure:5},
    deep_bite:{id:'deep_bite',name:'Deep Bite',readinessPenalty:9,attackPenalty:0.08,retreatPressure:7}
  };

  const PREP_EFFECTS = {
    hearty_meal:{id:'hearty_meal',name:'Hearty Meal',duration:180,hungerRateMult:0.55,attackBonus:0.05,readinessBonus:5},
    good_sleep:{id:'good_sleep',name:'Good Sleep',duration:240,fatigueRateMult:0.55,attackBonus:0.03,readinessBonus:6},
    patched_up:{id:'patched_up',name:'Patched Up',duration:150,retreatRelief:4,readinessBonus:3},
    good_company:{id:'good_company',name:'Good Company',duration:150,attackBonus:0.012,retreatRelief:1.5,readinessBonus:2}
  };

  const PREPARATION_ACTIONS = {
    simple_meal:{id:'simple_meal',name:'Simple Meal',facility:'kitchen',cost:2,minutes:20,description:'Cheap food. Kitchen quality improves recovery and speed.',apply(h,q=1){const n=q-1;h.hunger=clamp(h.hunger-(36+5*n),0,100);h.morale=clamp(h.morale+3+n,0,100);}},
    hearty_meal:{id:'hearty_meal',name:'Hearty Meal',facility:'kitchen',cost:5,minutes:35,description:'Deep hunger recovery plus a kitchen-scaled expedition food buff.',apply(h,q=1){const n=q-1;h.hunger=clamp(h.hunger-(62+5*n),0,100);h.morale=clamp(h.morale+8+2*n,0,100);setPrepEffect(h,'hearty_meal',q);}},
    nap:{id:'nap',name:'Nap',facility:'lodging',cost:1,minutes:60,description:'Lodging quality improves fatigue recovery, healing and speed.',apply(h,q=1){const n=q-1;h.fatigue=clamp(h.fatigue-(32+6*n),0,100);h.health=clamp(h.health+5+2*n,0,h.maxHealth);h.morale=clamp(h.morale+2+n,0,100);}},
    common_room:{id:'common_room',name:'Unwind',facility:'bar',cost:3,minutes:90,description:'Commons quality improves morale and leaves a stronger social boost.',apply(h,q=1){const n=q-1;h.morale=clamp(h.morale+28+6*n,0,100);h.fatigue=clamp(h.fatigue-(6+2*n),0,100);if(q>=2)setPrepEffect(h,'good_company',q);}},
    full_rest:{id:'full_rest',name:'Full Rest',facility:'lodging',cost:3,minutes:360,description:'Lodging quality improves deep rest, healing and Good Sleep.',apply(h,q=1){const n=q-1;h.fatigue=clamp(h.fatigue-(78+4*n),0,100);h.health=clamp(h.health+18+4*n,0,h.maxHealth);h.morale=clamp(h.morale+7+2*n,0,100);setPrepEffect(h,'good_sleep',q);}},
    first_aid:{id:'first_aid',name:'First Aid',facility:'infirmary',cost:4,minutes:30,description:'Infirmary quality improves healing and injury reduction.',apply(h,q=1){const n=q-1;h.health=clamp(h.health+18+5*n,0,h.maxHealth);reduceWorstInjury(h,1+Math.floor(n/2));setPrepEffect(h,'patched_up',q);}},
    physician:{id:'physician',name:'Physician',facility:'infirmary',cost:12,minutes:90,description:'Infirmary quality improves major healing and can clear additional injuries.',apply(h,q=1){const n=q-1;h.health=clamp(h.health+38+7*n,0,h.maxHealth);const removals=1+Math.floor(n/2);for(let i=0;i<removals;i++)if(!removeWorstInjury(h))break;setPrepEffect(h,'patched_up',q);}}
  };

  function normalizeFacilityLevels(facilities={}){
    const get=(key)=>clamp(Math.floor(Number(facilities[key]??facilities[key+'Level']??1)||1),1,6);
    return {kitchen:get('kitchen'),bar:get('bar'),lodging:get('lodging'),infirmary:get('infirmary'),workshop:get('workshop')};
  }
  function preparationFacilityLevel(facilities,actionId){
    const action=PREPARATION_ACTIONS[actionId];
    if(!action||!action.facility)return 1;
    return normalizeFacilityLevels(facilities)[action.facility]||1;
  }
  function facilityActionMinutes(baseMinutes,level){
    return Math.max(5,Math.round(baseMinutes*Math.max(0.65,1-0.06*(clamp(level,1,6)-1))));
  }

  const CONTRACTS = {
    briar_farm_wolves:{
      id:'briar_farm_wolves',name:'Wolves at Briar Farm',threat:1,kind:'Hunt',paceSeconds:15,durationHint:'5–10 min',
      objective:'Drive the wolf pack away from Briar Farm.',brief:'A short rural hunt with modest danger and dependable herbs.',
      incomeMult:0.82,materialProfile:['medicinal_herb','scrap_iron'],start:'farm_gate',subObjectives:['Pick up the pack trail','Cull up to 5 wolves','Clear the wolf den'],objectiveRules:{quarryEnemy:'wolf',killTarget:5,trailLocation:'sheep_pens',lairLocation:'den'},
      locations:{
        farm_gate:{id:'farm_gate',name:'Farm Gate',progress:10,next:['sheep_pens'],encounter:null,materials:[['medicinal_herb',0.45]]},
        sheep_pens:{id:'sheep_pens',name:'Sheep Pens',progress:20,next:['orchard','tree_line'],encounter:{enemy:'wolf',count:[1,2]},materials:[['medicinal_herb',0.45],['scrap_iron',0.2]]},
        orchard:{id:'orchard',name:'Old Orchard',progress:18,next:['den'],optional:true,risk:0.25,reward:0.65,encounter:{enemy:'wolf',count:[1,2]},materials:[['medicinal_herb',0.8]]},
        tree_line:{id:'tree_line',name:'Tree Line',progress:16,next:['den'],encounter:null,materials:[['medicinal_herb',0.35]]},
        den:{id:'den',name:'Wolf Den',progress:30,next:['resolution'],encounter:{enemy:'wolf',count:[2,3]},materials:[['medicinal_herb',0.6],['scrap_iron',0.25]]},
        resolution:{id:'resolution',name:'Farm Secured',progress:0,next:[],encounter:null,materials:[]}
      }
    },
    greymill_rats:{
      id:'greymill_rats',name:'Rats Below Greymill',threat:2,kind:'Extermination',paceSeconds:35,durationHint:'10–20 min',
      objective:'Clear the infestation beneath Greymill.',brief:'A branching cellar infestation with useful alchemical salvage.',
      incomeMult:1,materialProfile:['rat_tail','medicinal_herb','scrap_iron','strange_gland'],start:'entrance',subObjectives:['Reach the infestation','Cull up to 8 vermin','Destroy the main nest'],objectiveRules:{verminEnemies:['giant_rat','dire_rat'],killTarget:8,infestationLocation:'cellar',nestLocation:'nest'},
      locations:{
        entrance:{id:'entrance',name:'Mill Entrance',progress:8,next:['cellar'],encounter:null,materials:[['scrap_iron',0.35]]},
        cellar:{id:'cellar',name:'Storage Cellar',progress:18,next:['pantry','flooded'],encounter:{enemy:'giant_rat',count:[2,3]},materials:[['rat_tail',0.6],['medicinal_herb',0.25]]},
        pantry:{id:'pantry',name:'Collapsed Pantry',progress:16,next:['nest'],optional:true,risk:0.35,reward:0.8,encounter:{enemy:'giant_rat',count:[1,2]},materials:[['medicinal_herb',0.7],['scrap_iron',0.45]]},
        flooded:{id:'flooded',name:'Flooded Passage',progress:14,next:['nest'],optional:true,risk:0.2,reward:0.45,encounter:null,materials:[['medicinal_herb',0.35]]},
        nest:{id:'nest',name:'Rat Nest',progress:28,next:['old_shaft','resolution'],encounter:{enemy:'dire_rat',count:[2,3]},materials:[['rat_tail',0.9],['strange_gland',0.25]]},
        old_shaft:{id:'old_shaft',name:'Old Smuggler Shaft',progress:16,next:['resolution'],optional:true,risk:0.85,reward:1.4,encounter:{enemy:'dire_rat',count:[2,4]},materials:[['strange_gland',0.7],['scrap_iron',0.8]]},
        resolution:{id:'resolution',name:'Cleared Mill',progress:0,next:[],encounter:null,materials:[]}
      }
    },
    ashroad_caravan:{
      id:'ashroad_caravan',name:'Ashroad Caravan',threat:3,kind:'Escort',paceSeconds:75,durationHint:'25–45 min',
      objective:'Break the ambushes and get the caravan through Ashroad.',brief:'A longer escort through repeated human ambushes and a risky ravine shortcut.',
      incomeMult:1.28,materialProfile:['scrap_iron','medicinal_herb'],start:'west_marker',subObjectives:['Survive the first ambush','Get the caravan across the bridge','Reach the last ridge','Preserve caravan integrity'],objectiveRules:{startingIntegrity:100,checkpointLocations:['first_ambush','old_bridge','last_ridge']},
      locations:{
        west_marker:{id:'west_marker',name:'West Mile Marker',progress:8,next:['first_ambush'],encounter:null,materials:[['medicinal_herb',0.3]]},
        first_ambush:{id:'first_ambush',name:'Burned Cart Ambush',progress:18,next:['ravine','wagon_circle'],encounter:{enemy:'bandit',count:[2,3]},materials:[['scrap_iron',0.65],['medicinal_herb',0.25]]},
        ravine:{id:'ravine',name:'Ravine Shortcut',progress:20,next:['old_bridge'],optional:true,risk:0.7,reward:1.15,encounter:{enemy:'raider',count:[1,2]},materials:[['scrap_iron',0.75]]},
        wagon_circle:{id:'wagon_circle',name:'Wagon Circle',progress:16,next:['old_bridge'],encounter:{enemy:'bandit',count:[2,3]},materials:[['medicinal_herb',0.4],['scrap_iron',0.5]]},
        old_bridge:{id:'old_bridge',name:'Old Stone Bridge',progress:24,next:['last_ridge'],encounter:{enemy:'bandit',count:[2,4]},materials:[['scrap_iron',0.75]]},
        last_ridge:{id:'last_ridge',name:'Last Ridge',progress:20,next:['resolution'],encounter:{enemy:'raider',count:[1,2]},materials:[['scrap_iron',0.7],['medicinal_herb',0.35]]},
        resolution:{id:'resolution',name:'Caravan Through',progress:0,next:[],encounter:null,materials:[]}
      }
    },
    blackroot_mine:{
      id:'blackroot_mine',name:'Blackroot Mine',threat:4,kind:'Delve',paceSeconds:180,durationHint:'1–2 hr',
      objective:'Find the missing miners and break the infestation in Blackroot Mine.',brief:'A deep underground contract with dangerous optional chambers and rare glands.',
      incomeMult:1.58,materialProfile:['strange_gland','scrap_iron','medicinal_herb'],start:'mine_mouth',subObjectives:['Survey deep mine chambers','Find the missing miners','Rescue as many miners as possible'],objectiveRules:{discoveryLocations:['fungus_cave','collapsed_lift','brood_chamber'],rescueLocation:'miner_gallery',rescueMax:3},
      locations:{
        mine_mouth:{id:'mine_mouth',name:'Mine Mouth',progress:8,next:['timber_gallery'],encounter:null,materials:[['scrap_iron',0.45]]},
        timber_gallery:{id:'timber_gallery',name:'Timber Gallery',progress:16,next:['fungus_cave','lower_tunnel'],encounter:{enemy:'cave_crawler',count:[2,3]},materials:[['medicinal_herb',0.45],['scrap_iron',0.5]]},
        fungus_cave:{id:'fungus_cave',name:'Fungus Cave',progress:18,next:['collapsed_lift'],optional:true,risk:0.72,reward:1.25,encounter:{enemy:'cave_stalker',count:[1,2]},materials:[['strange_gland',0.75],['medicinal_herb',0.75]]},
        lower_tunnel:{id:'lower_tunnel',name:'Lower Tunnel',progress:16,next:['collapsed_lift'],encounter:{enemy:'cave_crawler',count:[2,3]},materials:[['scrap_iron',0.65]]},
        collapsed_lift:{id:'collapsed_lift',name:'Collapsed Lift',progress:20,next:['brood_chamber','miner_gallery'],encounter:{enemy:'cave_stalker',count:[1,2]},materials:[['strange_gland',0.45],['scrap_iron',0.55]]},
        brood_chamber:{id:'brood_chamber',name:'Brood Chamber',progress:18,next:['miner_gallery'],optional:true,risk:0.95,reward:1.55,encounter:{enemy:'cave_stalker',count:[2,2]},materials:[['strange_gland',0.9]]},
        miner_gallery:{id:'miner_gallery',name:'Missing Miners',progress:24,next:['resolution'],encounter:{enemy:'cave_crawler',count:[2,3]},materials:[['medicinal_herb',0.5],['scrap_iron',0.8]]},
        resolution:{id:'resolution',name:'Miners Recovered',progress:0,next:[],encounter:null,materials:[]}
      }
    },
    wren_bridge_troll:{
      id:'wren_bridge_troll',name:'The Wren Bridge Troll',threat:6,kind:'Boss Hunt',paceSeconds:480,durationHint:'2–4 hr',
      objective:'Open Wren Bridge by killing the troll that has claimed it.',brief:'A short, brutal boss contract with a dangerous lair detour and the highest income potential.',
      incomeMult:2.08,materialProfile:['strange_gland','scrap_iron'],start:'roadblock',subObjectives:['Reach Wren Bridge','Wound the bridge troll','Kill the bridge troll'],objectiveRules:{approachLocation:'bridge_approach',bossLocation:'bridge',bossEnemy:'troll'},
      locations:{
        roadblock:{id:'roadblock',name:'Abandoned Roadblock',progress:10,next:['bridge_approach'],encounter:null,materials:[['scrap_iron',0.65]]},
        bridge_approach:{id:'bridge_approach',name:'Bridge Approach',progress:18,next:['troll_lair','bridge'],encounter:{enemy:'raider',count:[1,2]},materials:[['scrap_iron',0.6]]},
        troll_lair:{id:'troll_lair',name:'Troll Lair',progress:22,next:['bridge'],optional:true,risk:1.0,reward:1.8,encounter:{enemy:'troll',count:[1,1],boss:false},materials:[['strange_gland',0.95],['scrap_iron',0.8]]},
        bridge:{id:'bridge',name:'Wren Bridge',progress:42,next:['resolution'],encounter:{enemy:'troll',count:[1,1],boss:true},materials:[['strange_gland',0.85],['scrap_iron',0.7]]},
        resolution:{id:'resolution',name:'Bridge Open',progress:0,next:[],encounter:null,materials:[]}
      }
    }
  };
  const CONTRACT_ORDER=['briar_farm_wolves','greymill_rats','ashroad_caravan','blackroot_mine','wren_bridge_troll'];
  const CONTRACT=CONTRACTS.greymill_rats;
  const EXPEDITION_NEED_TIME_SCALE=1/20;
  function contractActionInterval(contract=CONTRACT){
    const explicit=Number(contract?.paceSeconds);
    if(Number.isFinite(explicit)&&explicit>0)return explicit;
    const fallback={1:15,2:35,3:75,4:180,5:300,6:480};
    return fallback[Math.max(1,Math.round(Number(contract?.threat)||2))]||35;
  }

  const ENEMIES = {
    giant_rat:{id:'giant_rat',name:'Giant Rat',hp:15,damage:[3,7],accuracy:0.67,defense:0,xp:1,danger:0.18},
    dire_rat:{id:'dire_rat',name:'Dire Rat',hp:25,damage:[5,10],accuracy:0.72,defense:1,xp:2,danger:0.35},
    wolf:{id:'wolf',name:'Wolf',hp:20,damage:[4,8],accuracy:0.69,defense:0,xp:1,danger:0.24},
    bandit:{id:'bandit',name:'Bandit',hp:28,damage:[5,9],accuracy:0.71,defense:1,xp:2,danger:0.32},
    raider:{id:'raider',name:'Road Raider',hp:38,damage:[6,11],accuracy:0.74,defense:2,xp:3,danger:0.46},
    cave_crawler:{id:'cave_crawler',name:'Cave Crawler',hp:31,damage:[5,10],accuracy:0.72,defense:1,xp:2,danger:0.38},
    cave_stalker:{id:'cave_stalker',name:'Cave Stalker',hp:43,damage:[7,13],accuracy:0.76,defense:2,xp:3,danger:0.56},
    troll:{id:'troll',name:'Bridge Troll',hp:142,damage:[14,23],accuracy:0.80,defense:4,xp:6,danger:0.94}
  };

  const MATERIAL_NAMES={rat_tail:'Rat Tail',medicinal_herb:'Medicinal Herb',scrap_iron:'Scrap Iron',strange_gland:'Strange Gland'};

  function normalizeCareer(career={}){
    const c=career||{};
    return {
      xp:Number(c.xp)||0,
      rank:Math.max(1,Number(c.rank)||1),
      skills:{
        melee:clamp(Number(c.skills?.melee)||0,0,10),
        ranged:clamp(Number(c.skills?.ranged)||0,0,10),
        survival:clamp(Number(c.skills?.survival)||0,0,10)
      },
      contracts:Number(c.contracts)||0,
      successes:Number(c.successes)||0,
      retreats:Number(c.retreats)||0,
      kills:Number(c.kills)||0,
      totalGold:Number(c.totalGold)||0,
      bestProgress:Number(c.bestProgress)||0,
      injuriesSuffered:Number(c.injuriesSuffered)||0
    };
  }
  function rankFromXp(xp){ return Math.max(1,Math.min(20,1+Math.floor(Math.sqrt(Math.max(0,xp)/45)))); }
  function ensureProgression(hero){
    hero.career=normalizeCareer(hero.career);
    hero.career.rank=rankFromXp(hero.career.xp);
    hero.history=clone(hero.history||[]);
    hero.titles=clone(hero.titles||[]);
    return hero;
  }
  function addUnique(arr,value){ if(value&&!arr.includes(value))arr.push(value); }
  function updateCareerIdentity(hero){
    const c=hero.career;
    if(c.contracts>=3)addUnique(hero.traits,'Veteran');
    if(c.retreats>=2)addUnique(hero.traits,'Survivor');
    if(c.successes>=3)addUnique(hero.traits,'Battle Hardened');
    if(c.kills>=10)addUnique(hero.traits,'Ratbane');
    if(c.contracts>=3)addUnique(hero.titles,'Road Regular');
    if(c.successes>=3)addUnique(hero.titles,'Greymill Veteran');
    if(c.kills>=10)addUnique(hero.titles,'Ratcatcher');
    if(c.injuriesSuffered>=3)addUnique(hero.titles,'Scarred Survivor');
  }
  function applyCareerProgress(hero,expedition){
    ensureProgression(hero);
    const c=hero.career, rankBefore=c.rank;
    const oldTraits=hero.traits.slice(), oldTitles=hero.titles.slice();
    const weaponKind=weapon(hero).kind;
    const performanceProgress=Math.max(expedition.objectiveProgress,expedition.objectiveScore||0);
    const xpGained=Math.max(1,Math.round(performanceProgress*0.24 + expedition.enemiesDefeated*4 + expedition.areasExplored.length*2 + (expedition.state==='success'?24:0) + (expedition.state==='retreat'?5:0)));
    const skillGains={melee:0,ranged:0,survival:0};
    skillGains.survival=Math.min(1.1,expedition.areasExplored.length*0.08 + (hero.alive?0.25:0) + expedition.objectiveProgress*0.002);
    if(weaponKind==='ranged')skillGains.ranged=Math.min(1.25,expedition.enemiesDefeated*0.16 + expedition.areasExplored.length*0.04);
    else skillGains.melee=Math.min(1.25,expedition.enemiesDefeated*0.16 + expedition.areasExplored.length*0.04);
    c.xp+=xpGained;
    c.contracts+=1;
    if(expedition.state==='success')c.successes+=1;
    if(expedition.state==='retreat')c.retreats+=1;
    c.kills+=expedition.enemiesDefeated;
    c.totalGold+=expedition.gold;
    c.bestProgress=Math.max(c.bestProgress,Math.round(expedition.objectiveProgress));
    c.injuriesSuffered+=expedition.injuriesSuffered||0;
    for(const [k,v] of Object.entries(skillGains))c.skills[k]=clamp(c.skills[k]+v,0,10);
    c.rank=rankFromXp(c.xp);
    updateCareerIdentity(hero);
    const record={
      number:c.contracts,contractId:expedition.contract.id,contractName:expedition.contract.name,
      outcome:expedition.state,seed:expedition.seed,progress:Math.round(expedition.objectiveProgress),objectiveScore:Math.round(expedition.objectiveScore||0),objectiveBonusGold:Number((expedition.objectiveBonusGold||0).toFixed(2)),
      kills:expedition.enemiesDefeated,gold:Number(expedition.gold.toFixed(2)),peakGoldRate:Number(expedition.peakGoldRate.toFixed(2)),
      xpGained,rankBefore,rankAfter:c.rank,skillGains,
      injuriesAfter:clone(hero.injuries),traitsEarned:hero.traits.filter(x=>!oldTraits.includes(x)),titlesEarned:hero.titles.filter(x=>!oldTitles.includes(x))
    };
    hero.history.push(record);
    if(hero.history.length>30)hero.history=hero.history.slice(-30);
    return record;
  }

  function heroTemplate(overrides={}){
    const base={
      id:'edrin', name:'Edrin Vale', alive:true,
      stats:{might:5,finesse:5,endurance:5,wits:5,resolve:5},
      maxHealth:100, health:100, hunger:20, fatigue:15, morale:65,
      traits:['Cautious','Resourceful'],
      equipment:{weapon:'rusty_sword',armor:'padded_armor'},
      gearDurability:{weapon:100,armor:100},
      supplies:{healing_potion:1,field_bandage:0},
      moodlets:[], injuries:[], prepEffects:[], career:normalizeCareer(), history:[], titles:[],
    };
    const h=JSON.parse(JSON.stringify(base));
    Object.assign(h,overrides);
    if(overrides.stats) h.stats=Object.assign(base.stats,overrides.stats);
    if(overrides.equipment) h.equipment=Object.assign(base.equipment,overrides.equipment);
    h.gearDurability={
      weapon:normalizeDurability(overrides.gearDurability?.weapon ?? h.gearDurability?.weapon ?? 100),
      armor:normalizeDurability(overrides.gearDurability?.armor ?? h.gearDurability?.armor ?? 100)
    };
    if(overrides.supplies) h.supplies=Object.assign(base.supplies,overrides.supplies);
    h.traits=clone(overrides.traits||h.traits||[]);
    h.injuries=clone(overrides.injuries||h.injuries||[]);
    h.prepEffects=clone(overrides.prepEffects||h.prepEffects||[]);
    h.health=clamp(h.health,0,h.maxHealth);
    ensureProgression(h);
    deriveMoodlets(h);
    return h;
  }

  function effectActive(hero,id){ return (hero.prepEffects||[]).some(e=>e.id===id&&e.remaining>0); }
  function prepEffectRecord(hero,id){ return (hero.prepEffects||[]).find(e=>e.id===id&&e.remaining>0)||null; }
  function prepEffectValue(hero,id,key){
    const e=prepEffectRecord(hero,id),def=PREP_EFFECTS[id];
    if(!e||!def)return 0;
    return (Number(def[key])||0)*(Number(e.potency)||1);
  }
  function prepEffectRateMultiplier(hero,id,key){
    const e=prepEffectRecord(hero,id),def=PREP_EFFECTS[id];
    if(!e||!def)return 1;
    const base=Number(def[key]); if(!Number.isFinite(base))return 1;
    return clamp(1-(1-base)*(Number(e.potency)||1),0.25,1);
  }
  function setPrepEffect(hero,id,quality=1){
    if(!hero.prepEffects)hero.prepEffects=[];
    const def=PREP_EFFECTS[id];
    if(!def)return;
    const q=clamp(Math.floor(Number(quality)||1),1,6);
    const potency=1+0.08*(q-1);
    const remaining=Math.round(def.duration*(1+0.1*(q-1)));
    const existing=hero.prepEffects.find(e=>e.id===id);
    if(existing){
      existing.remaining=Math.max(existing.remaining||0,remaining);
      existing.potency=Math.max(Number(existing.potency)||1,potency);
      existing.quality=Math.max(Number(existing.quality)||1,q);
    }else hero.prepEffects.push({id,remaining,potency,quality:q});
  }
  function tickPrepEffects(hero,dt){
    if(!hero.prepEffects)return;
    for(const e of hero.prepEffects)e.remaining=Math.max(0,e.remaining-dt);
    hero.prepEffects=hero.prepEffects.filter(e=>e.remaining>0);
  }
  function totalInjurySeverity(hero){ return (hero.injuries||[]).reduce((n,i)=>n+(i.severity||1),0); }
  function injuryPenalty(hero,key){ return (hero.injuries||[]).reduce((n,i)=>n+(INJURY_TYPES[i.type]?.[key]||0)*(i.severity||1),0); }
  function worstInjury(hero){ return (hero.injuries||[]).slice().sort((a,b)=>(b.severity||1)-(a.severity||1))[0]||null; }
  function reduceWorstInjury(hero,amount=1){
    const i=worstInjury(hero);
    if(!i)return false;
    i.severity=Math.max(0,(i.severity||1)-amount);
    if(i.severity<=0)hero.injuries=hero.injuries.filter(x=>x!==i);
    return true;
  }
  function removeWorstInjury(hero){
    const i=worstInjury(hero);
    if(!i)return false;
    hero.injuries=hero.injuries.filter(x=>x!==i);
    return true;
  }
  function addInjury(hero,type,severity=1){
    if(!hero.injuries)hero.injuries=[];
    const existing=hero.injuries.find(i=>i.type===type);
    if(existing)existing.severity=clamp(existing.severity+severity,1,3);
    else hero.injuries.push({type,severity:clamp(severity,1,3)});
    deriveMoodlets(hero);
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
    if(totalInjurySeverity(hero)>0) m.push('Lingering Injury');
    for(const e of hero.prepEffects||[]){
      if(e.remaining>0&&PREP_EFFECTS[e.id])m.push(PREP_EFFECTS[e.id].name);
    }
    hero.moodlets=m;
    return m;
  }

  function gearPower(hero){
    const w=EQUIPMENT[hero.equipment.weapon]||EQUIPMENT.wood_axe;
    const a=EQUIPMENT[hero.equipment.armor]||{defense:0};
    const wd=durabilityMultiplier(hero.gearDurability?.weapon);
    const ad=hero.equipment.armor?durabilityMultiplier(hero.gearDurability?.armor):1;
    return (w.damage||0)*wd*1.3 + (a.defense||0)*ad*3 + (hero.supplies.healing_potion||0)*4 + (hero.supplies.field_bandage||0)*1.5;
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
    score-=injuryPenalty(hero,'readinessPenalty');
    for(const e of hero.prepEffects||[]){
      if(e.remaining>0)score+=(PREP_EFFECTS[e.id]?.readinessBonus||0)*(Number(e.potency)||1);
    }
    const skill=weapon(hero).kind==='ranged'?hero.career.skills.ranged:hero.career.skills.melee;
    score+=skill*1.2 + hero.career.skills.survival*0.7;
    if(trait(hero,'Veteran'))score+=3;
    if(trait(hero,'Battle Hardened'))score+=3;
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
    const armorMult=hero.equipment.armor?durabilityMultiplier(hero.gearDurability?.armor):1;
    return (armor?.defense||0)*armorMult + Math.floor(hero.stats.endurance/4) - Math.floor(totalInjurySeverity(hero)/2);
  }
  function weapon(hero){
    const base=EQUIPMENT[hero.equipment.weapon] || EQUIPMENT.wood_axe;
    return Object.assign({},base,{damage:(base.damage||0)*durabilityMultiplier(hero.gearDurability?.weapon),durability:normalizeDurability(hero.gearDurability?.weapon)});
  }

  class PreparationState {
    constructor({hero=makePreset('prepared'),funds=18,materials={},prepMinutes=0,facilities={}}={}){
      this.hero=heroTemplate(hero);
      this.funds=funds;
      this.materials=clone(materials);
      this.prepMinutes=prepMinutes;
      this.facilities=normalizeFacilityLevels(facilities);
      this.log=[];
      this.settledExpeditions=new Set();
    }
    advanceTime(minutes){
      this.prepMinutes+=minutes;
      this.hero.hunger=clamp(this.hero.hunger+minutes*0.02,0,100);
      this.hero.morale=clamp(this.hero.morale-minutes*0.002,0,100);
      deriveMoodlets(this.hero);
    }
    can(actionId){
      const a=PREPARATION_ACTIONS[actionId];
      if(!a||!this.hero.alive||this.funds<a.cost)return false;
      return a.canApply?a.canApply(this.hero):true;
    }
    apply(actionId){
      const a=PREPARATION_ACTIONS[actionId];
      if(!a)return{ok:false,reason:'unknown action'};
      if(!this.hero.alive)return{ok:false,reason:'hero is dead'};
      if(this.funds<a.cost)return{ok:false,reason:'insufficient funds'};
      if(a.canApply&&!a.canApply(this.hero))return{ok:false,reason:'not needed'};
      const facilityLevel=preparationFacilityLevel(this.facilities,actionId);
      const minutes=facilityActionMinutes(a.minutes,facilityLevel);
      const before={funds:this.funds,health:this.hero.health,hunger:this.hero.hunger,fatigue:this.hero.fatigue,morale:this.hero.morale,injuries:totalInjurySeverity(this.hero)};
      this.funds-=a.cost;
      this.advanceTime(minutes);
      a.apply(this.hero,facilityLevel);
      deriveMoodlets(this.hero);
      const event={action:actionId,name:a.name,facility:a.facility||null,facilityLevel,cost:a.cost,minutes,baseMinutes:a.minutes,before,after:{funds:this.funds,health:this.hero.health,hunger:this.hero.hunger,fatigue:this.hero.fatigue,morale:this.hero.morale,injuries:totalInjurySeverity(this.hero)}};
      this.log.push(event);
      return{ok:true,event};
    }
    setLoadout(weaponId,armorId){
      if(weaponId&&EQUIPMENT[weaponId]?.slot==='weapon'&&weaponId!==this.hero.equipment.weapon){this.hero.equipment.weapon=weaponId;this.hero.gearDurability.weapon=100;}
      const nextArmor=armorId&&EQUIPMENT[armorId]?.slot==='armor'?armorId:null;
      if(nextArmor!==this.hero.equipment.armor){this.hero.equipment.armor=nextArmor;this.hero.gearDurability.armor=100;}
      deriveMoodlets(this.hero);
    }
    settle(expedition){
      const key=`${expedition.contract.id}:${expedition.seed}:${expedition.elapsed}:${expedition.state}`;
      if(this.settledExpeditions.has(key))return{ok:false,reason:'already settled',banked:0};
      this.settledExpeditions.add(key);
      const banked=expedition.gold;
      this.funds+=banked;
      for(const [id,count] of Object.entries(expedition.materials))this.materials[id]=(this.materials[id]||0)+count;
      this.hero=heroTemplate(expedition.hero);
      this.hero.prepEffects=[];
      deriveMoodlets(this.hero);
      this.log.push({action:'settle',name:'Expedition settled',banked,outcome:expedition.state});
      return{ok:true,banked,heroAlive:this.hero.alive};
    }
    snapshot(){return{hero:clone(this.hero),funds:this.funds,materials:clone(this.materials),prepMinutes:this.prepMinutes,facilities:clone(this.facilities),log:clone(this.log)};}
  }

  class Expedition {
    constructor({hero=heroTemplate(),seed=1,contract=CONTRACT,debug=false}={}){
      this.rng=new RNG(seed); this.seed=seed; this.hero=heroTemplate(hero); this.contract=contract; this.debug=debug;
      deriveMoodlets(this.hero);
      this.state='deployed'; this.locationId=contract.start; this.elapsed=0; this.goldRate=0.04+contract.threat*0.005; this.peakGoldRate=this.goldRate; this.gold=0;
      this.enemiesDefeated=0; this.areasExplored=[]; this.objectiveProgress=0; this.materials={}; this.log=[]; this.decisionDebug=[]; this.injuriesSuffered=0;
      this.objectiveScore=0; this.objectiveMax=100; this.objectiveBonusGold=0; this.objectiveEvents=[]; this.objectiveAwards={};
      this.objectiveState=this.makeObjectiveState();
      this.currentCombat=null; this.retreatReason=null; this.lastDecision=null; this.gearOutcome=null; this._entered=false; this._resolution=null; this.actionClock=0;
      this.addLog(`Deployed to ${contract.name}.`, 'system');
    }
    addLog(text,type='event',reasons=[]){ this.log.push({time:this.elapsed,text,type,reasons}); if(this.log.length>250)this.log.shift(); }
    addMaterial(id,count=1){ this.materials[id]=(this.materials[id]||0)+count; }
    makeObjectiveState(){
      const rules=this.contract.objectiveRules||{};
      if(this.contract.kind==='Hunt')return{quarryKills:0,killTarget:rules.killTarget||5,trailFound:false,lairCleared:false};
      if(this.contract.kind==='Extermination')return{verminKills:0,killTarget:rules.killTarget||8,infestationReached:false,nestCleared:false};
      if(this.contract.kind==='Escort')return{caravanIntegrity:rules.startingIntegrity||100,checkpoints:0,checkpointIds:[]};
      if(this.contract.kind==='Delve')return{discoveries:0,discoveryIds:[],minersFound:false,minersRescued:0,rescueMax:rules.rescueMax||3};
      if(this.contract.kind==='Boss Hunt')return{approachReached:false,bossDamage:0,bossMaxHp:ENEMIES[rules.bossEnemy||'troll']?.hp||1,bossKilled:false,damageMilestones:[]};
      return{};
    }
    awardObjective(key,label,points,bonusMult=1){
      if(this.objectiveAwards[key])return false;
      const applied=Math.max(0,Math.min(points,this.objectiveMax-this.objectiveScore));
      if(applied<=0)return false;
      this.objectiveAwards[key]=true;
      this.objectiveScore=clamp(this.objectiveScore+applied,0,this.objectiveMax);
      const bonus=Number((applied*0.08*(this.contract.incomeMult||1)*bonusMult).toFixed(2));
      this.gold+=bonus; this.objectiveBonusGold+=bonus;
      this.bumpRate(applied*0.0015,'objective progress');
      const event={key,label,points:applied,score:this.objectiveScore,bonus};
      this.objectiveEvents.push(event);
      this.addLog(`Objective: ${label} (+${applied} score, +${bonus.toFixed(2)}g).`,'objective');
      return true;
    }
    objectiveLocation(loc){
      const rules=this.contract.objectiveRules||{},id=loc.id;
      if(this.contract.kind==='Hunt'&&id===rules.trailLocation){
        this.objectiveState.trailFound=true; this.awardObjective('hunt_trail','Pack trail found',15);
      }else if(this.contract.kind==='Extermination'&&id===rules.infestationLocation){
        this.objectiveState.infestationReached=true; this.awardObjective('extermination_reached','Infestation reached',12);
      }else if(this.contract.kind==='Delve'&&(rules.discoveryLocations||[]).includes(id)&&!this.objectiveState.discoveryIds.includes(id)){
        this.objectiveState.discoveryIds.push(id); this.objectiveState.discoveries++;
        this.awardObjective('delve_discovery_'+id,'Surveyed '+loc.name,10);
      }else if(this.contract.kind==='Boss Hunt'&&id===rules.approachLocation){
        this.objectiveState.approachReached=true; this.awardObjective('boss_approach','Reached the bridge approach',15);
      }
    }
    objectiveKill(enemyId,combat){
      const rules=this.contract.objectiveRules||{};
      if(this.contract.kind==='Hunt'&&enemyId===rules.quarryEnemy&&this.objectiveState.quarryKills<this.objectiveState.killTarget){
        this.objectiveState.quarryKills++; this.awardObjective('hunt_kill_'+this.objectiveState.quarryKills,'Wolf culled '+this.objectiveState.quarryKills+'/'+this.objectiveState.killTarget,7);
      }else if(this.contract.kind==='Extermination'&&(rules.verminEnemies||[]).includes(enemyId)&&this.objectiveState.verminKills<this.objectiveState.killTarget){
        this.objectiveState.verminKills++; this.awardObjective('vermin_kill_'+this.objectiveState.verminKills,'Vermin cleared '+this.objectiveState.verminKills+'/'+this.objectiveState.killTarget,5);
      }
      if(this.contract.kind==='Boss Hunt'&&combat?.boss&&enemyId===rules.bossEnemy){
        this.objectiveState.bossKilled=true; this.awardObjective('boss_killed','Bridge troll killed',35,1.35);
      }
    }
    objectiveDamage(enemyId,damage,combat){
      const rules=this.contract.objectiveRules||{};
      if(this.contract.kind!=='Boss Hunt'||!combat?.boss||enemyId!==rules.bossEnemy||damage<=0)return;
      this.objectiveState.bossDamage+=damage;
      const pct=clamp(this.objectiveState.bossDamage/Math.max(1,this.objectiveState.bossMaxHp)*100,0,100);
      for(const mark of [25,50,75]){
        if(pct>=mark&&!this.objectiveState.damageMilestones.includes(mark)){
          this.objectiveState.damageMilestones.push(mark);
          this.awardObjective('boss_damage_'+mark,'Bridge troll wounded to '+mark+'%',10,1.25);
        }
      }
    }
    objectiveCombatCleared(combat){
      const rules=this.contract.objectiveRules||{},id=combat?.locationId;
      if(this.contract.kind==='Hunt'&&id===rules.lairLocation){
        this.objectiveState.lairCleared=true; this.awardObjective('hunt_lair','Wolf den cleared',30);
      }else if(this.contract.kind==='Extermination'&&id===rules.nestLocation){
        this.objectiveState.nestCleared=true; this.awardObjective('extermination_nest','Main nest destroyed',28);
      }else if(this.contract.kind==='Escort'&&(rules.checkpointLocations||[]).includes(id)&&!this.objectiveState.checkpointIds.includes(id)){
        this.objectiveState.checkpointIds.push(id); this.objectiveState.checkpoints++;
        const label=this.contract.locations[id]?.name||'checkpoint';
        this.awardObjective('escort_checkpoint_'+id,'Caravan secured '+label,20);
      }else if(this.contract.kind==='Delve'&&id===rules.rescueLocation&&!this.objectiveState.minersFound){
        this.objectiveState.minersFound=true; this.awardObjective('delve_miners_found','Missing miners found',20);
        const skill=this.hero.stats.wits+this.hero.career.skills.survival;
        let rescued=1+(skill>=8?1:0)+(skill>=13?1:0);
        rescued=Math.min(this.objectiveState.rescueMax,rescued);
        this.objectiveState.minersRescued=rescued;
        for(let i=1;i<=rescued;i++)this.awardObjective('delve_rescue_'+i,'Miner rescued '+i+'/'+this.objectiveState.rescueMax,10);
      }
    }
    escortPressure(spec,livingCount){
      if(this.contract.kind!=='Escort'||livingCount<=0||this.state!=='deployed')return;
      const chance=clamp(0.16+spec.danger*0.22+livingCount*0.035,0.18,0.55);
      if(!this.rng.chance(chance))return;
      const damage=Math.round(this.rng.range(3,7)+spec.danger*4);
      this.objectiveState.caravanIntegrity=clamp(this.objectiveState.caravanIntegrity-damage,0,100);
      this.addLog(`The caravan took ${damage} damage (${Math.round(this.objectiveState.caravanIntegrity)}% integrity).`,'objective');
      if(this.objectiveState.caravanIntegrity<=0)this.finish('failure','caravan destroyed');
    }
    finalizeObjectiveScore(kind){
      if(kind!=='success')return;
      const remaining=this.objectiveMax-this.objectiveScore;
      if(remaining<=0)return;
      let mult=1;
      if(this.contract.kind==='Escort')mult=clamp(this.objectiveState.caravanIntegrity/100,0.35,1);
      this.awardObjective('primary_complete','Primary objective completed',remaining,mult);
    }
    wearGear(slot,amount=1){
      const itemId=this.hero.equipment?.[slot];
      if(!itemId||!isDurableItem(itemId))return 0;
      const before=normalizeDurability(this.hero.gearDurability?.[slot]),beforeCondition=durabilityCondition(before);
      const after=normalizeDurability(before-Math.max(0,amount));
      this.hero.gearDurability[slot]=after;
      const afterCondition=durabilityCondition(after);
      if(afterCondition!==beforeCondition)this.addLog(`${EQUIPMENT[itemId].name} is now ${afterCondition.toLowerCase()} (${Math.round(after)}%).`,'gear');
      return before-after;
    }
    bumpRate(amount,reason){ const before=this.goldRate; const scaled=amount*(this.contract.incomeMult||1); this.goldRate=clamp(this.goldRate+scaled,0,50); this.peakGoldRate=Math.max(this.peakGoldRate,this.goldRate); if(Math.abs(this.goldRate-before)>=0.009)this.addLog(`Performance ${before.toFixed(2)} → ${this.goldRate.toFixed(2)} reward rate — ${reason}.`,'income'); }
    updateNeeds(dt){
      const hungerMult=prepEffectRateMultiplier(this.hero,'hearty_meal','hungerRateMult');
      const fatigueMult=prepEffectRateMultiplier(this.hero,'good_sleep','fatigueRateMult');
      this.hero.hunger=clamp(this.hero.hunger+dt*0.11*hungerMult,0,100);
      this.hero.fatigue=clamp(this.hero.fatigue+dt*0.095*fatigueMult,0,100);
      if(this.hero.hunger>80) this.hero.morale=clamp(this.hero.morale-dt*0.025,0,100);
      if(this.hero.fatigue>85) this.hero.morale=clamp(this.hero.morale-dt*0.03,0,100);
      tickPrepEffects(this.hero,dt);
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
        if(trait(h,'Brave'))add(20,'brave'); if(trait(h,'Cautious'))add(-7,'cautious'); if(trait(h,'Veteran'))add(5,'veteran'); if(trait(h,'Battle Hardened'))add(5,'battle hardened'); add(-injuryPenalty(h,'retreatPressure')*(trait(h,'Brave')?0.35:1),'lingering injury');
      } else if(action==='retreat'){
        add((1-health)*70,health<0.5?'low health':'health stable');
        add(Math.max(0,h.fatigue-50)*0.6,h.fatigue>50?'fatigue':null);
        add(Math.max(0,h.hunger-65)*0.45,h.hunger>65?'hungry':null);
        add(Math.max(0,45-h.morale)*0.6,h.morale<45?'low morale':null);
        if(h.supplies.healing_potion<=0)add(9,'no healing potion');
        if(trait(h,'Cautious'))add(14,'cautious'); if(trait(h,'Brave'))add(-18,'brave'); if(trait(h,'Veteran'))add(-3,'veteran'); if(trait(h,'Battle Hardened'))add(-4,'battle hardened'); if(trait(h,'Survivor'))add(6,'survivor');
        if(moods.includes('Afraid'))add(18,'afraid');
        add(injuryPenalty(h,'retreatPressure')*(trait(h,'Brave')?0.3:1),'lingering injury');
        if(effectActive(h,'patched_up'))add(-prepEffectValue(h,'patched_up','retreatRelief'),'fresh treatment'); if(effectActive(h,'good_company'))add(-prepEffectValue(h,'good_company','retreatRelief'),'good company');
      } else if(action==='optional'){
        add((ctx.reward||0)*28,'valuable opportunity'); add(-(ctx.risk||0)*28,'danger');
        add((health-0.55)*28,health>0.65?'healthy':'injured'); add((55-h.fatigue)*0.15,h.fatigue<55?'rested':'fatigue');
        if(trait(h,'Greedy'))add(18,'greedy'); if(trait(h,'Cautious'))add(-14,'cautious'); if(trait(h,'Brave'))add(8,'brave'); if(moods.includes('Confident'))add(10,'confident'); add(-injuryPenalty(h,'retreatPressure')*0.7,'lingering injury');
      } else if(action==='heal'){
        add((1-health)*100,health<0.65?'wounded':'not badly hurt');
        add(h.supplies.healing_potion>0?18:-999,h.supplies.healing_potion>0?'potion available':'no potion');
        if(trait(h,'Resourceful'))add(8,'resourceful');
      } else if(action==='bandage'){
        add((1-health)*72,health<0.72?'wounded':'not badly hurt');
        add(h.supplies.field_bandage>0?15:-999,h.supplies.field_bandage>0?'bandage available':'no bandage');
        if(totalInjurySeverity(h)>0)add(12,'lingering injury');
        if(trait(h,'Resourceful'))add(5,'resourceful');
      } else if(action==='fight'){
        add(42,'enemy blocks path'); add(health*20,'current health'); add(h.stats.might+h.stats.finesse,'combat ability');
        if(trait(h,'Brave'))add(16,'brave'); if(trait(h,'Cautious'))add(-6,'cautious'); if(trait(h,'Veteran'))add(4,'veteran'); if(trait(h,'Battle Hardened'))add(5,'battle hardened'); add(-injuryPenalty(h,'retreatPressure')*0.6,'lingering injury');
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
        this.addLog(`Entered ${loc.name}.`,'location'); this.bumpRate(0.06+loc.progress*0.004,'exploration progress'); this.objectiveLocation(loc);
        for(const [mat,p] of loc.materials){ if(this.rng.chance(p)){ const c=this.rng.chance(0.25)?2:1; this.addMaterial(mat,c); this.addLog(`Recovered ${c} ${MATERIAL_NAMES[mat]}${c>1?'s':''}.`,'loot'); this.bumpRate(0.035*c,'useful materials discovered'); } }
      }
      if(loc.encounter){
        const count=this.rng.int(loc.encounter.count[0],loc.encounter.count[1]);
        this.startCombat(loc.encounter.enemy,count,loc.encounter); return;
      }
      this._entered=true;
    }
    startCombat(enemyId,count,meta={}){
      const spec=ENEMIES[enemyId];
      this.currentCombat={enemyId,enemies:Array.from({length:count},()=>({hp:spec.hp,maxHp:spec.hp})),round:0,distance:1,locationId:this.locationId,boss:!!meta.boss};
      this.addLog(`${this.hero.name} spotted ${count} ${spec.name}${count>1?'s':''}.`,'combat');
      const d=this.choose(['fight','retreat']);
      this.addLog(`${this.hero.name} chose to ${d.action}.`,'decision',d.reasons);
      if(d.action==='retreat' && this.canRetreat()){ this.finish('retreat','avoided combat'); }
    }
    canRetreat(){ return this.objectiveProgress>5; }
    maybeInjury(damage,spec){
      if(damage<5||this.hero.health<=0||this.hero.injuries.length>=3)return;
      const chance=clamp(0.035+damage*0.008+spec.danger*0.08,0.04,0.22);
      if(this.rng.chance(chance)){
        const type=this.rng.pick(Object.keys(INJURY_TYPES));
        const severity=damage>=9?2:1;
        addInjury(this.hero,type,severity); this.injuriesSuffered+=severity;
        this.addLog(`${this.hero.name} suffered ${INJURY_TYPES[type].name}${severity>1?' (severe)':''}.`,'injury');
      }
    }
    combatRound(){
      const c=this.currentCombat;if(!c||this.state!=='deployed')return;
      const spec=ENEMIES[c.enemyId],h=this.hero,w=weapon(h); c.round++;
      deriveMoodlets(h);
      if(h.health<=68 && h.supplies.field_bandage>0 && (h.supplies.healing_potion<=0 || h.health>45)){
        const bandage=this.choose(['bandage','fight']);
        if(bandage.action==='bandage'){
          const item=EQUIPMENT.field_bandage; h.supplies.field_bandage--; const before=h.health;
          h.health=clamp(h.health+item.heal+Math.floor(h.stats.wits/2),0,h.maxHealth);
          if(item.injuryRelief)reduceWorstInjury(h,item.injuryRelief);
          this.addLog(`${h.name} used a field bandage (${Math.round(before)} → ${Math.round(h.health)} HP).`,'decision',bandage.reasons);
          this.bumpRate(0.01,'field treatment');
          return;
        }
      }
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
        this.wearGear('weapon',this.contract.threat>=5?2:1);
        const careerSkill=w.kind==='ranged'?h.career.skills.ranged:h.career.skills.melee;
        const base=(w.damage + h.stats.might*0.8 + (w.kind==='ranged'?h.stats.finesse*0.7:h.stats.finesse*0.25) + careerSkill*0.5) * (trait(h,'Ratbane')?1.08:1);
        const cond=(100-h.fatigue)*0.0025 + (100-h.hunger)*0.0015;
        let mood=(h.moodlets.includes('Confident')?0.12:0)+(h.moodlets.includes('Afraid')?-0.12:0)+(h.moodlets.includes('Tired')?-0.1:0);
        if(effectActive(h,'hearty_meal'))mood+=prepEffectValue(h,'hearty_meal','attackBonus');
        if(effectActive(h,'good_sleep'))mood+=prepEffectValue(h,'good_sleep','attackBonus');
        if(effectActive(h,'good_company'))mood+=prepEffectValue(h,'good_company','attackBonus');
        const injuryMult=clamp(1-injuryPenalty(h,'attackPenalty'),0.65,1);
        const hitChance=clamp(0.62+h.stats.finesse*0.025 + careerSkill*0.012 + (w.kind==='ranged'?0.06:0)+mood-injuryPenalty(h,'attackPenalty')*0.35,0.25,0.96);
        if(this.rng.chance(hitChance)){
          const dmg=Math.max(1,Math.round(base*this.rng.range(0.82,1.18)*(1+cond+mood)*injuryMult-spec.defense));
          const actualDamage=Math.min(Math.max(0,target.hp),dmg); target.hp-=dmg; this.addLog(`${h.name} hit ${spec.name} for ${dmg}.`,'combat');
          this.objectiveDamage(c.enemyId,actualDamage,c);
          if(target.hp<=0){this.enemiesDefeated++;this.addLog(`${h.name} killed ${spec.name}.`,'combat');this.bumpRate(0.08+spec.xp*0.035,'enemy defeated');this.objectiveKill(c.enemyId,c);}
        } else this.addLog(`${h.name} missed ${spec.name}.`,'combat');
      }
      const living=c.enemies.filter(e=>e.hp>0);
      if(living.length===0){const cleared=clone(c);this.currentCombat=null;this._entered=true;this.hero.morale=clamp(this.hero.morale+4,0,100);this.objectiveCombatCleared(cleared);deriveMoodlets(h);return;}
      for(const enemy of living){
        let acc=spec.accuracy - h.stats.finesse*0.015;
        if(w.kind==='ranged' && style.action==='maintain_distance')acc-=0.16;
        if(this.rng.chance(clamp(acc,0.2,0.92))){
          const dmg=Math.max(1,Math.round(this.rng.range(spec.damage[0],spec.damage[1])-effectiveDefense(h)*0.6)); h.health-=dmg; this.wearGear('armor',1+(dmg>=10?1:0)); this.addLog(`${spec.name} wounded ${h.name} for ${dmg}.`,'combat'); this.maybeInjury(dmg,spec);
          if(h.health<=0){h.health=0;h.alive=false;deriveMoodlets(h);this.finish('death',`killed by ${spec.name}`);return;}
        }
      }
      if(this.state==='deployed')this.escortPressure(spec,living.length);
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
      dt=clamp(dt,0.05,900);
      const interval=contractActionInterval(this.contract);
      this.elapsed+=dt;
      this.gold+=this.goldRate*(dt/interval);
      this.updateNeeds(dt*EXPEDITION_NEED_TIME_SCALE);
      if(this.hero.health<=0){this.finish('death','fatal injuries');return;}
      this.actionClock+=dt;
      if(this.actionClock+1e-9<interval)return;
      this.actionClock=Math.max(0,this.actionClock-interval);
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
      this.finalizeObjectiveScore(kind);
      const finalRate=this.goldRate; this.state=kind; this.retreatReason=reason; this.goldRate=0;
      if(kind==='success'){this.objectiveProgress=100;this.hero.morale=clamp(this.hero.morale+10,0,100);this.addLog(`Contract completed. ${this.hero.name} returns alive.`,'result');}
      else if(kind==='retreat'){this.addLog(`Contract failed — ${this.hero.name} retreated (${reason}).`,'result');}
      else if(kind==='failure'){this.addLog(`Contract failed — ${reason}.`,'result');}
      else {this.hero.alive=false;this.addLog(`Contract failed — ${this.hero.name} died (${reason}).`,'result');}
      deriveMoodlets(this.hero);
      this._resolution={kind,reason,finalRate,summary:this.summary()};
    }
    summary(){
      return {contractId:this.contract.id,contract:this.contract.name,threat:this.contract.threat,kind:this.contract.kind,outcome:this.state,reason:this.retreatReason,time:this.elapsed,enemiesDefeated:this.enemiesDefeated,areasExplored:this.areasExplored.length,totalAreas:Object.keys(this.contract.locations).length-1,objectiveProgress:Math.round(this.objectiveProgress),objectiveScore:Math.round(this.objectiveScore),objectiveMax:this.objectiveMax,objectiveBonusGold:Number(this.objectiveBonusGold.toFixed(2)),objectiveEvents:clone(this.objectiveEvents),objectiveState:clone(this.objectiveState),peakGoldRate:this.peakGoldRate,totalGold:this.gold,materials:clone(this.materials),heroAlive:this.hero.alive,health:this.hero.health,fatigue:this.hero.fatigue,hunger:this.hero.hunger,morale:this.hero.morale,injuries:clone(this.hero.injuries),moodlets:clone(this.hero.moodlets),gearDurability:clone(this.hero.gearDurability),gearOutcome:clone(this.gearOutcome),injuriesSuffered:this.injuriesSuffered,seed:this.seed};
    }
    snapshot(){
      return {version:5,contractId:this.contract.id,seed:this.seed,rngState:this.rng.state,hero:clone(this.hero),state:this.state,locationId:this.locationId,elapsed:this.elapsed,actionClock:this.actionClock,goldRate:this.goldRate,peakGoldRate:this.peakGoldRate,gold:this.gold,enemiesDefeated:this.enemiesDefeated,areasExplored:clone(this.areasExplored),objectiveProgress:this.objectiveProgress,objectiveScore:this.objectiveScore,objectiveMax:this.objectiveMax,objectiveBonusGold:this.objectiveBonusGold,objectiveEvents:clone(this.objectiveEvents),objectiveAwards:clone(this.objectiveAwards),objectiveState:clone(this.objectiveState),materials:clone(this.materials),log:clone(this.log),decisionDebug:clone(this.decisionDebug),currentCombat:clone(this.currentCombat),retreatReason:this.retreatReason,lastDecision:clone(this.lastDecision),gearOutcome:clone(this.gearOutcome),entered:this._entered,resolution:clone(this._resolution),injuriesSuffered:this.injuriesSuffered};
    }
    static fromSnapshot(data,{contract=null,debug=false}={}){
      if(!data||!data.hero)throw new Error('invalid expedition snapshot');
      contract=contract||CONTRACTS[data.contractId]||CONTRACT;
      const e=new Expedition({hero:data.hero,seed:data.seed||1,contract,debug});
      e.rng.state=(data.rngState>>>0)||e.rng.state;
      e.state=data.state||'deployed'; e.locationId=data.locationId||contract.start; e.elapsed=Number(data.elapsed)||0; e.actionClock=Math.max(0,Number(data.actionClock)||0);
      e.goldRate=Number(data.goldRate)||0; e.peakGoldRate=Number(data.peakGoldRate)||0; e.gold=Number(data.gold)||0;
      e.enemiesDefeated=Number(data.enemiesDefeated)||0; e.areasExplored=clone(data.areasExplored||[]); e.objectiveProgress=Number(data.objectiveProgress)||0;
      e.objectiveScore=data.objectiveScore==null?Math.min(95,Math.round(e.objectiveProgress)):Number(data.objectiveScore)||0;
      e.objectiveMax=Number(data.objectiveMax)||100; e.objectiveBonusGold=Number(data.objectiveBonusGold)||0;
      e.objectiveEvents=clone(data.objectiveEvents||[]); e.objectiveAwards=clone(data.objectiveAwards||{});
      e.objectiveState=clone(data.objectiveState||e.makeObjectiveState());
      e.materials=clone(data.materials||{}); e.log=clone(data.log||[]); e.decisionDebug=clone(data.decisionDebug||[]); e.currentCombat=clone(data.currentCombat||null);
      e.retreatReason=data.retreatReason||null; e.lastDecision=clone(data.lastDecision||null); e.gearOutcome=clone(data.gearOutcome||null); e._entered=!!data.entered; e._resolution=clone(data.resolution||null); e.injuriesSuffered=Number(data.injuriesSuffered)||0;
      return e;
    }
    runToEnd(maxTicks=5000,dt=1){ const step=Math.max(Number(dt)||1,contractActionInterval(this.contract));let n=0;while(this.state==='deployed'&&n++<maxTicks)this.tick(step);return this.summary(); }
  }

  class ExpeditionManager {
    constructor(data={}){
      this.nextId=Math.max(1,Number(data.nextId)||1);
      this.entries=[];
      for(const raw of data.entries||[]){
        if(!raw||!raw.expedition)continue;
        const expedition=raw.expedition instanceof Expedition?raw.expedition:Expedition.fromSnapshot(raw.expedition,{debug:true});
        const id=raw.id||('exp_'+this.nextId++);
        const speed=[0,1,4,12].includes(Number(raw.speed))?Number(raw.speed):1;
        this.entries.push({
          id,
          heroId:raw.heroId||expedition.hero.id,
          speed,
          settled:!!raw.settled,
          settlement:clone(raw.settlement||null),
          expedition
        });
        const numeric=Number(String(id).replace(/\D/g,''));
        if(Number.isFinite(numeric))this.nextId=Math.max(this.nextId,numeric+1);
      }
      this.selectedId=data.selectedId&&this.entries.some(e=>e.id===data.selectedId)?data.selectedId:(this.entries[0]?.id||null);
    }
    get(id=this.selectedId){ return this.entries.find(e=>e.id===id)||null; }
    select(id){ if(this.entries.some(e=>e.id===id)){this.selectedId=id;return true;}return false; }
    activeEntries(){ return this.entries.filter(e=>e.expedition.state==='deployed'); }
    hasHero(heroId){ return this.entries.some(e=>e.heroId===heroId&&!e.settled); }
    deploy({hero,seed=1,contract=CONTRACT,speed=1}={}){
      if(!hero||!hero.alive)return{ok:false,reason:'hero unavailable'};
      if(this.hasHero(hero.id))return{ok:false,reason:'hero already deployed'};
      const expedition=new Expedition({hero,seed,contract,debug:true});
      const entry={id:'exp_'+this.nextId++,heroId:hero.id,speed:[0,1,4,12].includes(Number(speed))?Number(speed):1,settled:false,settlement:null,expedition};
      this.entries.push(entry); this.selectedId=entry.id;
      return{ok:true,entry};
    }
    setSpeed(id,speed){
      const e=this.get(id),n=Number(speed);
      if(!e||![0,1,4,12].includes(n))return false;
      e.speed=n; return true;
    }
    tickAll(dt=1){
      dt=clamp(dt,0.05,3);
      const resolved=[];
      for(const e of this.entries){
        if(e.expedition.state!=='deployed'||e.speed<=0)continue;
        for(let i=0;i<e.speed&&e.expedition.state==='deployed';i++)e.expedition.tick(dt);
        if(e.expedition.state!=='deployed')resolved.push(e.id);
      }
      return resolved;
    }
    markSettled(id,settlement){
      const e=this.get(id); if(!e)return false;
      e.settled=true; e.settlement=clone(settlement||null); return true;
    }
    close(id){
      const i=this.entries.findIndex(e=>e.id===id);
      if(i<0)return false;
      const e=this.entries[i];
      if(e.expedition.state==='deployed'||!e.settled)return false;
      this.entries.splice(i,1);
      if(this.selectedId===id)this.selectedId=this.entries[i]?.id||this.entries[i-1]?.id||null;
      return true;
    }
    snapshot(){
      return {version:1,nextId:this.nextId,selectedId:this.selectedId,entries:this.entries.map(e=>({id:e.id,heroId:e.heroId,speed:e.speed,settled:e.settled,settlement:clone(e.settlement),expedition:e.expedition.snapshot()}))};
    }
    static fromSnapshot(data){ return new ExpeditionManager(data||{}); }
  }

  function makePreset(name){
    if(name==='prepared')return heroTemplate({id:'edrin',name:'Edrin Vale',health:100,hunger:10,fatigue:8,morale:78,traits:['Cautious','Resourceful'],equipment:{weapon:'rusty_sword',armor:'padded_armor'},supplies:{healing_potion:1}});
    if(name==='ranged')return heroTemplate({id:'mara',name:'Mara Fen',stats:{might:4,finesse:8,endurance:5,wits:7,resolve:6},health:100,hunger:14,fatigue:10,morale:75,traits:['Cautious','Resourceful'],equipment:{weapon:'hunting_bow',armor:'leather_armor'},supplies:{healing_potion:1}});
    if(name==='reckless')return heroTemplate({id:'borin',name:'Borin Hale',stats:{might:7,finesse:4,endurance:6,wits:3,resolve:8},health:100,hunger:25,fatigue:20,morale:82,traits:['Brave','Greedy'],equipment:{weapon:'rusty_sword',armor:null},supplies:{healing_potion:0}});
    if(name==='unprepared')return heroTemplate({id:'tomas',name:'Tomas Reed',stats:{might:4,finesse:4,endurance:4,wits:4,resolve:4},health:78,hunger:82,fatigue:80,morale:32,traits:['Cautious'],equipment:{weapon:'wood_axe',armor:null},supplies:{healing_potion:0}});
    return heroTemplate();
  }
  function starterRoster(){ return [makePreset('prepared'),makePreset('ranged'),makePreset('reckless')]; }

  const PATRON_TYPES = {
    laborer:{id:'laborer',name:'Laborer',foodChance:0.9,drinkChance:0.72,foodSpend:1.35,drinkSpend:0.8,stay:7},
    traveler:{id:'traveler',name:'Traveler',foodChance:0.82,drinkChance:0.62,foodSpend:1.7,drinkSpend:1.05,stay:8},
    adventurer:{id:'adventurer',name:'Adventurer',foodChance:0.78,drinkChance:0.9,foodSpend:1.65,drinkSpend:1.35,stay:9},
    merchant:{id:'merchant',name:'Merchant',foodChance:0.68,drinkChance:0.66,foodSpend:2.15,drinkSpend:1.55,stay:10}
  };
  const PATRON_ROTATION=['laborer','laborer','traveler','laborer','adventurer','traveler','merchant','adventurer'];

  const MERCHANT_GOODS = {
    scrap_iron:{id:'scrap_iron',name:'Scrap Iron',type:'material',minQuality:1,price:4,maxQty:4},
    rat_tail:{id:'rat_tail',name:'Rat Tail',type:'material',minQuality:1,price:3,maxQty:4},
    medicinal_herb:{id:'medicinal_herb',name:'Medicinal Herb',type:'material',minQuality:1,price:5,maxQty:3},
    strange_gland:{id:'strange_gland',name:'Strange Gland',type:'material',minQuality:2,price:11,maxQty:2},
    wood_axe:{id:'wood_axe',name:'Wood Axe',type:'item',minQuality:1,price:8,maxQty:1},
    rusty_sword:{id:'rusty_sword',name:'Rusty Sword',type:'item',minQuality:1,price:14,maxQty:1},
    padded_armor:{id:'padded_armor',name:'Padded Armor',type:'item',minQuality:1,price:17,maxQty:1},
    hunting_bow:{id:'hunting_bow',name:'Hunting Bow',type:'item',minQuality:2,price:23,maxQty:1},
    leather_armor:{id:'leather_armor',name:'Leather Armor',type:'item',minQuality:2,price:29,maxQty:1},
    healing_potion:{id:'healing_potion',name:'Healing Potion',type:'item',minQuality:2,price:13,maxQty:2},
    steel_sword:{id:'steel_sword',name:'Steel Sword',type:'item',minQuality:3,price:44,maxQty:1},
    chain_mail:{id:'chain_mail',name:'Chain Mail',type:'item',minQuality:3,price:52,maxQty:1}
  };
  const MERCHANT_NAMES=['Mira the Peddler','Orren of the Road','Kestra Provisioner','Dain Copperhand'];

  const APPLICANT_FIRST_NAMES=['Alden','Brina','Corin','Dessa','Eamon','Fara','Garrick','Hesta','Iven','Jora','Kellan','Lysa','Marek','Nessa','Orin','Petra','Quill','Rhea','Soren','Tamsin'];
  const APPLICANT_LAST_NAMES=['Ash','Briar','Crow','Dale','Ember','Fen','Grove','Hale','Iron','Kestrel','Moor','Reed','Stone','Vale','Wren'];
  const APPLICANT_TRAITS=['Brave','Cautious','Resourceful','Greedy'];

  function merchantQuality(tavern){
    const score=tavern.serviceLevel+tavern.kitchenLevel+tavern.barLevel+Math.floor(tavern.seats/2);
    if(score>=11)return 3;
    if(score>=7)return 2;
    return 1;
  }

  function applicantQuality(tavern){
    const score=tavern.serviceLevel+tavern.kitchenLevel+tavern.barLevel+Math.floor(tavern.seats/2);
    if(score>=11)return 3;
    if(score>=7)return 2;
    return 1;
  }

  class RecruitmentSystem {
    constructor(data={}){
      this.seed=Number(data.seed)||44771;
      this.rng=new RNG(this.seed);
      if(data.rngState)this.rng.state=data.rngState>>>0;
      this.elapsed=Number(data.elapsed)||0;
      this.visitIndex=Math.max(0,Number(data.visitIndex)||0);
      this.nextArrival=data.nextArrival==null?16:Math.max(0,Number(data.nextArrival)||0);
      this.active=clone(data.active||null);
      this.recruited=Math.max(0,Number(data.recruited)||0);
      this.expired=Math.max(0,Number(data.expired)||0);
      this.log=clone(data.log||[]);
    }
    logEvent(text,type='applicant'){
      this.log.push({time:this.elapsed,text,type});
      if(this.log.length>50)this.log.shift();
    }
    qualityFor(tavern){ return applicantQuality(tavern); }
    uniqueName(){
      const first=this.rng.pick(APPLICANT_FIRST_NAMES);
      const last=this.rng.pick(APPLICANT_LAST_NAMES);
      return first+' '+last;
    }
    gearFor(quality){
      const weaponPools={
        1:['wood_axe','rusty_sword'],
        2:['rusty_sword','hunting_bow'],
        3:['hunting_bow','steel_sword']
      };
      const armorPools={
        1:[null,'padded_armor'],
        2:['padded_armor','leather_armor'],
        3:['leather_armor','chain_mail']
      };
      return {weapon:this.rng.pick(weaponPools[quality]),armor:this.rng.pick(armorPools[quality])};
    }
    generateHero(quality){
      const ranges={1:[3,6],2:[4,7],3:[5,8]};
      const [lo,hi]=ranges[quality];
      const stats={might:this.rng.int(lo,hi),finesse:this.rng.int(lo,hi),endurance:this.rng.int(lo,hi),wits:this.rng.int(lo,hi),resolve:this.rng.int(lo,hi)};
      const traitCount=quality>=3?2:1;
      const traitPool=APPLICANT_TRAITS.slice(),traits=[];
      while(traits.length<traitCount&&traitPool.length){
        const idx=this.rng.int(0,traitPool.length-1);
        traits.push(traitPool.splice(idx,1)[0]);
      }
      const health=this.rng.int(quality===1?64:quality===2?70:78,100);
      const hunger=this.rng.int(quality===1?18:quality===2?12:8,quality===1?62:quality===2?50:38);
      const fatigue=this.rng.int(quality===1?12:quality===2?8:4,quality===1?58:quality===2?46:34);
      const morale=this.rng.int(quality===1?38:quality===2?46:55,quality===1?76:quality===2?82:90);
      const equipment=this.gearFor(quality);
      const potionChance=quality===1?0.12:quality===2?0.38:0.65;
      const supplies={healing_potion:this.rng.chance(potionChance)?1:0,field_bandage:0};
      const id='recruit_'+this.visitIndex+'_'+this.rng.nextU32().toString(36);
      return heroTemplate({id,name:this.uniqueName(),stats,health,hunger,fatigue,morale,traits,equipment,supplies,career:normalizeCareer(),history:[],titles:[],recruitment:{quality,visitIndex:this.visitIndex}});
    }
    costFor(hero,quality){
      const statTotal=Object.values(hero.stats).reduce((n,v)=>n+v,0);
      const w=EQUIPMENT[hero.equipment.weapon]||EQUIPMENT.wood_axe;
      const a=EQUIPMENT[hero.equipment.armor]||{defense:0};
      const gearValue=(w.damage||0)*0.7+(a.defense||0)*2.1+(hero.supplies.healing_potion||0)*5;
      return Math.max(12,Math.round(7+quality*6+statTotal*0.42+gearValue));
    }
    arrive(tavern){
      this.visitIndex++;
      const quality=this.qualityFor(tavern);
      const hero=this.generateHero(quality);
      const cost=this.costFor(hero,quality);
      this.active={quality,cost,remaining:80,hero};
      this.nextArrival=0;
      this.logEvent(hero.name+' is looking for work (quality '+quality+', '+cost+'g).','arrival');
      return this.active;
    }
    depart(reason='left'){
      if(this.active){
        this.logEvent(this.active.hero.name+' '+reason+'.','departure');
        this.expired++;
      }
      this.active=null;
      this.nextArrival=48;
    }
    recruit(){
      if(!this.active)return null;
      const a=clone(this.active);
      this.recruited++;
      this.logEvent(a.hero.name+' joined the tavern roster.','recruited');
      this.active=null;
      this.nextArrival=48;
      return a;
    }
    tick(dt,tavern){
      dt=clamp(dt,0.01,5);
      this.elapsed+=dt;
      if(this.active){
        this.active.remaining-=dt;
        if(this.active.remaining<=0)this.depart('moved on');
      }else{
        this.nextArrival=Math.max(0,this.nextArrival-dt);
        if(this.nextArrival<=0)this.arrive(tavern);
      }
    }
    snapshot(){
      return {version:1,seed:this.seed,rngState:this.rng.state,elapsed:this.elapsed,visitIndex:this.visitIndex,nextArrival:this.nextArrival,active:clone(this.active),recruited:this.recruited,expired:this.expired,log:clone(this.log)};
    }
    static fromSnapshot(data){ return new RecruitmentSystem(data||{}); }
  }

  class MerchantSystem {
    constructor(data={}){
      this.seed=Number(data.seed)||99173;
      this.rng=new RNG(this.seed);
      if(data.rngState)this.rng.state=data.rngState>>>0;
      this.elapsed=Number(data.elapsed)||0;
      this.visitIndex=Math.max(0,Number(data.visitIndex)||0);
      this.nextArrival=data.nextArrival==null?10:Math.max(0,Number(data.nextArrival)||0);
      this.active=clone(data.active||null);
      this.log=clone(data.log||[]);
    }
    logEvent(text,type='merchant'){
      this.log.push({time:this.elapsed,text,type});
      if(this.log.length>40)this.log.shift();
    }
    qualityFor(tavern){ return merchantQuality(tavern); }
    generateOffers(quality){
      const eligible=Object.values(MERCHANT_GOODS).filter(g=>g.minQuality<=quality);
      const materials=eligible.filter(g=>g.type==='material');
      const equipment=eligible.filter(g=>g.type==='item'&&EQUIPMENT[g.id]?.slot!=='consumable');
      const consumables=eligible.filter(g=>g.type==='item'&&EQUIPMENT[g.id]?.slot==='consumable');
      const chosen=[];
      const addUnique=(g)=>{
        if(!g||chosen.some(x=>x.id===g.id))return;
        const quantity=g.type==='material'?this.rng.int(Math.max(1,g.maxQty-1),g.maxQty):this.rng.int(1,g.maxQty);
        chosen.push({key:'offer_'+this.visitIndex+'_'+chosen.length,id:g.id,name:g.name,type:g.type,unitPrice:g.price,quantity,minQuality:g.minQuality});
      };
      addUnique(this.rng.pick(materials));
      addUnique(this.rng.pick(equipment));
      if(consumables.length)addUnique(this.rng.pick(consumables));
      const pool=eligible.filter(g=>!chosen.some(x=>x.id===g.id));
      const target=Math.min(quality===1?4:quality===2?6:7,eligible.length);
      while(chosen.length<target&&pool.length){
        const idx=this.rng.int(0,pool.length-1);
        addUnique(pool.splice(idx,1)[0]);
      }
      return chosen;
    }
    arrive(tavern){
      this.visitIndex++;
      const quality=this.qualityFor(tavern);
      const name=MERCHANT_NAMES[(this.visitIndex-1)%MERCHANT_NAMES.length];
      this.active={name,quality,remaining:60,offers:this.generateOffers(quality)};
      this.nextArrival=0;
      this.logEvent(name+' arrived with quality '+quality+' stock.','arrival');
      return this.active;
    }
    depart(){
      if(this.active)this.logEvent(this.active.name+' departed.','departure');
      this.active=null;
      this.nextArrival=55;
    }
    tick(dt,tavern){
      dt=clamp(dt,0.01,5);
      this.elapsed+=dt;
      if(this.active){
        this.active.remaining-=dt;
        if(this.active.remaining<=0)this.depart();
      }else{
        this.nextArrival=Math.max(0,this.nextArrival-dt);
        if(this.nextArrival<=0)this.arrive(tavern);
      }
    }
    snapshot(){
      return {version:1,seed:this.seed,rngState:this.rng.state,elapsed:this.elapsed,visitIndex:this.visitIndex,nextArrival:this.nextArrival,active:clone(this.active),log:clone(this.log)};
    }
    static fromSnapshot(data){ return new MerchantSystem(data||{}); }
  }

  class TavernEconomy {
    constructor(data={}){
      this.seed=Number(data.seed)||73129;
      this.rng=new RNG(this.seed);
      if(data.rngState)this.rng.state=data.rngState>>>0;
      this.seats=Math.max(2,Number(data.seats)||2);
      this.serviceLevel=Math.max(1,Number(data.serviceLevel)||1);
      this.kitchenLevel=Math.max(1,Number(data.kitchenLevel)||1);
      this.barLevel=Math.max(1,Number(data.barLevel)||1);
      this.lodgingLevel=Math.max(1,Number(data.lodgingLevel)||1);
      this.infirmaryLevel=Math.max(1,Number(data.infirmaryLevel)||1);
      this.workshopLevel=Math.max(1,Number(data.workshopLevel)||1);
      this.elapsed=Number(data.elapsed)||0;
      this.arrivalClock=Number(data.arrivalClock)||0;
      this.nextPatronId=Math.max(1,Number(data.nextPatronId)||1);
      this.patronIndex=Math.max(0,Number(data.patronIndex)||0);
      this.queue=clone(data.queue||[]);
      this.active=clone(data.active||[]);
      this.served=Math.max(0,Number(data.served)||0);
      this.lost=Math.max(0,Number(data.lost)||0);
      this.totalRevenue=Math.max(0,Number(data.totalRevenue)||0);
      this.foodServed=Math.max(0,Number(data.foodServed)||0);
      this.drinksServed=Math.max(0,Number(data.drinksServed)||0);
      this.revenueEvents=clone(data.revenueEvents||[]);
      this.log=clone(data.log||[]);
    }
    facilityLevels(){ return normalizeFacilityLevels({kitchen:this.kitchenLevel,bar:this.barLevel,lodging:this.lodgingLevel,infirmary:this.infirmaryLevel,workshop:this.workshopLevel}); }
    arrivalInterval(){ return 5.2; }
    maxQueue(){ return 5; }
    serviceSlots(){ return 1+Math.floor((this.serviceLevel-1)/2); }
    serviceTime(patron){
      const items=(patron.food?1:0)+(patron.drink?1:0);
      return Math.max(2.8,(5.8+items*1.4)*(1-0.12*(this.serviceLevel-1)));
    }
    orderValue(patron){
      const type=PATRON_TYPES[patron.type]||PATRON_TYPES.laborer;
      let value=0;
      if(patron.food)value+=type.foodSpend*(1+0.18*(this.kitchenLevel-1));
      if(patron.drink)value+=type.drinkSpend*(1+0.18*(this.barLevel-1));
      return Math.max(0.5,value);
    }
    averageSpend(){
      let total=0;
      for(const id of PATRON_ROTATION){
        const t=PATRON_TYPES[id];
        total+=t.foodChance*t.foodSpend*(1+0.18*(this.kitchenLevel-1));
        total+=t.drinkChance*t.drinkSpend*(1+0.18*(this.barLevel-1));
      }
      return total/PATRON_ROTATION.length;
    }
    averageCycleTime(){
      let stay=0;
      for(const id of PATRON_ROTATION)stay+=PATRON_TYPES[id].stay;
      stay/=PATRON_ROTATION.length;
      const meanItems=1.55;
      const service=Math.max(2.8,(5.8+meanItems*1.4)*(1-0.12*(this.serviceLevel-1)));
      return {service,stay,total:service+stay};
    }
    projectedGoldRate(){
      const cycle=this.averageCycleTime();
      const arrivalCap=1/this.arrivalInterval();
      const serviceCap=this.serviceSlots()/cycle.service;
      const seatingCap=this.seats/cycle.total;
      return Math.min(arrivalCap,serviceCap,seatingCap)*this.averageSpend();
    }
    rollingGoldRate(windowSeconds=30){
      const start=this.elapsed-windowSeconds;
      this.revenueEvents=this.revenueEvents.filter(e=>e.time>=start);
      const revenue=this.revenueEvents.reduce((n,e)=>n+e.gold,0);
      const span=Math.min(windowSeconds,Math.max(1,this.elapsed));
      return revenue/span;
    }
    createPatron(){
      const typeId=PATRON_ROTATION[this.patronIndex++%PATRON_ROTATION.length];
      const type=PATRON_TYPES[typeId];
      let food=this.rng.chance(type.foodChance),drink=this.rng.chance(type.drinkChance);
      if(!food&&!drink)(this.rng.chance(0.5)?food=true:drink=true);
      return {id:this.nextPatronId++,type:typeId,food,drink,served:false,remainingService:0,remainingStay:0};
    }
    logEvent(text,type='service'){
      this.log.push({time:this.elapsed,text,type});
      if(this.log.length>40)this.log.shift();
    }
    arrive(){
      const p=this.createPatron();
      if(this.active.length<this.seats){
        this.seat(p);
      }else if(this.queue.length<this.maxQueue()){
        this.queue.push(p);
        this.logEvent(PATRON_TYPES[p.type].name+' waits for a seat.','arrival');
      }else{
        this.lost++;
        this.logEvent(PATRON_TYPES[p.type].name+' left; the tavern was full.','lost');
      }
    }
    seat(p){
      p.remainingService=this.serviceTime(p);
      p.remainingStay=0;
      this.active.push(p);
      this.logEvent(PATRON_TYPES[p.type].name+' took a seat.','arrival');
    }
    fillSeats(){
      while(this.active.length<this.seats&&this.queue.length)this.seat(this.queue.shift());
    }
    tick(dt=1){
      dt=clamp(dt,0.01,5);
      this.elapsed+=dt;
      this.arrivalClock+=dt;
      while(this.arrivalClock>=this.arrivalInterval()){
        this.arrivalClock-=this.arrivalInterval();
        this.arrive();
      }
      this.fillSeats();

      const serving=this.active.filter(p=>!p.served).slice(0,this.serviceSlots());
      let earned=0;
      for(const p of serving){
        p.remainingService-=dt;
        if(p.remainingService<=0&&!p.served){
          p.served=true;
          const type=PATRON_TYPES[p.type]||PATRON_TYPES.laborer;
          p.remainingStay=type.stay;
          const gold=this.orderValue(p);
          earned+=gold; this.totalRevenue+=gold; this.served++;
          if(p.food)this.foodServed++;
          if(p.drink)this.drinksServed++;
          this.revenueEvents.push({time:this.elapsed,gold});
          const items=[p.food?'food':null,p.drink?'drink':null].filter(Boolean).join(' + ');
          this.logEvent(type.name+' paid '+gold.toFixed(1)+'g for '+items+'.','sale');
        }
      }
      for(const p of this.active){ if(p.served)p.remainingStay-=dt; }
      this.active=this.active.filter(p=>!p.served||p.remainingStay>0);
      this.fillSeats();
      this.rollingGoldRate();
      return earned;
    }
    upgradeCost(id){
      if(id==='seats')return 18+this.seats*5;
      if(id==='service')return 28*this.serviceLevel;
      if(id==='kitchen')return 24*this.kitchenLevel;
      if(id==='bar')return 20*this.barLevel;
      if(id==='lodging')return 26*this.lodgingLevel;
      if(id==='infirmary')return 34*this.infirmaryLevel;
      if(id==='workshop')return 30*this.workshopLevel;
      return Infinity;
    }
    canUpgrade(id){
      if(id==='seats')return this.seats<12;
      if(id==='service')return this.serviceLevel<6;
      if(id==='kitchen')return this.kitchenLevel<6;
      if(id==='bar')return this.barLevel<6;
      if(id==='lodging')return this.lodgingLevel<6;
      if(id==='infirmary')return this.infirmaryLevel<6;
      if(id==='workshop')return this.workshopLevel<6;
      return false;
    }
    upgrade(id){
      if(!this.canUpgrade(id))return false;
      if(id==='seats')this.seats+=2;
      else if(id==='service')this.serviceLevel++;
      else if(id==='kitchen')this.kitchenLevel++;
      else if(id==='bar')this.barLevel++;
      else if(id==='lodging')this.lodgingLevel++;
      else if(id==='infirmary')this.infirmaryLevel++;
      else if(id==='workshop')this.workshopLevel++;
      else return false;
      this.logEvent('Tavern upgraded: '+id+'.','upgrade');
      return true;
    }
    snapshot(){
      return {version:2,seed:this.seed,rngState:this.rng.state,seats:this.seats,serviceLevel:this.serviceLevel,kitchenLevel:this.kitchenLevel,barLevel:this.barLevel,lodgingLevel:this.lodgingLevel,infirmaryLevel:this.infirmaryLevel,workshopLevel:this.workshopLevel,elapsed:this.elapsed,arrivalClock:this.arrivalClock,nextPatronId:this.nextPatronId,patronIndex:this.patronIndex,queue:clone(this.queue),active:clone(this.active),served:this.served,lost:this.lost,totalRevenue:this.totalRevenue,foodServed:this.foodServed,drinksServed:this.drinksServed,revenueEvents:clone(this.revenueEvents),log:clone(this.log)};
    }
    static fromSnapshot(data){ return new TavernEconomy(data||{}); }
  }


  const CHRONICLE_RECORD_LABELS={
    contracts:'Most Contracts',
    successes:'Most Successes',
    kills:'Most Kills',
    careerGold:'Most Career Gold',
    rank:'Highest Rank',
    objectiveScore:'Best Objective Score',
    payout:'Largest Contract Payout'
  };

  function isLegendaryHero(hero){
    if(!hero)return false;
    const c=normalizeCareer(hero.career);
    return c.rank>=4||c.successes>=3||c.kills>=10||(hero.titles||[]).length>=2;
  }

  class Chronicle {
    constructor(data={}){
      this.version=1;
      this.nextId=Math.max(1,Number(data.nextId)||1);
      this.entries=clone(data.entries||[]);
      this.milestones=clone(data.milestones||[]);
      this.records=clone(data.records||{});
      for(const e of this.entries){
        const n=Number(String(e.id||'').replace(/\D/g,''));
        if(Number.isFinite(n))this.nextId=Math.max(this.nextId,n+1);
      }
    }
    add(type,title,text='',meta={},time=0,importance='normal'){
      const entry={
        id:'chron_'+this.nextId++,
        type:String(type||'event'),
        title:String(title||'Untitled event'),
        text:String(text||''),
        time:Math.max(0,Number(time)||0),
        importance,
        heroId:meta.heroId||null,
        heroName:meta.heroName||null,
        contractId:meta.contractId||null,
        meta:clone(meta||{})
      };
      this.entries.push(entry);
      if(this.entries.length>1000)this.entries=this.entries.slice(-1000);
      return entry;
    }
    hasMilestone(key){ return this.milestones.some(m=>m.key===key); }
    milestone(key,title,text='',meta={},time=0,importance='major'){
      if(this.hasMilestone(key))return null;
      const marker={key,title,time:Math.max(0,Number(time)||0),meta:clone(meta||{})};
      this.milestones.push(marker);
      return this.add('milestone',title,text,Object.assign({milestoneKey:key},meta),time,importance);
    }
    setRecord(key,value,hero=null,meta={},time=0,emit=true){
      value=Number(value)||0;
      const prior=this.records[key];
      if(prior&&Number(prior.value)>=value)return null;
      const record={
        key,label:CHRONICLE_RECORD_LABELS[key]||key,
        value,
        heroId:hero?.id||meta.heroId||null,
        heroName:hero?.name||meta.heroName||null,
        time:Math.max(0,Number(time)||0),
        meta:clone(meta||{})
      };
      this.records[key]=record;
      if(emit&&value>0){
        const who=record.heroName?record.heroName+' — ':'';
        this.add('record','New Record: '+record.label,who+String(meta.displayValue??value),Object.assign({},meta,{recordKey:key,heroId:record.heroId,heroName:record.heroName,value}),time,'notable');
      }
      return record;
    }
    snapshot(){
      return {version:1,nextId:this.nextId,entries:clone(this.entries),milestones:clone(this.milestones),records:clone(this.records)};
    }
    static fromSnapshot(data){ return new Chronicle(data||{}); }
  }

  class TavernRoster {
    constructor({heroes=starterRoster(),fallen=[],funds=30,materials={},inventory={},inventoryDurability={},craftHistory=[],purchaseHistory=[],recruitmentHistory=[],repairHistory=[],prepMinutes=0,selectedHeroId=null,selectedContractId='greymill_rats',history=[],settledKeys=[],tavern=null,merchants=null,recruitment=null,chronicle=null}={}){
      this.heroes=heroes.map(h=>heroTemplate(h)).filter(h=>h.alive);
      this.fallen=clone(fallen||[]);
      this.funds=Number(funds)||0; this.materials=clone(materials||{}); this.inventory=clone(inventory||{}); this.inventoryDurability={}; this.craftHistory=clone(craftHistory||[]); this.purchaseHistory=clone(purchaseHistory||[]); this.recruitmentHistory=clone(recruitmentHistory||[]); this.repairHistory=clone(repairHistory||[]); this.prepMinutes=Number(prepMinutes)||0;
      for(const [id,rawCount] of Object.entries(this.inventory)){
        const count=Math.max(0,Math.floor(Number(rawCount)||0)); this.inventory[id]=count;
        if(isDurableItem(id)){
          const saved=Array.isArray(inventoryDurability?.[id])?inventoryDurability[id].map(normalizeDurability):[];
          this.inventoryDurability[id]=saved.slice(0,count);
          while(this.inventoryDurability[id].length<count)this.inventoryDurability[id].push(100);
        }
      }
      this.history=clone(history||[]); this.settledExpeditions=new Set(settledKeys||[]);
      this.selectedHeroId=selectedHeroId&&this.heroes.some(h=>h.id===selectedHeroId)?selectedHeroId:(this.heroes[0]?.id||null);
      this.selectedContractId=CONTRACTS[selectedContractId]?selectedContractId:'greymill_rats';
      this.tavern=TavernEconomy.fromSnapshot(tavern);
      this.merchants=MerchantSystem.fromSnapshot(merchants);
      this.recruitment=RecruitmentSystem.fromSnapshot(recruitment);
      this.chronicle=chronicle?Chronicle.fromSnapshot(chronicle):new Chronicle();
      if(!chronicle)this.migrateLegacyChronicle();
      this.rebuildChronicleRecords(false);
      this.checkTavernMilestones();
    }
    chronicleTime(){ return this.tavern.elapsed; }
    allKnownHeroes(){
      const out=[],seen=new Set();
      for(const h of this.heroes){
        if(h&&!seen.has(h.id)){seen.add(h.id);out.push(h);}
      }
      for(const f of this.fallen){
        const h=f?.hero;
        if(h&&!seen.has(h.id)){seen.add(h.id);out.push(h);}
      }
      return out;
    }
    migrateLegacyChronicle(){
      const time=this.chronicleTime();
      this.chronicle.milestone('tavern_opened','The Tavern Opened','The doors opened and the first contracts went on the board.',{},0,'major');
      const known=this.allKnownHeroes();
      for(const h of known){
        if(!h.recruitment){
          this.chronicle.add('founder',h.name+' joined the founding roster','A founding hero of the tavern.',{heroId:h.id,heroName:h.name,origin:'Founding hero'},0,'normal');
        }
      }
      const recruitedIds=new Set();
      for(const r of this.recruitmentHistory){
        recruitedIds.add(r.heroId);
        this.chronicle.add('recruitment',r.heroName+' was recruited','Joined from the applicant board for '+Number(r.cost||0).toFixed(0)+'g at quality '+(r.quality||1)+'.',{heroId:r.heroId,heroName:r.heroName,quality:r.quality||1,cost:r.cost||0,origin:'Applicant'},r.time||0,'normal');
      }
      for(const h of known){
        if(h.recruitment&&!recruitedIds.has(h.id)){
          this.chronicle.add('recruitment',h.name+' was recruited','Applicant origin reconstructed from the hero record (Quality '+(h.recruitment.quality||1)+').',{heroId:h.id,heroName:h.name,quality:h.recruitment.quality||1,cost:h.recruitment.cost||0,origin:'Applicant',legacy:true},0,'normal');
        }
      }
      const deathIds=new Set();
      for(const rec of this.history){
        const title=rec.heroName+' — '+rec.contractName;
        const text=String(rec.outcome||'resolved').toUpperCase()+' · score '+Math.round(rec.objectiveScore||rec.progress||0)+'/100 · '+Number(rec.gold||0).toFixed(1)+'g · '+Number(rec.kills||0)+' kills';
        this.chronicle.add('contract',title,text,{heroId:rec.heroId,heroName:rec.heroName,contractId:rec.contractId,outcome:rec.outcome,objectiveScore:rec.objectiveScore||0,gold:rec.gold||0,kills:rec.kills||0,legacy:true},0,rec.outcome==='death'?'major':'normal');
        if(rec.outcome==='death'){
          deathIds.add(rec.heroId);
          this.chronicle.add('death',rec.heroName+' Fell on '+rec.contractName,'Memorial reconstructed from the old contract ledger.',{heroId:rec.heroId,heroName:rec.heroName,contractId:rec.contractId,legacy:true},0,'major');
        }
      }
      for(const f of this.fallen){
        const h=f?.hero,rec=f?.deathRecord;
        if(h&&!deathIds.has(h.id)){
          this.chronicle.add('death',h.name+' Fell'+(rec?.contractName?' on '+rec.contractName:''),'Memorial reconstructed from the Fallen roster.',{heroId:h.id,heroName:h.name,contractId:rec?.contractId||null,legacy:true},0,'major');
        }
      }
      if(this.history.length||this.recruitmentHistory.length||this.fallen.length){
        this.chronicle.milestone('legacy_reconstructed','The Old Ledgers Were Bound','Earlier careers, recruits and fallen heroes were reconstructed from the tavern ledgers.',{legacy:true},time,'normal');
      }
    }
    aliveHeroes(){ return this.heroes.filter(h=>h.alive); }
    tickTavern(seconds=1){
      const earned=this.tavern.tick(seconds);
      this.merchants.tick(seconds,this.tavern);
      this.recruitment.tick(seconds,this.tavern);
      this.funds+=earned;
      if(earned>0)this.checkTavernMilestones();
      return earned;
    }
    checkTavernMilestones(){
      const time=this.chronicleTime();
      for(const n of [25,100,500,1000]){
        if(this.tavern.served>=n)this.chronicle.milestone('patrons_'+n,n+' Patrons Served','The tavern has served '+n+' patrons.',{value:n},time,n>=500?'major':'normal');
      }
      for(const n of [100,500,2500,10000]){
        if(this.tavern.totalRevenue>=n)this.chronicle.milestone('revenue_'+n,n+'g Tavern Revenue','Lifetime tavern service revenue passed '+n+' gold.',{value:n},time,n>=2500?'major':'normal');
      }
      for(const n of [10,25,50,100]){
        if(this.history.length>=n)this.chronicle.milestone('contracts_'+n,n+' Contracts Recorded','The tavern ledger now holds '+n+' resolved contracts.',{value:n},time,n>=50?'major':'normal');
      }
      return this.chronicle.milestones.length;
    }
    legendaryHeroes(){
      return this.allKnownHeroes().filter(isLegendaryHero).map(h=>({
        id:h.id,name:h.name,alive:!!h.alive,rank:h.career.rank,contracts:h.career.contracts,successes:h.career.successes,kills:h.career.kills,totalGold:Number(h.career.totalGold||0),titles:clone(h.titles||[]),origin:h.recruitment?('Applicant Q'+h.recruitment.quality):'Founding hero'
      })).sort((a,b)=>b.rank-a.rank||b.contracts-a.contracts||b.kills-a.kills);
    }
    rebuildChronicleRecords(emit=true){
      const time=this.chronicleTime();
      for(const h of this.allKnownHeroes()){
        const c=normalizeCareer(h.career);
        this.chronicle.setRecord('contracts',c.contracts,h,{displayValue:c.contracts+' contracts'},time,emit);
        this.chronicle.setRecord('successes',c.successes,h,{displayValue:c.successes+' successes'},time,emit);
        this.chronicle.setRecord('kills',c.kills,h,{displayValue:c.kills+' kills'},time,emit);
        this.chronicle.setRecord('careerGold',c.totalGold,h,{displayValue:Number(c.totalGold).toFixed(1)+'g'},time,emit);
        this.chronicle.setRecord('rank',c.rank,h,{displayValue:'Rank '+c.rank},time,emit);
      }
      for(const rec of this.history){
        const h=this.allKnownHeroes().find(x=>x.id===rec.heroId)||{id:rec.heroId,name:rec.heroName};
        this.chronicle.setRecord('objectiveScore',rec.objectiveScore||0,h,{displayValue:Math.round(rec.objectiveScore||0)+'/100',contractId:rec.contractId,contractName:rec.contractName},time,emit);
        this.chronicle.setRecord('payout',rec.gold||0,h,{displayValue:Number(rec.gold||0).toFixed(1)+'g',contractId:rec.contractId,contractName:rec.contractName},time,emit);
      }
      return clone(this.chronicle.records);
    }
    chronicleSummary(){
      return {
        entries:clone(this.chronicle.entries),
        milestones:clone(this.chronicle.milestones),
        records:clone(this.chronicle.records),
        legends:this.legendaryHeroes(),
        totals:{
          contracts:this.history.length,
          successes:this.history.filter(x=>x.outcome==='success').length,
          deaths:this.fallen.length,
          recruits:this.recruitmentHistory.length,
          patrons:this.tavern.served,
          revenue:Number(this.tavern.totalRevenue||0)
        }
      };
    }
    upgradeTavern(id){
      if(!this.tavern.canUpgrade(id))return{ok:false,reason:'maxed'};
      const cost=this.tavern.upgradeCost(id);
      if(this.funds<cost)return{ok:false,reason:'insufficient funds',cost};
      this.funds-=cost;
      this.tavern.upgrade(id);
      const value=id==='seats'?this.tavern.seats:this.tavern[id+'Level'];
      const label=id==='bar'?'Commons':id[0].toUpperCase()+id.slice(1);
      this.chronicle.add('upgrade',label+' Improved',id==='seats'?'Seating expanded to '+value+'.':label+' reached Level '+value+'.',{facility:id,value,cost},this.chronicleTime(),'normal');
      if(id!=='seats'&&(value===3||value===6))this.chronicle.milestone('facility_'+id+'_'+value,label+' Level '+value,label+' became a defining part of the tavern.',{facility:id,value},this.chronicleTime(),value===6?'major':'notable');
      this.checkTavernMilestones();
      return{ok:true,cost,projectedGoldRate:this.tavern.projectedGoldRate()};
    }
    recruitApplicant(){
      const applicant=this.recruitment.active;
      if(!applicant)return{ok:false,reason:'no applicant present'};
      if(this.funds<applicant.cost)return{ok:false,reason:'insufficient funds',cost:applicant.cost};
      if(this.heroes.some(h=>h.id===applicant.hero.id))return{ok:false,reason:'duplicate applicant'};
      this.funds-=applicant.cost;
      const accepted=this.recruitment.recruit();
      const hero=heroTemplate(accepted.hero);
      hero.recruitment=Object.assign({},hero.recruitment||{},{quality:accepted.quality,cost:accepted.cost,recruitedAt:this.recruitment.elapsed});
      this.heroes.push(hero);
      if(!this.selectedHeroId)this.selectedHeroId=hero.id;
      const event={heroId:hero.id,heroName:hero.name,quality:accepted.quality,cost:accepted.cost,time:this.recruitment.elapsed};
      this.recruitmentHistory.push(event); if(this.recruitmentHistory.length>50)this.recruitmentHistory=this.recruitmentHistory.slice(-50);
      this.chronicle.add('recruitment',hero.name+' Joined the Tavern','Recruited as a Quality '+accepted.quality+' applicant for '+accepted.cost+'g.',{heroId:hero.id,heroName:hero.name,quality:accepted.quality,cost:accepted.cost,origin:'Applicant'},this.chronicleTime(),accepted.quality>=3?'notable':'normal');
      return{ok:true,hero:clone(hero),event};
    }
    purchaseMerchantOffer(offerKey,count=1){
      const visit=this.merchants.active;
      if(!visit)return{ok:false,reason:'no merchant present'};
      const offer=visit.offers.find(o=>o.key===offerKey);
      count=Math.max(1,Math.floor(count));
      if(!offer||offer.quantity<count)return{ok:false,reason:'stock unavailable'};
      const cost=offer.unitPrice*count;
      if(this.funds<cost)return{ok:false,reason:'insufficient funds',cost};
      this.funds-=cost;
      offer.quantity-=count;
      if(offer.type==='material')this.materials[offer.id]=this.materialCount(offer.id)+count;
      else this.addInventoryItem(offer.id,count,100);
      const event={merchant:visit.name,quality:visit.quality,offerKey,id:offer.id,name:offer.name,type:offer.type,count,cost,time:this.merchants.elapsed};
      this.purchaseHistory.push(event); if(this.purchaseHistory.length>50)this.purchaseHistory=this.purchaseHistory.slice(-50);
      this.merchants.logEvent('Purchased '+count+' '+offer.name+' for '+cost.toFixed(1)+'g.','purchase');
      return{ok:true,event};
    }
    itemCount(itemId){ return Math.max(0,Number(this.inventory[itemId])||0); }
    stockDurabilities(itemId){ return clone(this.inventoryDurability[itemId]||[]); }
    addInventoryItem(itemId,count=1,durability=100){
      count=Math.max(1,Math.floor(count));
      this.inventory[itemId]=this.itemCount(itemId)+count;
      if(isDurableItem(itemId)){
        if(!this.inventoryDurability[itemId])this.inventoryDurability[itemId]=[];
        for(let i=0;i<count;i++)this.inventoryDurability[itemId].push(normalizeDurability(durability));
      }
      return this.itemCount(itemId);
    }
    takeInventoryItem(itemId){
      if(this.itemCount(itemId)<1)return{ok:false,reason:'item not in tavern stock'};
      let durability=null;
      if(isDurableItem(itemId)){
        const arr=this.inventoryDurability[itemId]||[];
        while(arr.length<this.itemCount(itemId))arr.push(100);
        let best=0;
        for(let i=1;i<arr.length;i++)if(arr[i]>arr[best])best=i;
        durability=normalizeDurability(arr.splice(best,1)[0]);
        this.inventoryDurability[itemId]=arr;
      }
      this.inventory[itemId]=this.itemCount(itemId)-1;
      return{ok:true,itemId,durability};
    }
    materialCount(materialId){ return Math.max(0,Number(this.materials[materialId])||0); }
    canCraft(recipeId,count=1){
      const recipe=CRAFT_RECIPES[recipeId]; count=Math.max(1,Math.floor(count));
      if(!recipe)return false;
      return Object.entries(recipe.materials).every(([id,n])=>this.materialCount(id)>=n*count);
    }
    craftQuote(recipeId,count=1){
      const recipe=CRAFT_RECIPES[recipeId]; count=Math.max(1,Math.floor(count));
      if(!recipe)return null;
      const workshopLevel=this.tavern.workshopLevel;
      const baseMinutes=recipe.minutes*count;
      const minutes=Math.max(5,Math.ceil((baseMinutes*Math.max(0.65,1-0.06*(workshopLevel-1)))/5)*5);
      return {recipeId,count,workshopLevel,baseMinutes,minutes};
    }
    craft(recipeId,count=1){
      const recipe=CRAFT_RECIPES[recipeId]; count=Math.max(1,Math.floor(count));
      if(!recipe)return{ok:false,reason:'unknown recipe'};
      if(!this.canCraft(recipeId,count))return{ok:false,reason:'insufficient materials'};
      for(const [id,n] of Object.entries(recipe.materials))this.materials[id]=this.materialCount(id)-n*count;
      const made=recipe.outputCount*count;
      this.addInventoryItem(recipe.output,made,100);
      const quote=this.craftQuote(recipeId,count),workshopLevel=quote.workshopLevel,minutes=quote.minutes;
      this.prepMinutes+=minutes;
      const event={recipeId,name:recipe.name,count,made,output:recipe.output,minutes,baseMinutes:quote.baseMinutes,workshopLevel,materials:clone(recipe.materials)};
      this.craftHistory.push(event); if(this.craftHistory.length>50)this.craftHistory=this.craftHistory.slice(-50);
      return{ok:true,event};
    }
    equipInventoryItem(heroId,itemId){
      const h=this.getHero(heroId),item=EQUIPMENT[itemId];
      if(!h||!h.alive)return{ok:false,reason:'hero unavailable'};
      if(!item||!['weapon','armor'].includes(item.slot))return{ok:false,reason:'not equippable'};
      if(this.itemCount(itemId)<1)return{ok:false,reason:'item not in tavern stock'};
      const previous=h.equipment[item.slot]||null;
      const previousDurability=normalizeDurability(h.gearDurability?.[item.slot]);
      const taken=this.takeInventoryItem(itemId); if(!taken.ok)return taken;
      if(previous)this.addInventoryItem(previous,1,previousDurability);
      h.equipment[item.slot]=itemId;
      h.gearDurability[item.slot]=taken.durability==null?100:taken.durability;
      deriveMoodlets(h);
      return{ok:true,itemId,previous,slot:item.slot};
    }
    repairEquippedGear(heroId,slot){
      const h=this.getHero(heroId);
      if(!h||!h.alive)return{ok:false,reason:'hero unavailable'};
      if(!['weapon','armor'].includes(slot))return{ok:false,reason:'invalid slot'};
      const itemId=h.equipment[slot];
      if(!itemId)return{ok:false,reason:'slot empty'};
      const quote=repairQuote(itemId,h.gearDurability?.[slot],this.tavern.workshopLevel);
      if(!quote||quote.missing<=0)return{ok:false,reason:'already maintained'};
      if(this.funds<quote.gold)return{ok:false,reason:'insufficient funds',quote};
      if(this.materialCount('scrap_iron')<quote.scrapIron)return{ok:false,reason:'insufficient scrap iron',quote};
      this.funds-=quote.gold;
      this.materials.scrap_iron=this.materialCount('scrap_iron')-quote.scrapIron;
      this.prepMinutes+=quote.minutes;
      h.gearDurability[slot]=100;
      const event={scope:'equipped',heroId:h.id,heroName:h.name,slot,itemId,name:EQUIPMENT[itemId].name,before:quote.durability,after:100,gold:quote.gold,scrapIron:quote.scrapIron,minutes:quote.minutes,workshopLevel:quote.workshopLevel};
      this.repairHistory.push(event); if(this.repairHistory.length>50)this.repairHistory=this.repairHistory.slice(-50);
      return{ok:true,event};
    }
    repairStoredGear(itemId){
      if(!isDurableItem(itemId)||this.itemCount(itemId)<1)return{ok:false,reason:'no repairable stock'};
      const arr=this.inventoryDurability[itemId]||[];
      while(arr.length<this.itemCount(itemId))arr.push(100);
      let worst=0;
      for(let i=1;i<arr.length;i++)if(arr[i]<arr[worst])worst=i;
      const quote=repairQuote(itemId,arr[worst],this.tavern.workshopLevel);
      if(!quote||quote.missing<=0)return{ok:false,reason:'already maintained'};
      if(this.funds<quote.gold)return{ok:false,reason:'insufficient funds',quote};
      if(this.materialCount('scrap_iron')<quote.scrapIron)return{ok:false,reason:'insufficient scrap iron',quote};
      this.funds-=quote.gold;
      this.materials.scrap_iron=this.materialCount('scrap_iron')-quote.scrapIron;
      this.prepMinutes+=quote.minutes;
      const before=arr[worst]; arr[worst]=100; this.inventoryDurability[itemId]=arr;
      const event={scope:'stock',itemId,name:EQUIPMENT[itemId].name,before,after:100,gold:quote.gold,scrapIron:quote.scrapIron,minutes:quote.minutes,workshopLevel:quote.workshopLevel};
      this.repairHistory.push(event); if(this.repairHistory.length>50)this.repairHistory=this.repairHistory.slice(-50);
      return{ok:true,event};
    }
    giveConsumable(heroId,itemId,count=1){
      const h=this.getHero(heroId),item=EQUIPMENT[itemId]; count=Math.max(1,Math.floor(count));
      if(!h||!h.alive)return{ok:false,reason:'hero unavailable'};
      if(!item||item.slot!=='consumable')return{ok:false,reason:'not a consumable'};
      if(this.itemCount(itemId)<count)return{ok:false,reason:'insufficient stock'};
      const cap=itemId==='healing_potion'?3:4;
      const current=Math.max(0,Number(h.supplies[itemId])||0);
      const moved=Math.min(count,cap-current);
      if(moved<=0)return{ok:false,reason:'hero supply full'};
      this.inventory[itemId]=this.itemCount(itemId)-moved;
      h.supplies[itemId]=current+moved;
      return{ok:true,moved,itemId};
    }
    getHero(id=this.selectedHeroId){ return this.heroes.find(h=>h.id===id)||null; }
    selectHero(id){ if(this.heroes.some(h=>h.id===id)){this.selectedHeroId=id;return true;}return false; }
    selectContract(id){ if(CONTRACTS[id]){this.selectedContractId=id;return true;}return false; }
    getContract(id=this.selectedContractId){ return CONTRACTS[id]||CONTRACT; }
    syncPreparation(heroId,prep){
      const idx=this.heroes.findIndex(h=>h.id===heroId); if(idx<0)return;
      this.heroes[idx]=heroTemplate(prep.hero); this.funds=prep.funds; this.materials=clone(prep.materials); this.prepMinutes=prep.prepMinutes;
    }
    preparationQuote(actionId){
      const a=PREPARATION_ACTIONS[actionId]; if(!a)return null;
      const facilities=this.tavern.facilityLevels();
      const facilityLevel=preparationFacilityLevel(facilities,actionId);
      return {actionId,name:a.name,facility:a.facility||null,facilityLevel,cost:a.cost,baseMinutes:a.minutes,minutes:facilityActionMinutes(a.minutes,facilityLevel),description:a.description};
    }
    canPrepare(heroId,actionId){
      const h=this.getHero(heroId); if(!h)return false;
      return new PreparationState({hero:h,funds:this.funds,materials:this.materials,prepMinutes:this.prepMinutes,facilities:this.tavern.facilityLevels()}).can(actionId);
    }
    prepare(heroId,actionId){
      const h=this.getHero(heroId); if(!h)return{ok:false,reason:'hero unavailable'};
      const prep=new PreparationState({hero:h,funds:this.funds,materials:this.materials,prepMinutes:this.prepMinutes,facilities:this.tavern.facilityLevels()});
      const result=prep.apply(actionId); if(result.ok)this.syncPreparation(heroId,prep); return result;
    }
    setLoadout(heroId,weaponId,armorId){
      const h=this.getHero(heroId); if(!h)return false;
      const prep=new PreparationState({hero:h,funds:this.funds,materials:this.materials,prepMinutes:this.prepMinutes,facilities:this.tavern.facilityLevels()}); prep.setLoadout(weaponId,armorId); this.syncPreparation(heroId,prep); return true;
    }
    resolveDeathGear(hero,expedition){
      const threshold=50,recover=expedition.objectiveProgress>=threshold;
      const result={policy:'recover at 50% objective progress',threshold,recovered:[],lost:[]};
      for(const slot of ['weapon','armor']){
        const itemId=hero.equipment?.[slot];
        if(!itemId||!isDurableItem(itemId))continue;
        const durability=normalizeDurability(hero.gearDurability?.[slot]);
        if(recover){
          const recoveredDurability=Math.min(durability,35);
          this.addInventoryItem(itemId,1,recoveredDurability);
          result.recovered.push({slot,itemId,name:EQUIPMENT[itemId].name,durability:recoveredDurability});
        }else result.lost.push({slot,itemId,name:EQUIPMENT[itemId].name,durability});
      }
      return result;
    }
    startExpedition(heroId=this.selectedHeroId,seed=1,contractId=this.selectedContractId){
      const h=this.getHero(heroId); if(!h||!h.alive)return null;
      const contract=this.getContract(contractId);
      return new Expedition({hero:h,seed,contract});
    }
    settle(heroId,expedition,settlementId=null){
      const hero=this.getHero(heroId);
      if(!hero)return{ok:false,reason:'hero unavailable',banked:0};
      if(expedition.state==='deployed')return{ok:false,reason:'expedition still active',banked:0};
      if(expedition.hero.id!==heroId)return{ok:false,reason:'hero mismatch',banked:0};
      const key=settlementId?('expedition:'+settlementId):`${heroId}:${expedition.contract.id}:${expedition.seed}:${expedition.elapsed}:${expedition.state}`;
      if(this.settledExpeditions.has(key))return{ok:false,reason:'already settled',banked:0};
      this.settledExpeditions.add(key);
      this.funds+=expedition.gold;
      for(const [id,count] of Object.entries(expedition.materials))this.materials[id]=(this.materials[id]||0)+count;
      const updated=heroTemplate(expedition.hero); updated.prepEffects=[];
      const record=applyCareerProgress(updated,expedition);
      let gearOutcome=null;
      if(!updated.alive){
        gearOutcome=this.resolveDeathGear(updated,expedition);
        expedition.gearOutcome=clone(gearOutcome);
        record.gearOutcome=clone(gearOutcome);
      }
      const historyRecord={heroId:updated.id,heroName:updated.name,...clone(record)};
      this.history.push(historyRecord); if(this.history.length>100)this.history=this.history.slice(-100);
      const contractText=String(record.outcome).toUpperCase()+' · objective '+Math.round(record.objectiveScore||0)+'/100 · '+Number(record.gold||0).toFixed(1)+'g · '+record.kills+' kills';
      this.chronicle.add('contract',updated.name+' — '+record.contractName,contractText,{heroId:updated.id,heroName:updated.name,contractId:record.contractId,outcome:record.outcome,objectiveScore:record.objectiveScore||0,gold:record.gold||0,kills:record.kills,number:record.number},this.chronicleTime(),record.outcome==='death'?'major':record.outcome==='success'?'notable':'normal');
      const o=expedition.objectiveState||{};
      if(expedition.contract.kind==='Boss Hunt'&&o.bossKilled)this.chronicle.add('feat',updated.name+' Slew the Bridge Troll','The designated bridge boss fell during '+record.contractName+'.',{heroId:updated.id,heroName:updated.name,contractId:record.contractId,feat:'boss_kill'},this.chronicleTime(),'major');
      if(expedition.contract.kind==='Delve'&&o.minersRescued&&o.minersRescued>=o.rescueMax)this.chronicle.add('feat',updated.name+' Brought Everyone Home','All '+o.rescueMax+' missing miners were rescued.',{heroId:updated.id,heroName:updated.name,contractId:record.contractId,feat:'full_rescue'},this.chronicleTime(),'major');
      if(expedition.contract.kind==='Escort'&&record.outcome==='success'&&(o.caravanIntegrity||0)>=75)this.chronicle.add('feat',updated.name+' Guarded the Caravan','The caravan arrived with '+Math.round(o.caravanIntegrity)+'% integrity.',{heroId:updated.id,heroName:updated.name,contractId:record.contractId,feat:'strong_escort'},this.chronicleTime(),'notable');
      if(record.rankAfter>record.rankBefore||record.titlesEarned.length){
        const gains=[];
        if(record.rankAfter>record.rankBefore)gains.push('Rank '+record.rankAfter);
        if(record.titlesEarned.length)gains.push('titles: '+record.titlesEarned.join(', '));
        this.chronicle.add('career',updated.name+' Advanced',gains.join(' · '),{heroId:updated.id,heroName:updated.name,rankBefore:record.rankBefore,rankAfter:record.rankAfter,titlesEarned:clone(record.titlesEarned)},this.chronicleTime(),'notable');
      }
      const wasLegend=isLegendaryHero(hero),isLegend=isLegendaryHero(updated);
      const idx=this.heroes.findIndex(h=>h.id===heroId);
      if(updated.alive)this.heroes[idx]=updated;
      else{
        this.heroes.splice(idx,1);
        this.fallen.push({hero:clone(updated),deathRecord:clone(record),gearOutcome:clone(gearOutcome)}); if(this.fallen.length>50)this.fallen=this.fallen.slice(-50);
        if(this.selectedHeroId===heroId)this.selectedHeroId=this.heroes[0]?.id||null;
        this.chronicle.add('death',updated.name+' Fell on '+record.contractName,'Rank '+updated.career.rank+' · '+updated.career.contracts+' contracts · '+updated.career.kills+' kills · objective '+Math.round(record.objectiveScore||0)+'/100.',{heroId:updated.id,heroName:updated.name,contractId:record.contractId,gearOutcome:clone(gearOutcome)},this.chronicleTime(),'major');
      }
      if(!wasLegend&&isLegend)this.chronicle.add('legend',updated.name+' Became a Tavern Legend','Rank '+updated.career.rank+' · '+updated.career.successes+' successes · '+updated.career.kills+' kills.',{heroId:updated.id,heroName:updated.name},this.chronicleTime(),'major');
      this.rebuildChronicleRecords(true);
      this.checkTavernMilestones();
      return{ok:true,banked:expedition.gold,heroAlive:updated.alive,record,gearOutcome};
    }
    snapshot(){
      return{version:11,heroes:clone(this.heroes),fallen:clone(this.fallen),funds:this.funds,materials:clone(this.materials),inventory:clone(this.inventory),inventoryDurability:clone(this.inventoryDurability),craftHistory:clone(this.craftHistory),purchaseHistory:clone(this.purchaseHistory),recruitmentHistory:clone(this.recruitmentHistory),repairHistory:clone(this.repairHistory),prepMinutes:this.prepMinutes,selectedHeroId:this.selectedHeroId,selectedContractId:this.selectedContractId,history:clone(this.history),settledKeys:Array.from(this.settledExpeditions),tavern:this.tavern.snapshot(),merchants:this.merchants.snapshot(),recruitment:this.recruitment.snapshot(),chronicle:this.chronicle.snapshot()};
    }
    serialize(){ return JSON.stringify(this.snapshot()); }
    static fromSnapshot(data){
      if(!data||!Array.isArray(data.heroes))throw new Error('invalid tavern roster snapshot');
      return new TavernRoster(data);
    }
    static deserialize(text){ return TavernRoster.fromSnapshot(JSON.parse(text)); }
  }


  const OFFLINE_MAX_SECONDS=8*60*60;
  const OFFLINE_QUANTUM_SECONDS=0.25;

  function settlementSummary(entry,result){
    const exp=entry.expedition,s=exp.summary();
    return {
      id:entry.id,
      heroId:entry.heroId,
      heroName:exp.hero.name,
      contractId:exp.contract.id,
      contract:exp.contract.name,
      outcome:exp.state,
      reason:exp.retreatReason,
      banked:Number(result.banked||0),
      heroAlive:!!result.heroAlive,
      objectiveScore:Number(s.objectiveScore||0),
      objectiveBonusGold:Number(s.objectiveBonusGold||0),
      materials:clone(s.materials||{}),
      gearOutcome:clone(result.gearOutcome||s.gearOutcome||null),
      record:clone(result.record||null)
    };
  }

  function settleResolvedExpeditions(roster,manager){
    const settled=[];
    if(!roster||!manager)return settled;
    for(const entry of manager.entries){
      if(entry.expedition.state==='deployed'||entry.settled)continue;
      const hero=roster.getHero(entry.heroId);
      if(!hero){
        entry.settled=true;
        entry.settlement={ok:false,reason:'hero unavailable',banked:0};
        continue;
      }
      const result=roster.settle(entry.heroId,entry.expedition,entry.id);
      if(result.ok){
        manager.markSettled(entry.id,result);
        settled.push(settlementSummary(entry,result));
      }
    }
    return settled;
  }

  function advanceOffline(roster,manager,seconds,options={}){
    const requested=Math.max(0,Number(seconds)||0);
    const maxSeconds=Math.max(0,Number(options.maxSeconds??OFFLINE_MAX_SECONDS)||0);
    const quantum=OFFLINE_QUANTUM_SECONDS;
    const bounded=Math.min(requested,maxSeconds);
    const steps=Math.max(0,Math.floor((bounded+1e-9)/quantum));
    const appliedSeconds=steps*quantum;
    const before={
      funds:roster.funds,
      served:roster.tavern.served,
      lost:roster.tavern.lost,
      merchantVisits:roster.merchants.visitIndex,
      applicantVisits:roster.recruitment.visitIndex,
      entries:new Map(manager.entries.map(entry=>[entry.id,{
        id:entry.id,
        heroId:entry.heroId,
        heroName:entry.expedition.hero.name,
        contract:entry.expedition.contract.name,
        state:entry.expedition.state,
        speed:entry.speed,
        elapsed:entry.expedition.elapsed,
        gold:entry.expedition.gold,
        objectiveScore:entry.expedition.objectiveScore||0,
        health:entry.expedition.hero.health
      }]))
    };
    let tavernGold=0;
    const settlements=[];
    settlements.push(...settleResolvedExpeditions(roster,manager));
    for(let i=0;i<steps;i++){
      tavernGold+=roster.tickTavern(quantum);
      manager.tickAll(quantum);
      settlements.push(...settleResolvedExpeditions(roster,manager));
    }
    const progress=[];
    for(const [id,start] of before.entries){
      const entry=manager.get(id);
      if(!entry)continue;
      const exp=entry.expedition;
      progress.push({
        id,
        heroId:start.heroId,
        heroName:start.heroName,
        contract:start.contract,
        speed:start.speed,
        paused:start.speed===0&&start.state==='deployed',
        startState:start.state,
        endState:exp.state,
        simulatedSeconds:Math.max(0,exp.elapsed-start.elapsed),
        goldGained:Number((exp.gold-start.gold).toFixed(4)),
        scoreBefore:Math.round(start.objectiveScore),
        scoreAfter:Math.round(exp.objectiveScore||0),
        scoreGained:Math.round((exp.objectiveScore||0)-start.objectiveScore),
        healthBefore:Number(start.health),
        healthAfter:Number(exp.hero.health)
      });
    }
    const expeditionGold=settlements.reduce((n,x)=>n+x.banked,0);
    return {
      requestedSeconds:requested,
      appliedSeconds,
      maxSeconds,
      capped:requested>maxSeconds,
      cappedSeconds:Math.max(0,requested-maxSeconds),
      quantum,
      steps,
      tavernGold:Number(tavernGold.toFixed(4)),
      expeditionGold:Number(expeditionGold.toFixed(4)),
      totalFundsGained:Number((roster.funds-before.funds).toFixed(4)),
      patronsServed:roster.tavern.served-before.served,
      patronsLost:roster.tavern.lost-before.lost,
      merchantVisits:roster.merchants.visitIndex-before.merchantVisits,
      applicantVisits:roster.recruitment.visitIndex-before.applicantVisits,
      settlements,
      deaths:settlements.filter(x=>!x.heroAlive),
      progress,
      activeStarted:Array.from(before.entries.values()).filter(x=>x.state==='deployed').length,
      activeRemaining:manager.activeEntries().length,
      pausedRemaining:manager.activeEntries().filter(x=>x.speed===0).length
    };
  }

  return {RNG,EQUIPMENT,MAX_DURABILITY,isDurableItem,normalizeDurability,durabilityMultiplier,durabilityCondition,repairQuote,CRAFT_RECIPES,INJURY_TYPES,PREP_EFFECTS,PREPARATION_ACTIONS,normalizeFacilityLevels,preparationFacilityLevel,facilityActionMinutes,CONTRACT,CONTRACTS,CONTRACT_ORDER,contractActionInterval,EXPEDITION_NEED_TIME_SCALE,ENEMIES,MATERIAL_NAMES,PATRON_TYPES,MERCHANT_GOODS,merchantQuality,MerchantSystem,APPLICANT_TRAITS,applicantQuality,RecruitmentSystem,CHRONICLE_RECORD_LABELS,Chronicle,isLegendaryHero,heroTemplate,normalizeCareer,rankFromXp,applyCareerProgress,starterRoster,deriveMoodlets,totalInjurySeverity,addInjury,reduceWorstInjury,removeWorstInjury,readinessScore,threatAssessment,PreparationState,TavernEconomy,TavernRoster,Expedition,ExpeditionManager,OFFLINE_MAX_SECONDS,OFFLINE_QUANTUM_SECONDS,settleResolvedExpeditions,advanceOffline,makePreset};
});
