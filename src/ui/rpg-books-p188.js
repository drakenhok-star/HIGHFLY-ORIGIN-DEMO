/**
 * HIGHFLY P188: the FULL SIZE native inventory overlay is the parent for
 * the skillbook and professions (no small floating windows or canvas clones).
 * All text is Spanish. No items, XP or skills granted through the display.
 */
import {HIGHFLY_SKILLS_P190,SKILL_ORIGINS_P190} from '../combat/skill-progression-p190.js';
import {AIM_SPECS_P189,NATIVE_AIM_PROFILES_P190} from '../combat/l27-aim-adapter-p189.js';
import {INICIOS_PROFESSIONS_P186,INICIOS_HUBS_P186,INICIOS_CHAPTERS_P186,
 INICIOS_TRAINERS_P186} from '../world/inicios-v2-p186.js';
const E=(tag,cls,text,parent)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 if(parent)parent.appendChild(el);return el;
};
const CSS=[
 '.hf-p188-book{display:flex;flex-direction:column;gap:7px;overflow-y:auto;',
 'min-height:0;min-width:0;max-height:100%;touch-action:pan-y}',
 '.hf-p188-card{width:100%;border:1px solid #655397;border-radius:10px;',
 'background:linear-gradient(110deg,#2c1951,#15132e);color:#fff5e8;',
 'padding:8px 10px;font:600 12px system-ui;text-align:left;touch-action:manipulation}',
 '.hf-p188-card.active{border-color:#efc28f;background:#533371}',
 '.hf-p188-card small{display:block;font:10px/1.5 system-ui;color:#baaed5}',
 '.hf-p188-book h3{color:#f4dfaa;margin:4px 0;font-size:15px}',
 '.hf-p188-book p{margin:4px 0;color:#dddbeb;font:12px/1.5 system-ui}',
 '.hf-p188-details{min-width:0;overflow-y:auto;touch-action:pan-y}',
 '.hf-p188-details button{width:100%;box-sizing:border-box;padding:9px 10px;',
 'margin:6px 0;min-height:39px;color:white;background:#634b98;',
 'border-radius:9px;border:1px solid #c9a7f1;font:700 11px system-ui}',
 '.hf-p188-details button:disabled{opacity:.48}',
 '.hf-p188-info{display:block;margin:8px 0;padding:8px;',
 'border-radius:8px;border:1px solid #5a588b;background:#211a3a;',
 'font:11px/1.6 system-ui;color:#ddd7f2}',
 '.hf-p188-group-title{font:800 11px system-ui;color:#9edcff;',
 'margin:8px 0 2px;letter-spacing:.3px}',
 '.hf-p191-equip-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:7px 0}',
 '.hf-p188-details .hf-p191-equip-grid .hf-p191-slot{margin:0;min-height:53px;padding:4px;',
 'display:flex;flex-direction:column;gap:3px;align-items:center;justify-content:center;',
 'border-radius:10px;background:#241b48;border:1px solid #8073b9}',
 '.hf-p191-slot.active{border-color:#ffd18c!important;background:#604071!important}',
 '.hf-p191-slot small{font:10px/1.2 system-ui;opacity:.86;max-width:100%;',
 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
 '.hf-p188-card.unknown{opacity:.67}',
 '.hf-p188-details .hf-p191-unequip{background:#49243a;border-color:#a45b6e}'
].join('');
function tag(parent,text){return E('div','hf-p188-info',text,parent);}
function initStyles(){
 if(document.getElementById('hf-p188-book-style'))return;
 const s=E('style',null,CSS,document.head);s.id='hf-p188-book-style';
}
const DESCRIPTIONS=Object.freeze({
 guin_violet_lance:'Disparás una lanza de energía violeta en línea recta. Puede golpear enemigos terrestres y voladores enfocados.',
 guin_ascension:'Te elevás y atacás en el aire; una segunda activación permite continuar el combo.',
 guin_tempest:'Creás un torbellino mágico alrededor del personaje que golpea varias veces y ralentiza.',
 dyr_fury_slashes:'Realizás tres cortes físicos sucesivos en cono, con mayor impacto al finalizar.',
 dyr_step:'Avanzás rápidamente en la dirección marcada y podés realizar un segundo corte durante la ventana de recast.',
 dyr_final_cut:'Ejecutás un corte físico de largo alcance frontal que golpea en un cono estrecho.',
 tig_iron_wave:'Lanzás tres ondas de impacto físico en un cono frontal.',
 tig_charge:'Embestís hacia adelante y golpeás a quienes estén cerca del final de la carga.',
 tig_collapse:'Atraés enemigos próximos y provocás una explosión física que puede aturdir.',
 woc_fireball:'Lanzás una bola de fuego a distancia que inflige daño y quemadura al impactar.',
 woc_meteor:'Elegís una zona del suelo y hacés caer un meteorito con explosión de área.',
 woc_frost_nova:'Liberás una explosión de escarcha alrededor tuyo que afecta a enemigos cercanos.',
 woc_backstab:'Asestás un golpe físico preciso a corta distancia.',
 woc_kidney_shot:'Realizás un golpe físico a corta distancia que puede aturdir.',
 woc_charge:'Cargás hacia adelante con una embestida física de corta duración.',
 native_fus:'Liberás una onda de fuerza que empuja y daña a los enemigos frente al personaje.',
 native_frost:'Soplás una ráfaga de hielo que daña y ralentiza a los enemigos en un cono.',
 native_wuld:'Avanzás rápidamente en la dirección que marcaste, esquivando el peligro.'
});
const AIM={line:'Línea direccional',cone:'Cono direccional',
 circle:'Círculo de área',zone:'Área de destino',dash:'Trayectoria de movimiento',
 self:'Área alrededor del personaje'};

const statusRank=(p,id)=>{
 const equip=p.state.equipped.indexOf(id);
 if(equip>=0)return 0;
 if(p.state.learned[id])return 1;
 if(p.state.discovered[id])return 2;
 return 3;
};
export function renderSkillbookP188(hud,ui){
 initStyles();
 const g=hud.game,p=g.p188Skills,list=hud.list,detail=hud.detail;
 // Preserve both independent scrolling columns across any list selection,
 // equip, unequip or learn; no more unexpected reset to the first card.
 const leftScroll=list.scrollTop;
 const innerScroll=list.querySelector('.hf-p188-book')?.scrollTop||0;
 const detailScroll=detail.scrollTop;
 const selected=ui.p188SelectedSkill&&HIGHFLY_SKILLS_P190.some(s=>s.id===ui.p188SelectedSkill)?
  ui.p188SelectedSkill:HIGHFLY_SKILLS_P190.find(s=>p.state.discovered[s.id])?.id||
  HIGHFLY_SKILLS_P190[0].id;
 ui.p188SelectedSkill=selected;
 list.replaceChildren();detail.replaceChildren();
 list.style.display='';list.style.flexDirection='column';
 const container=E('div','hf-p188-book',undefined,list);
 E('h3',null,'✦ LIBRO DE HABILIDADES · HIGHFLY',container);
 E('p',null,'Equipadas primero, luego aprendidas, descubiertas y desconocidas. Sin clases: seis ranuras libres.',container);
 tag(container,Object.keys(p.state.learned).length+'/'+HIGHFLY_SKILLS_P190.length+
  ' aprendidas · '+Object.keys(p.state.discovered).length+' descubiertas');
 const rerender=()=>{ui.render('skills');};
 const status=sk=>{
  const position=p.state.equipped.indexOf(sk.id);
  return position>=0?'S'+(position+1)+' · EQUIPADA':
   p.state.learned[sk.id]?'APRENDIDA':p.state.discovered[sk.id]?'DESCUBIERTA':'SIN DESCUBRIR';
 };
 for(const group of [
  {resource:'ENERGY',title:'⚔ FÍSICAS · ENERGÍA'},
  {resource:'MP',title:'✦ MÁGICAS · MANÁ'}
 ]){
  E('div','hf-p188-group-title',group.title,container);
  const sorted=HIGHFLY_SKILLS_P190.filter(s=>s.resource===group.resource)
   .sort((a,b)=>statusRank(p,a.id)-statusRank(p,b.id)||
     a.name.localeCompare(b.name,'es'));
  for(const sk of sorted){
   const seen=!!p.state.discovered[sk.id];
   const btn=E('button','hf-p188-card hf-p191-card'+
    (sk.id===selected?' active':'')+(seen?'':' unknown'),undefined,container);
   btn.type='button';
   E('strong',null,seen?sk.name:'??? · Por descubrir',btn);
   E('small',null,status(sk)+(seen?' · '+
     (sk.resource==='MP'?'Maná ':'Energía ')+sk.cost+' · '+sk.cd+'s':''),btn);
   btn.addEventListener('click',()=>{
    ui.p188SelectedSkill=sk.id;
    rerender();
   });
  }
 }
 const sk=HIGHFLY_SKILLS_P190.find(x=>x.id===selected);
 const origin=SKILL_ORIGINS_P190.find(x=>x.id===selected);
 const seen=!!p.state.discovered[sk.id],learned=!!p.state.learned[sk.id];
 const equipped=p.state.equipped.indexOf(sk.id)+1;
 const box=E('div','hf-p188-details hf-p191-details',undefined,detail);
 E('h3',null,seen?sk.name:'HABILIDAD POR DESCUBRIR',box);
 tag(box,(sk.resource==='MP'?'✦ MÁGICA · MANÁ':'⚔ FÍSICA · ENERGÍA')+
  ' · '+(AIM[(sk.nativeId?NATIVE_AIM_PROFILES_P190[sk.id]:
   AIM_SPECS_P189[sk.kit+'/'+sk.slot])?.kind]||'Direccional'));
 if(seen){
  E('p',null,DESCRIPTIONS[sk.id]||'Habilidad de combate.',box);
  tag(box,'Coste '+sk.cost+' '+(sk.resource==='MP'?'maná':'energía')+
   ' · Recarga '+sk.cd+' segundos');
 }
 tag(box,'Cómo conseguirla: '+origin.source+
  (origin.implemented?'':' (misión pendiente)'));
 if(!seen){
  E('p',null,'Todavía no la descubriste. Completá su misión o encontrá su origen en el mundo.',box);
 }else if(!learned){
  if(sk.nativeId){
   E('p',null,'Esta habilidad se aprende en su piedra de conocimiento del mundo.',box);
  }else{
   const btn=E('button',null,'✦ APRENDER',box);
   btn.type='button';btn.addEventListener('click',()=>{
    if(p.learn(sk.id)){g.p186Skills?.drawSkillButtons();rerender();}
   });
  }
 }else{
  E('div','hf-p188-group-title',equipped?'EQUIPADA EN S'+equipped:
   'ELEGÍ UNA RANURA',box);
  const grid=E('div','hf-p191-equip-grid',undefined,box);
  for(let slot=1;slot<=6;slot++){
   const existing=p.selected(slot);
   const active=equipped===slot;
   const button=E('button','hf-p191-slot'+(active?' active':''),undefined,grid);
   button.type='button';
   E('strong',null,'S'+slot,button);
   E('small',null,active?'✓ ACTUAL':existing?
     '↔ '+existing.name:'LIBRE',button);
   button.disabled=active;
   button.title=existing&&!active?'Reemplazar '+existing.name:'Equipar en S'+slot;
   button.addEventListener('click',()=>{
    if(p.equip(sk.id,slot)){g.p186Skills?.drawSkillButtons();rerender();}
   });
  }
  if(equipped){
   const remove=E('button','hf-p191-unequip','✕ DESEQUIPAR S'+equipped,box);
   remove.type='button';remove.addEventListener('click',()=>{
    if(p.equip(null,equipped)){g.p186Skills?.drawSkillButtons();rerender();}
   });
  }
 }
 E('p',null,'Mantené S1–S6 para apuntar. Arrastrá para orientar, soltá para lanzar. La ✕ roja cancela sin gasto.',box);
 list.scrollTop=leftScroll;container.scrollTop=innerScroll;
 detail.scrollTop=detailScroll;
}
export function renderProfessionbookP188(hud,ui){
 initStyles();
 const g=hud.game,list=hud.list,detail=hud.detail;
 list.replaceChildren();detail.replaceChildren();
 list.style.display='';list.style.flexDirection='column';
 const box=E('div','hf-p188-book',undefined,list);
 E('h3',null,'⚒ PUEBLO DE LOS INICIOS · OFICIOS',box);
 E('p',null,'Las 15 profesiones empiezan acá. Los maestros planificados todavía no son NPC jugables.',box);
 const current=ui.p188SelectedProfession||INICIOS_PROFESSIONS_P186[0].id;
 for(const prof of INICIOS_PROFESSIONS_P186){
  const trainer=INICIOS_TRAINERS_P186.find(x=>x.id===prof.trainerId);
  const known=!!g.p187Professions?.state?.learned?.[prof.id];
  const b=E('button','hf-p188-card'+(current===prof.id?' active':''),undefined,box);
  b.type='button';E('strong',null,prof.name,b);
  E('small',null,(known?'APRENDIDO':trainer?.existing?'MAESTRO DISPONIBLE':'MAESTRO FUTURO')+
   ' · nivel '+prof.introLevel,b);
  b.addEventListener('click',()=>{ui.p188SelectedProfession=prof.id;ui.render('professions');});
 }
 const prof=INICIOS_PROFESSIONS_P186.find(x=>x.id===current)||INICIOS_PROFESSIONS_P186[0];
 const hub=INICIOS_HUBS_P186.find(x=>x.id===prof.hubId);
 E('h3',null,prof.name,detail);
 tag(detail,'Localidad: '+hub?.name+' · desde nivel '+prof.introLevel);
 tag(detail,'Primera lección: '+prof.starterLesson.replaceAll('_',' '));
 const trainer=INICIOS_TRAINERS_P186.find(x=>x.id===prof.trainerId);
 tag(detail,'Maestro: '+trainer?.role+' · '+(trainer?.existing?'NPC existente':'pendiente de integrar'));
 E('h3',null,'PROGRESIÓN 1–20',detail);
 for(const chapter of INICIOS_CHAPTERS_P186)
  E('p',null,chapter.levels.join('–')+' · '+chapter.title,detail);
 E('p',null,'Esta sección describe el progreso actual. No otorga materiales ni profesiones al tocarla.',detail);
}
