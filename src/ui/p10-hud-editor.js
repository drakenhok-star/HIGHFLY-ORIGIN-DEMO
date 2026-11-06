/**
 * HIGHFLY P10 touch HUD editor: draggable live controls + opacity and scale.
 * Does not edit game code or interrupt saves. Keys versioned and validated.
 */
import {HUD_DEFAULTS,HUD_IDS,HUD_LAYOUT_KEY,sanitizeHudLayout,placeHudItem,clamp} from './p10-layout.js';
const node=(tag,cls,txt,parent)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;if(parent)parent.appendChild(el);return el;
};
export class HudEditorP10{
 constructor(hud){
  this.hud=hud;this.game=hud.game;this.elements=new Map();
  this.selected='atk';this.editing=false;this.drag=null;
  this.layout=this.load();this.onDown=this.onDown.bind(this);this.onMove=this.onMove.bind(this);this.onUp=this.onUp.bind(this);
  this.onResize=()=>this.apply();window.addEventListener('resize',this.onResize);
  this.panel=node('section','hf-p10-editor-panel',undefined,document.body);
  this.panel.id='hf-p10-editor';this.panel.style.display='none';
  this.buildPanel();
 }
 load(){
  try{
   const data=JSON.parse(localStorage.getItem(HUD_LAYOUT_KEY)||'null');
   return sanitizeHudLayout(data?.layout);
  }catch(err){return sanitizeHudLayout();}
 }
 register(id,el){
  if(!HUD_IDS.includes(id)||!el)return;
  el.dataset.hfHudId=id;
  this.elements.set(id,el);
  if(id==='focus'&&this.focusOption){this.focusOption.hidden=false;this.focusOption.disabled=false;}
  if(id==='skillCancel'&&this.skillCancelOption){this.skillCancelOption.hidden=false;this.skillCancelOption.disabled=false;}
  this.applyOne(id);
 }
 applyOne(id){
  const el=this.elements.get(id),it=this.layout[id];if(!el||!it)return;
  const vw=window.innerWidth,vh=window.innerHeight;
  const scale=Math.min(1.22,Math.max(.72,Math.min(vw/915,vh/412)));
  const p=placeHudItem(it,vw,vh,scale,['combo','perf','header'].includes(id));
  for(const [k,v] of [['position','fixed'],['left',p.left+'px'],['top',p.top+'px'],
    ['right','auto'],['bottom','auto'],['transform','none'],['transform-origin','top left'],
    ['opacity',String(it.opacity)],['display',it.hidden?'none':(id==='combo'&&this.game.p14Enabled&&!el.textContent?'none':(id==='header'||id==='combo'||id==='perf'||id==='joy'?'block':'flex'))]]){
    el.style.setProperty(k,v,'important');
  }
  if(['radar','joy','run','jump','dash','use','s1','atk','s2','s3','s4','s5','s6','lock','next','clear','bag','menu','focus','skillCancel'].includes(id)){
   el.style.setProperty('width',p.size+'px','important');
   el.style.setProperty('height',p.size+'px','important');
  }else if(id==='combo'||id==='perf'||id==='header'){
   el.style.setProperty('width',p.size+'px','important');
   el.style.setProperty('height','auto','important');
  }
  el.classList.toggle('hf-p10-selected',this.editing && this.selected===id);
  // FPS/MS was impossible to drag because its CSS makes it click-through.
  if(id==='perf'){
   el.style.setProperty('pointer-events',this.editing?'auto':'none','important');
   el.style.setProperty('touch-action',this.editing?'none':'auto','important');
   el.style.setProperty('cursor',this.editing?'move':'default','important');
   el.style.setProperty('z-index',this.editing?'140':'46','important');
  }
  if(id==='skillCancel'){
   // Escape the HUD parent stacking context: above coords/FPS, below HUD editor.
   el.style.setProperty('z-index','119','important');
   // Editing shows the movable ring; in gameplay only active skill-aim shows it.
   const visible=this.editing||!!this.game.p186Skills?.pendingAim;
   el.style.setProperty('visibility',visible?'visible':'hidden','important');
   el.style.setProperty('pointer-events',visible?'auto':'none','important');
  }
 }
 apply(){for(const id of this.elements.keys())this.applyOne(id);}
 persist(){
  try{localStorage.setItem(HUD_LAYOUT_KEY,JSON.stringify({version:1,layout:this.layout}));}
  catch(err){console.warn('[P10] No se pudo guardar layout HUD',err);}
 }
 buildPanel(){
  const title=node('div','hf-p10-editor-head',undefined,this.panel);
  node('strong',null,'✦ EDITOR DE INTERFAZ',title);
  const x=node('button',null,'TERMINAR',title);
  x.type='button';x.addEventListener('click',()=>this.stop(true));
  if(this.game.p812Enabled){
   this.miniBtn=node('button',null,'MINIMIZAR',title);this.miniBtn.type='button';
   this.miniBtn.addEventListener('click',()=>{
    const mini=this.panel.classList.toggle('hf-p812-mini');
    this.miniBtn.textContent=mini?'EXPANDIR':'MINIMIZAR';
   });
  }
  const row=node('div','hf-p10-editor-row',undefined,this.panel);
  const label=node('label',null,'Botón: ',row);
  this.select=node('select',null,undefined,label);
  const NAMES={joy:'JOYSTICK',run:'CORRER',jump:'SALTO',dash:'DASH',use:'USAR',
   s1:'HABILIDAD S1',s2:'HABILIDAD S2',s3:'HABILIDAD S3',s4:'HABILIDAD S4',
   s5:'HABILIDAD S5',s6:'HABILIDAD S6',atk:'ATK',
   lock:'FIJAR',next:'SIGUIENTE',clear:'BORRAR OBJETIVO',skillCancel:'✕ CANCELAR SKILL',radar:'RADAR',perf:'FPS/GPU',
   bag:'MOCHILA',menu:'MENÚ',focus:'ENFOCAR VOLADOR',combo:'COMBO',header:'HP / MP'};
  for(const id of HUD_IDS){
   const opt=node('option',null,NAMES[id]||id,this.select);opt.value=id;
   if(id==='focus'){this.focusOption=opt;opt.hidden=true;opt.disabled=true;}
   if(id==='skillCancel'){this.skillCancelOption=opt;opt.hidden=true;opt.disabled=true;}
  }
  this.select.addEventListener('change',()=>this.choose(this.select.value));
  const makeSlider=(text,min,max,step,onInput)=>{
   const group=node('label','hf-p10-editor-slider',undefined,row);
   node('span',null,text,group);
   const input=node('input',null,undefined,group);
   input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);
   const label=node('strong',null,'',group);label.style.cssText='font:750 10px system-ui;min-width:30px';
   input.addEventListener('input',()=>{
    label.textContent=text.includes('%')?input.value+'%':input.value;
    onInput(Number(input.value));
   });
   input._valueLabel=label;return input;
  };
  this.size=makeSlider('TAMAÑO PX',28,230,1,v=>this.change('size',v));
  this.percent=makeSlider('TAMAÑO %',40,300,5,v=>this.changeSizePercent(v));
  this.opacity=makeSlider('OPACIDAD',.25,1,.05,v=>this.change('opacity',v));
  this.allSkillsPercent=makeSlider('6 SKILLS %',50,190,5,v=>this.equalizeSkillSizes(v));
  this.allSkillsPercent.value='100';this.allSkillsPercent._valueLabel.textContent='100%';
  const buttons=node('div','hf-p10-editor-buttons',undefined,this.panel);
  const action=(text,fn)=>{const b=node('button',null,text,buttons);b.type='button';b.addEventListener('click',fn);};
  action('CENTRAR SELECCIÓN',()=>{this.change('x',.5);this.change('y',.48);});
  action('RESTAURAR TODO',()=>{this.layout=sanitizeHudLayout();this.apply();this.choose(this.selected);this.persist();});
  action('GUARDAR',()=>{this.persist();this.game.hud.notify('HUD guardado');});
  this.caption=node('div','hf-p10-editor-hint','Arrastrá los botones directamente. También podés modificar tamaño y opacidad.',this.panel);
  this.choose('atk');
 }
 choose(id){
  if(!this.layout[id])return;
  this.selected=id;this.select.value=id;this.size.value=String(this.layout[id].size);
  this.size._valueLabel.textContent=String(this.layout[id].size);
  this.opacity.value=String(this.layout[id].opacity);
  this.opacity._valueLabel.textContent=String(this.layout[id].opacity);
  const percent=clamp(Math.round(this.layout[id].size/HUD_DEFAULTS[id].size*100/5)*5,40,300);
  this.percent.value=String(percent);this.percent._valueLabel.textContent=percent+'%';
  this.apply();
 }
 change(key,value){
  if(!this.layout[this.selected])return;
  this.layout[this.selected][key]=value;
  this.applyOne(this.selected);
  if(key==='size'){
   this.size.value=String(value);this.size._valueLabel.textContent=String(value);
   const pc=clamp(Math.round(value/HUD_DEFAULTS[this.selected].size*100/5)*5,40,300);
   this.percent.value=String(pc);this.percent._valueLabel.textContent=pc+'%';
  }
 }
 changeSizePercent(percent){
  const original=HUD_DEFAULTS[this.selected];if(!original)return;
  this.change('size',clamp(Math.round(original.size*percent/100),26,230));
  this.percent.value=String(percent);this.percent._valueLabel.textContent=percent+'%';
 }
 equalizeSkillSizes(percent){
  // All six circles get the same pixel diameter, without shifting saved positions.
  const size=clamp(Math.round(HUD_DEFAULTS.s1.size*percent/100),26,230);
  for(const id of ['s1','s2','s3','s4','s5','s6']){
   this.layout[id].size=size;this.applyOne(id);
  }
  this.allSkillsPercent.value=String(percent);
  this.allSkillsPercent._valueLabel.textContent=percent+'%';
  this.choose(this.selected);this.persist();
 }
 start(){
  if(this.editing)return;
  // Exit any inventory/settings state before editing the live world HUD.
  if(this.hud.open)this.hud.hide();
  this.editing=true;
  this.game.input.hudEditing=true;
  this.game.input.leftClick=false;this.game.input.rightClick=false;
  this.game.touch?.reset?.();
  this.panel.style.display='block';
  if(this.game.p812Enabled){this.panel.classList.add('hf-p812-mini');this.miniBtn.textContent='EXPANDIR';}
  document.body.classList.add('hf-p10-editing');
  this.apply();this.choose(this.selected);
  document.addEventListener('pointerdown',this.onDown,true);
  document.addEventListener('pointermove',this.onMove,true);
  document.addEventListener('pointerup',this.onUp,true);
  document.addEventListener('pointercancel',this.onUp,true);
 }
 onDown(e){
  if(!this.editing||this.panel.contains(e.target))return;
  const el=e.target.closest?.('[data-hf-hud-id]');
  if(!el || !this.elements.has(el.dataset.hfHudId))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const id=el.dataset.hfHudId;this.choose(id);
  const it=this.layout[id];this.drag={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,ox:it.x,oy:it.y};
 }
 onMove(e){
  if(!this.drag||e.pointerId!==this.drag.pointer)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const id=this.drag.id;
  this.layout[id].x=clamp(this.drag.ox+(e.clientX-this.drag.x)/window.innerWidth,.005,.98);
  this.layout[id].y=clamp(this.drag.oy+(e.clientY-this.drag.y)/window.innerHeight,.005,.98);
  this.applyOne(id);
 }
 onUp(e){
  if(!this.drag||this.drag.pointer!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  this.drag=null;this.persist();
 }
 stop(save=true){
  if(!this.editing)return;
  if(save)this.persist();
  this.editing=false;this.drag=null;this.game.input.hudEditing=false;
  this.panel.style.display='none';this.panel.classList.remove('hf-p812-mini');document.body.classList.remove('hf-p10-editing');
  document.removeEventListener('pointerdown',this.onDown,true);
  document.removeEventListener('pointermove',this.onMove,true);
  document.removeEventListener('pointerup',this.onUp,true);
  document.removeEventListener('pointercancel',this.onUp,true);
  this.apply();
 }
}
