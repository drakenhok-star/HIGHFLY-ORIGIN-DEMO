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
 'gap:7px;width:min(336px,69vw);max-height:min(300px,78vh);',
 'overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;',
 'padding:9px;align-items:stretch}',
 'body.hf-p810 #hf-p810-quick.hf-p187-nav.open{display:flex}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar{',
 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:4px;flex-shrink:0}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar .hf-p187-tab{',
 'display:flex;flex-direction:column;align-items:center;justify-content:center;',
 'box-sizing:border-box;white-space:nowrap;min-width:0;width:100%;min-height:39px;',
 'padding:4px 2px;font:800 9px/1.15 system-ui;text-align:center;',
 'border-radius:8px;border:1px solid #7566ad;background:#1a2045;',
 'color:#e8d5fa;touch-action:manipulation}',
 'body.hf-p810 #hf-p810-quick .hf-p187-tabbar .hf-p187-tab[aria-selected="true"]{',
 'color:#fff3ce;border-color:#ffe0a1;background:#624085;box-shadow:0 0 9px #cf9bff77}',
 'body.hf-p810 #hf-p810-quick .hf-p187-group{',
 'display:flex;flex-wrap:wrap;width:100%;gap:6px;flex-shrink:0;align-content:start;align-items:start}',
 'body.hf-p810 #hf-p810-quick .hf-p187-group[hidden]{display:none!important}',
 'body.hf-p810 #hf-p810-quick .hf-p187-group>button{',
 'flex:1 1 calc(50% - 6px);width:auto;min-height:40px;max-width:100%;',
 'text-align:center;padding:7px 5px}',
 '@media(max-height:420px){',
 'body.hf-p810 #hf-p810-quick.hf-p187-nav{max-height:78vh;top:9vh}',
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
