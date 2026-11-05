/** HIGHFLY L25 — deterministic, testable air-combat timings, no renderer. */
export const L25_AIR=Object.freeze({
  hitsToBreak:4,hitWindow:4.5,downSeconds:5.5,
  shotCooldown:.42,shotRange:32,shotSpeed:43,shotDamage:28,
  groundedOffset:.45,descentSpeed:12,ascentSpeed:3.2
});
export function countedAirHit25(hits,lastAt,now,window=L25_AIR.hitWindow){
  return (Number.isFinite(lastAt)&&now-lastAt<=window?hits:0)+1;
}
export function advanceFlightOffset25(current,target,rate,dt){
  const start=Number.isFinite(current)?current:0;
  const distance=target-start;
  return start+Math.sign(distance)*Math.min(Math.abs(distance),
    Math.max(0,rate)*Math.max(0,dt));
}
