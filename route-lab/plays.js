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
 a.forEach(q=>q.formation='Shotgun Doubles');
 a.find(q=>q.name==='Trips Flood').formation='Shotgun Trips';
 a.find(q=>q.name==='Empty Spacing').formation='Empty';
 const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const align=(play,formation)=>{
  const at=id=>play.players.find(q=>q.id===id);
  if(formation==='Shotgun Trips')Object.assign(at('oSL'),{x:10,y:-2,onLine:false}),Object.assign(at('oZ'),{x:18,y:-2,onLine:false}),Object.assign(at('oTE'),{x:6.5,y:0,onLine:true});
  else if(formation==='Shotgun Bunch')Object.assign(at('oSL'),{x:14,y:-1,onLine:false}),Object.assign(at('oZ'),{x:18,y:-2,onLine:false}),Object.assign(at('oTE'),{x:20,y:0,onLine:true});
  else if(formation==='Pistol')Object.assign(at('oQB'),{y:-4}),Object.assign(at('oRB'),{x:0,y:-6});
  else if(formation==='I-Formation')Object.assign(at('oQB'),{y:-2.5}),Object.assign(at('oRB'),{x:0,y:-6});
  else if(formation==='Singleback')Object.assign(at('oQB'),{y:-4.5}),Object.assign(at('oRB'),{x:0,y:-6.5});
  else if(formation==='Empty')Object.assign(at('oRB'),{x:-12,y:-2,job:'route'}),Object.assign(at('oSL'),{x:-5,y:-2}),Object.assign(at('oZ'),{x:10,y:-2});
  else if(formation==='Goal Line'){
   Object.assign(at('oX'),{x:-9,onLine:true,y:0});Object.assign(at('oZ'),{x:9,onLine:true,y:0});Object.assign(at('oTE'),{onLine:false,y:-1});
   Object.assign(at('oQB'),{y:-2.5});Object.assign(at('oRB'),{x:0,y:-4.5});
  }
 };
 const add=(name,source,formation,setup)=>{const play=COPY(a.find(q=>q.name===source));play.id='off-'+slug(name);play.name=name;play.formation=formation;align(play,formation);setup?.(play);a.push(play);return play;};
 const route=(play,id,kind,read=3,hot=false)=>setRoute(play,id,kind,read,hot),block=(play,id,gap=3)=>setBlock(play,id,'',gap,'passblock');
 // Common dropback concepts, grouped by the personnel picture shown in the playbook.
 add('Quick Stick','Slant / Flat','Shotgun Doubles',q=>{route(q,'oX','go',4);route(q,'oSL','flat',1,true);route(q,'oTE','hitch',2);route(q,'oZ','go',3);block(q,'oRB');q.primaryTarget='oSL';q.throwAt=1.8;});
 add('Drive Concept','Shotgun Mesh','Shotgun Doubles',q=>{route(q,'oX','dig',3);route(q,'oSL','shallow',1,true);route(q,'oTE','flat',2);route(q,'oZ','comeback',4);block(q,'oRB');q.primaryTarget='oSL';});
 add('Smash','Slant / Flat','Shotgun Doubles',q=>{route(q,'oX','hitch',2);route(q,'oSL','corner',1,true);route(q,'oTE','curl',3);route(q,'oZ','go',4);block(q,'oRB');q.primaryTarget='oSL';});
 add('Dagger','Four Verticals','Shotgun Doubles',q=>{route(q,'oX','dig',2);route(q,'oSL','go',1,true);route(q,'oTE','seam',3);route(q,'oZ','curl',4);block(q,'oRB');q.primaryTarget='oSL';});
 add('Mesh Sit','Shotgun Mesh','Shotgun Doubles',q=>{route(q,'oX','drag',2);route(q,'oSL','shallow',1,true);route(q,'oTE','curl',3);route(q,'oZ','corner',4);block(q,'oRB');q.primaryTarget='oSL';});
 add('Slot Fade','Four Verticals','Shotgun Doubles',q=>{route(q,'oX','comeback',4);route(q,'oSL','fade',1,true);route(q,'oTE','seam',2);route(q,'oZ','post',3);block(q,'oRB');q.primaryTarget='oSL';});
 add('Levels','Shotgun Mesh','Shotgun Doubles',q=>{route(q,'oX','dig',3);route(q,'oSL','in',1,true);route(q,'oTE','seam',2);route(q,'oZ','comeback',4);block(q,'oRB');q.primaryTarget='oSL';});
 add('Trips Sail','Trips Flood','Shotgun Trips',q=>{route(q,'oX','post',4);route(q,'oSL','flat',1,true);route(q,'oTE','corner',2);route(q,'oZ','go',3);block(q,'oRB');q.primaryTarget='oTE';});
 add('Trips Stick','Trips Flood','Shotgun Trips',q=>{route(q,'oX','go',4);route(q,'oSL','hitch',1,true);route(q,'oTE','flat',2);route(q,'oZ','seam',3);block(q,'oRB');q.primaryTarget='oSL';q.throwAt=2;});
 add('Trips Verticals','Four Verticals','Shotgun Trips',q=>{route(q,'oX','fade',4);route(q,'oSL','seam',1,true);route(q,'oTE','seam',2);route(q,'oZ','go',3);block(q,'oRB');q.primaryTarget='oSL';});
 add('Trips Bubble','Slant / Flat','Shotgun Trips',q=>{route(q,'oX','slant',3);route(q,'oSL','bubble',1,true);route(q,'oTE','flat',2);route(q,'oZ','go',4);block(q,'oRB');q.primaryTarget='oSL';q.throwAt=1.7;});
 add('Bunch Mesh','Shotgun Mesh','Shotgun Bunch',q=>{route(q,'oX','go',4);route(q,'oSL','shallow',1,true);route(q,'oTE','drag',2);route(q,'oZ','corner',3);block(q,'oRB');q.primaryTarget='oSL';});
 add('Bunch Pivot','Slant / Flat','Shotgun Bunch',q=>{route(q,'oX','post',4);route(q,'oSL','out',1,true);route(q,'oTE','corner',2);route(q,'oZ','hitch',3);block(q,'oRB');q.primaryTarget='oSL';});
 add('Bunch Flood','Trips Flood','Shotgun Bunch',q=>{route(q,'oX','dig',4);route(q,'oSL','flat',1,true);route(q,'oTE','out',2);route(q,'oZ','corner',3);block(q,'oRB');q.primaryTarget='oTE';});
 // Backfield run families. Assignments and the carrier path are explicit simulation inputs.
 add('Pistol Inside Zone','Inside Zone','Pistol',q=>{runRoute(q,'oRB',[[0,-3],[0,0],[1,5],[0,13],[0,25]]);q.runGapX=0;});
 add('Pistol Read Option','RPO Glance','Pistol',q=>{runRoute(q,'oRB',[[1,-3],[1,0],[3,5],[5,13],[7,25]]);q.runGapX=3;q.rpoReadId='dS';q.rpoReceiverId='oX';});
 add('I-Form Iso','Power Right','I-Formation',q=>{runRoute(q,'oRB',[[0,-3],[1,0],[2,5],[2,12],[2,23]]);q.runGapX=2;});
 add('I-Form Counter','Power Right','I-Formation',q=>{runRoute(q,'oRB',[[0,-3],[0,0],[-3,2],[-5,7],[-5,18]]);q.runGapX=-5;const lg=q.players.find(p=>p.id==='oLG');lg.job='pull';lg.route=[{x:-2,y:-1},{x:-5,y:2},{x:-7,y:6}];});
 add('Singleback Stretch','Outside Zone Left','Singleback',q=>{runRoute(q,'oRB',[[0,-3],[-3,0],[-7,4],[-11,11],[-14,25]]);q.runGapX=-9;});
 add('Singleback Duo','Inside Zone','Singleback',q=>{runRoute(q,'oRB',[[0,-3],[0,0],[0,5],[1,12],[1,24]]);q.runGapX=1;});
 add('HB Draw','HB Screen','Shotgun Doubles',q=>{q.type='run';q.screen=null;q.throwAt=null;for(const id of ['oLT','oLG','oC','oRG','oRT'])setBlock(q,id,'',3,'runblock');setBlock(q,'oTE','',5,'runblock');setBlock(q,'oSL','',5,'runblock');runRoute(q,'oRB',[[0,-5],[0,-1],[0,3],[1,10],[1,23]]);q.runGapX=1;});
 add('QB Draw','Inside Zone','Empty',q=>{q.runnerId='oQB';q.allowScramble=false;runRoute(q,'oQB',[[0,-5],[0,-1],[0,4],[1,11],[1,23]]);for(const id of ['oLT','oLG','oC','oRG','oRT'])setBlock(q,id,'',2,'runblock');setBlock(q,'oTE','',4,'runblock');setBlock(q,'oRB','',2,'runblock');q.runGapX=1;});
 add('Goal Line Power O','Inside Zone','Goal Line',q=>{for(const id of ['oLT','oLG','oC','oRG','oRT','oTE','oSL'])setBlock(q,id,'',0,'runblock');Object.assign(q.players.find(p=>p.id==='oX'),{x:-9,onLine:true});Object.assign(q.players.find(p=>p.id==='oZ'),{x:9,onLine:true});Object.assign(q.players.find(p=>p.id==='oQB'),{y:-2.5});Object.assign(q.players.find(p=>p.id==='oRB'),{x:0,y:-4.5});runRoute(q,'oRB',[[0,-3],[0,0],[0,3],[1,7],[1,10]]);q.runGapX=0;});
 return a;
}
function createPitchBack(){const o=COPY(createOffensePresets().find(play=>play.name==='Outside Zone Left'));o.id='off-pitch-back';o.name='Pitch Back';o.formation='Shotgun Doubles';o.lateralToId='oQB';o.lateralAt=1.7;return o;}
function createGoalLinePower(){const o=COPY(createOffensePresets().find(play=>play.name==='Inside Zone'));o.id='off-goal-line-power';o.name='Goal Line Power';o.formation='Goal Line';o.runGapX=0;runRoute(o,'oRB',[[1,-3],[0,0],[0,2],[0,5],[0,9]]);return o;}
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
 zone(d.players[9],-13,19,13,12);zone(d.players[10],13,19,13,12);d.coverageScheme='cover2';a.push(d);
 d=defense('Nickel Cover 3');
 d.players[6].label='NB';d.players[6].x=14;d.players[6].y=9;
 zone(d.players[4],-7,9,8,7);zone(d.players[5],1,10,8,8);zone(d.players[6],16,7,9,7);
 zone(d.players[7],-18,19,10,13);zone(d.players[8],18,19,10,13);
 zone(d.players[9],0,22,13,12);zone(d.players[10],-15,7,8,6);d.coverageScheme='cover3';a.push(d);
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
 zone(d.players[9],-13,23,12,13);zone(d.players[10],13,23,12,13);d.coverageScheme='tampa2';a.push(d);
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
 zone(d.players[9],0,22,14,13);zone(d.players[10],-11,7,9);d.coverageScheme='cover3';a.push(d);
 d=defense('Goal Line 6–2');
 d.players[4].job='rush';d.players[4].x=-9;d.players[4].y=1.8;
 d.players[6].job='rush';d.players[6].x=9;d.players[6].y=1.8;
 d.players[5].job='runfit';d.players[5].y=3;
 d.players[10].job='runfit';d.players[10].x=0;d.players[10].y=4;
 man(d.players[7],'oX');man(d.players[8],'oZ');zone(d.players[9],0,12,13,10);a.push(d);
 a.forEach(q=>q.formation=q.name.includes('3–4')?'3-4':q.name.includes('Nickel')||q.name==='Quarters Match'?'Nickel':q.name.includes('Goal Line')?'Goal Line':'4-3');
 const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const add=(name,source,formation,setup)=>{const play=COPY(a.find(q=>q.name===source));play.id='def-'+slug(name);play.name=name;play.formation=formation;setup?.(play);a.push(play);return play;};
 add('4-3 Cover 2 Man','4–3 Cover 2','4-3',q=>{[4,5,6,7,8].forEach((i,j)=>man(q.players[i],['oRB','oTE','oSL','oX','oZ'][j]));zone(q.players[9],-12,20,12,12);zone(q.players[10],12,20,12,12);q.coverageScheme='cover2';});
 add('4-3 Cover 3 Buzz','4–3 Cover 2','4-3',q=>{zone(q.players[4],-8,9,8);zone(q.players[5],0,11,8);zone(q.players[6],8,8,8);zone(q.players[7],-19,20,10,13);zone(q.players[8],19,20,10,13);zone(q.players[9],0,23,13,13);q.players[10].job='runfit';q.players[10].x=8;q.players[10].y=8;q.coverageScheme='cover3';});
 add('Cover 1 Robber','Cover 1 Man','4-3',q=>{man(q.players[4],'oRB');man(q.players[5],'oTE');man(q.players[6],'oSL');man(q.players[7],'oX');man(q.players[8],'oZ');zone(q.players[9],0,23,17,14);zone(q.players[10],0,11,8,7);q.players[10].job='spy';});
 add('Nickel Cover 3 Match','Nickel Cover 3','Nickel',q=>{for(const p of q.players)if(p.job==='zone')p.zoneTechnique='match';q.coverageScheme='cover3';});
 add('Nickel Cover 2 Trap','4–3 Cover 2','Nickel',q=>{q.players[6].label='NB';q.players[6].x=14;q.players[6].y=7;zone(q.players[4],-8,9,8);zone(q.players[5],0,11,8);zone(q.players[6],13,8,9);zone(q.players[7],-19,6,8,7);zone(q.players[8],19,6,8,7);zone(q.players[9],-12,20,12,13);zone(q.players[10],12,20,12,13);q.coverageScheme='cover2';});
 add('Nickel Double Mug','Cover 0 Blitz','Nickel',q=>{q.players[5].job='blitz';q.players[6].job='blitz';man(q.players[4],'oRB');man(q.players[7],'oX');man(q.players[8],'oZ');man(q.players[9],'oSL');man(q.players[10],'oTE');});
 add('Nickel Cover 6','Nickel Cover 3','Nickel',q=>{zone(q.players[4],-8,9,8);zone(q.players[5],0,10,8);zone(q.players[6],9,8,8);zone(q.players[7],-19,6,8,7);zone(q.players[8],19,20,10,13);zone(q.players[9],-12,20,12,13);zone(q.players[10],12,20,12,13);q.coverageScheme='cover6';});
 add('Dime Cover 2','4–3 Cover 2','Dime',q=>{q.players[4].label='NB';q.players[4].x=-8;q.players[4].y=7;q.players[6].label='DB';q.players[6].x=8;q.players[6].y=7;zone(q.players[4],-8,9,8);zone(q.players[5],0,11,8);zone(q.players[6],8,9,8);zone(q.players[7],-19,6,8,7);zone(q.players[8],19,6,8,7);zone(q.players[9],-12,20,12,13);zone(q.players[10],12,20,12,13);q.coverageScheme='cover2';});
 add('Dime Prevent','Nickel Cover 3','Dime',q=>{q.players[4].label='NB';q.players[6].label='DB';zone(q.players[4],-8,13,10);zone(q.players[5],0,14,10);zone(q.players[6],8,13,10);zone(q.players[7],-19,23,11,14);zone(q.players[8],19,23,11,14);zone(q.players[9],-7,26,10,13);zone(q.players[10],7,26,10,13);});
 add('3-4 Cover 2','3–4 Cover 3','3-4',q=>{zone(q.players[4],-9,9,8);zone(q.players[5],0,11,9);zone(q.players[6],9,9,8);zone(q.players[7],-19,6,8,7);zone(q.players[8],19,6,8,7);zone(q.players[9],-12,21,12,13);zone(q.players[10],12,21,12,13);q.coverageScheme='cover2';});
 add('3-4 Fire Zone','3–4 Cover 3','3-4',q=>{q.players[4].job='blitz';zone(q.players[5],0,10,8);zone(q.players[6],8,9,8);zone(q.players[7],-19,18,10,13);zone(q.players[8],19,18,10,13);zone(q.players[9],0,23,13,13);});
 add('3-4 Edge Blitz','3–4 Cover 3','3-4',q=>{q.players[3].job='blitz';q.players[4].job='blitz';man(q.players[5],'oRB');man(q.players[6],'oTE');man(q.players[7],'oX');man(q.players[8],'oZ');zone(q.players[9],0,22,13,13);q.players[10].job='spy';});
 add('Goal Line 5-3 Run Blitz','Goal Line 6–2','Goal Line',q=>{q.players[0].x=-7;q.players[1].x=-3.5;q.players[2].x=0;q.players[3].x=3.5;q.players[4].x=7;q.players[0].job=q.players[1].job=q.players[3].job=q.players[4].job='rush';q.players[5].job='runfit';q.players[6].job='runfit';q.players[5].y=3;q.players[6].y=3;q.players[10].job='runfit';q.players[10].x=0;q.players[10].y=5;man(q.players[7],'oX');man(q.players[8],'oZ');zone(q.players[9],0,12,12,10);});
 return a;
}
const api={offense,defense,routeFrom,setRoute,setBlock,createOffensePresets,createPitchBack,createGoalLinePower,createDefensePresets};
root.GridironPlays=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
