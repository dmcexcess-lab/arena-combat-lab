'use strict';
// Reproducible development audit. These are generated flags, not accepted NFL penalties.
const C=require('../engine.js');
const P=require('../plays.js');
const G=require('../game.js');

function auditGames(count=8){
 const offenses=P.createOffensePresets(),defenses=P.createDefensePresets(),games=[];
 for(let g=1;g<=count;g++){
  let state=G.createExhibition((g*29197)>>>0);
  G.flipCoin(state,'heads',g%2?'heads':'tails','receive');
  let steps=0,flags=0,medicalEvents=0;
  while(state.phase!=='final'&&steps<450){
   steps++;
   const seed=(g*7919+steps*97)>>>0;
   if(['kickoff','safetyKick'].includes(state.phase)){
    const kick=G.kick(state,state.phase,seed);
    flags+=kick.kick.alignment?.legal===false?1:0;
    state=kick.state;continue;
   }
   if(state.phase==='try'){state=G.kick(state,'extraPoint',seed).state;continue;}
   const own=state.possession==='home'?state.ball:100-state.ball;
   if(state.down===4&&state.toGain>2){state=G.kick(state,own>=65?'fieldGoal':'punt',seed).state;continue;}
   const pick=G.autoPick(state,offenses,defenses);
   const offense=G.dressPlay(state,offenses.find(p=>p.id===pick.offense),state.possession,'offense');
   const defense=G.dressPlay(state,defenses.find(p=>p.id===pick.defense),state.possession==='home'?'away':'home','defense');
   offense.yardLine=own;offense.enableLooseBall=true;
   const sim=C.simulate(offense,defense,seed);
   if(!sim.valid)throw new Error('Auto-picked play invalid: '+sim.validation.errors.join('; '));
   const ruling=G.finishScrimmage(state,sim,G.huddleSeconds(state),{offense,defense});
   flags+=(ruling.fouls?.length||0)+(!ruling.accepted&&ruling.foul?1:0);
   medicalEvents+=ruling.injuries?.length||0;
   state=ruling.state;
  }
  games.push({game:g,complete:state.phase==='final',plays:state.plays,flags,medicalEvents,score:state.score});
 }
 const mean=key=>games.reduce((sum,game)=>sum+game[key],0)/games.length;
 return {games,averages:{plays:mean('plays'),generatedFlags:mean('flags'),medicalEvents:mean('medicalEvents')}};
}
if(require.main===module)console.log(JSON.stringify(auditGames(),null,2));
module.exports={auditGames};
