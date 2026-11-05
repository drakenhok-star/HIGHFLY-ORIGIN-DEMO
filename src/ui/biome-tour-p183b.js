/**
 * Optional mobile-friendly QA teleporter. Only enabled by ?hf_biome_tour=1.
 * Never edits player progression, kill counters or quest flags.
 */
export function installBiomeTourP183b(game){
  if(typeof document==='undefined'||!new URLSearchParams(location.search).has('hf_biome_tour'))return;
  const camps=game.enemies?.p183bSites||[];
  const groups=[
    ['Pradera','prairie'],['Bosque','forest'],['Nieve','snow'],
    ['Costa','coast'],['Caminos','road'],['Ruinas','ruins']
  ];
  const root=document.createElement('div');
  root.id='hf-biome-tour';
  root.style.cssText='position:fixed;z-index:5000;top:7px;left:50%;transform:translateX(-50%);font:600 13px system-ui;color:#fff;text-align:center;pointer-events:auto;max-width:85vw';
  const trigger=document.createElement('button');
  trigger.textContent='🧭 BIOMAS · PROBAR';
  trigger.style.cssText='border:1px solid #be91ef;color:#fff;background:#38215dcc;border-radius:25px;padding:8px 14px;font-weight:800;box-shadow:0 3px 13px #11061c9a';
  const panel=document.createElement('div');
  panel.style.cssText='display:none;gap:6px;justify-content:center;flex-wrap:wrap;max-width:640px;padding:8px;margin-top:5px;border:1px solid #b090da;background:#141026eb;border-radius:12px';
  const status=document.createElement('div');
  status.style.cssText='width:100%;font-size:11px;color:#c9d7ec;margin:1px';
  status.textContent='Selector de prueba: elige un bioma para acercarte a sus criaturas.';
  panel.appendChild(status);
  for(const [label,biome] of groups){
    const target=camps.find(c=>c.spec.biome===biome);
    const btn=document.createElement('button');
    btn.textContent=label+(target?'':' (sin spawn)');
    btn.disabled=!target;
    btn.style.cssText='border:1px solid #8a68ba;border-radius:8px;padding:7px 11px;background:#3c2b59;color:white;font-weight:bold;opacity:'+(target?'1':'.45');
    btn.onclick=()=>{
      if(!target||!game.player||!game.terrain)return;
      const x=target.site.x+10,z=target.site.z+7;
      const y=game.terrain.getHeight(x,z);
      if(!Number.isFinite(y))return;
      game.player.vel.set(0,0,0);
      game.player.group.position.set(x,y,z);
      game.player.onGround=true;
      game.camera.position.set(x+7,y+7,z+12);
      game.camera.lookAt(x,y+1,z);
      status.textContent=label+' · '+target.spec.type+' · X '+Math.round(target.site.x)+' Z '+Math.round(target.site.z);
      game.hud?.notify?.('Bioma: '+label);
      panel.style.display='none';
    };
    panel.appendChild(btn);
  }
  trigger.onclick=()=>{panel.style.display=panel.style.display==='none'?'flex':'none';};
  root.append(trigger,panel);
  document.body.appendChild(root);
}
