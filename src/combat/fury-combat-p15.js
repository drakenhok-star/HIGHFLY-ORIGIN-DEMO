/** HIGHFLY P15 — FURY Combat 2.0: data-only action rules for mobile.
 * No Three, browser or WebGL dependencies. Only previously audited real GLB clips.
 * All times seconds; state changes are gated by existing MP/Energia and cooldowns.
 */
export const FURY_STRIKES_P15=Object.freeze([
 Object.freeze({step:1,duration:.31,hitAt:.115,recoveryAt:.17,cooldown:.31,clip:'1H_Melee_Attack_Slice_Diagonal'}),
 Object.freeze({step:2,duration:.32,hitAt:.125,recoveryAt:.19,cooldown:.32,clip:'1H_Melee_Attack_Slice_Horizontal'}),
 Object.freeze({step:3,duration:.355,hitAt:.145,recoveryAt:.22,cooldown:.35,clip:'1H_Melee_Attack_Stab'}),
 Object.freeze({step:4,duration:.44,hitAt:.17,recoveryAt:.29,cooldown:.42,clip:'1H_Melee_Attack_Chop'})
]);
export const FURY_CANCEL_P15=Object.freeze({dashQueue:.30,chainBuffer:.20,airTransition:.95});
export function strikeProfile(step,context='ground'){
 const entry=FURY_STRIKES_P15[Math.max(0,Math.min(3,step-1))];
 return { ...entry, context,
  // The same audited arm clips are usable aloft. No fictional aerial clip is claimed.
  fade:context==='air'||context==='plunge'?.045:.065,
  hitAt:context==='plunge'?entry.hitAt+.025:entry.hitAt,
  impactRadius:context==='plunge'?3.6:3.4};
}
export function resolveCombatContext({grounded=true,verticalSpeed=0,dashRecovery=false,runSpeed=0}={}){
 if(!grounded)return verticalSpeed< -4.5?'plunge':'air';
 if(dashRecovery)return 'dash-followup';
 return runSpeed>7.5?'running':'ground';
}
export function canCancelAction({kind='idle',elapsed=0,step=1,request='dash',grounded=true}={}){
 if(kind==='idle'||kind==='air'||kind==='locomotion')return true;
 if(kind==='cast')return request==='dash'&&elapsed>=.20;
 if(kind!=='attack')return false;
 const active=FURY_STRIKES_P15[Math.max(0,Math.min(3,step-1))];
 if(request==='dash')return elapsed>=active.recoveryAt;
 if(request==='jump')return elapsed>=active.hitAt;
 if(request==='skill')return elapsed>=active.recoveryAt && (grounded||elapsed>=active.hitAt);
 if(request==='attack')return elapsed>=active.hitAt;
 return false;
}
export function reactionPolicy({type='wolf',boss=false,radius=1,step=1,airborne=false,remainingHp=1}={}){
 if(remainingHp<=0||type==='dragon'||boss||radius>1.75)return {stun:0,launch:false,invulnerable:false};
 const launch=airborne&&step===4;
 return {stun:launch?.28:step===4?.20:.115,launch,invulnerable:false};
}
export function pickMeleeTarget(enemies,origin,previous=null,locked=null,maxRange=4.5){
 if(locked?.alive&&locked.group){
  const dx=locked.group.position.x-origin.x,dz=locked.group.position.z-origin.z;
  if(dx*dx+dz*dz<=(maxRange+(locked.hitRadius||0))**2)return locked;
 }
 let best=null,score=Infinity;
 for(const e of enemies){
  if(!e?.alive||!e.group)continue;
  const dx=e.group.position.x-origin.x,dz=e.group.position.z-origin.z;
  const dist2=dx*dx+dz*dz,limit=maxRange+(e.hitRadius||0);
  if(dist2>limit*limit)continue;
  const next=Math.sqrt(dist2)-(e===previous?1.35:0);
  if(next<score){score=next;best=e;}
 }
 return best;
}
export function buildSkillContract(def){
 if(!def||typeof def.id!=='string'||!/^[a-z0-9_-]{2,48}$/.test(def.id))throw Error('skill id inválido');
 if(!['physical','magic'].includes(def.kind))throw Error('tipo de skill inválido');
 if(!['melee','line','cone','circle','self','target'].includes(def.aim))throw Error('apuntado inválido');
 if(!Number.isFinite(def.cost)||def.cost<0||!Number.isFinite(def.cooldown)||def.cooldown<0)throw Error('recurso/CD inválidos');
 return Object.freeze({id:def.id,kind:def.kind,aim:def.aim,resource:def.kind==='magic'?'mp':'energy',
   cost:def.cost,cooldown:def.cooldown,allowAir:!!def.allowAir,allowWall:!!def.allowWall,
   clip:typeof def.clip==='string'?def.clip:null});
}
