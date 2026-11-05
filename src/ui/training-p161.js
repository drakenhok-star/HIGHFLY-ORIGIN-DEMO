/**
 * HIGHFLY P16.1 Training interface preview.
 * All set logs stay in browser localStorage. No XP, stats or RPG mutation.
 */
import { HIGHFLY_TRAINING_DAYS as DAYS, HIGHFLY_TRAINING_WEEKS as WEEKS, HIGHFLY_CORE_STAT_NAMES as STATS } from './training-schedule-p161.js';
const KEY = 'hf_p161_training_preview_v1';
const safe = (v,a,b) => Math.max(a,Math.min(b,Math.trunc(Number(v)||a)));
const h = x => String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock = s => { s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
export function emptyTrainingP161(){return {version:1,week:1,day:1,activeWeek:1,sets:{},sessions:{},drafts:{},rest:null,startedAt:0};}
export function sessionKey(w,d){return w+':'+d;}
export function isResting(m,now=Date.now()){return !!m.rest && m.rest.until>now;}
export function isWeekComplete(m,w){return DAYS.every(d=>!!m.sessions[sessionKey(w,d.day)]);}
export function pendingExercise(m){
 const d=DAYS[m.day-1];
 return d.exercises.find(e=>e.weekly[m.week-1]&&(m.sets[sessionKey(m.week,m.day)+':'+e.id]||[]).length<e.weekly[m.week-1].sets)||null;
}
function load(){
 try{
  const x=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!x||x.version!==1)return emptyTrainingP161();
  return {...emptyTrainingP161(),...x,week:safe(x.week,1,4),day:safe(x.day,1,5),activeWeek:safe(x.activeWeek,1,4),
   sets:x.sets&&typeof x.sets==='object'?x.sets:{},sessions:x.sessions&&typeof x.sessions==='object'?x.sessions:{},
   drafts:x.drafts&&typeof x.drafts==='object'?x.drafts:{}};
 }catch{return emptyTrainingP161();}
}
function save(m){try{localStorage.setItem(KEY,JSON.stringify(m));}catch{}}
const metric=(label,value)=>'<div class="hf-tr-metric"><small>'+h(label)+'</small><strong>'+h(value)+'</strong></div>';
export class TrainingPreviewP161 {
 constructor(game,menus){
  this.game=game;this.menus=menus;this.model=load();this.origin='menu';this.message='';
  const link=document.createElement('link');link.rel='stylesheet';
  link.href=new URL('./training-p161.css',import.meta.url).href;document.head.appendChild(link);
  this.screen=menus.screen('training','menu-training');
  this.screen.setAttribute('aria-label','HIGHFLY Training · interfaz previa');
  this.screen.addEventListener('click',e=>this.click(e));
  this.screen.addEventListener('input',e=>this.input(e));
  this.timer=setInterval(()=>{
   if(game.state!=='training')return;
   if(this.model.rest&&!isResting(this.model)){this.model.rest=null;save(this.model);this.render();}
   const label=this.screen.querySelector('[data-hf-tr-clock]');
   if(label)label.textContent=clock((this.model.rest.until-Date.now())/1000);
   const elapsed=this.screen.querySelector('[data-hf-tr-elapsed]');
   if(elapsed)elapsed.textContent=clock(this.model.startedAt?(Date.now()-this.model.startedAt)/1000:0);
  },500);
  this.render();
 }
 open(from){this.origin=from==='paused'?'paused':'menu';this.game.setState('training');}
 show(){this.render();this.menus.showScreen('training');}
 close(){
  if(isResting(this.model)){this.alert('DESCANSO OBLIGATORIO: esperá a completar la recuperación.');return false;}
  this.game.setState(this.origin);return true;
 }
 alert(s){this.message=s;const el=this.screen.querySelector('[data-hf-tr-message]');if(el)el.textContent=s;}
 input(e){
  const field=e.target.dataset?.hfTrDraft;
  if(field!=='kg'&&field!=='reps')return;
  const ex=pendingExercise(this.model);if(!ex)return;
  const k=sessionKey(this.model.week,this.model.day)+':'+ex.id;
  const draft=this.model.drafts[k]||{};
  draft[field]=e.target.value;this.model.drafts[k]=draft;save(this.model);
 }
 click(e){
  const btn=e.target.closest?.('[data-hf-tr-action]');if(!btn)return;
  const a=btn.dataset.hfTrAction,m=this.model;
  if(a==='back'){this.close();return;}
  if(isResting(m)){this.alert('DESCANSO OBLIGATORIO: sin saltar, cambiar día/semana ni cerrar Training.');return;}
  if(a==='week'){m.week=safe(btn.dataset.week,1,4);m.day=1;this.message='';save(m);this.render();return;}
  if(a==='day'){m.day=safe(btn.dataset.day,1,5);this.message='';save(m);this.render();return;}
  if(a==='next-week'){
   if(!isWeekComplete(m,m.activeWeek)||m.activeWeek>=4){this.alert('Completá los 5 días activos para avanzar.');return;}
   m.activeWeek++;m.week=m.activeWeek;m.day=1;this.message='';save(m);this.render();return;
  }
  if(a==='set'){
   const sk=sessionKey(m.week,m.day);
   if(m.week!==m.activeWeek||m.sessions[sk]){this.alert('Esta sesión no está habilitada.');return;}
   const ex=pendingExercise(m);if(!ex){this.alert('Todas las series están completas.');return;}
   const rx=ex.weekly[m.week-1],key=sk+':'+ex.id,draft=m.drafts[key]||{};
   const kg=Number(draft.kg),reps=Number(draft.reps??rx.reps);
   if(!Number.isFinite(kg)||kg<=0||!Number.isFinite(reps)||reps<1||reps>100){
    this.alert('Ingresá un peso real y una cantidad válida de repeticiones.');return;
   }
   if(!m.sets[key])m.sets[key]=[];
   if(m.sets[key].length>=rx.sets)return;
   if(!m.startedAt)m.startedAt=Date.now();
   m.sets[key].push({kg:Math.round(kg*100)/100,reps:Math.floor(reps),at:Date.now()});
   if(m.sets[key].length<rx.sets)m.rest={exerciseId:ex.id,until:Date.now()+ex.restSec*1000};
   this.message='Serie anotada como borrador local. No suma XP ni Core Stats.';
   save(m);this.render();return;
  }
  if(a==='finish'){
   const sk=sessionKey(m.week,m.day);
   if(m.week!==m.activeWeek||pendingExercise(m)||m.sessions[sk]){
    this.alert('Completá todas las series de la semana activa antes de registrar el día.');return;
   }
   m.sessions[sk]={at:Date.now(),preview:true};m.startedAt=0;
   this.message='Día anotado localmente. El Training Core real sigue desconectado.';
   save(m);this.render();
  }
 }
 render(){
  const m=this.model,day=DAYS[m.day-1],sk=sessionKey(m.week,m.day),ex=pendingExercise(m);
  const rx=ex&&ex.weekly[m.week-1],completed=!!m.sessions[sk],resting=isResting(m);
  const exercises=day.exercises.filter(x=>!!x.weekly[m.week-1]);
  const count=exercises.reduce((sum,x)=>sum+x.weekly[m.week-1].sets,0);
  const done=exercises.reduce((sum,x)=>sum+(m.sets[sk+':'+x.id]||[]).length,0);
  const key=ex&&sk+':'+ex.id,draft=m.drafts[key]||{},registered=ex?(m.sets[key]||[]).length:0;
  const active=m.week===m.activeWeek&&!completed;
  let center='';
  if(ex){
   const pct=rx.percent===undefined?'—':Math.round(rx.percent*100)+'% RM';
   center='<div class="hf-tr-section"><small>DÍA '+m.day+' · '+h(day.name)+'</small><h2>'+h(ex.label)+'</h2></div>'+
    '<div class="hf-tr-badges"><span>'+h(ex.intent.toUpperCase())+'</span><span>'+
     (ex.authority==='system_percent'?'POR %RM · CALIBRACIÓN PENDIENTE':ex.authority==='editable_accessory'?'ACCESORIO · PESO EDITABLE':'CARGA DE RUTINA')+'</span></div>'+
    '<div class="hf-tr-numbers">'+metric('SERIES',rx.sets+' × '+rx.reps)+metric('INTENSIDAD',pct)+metric('DESCANSO',clock(ex.restSec))+metric('HECHAS',registered+'/'+rx.sets)+'</div>'+
    '<p class="hf-tr-target">'+h(ex.target||'Técnica limpia y evidencia real de cada serie')+'</p>'+
    '<div class="hf-tr-fields"><label>PESO REAL (KG)<input data-hf-tr-draft="kg" type="number" inputmode="decimal" min="0.5" max="1000" step="0.5" placeholder="kg" value="'+h(draft.kg??'')+'"></label>'+
    '<label>REPETICIONES<input data-hf-tr-draft="reps" type="number" inputmode="numeric" min="1" max="100" value="'+h(draft.reps??rx.reps)+'"></label></div>'+
    '<button type="button" class="hf-tr-primary" data-hf-tr-action="set" '+(!active||resting?'disabled':'')+'>'+(resting?'DESCANSO EN CURSO':'REGISTRAR SERIE '+(registered+1)+'/'+rx.sets)+'</button>';
  }else{
   center='<div class="hf-tr-section"><small>DÍA '+m.day+'</small><h2>'+(completed?'SESIÓN ANOTADA':'SERIES COMPLETADAS')+'</h2></div>'+
    '<p class="hf-tr-target">'+(completed?'Borrador de entrenamiento guardado en este navegador.':'Podés registrar este día como borrador local.')+'</p>'+
    '<button type="button" class="hf-tr-primary" data-hf-tr-action="finish" '+(!active?'disabled':'')+'>REGISTRAR DÍA · BORRADOR</button>';
  }
  if(resting){
   center+='<div class="hf-tr-rest"><span>RECUPERACIÓN OBLIGATORIA · SIN SALTAR</span><strong data-hf-tr-clock>'+clock((m.rest.until-Date.now())/1000)+'</strong>'+
    '<small>No se puede salir, cambiar semana ni día durante el descanso.</small></div>';
  }
  const finished=DAYS.filter(d=>m.sessions[sessionKey(m.week,d.day)]).length;
  this.screen.innerHTML='<div class="hf-tr-shell"><header class="hf-tr-header"><div><b>HIGHFLY <span>/ TRAINING</span></b>'+
   '<small>TRAINING CORE · VISTA PREVIA P16.1 · ANDROID HORIZONTAL</small></div>'+
   '<div class="hf-tr-header-actions"><span>'+(resting?'RECUPERACIÓN':completed?'DÍA ANOTADO':m.week===m.activeWeek?'SEMANA ACTIVA':'SOLO VISTA')+'</span>'+
   '<button type="button" data-hf-tr-action="back" '+(resting?'disabled':'')+'>VOLVER ✕</button></div></header>'+
   '<div class="hf-tr-warning">INTERFAZ DE PRUEBA · Sin conexión al Training Core ni al RPG: no otorga XP, calorías, STR, AGI, VIT, PER, INT ni otros atributos.</div>'+
   '<div class="hf-tr-layout"><aside class="hf-tr-panel hf-tr-left">'+
   '<div class="hf-tr-caption">MESOCICLO · 3 CARGA + 1 DESCARGA</div>'+
   '<div class="hf-tr-weeks">'+WEEKS.map(w=>'<button type="button" data-hf-tr-action="week" data-week="'+w.week+'" class="'+(m.week===w.week?'selected':'')+'">'+w.week+'<small>'+w.block+'</small></button>').join('')+'</div>'+
   '<div class="hf-tr-subheader">SEMANA '+m.week+' <small>Activa: '+m.activeWeek+'</small></div>'+
   '<div class="hf-tr-days">'+DAYS.map(d=>'<button type="button" data-hf-tr-action="day" data-day="'+d.day+'" class="'+(m.day===d.day?'selected':'')+'">'+
    '<span>D'+d.day+'</span><b>'+h(d.name)+'</b><i>'+(m.sessions[sessionKey(m.week,d.day)]?'✓':'·')+'</i></button>').join('')+'</div>'+
   (isWeekComplete(m,m.activeWeek)&&m.activeWeek<4?'<button class="hf-tr-week-next" type="button" data-hf-tr-action="next-week">HABILITAR SEMANA '+(m.activeWeek+1)+'</button>':'')+
   '</aside><main class="hf-tr-panel hf-tr-center"><div class="hf-tr-progress"><span>PROGRESO · '+done+' / '+count+' SERIES</span><div><i style="width:'+(count?100*done/count:0)+'%"></i></div></div>'+
   center+'<p class="hf-tr-message" data-hf-tr-message aria-live="polite">'+h(this.message)+'</p></main>'+
   '<aside class="hf-tr-panel hf-tr-right"><div class="hf-tr-caption">HUNTER · CORE STATS</div>'+
   '<div class="hf-tr-stats">'+STATS.map(s=>'<div><strong>'+s+'</strong><b>—</b><small>SIN CALIBRAR</small></div>').join('')+'</div>'+
   '<div class="hf-tr-caption">RESUMEN</div><div class="hf-tr-summary">'+'<div class="hf-tr-metric"><small>TIEMPO</small><strong data-hf-tr-elapsed>'+clock(m.startedAt?(Date.now()-m.startedAt)/1000:0)+'</strong></div>'+
   metric('SERIES',done+'/'+count)+metric('DÍAS',finished+'/5')+metric('XP / CALORÍAS','—')+'</div>'+
   '<p class="hf-tr-footer">e1RM, adaptación, Performance Gate y puente Fitness ↔ RPG: conectores pendientes. Solo se registra evidencia local.</p>'+
   '</aside></div></div>';
 }
}
