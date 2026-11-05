// HIGHFLY P19 — Three.js camera / touch targeting lab over the real FURY player.
// Built-in only. No MLBB resources, no new geometry, no alternate character.
export const CAMERA_PRESETS_P18=Object.freeze({
 adventure:Object.freeze({label:'AVENTURA',distance:6,pitch:-8.6,aim:.145}),
 hybrid:Object.freeze({label:'HÍBRIDA',distance:8.5,pitch:-34,aim:.145}),
 moba:Object.freeze({label:'MOBA',distance:10,pitch:-46,aim:.145})
});
const STORE='hf_p19_fury_p16_camera_lab';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const num=(v,fallback,min,max)=>{
 const n=Number(v);return Number.isFinite(n)?clamp(n,min,max):fallback;
};
const FIELDS=Object.freeze({
 distance:{min:4.5,max:13,step:.1,label:'Distancia',unit:' u'},
 pitch:{min:-60,max:4,step:1,label:'Inclinación',unit:'°'},
 height:{min:.9,max:3.4,step:.1,label:'Altura de enfoque',unit:' u'},
 fov:{min:55,max:85,step:1,label:'Campo de visión',unit:'°'},
 aim:{min:.08,max:.25,step:.005,label:'Sensibilidad de skills',unit:' u/px'},
 deadZone:{min:0,max:12,step:1,label:'Zona muerta táctil',unit:' px'},
 turn:{min:.8,max:2.4,step:.1,label:'Giro de cámara',unit:'×'},
 smoothing:{min:6,max:24,step:1,label:'Respuesta de seguimiento',unit:''}
});
const DEFAULT=Object.freeze({
 preset:'hybrid',distance:8.5,pitch:-34,height:1.7,
 fov:70,aim:.145,deadZone:4,turn:1.5,smoothing:12
});
const readSaved=()=>{
 try{
  const value=JSON.parse(window.localStorage.getItem(STORE)||'null');
  if(!value||typeof value!=='object')return {...DEFAULT};
  const config={...DEFAULT};
  for(const [key,field] of Object.entries(FIELDS))
   config[key]=num(value[key],DEFAULT[key],field.min,field.max);
  config.preset=Object.hasOwn(CAMERA_PRESETS_P18,value.preset)?value.preset:'custom';
  return config;
 }catch(_){return {...DEFAULT};}
};
const fmt=(key,value)=>{
 if(key==='aim')return value.toFixed(3)+' u/px';
 if(key==='turn')return value.toFixed(1)+'×';
 if(key==='distance'||key==='height')return value.toFixed(1)+' u';
 if(key==='pitch'||key==='fov')return Math.round(value)+'°';
 if(key==='deadZone')return Math.round(value)+' px';
 return String(Math.round(value));
};
const label=(element,text)=>{element.textContent=text;return element};
export class TianjieCameraLabP18 {
 constructor(game,skills){
  this.game=game;
  this.skills=skills;
  this.config=readSaved();
  this.apply();
  this.install();
  this.refresh();
  this.interval=setInterval(()=>this.updateLive(),350);
  window.highflyCameraLab=this;
  console.info('[HIGHFLY P19] 3 cameras + live aim sensitivity; persistent settings.');
 }
 apply(){
  const g=this.game,p=g.player,c=this.config;
  p.camDist=c.distance;
  p.pitch=c.pitch*Math.PI/180;
  p.camTargetHeight=c.height;
  p.cameraSmoothing=c.smoothing;
  g.camera.fov=c.fov;g.camera.updateProjectionMatrix();
  this.skills.aimSensitivity=c.aim;
  this.skills.aimDragThreshold=c.deadZone;
  if(g.touch?.setCameraSensitivity)g.touch.setCameraSensitivity(c.turn);
  else if(g.touch)g.touch.cameraSensitivity=c.turn;
 }
 save(){
  try{window.localStorage.setItem(STORE,JSON.stringify(this.config));}
  catch(_){/* private browsing: still works in current session */}
 }
 selectProfile(profile){
  const p=CAMERA_PRESETS_P18[profile];if(!p)return;
  this.config={...this.config,...p,preset:profile};
  delete this.config.label;
  // Existing players keep FOV, height offset and camera responsiveness.
  this.apply();this.save();this.refresh();
  this.skills.announce('Cámara '+p.label+' · '+p.distance+'u · '+p.pitch+'°');
 }
 setValue(key,value){
  const field=FIELDS[key];if(!field)return;
  this.config[key]=num(value,this.config[key],field.min,field.max);
  if(['distance','pitch','height','fov'].includes(key))this.config.preset='custom';
  this.apply();this.save();this.refresh();
 }
 reset(){
  this.config={...DEFAULT};
  this.apply();this.save();this.refresh();
 }
 install(){
  const root=this.skills.root,top=root.querySelector('.hf-lab-top');
  const dock=document.createElement('div');
  dock.id='hf-p18-camera-dock';
  dock.setAttribute('role','group');
  dock.setAttribute('aria-label','Comparador de cámaras HIGHFLY');
  dock.innerHTML=`
   <span class="hf-p18-dock-caption">CÁMARA</span>
   <button data-hf-p18-preset="adventure" type="button">AVENTURA</button>
   <button data-hf-p18-preset="hybrid" type="button">HÍBRIDA</button>
   <button data-hf-p18-preset="moba" type="button">MOBA</button>
   <button id="hf-p18-open" type="button" aria-expanded="false"
       aria-controls="hf-p18-camera-panel">⚙ AJUSTAR</button>
   <span id="hf-p18-live-mini" aria-live="off">6.0u · −9°</span>`;
  const message=top.querySelector('#hf-lab-message');
  top.insertBefore(dock,message);
  this.dock=dock;
  const panel=document.createElement('section');
  panel.id='hf-p18-camera-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label','Ajustes de cámara y sensibilidad HIGHFLY');
  panel.innerHTML=`<header class="hf-p18-head">
   <div><strong>SUPER AIM + CÁMARA · P18</strong>
   <small>Modificá los valores mientras jugás · se guardan automáticamente</small></div>
   <button type="button" id="hf-p18-close" aria-label="Cerrar ajustes">✕</button>
  </header>
  <div id="hf-p18-current" class="hf-p18-status"></div>
  <div class="hf-p18-fields"></div>
  <footer><button type="button" id="hf-p18-reset">RESTABLECER</button>
  <small>Las 3 cámaras usan el mismo mapa, FURY y las 15 skills.</small></footer>`;
  root.appendChild(panel);this.panel=panel;
  this.status=panel.querySelector('#hf-p18-current');
  this.liveMini=dock.querySelector('#hf-p18-live-mini');
  this.controls=new Map();
  const fields=panel.querySelector('.hf-p18-fields');
  for(const [key,info] of Object.entries(FIELDS)){
   const row=document.createElement('label');
   row.className='hf-p18-field';
   row.innerHTML=`<span class="hf-p18-field-title">${info.label}</span>
    <output data-output="${key}"></output>
    <input type="range" min="${info.min}" max="${info.max}" step="${info.step}"
      data-range="${key}" aria-label="${info.label}">`;
   fields.appendChild(row);
   const input=row.querySelector('input');
   input.addEventListener('input',()=>this.setValue(key,input.value));
   this.controls.set(key,{input,output:row.querySelector('output')});
  }
  for(const b of dock.querySelectorAll('[data-hf-p18-preset]')){
   b.addEventListener('click',()=>this.selectProfile(b.dataset.hfP18Preset));
  }
  this.openButton=dock.querySelector('#hf-p18-open');
  const toggle=visible=>{
   this.panel.hidden=!visible;
   this.openButton.setAttribute('aria-expanded',String(visible));
   this.openButton.classList.toggle('active',visible);
  };
  this.openButton.addEventListener('click',()=>toggle(this.panel.hidden));
  panel.querySelector('#hf-p18-close').addEventListener('click',()=>toggle(false));
  panel.querySelector('#hf-p18-reset').addEventListener('click',()=>this.reset());
  // Never feed option taps into camera-look or combat pointer handlers.
  panel.addEventListener('pointerdown',event=>event.stopPropagation());
  dock.addEventListener('pointerdown',event=>event.stopPropagation());
  document.addEventListener('keydown',event=>{
   if(event.code==='Escape'&&!panel.hidden)toggle(false);
  },true);
 }
 refresh(){
  const c=this.config;
  for(const [key,ui] of this.controls||[]){
   // Don't reset a slider's active thumb while the player is dragging it.
   if(document.activeElement!==ui.input)ui.input.value=String(c[key]);
   label(ui.output,fmt(key,c[key]));
  }
  this.dock?.querySelectorAll('[data-hf-p18-preset]').forEach(b=>{
   const active=b.dataset.hfP18Preset===c.preset;
   b.classList.toggle('active',active);
   b.setAttribute('aria-pressed',String(active));
  });
  this.updateLive();
 }
 updateLive(){
  if(!this.dock)return;
  const g=this.game,p=g.player,c=this.config;
  const ground=g.terrain.getHeight(g.camera.position.x,g.camera.position.z);
  const cameraAltitude=Math.max(0,g.camera.position.y-ground);
  const pitch=p.pitch*180/Math.PI;
  const title=CAMERA_PRESETS_P18[c.preset]?.label||'PERSONALIZADA';
  label(this.liveMini,`${c.distance.toFixed(1)}u · ${Math.round(pitch)}°`);
  if(this.status)label(this.status,`${title} · Altura real ≈ ${cameraAltitude.toFixed(1)}u sobre terreno · Apuntado ${c.aim.toFixed(3)}u/px`);
 }
}
