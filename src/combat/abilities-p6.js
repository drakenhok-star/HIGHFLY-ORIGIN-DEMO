/**
 * HIGHFLY P6 · Catálogo original de habilidades. Datos de juego, sin assets externos.
 * Los gritos de Tianjie conservan su progreso y sus efectos originales.
 */
export const ABILITIES_P6 = Object.freeze({
  S1: Object.freeze({ id:'fireball', label:'BOLA DE FUEGO', kind:'magic', resource:'mp', cost:18, cd:0.6, range:50, vfx:'fireball', target:'projectile' }),
  S2: Object.freeze({ id:'fus', label:'FUS', kind:'physical', resource:'sp', cost:12, cd:15, range:14, vfx:'force', target:'cone' }),
  S3: Object.freeze({ id:'frost', label:'HIELO', kind:'magic', resource:'mp', cost:24, cd:18, range:15, vfx:'frost', target:'cone', status:'slow' }),
  S4: Object.freeze({ id:'wuld', label:'WULD', kind:'physical', resource:'sp', cost:24, cd:8, range:14, vfx:'dash', target:'self' })
});
export function abilityForShout(id) {
  return Object.values(ABILITIES_P6).find(a=>a.id===id) || null;
}
export function spendAbilityResource(stats, def) {
  if (!def || !stats) return false;
  if (def.resource === 'mp') return stats.useMagicka(def.cost);
  if (def.resource === 'sp') return stats.useStamina(def.cost);
  return false;
}
