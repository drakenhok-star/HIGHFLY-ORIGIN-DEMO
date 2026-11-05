/** HIGHFLY FURY · L26 — side-effect-free 15 skill export contract.
 * This file is transportable into the MAIN demo without lab bootstrap.
 * 15 skill IDs, presentation, resources and VFX hooks are declarations only.
 * Runtime gameplay ownership continues with FURY P16 until a staged adapter
 * implements these interfaces with verified hit/aim/cooldown behavior.
 */
const mk=(kit,resource,defs)=>defs.map(([id,name,slot,cost,cd,vfx,source])=>
  Object.freeze({id,kit,name,slot,resource,cost,cd,vfx,source,
    hooks:Object.freeze(['onCast','onImpact']),
    stage:'L26-LAB'}));
export const HIGHFLY_SKILL_EXPORT_L26=Object.freeze([
 ...mk('GUINEVERE','MP',[
  ['guin_violet_lance','Lanza Violeta',1,14,4.4,'violet-bolt','HIGHFLY_ORIGINAL'],
  ['guin_ascension','Ascenso / Recast',2,23,15,'skyward-lift','HIGHFLY_ORIGINAL'],
  ['guin_tempest','Tempestad',3,40,40,'storm-vortex','HIGHFLY_ORIGINAL']]),
 ...mk('DYRROTH','ENERGY',[
  ['dyr_fury_slashes','Cortes de Furia',1,18,5,'triple-shear','HIGHFLY_ORIGINAL'],
  ['dyr_step','Paso / Recast',2,25,12,'blood-step','HIGHFLY_ORIGINAL'],
  ['dyr_final_cut','Corte Final',3,42,32,'dark-execution','HIGHFLY_ORIGINAL']]),
 ...mk('TIGREAL','ENERGY',[
  ['tig_iron_wave','Onda de Hierro',1,18,6,'iron-wave','HIGHFLY_ORIGINAL'],
  ['tig_charge','Embestida / Recast',2,25,14,'steel-onrush','HIGHFLY_ORIGINAL'],
  ['tig_collapse','Colapso',3,42,44,'gravity-collapse','HIGHFLY_ORIGINAL']]),
 ...mk('CLAUDE_MAGE','MP',[
  ['woc_fireball','Fireball',1,20,3.8,'fireball','WOCC_MIT_RECONSTRUCTION'],
  ['woc_meteor','Meteorito',2,42,17,'meteor','WOCC_MIT_RECONSTRUCTION'],
  ['woc_frost_nova','Frost Nova',3,27,13,'frost_nova','WOCC_MIT_RECONSTRUCTION']]),
 ...mk('CLAUDE_ROGUE','ENERGY',[
  ['woc_backstab','Backstab',1,17,3.2,'backstab','WOCC_MIT_RECONSTRUCTION'],
  ['woc_kidney_shot','Kidney Shot',2,25,12,'kidney_shot','WOCC_MIT_RECONSTRUCTION'],
  ['woc_charge','Charge',3,22,10,'charge','WOCC_MIT_RECONSTRUCTION']])
]);
export const HIGHFLY_VFX_HOOKS_L26=Object.freeze({
 onCast:'Run owned targeting preview and visual windup ONLY after resources/cooldown are available',
 onImpact:'Run 3D verified collision impact; must never generate damage without hit confirm',
 onCancel:'No cost and no cooldown when dragging to CANCELAR',
 resources:'Magic uses MP, physical skills use Energy; no rage bars',
 ownership:'Player, joystick, 4th directional ATK, movement, camera and melee belong to FURY P16',
 media:'No restricted ClaudeCraft PNG/GLB/SFX; THREE primitives and verified CC0 only'
});
export function findL26Skill(id){return HIGHFLY_SKILL_EXPORT_L26.find(s=>s.id===id)||null;}
export function l26SkillFamilies(){
 return [...new Set(HIGHFLY_SKILL_EXPORT_L26.map(s=>s.kit))];
}
