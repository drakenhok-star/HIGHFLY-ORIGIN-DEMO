/** HIGHFLY P17 — RPG/Training ownership contract (pure data, NO gameplay wiring).
 * This models the user's NEW decision: visible hunter STATS grow through
 * level + validated real training; equipment NEVER edits hunter stats.
 * Older tSTR/tAGI/tVIT/tPER/tINT training-only records remain separate.
 * Prototype coefficients are simulation candidates, NOT production balance.
 */
export const CORE_STATS=Object.freeze(['STR','AGI','VIT','PER','INT']);
export const RPG_EVENT_TYPES=Object.freeze([
  'enemyKilled','itemPickedUp','npcTalked','areaVisited','questCompleted',
  'itemEquipped','reputationChanged','fitnessAssessmentValidated'
]);
export const EQUIPMENT_ATTRIBUTES=Object.freeze([
  'physicalDamage','magicPower','armor','criticalChance','haste',
  'accuracy','evasion','elementalResistance','maxHpBonus',
  'maxMpBonus','maxEnergyBonus','skillEfficiency'
]);
export const RPG_P17_RULES=Object.freeze({
  minLevel:1,maxLevel:99,initialStat:10,statPerLevel:1,
  maxTrainingShareOfFinalPower:.30,calibrationDays:7,
  assessmentVersion:'fitness-evidence-v1',schemaVersion:17
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));
const round=(n)=>Math.round(n*10000)/10000;

export function levelCoreStats(level){
  const L=Math.floor(clamp(level,RPG_P17_RULES.minLevel,RPG_P17_RULES.maxLevel));
  return Object.fromEntries(CORE_STATS.map(k=>[k,
    RPG_P17_RULES.initialStat+(L-1)*RPG_P17_RULES.statPerLevel]));
}

export function validateFitnessAssessment(assessment){
  // This is a CONTRACT for the future trusted Fitness Core bridge.
  // A client-side boolean is NOT antifraud verification, and cannot replace it.
  if(!assessment || assessment.source!=='highfly-training-core'
     || assessment.version!==RPG_P17_RULES.assessmentVersion
     || assessment.validated!==true
     || !Number.isInteger(assessment.calibrationDays)
     || assessment.calibrationDays<RPG_P17_RULES.calibrationDays)return false;
  return CORE_STATS.every(k=>Number.isFinite(assessment.trainingScores?.[k])
    && assessment.trainingScores[k]>=0 && assessment.trainingScores[k]<=1);
}

export function hunterStatBreakdown({level=1,fitnessAssessment=null}={}){
  const L=Math.floor(clamp(level,1,99));
  const levelStats=levelCoreStats(L);
  const accepted=validateFitnessAssessment(fitnessAssessment);
  const trainingStats={};const totalStats={};const fitnessShares={};
  // If the proposed 30% is max share of FINAL power, max fitness addition
  // is 3/7 of the level-derived baseline, not merely +30% of baseline.
  for(const k of CORE_STATS){
    const score=accepted?fitnessAssessment.trainingScores[k]:0;
    const share=RPG_P17_RULES.maxTrainingShareOfFinalPower*score;
    const fitnessDelta=levelStats[k]*share/(1-share);
    trainingStats[k]=round(fitnessDelta);
    totalStats[k]=round(levelStats[k]+fitnessDelta);
    fitnessShares[k]=round(share);
  }
  return {schemaVersion:17,level:L,calibrationStatus:accepted?'validated':'pending',
    levelStats,trainingStats,totalStats,fitnessShares};
}

export function equipmentAttributeTotals(items=[]){
  // Equipment is its own namespace, NEVER passed into hunterStatBreakdown.
  if(!Array.isArray(items))throw Error('Equipment must be an array');
  const totals={};
  for(const item of items){
    if(!item || typeof item!=='object')throw Error('Invalid item');
    const attrs=item.attributes||{};
    // Explicitly reject raw STATS and any unapproved key; silent acceptance
    // would recreate the STR-from-gear bug in the next system.
    if(item.stats||item.coreStats||item.trainingStats)throw Error('Gear cannot own base stats');
    for(const [key,value] of Object.entries(attrs)){
      if(!EQUIPMENT_ATTRIBUTES.includes(key))throw Error('Forbidden equipment attribute: '+key);
      if(!Number.isFinite(value)||value<0)throw Error('Invalid attribute amount: '+key);
      totals[key]=round((totals[key]||0)+value);
    }
  }
  return totals;
}

export function previewDerivedResources({level=1,fitnessAssessment=null}={}){
  const p=hunterStatBreakdown({level,fitnessAssessment});
  const base=100+8*(p.level-1); // Tianjie5 donor baseline, before balancing
  return {
    hp:round(base+4*p.trainingStats.VIT),
    mp:round(base+4*p.trainingStats.INT),
    energy:round(base+4*p.trainingStats.STR),
    // tINT receives validated consistency/plan performance from Training Core.
    // This prototype only consumes the validated tINT score; it never rewards
    // pressing a daily workout button or punishes planned rest days.
  };
}

export function socialStanding(value){
  const v=clamp(value,-100,100);
  return v<=-40?'hostile':v>=60?'ally':v>=25?'trusted':'neutral';
}
export function applyReputationEvent(state,evt){
  if(!state || typeof state!=='object'||!evt ||typeof evt!=='object')
    throw Error('Invalid reputation event');
  const allowed=['help','questDelivered','theft','betrayal','restitution'];
  if(!allowed.includes(evt.action))throw Error('Unknown social action');
  if(typeof evt.cityId!=='string'||!evt.cityId)throw Error('Missing cityId');
  const changes={help:8,questDelivered:12,theft:-20,betrayal:-40,restitution:4};
  const cities={...(state.cities||{})};
  const npcs={...(state.npcs||{})};
  cities[evt.cityId]=round(clamp((cities[evt.cityId]||0)+changes[evt.action],-100,100));
  if(evt.npcId){
    if(typeof evt.npcId!=='string')throw Error('Invalid npcId');
    const id=evt.cityId+':'+evt.npcId;
    npcs[id]=round(clamp((npcs[id]||0)+changes[evt.action]*1.5,-100,100));
  }
  return {schemaVersion:17,cities,npcs};
}
export function createRpgEvent(type,payload){
  if(!RPG_EVENT_TYPES.includes(type))throw Error('Unrecognized RPG event: '+type);
  if(!payload || typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid RPG event');
  return Object.freeze({type,payload:Object.freeze({...payload}),schemaVersion:17});
}
