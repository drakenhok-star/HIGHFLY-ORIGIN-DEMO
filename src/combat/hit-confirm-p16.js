/** HIGHFLY P16: pure input response and confirmed-hit combo math. */
export const P16_RESPONSE={deadzone:.055,fullTravel:.56,acceleration:40};
export function responsiveJoystick(rawX,rawY){
 const x=Number.isFinite(rawX)?rawX:0,y=Number.isFinite(rawY)?rawY:0;
 const len=Math.hypot(x,y);
 if(len<=P16_RESPONSE.deadzone)return {x:0,y:0};
 const speed=Math.min(1,(len-P16_RESPONSE.deadzone)/(P16_RESPONSE.fullTravel-P16_RESPONSE.deadzone));
 const factor=speed/len;
 return {x:x*factor,y:y*factor};
}
export function nextSwing(confirmedStep,windowActive){
 return confirmedStep>0&&windowActive?confirmedStep%4+1:1;
}
export function confirmedDamage(previousHP,currentHP){
 return Number.isFinite(previousHP)&&Number.isFinite(currentHP)&&currentHP<previousHP;
}
export function commitConfirmedHit(previousStep,attemptedStep,hit){
 return hit?attemptedStep:previousStep;
}
export function shouldClaimJoyContact(x,y,rect,padding=24){
 return x>=rect.left-padding&&x<=rect.right+padding &&
        y>=rect.top-padding&&y<=rect.bottom+padding;
}
