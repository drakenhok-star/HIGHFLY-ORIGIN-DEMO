/**
 * Inspect actual glTF JSON chunks from the published GLBs (no external libraries).
 * Never assume animation names from a catalog, report only verified embedded clips.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const names=[
  'player_barbarian','npc_chief_mage','npc_blacksmith_knight','npc_villager_rogue',
  'draugr_skeleton_warrior','draugr_skeleton_mage','wolf_quaternius','dragon_evolved_quaternius'
];
export function inspectGlb(b,name) {
  if(b.length<20 || b.toString('ascii',0,4)!=='glTF')throw Error(name+': GLB magic invalid');
  const version=b.readUInt32LE(4),len=b.readUInt32LE(8),jsonLen=b.readUInt32LE(12);
  if(version!==2 || len!==b.length || b.readUInt32LE(16)!==0x4e4f534a)
    throw Error(name+': invalid GLB v2 JSON header');
  const json=JSON.parse(b.subarray(20,20+jsonLen).toString('utf8').trim());
  return {file:name,size:b.length,skins:(json.skins||[]).length,
    joints:(json.skins||[]).map(s=>s.joints?.length||0),
    animations:(json.animations||[]).map(a=>a.name||'unnamed'),
    nodes:(json.nodes||[]).length,
    bones:(json.skins||[]).flatMap(s=>(s.joints||[]).map(i=>json.nodes?.[i]?.name||String(i)))};
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const report=[];
  for(const name of names){
    const buf=await readFile(new URL('../assets/models/'+name+'.glb',import.meta.url));
    const entry=inspectGlb(buf,name);
    report.push(entry);
    console.log(name, 'skins='+entry.skins,'joints='+entry.joints.join(','),'clips='+entry.animations.join(','));
  }
  await mkdir(new URL('../audit-output/',import.meta.url),{recursive:true});
  await writeFile(new URL('../audit-output/animation_inventory_p6.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  if(!report[0].animations.length)throw Error('player has no animation clips');
}
