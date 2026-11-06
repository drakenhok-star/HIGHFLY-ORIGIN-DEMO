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
 'margin:8px 0 2px;letter-spacing:.3px}'
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

export function renderSkillbookP188(hud,ui){
 initStyles();
 const g=hud.game,p=g.p188Skills;
 const list=hud.list,detail=hud.detail;
 list.replaceChildren();detail.replaceChildren();
 list.style.display='';list.style.flexDirection='column';
 const container=E('div','hf-p188-book',undefined,list);
 E('h3',null,'✦ LIBRO DE HABILIDADES · HIGHFLY',container);
 E('p',null,'Todas las habilidades son iguales: descubrí, aprendé y equipá cualquiera en S1–S6. Las runas se consiguen explorando el mundo.',container);
 const count=Object.keys(p.state.learned).length;
 tag(container,count+'/'+HIGHFLY_SKILLS_P190.length+' aprendidas · '+Object.keys(p.state.discovered).length+'/'+HIGHFLY_SKILLS_P190.length+' descubiertas');
 const selected=ui.p188SelectedSkill&&HIGHFLY_SKILLS_P190.some(s=>s.id===ui.p188SelectedSkill)?
  ui.p188SelectedSkill:HIGHFLY_SKILLS_P190[0].id;
 ui.p188SelectedSkill=selected;
 for(const group of [
  {resource:'ENERGY',title:'⚔ HABILIDADES FÍSICAS · ENERGÍA'},
  {resource:'MP',title:'✦ HABILIDADES MÁGICAS · MANÁ'}
 ]){
  E('div','hf-p188-group-title',group.title,container);
  for(const sk of HIGHFLY_SKILLS_P190.filter(s=>s.resource===group.resource)){
   const learned=!!p.state.learned[sk.id],seen=!!p.state.discovered[sk.id];
   const slot=p.state.equipped.indexOf(sk.id)+1;
   const status=slot?'EQUIPADA S'+slot:learned?'APRENDIDA':seen?'DESCUBIERTA':'SIN DESCUBRIR';
   const b=E('button','hf-p188-card'+(sk.id===selected?' active':''),undefined,container);
   b.type='button';
   E('strong',null,seen?sk.name:'??? · Habilidad oculta',b);
   E('small',null,status+(seen?' · '+(sk.resource==='MP'?'Maná ':'Energía ')+sk.cost+' · '+sk.cd+' s CD':''),b);
   b.addEventListener('click',()=>{ui.p188SelectedSkill=sk.id;ui.render('skills');});
   b.setAttribute('aria-label',sk.name+' '+status);
  }
 }
 const box=E('div','hf-p188-details',undefined,detail);
 const sk=HIGHFLY_SKILLS_P190.find(x=>x.id===selected);
 const origin=SKILL_ORIGINS_P190.find(x=>x.id===selected);
 const seen=!!p.state.discovered[sk.id],learned=!!p.state.learned[sk.id];
 const equipped=p.state.equipped.indexOf(sk.id)+1;
 E('h3',null,seen?sk.name:'HABILIDAD NO DESCUBIERTA',box);
 tag(box,'Categoría: '+(sk.resource==='MP'?'Mágica':'Física')+' · Apuntado: '+
  (AIM[(sk.nativeId?NATIVE_AIM_PROFILES_P190[sk.id]:AIM_SPECS_P189[sk.kit+'/'+sk.slot])?.kind]||'Direccional'));
 if(seen)tag(box,'Descripción: '+(DESCRIPTIONS[sk.id]||'Habilidad de combate.'));
 tag(box,'Origen: '+origin.source+(origin.implemented?'':' · CONTENIDO FUTURO'));
 if(!seen){
  E('p',null,'Primero completá su misión o conocé a su maestro. No se obtiene por abrir el catálogo.',box);
 }else{
  tag(box,'Coste: '+sk.cost+' '+(sk.resource==='MP'?'Maná':'Energía')+
   ' · Recarga: '+sk.cd+' segundos');
  if(!learned){
   if(sk.nativeId)E('p',null,'Esta habilidad se aprende al encontrar su piedra de conocimiento. No se desbloquea desde el catálogo.',box);
   else {
   const b=E('button',null,'✦ APRENDER HABILIDAD',box);b.type='button';
   b.addEventListener('click',()=>{if(p.learn(sk.id))ui.render('skills');});
   }
  }else{
   E('p',null,equipped?'Equipada en S'+equipped+'.':'Aprendida. Elegí una ranura para usarla.',box);
   for(let slot=1;slot<=6;slot++){
    const current=p.selected(slot);
    const b=E('button',null,'EQUIPAR EN S'+slot+
     (current?' · sustituye '+current.name:''),box);
    b.type='button';b.disabled=equipped===slot;
    b.addEventListener('click',()=>{
     if(p.equip(sk.id,slot)){
      g.p186Skills?.drawSkillButtons();ui.render('skills');
     }
    });
   }
   if(equipped){
    const unequip=E('button',null,'QUITAR DE S'+equipped,box);
    unequip.type='button';
    unequip.addEventListener('click',()=>{p.equip(null,equipped);g.p186Skills?.drawSkillButtons();ui.render('skills');});
   }
  }
 }
 tag(box,'Mantené S1–S6, arrastrá para apuntar y soltá para lanzar. La ✕ roja circular cancela sin gastar recursos y se edita desde EDITAR HUD.');
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
