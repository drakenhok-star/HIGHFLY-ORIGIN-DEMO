/**
 * P18.3c QA species tour: individual model status, route guidance and safe
 * teleport near the ACTUAL living actor, never to a false region center.
 */
import { P183B_CAMPS } from '../world/biome-families-p183b.js';
import { ecologyCampsP183c,ECO_NAMES_P183C,liveEcologyP183c } from './ecology-radar-p183c.js';
const labels={prairie:'Pradera',forest:'Bosque',snow:'Nieve',coast:'Costa',road:'Camino',ruins:'Territorio orco'};
function locationOf(game,spec){
 const camps=ecologyCampsP183c(game);
 if(spec.id==='forest_spiders')return camps.find(c=>c.type==='forest_spider')||null;
 return camps.find(c=>c.id===spec.id)||null;
}
function safeTeleport(game,site){
 if(!site||game.state!=='playing')return false;
 const tx=site.actor?.group?.position.x??site.x,tz=site.actor?.group?.position.z??site.z;
 const terrain=game.terrain;
 for(let radius of [13,16,20])for(let j=0;j<16;j++){
  const a=j*Math.PI/8,x=tx+Math.cos(a)*radius,z=tz+Math.sin(a)*radius,y=terrain.getHeight(x,z);
  if(!(Number.isFinite(y)&&y>terrain.waterY+1&&terrain.getSlope(x,z)<.75))continue;
  game.player.vel?.set(0,0,0);
  game.player.group.position.set(x,y+0.07,z);
  game.player.onGround=false;
  game.camera.position.set(x+4,y+5,z+8);
  game.camera.lookAt(tx,terrain.getHeight(tx,tz)+1.2,tz);
  game.hud?.notify?.('Encuentro: '+site.name+' · '+Math.round(radius)+' m');
  return true;
 }
 game.hud?.notify?.('No se encontró una llegada segura para '+site.name);
 return false;
}
export function installBiomeTourP183c(game){
 if(typeof document==='undefined'||!new URLSearchParams(location.search).has('hf_biome_tour'))return;
 const root=document.createElement('div');
 root.id='hf-biome-tour';
 root.style.cssText='position:fixed;z-index:5000;top:6px;left:50%;transform:translateX(-50%);font:600 12px system-ui;color:#fff;text-align:center;pointer-events:auto;max-width:90vw';
 const trigger=document.createElement('button');
 trigger.textContent='🧭 CRIATURAS · PROBAR';
 trigger.style.cssText='border:1px solid #be91ef;color:#fff;background:#38215de8;border-radius:20px;padding:8px 12px;font-weight:800';
 const panel=document.createElement('div');
 panel.style.cssText='display:none;flex-direction:column;gap:6px;max-height:67vh;overflow:auto;width:min(460px,88vw);padding:9px;margin-top:5px;border:1px solid #ad90d9;background:#151126f2;border-radius:11px';
 const desc=document.createElement('div');
 desc.textContent='Estado real de aparición. IR te acerca al modelo vivo; SEGUIR fija una marca violeta en el radar.';
 desc.style.cssText='font:11px system-ui;color:#cbd7f4;text-align:left';
 panel.append(desc);
 const entries=[...P183B_CAMPS,{id:'forest_spiders',type:'forest_spider',biome:'forest'}];
 // Crab sites are discovered on the actual shoreline at runtime.
 for(const c of game.enemies?.p183bSites||[])if(c.spec.type==='crab')entries.push(c.spec);
 function refresh(){
  for(const el of Array.from(panel.querySelectorAll('[data-ec-row]')))el.remove();
  const current=liveEcologyP183c(game);
  for(const spec of entries){
   const row=document.createElement('div');
   row.dataset.ecRow='1';
   row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:5px;background:#30233de8;padding:5px 6px;border-radius:8px';
   const site=locationOf(game,spec);
   const active=spec.type==='forest_spider'?current.filter(e=>e.type==='spider').length:
    current.filter(e=>e.p183bSpec?.id===spec.id).length;
   const audit=game.enemies?.p183cSpawnAudit?.find(x=>x.id===spec.id);
   const text=document.createElement('span');
   text.style.cssText='flex:1;text-align:left;line-height:1.25;font:11px system-ui';
   const title=ECO_NAMES_P183C[spec.type]||spec.type;
   text.textContent=(labels[spec.biome]||spec.biome)+' · '+title+' · '+active+' vivo(s)'+
     (!site?' · '+(audit?.status||'SIN SPAWN'):'');
   row.append(text);
   for(const [word,action] of [['SEGUIR','track'],['IR','teleport']]){
    const btn=document.createElement('button');
    btn.textContent=word;btn.disabled=!site;
    btn.style.cssText='color:#fff;border:1px solid #ae8bda;border-radius:7px;background:#514073;padding:6px;opacity:'+(!site?'.35':'1');
    btn.onclick=()=>{
     if(!site)return;
     game.p183cTracking={id:site.id,x:site.x,z:site.z,name:site.name};
     if(action==='teleport')safeTeleport(game,site);
     panel.style.display='none';
     game.worldMapP34?.drawMini?.();
    };
    row.append(btn);
   }
   panel.append(row);
  }
 }
 const copy=document.createElement('button');
 copy.textContent='📋 COPIAR DIAGNÓSTICO DE APARICIONES';
 copy.style.cssText='border:1px solid #8ddacf;border-radius:8px;padding:8px;background:#21444d;color:white;font:700 12px system-ui';
 copy.onclick=()=>{
  const report=game.enemies?.ecologyReportP183c?.()||{};
  const msg=JSON.stringify(report,null,2);
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(msg).then(()=>game.hud?.notify?.('Diagnóstico copiado')).catch(()=>game.hud?.notify?.('No se pudo copiar'));
  else game.hud?.notify?.('Copiado no compatible con este navegador');
 };
 panel.append(copy);
 trigger.onclick=()=>{const show=panel.style.display==='none';panel.style.display=show?'flex':'none';if(show)refresh();};
 root.append(trigger,panel);
 document.body.append(root);
}
