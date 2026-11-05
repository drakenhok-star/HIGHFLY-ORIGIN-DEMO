/** Passive event surface for future defenses/counters. NO functional block/parry is installed. */
export const FURY_EVENTS_P19=Object.freeze([
 'confirmed-basic-hit','combo-interrupted','finisher-impact',
 'dodge-success','block-success','stagger','launch','counter'
]);
export class FuryCombatPortsP19 {
 constructor(){this.handlers=new Map();}
 on(event,handler){
  if(!FURY_EVENTS_P19.includes(event)||typeof handler!=='function')throw Error('Unsupported combat event');
  const set=this.handlers.get(event)||new Set();set.add(handler);
  this.handlers.set(event,set);
  return ()=>set.delete(handler);
 }
 emit(event,payload={}){
  if(!FURY_EVENTS_P19.includes(event))return false;
  for(const fn of this.handlers.get(event)||[])fn(payload);
  return true;
 }
}
