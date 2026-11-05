/**
 * P18.3 release gate. Registrations are data, not spawn permission.
 * Never reuse a wolf, draugr, or primitive geometry as another species.
 */
export const P183_PENDING_SPECIES=Object.freeze([
  Object.freeze({id:'wild_boar',label:'Jabalí salvaje',behavior:'charge_flee',modelKey:null,licenseVerified:false,rigValidated:false}),
  Object.freeze({id:'forest_spider',label:'Araña del bosque',behavior:'ambush_web',modelKey:null,licenseVerified:false,rigValidated:false}),
  Object.freeze({id:'bandit_rogue',label:'Bandido',behavior:'retreat_alert',modelKey:null,licenseVerified:false,rigValidated:false})
]);
export function speciesReadyP183(spec,loadedAssets){
  return !!(spec&&spec.licenseVerified===true&&spec.rigValidated===true&&
    typeof spec.modelKey==='string'&&spec.modelKey.length>0&&
    Array.isArray(loadedAssets)&&loadedAssets.includes(spec.modelKey));
}
