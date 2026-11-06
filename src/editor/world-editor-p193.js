
/**
 * HIGHFLY P193 · World Forge — real P192 scene, not a fake editor map.
 * P192 procedural terrain/structures/NPCs are displayed by the ordinary game.
 * Editor controls use a separate top-down/orbit camera and a versioned JSON draft.
 */
import * as THREE from 'three';
import {emptyWorldLayoutP193,normalizeWorldLayoutP193,
  safeTransformP193,P193_LIBRARY,spawnAddedP193,adjustHouseP193} from '../world/world-layout-p193.js';

const DRAFT_KEY='hf_p193_world_editor_draft';
const css=`
#hf-p193-editor{position:fixed;inset:0;z-index:9500;pointer-events:none;color:#ecf6ff;
  font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif}
#hf-p193-editor *{box-sizing:border-box}
#hf-p193-editor button,#hf-p193-editor input,#hf-p193-editor select{font:inherit}
#hf-p193-editor .hf-panel{pointer-events:auto;background:rgba(8,18,34,.94);
  border:1px solid #285471;box-shadow:0 12px 40px #0009;border-radius:12px;backdrop-filter:blur(12px)}
#hf-p193-editor .hf-top{position:absolute;top:10px;left:10px;right:10px;padding:10px 12px;
 display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#hf-p193-editor .hf-title{font-size:15px;font-weight:750;letter-spacing:.07em;color:#80e6ff;margin-right:12px}
#hf-p193-editor button{background:#17354a;border:1px solid #3b6b80;border-radius:6px;color:#e8f5ff;
 min-height:31px;padding:5px 9px;cursor:pointer}
#hf-p193-editor button:hover{background:#235371}
#hf-p193-editor button[aria-pressed=true]{border-color:#65e6e1;color:#65e6e1;background:#183a43}
#hf-p193-editor button:disabled{opacity:.45;cursor:default}
#hf-p193-editor .hf-left{position:absolute;top:76px;bottom:48px;left:10px;width:min(255px,26vw);display:flex;flex-direction:column}
#hf-p193-editor .hf-right{position:absolute;top:76px;right:10px;width:min(260px,27vw);max-height:calc(100vh - 120px);overflow:auto}
#hf-p193-editor .hf-scroll{overflow-y:auto;min-height:0;padding:8px}
#hf-p193-editor .hf-head{padding:10px 11px;border-bottom:1px solid #23475d;font-weight:650}
#hf-p193-editor .hf-row{display:flex;align-items:center;gap:6px;margin:7px 0;flex-wrap:wrap}
#hf-p193-editor .hf-row>*{min-width:0}
#hf-p193-editor .hf-list-entry{display:block;width:100%;text-align:left;margin:3px 0;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hf-p193-editor .hf-list-entry.selected{background:#1a5558;border-color:#64dfb9}
#hf-p193-editor input,#hf-p193-editor select{width:100%;border:1px solid #285571;border-radius:6px;
 background:#071625;color:#effaff;padding:7px}
#hf-p193-editor label{color:#bad7e6;font-size:11px}
#hf-p193-editor .hf-fields{display:grid;grid-template-columns:1fr 1fr;gap:7px}
#hf-p193-editor .hf-field{display:flex;flex-direction:column;gap:3px}
#hf-p193-editor .hf-note{font-size:11px;color:#8eb7cb}
#hf-p193-editor .hf-warn{color:#ffc681}
#hf-p193-editor .hf-bottom{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
  padding:9px 12px;max-width:60vw;text-align:center;font-size:12px}
#hf-p193-editor .hf-muted{opacity:.65}
#hf-p193-editor .hf-accent{color:#72e1c0}
#hf-p193-editor .hf-library button{margin:3px 0;width:100%;text-align:left}
@media(max-width:800px){#hf-p193-editor .hf-title{font-size:12px}
 #hf-p193-editor .hf-left{width:29vw;top:118px}#hf-p193-editor .hf-right{width:30vw;top:118px}
 #hf-p193-editor .hf-top{max-height:106px;overflow:auto}
 #hf-p193-editor .hf-bottom{max-width:40vw}}
`;

function node(tag,parent,className,text){
  const el=document.createElement(tag);if(className)el.className=className;
  if(text!==undefined)el.textContent=text;if(parent)parent.appendChild(el);return el;
}
const copy = obj => JSON.parse(JSON.stringify(obj));
const labelKind = {house:'CASA',npc:'NPC',hub:'BARRIO',model:'DECORACIÓN'};
const finite=(x)=>Number.isFinite(x)&&Math.abs(x)<=12000;
const format=n=>Number(n).toFixed(1);

export class WorldEditorP193{
 constructor(game){
  this.g=game;this.selected=null;this.mode='3d';this.tool='select';
  this.focus=new THREE.Vector3(0,game.terrain.getHeight(0,40),40);
  this.distance=210;this.drag=null;this.handles=new Map();
  this.history=[];this.historyIndex=-1;this.dirty=false;this.search='';
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
  this.g.renderer.domElement.style.touchAction='none';
  this.materializeHamlets();
  this.mountUI();
  this.scan();
  this.captureHistory();
  this.installPointer();
  this.setView();
  this.installHotkeys();
  this.loadDraft();
  this.cameraTick();
  this.notify('Mundo P192 real cargado. Elegí un edificio o NPC para editarlo.');
 }
 materializeHamlets(){
  const g=this.g,p=g.player?.pos;if(!p)return;
  const original=p.clone(),state=g.state;
  // Build the seven real P192 hamlets in editor; no teleport in normal gameplay.
  try{
    g.state='playing';
    for(const site of g.p192Hamlets?.sites?.values()||[]){
      if(!site.pos)continue;
      p.set(site.pos.x,site.pos.y,site.pos.z);
      for(let n=0;n<28;n++){
        g.p192Hamlets._acc=0.5;
        g.p192Hamlets.update(0.5);
      }
    }
  }finally{
    p.copy(original);g.state=state;
    g.p192Hamlets._lastHub=null;
  }
  for(const npc of g.npcs?.list||[])npc.group.visible=true;
 }
 mountUI(){
  const style=node('style',document.head);style.textContent=css;
  this.root=node('div',document.body);this.root.id='hf-p193-editor';
  const top=node('div',this.root,'hf-panel hf-top');
  node('strong',top,'hf-title','HIGHFLY · WORLD FORGE P193');
  this.addButton(top,'Seleccionar',()=>this.setTool('select'),'tool-select');
  this.addButton(top,'Mover',()=>this.setTool('move'),'tool-move');
  this.addButton(top,'2D / 3D',()=>{this.mode=this.mode==='3d'?'2d':'3d';this.setView();});
  this.addButton(top,'Deshacer',()=>this.undo(),'undo');
  this.addButton(top,'Rehacer',()=>this.redo(),'redo');
  this.addButton(top,'Guardar borrador',()=>this.saveDraft(),'draft');
  this.addButton(top,'Exportar JSON',()=>this.download(),'export');
  this.addButton(top,'Importar JSON',()=>this.fileInput.click(),'import');
  const file=node('input',top);file.type='file';file.accept='.json,application/json';file.style.display='none';
  this.fileInput=file;file.addEventListener('change',async()=>{
    if(!file.files?.[0])return;
    try{this.importLayout(normalizeWorldLayoutP193(JSON.parse(await file.files[0].text())));this.notify('Mapa importado: vista actualizada.');}
    catch(error){this.notify('Error de importación: '+error.message,true);}
    file.value='';
  });

  const left=node('div',this.root,'hf-panel hf-left');
  node('div',left,'hf-head','OBJETOS Y LOCALIZACIONES');
  const search=node('input',node('div',left,'hf-scroll'));
  search.placeholder='Buscar casa, oficio, NPC…';search.addEventListener('input',()=>{this.search=search.value.toLowerCase();this.renderList();});
  this.entityList=node('div',left,'hf-scroll');
  const right=node('div',this.root,'hf-panel hf-right');
  node('div',right,'hf-head','INSPECTOR');
  this.inspector=node('div',right,'hf-scroll');
  node('div',right,'hf-head','BIBLIOTECA ACTIVA');
  this.library=node('div',right,'hf-scroll hf-library');
  this.renderLibrary();
  this.status=node('div',this.root,'hf-panel hf-bottom');
  this.status.textContent='Botón derecho: mover cámara · Rueda: zoom · Arrastrá objetos con Mover · Ctrl+Z';
 }
 addButton(parent,text,action,id){
  const b=node('button',parent,null,text);if(id)b.dataset.action=id;
  b.addEventListener('click',action);return b;
 }
 notify(msg,warn=false){
  this.status.textContent=msg;this.status.classList.toggle('hf-warn',warn);
 }
 scan(){
  this.handles.clear();
  const put=(id,label,kind,object,ref)=>this.handles.set(id,{id,label,kind,object,ref});
  const s=this.g.structures;
  (s._ringHouses||[]).forEach((o,i)=>put('village:house:'+i,
    ['Casa del pueblo','Taberna','Casa del pueblo','Casa de Olaf','Casa del pueblo'][i]+' #'+(i+1),
    'house',o,null));
  if(s._smithyHouse)put('village:house:5','Herrería de Sigrid','house',s._smithyHouse,null);
  for(const [id,site] of this.g.p192Hamlets?.sites||[]){
    put('hub:'+id,site.hub.name,'hub',null,site);
    (site.houses||[]).forEach((o,i)=>{
      if(o)put('hamlet:'+id+':house:'+i,site.hub.name+' · Casa '+(i+1),'house',o,site);
    });
  }
  for(const npc of this.g.npcs.list){
    const added=this.g.p193Added?.find(p=>p.npc===npc);
    if(added)continue;
    put('npc:'+npc.id,npc.name,'npc',npc.group,npc);
  }
  for(const added of this.g.p193Added||[]){
    put('added:'+added.id,added.kind==='house'?'Casa nueva · '+added.id:
      added.kind==='npc'?'NPC nuevo · '+added.id:'Recurso · '+added.asset,
      added.kind,added.group,added);
  }
  this.renderList();this.renderInspector();
 }
 coords(h){
  if(h?.kind==='hub')return h.ref?.pos||{x:0,z:40};
  return h?.object?.position||{x:0,z:40};
 }
 select(id){
  this.selected=this.handles.get(id)||null;
  if(this.selected){
    const p=this.coords(this.selected);
    this.focus.set(p.x,this.g.terrain.getHeight(p.x,p.z),p.z);
    this.setView();
  }
  this.renderList();this.renderInspector();
 }
 renderList(){
  this.entityList.replaceChildren();
  for(const h of this.handles.values()){
    if(this.search&&!((h.label+' '+h.id).toLowerCase().includes(this.search)))continue;
    const p=this.coords(h),suffix=h.kind==='hub'&&h.ref&&!h.ref.pos?' · SIN UBICAR':'';
    const b=this.addButton(this.entityList,
      (labelKind[h.kind]||'OBJETO')+'  '+h.label+'  ['+format(p.x)+','+format(p.z)+']'+suffix,
      ()=>this.select(h.id));
    b.className='hf-list-entry'+(h===this.selected?' selected':'');
    b.title=h.id;
  }
 }
 renderInspector(){
  const box=this.inspector;box.replaceChildren();
  const h=this.selected;
  if(!h){
    node('p',box,'hf-note','Elegí un elemento de la lista o hacé clic en una casa/NPC del mundo.');
    node('p',box,'hf-note','Los datos de terreno, monstruos, vegetación, misiones y mazmorras siguen siendo los reales de P192.');
    return;
  }
  node('div',box,'hf-row hf-accent',h.label);
  node('p',box,'hf-note',h.id);
  const p=this.coords(h),isHub=h.kind==='hub';
  const values={x:p.x,z:p.z,
    rotation:isHub?0:h.object.rotation.y,
    scale:isHub?1:h.object.scale.x};
  const fields=node('div',box,'hf-fields');
  const drawField=(id,label,step)=>{
    const holder=node('div',fields,'hf-field');node('label',holder,null,label);
    const input=node('input',holder);input.type='number';input.step=step;input.value=format(values[id]);input.dataset.field=id;
    input.addEventListener('change',()=>{
      const parsed=Number(input.value);
      if(!Number.isFinite(parsed)){this.notify('Número inválido',true);return;}
      this.editField(h,id,parsed);
    });
  };
  drawField('x','X',0.5);drawField('z','Z',0.5);
  if(!isHub){drawField('rotation','Rotación (radianes)',0.1);drawField('scale','Escala',0.05);}
  const row=node('div',box,'hf-row');
  this.addButton(row,'Ir',()=>{const c=this.coords(h);this.focus.set(c.x,this.g.terrain.getHeight(c.x,c.z),c.z);this.setView();});
  if(!isHub){
    this.addButton(row,'Duplicar',()=>this.duplicateSelected());
    if(h.id.startsWith('added:'))this.addButton(row,'Eliminar',()=>this.deleteSelected());
  }
  if(isHub){
    node('p',box,'hf-note','Mover un barrio desplaza su punto de referencia y las casas y entrenadores cargados.');
    this.addButton(box,'Ubicar con clic en terreno',()=>{this.setTool('place-hub');this.notify('Hacé clic en el terreno para ubicar '+h.label);});
  } else if(h.id.startsWith('village:house:')){
    node('p',box,'hf-warn','Casa principal: sus puertas, colisiones y chimenea acompañan el movimiento. Revisar cofres/misiones antes de publicar.');
  }
  const warn=this.checkPlacement(h);
  if(warn)node('p',box,'hf-warn','⚠ '+warn);
  node('p',box,'hf-note','Cambios en esta pestaña = borrador. Para publicarlos en la app, exportá el JSON y actualizá assets/world-layout-p193.json.');
 }
 checkPlacement(h){
  const p=this.coords(h),t=this.g.terrain;
  if(!finite(p.x)||!finite(p.z))return 'Posición fuera de límites';
  if(t.getHeight(p.x,p.z)<=t.waterY+1)return 'Ubicación bajo el agua o en la costa';
  if(t.getSlope(p.x,p.z)>.6)return 'Pendiente fuerte. Revisar apoyo y acceso';
  const ruins=Math.hypot(p.x+220,p.z+180);
  if(['house','hub','npc'].includes(h.kind)&&ruins<45)return 'Muy cerca de la cripta / ruinas hostiles';
  return '';
 }
 setTool(tool){
  this.tool=tool;
  for(const b of this.root.querySelectorAll('[data-action^="tool-"]'))
    b.setAttribute('aria-pressed',String(b.dataset.action==='tool-'+tool));
  this.notify(tool==='move'?'Arrastrá el objeto seleccionado.':'Seleccioná un objeto del mapa.');
 }
 editField(h,id,value){
  const p=this.coords(h);
  if(id==='x'||id==='z'){
    if(!finite(value)){this.notify('Coordenada fuera de rango',true);return;}
    this.move(h,id==='x'?value:p.x,id==='z'?value:p.z);
  }else if(id==='scale'){
    if(value<0.3||value>4){this.notify('Escala admitida: 0.3 a 4',true);return;}
    if(h.kind==='house'){
      const v=this.transform(h);v.scale=value;adjustHouseP193(this.g,h.object,v);
    }else h.object.scale.setScalar(value);
  }else if(id==='rotation'){
    if(!Number.isFinite(value)||Math.abs(value)>1000)return;
    if(h.kind==='house'){
      const v=this.transform(h);v.rotation=value;adjustHouseP193(this.g,h.object,v);
    }else{h.object.rotation.y=value;if(h.ref?.yaw!==undefined)h.ref.yaw=value;}
  }
  this.captureHistory();this.renderList();this.renderInspector();
 }
 transform(h){
  const p=this.coords(h);
  return {x:p.x,z:p.z,rotation:h.kind==='hub'?0:h.object.rotation.y,
    scale:h.kind==='hub'?1:h.object.scale.x,hidden:h.object?!h.object.visible:false};
 }
 move(h,x,z,shiftRelated=true){
  if(!finite(x)||!finite(z))return;
  const p=this.coords(h);const dx=x-p.x,dz=z-p.z;
  if(h.kind==='hub'){
    h.ref.pos={x,z,y:this.g.terrain.getHeight(x,z)};
    if(shiftRelated&&Math.hypot(dx,dz)>0){
      for(const other of this.handles.values()){
        if(other!==h&&(other.ref===h.ref||other.ref?.p192HubId===h.ref.hub.id)){
          const pos=this.coords(other);this.move(other,pos.x+dx,pos.z+dz,false);
        }
      }
    }
  }else if(h.kind==='house'){
    const v=this.transform(h);v.x=x;v.z=z;adjustHouseP193(this.g,h.object,v);
    const key=h.id;
    if(key.startsWith('village:house:')){
      const idx=Number(key.split(':').at(-1)),st=this.g.structures;
      if(st.housePositions[idx])st.housePositions[idx].set(x,h.object.position.y+5.3,z);
      for(const door of st.enterableDoors){
        const match=door.id==='inn'?1:door.id==='olaf_house'?3:door.id==='smithy'?5:-1;
        if(match===idx)door.pos.copy(st._doorAnchor(h.object));
      }
    }
  }else{
    h.object.position.set(x,this.g.terrain.getHeight(x,z),z);
    if(h.ref?.wander){h.ref.wander.homeX=x;h.ref.wander.homeZ=z;h.ref.wander.target=null;}
  }
 }
 captureLayout(){
  const layout=emptyWorldLayoutP193();
  for(const h of this.handles.values()){
    const p=this.coords(h);if(!finite(p.x)||!finite(p.z))continue;
    if(h.kind==='hub'){
      if(h.ref?.pos)layout.hubs[h.id.slice(4)]={x:p.x,z:p.z};
    }else if(h.id.startsWith('added:')){
      const raw=h.ref;layout.added.push({id:raw.id,asset:raw.asset,kind:raw.kind,...this.transform(h)});
    }else layout.entities[h.id]=this.transform(h);
  }
  return normalizeWorldLayoutP193(layout);
 }
 captureHistory(){
  const json=JSON.stringify(this.captureLayout());
  if(this.history[this.historyIndex]===json)return;
  this.history=this.history.slice(0,this.historyIndex+1);this.history.push(json);
  if(this.history.length>100)this.history.shift();
  this.historyIndex=this.history.length-1;this.dirty=true;
 }
 undo(){if(this.historyIndex<=0)return;this.importLayout(JSON.parse(this.history[--this.historyIndex]),false);}
 redo(){if(this.historyIndex>=this.history.length-1)return;this.importLayout(JSON.parse(this.history[++this.historyIndex]),false);}
 importLayout(layout,addHistory=true){
  const valid=normalizeWorldLayoutP193(layout),g=this.g;
  // Match added objects by ID; no unsafe eval or arbitrary asset URLs.
  for(const old of [...g.p193Added]){
    if(valid.added.some(v=>v.id===old.id))continue;
    this.removeAdded(old);
  }
  for(const item of valid.added){
    let existing=g.p193Added.find(x=>x.id===item.id);
    if(!existing){
      existing=spawnAddedP193(g,item);if(existing)g.p193Added.push(existing);
    }
  }
  this.scan();
  for(const [id,v] of Object.entries(valid.hubs)){
    const h=this.handles.get('hub:'+id);
    if(h)this.move(h,v.x,v.z,false);
  }
  for(const [id,v] of Object.entries(valid.entities)){
    const h=this.handles.get(id);
    if(!h)continue;
    this.move(h,v.x,v.z,false);
    if(h.object){
      if(h.kind==='house')adjustHouseP193(g,h.object,v);
      else{h.object.rotation.y=v.rotation;h.object.scale.setScalar(v.scale);
        h.object.visible=!v.hidden;if(h.ref?.yaw!==undefined)h.ref.yaw=v.rotation;}
    }
  }
  for(const item of valid.added){
    const h=this.handles.get('added:'+item.id);
    if(!h)continue;
    this.move(h,item.x,item.z,false);
    if(h.kind==='house')adjustHouseP193(g,h.object,item);
    else{h.object.rotation.y=item.rotation;h.object.scale.setScalar(item.scale);
      h.object.visible=!item.hidden;if(h.ref?.npc)h.ref.npc.yaw=item.rotation;}
  }
  g.worldLayoutP193=valid;
  this.scan();if(addHistory)this.captureHistory();
  this.notify('Distribución cargada en escena. Aún no se ha publicado.');
 }
 removeAdded(item){
  item.group?.removeFromParent();
  if(item.npc)this.g.npcs.list=this.g.npcs.list.filter(n=>n!==item.npc);
  if(item.group?.userData.p193Collider){
    const c=item.group.userData.p193Collider;
    this.g.structures.colliders=this.g.structures.colliders.filter(x=>x!==c);
  }
  this.g.p193Added=this.g.p193Added.filter(x=>x!==item);
 }
 newAdded(asset,x=this.focus.x+8,z=this.focus.z+8){
  const def=P193_LIBRARY.find(a=>a.id===asset);
  if(!def)return;
  const id='wf'+Date.now().toString(36)+Math.round(Math.random()*999).toString(36);
  const obj=spawnAddedP193(this.g,{id,asset,kind:def.type,x,z,rotation:0,scale:1});
  if(!obj){this.notify('Modelo no disponible en los assets de esta demo.',true);return;}
  this.g.p193Added.push(obj);this.scan();this.select('added:'+id);this.captureHistory();
  this.setTool('move');this.notify('Colocado '+def.label+'. Arrastralo hasta su ubicación.');
 }
 duplicateSelected(){
  const h=this.selected;if(!h||h.kind==='hub')return;
  const p=this.coords(h);
  const asset=h.kind==='house'?'house':
    h.id.startsWith('added:')?h.ref.asset:
    h.kind==='npc'?({'sigrid':'npc_knight','olaf':'npc_mage'}[h.ref?.id]||'npc_rogue'):null;
  if(asset)this.newAdded(asset,p.x+9,p.z+6);
 }
 deleteSelected(){
  const h=this.selected;
  if(!h?.id.startsWith('added:'))return;
  this.removeAdded(h.ref);this.selected=null;this.scan();this.captureHistory();
 }
 renderLibrary(){
  this.library.replaceChildren();
  node('p',this.library,'hf-note','Recursos físicamente presentes en P192. No carga packs comerciales ni GLB propietarios en un repo público.');
  for(const asset of P193_LIBRARY){
    const installed=asset.id==='house'||!!this.g.assets._lib[asset.id];
    const b=this.addButton(this.library,'+ '+asset.label+(installed?'':' (no instalado)'),
      ()=>this.newAdded(asset.id));
    b.disabled=!installed;b.title=asset.license;
  }
  node('p',this.library,'hf-note','Los modelos adicionales KayKit SOURCE o ClaudeCraft solo se incorporan tras verificar licencia y alojarlos en repositorio privado si corresponde.');
 }
 saveDraft(){
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(this.captureLayout()));
    this.dirty=false;this.notify('Borrador guardado en este navegador. Para llevarlo a la app, exportá JSON.');
  }catch(error){this.notify('No se pudo guardar localmente: '+error.message,true);}
 }
 loadDraft(){
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(raw){this.importLayout(JSON.parse(raw));this.notify('Se recuperó el último borrador local (no publicado).');}
  }catch(error){this.notify('Borrador inválido: '+error.message,true);}
 }
 download(){
  const data=JSON.stringify(this.captureLayout(),null,2)+'\n';
  const blob=new Blob([data],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='world-layout-p193.json';document.body.appendChild(a);a.click();
  a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  this.notify('JSON exportado. Aplicalo en assets/world-layout-p193.json para compartirlo con todos.');
 }
 setView(){
  const f=this.focus,d=this.distance;
  if(this.mode==='2d')this.g.camera.position.set(f.x,f.y+d,f.z+.01);
  else this.g.camera.position.set(f.x+d*.55,f.y+d*.75,f.z+d*.55);
  this.g.camera.lookAt(f);
  this.g.camera.updateProjectionMatrix();
 }
 screenTerrain(e){
  const rect=this.g.renderer.domElement.getBoundingClientRect();
  this.pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  this.raycaster.setFromCamera(this.pointer,this.g.camera);
  const meshes=[...this.g.terrain.chunks.values()];
  const hit=this.raycaster.intersectObjects(meshes,false)[0];
  if(hit)return {x:hit.point.x,z:hit.point.z};
  const pt=new THREE.Vector3();
  return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),pt)?
    {x:pt.x,z:pt.z}:null;
 }
 pick(e){
  const rect=this.g.renderer.domElement.getBoundingClientRect();
  this.pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  this.raycaster.setFromCamera(this.pointer,this.g.camera);
  const objects=[...this.handles.values()].filter(h=>h.object&&h.object.visible);
  const hits=this.raycaster.intersectObjects(objects.map(x=>x.object),true);
  for(const hit of hits){
    let o=hit.object;
    while(o){
      const handle=objects.find(h=>h.object===o);
      if(handle)return handle;o=o.parent;
    }
  }
  return null;
 }
 installPointer(){
  const canvas=this.g.renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{
    if(e.button===2){this.drag={kind:'camera',x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if(e.button!==0)return;
    if(this.tool==='place-hub'&&this.selected?.kind==='hub'){
      const loc=this.screenTerrain(e);
      if(loc){this.move(this.selected,loc.x,loc.z);this.captureHistory();this.scan();this.select(this.selected.id);}
      this.setTool('select');return;
    }
    const found=this.pick(e);
    if(found&&this.selected!==found)this.select(found.id);
    if(found&&this.tool==='move'){
      const pos=this.screenTerrain(e),p=this.coords(found);
      this.drag={kind:'entity',id:found.id,ox:p.x-(pos?.x??p.x),oz:p.z-(pos?.z??p.z)};
      canvas.setPointerCapture(e.pointerId);
    }else if(!found)this.drag={kind:'camera',x:e.clientX,y:e.clientY};
  });
  canvas.addEventListener('pointermove',e=>{
    if(!this.drag)return;
    if(this.drag.kind==='camera'){
      const mx=e.clientX-this.drag.x,my=e.clientY-this.drag.y;
      this.drag.x=e.clientX;this.drag.y=e.clientY;
      const scale=this.distance/Math.max(500,window.innerHeight);
      this.focus.x-=mx*scale;this.focus.z+=my*scale;
      this.focus.y=this.g.terrain.getHeight(this.focus.x,this.focus.z);this.setView();
    }else{
      const h=this.handles.get(this.drag.id),pos=this.screenTerrain(e);
      if(h&&pos){this.move(h,pos.x+this.drag.ox,pos.z+this.drag.oz);this.setView();}
    }
  });
  const finish=()=>{
    if(!this.drag)return;
    const wasEntity=this.drag.kind==='entity';this.drag=null;
    if(wasEntity){this.captureHistory();this.renderList();this.renderInspector();}
  };
  canvas.addEventListener('pointerup',finish);
  canvas.addEventListener('pointercancel',finish);
  canvas.addEventListener('wheel',e=>{
    if(this.root.contains(e.target))return;
    this.distance=Math.max(25,Math.min(950,this.distance*Math.exp(e.deltaY*.001)));
    this.setView();e.preventDefault();
  },{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
 }
 installHotkeys(){
  window.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){
      e.preventDefault();if(e.shiftKey)this.redo();else this.undo();
    }
    if(e.code==='KeyG')this.setTool('move');
    if(e.code==='Escape')this.setTool('select');
  });
 }
 cameraTick(){
  if(!document.body.contains(this.root))return;
  const keys=this.g.input.keys;
  if(!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
    const d=Math.max(0.4,this.distance*.007);
    if(keys.has('KeyW')||keys.has('ArrowUp'))this.focus.z-=d;
    if(keys.has('KeyS')||keys.has('ArrowDown'))this.focus.z+=d;
    if(keys.has('KeyA')||keys.has('ArrowLeft'))this.focus.x-=d;
    if(keys.has('KeyD')||keys.has('ArrowRight'))this.focus.x+=d;
    this.focus.y=this.g.terrain.getHeight(this.focus.x,this.focus.z);
    this.setView();
  }
  requestAnimationFrame(()=>this.cameraTick());
 }
}

export function installWorldEditorP193(game){
  const editor=new WorldEditorP193(game);
  window.highflyWorldEditorP193=editor;
  return editor;
}
