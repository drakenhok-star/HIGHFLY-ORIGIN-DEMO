/**
 * HIGHFLY P187 / W0 — versioned profession curriculum state.
 * One source of truth for early apprenticeship. Other trainers are NOT spawned
 * until a CC0 rig and a navigable building are validated in the actual world.
 * SaveSys owns serialization; no sidecar localStorage and no legacy key writes.
 */
import {
 INICIOS_SCHEMA_P186,INICIOS_PROFESSION_BY_ID_P186,INICIOS_TRAINERS_P186,
 newIniciosProfessionStateP186,learnIniciosProfessionP186,
 awardIniciosProficiencyP186
} from './inicios-v2-p186.js';

const TRAINERS=new Map(INICIOS_TRAINERS_P186.map(t=>[t.id,t]));
export class P187ProfessionRuntime {
 constructor(game){this.game=game;this.reset();}
 reset(){this.state=newIniciosProfessionStateP186();}
 serialize(){return newIniciosProfessionStateP186(this.state);}
 applyData(value){this.state=newIniciosProfessionStateP186(value);}
 isLearned(id){return !!this.state.learned[id];}
 learnAtTrainer(professionId,trainerId){
   const p=INICIOS_PROFESSION_BY_ID_P186[professionId];
   const trainer=TRAINERS.get(trainerId);
   if(!p||!trainer||p.trainerId!==trainerId)return {ok:false,reason:'WRONG_TRAINER'};
   const liveTeacher=this.game?.p192Build&&this.game?.npcs?.list?.find(n=>
    n.id===trainerId&&n.p192TrainerId===trainerId&&
    (n.pos.x-this.game.player.pos.x)**2+
    (n.pos.z-this.game.player.pos.z)**2<=144);
   if(!trainer.existing&&!liveTeacher)
     return {ok:false,reason:'TRAINER_NOT_YET_IN_WORLD'};
   if((this.game?.stats?.level||0)<p.introLevel)
     return {ok:false,reason:'LEVEL_TOO_LOW',level:p.introLevel};
   if(this.state.learned[p.id])return {ok:false,reason:'ALREADY_LEARNED'};
   this.state=learnIniciosProfessionP186(this.state,p.id);
   return {ok:true,id:p.id,source:'existing_trainer',schemaVersion:INICIOS_SCHEMA_P186};
 }
 grantFromVerifiedActivity(professionId,awardId,points=1){
   if(!this.state.learned[professionId])return {ok:false,reason:'PROFESSION_NOT_LEARNED'};
   const before=this.state.experience[professionId]||0;
   const wasAwarded=!!this.state.awarded[awardId];
   const next=awardIniciosProficiencyP186(this.state,professionId,awardId,points);
   this.state=next;
   return {ok:!wasAwarded,reason:wasAwarded?'ALREADY_AWARDED':'GRANTED',
     value:next.experience[professionId],delta:next.experience[professionId]-before};
 }
}
