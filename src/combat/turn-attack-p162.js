/** P16.2 mobile turn + strike intent; deterministic, allocation-light helpers. */
export const P162_ATTACK_TURN_RATE = 46;
export const P162_AIM_CONE_DOT = 0.30; // ~72°: refuse soft auto-target directly behind a fast pivot
/** Return current intended facing, preferring an explicit manual lock over joystick. */
export function attackIntentYaw(move, origin, previousYaw, target=null, hardLock=null){
  const focus = hardLock?.alive && hardLock.group ? hardLock : null;
  const lengthSquared = (move?.x||0)**2 + (move?.z||0)**2;
  if(focus) {
    const dx=focus.group.position.x-origin.x, dz=focus.group.position.z-origin.z;
    if(dx*dx+dz*dz>1e-6)return Math.atan2(-dx,-dz);
  }
  if(lengthSquared>0.04) return Math.atan2(-move.x,-move.z);
  if(target?.alive && target.group){
    const dx=target.group.position.x-origin.x,dz=target.group.position.z-origin.z;
    if(dx*dx+dz*dz>1e-6)return Math.atan2(-dx,-dz);
  }
  return previousYaw;
}
/** Should a soft target still be followed while player actively changes direction? */
export function acceptsAttackIntent(move, origin, target, minDot=P162_AIM_CONE_DOT){
  if(!target?.alive||!target.group)return false;
  const dx=target.group.position.x-origin.x, dz=target.group.position.z-origin.z;
  const len2=dx*dx+dz*dz;
  if(len2<1e-6)return true;
  const m2=(move?.x||0)**2+(move?.z||0)**2;
  if(m2<0.04)return true; // idle can still soft-target as before
  return (move.x*dx+move.z*dz)/Math.sqrt(m2*len2)>=minDot;
}
