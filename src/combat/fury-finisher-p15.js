/** HIGHFLY P15 directional fourth-strike finisher. 
 * Input sampled from the ATK button through the impact frame. Movement joystick ignored.
 * No new animations or button; CC respects boss/size/guard eligibility.
 */
export const FURY_FINISHER_P15=Object.freeze({
 threshold:.42,sideImpulse:11.5,launchVelocity:9.2,sideLift:2.1,
 heavyPush:12.5,forwardPush:7,launchStun:.52,sideStun:.38,heavyStun:.44,
 maxRadius:1.75
});
export function finisherInput(input,yaw=0){
 // P19: ONLY the dedicated ATK gesture may steer a touch finisher.
 // The movement joystick MUST NOT influence the fourth attack.
 // A finished/released gesture persists until the impact frame.
 const analog=input?.furyFinisherGesture;
 let x=analog?Math.max(-1,Math.min(1,Number(analog.x)||0)):0;
 let y=analog?Math.max(-1,Math.min(1,Number(analog.y)||0)):0;
 // Keyboard fallback is allowed only when NO touch finisher gesture exists.
 if(!analog){
  const keys=input?.keys;
  if(keys){x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    y=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);}
 }
 const ax=Math.abs(x),ay=Math.abs(y);
 let mode='forward';
 if(Math.max(ax,ay)>=FURY_FINISHER_P15.threshold){
  // A diagonal chooses its dominant component; pressing UP always launches
  // when vertical magnitude is at least lateral magnitude.
  if(ay>=ax)mode=y<0?'launch':'heavy';
  else mode=x<0?'left':'right';
 }
 const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
 let vx=fx*FURY_FINISHER_P15.forwardPush,vy=1,vz=fz*FURY_FINISHER_P15.forwardPush;
 let stun=.26,arrow='→',label='Frontal';
 if(mode==='launch'){
  vx=fx*2.5;vz=fz*2.5;vy=FURY_FINISHER_P15.launchVelocity;
  stun=FURY_FINISHER_P15.launchStun;arrow='↑';label='Elevación';
 }else if(mode==='left'||mode==='right'){
  const sign=mode==='left'?-1:1;
  vx=rx*FURY_FINISHER_P15.sideImpulse*sign+fx*1.1;
  vz=rz*FURY_FINISHER_P15.sideImpulse*sign+fz*1.1;
  vy=FURY_FINISHER_P15.sideLift;stun=FURY_FINISHER_P15.sideStun;
  arrow=mode==='left'?'←':'→';label=mode==='left'?'Izquierda':'Derecha';
 }else if(mode==='heavy'){
  vx=fx*FURY_FINISHER_P15.heavyPush;
  vz=fz*FURY_FINISHER_P15.heavyPush;vy=.65;
  stun=FURY_FINISHER_P15.heavyStun;arrow='↓';label='Empuje';
 }
 return {mode,vx,vy,vz,stun,arrow,label};
}
export function finisherAllowed(enemy,remainingHp=enemy?.hp){
 if(!enemy||!enemy.alive||remainingHp<=0)return false;
 if(enemy.boss||enemy.type==='dragon'||enemy.ccImmune||
    enemy.blocking||enemy.defending)return false;
 return Number(enemy.hitRadius||1)<=FURY_FINISHER_P15.maxRadius;
}
