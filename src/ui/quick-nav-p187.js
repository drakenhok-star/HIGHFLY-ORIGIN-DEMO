/**
 * HIGHFLY P187 — organized sections inside the ORIGINAL quick menu.
 * Reuses old actions without replacing event listeners, HUD coordinates,
 * backpack, quest state, SaveSys, or FURY bindings.
 */
export const P187_QUICK_SECTIONS=Object.freeze([
 Object.freeze({id:'aventura',label:'AVENTURA',icon:'🗺'}),
 Object.freeze({id:'combate',label:'COMBATE',icon:'⚔'}),
 Object.freeze({id:'oficios',label:'OFICIOS',icon:'⚒'}),
 Object.freeze({id:'sistema',label:'SISTEMA',icon:'⚙'})
]);
const E=(tag,parent,cls,text)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 parent.appendChild(e);
 return e;
};
const groupOf=(label)=>/AJUSTES|EDITAR HUD|GUARDAR|PAUSAR/i.test(label||'')?'sistema':'aventura';
const CSS=[
 'body.hf-p810 #hf-p810-quick.hf-p187-nav{',
 'box-sizing:border-box;display:none;flex-direction:column;flex-wrap:nowrap;',
 'gap:11px;left:50%;top:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);',
 'z-index:249;width:min(1250px,97.5vw);height:min(760px,95vh);max-height:95vh;',
 'overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;',
 'padding:12px 14px;align-items:stretch;',
 'background:linear-gradient(135deg,#28104a,#0f0d2a 55%,#2e124a);',
 'border:2px solid #cd79ef;border-radius:18px;box-shadow:0 0 0 2px #fabd7655,0 0 35px #a62cec99}',
 'body.hf-p810 #hf-p810-quick.hf-p187-nav.open{display:flex}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar{',
 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:8px;flex-shrink:0}',
 'body.hf-p810 #hf-p810-quick .hf-p187-head{',
 'display:flex;justify-content:space-between;align-items:center;gap:10px;',
 'color:#ffdfab;font:800 16px/1.2 system-ui;flex-shrink:0}',
 'body.hf-p810 #hf-p810-quick .hf-p187-head button{',
 'width:auto;min-height:38px;flex:none;padding:8px 13px;border:1px solid #a8ceff;',
 'background:#26314e;color:white;font:700 12px system-ui;border-radius:9px}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar .hf-p187-tab{',
 'display:flex;flex-direction:column;align-items:center;justify-content:center;',
 'box-sizing:border-box;white-space:nowrap;min-width:0;width:100%;min-height:39px;',
 'padding:8px 6px;font:800 12px/1.15 system-ui;text-align:center;',
 'border-radius:8px;border:1px solid #7566ad;background:#1a2045;',
 'color:#e8d5fa;touch-action:manipulation}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar .hf-p187-tab[aria-selected="true"]{',
 'color:#fff3ce;border-color:#ffe0a1;background:#624085;box-shadow:0 0 9px #cf9bff77}',
 'body.hf-p810 #hf-p810-quick .hf-p187-group{',
 'display:flex;flex-wrap:wrap;width:100%;gap:10px;flex:1 1 auto;',
 'min-height:0;overflow-y:auto;touch-action:pan-y;align-content:start;align-items:start}',
 'body.hf-p810 #hf-p810-quick .hf-p187-group[hidden]{display:none!important}',
 'body.hf-p810 #hf-p810-quick .hf-p187-group>button{',
 'flex:1 1 calc(50% - 10px);width:auto;min-height:56px;max-width:100%;',
 'text-align:center;padding:7px 5px}',
 '@media(max-height:420px){',
 'body.hf-p810 #hf-p810-quick.hf-p187-nav{height:95vh;max-height:95vh;top:50%}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar .hf-p187-tab{font-size:8px;min-height:33px}}'
].join('');
export class QuickNavP187{
 constructor(ui){
  this.ui=ui;this.root=ui.quick;
  this.sections=new Map();this.buttons=new Map();this.selected='aventura';
  if(!this.root)return;
  const style=E('style',document.head,null,CSS);style.id='hf-p187-quick-style';
  this.root.classList.add('hf-p187-nav');
  const original=Array.from(this.root.children).filter(el=>el.tagName==='BUTTON');
  const head=E('div',this.root,'hf-p187-head');
  E('strong',head,null,'✦ HIGHFLY · MENÚ DEL CAZADOR');
  const close=E('button',head,null,'✕ CERRAR');
  close.type='button';
  close.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();this.ui.toggleQuickMenu(false);
  });
  const bar=E('div',this.root,'hf-p187-tabbar');
  bar.setAttribute('role','tablist');
  bar.setAttribute('aria-label','Secciones de HIGHFLY');
  for(const section of P187_QUICK_SECTIONS){
   const tab=E('button',bar,'hf-p187-tab',section.icon+' '+section.label);
   tab.type='button';tab.id='hf-p187-tab-'+section.id;
   tab.setAttribute('role','tab');tab.setAttribute('aria-selected','false');
   tab.setAttribute('aria-controls','hf-p187-section-'+section.id);
   const panel=E('section',this.root,'hf-p187-group');
   panel.id='hf-p187-section-'+section.id;
   panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
   this.sections.set(section.id,{tab,panel});
   tab.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.select(section.id);});
  }
  for(const button of original)this.addAction(button,groupOf(button.textContent));
  this.select('aventura');
 }
 addAction(button,section='aventura'){
  if(!button||!this.root)return false;
  const destination=this.sections.get(section)||this.sections.get('aventura');
  if(!destination)return false;
  destination.panel.appendChild(button);
  this.buttons.set(button,section);
  return true;
 }
 select(section){
  this.selected=this.sections.has(section)?section:'aventura';
  for(const [id,parts] of this.sections){
   const active=id===this.selected;
   parts.tab.setAttribute('aria-selected',String(active));
   parts.tab.tabIndex=active?0:-1;
   parts.panel.hidden=!active;
  }
 }
}
