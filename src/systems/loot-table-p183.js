/**
 * HIGHFLY P18.3 - bonus drop tables for existing, licensed monster rigs.
 * Every listed ID already exists in ITEM_DB. Guaranteed legacy loot / gold / XP
 * remain untouched; quests listen to kills rather than spawning mobs.
 * Items change existing equipment-derived attributes, never training Core Stats.
 */
export const P183_RARITY=Object.freeze({
  common:0,uncommon:1,rare:2,epic:3,legendary:4
});
const entry=(id,chance,rarity)=>Object.freeze({id,chance,rarity});
export const P183_BONUS_TABLES=Object.freeze({
  wolf:Object.freeze([entry('health_potion',.06,'uncommon'),entry('hide_armor',.009,'rare')]),
  wolf_sentinel:Object.freeze([entry('health_potion',.10,'uncommon'),entry('steel_sword',.018,'rare')]),
  ice_wolf:Object.freeze([entry('mana_potion',.09,'uncommon'),entry('hide_armor',.025,'rare')]),
  draugr:Object.freeze([entry('mana_potion',.10,'uncommon'),entry('steel_sword',.025,'rare')]),
  draugr_boss:Object.freeze([entry('steel_sword',.15,'rare'),entry('ancient_sword',.025,'epic')]),
  dragon:Object.freeze([entry('dragonbone_sword',.08,'epic'),entry('dragonscale_armor',.09,'epic')])
});
export const P183_BASE_RARITY=Object.freeze({
  wolf:'common',wolf_sentinel:'common',ice_wolf:'uncommon',
  draugr:'common',draugr_boss:'rare',dragon:'rare'
});
export function lootSpeciesP183(enemy){
  if(!enemy)return null;
  if(enemy.type==='wolf')return enemy.p18Frontier?'wolf_sentinel':enemy.ice?'ice_wolf':'wolf';
  if(enemy.type==='draugr')return enemy.boss?'draugr_boss':'draugr';
  return enemy.type==='dragon'?'dragon':null;
}
/** Returns only bonus items: legacy guaranteed drops are always kept. */
export function rollBonusLootP183(enemy,rng=Math.random){
  const species=lootSpeciesP183(enemy);
  const items=[];
  let rarity=P183_BASE_RARITY[species]||'common';
  for(const choice of P183_BONUS_TABLES[species]||[]){
    const r=Number(rng());
    if(Number.isFinite(r)&&r>=0&&r<choice.chance){
      items.push(choice.id);
      if(P183_RARITY[choice.rarity]>P183_RARITY[rarity])rarity=choice.rarity;
    }
  }
  return {species,items,rarity};
}
