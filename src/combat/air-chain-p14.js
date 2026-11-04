/** FURY AIR CHAIN P14: deterministic, data-only combat rules. No GPU allocations. */
export const AIR_CHAIN_P14=Object.freeze({
 aerialBonus:1.15,
 aerialVerticalReach:2.7,
 aerialComboGrace:1.9,
 transitionGrace:0.85,
 maxAirGrace:2.8,
 launcherVerticalVelocity:7.0,
 maxLaunchRadius:1.75,
});
export function canMaintainAirChain(step,onGround,remaining){
 return step>0 && !onGround && remaining>0;
}
export function advanceComboClock(timer,grace,dt,onGround,step){
 const delta=Math.max(0,dt);
 let nextGrace=Math.max(0,grace-delta);
 let nextTime=Math.max(0,timer-(onGround||nextGrace<=0?delta:0));
 return {timer:nextTime,grace:nextGrace,ended:step>0&&nextTime<=0};
}
export function airStrikeProfile(step,airborne,enemy){
 const air=Boolean(airborne);
 const radius=Number(enemy?.hitRadius||1);
 const excluded=enemy?.type==='dragon'||enemy?.type==='boss'||radius>AIR_CHAIN_P14.maxLaunchRadius;
 return {
  damageMultiplier:air?AIR_CHAIN_P14.aerialBonus:1,
  maxVerticalDistance:air?AIR_CHAIN_P14.aerialVerticalReach+Math.min(.7,radius*.4):1.8,
  launch:air&&step===4&&!excluded,
  launchVelocity:AIR_CHAIN_P14.launcherVerticalVelocity,
 };
}
