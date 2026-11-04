/** P8-P10 HIGHFLY consolidated mobile HUD, genuine FPS + GPU unknown. */
const CSS="\nbody.hf-p810 #hf-touch{font-family:system-ui,Arial,sans-serif;--hf-purple:#e180ff;--hf-gold:#ffd174}\nbody.hf-p810 #hf-touch .hf-actions{display:none!important}\nbody.hf-p810 #hf-touch .hf-hint{display:none!important}\nbody.hf-p810 #hf-touch .hf-p810-control{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;\n border:2px solid #9c65e2;border-radius:50%;color:#fff6e9;font:800 10px system-ui;line-height:1.05;text-align:center;\n background:radial-gradient(circle at 28% 22%,#70439cbc,#21113ceb 66%,#0b102af0);\n box-shadow:inset 0 0 13px #be5efe55,0 0 9px #09021baa;text-shadow:0 1px 3px #000;\n touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;z-index:48}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-down{background:#7d3ab1}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-atk{font-size:20px;border:3px solid #ffcd83;\n background:radial-gradient(circle at 28% 20%,#a960ab,#50238c 44%,#190c40 84%);\n box-shadow:0 0 16px #f5a65f99,inset 0 0 12px #ffcf9b55}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-s1{border-color:#8ff0ff;color:#d7fcff}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-run{border-color:#ead4ff;background:radial-gradient(circle at 30% 30%,#623c92,#21123e)}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-jump{border-color:#ecb7ff}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-dash{border-color:#8cdbff}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-use{border-color:#ffdb86}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p5-locked{opacity:.38!important;filter:grayscale(.7)}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p6-lock,\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p6-next,\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p6-clear{font-size:9px;border-color:#f3c784}\nbody.hf-p810 #hf-touch .hf-p810-control.hf-p6-clear{background:#31142e;color:#ffdee7}\nbody.hf-p810 .hf-joy{border:2px solid #d495ff!important;border-radius:50%;\n background:radial-gradient(circle,#1614449d,#1d1044a8)!important;box-shadow:0 0 12px #ac52ee77}\nbody.hf-p810 .hf-knob{border-color:#ffdda1;background:#ae5bf388}\nbody.hf-p810 #hf-p5-header{color:#fff3e2;pointer-events:none}\nbody.hf-p810 .hf-p5-name{font-size:12px;color:#ffe2aa}\nbody.hf-p810 .hf-p5-avatar{border-color:#f8ba83;background:linear-gradient(130deg,#6f3bc2,#211545);box-shadow:0 0 7px #d75fff}\nbody.hf-p810 .hf-p5-stat{border-color:#bd70dc55;background:#120e36c7;height:16px}\nbody.hf-p810 .hf-p5-fill.sp{background:linear-gradient(90deg,#8d5b00,#f6c548)}\nbody.hf-p810 .hf-p5-invlinks{display:none!important}\nbody.hf-p810 .hf-p6-target{font:700 10px system-ui;color:#fff0bf}\nbody.hf-p810 #hf-worldmini{border-radius:50%!important;display:flex;align-items:center;justify-content:center;\n padding:4px!important;background:radial-gradient(circle,#1c1544,#080820)!important;\n border:2px solid #f5c07c!important;box-shadow:0 0 0 2px #993de677,0 0 16px #b74aff88!important;overflow:hidden}\nbody.hf-p810 #hf-worldmini canvas{width:100%!important;height:100%!important;aspect-ratio:1!important;border-radius:50%!important}\nbody.hf-p810 #hf-worldcoords{display:none!important}\nbody.hf-p810 #hf-worldpanel{background:linear-gradient(140deg,#25104c,#0c1030)!important;border:2px solid #f4ae72!important;box-shadow:0 0 25px #d258f866}\nbody.hf-p810 #hf-worldbig{border:2px solid #ab64e0!important;border-radius:50%!important}\nbody.hf-p810 #hf-worldoverlay{background:#08041eea!important}\nbody.hf-p810 .hf-p810-icon{border-radius:14px!important;font-size:10px!important;letter-spacing:0;\n border:1px solid #eab56c!important;background:linear-gradient(145deg,#653586,#211040)!important;\n box-shadow:0 0 12px #b24eff88,inset 0 0 9px #ffbd7455!important}\nbody.hf-p810 #hf-p810-perf{z-index:46;background:#120e2ddc;color:#ffdcba;min-height:18px;max-width:170px;\n border:1px solid #bd75d077;border-radius:7px;padding:3px 5px;font:600 9px system-ui;text-align:center;\n pointer-events:none;white-space:nowrap;box-shadow:0 0 7px #5c286755}\nbody.hf-p810 #hf-p810-combo{z-index:46;border:1px solid #9d5af966;border-radius:11px 11px 0 0;\n background:linear-gradient(90deg,#190c32c9,#301052c9,#190c32c9);\n color:#ffdd92;min-height:23px;padding:3px 9px;font:800 12px system-ui;letter-spacing:1.6px;\n text-align:center;pointer-events:none;white-space:nowrap;text-shadow:0 0 8px #b35bff;\n box-shadow:0 0 12px #6a1cd755}\nbody.hf-p810 #hf-p810-combo:empty{display:none}\nbody.hf-p810 #hf-p810-quick{position:fixed;right:max(8px,env(safe-area-inset-right));top:45%;z-index:89;\n width:min(216px,39vw);display:none;flex-direction:column;gap:5px;padding:10px;\n color:#f9e8ff;background:linear-gradient(140deg,#2b1054,#101029ef);\n border:2px solid #d878e8;border-radius:15px;box-shadow:0 0 25px #a140dcb0}\nbody.hf-p810 #hf-p810-quick.open{display:flex}\nbody.hf-p810 #hf-p810-quick button{color:#fff4d9;border:1px solid #a767de;\n background:linear-gradient(90deg,#442062,#21113c);border-radius:9px;\n padding:9px 8px;min-height:36px;text-align:left;font:bold 11px system-ui;touch-action:manipulation}\nbody.hf-p810 #hf-p810-quick button:active{background:#743888}\nbody.hf-p810 #hf-p810-mapzoom{position:fixed;z-index:46;display:flex;flex-direction:column;gap:4px}\nbody.hf-p810 #hf-p810-mapzoom button{height:26px;width:27px;border:1px solid #f1bc81;border-radius:9px;\n background:#301452ec;color:#ffe9bc;font:bold 17px system-ui}\nbody.hf-p810 #hf-p10-editor{z-index:130;position:fixed;top:max(6px,env(safe-area-inset-top));\n left:50%;transform:translateX(-50%);width:min(670px,94vw);max-height:50vh;overflow:auto;\n border:2px solid #ffcd81;border-radius:14px;background:linear-gradient(110deg,#281147f2,#10102cf2);\n box-shadow:0 0 20px #9f4aedab;color:#fff2dd;padding:10px;font:11px system-ui;touch-action:pan-y}\nbody.hf-p810 .hf-p10-editor-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px}\nbody.hf-p810 #hf-p10-editor button{background:linear-gradient(90deg,#623586,#361456);color:#fff1d2;\n border:1px solid #e8af72;border-radius:7px;padding:6px 9px;min-height:32px}\nbody.hf-p810 #hf-p10-editor select{background:#1c1640;color:#ffdfae;padding:5px;border:1px solid #ab74c0;border-radius:6px}\nbody.hf-p810 .hf-p10-editor-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:8px}\nbody.hf-p810 .hf-p10-editor-slider{display:flex;gap:5px;align-items:center;max-width:160px}\nbody.hf-p810 .hf-p10-editor-slider input{accent-color:#edab57;width:100px}\nbody.hf-p810 .hf-p10-editor-buttons{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}\nbody.hf-p810 .hf-p10-editor-hint{font-size:10px;color:#c6b5e1;margin-top:6px}\nbody.hf-p810.hf-p10-editing [data-hf-hud-id]{outline:2px dashed #74dcff!important;outline-offset:3px}\nbody.hf-p810.hf-p10-editing .hf-p10-selected{outline:3px solid #ffcc78!important;outline-offset:3px}\nbody.hf-p810.hf-p10-editing #hf-p810-combo:empty{display:block}\nbody.hf-p810 #hf-p5-overlay{background:#070319e8;backdrop-filter:blur(6px)}\nbody.hf-p810 #hf-p5-overlay .hf-p5-panel{width:min(1250px,97.5vw);height:min(760px,95vh);\n background:linear-gradient(135deg,#28104a,#0f0d2a 55%,#2e124a);\n border:2px solid #cd79ef;border-radius:18px;box-shadow:0 0 0 2px #fabd7655,0 0 35px #a62cec99,inset 0 0 27px #b642df24}\nbody.hf-p810 .hf-p5-tabs{padding:6px 12px;border-bottom:1px solid #dba16c;gap:9px;background:#150b2e}\nbody.hf-p810 .hf-p5-tabs button{padding:8px 13px;border:1px solid #a263c6;border-radius:9px;color:#f0d4fc;font-size:12px}\nbody.hf-p810 .hf-p5-tabs button.active{background:linear-gradient(100deg,#995e29,#4f205b);color:#ffe4b0;border:1px solid #ffcd78}\nbody.hf-p810 .hf-p5-tabs button.close{margin-left:auto;border-color:#7cbeff;background:#162044}\nbody.hf-p810 .hf-p5-body{gap:11px;padding:11px}\nbody.hf-p810 .hf-p5-list{overflow:auto}\nbody.hf-p810 .hf-p5-detail{background:linear-gradient(140deg,#2b124c,#150e34);border:1px solid #be74e4;padding:10px}\nbody.hf-p810 .hf-p5-detail h3{color:#ffdb86}\nbody.hf-p810 .hf-p5-detail button{color:#fff1cb;border-color:#e9b17b;background:linear-gradient(110deg,#9b592e,#512078)}\nbody.hf-p810 .p7-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}\nbody.hf-p810 .p7-cell{background:radial-gradient(ellipse at 40% 20%,#60267b,#120d30 75%);border-radius:11px}\nbody.hf-p810 .p7-layout{grid-template-columns:1fr 1.3fr 1fr}\nbody.hf-p810 .p7-preview-stage{min-height:195px}\nbody.hf-p810 .p7-head{padding-bottom:10px}\nbody.hf-p810 .p7-title{color:#ffdcaa;font-family:Georgia,serif}\nbody.hf-p810 .p7-gearslot{min-height:48px}\nbody.hf-p810 .hf-p9-mission-list{display:flex;flex-direction:column;gap:7px}\nbody.hf-p810 .hf-p9-mission-row{background:#291444;border:1px solid #8b5ac3;border-radius:10px;\n color:#f6e1f9;padding:9px;min-height:65px;text-align:left;font:11px system-ui;display:flex;flex-direction:column;gap:4px}\nbody.hf-p810 .hf-p9-mission-row.selected{border-color:#f8bb6b;box-shadow:0 0 11px #cb64fd80}\nbody.hf-p810 .hf-p9-mission-row strong{color:#ffe0a2;font-size:13px}\nbody.hf-p810 .hf-p9-mission-row small{color:#b7a5d5;font-size:10px}\nbody.hf-p810 .hf-p9-progress{height:9px;border:1px solid #bc84ff;border-radius:9px;overflow:hidden;background:#100b26}\nbody.hf-p810 .hf-p9-progress>span{display:block;height:100%;background:linear-gradient(90deg,#652ce7,#e68aff)}\nbody.hf-p810 .hf-p9-filters{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}\nbody.hf-p810 .hf-p9-filters button{color:#f4e4ff;background:#291244;border:1px solid #a56aca;padding:7px 9px;border-radius:8px;font-size:10px}\nbody.hf-p810 .hf-p9-filters button.active{color:#ffeab3;background:#84512e;border-color:#ffd887}\nbody.hf-p810 .hf-p9-settings-menu{display:flex;flex-direction:column;gap:7px;width:31%;min-width:110px}\nbody.hf-p810 .hf-p9-settings-menu button{border:1px solid #955fc2;border-radius:9px;color:#f6e6ff;background:#30144a;padding:9px;text-align:left;font:bold 11px system-ui}\nbody.hf-p810 .hf-p9-settings-menu button.active{border-color:#ffe098;background:#8b4e2b}\nbody.hf-p810 .hf-p9-settings-rows{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}\nbody.hf-p810 .hf-p9-settings-rows label{display:flex;align-items:center;justify-content:space-between;gap:7px;background:#20103e;\n border:1px solid #874fb0;border-radius:9px;padding:8px;color:#e5d9ff;font:11px system-ui}\nbody.hf-p810 .hf-p9-settings-rows input{accent-color:#f5b56b;max-width:55%}\nbody.hf-p810 .hf-p9-settings-rows button,body.hf-p810 .hf-p9-settings-rows select{color:#fff4dc;background:#54236e;\n border:1px solid #d49b69;border-radius:9px;padding:8px;min-height:30px}\nbody.hf-p810 .hf-p9-side{display:flex;flex-direction:column;gap:7px}\nbody.hf-p810 .hf-p9-gold{color:#ffd891;font-size:13px;font-weight:bold}\nbody.hf-p810 .hf-p9-muted{color:#c8afd9;font-size:11px}\n@media(max-height:440px){\n body.hf-p810 .hf-p5-tabs{padding:4px 8px}\n body.hf-p810 .hf-p5-tabs button{padding:5px 10px;font-size:10px}\n body.hf-p810 .hf-p5-body{padding:6px;gap:7px}\n body.hf-p810 #hf-p5-overlay .hf-p5-panel{height:96vh}\n body.hf-p810 .p7-gearslot{min-height:40px}\n body.hf-p810 .p7-grid{grid-template-columns:repeat(7,minmax(0,1fr))}\n}\n@media(max-width:750px){body.hf-p810 .hf-p5-tabs button{font-size:9px;padding:6px 7px}\n body.hf-p810 .hf-p5-detail{width:34%;min-width:145px}\n body.hf-p810 .p7-grid{grid-template-columns:repeat(4,minmax(0,1fr))}\n}\n";

import { HudEditorP10 } from './p10-hud-editor.js';
import { HighflyPanelsP9 } from './p9-panels.js';
const node=(tag,cls,txt,parent)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;
 if(parent)parent.appendChild(e);return e;
};
const BUTTONS=[
 ['run','.hf-p5-run','CORRER'],['jump','.hf-p5-jump','SALTO'],['dash','.hf-p5-dash','DASH'],
 ['use','.hf-p5-use','USAR'],['s1','.hf-p5-s1','S1'],['atk','.hf-p5-atk','ATK'],
 ['s2','.hf-p5-s2','S2'],['s3','.hf-p5-s3','S3'],['s4','.hf-p5-s4','S4'],
 ['lock','.hf-p6-lock','FIJAR'],['next','.hf-p6-next','SIG.'],['clear','.hf-p6-clear','✕']
];
export class HighflyP810{
 constructor(hud){
  this.hud=hud;this.game=hud.game;this.touch=hud.touch;
  this.frames=0;this.fps=0;this.ms=16.7;this.lastStatsUpdate=0;
  this._mapMounted=false;this.quickOpen=false;
  this.panels=new HighflyPanelsP9(hud,this);
  document.body.classList.add('hf-p810');
  const style=node('style',null,CSS,document.head);style.id='highfly-p810-style';
  this.editor=new HudEditorP10(hud);
  this.mountHud();
  this.editor.apply();
  this.panels.updateTabs();
 }
 mountHud(){
  const root=this.touch.root;
  const nativePause=root.querySelector('.hf-menu');
  if(nativePause)nativePause.style.setProperty('display','none','important');
  const joy=root.querySelector('.hf-joy');
  this.editor.register('joy',joy);
  for(const [id,sel] of BUTTONS){
   const btn=root.querySelector(sel);if(!btn)continue;
   // All attack controls become siblings of the joystick: no transformed
   // parent or inherited z-index can generate phantom hit areas.
   root.appendChild(btn);
   btn.classList.add('hf-p810-control');
   btn.setAttribute('aria-label',btn.textContent.replace(/\s+/g,' ').trim());
   this.editor.register(id,btn);
  }
  const header=root.querySelector('#hf-p5-header');
  this.editor.register('header',header);
  const bag=node('button','hf-p810-control hf-p810-icon','🎒\nMOCHILA',root);
  bag.type='button';bag.id='hf-p810-bag';
  bag.addEventListener('pointerdown',e=>{
   if(this.editor.editing)return;
   e.preventDefault();e.stopPropagation();
   if(this.game.state==='playing')this.hud.show('bag');
  });
  this.editor.register('bag',bag);
  const menu=node('button','hf-p810-control hf-p810-icon','✥\nMENÚ',root);
  menu.type='button';menu.id='hf-p810-menu';
  menu.addEventListener('pointerdown',e=>{
   if(this.editor.editing)return;
   e.preventDefault();e.stopPropagation();this.toggleQuickMenu();
  });
  this.editor.register('menu',menu);
  const perf=node('div',null,'FPS — · GPU —',document.body);
  perf.id='hf-p810-perf';this.perf=perf;
  this.editor.register('perf',perf);
  const combo=node('div',null,'',document.body);
  combo.id='hf-p810-combo';this.combo=combo;
  this.editor.register('combo',combo);
  this.quick=node('nav',null,undefined,document.body);
  this.quick.id='hf-p810-quick';this.quick.setAttribute('aria-label','Menú rápido HIGHFLY');
  const items=[
   ['⚔ INVENTARIO',()=>this.hud.show('equipment')],
   ['🎒 MOCHILA',()=>this.hud.show('bag')],
   ['✦ MISIONES',()=>this.hud.show('quests')],
   ['⚙ AJUSTES',()=>this.hud.show('settings')],
   ['✥ EDITAR HUD',()=>this.editor.start()],
   ['◎ MAPA',()=>this.game.worldMapP34?.toggle(true)],
   ['▣ GUARDAR',()=>this.game.saveSys?.save()],
   ['Ⅱ PAUSAR',()=>this.game.setState('paused')]
  ];
  for(const [label,fn] of items){
   const btn=node('button',null,label,this.quick);btn.type='button';
   btn.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();this.toggleQuickMenu(false);fn();
   });
  }
  document.addEventListener('pointerdown',e=>{
   if(!this.quickOpen||this.quick.contains(e.target)||e.target.closest?.('#hf-p810-menu'))return;
   this.toggleQuickMenu(false);
  },true);
 }
 toggleQuickMenu(on){
  const next=on===undefined?!this.quickOpen:Boolean(on);
  if(next && this.game.state!=='playing')return;
  this.quickOpen=next;this.quick.classList.toggle('open',next);
 }
 mountMap(){
  const map=this.game.worldMapP34;
  if(!map?.mini)return;
  this._mapMounted=true;
  this.editor.register('radar',map.mini);
  map.zoom=120;
  const zoom=node('div',null,undefined,document.body);
  zoom.id='hf-p810-mapzoom';
  for(const [label,delta] of [['+',-25],['−',25]]){
   const b=node('button',null,label,zoom);
   b.type='button';b.setAttribute('aria-label',delta<0?'Acercar radar':'Alejar radar');
   b.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    map.zoom=Math.max(55,Math.min(300,map.zoom+delta));
    map.drawMini();
   });
  }
  this.zoom=zoom;
  if(this.game.state==='playing')map.buildAtlas();
  this.editor.apply();
 }
 update(dt){
  if(!this._mapMounted && this.game.worldMapP34)this.mountMap();
  const visible=this.game.state==='playing';
  if(this._mapMounted){
   this.game.worldMapP34.mini.style.visibility=visible?'visible':'hidden';
   if(visible&&!this.game.worldMapP34.atlasStarted)this.game.worldMapP34.buildAtlas();
  }
  if(this.quickOpen&&!visible)this.toggleQuickMenu(false);
  if(this.perf)this.perf.style.visibility=visible?'visible':'hidden';
  if(this.combo){
   const c=this.game.combat;
   this.combo.textContent=visible&&(c?.comboTimer>0||this.editor.editing)
      ?'⚔ COMBO '+(c?.comboStep||1)+' / 4'+(c?.comboStep===4?' ✦ FINAL':''):'';
  }
  if(this.zoom){
   this.zoom.style.display=visible&&!this.editor.editing?'flex':'none';
   const radar=this.game.worldMapP34?.mini?.getBoundingClientRect();
   if(radar){this.zoom.style.left=Math.min(window.innerWidth-31,radar.right+2)+'px';this.zoom.style.top=Math.max(5,radar.top+radar.height/2-28)+'px';}
  }
  if(!visible)return;
  this.frames++;
  if(dt>0.001)this.ms=this.ms*.88+dt*1000*.12;
  this.lastStatsUpdate+=dt;
  if(this.lastStatsUpdate<.45)return;
  this.lastStatsUpdate=0;
  const fps=Math.max(1,Math.min(240,Math.round(1000/this.ms)));
  const profile=this.game.performanceP2?.preset||'—';
  // Browser WebGL does not provide reliable GPU utilization %. Do not invent it.
  this.perf.textContent='FPS '+fps+' · GPU — · '+profile;
 }
}
