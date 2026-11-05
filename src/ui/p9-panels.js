/** HIGHFLY P9 premium panels backed by REAL quests, stats, and items. */
const CSS="\nbody.hf-p810 .hf-p9-equipment-info{display:flex;flex-direction:column;gap:6px;margin-top:8px;border-top:1px solid #9f5db6;padding-top:8px}\nbody.hf-p810 .hf-p9-eqline{display:flex;justify-content:space-between;gap:12px;border:1px solid #75469b;\n background:#1c113b;border-radius:7px;padding:5px 8px;font:10px system-ui}\nbody.hf-p810 .hf-p9-eqline strong{color:#ffdf91}\nbody.hf-p810 .hf-p9-quest-layout{display:grid;grid-template-columns:minmax(105px,26%) minmax(0,1fr);\n gap:9px;min-height:0;overflow:hidden;flex:1}\nbody.hf-p810 .hf-p9-quest-sidebar{display:flex;flex-direction:column;gap:6px;min-width:0}\nbody.hf-p810 .hf-p9-quest-sidebar button{min-height:36px;background:#30144d;color:#f4d9fa;\n border:1px solid #a76ad3;border-radius:8px;padding:5px 7px;text-align:left;font:700 10px system-ui}\nbody.hf-p810 .hf-p9-quest-sidebar button.active{background:#855027;border-color:#ffca78;color:#ffdfac}\nbody.hf-p810 .hf-p9-quest-content{overflow:auto;display:flex;flex-direction:column;gap:7px;min-width:0}\nbody.hf-p810 .hf-p9-quest-title{color:#ffe4a7;font:700 19px Georgia,serif;border-bottom:1px solid #9652c2;margin-bottom:5px;padding:5px 1px}\nbody.hf-p810 .hf-p9-mission-row{touch-action:manipulation}\nbody.hf-p810 .hf-p9-quest-search{background:#21123c;color:#fff;border:1px solid #965dc9;border-radius:8px;\n padding:8px;min-width:0;font-size:11px}\nbody.hf-p810 .hf-p9-reward{display:flex;gap:10px;flex-wrap:wrap}\nbody.hf-p810 .hf-p9-reward span{border:1px solid #ad6bd2;border-radius:9px;background:#241442;color:#ffdfaf;\n padding:8px 12px;font:bold 11px system-ui}\nbody.hf-p810 .hf-p9-mission-action{width:100%;background:linear-gradient(90deg,#91592c,#6c2b88)!important;\n border:1px solid #ffd58a!important;min-height:39px;color:#fff0cc!important}\nbody.hf-p810 .hf-p9-meta{display:flex;flex-wrap:wrap;gap:6px;padding:6px;border-top:1px solid #9654b6}\nbody.hf-p810 .hf-p9-meta span{border:1px solid #8555b0;color:#e2c7f1;background:#1e1240;\n border-radius:7px;padding:6px;font:10px system-ui}\nbody.hf-p810 .hf-p9-suggest{font:10px system-ui;color:#cdb6d9}\n";

import { PremiumInventoryP7 } from './inventory-p7.js';
import { ITEM_DB } from '../systems/inventory.js';
const el=(tag,cls,text,parent)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;
 if(parent)parent.appendChild(e);return e;
};
const REWARDS={
 q1:{gold:100,xp:80,giver:'Olaf · aldea',kind:'principal'},
 q2:{gold:150,xp:100,giver:'Sigrid · herrería',kind:'secundaria'},
 q3:{gold:500,xp:400,giver:'Olaf · aldea',kind:'principal'}
};
const COLORS={weapon:'#ffcc6f',armor:'#a8adff',potion:'#ec72a8',misc:'#b77afb'};
const ICONS={
 weapon:'<path d="M29 4l7 7-17 18-4-4L29 4z" fill="#b9dffc" stroke="#fff5cc" stroke-width="1.5"/><path d="M12 24l12 12M9 27l6-6" stroke="#fbd67e" stroke-width="4" stroke-linecap="round"/><path d="M14 32l-6 7" stroke="#ba83e8" stroke-width="4" stroke-linecap="round"/>',
 armor:'<path d="M22 3L40 9v17c-3 9-9 15-18 19C13 41 7 35 4 26V9L22 3z" fill="#6579bf" stroke="#e8d3ff" stroke-width="2"/><path d="M22 9v30M10 16h24" stroke="#bffaff" stroke-width="2"/><path d="M17 24l5-5 5 5-5 8z" fill="#ffdf8a"/>',
 potion:'<path d="M16 5h12v7l-3 4c9 6 14 14 10 22-3 6-20 8-26 0-5-7 2-17 10-22l-3-4V5z" fill="#b83c77" stroke="#f5c9ff" stroke-width="2"/><path d="M13 28q9-6 19 0" stroke="#ffe4fb" stroke-width="2"/><path d="M15 4h14" stroke="#ffdb82" stroke-width="4" stroke-linecap="round"/>',
 misc:'<path d="M22 3L40 19 31 40 15 44 3 23 13 7z" fill="#8044d9" stroke="#d9a4ff" stroke-width="2"/><path d="M13 7l9 12-7 25 16-4-9-21 18 0" fill="none" stroke="#aef3ff" stroke-width="2"/>'
};
function paintIcons(root){
 for(const block of root.querySelectorAll?.('.p7-cell:not(.empty)')||[]){
  const sym=block.querySelector('.p7-symbol');if(!sym)continue;
  const text=sym.textContent;
  const type=text==='⚔'?'weapon':text==='🛡'?'armor':text==='◉'?'potion':'misc';
  const tint=COLORS[type],graphics=ICONS[type];
  const wrap=document.createElementNS('http://www.w3.org/2000/svg','svg');
  wrap.setAttribute('viewBox','0 0 46 48');wrap.setAttribute('width','38');
  wrap.setAttribute('height','38');wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML='<circle cx="22" cy="24" r="20" fill="'+tint+'" fill-opacity=".13"/>'+graphics;
  sym.replaceChildren(wrap);
 }
}
export class HighflyPanelsP9 {
 constructor(hud,ui){
  this.hud=hud;this.ui=ui;this.game=hud.game;
  this.inv=new PremiumInventoryP7(hud);
  hud.p7Inventory=this.inv;
  this.questGroup='all';this.questSearch='';this.selectedQuest='q1';
  this.settingsSection='camera';
  const style=el('style',null,CSS,document.head);style.id='hf-p9-panels-style';
  this.loadPreferences();
 }
 loadPreferences(){
  try{
   const cam=Number(localStorage.getItem('hf_p9_cam_dist'));
   if(Number.isFinite(cam)&&cam>=2.5&&cam<=12)this.game.player.camDist=cam;
   const smooth=Number(localStorage.getItem('hf_p9_cam_smooth'));
   if(Number.isFinite(smooth)&&smooth>=4&&smooth<=20)this.game.player.cameraSmoothing=smooth;
  }catch(err){}
 }
 updateTabs(){
  if(this.hud.tabButtons.all)this.hud.tabButtons.all.textContent='✦ INVENTARIO';
  if(this.hud.tabButtons.equipment)this.hud.tabButtons.equipment.style.display='none';
  if(this.hud.tabButtons.bag)this.hud.tabButtons.bag.textContent='◈ MOCHILA';
  if(this.hud.tabButtons.quests)this.hud.tabButtons.quests.textContent='✧ MISIONES';
  if(this.hud.tabButtons.settings)this.hud.tabButtons.settings.textContent='⚙ AJUSTES';
 }
 render(tab){
  this.hud.list.style.display='';this.hud.list.style.flexDirection='';this.hud.list.style.gap='';
  for(const [key,button] of Object.entries(this.hud.tabButtons)){
   button.classList.toggle('active',key===(tab==='equipment'?'all':tab));
  }
  if(tab==='equipment'||tab==='all'){
   this.inv.render('equipment');this.enhanceEquipment();return;
  }
  if(tab==='bag'){
   this.inv.render('all');this.enhanceBag();return;
  }
  if(tab==='quests'){this.renderQuests();return;}
  if(tab==='settings'){this.renderSettings();return;}
 }
 enhanceEquipment(){
  const list=this.hud.list,detail=this.hud.detail,g=this.game,st=g.stats,inv=g.inventory;
  const footer=list.querySelector('.p7-footer');
  if(footer){
   const note=el('small',null,'* Equipamiento y estadísticas reales de la partida. Los slots vacíos se habilitan cuando existan ítems compatibles.',list);
   note.style.cssText='font:9px system-ui;color:#c8add9;padding:4px';
  }
  for(const button of detail.querySelectorAll('button')){
   if(button.textContent?.includes('ANTORCHA'))button.remove();
  }
  const info=el('div','hf-p9-equipment-info',undefined,detail);
  const line=(title,value)=>{
   const row=el('div','hf-p9-eqline',undefined,info);
   el('span',null,title,row);el('strong',null,String(value),row);
  };
  if(g.p812Enabled){
   line('Nivel del cazador',st.level);
   line('Daño equipado',inv.weaponDamage()+inv.offhandDamage());
   line('Defensa',inv.armorValue());
   const btn=el('button',null,'✦ VER ESTADÍSTICAS DETALLADAS',info);
   btn.addEventListener('click',()=>{this.settingsSection='stats';this.hud.show('settings');});
   return;
  }
  line('Nivel',st.level);
  line('Experiencia',Math.floor(st.xp)+' / '+st.xpNext());
  line('Vida',Math.ceil(st.hp)+' / '+st.maxHp);
  line('Maná',Math.ceil(st.mp)+' / '+st.maxMp);
  line('Energía',Math.ceil(st.sp)+' / '+st.maxSp);
  line('Daño del equipo',inv.weaponDamage()+inv.offhandDamage());
  line('Armadura',inv.armorValue());
  const skillCount=g.combat.learnedShouts.length;
  if(!g.p812Enabled)line('Habilidades aprendidas',skillCount);
  if(g.p812Enabled){
   const btn=el('button',null,'✦ VER ESTADÍSTICAS DETALLADAS',info);
   btn.addEventListener('click',()=>{this.settingsSection='stats';this.hud.show('settings');});
  }
 }
 enhanceBag(){
  const inv=this.game.inventory,list=this.hud.list;
  const used=Array.from(inv.slots.values()).reduce((a,v)=>a+(v>0?1:0),0);
  const facts=list.querySelector('.p7-facts');
  if(facts)el('span',null,'▦ '+used+' tipos ocupados',facts);
  // This is a viewport, not a fake enforced capacity system.
  const head=list.querySelector('.p7-head');
  if(head)head.title='La grilla es visual. El juego todavía no limita la capacidad de mochila.';
  paintIcons(list);
  // New cards can be drawn by the P7 inline search/sort handler later;
  // render icon replacement again after input without patching its logic.
  const grid=list.querySelector('.p7-grid');
  if(grid){
   const observer=new MutationObserver(()=>{observer.disconnect();paintIcons(grid);observer.observe(grid,{childList:true});});
   observer.observe(grid,{childList:true});
  }
  for(const button of this.hud.detail.querySelectorAll('button')){
   if(button.textContent?.includes('ANTORCHA'))button.remove();
  }
 }
 renderQuests(){
  const list=this.hud.list,detail=this.hud.detail;
  list.replaceChildren();detail.replaceChildren();
  const quests=this.game.quests.list();
  const layout=el('div','hf-p9-quest-layout',undefined,list);
  const nav=el('div','hf-p9-quest-sidebar',undefined,layout);
  const center=el('div','hf-p9-quest-content',undefined,layout);
  el('div','hf-p9-quest-title','✧ MISIONES',center);
  const search=el('input','hf-p9-quest-search',undefined,center);
  search.type='search';search.placeholder='Buscar misión...';search.value=this.questSearch;
  search.addEventListener('input',()=>{
   const selection=search.selectionStart;
   this.questSearch=search.value;this.renderQuests();
   const input=this.hud.list.querySelector('.hf-p9-quest-search');
   input?.focus();if(input?.setSelectionRange)input.setSelectionRange(selection,selection);
  });
  const categories=[['all','Todas'],['principal','Principales'],['secundaria','Secundarias'],
    ['active','En curso'],['complete','Para entregar'],['done','Completadas']];
  for(const [key,name] of categories){
   const qlist=quests.filter(q=>key==='all'||(key==='principal'||key==='secundaria'?REWARDS[q.id]?.kind===key:q.state===key));
   const b=el('button',this.questGroup===key?'active':'',name+' ('+qlist.length+')',nav);b.type='button';
   b.addEventListener('click',()=>{this.questGroup=key;this.renderQuests();});
  }
  const visible=quests.filter(q=>
   (this.questGroup==='all'||(this.questGroup==='principal'||this.questGroup==='secundaria'?
     REWARDS[q.id]?.kind===this.questGroup:q.state===this.questGroup))&&
   q.name.toLowerCase().includes(this.questSearch.toLowerCase()));
  if(!visible.some(q=>q.id===this.selectedQuest)&&visible.length)this.selectedQuest=visible[0].id;
  for(const q of visible){
   const b=el('button','hf-p9-mission-row'+(q.id===this.selectedQuest?' selected':''),undefined,center);
   b.type='button';
   el('strong',null,q.name,b);
   el('small',null,q.desc,b);
   const status={available:'Disponible',active:'En curso',complete:'Lista para entregar',done:'Completada',locked:'Bloqueada'}[q.state]||q.state;
   el('small',null,status+' · '+Math.min(q.need,q.progress)+' / '+q.need,b);
   const meter=el('div','hf-p9-progress',undefined,b);
   const fill=el('span',null,undefined,meter);fill.style.width=(100*Math.min(1,q.progress/Math.max(1,q.need)))+'%';
   b.addEventListener('click',()=>{
    this.selectedQuest=q.id;this.renderQuests();
    if(this.game.worldMapP34?.trackQuest(q.id))this.game.hud.notify('✦ Misión marcada en el radar: '+q.name);
   });
  }
  if(!visible.length)el('p','hf-p9-muted','No hay misiones en este filtro.',center);
  const q=quests.find(x=>x.id===this.selectedQuest) || visible[0];
  if(!q){el('p',null,'Seleccioná una misión.',detail);return;}
  const info=REWARDS[q.id];
  el('h3',null,'✦ '+q.name,detail);
  el('p',null,q.desc,detail);
  el('strong',null,'Objetivo',detail);
  el('p',null,'Progreso real: '+q.progress+' / '+q.need,detail);
  const meter=el('div','hf-p9-progress',undefined,detail);
  el('span',null,undefined,meter).style.width=(Math.min(1,q.progress/Math.max(1,q.need))*100)+'%';
  el('h3',null,'RECOMPENSAS',detail);
  const reward=el('div','hf-p9-reward',undefined,detail);
  el('span',null,'◈ '+info.gold+' oro',reward);el('span',null,'✦ '+info.xp+' XP',reward);
  el('p',null,'NPC: '+info.giver,detail);
  if(q.state==='complete'){
   el('p','hf-p9-muted','Objetivo completado. Entregá hablando con el NPC correspondiente.',detail);
  }else if(q.state==='locked')el('p','hf-p9-muted','Necesitás completar las misiones anteriores.',detail);
  else if(q.state==='done')el('p','hf-p9-muted','Recompensa recibida.',detail);
  else el('p','hf-p9-muted','Seguimiento del objetivo disponible en el mapa.',detail);
  const b=el('button','hf-p9-mission-action','◎ VER EN EL MAPA',detail);b.type='button';
  b.addEventListener('click',()=>{
   this.game.worldMapP34?.trackQuest(q.id);
   this.hud.hide();this.game.worldMapP34?.toggle(true);
  });
  el('p','hf-p9-suggest','No se conceden recompensas desde este panel: se respeta la entrega con NPC.',detail);
 }
 renderSettings(){
  const list=this.hud.list,detail=this.hud.detail;
  list.replaceChildren();detail.replaceChildren();
  const nav=el('div','hf-p9-settings-menu',undefined,list);
  const content=el('div','hf-p9-settings-rows',undefined,list);
  list.style.display='flex';list.style.flexDirection='row';list.style.gap='12px';
  const items=[['camera','◎ Cámara'],['graphics','◈ Gráficos'],['stats','✦ Estadísticas'],['hud','✥ Interfaz / HUD'],
    ['controls','✦ Controles'],['audio','♫ Audio']];
  for(const [id,name] of items){
   const b=el('button',this.settingsSection===id?'active':'',name,nav);
   b.addEventListener('click',()=>{this.settingsSection=id;this.renderSettings();});
  }
  const g=this.game,st=this.settingsSection;
  const title=({camera:'CÁMARA',graphics:'RENDIMIENTO',hud:'PERSONALIZAR INTERFAZ',
   controls:'CONTROLES DE JUEGO',audio:'AUDIO',stats:'ESTADÍSTICAS REALES'})[st];
  el('h3',null,title,content);
  const slider=(name,min,max,step,value,cb)=>{
   const row=el('label',null,undefined,content),text=el('span',null,name,row);
   const range=el('input',null,undefined,row);range.type='range';
   range.min=String(min);range.max=String(max);range.step=String(step);range.value=String(value);
   const valueLabel=el('strong',null,String(value),row);
   range.addEventListener('input',()=>{valueLabel.textContent=String(range.value);cb(Number(range.value));});
   return range;
  };
  const click=(label,callback)=>{
   const b=el('button',null,label,content);b.type='button';
   b.addEventListener('click',()=>{callback();});return b;
  };
  if(st==='stats'){
   const s=g.stats,inv=g.inventory;
   const lines=[['Nivel',s.level],['EXP',s.xp+'/'+s.xpNext()],
    ['Vida',Math.ceil(s.hp)+'/'+s.maxHp],['Maná',Math.ceil(s.mp)+'/'+s.maxMp],
    ['Energía',Math.ceil(s.sp)+'/'+s.maxSp],['Ataque equipado',inv.weaponDamage()+inv.offhandDamage()],
    ['Defensa equipada',inv.armorValue()],['Habilidades aprendidas',g.combat.learnedShouts.length]];
   for(const [k,v] of lines){const row=el('label',null,undefined,content);
    el('span',null,k,row);el('strong',null,String(v),row);}
  }else if(st==='camera'&&window.highflyCameraLab){
   // L22 LAB ONLY: camera controls live in the native AJUSTES menu, not HUD.
   const lab=window.highflyCameraLab,c=lab.config;
   const presets=el('div','hf-p9-meta',undefined,content);
   for(const [id,name] of [['adventure','AVENTURA'],['hybrid','HÍBRIDA'],['moba','MOBA']]){
     const b=el('button',null,(c.preset===id?'● ':'○ ')+name,presets);
     b.addEventListener('click',()=>{lab.selectProfile(id);this.renderSettings();});
   }
   const fields=[
     ['Distancia','distance',4.5,13,.1],
     ['Inclinación','pitch',-60,4,1],
     ['Altura de enfoque','height',.9,3.4,.1],
     ['Campo de visión','fov',55,85,1],
     ['Sensibilidad de skill','aim',.08,.25,.005],
     ['Zona muerta','deadZone',0,12,1],
     ['Giro de cámara','turn',.8,2.4,.1],
     ['Suavizado','smoothing',6,24,1]
   ];
   for(const [name,key,min,max,step] of fields)
     slider(name,min,max,step,c[key],v=>lab.setValue(key,v));
   click('RESTABLECER CÁMARA HÍBRIDA',()=>{
     lab.reset();this.renderSettings();
   });
  }else if(st==='camera'){
   slider('Sensibilidad táctil',.8,2.4,.1,this.hud.touch.cameraSensitivity,v=>this.hud.touch.setCameraSensitivity(v));
   slider('Distancia',2.5,12,.5,g.player.camDist,v=>{
    g.player.camDist=v;try{localStorage.setItem('hf_p9_cam_dist',String(v));}catch(err){}
   });
   slider('Suavizado',4,20,1,g.player.cameraSmoothing||12,v=>{
    g.player.cameraSmoothing=v;try{localStorage.setItem('hf_p9_cam_smooth',String(v));}catch(err){}
   });
   click('RESTABLECER CÁMARA',()=>{
    this.hud.touch.setCameraSensitivity(1.5);g.player.camDist=6;g.player.cameraSmoothing=12;this.renderSettings();
   });
  }else if(st==='graphics'){
   el('p','hf-p9-muted','El modo FLUIDO reduce el costo de render. No altera las misiones ni el combate.',content);
   if(g.p812Enabled){
    click(g.p812Eco?'✔ AHORRO TÉRMICO ACTIVO · 30 FPS':'○ ACTIVAR AHORRO TÉRMICO · 30 FPS',()=>{
     g.p812Eco=!g.p812Eco;
     try{localStorage.setItem('hf_p812_eco',g.p812Eco?'1':'0');}catch(err){}
     g.performanceP2.apply('FLUID');this.renderSettings();
    });
    el('p','hf-p9-muted','Ahorro térmico: limita la tasa de cuadros y baja resolución interna. No mide temperatura ni garantiza que el equipo no se caliente.',content);
   }
   const wrap=el('div','hf-p9-meta',undefined,content);
   for(const [id,label] of [['FLUID','FLUIDO'],['BALANCED','EQUILIBRADO+'],['WATER','AGUA'],['HIGH','ALTA']]){
    const button=el('button',null,(g.performanceP2?.preset===id?'● ':'○ ')+label,wrap);
    button.addEventListener('click',()=>{g.performanceP2.apply(id);this.renderSettings();});
   }
   el('p','hf-p9-muted','FPS y perfil de GPU aparecen bajo el radar. El porcentaje de utilización GPU no está disponible de forma fiable en WebGL.',content);
  }else if(st==='hud'){
   el('p','hf-p9-muted','Arrastrá controles en el mundo y guardá sus posiciones. Cada botón tiene tamaño y opacidad propios.',content);
   click('✥ ABRIR EDITOR HUD',()=>{this.hud.hide();this.ui.editor.start();});
   click('RESTAURAR INTERFAZ',()=>{
    this.ui.editor.layout=this.ui.editor.load();
    this.ui.editor.apply();
    this.hud.game.hud.notify('Interfaz recuperada del perfil guardado');
   });
  }else if(st==='audio'){
   const v=Number(localStorage.getItem('hf_p9_audio_volume')||'.32');
   slider('Volumen general',0,.5,.02,Math.max(0,Math.min(.5,v)),value=>{
    g.audio._requestedVolume=value;
    if(g.audio.master?.gain)g.audio.master.gain.value=value;
    try{localStorage.setItem('hf_p9_audio_volume',String(value));}catch(err){}
   });
   el('p','hf-p9-muted','Controla el audio generado por HIGHFLY. Para música externa todavía no hay pistas conectadas.',content);
  }else{
   el('p',null,'Joystick izquierdo: movimiento analógico 360°',content);
   el('p',null,'Deslizar derecha: cámara libre',content);
   el('p',null,'ATK: combo de cuatro golpes · salto y dash: movilidad aérea',content);
   el('p',null,'FIJAR / SIG. / ✕: objetivo manual',content);
   el('p',null,'PC: W/A/S/D · Shift correr · Espacio saltar · T antorcha · Tab equipo · J misiones',content);
  }
  el('h3',null,'ESTADO REAL',detail);
  el('p',null,'Modo de render: '+(g.performanceP2?.preset||'FLUID'),detail);
  el('p',null,'Nivel actual: '+g.stats.level,detail);
  el('p',null,'Controles: '+(g.touch?.enabled?'táctiles':'teclado y mouse'),detail);
  el('p',null,'Perfil de editor: este dispositivo/navegador',detail);
  el('p','hf-p9-muted','Los controles funcionan sobre sistemas existentes. Funciones futuras no aparecen como ajustes falsos.',detail);
 }
}
