/* Formation factory and editable playbook. */
(function(root){
'use strict';
const c=root.GridironCore;
const COPY=c.clone, cap=(x)=>c.clamp(x,-25.5,25.5);
const p=(id,label,number,x,y,onLine,job='route')=>({id,label,number,x,y,onLine,job,route:[],hot:false,read:3,power:.68,speed:1,reportedEligible:false,reportedIneligible:false});
function offense(name,type='pass'){
 const players=[
  p('oLT','LT',72,-3.0,0,true,'passblock'),p('oLG','LG',65,-1.5,0,true,'passblock'),
  p('oC','C',61,0,0,true,'passblock'),p('oRG','RG',68,1.5,0,true,'passblock'),
  p('oRT','RT',78,3.0,0,true,'passblock'),p('oX','X',11,-19,0,true,'route'),
  p('oTE','TE',87,4.7,0,true,'route'),p('oQB','QB',7,0,-5.0,false,'quarterback'),
  p('oRB','RB',22,3.8,-7,false,'passblock'),p('oSL','SL',13,-9,-2,false,'route'),
  p('oZ','Z',18,19,-2,false,'route')];
 return {id:'off-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,side:'offense',type,players,
  snapToId:'oQB',runnerId:'oRB',runGapX:4,qbDepth:7,qbDropTime:1.15,throwAt:3.1,yardLine:50,allowScramble:true,primaryTarget:'oSL'};
}
function routeFrom(player,kind){
 const x=player.x,y=player.y,inside=x<0?1:-1,out=-inside;
 const pt=(dx,dy)=>({x:cap(x+dx),y:y+dy});
 const r={
  go:[pt(0,9),pt(0,26),pt(0,34)],fade:[pt(out*1,8),pt(out*5,19),pt(out*6,30)],
  slant:[pt(inside*2,3),pt(inside*10,11),pt(inside*14,17)],
  flat:[pt(out*3,1.5),pt(out*8,3.5)],
  out:[pt(0,8),pt(out*8,9)],in:[pt(0,8),pt(inside*9,9)],
  dig:[pt(0,12),pt(inside*10,13),pt(inside*16,13)],
  corner:[pt(0,10),pt(out*9,22)],post:[pt(0,10),pt(inside*9,25)],
  curl:[pt(0,11),pt(inside*1,8)],hitch:[pt(0,7),pt(0,5.5)],
  drag:[pt(inside*5,1.8),pt(inside*13,3.5),pt(inside*23,4)],
  wheel:[pt(out*6,2),pt(out*9,7),pt(out*9,20)],
  seam:[pt(inside*2,9),pt(inside*2,25)],
  comeback:[pt(0,15),pt(out*3,12)],
  swing:[pt(out*5,0),pt(out*9,1),pt(out*12,5)],
  angle:[pt(out*4,1),pt(inside*7,10)],
  bubble:[pt(out*4,-1),pt(out*9,0),pt(out*13,3)],
  shallow:[pt(inside*5,3),pt(inside*14,3.5),pt(inside*24,4.5)],
  'wheel-left':[pt(-5,3),pt(-8,10),pt(-8,24)],
 };
 return COPY(r[kind]||r.go);
}
function setRoute(o,id,pattern,read=3,hot=false){let pl=o.players.find(p=>p.id===id);if(!pl)return;pl.job='route';pl.route=routeFrom(pl,pattern);pl.pattern=pattern;pl.read=read;pl.hot=hot;}
function setChipRelease(o,id){const pl=o.players.find(p=>p.id===id);if(pl)pl.chipRelease=true;}
function setBlock(o,id,target='',gap=0,job='runblock'){let pl=o.players.find(p=>p.id===id);if(!pl)return;pl.job=job;pl.blockTarget=target;pl.blockGapX=gap;pl.route=[];pl.pattern='';}
function runRoute(o,id,coords){const pl=o.players.find(p=>p.id===id); pl.job='carry';pl.route=coords.map(([x,y])=>({x,y}));}
function createOffensePresets(){
 let a=[];
 let o=offense('Shotgun Mesh');
 setRoute(o,'oX','go',4);setRoute(o,'oSL','drag',1,true);setRoute(o,'oTE','shallow',2);
 setRoute(o,'oZ','corner',3);setRoute(o,'oRB','swing',5);o.primaryTarget='oSL';a.push(o);
 o=offense('Four Verticals');
 setRoute(o,'oX','fade',4);setRoute(o,'oSL','seam',1);setRoute(o,'oTE','seam',2);
 setChipRelease(o,'oTE');
 setRoute(o,'oZ','go',3);setBlock(o,'oRB','',3,'passblock');o.primaryTarget='oSL';a.push(o);
 o=offense('Slant / Flat');
 setRoute(o,'oX','slant',1,true);setRoute(o,'oSL','flat',2);
 setRoute(o,'oTE','seam',4);setRoute(o,'oZ','slant',3);setRoute(o,'oRB','swing',5);o.primaryTarget='oX';o.throwAt=2.2;a.push(o);
 o=offense('Trips Flood');
 const sl=o.players.find(p=>p.id==='oSL'),z=o.players.find(p=>p.id==='oZ');
 sl.x=10; z.x=21; o.players.find(p=>p.id==='oX').x=-19;
 setRoute(o,'oX','post',4);setRoute(o,'oSL','flat',1,true);setRoute(o,'oTE','out',2);
 setRoute(o,'oZ','corner',3);setRoute(o,'oRB','angle',5);o.primaryTarget='oSL';a.push(o);
 o=offense('HB Screen','screen');
 setRoute(o,'oX','go',4);setRoute(o,'oSL','in',3);setRoute(o,'oTE','curl',2);
 setChipRelease(o,'oTE');
 setRoute(o,'oZ','go',5);setRoute(o,'oRB','swing',1,true);
 o.primaryTarget='oRB';o.throwAt=1.8;setBlock(o,'oLG','',-5,'passblock');
 o.screen={receiverId:'oRB',blockerIds:['oLT','oLG','oC','oRG','oRT'],releaseAfterThrow:true};a.push(o);
 o=offense('Play Action Cross','playaction');
 setRoute(o,'oX','post',3);setRoute(o,'oSL','drag',1,true);setRoute(o,'oTE','corner',2);
 setChipRelease(o,'oTE');
 setRoute(o,'oZ','go',4);setBlock(o,'oRB','',3,'passblock');
 o.playActionFake={receiverId:'oRB',x:2,y:-1.2,endAt:1.12};o.throwAt=3.4;o.primaryTarget='oSL';a.push(o);
 o=offense('Power Right','run');
 for(const id of ['oLT','oLG','oC','oRG','oRT'])setBlock(o,id,'',4,'runblock');
 setBlock(o,'oTE','',7,'runblock');setBlock(o,'oSL','',7,'runblock');
 setRoute(o,'oX','go');setRoute(o,'oZ','go');
 runRoute(o,'oRB',[[3,-3],[4,1],[6,6],[9,16],[10,35]]);o.runGapX=5;
 const lg=o.players.find(p=>p.id==='oLG');lg.job='pull';lg.route=[{x:2,y:-2},{x:6,y:1},{x:8,y:5}];a.push(o);
 o=offense('Outside Zone Left','run');
 for(const id of ['oLT','oLG','oC','oRG','oRT','oTE'])setBlock(o,id,'',-6,'runblock');
 setBlock(o,'oSL','',-12,'runblock');setRoute(o,'oX','go');setRoute(o,'oZ','go');
 runRoute(o,'oRB',[[0,-4],[-5,0],[-10,4],[-13,12],[-16,30]]);o.runGapX=-9;a.push(o);
 o=offense('Inside Zone','run');
 for(const id of ['oLT','oLG','oC','oRG','oRT','oTE'])setBlock(o,id,'',1,'runblock');
 setRoute(o,'oX','slant');setRoute(o,'oSL','out');setRoute(o,'oZ','go');
 runRoute(o,'oRB',[[2,-3],[1,1],[-1,9],[0,25]]);o.runGapX=0;a.push(o);
 o=offense('Empty Spacing');
 const rb=o.players.find(p=>p.id==='oRB');rb.x=-16;rb.y=-2;
 setRoute(o,'oX','hitch',2);setRoute(o,'oSL','out',3);setRoute(o,'oTE','curl',4);
 setRoute(o,'oZ','slant',5);setRoute(o,'oRB','angle',1,true);o.primaryTarget='oRB';o.throwAt=2.6;a.push(o);
 o=offense('RPO Glance','option');
 for(const id of ['oLT','oLG','oC','oRG','oRT'])setBlock(o,id,'',4,'runblock');
 setRoute(o,'oX','slant');setRoute(o,'oSL','slant');setRoute(o,'oTE','flat');setRoute(o,'oZ','go');
 runRoute(o,'oRB',[[2,-4],[2,1],[4,10],[6,25]]);o.runGapX=3;o.rpoReadId='dW';o.rpoReceiverId='oX';a.push(o);
 return a;
}
function createPitchBack(){const o=COPY(createOffensePresets().find(play=>play.name==='Outside Zone Left'));o.id='off-pitch-back';o.name='Pitch Back';o.lateralToId='oQB';o.lateralAt=1.7;return o;}
function createGoalLinePower(){const o=COPY(createOffensePresets().find(play=>play.name==='Inside Zone'));o.id='off-goal-line-power';o.name='Goal Line Power';o.runGapX=0;runRoute(o,'oRB',[[1,-3],[0,0],[0,2],[0,5],[0,9]]);return o;}
function defense(name){
 const players=[
 p('dLE','DE',91,-5.8,1.4,false,'rush'),p('dDT1','DT',95,-1.8,1.4,false,'rush'),p('dDT2','DT',98,1.8,1.4,false,'rush'),p('dRE','DE',90,5.8,1.4,false,'rush'),
 p('dW','LB',55,-7,5.5,false,'zone'),p('dM','MLB',54,0,5.4,false,'zone'),p('dS','LB',59,7,5.5,false,'zone'),
 p('dCB1','CB',24,-19,8,false,'zone'),p('dCB2','CB',31,19,8,false,'zone'),
 p('dFS','FS',21,-10,17,false,'zone'),p('dSS','SS',32,10,17,false,'zone')
 ];return {id:'def-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,side:'defense',players};
}
function zone(p,x,y,r=7,rY=r){p.job='zone';p.zone={x,y,r,rY};p.zoneTechnique=p.zoneTechnique||'spot';delete p.coverTarget;}
function man(p,target){p.job='man';p.coverTarget=target;p.leverage=p.leverage||'inside';delete p.zone;}
function twist(def,penetratorId,looperId,insideX,outsideX){
 const penetrator=def.players.find(p=>p.id===penetratorId),looper=def.players.find(p=>p.id===looperId);
 if(penetrator)penetrator.stunt={role:'penetrate',partnerId:looperId,aimX:insideX,delay:0};
 if(looper)looper.stunt={role:'loop',partnerId:penetratorId,aimX:outsideX,delay:.18};
}
function createDefensePresets(){
 let a=[],d=defense('4–3 Cover 2');
 zone(d.players[4],-9,8,7,7);zone(d.players[5],0,11,9,9);zone(d.players[6],9,8,7,7);
 zone(d.players[7],-19,5,8,6);zone(d.players[8],19,5,8,6);
 zone(d.players[9],-13,19,13,12);zone(d.players[10],13,19,13,12);a.push(d);
 d=defense('Nickel Cover 3');
 d.players[6].label='NB';d.players[6].x=14;d.players[6].y=9;
 zone(d.players[4],-7,9,8,7);zone(d.players[5],1,10,8,8);zone(d.players[6],16,7,9,7);
 zone(d.players[7],-18,19,10,13);zone(d.players[8],18,19,10,13);
 zone(d.players[9],0,22,13,12);zone(d.players[10],-15,7,8,6);a.push(d);
 d=defense('Cover 1 Man');
 man(d.players[4],'oRB');man(d.players[5],'oTE');man(d.players[6],'oSL');
 man(d.players[7],'oX');man(d.players[8],'oZ');zone(d.players[9],0,23,18,14);
 d.players[10].job='spy';a.push(d);
 d=defense('Cover 0 Blitz');
 man(d.players[4],'oRB');d.players[5].job='blitz';d.players[6].job='blitz';
 twist(d,'dLE','dDT1',-1.4,-5.8);
 man(d.players[7],'oX');man(d.players[8],'oZ');man(d.players[9],'oSL');man(d.players[10],'oTE');a.push(d);
 d=defense('Tampa 2');
 zone(d.players[4],-9,9,8,8);zone(d.players[5],0,17,8,12);zone(d.players[6],9,9,8,8);
 zone(d.players[7],-19,6,8,7);zone(d.players[8],19,6,8,7);
 zone(d.players[9],-13,23,12,13);zone(d.players[10],13,23,12,13);a.push(d);
 d=defense('Quarters Match');
 zone(d.players[4],-10,8,8);zone(d.players[5],0,10,9);zone(d.players[6],10,8,8);
 zone(d.players[7],-19,19,8,13);zone(d.players[8],19,19,8,13);
 zone(d.players[9],-7,21,10,13);zone(d.players[10],7,21,10,13);
 // Quarters Match is a pattern-match call: defenders carry eligible routes
 // through their quarters and exchange ownership at overlapping boundaries.
 for(const p of d.players)if(p.job==='zone')p.zoneTechnique='match';
 a.push(d);
 d=defense('3–4 Cover 3');
 d.players[3].job='zone';d.players[3].label='OLB';d.players[3].y=5;
 d.players[2].label='NT';d.players[2].x=0;d.players[1].x=-3;
 d.players[4].job='blitz';d.players[4].x=-10;d.players[4].y=3;
 zone(d.players[5],-4,10,9);zone(d.players[6],7,10,9);zone(d.players[3],13,7,8);
 zone(d.players[7],-19,18,11,13);zone(d.players[8],19,18,11,13);
 zone(d.players[9],0,22,14,13);zone(d.players[10],-11,7,9);a.push(d);
 d=defense('Goal Line 6–2');
 d.players[4].job='rush';d.players[4].x=-9;d.players[4].y=1.8;
 d.players[6].job='rush';d.players[6].x=9;d.players[6].y=1.8;
 d.players[5].job='runfit';d.players[5].y=3;
 d.players[10].job='runfit';d.players[10].x=0;d.players[10].y=4;
 man(d.players[7],'oX');man(d.players[8],'oZ');zone(d.players[9],0,12,13,10);a.push(d);
 return a;
}
const api={offense,defense,routeFrom,setRoute,setBlock,createOffensePresets,createPitchBack,createGoalLinePower,createDefensePresets};
root.GridironPlays=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
