/**
 * P187 in-world player-facing map & profession curriculum.
 * Real training status only; clearly distinguishes planned masters/settlements
 * from existing content. Does not spawn placeholder buildings or grant items.
 */
import {
 INICIOS_HUBS_P186,INICIOS_PROFESSIONS_P186,INICIOS_TRAINERS_P186,
 INICIOS_CHAPTERS_P186
} from '../world/inicios-v2-p186.js';
const colors={ground:'#4abf95',planned:'#ac9ec7'};
const make=(tag,parent,text,style='')=>{
 const e=document.createElement(tag);if(text!==undefined)e.textContent=text;
 if(style)e.style.cssText=style;
 if(parent)parent.appendChild(e);return e;
};
export class P187VillageGuide{
 constructor(game){this.game=game;this.button=null;this.panel=null;this.tab='oficios';this.tick=0;}
 update(dt){
   if(this.button)return;
   this.tick+=dt;
   if(this.tick<.45)return;this.tick=0;
   const quick=this.game.touch?.premium?.p810?.quick || document.getElementById('hf-p810-quick');
   if(!quick)return;
   this.button=make('button',quick,'🏘 PUEBLO · OFICIOS 1–20');
   this.button.type='button';
   this.button.addEventListener('click',()=>{
     this.game.touch.premium.p810.toggleQuickMenu(false);
     this.toggle();
   });
 }
 toggle(){if(this.panel){this.close();return;}this.open();}
 close(){this.panel?.remove();this.panel=null;}
 open(){
   this.close();
   const p=make('section',document.body,undefined,
     'position:fixed;z-index:260;top:9%;left:50%;transform:translateX(-50%);'+
     'box-sizing:border-box;width:min(640px,93vw);max-height:82vh;overflow:auto;'+
     'background:#100f26f8;color:#edf8ff;border:2px solid #53bde3;'+
     'border-radius:14px;padding:12px;box-shadow:0 12px 45px #000a;'+
     'font:13px/1.5 system-ui;touch-action:pan-y');
   p.id='hf-p187-inicios-guide';
   p.addEventListener('pointerdown',e=>e.stopPropagation());
   const top=make('div',p,undefined,'display:flex;align-items:center;justify-content:space-between;gap:8px');
   make('strong',top,'PUEBLO DE LOS INICIOS · NIVEL 1–20','font-size:15px;color:#a5edff');
   const close=make('button',top,'CERRAR','background:#294068;color:white;border-radius:8px;padding:6px');
   close.type='button';close.addEventListener('click',()=>this.close());
   const tabs=make('div',p,undefined,'display:flex;gap:8px;margin:10px 0');
   for(const [id,name] of [['oficios','15 OFICIOS'],['pueblos','MAPA / VILLAS'],['ruta','PROGRESIÓN']]){
     const b=make('button',tabs,name,'flex:1;min-height:38px;border:1px solid #4b9cb8;'+
       'background:'+(id===this.tab?'#31759c':'#272c50')+';border-radius:9px;color:white');
     b.type='button';
     b.addEventListener('click',()=>{this.tab=id;this.render();});
   }
   this.body=make('div',p);
   this.panel=p;this.render();
 }
 render(){
   if(!this.panel||!this.body)return;
   this.body.replaceChildren();
   if(this.tab==='oficios')this.renderTrades();
   if(this.tab==='pueblos')this.renderHubs();
   if(this.tab==='ruta')this.renderChapters();
 }
 renderTrades(){
   make('p',this.body,'Las 15 profesiones nacen aquí. Las primeras lecciones se activan al hablar con maestros existentes; los demás puestos figuran como próximos.','opacity:.85;margin:4px 0 12px');
   const trained=this.game.p187Professions?.state?.learned||{};
   for(const p of INICIOS_PROFESSIONS_P186){
     const trainer=INICIOS_TRAINERS_P186.find(t=>t.id===p.trainerId);
     const ready=!!trainer?.existing;
     const card=make('div',this.body,undefined,
       'border:1px solid #3c4d71;padding:9px;border-radius:10px;margin-bottom:6px;'+
       'background:#1a2442;display:flex;justify-content:space-between;gap:10px');
     const body=make('div',card);
     make('strong',body,p.name,'display:block');
     const hub=INICIOS_HUBS_P186.find(h=>h.id===p.hubId);
     make('small',body,(hub?.name||'')+' · desde nivel '+p.introLevel+
       ' · '+p.starterLesson.replaceAll('_',' '),'color:#b5bdd4');
     const status=trained[p.id]?'APRENDIDO':ready?'MAESTRO DISPONIBLE':'MAESTRO PLANIFICADO';
     make('span',card,status,'font:700 10px system-ui;flex:none;align-self:center;color:'+
       (trained[p.id]?'#6be3a3':ready?'#84d8fd':colors.planned));
   }
 }
 renderHubs(){
   make('p',this.body,'La plaza central existe. Los cinco pueblitos y dos barrios se incorporarán únicamente después de validar suelo, agua, rutas y modelos CC0.','opacity:.85');
   for(const h of INICIOS_HUBS_P186){
     const card=make('div',this.body,undefined,
       'background:#1a2442;border-radius:10px;padding:9px;margin:6px 0');
     make('strong',card,h.name+' · niveles '+h.levelRange.join('–'),'display:block');
     make('small',card,h.roles.join(' · '),'display:block;color:#b9c8db');
     make('small',card,h.built?'SECTOR EXISTENTE':'UBICACIÓN Y MODELOS PENDIENTES',
       'color:'+(h.built?colors.ground:colors.planned));
   }
 }
 renderChapters(){
   for(const c of INICIOS_CHAPTERS_P186){
     const card=make('div',this.body,undefined,'background:#1a2442;border-radius:10px;padding:9px;margin:6px 0');
     make('strong',card,'NIVELES '+c.levels.join('–')+' · '+c.title,'display:block');
     make('small',card,c.systems.join(' · '),'color:#b9c8db');
   }
 }
}
