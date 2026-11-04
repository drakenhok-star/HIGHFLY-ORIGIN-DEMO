/**
 * HIGHFLY P5-A - HUD mobile premium, built on Tianjie5's REAL stats/inventory.
 * No images or private assets. MIT extension. Disable with ?hf_classic_hud=1.
 */
const LABELS = {
  iron_sword:'Espada de hierro', steel_sword:'Espada de acero',
  ancient_sword:'Espada ancestral', dragonbone_sword:'Espada de hueso de dragón',
  cloth_armor:'Ropa de tela', hide_armor:'Armadura de piel',
  dragonscale_armor:'Armadura de escamas de dragón',
  health_potion:'Poción de salud', mana_potion:'Poción de maná',
  wolf_pelt:'Piel de lobo', draugr_bone:'Restos de draugr',
  dragon_bone:'Hueso de dragón', dragon_scale:'Escama de dragón',
  ancient_relic:'Reliquia ancestral', frost_essence:'Esencia helada'
};
const ITEM_ICONS = {
  weapon:'⚔', armor:'🛡', potion:'✦', misc:'◆'
};
const QUEST_ES = {
  q1:['Amenaza de lobos','Eliminá cinco lobos de la zona.'],
  q2:['Espada ancestral','Recuperá la espada del cofre en las ruinas.'],
  q3:['Amenaza del dragón','Derrotá al dragón antiguo de la torre.']
};
const PRESET_STYLE = [
  '#hf-touch{font-family:system-ui,Arial,sans-serif!important}',
  'body.hf-p5 #hud .hud-bar,body.hf-p5 #hud .hud-shoutcd{display:none!important}',
  'body.hf-p5 #hud .hud-compass-wrap{display:none!important}',
  'body.hf-p5 #hf-audit{left:calc(min(254px,38vw) + 23px);top:max(8px,env(safe-area-inset-top));transform:scale(.82);transform-origin:top left}',
  'body.hf-p5 #hf-p2-switch{left:calc(min(254px,38vw) + 23px);top:max(43px,env(safe-area-inset-top) + 36px);transform:scale(.84);transform-origin:top left;min-width:105px}',
  'body.hf-p5 #hf-p2-note{display:none!important}',
  'body.hf-p5 #hf-fullscreen{right:calc(max(12px,env(safe-area-inset-right)) + 174px);transform:scale(.86);transform-origin:top right}',
  'body.hf-p5 #hud .hud-notify-stack{top:58px;right:calc(min(140px,34vh) + 25px);width:min(215px,23vw)}',
  'body.hf-p5 #hud .hud-notify{font-size:11px;letter-spacing:0;padding:5px 7px}',
  'body.hf-p5 #hf-worldmini{transform:scale(.79);transform-origin:top right;top:max(48px,env(safe-area-inset-top) + 44px)}',
  'body.hf-p5 #hf-worldcoords{font-size:10px}',
  'body.hf-p5 #hf-touch .hf-hint{display:none!important}',
  'body.hf-p5 .hf-joy{width:min(118px,33vh);height:min(118px,33vh)}',
  'body.hf-p5 .hf-joy:before{display:none}',
  'body.hf-p5 .hf-actions{display:block;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));width:min(310px,64vw);height:min(201px,58vh);gap:0}',
  'body.hf-p5 .hf-actions>.hf-btn{position:absolute;width:49px;height:49px;border-radius:50%;font-size:10px;line-height:1.05;background:linear-gradient(145deg,#183656e8,#101831eb);border:1px solid #66c8f6bd;box-shadow:inset 0 0 10px #3a9bb833,0 0 9px #090f25a8;color:white;text-shadow:0 1px 3px #000}',
  'body.hf-p5 .hf-actions>.hf-btn.hf-down{background:#326ba5}',
  'body.hf-p5 .hf-actions .hf-p5-hide{display:none}',
  'body.hf-p5 .hf-actions .hf-p5-atk{width:84px;height:84px;right:0;bottom:0;font-size:19px;border:2px solid #75e2ff;background:radial-gradient(circle at 30% 22%,#4156b2,#182b6c 68%,#09152f);box-shadow:0 0 13px #4babff88,inset 0 0 18px #99bdff55}',
  'body.hf-p5 .hf-actions .hf-p5-use{right:89px;bottom:0}',
  'body.hf-p5 .hf-actions .hf-p5-dash{right:143px;bottom:0}',
  'body.hf-p5 .hf-actions .hf-p5-jump{right:197px;bottom:0}',
  'body.hf-p5 .hf-actions .hf-p5-s1{right:100px;bottom:67px;border-color:#a781ff}',
  'body.hf-p5 .hf-actions .hf-p5-s2{right:87px;bottom:120px;border-color:#a781ff}',
  'body.hf-p5 .hf-actions .hf-p5-s3{right:34px;bottom:144px;border-color:#a781ff}',
  'body.hf-p5 .hf-actions .hf-p5-s4{right:0;bottom:102px;border-color:#a781ff}',
  'body.hf-p5 .hf-actions .hf-p5-locked{opacity:.4;filter:grayscale(.8)}',
  'body.hf-p5 .hf-p5-run{position:fixed!important;left:max(136px,calc(env(safe-area-inset-left) + 132px));bottom:max(23px,env(safe-area-inset-bottom));width:54px;height:54px;border-radius:50%;font-size:10px;background:#102c4bd9}',
  'body.hf-p5 .hf-menu{width:42px;height:35px;font-size:11px;top:max(9px,env(safe-area-inset-top));right:calc(max(12px,env(safe-area-inset-right)) + 120px);border-radius:8px}',
  'body.hf-p5 #hf-p5-header{position:absolute;left:max(9px,env(safe-area-inset-left));top:max(8px,env(safe-area-inset-top));width:min(254px,38vw);pointer-events:none;color:#f5faff;text-shadow:0 1px 4px #000}',
  'body.hf-p5 .hf-p5-identity{display:flex;align-items:center;gap:8px;margin-bottom:4px}',
  'body.hf-p5 .hf-p5-avatar{width:35px;height:35px;border-radius:9px;background:linear-gradient(140deg,#2a5484,#5c4295);border:1px solid #8ed5ff;display:grid;place-items:center;font-size:20px}',
  'body.hf-p5 .hf-p5-name{font-size:13px;font-weight:850;letter-spacing:.4px}',
  'body.hf-p5 .hf-p5-level{font-size:10px;color:#abdafe}',
  'body.hf-p5 .hf-p5-stat{height:14px;margin-top:3px;border-radius:8px;border:1px solid #68aee6aa;background:#091a32cc;overflow:hidden;position:relative}',
  'body.hf-p5 .hf-p5-fill{position:absolute;inset:0 auto 0 0;width:100%;transition:width .18s}',
  'body.hf-p5 .hf-p5-fill.hp{background:linear-gradient(90deg,#a52446,#ee6072)}',
  'body.hf-p5 .hf-p5-fill.mp{background:linear-gradient(90deg,#12419f,#398ae7)}',
  'body.hf-p5 .hf-p5-fill.sp{background:linear-gradient(90deg,#096a75,#21c5ca)}',
  'body.hf-p5 .hf-p5-stat-label{position:absolute;inset:0 6px;display:flex;justify-content:space-between;align-items:center;font:bold 9px system-ui}',
  'body.hf-p5 .hf-p5-invlinks{display:flex;gap:5px;margin-top:7px;pointer-events:auto}',
  'body.hf-p5 .hf-p5-invlinks button{flex:1;background:linear-gradient(150deg,#203c63e5,#101a36ec);color:white;border:1px solid #7ebcffaa;border-radius:7px;min-height:30px;font:bold 10px system-ui;touch-action:manipulation}',
  'body.hf-p5 .hf-p5-invlinks button:active{background:#395c97}',
  'body.hf-p5 #hf-p5-overlay{position:fixed;inset:0;z-index:95;display:none;align-items:center;justify-content:center;background:#020a18bb;pointer-events:auto;color:#eef7ff;font-family:system-ui,sans-serif;touch-action:pan-y}',
  'body.hf-p5-open #menus{visibility:hidden!important}',
  'html:has(body.hf-p5-open),body.hf-p5-open{touch-action:pan-y!important}',
  'body.hf-p5-open #hf-p5-overlay,body.hf-p5-open .hf-p5-list{touch-action:pan-y!important}',
  'body.hf-p5 .hf-p5-panel{width:min(750px,90vw);height:min(340px,84vh);display:flex;flex-direction:column;border-radius:12px;border:1px solid #7dbeff;background:linear-gradient(150deg,#11284bf5,#0c1430f7);box-shadow:0 0 25px #000b,inset 0 0 25px #5889ff19;overflow:hidden}',
  'body.hf-p5 .hf-p5-tabs{display:flex;flex-shrink:0;align-items:center;gap:2px;padding:7px;background:#08182fd9;border-bottom:1px solid #506f9a88}',
  'body.hf-p5 .hf-p5-tabs button{background:transparent;border:1px solid transparent;border-radius:6px;color:#b9d6f2;font-size:11px;font-weight:bold;padding:7px 9px;touch-action:manipulation}',
  'body.hf-p5 .hf-p5-tabs button.active{background:#335a9d;border-color:#79c1ff;color:white}',
  'body.hf-p5 .hf-p5-tabs button.close{margin-left:auto;background:#273b5b;border-color:#80aaca}',
  'body.hf-p5 .hf-p5-body{display:flex;flex:1;gap:9px;min-height:0;padding:9px}',
  'body.hf-p5 .hf-p5-list{flex:1;min-width:0;overflow-y:auto;overscroll-behavior:contain}',
  'body.hf-p5 .hf-p5-items{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
  'body.hf-p5 .hf-p5-item{min-height:49px;background:#1b3256;border:1px solid #5477a7;border-radius:7px;color:white;padding:4px;text-align:left;font-size:10px;touch-action:manipulation}',
  'body.hf-p5 .hf-p5-item.active{border:1px solid #e7b76f;background:#30416a}',
  'body.hf-p5 .hf-p5-item .icon{display:inline-block;width:23px;font-size:16px;vertical-align:middle;text-align:center;color:#8bcaff}',
  'body.hf-p5 .hf-p5-item .count{display:block;color:#aec7e7;font-size:9px}',
  'body.hf-p5 .hf-p5-detail{width:38%;padding:9px;border:1px solid #5072a0;border-radius:7px;background:#0b1934;overflow-y:auto;font-size:11px}',
  'body.hf-p5 .hf-p5-detail h3{font-size:14px;margin:0 0 8px}',
  'body.hf-p5 .hf-p5-detail p{line-height:1.45;margin:4px 0 8px;color:#bdcee3}',
  'body.hf-p5 .hf-p5-detail button{width:100%;min-height:35px;background:#2664ac;border:1px solid #73caff;border-radius:7px;color:white;font-weight:bold;margin-top:7px;touch-action:manipulation}',
  'body.hf-p5 .hf-p5-quest{padding:9px;border:1px solid #5477a7;border-radius:7px;background:#1b3153;margin:5px 0;font-size:11px}',
  '@media(max-height:390px){body.hf-p5 .hf-actions{transform:scale(.88);transform-origin:bottom right}body.hf-p5 .hf-joy{transform:scale(.9);transform-origin:bottom left}body.hf-p5 #hf-p5-header{transform:scale(.9);transform-origin:top left}body.hf-p5 .hf-p5-panel{height:90vh}}',
  '@media(max-width:710px){body.hf-p5 .hf-p5-item{font-size:9px}body.hf-p5 .hf-p5-tabs button{font-size:9px;padding:5px}body.hf-p5 .hf-p5-detail{width:40%}}'
].join('\n');

function make(tag, cls, label, parent) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (label !== undefined) el.textContent = label;
  if (parent) parent.appendChild(el);
  return el;
}
function percentage(value, max) {
  return max > 0 ? Math.max(0, Math.min(100, 100 * value / max)) + '%' : '0%';
}
export class PremiumHudP5 {
  constructor(touch) {
    this.touch = touch;
    this.game = touch.game;
    this.tab = 'all';
    this.selected = null;
    this.lastDash = -Infinity;
    this.open = false;
    document.body.classList.add('hf-p5');
    const style = make('style',null,PRESET_STYLE,document.head);
    style.id = 'hf-p5-style';
    this.makeControls();
    this.makeHeader();
    this.makeOverlay();
    this.refreshHeader();
    this.refreshTimer = window.setInterval(() => this.refreshHeader(),300);
  }
  makeControls() {
    const actions = this.touch.root.querySelector('.hf-actions');
    const buttons = Array.from(actions.querySelectorAll('button'));
    const [use,magic,jump,run,atk,shout] = buttons;
    use.classList.add('hf-p5-use');
    jump.classList.add('hf-p5-jump');
    atk.classList.add('hf-p5-atk');
    magic.classList.add('hf-p5-hide'); shout.classList.add('hf-p5-hide');
    // Preserve hold-to-run from P0 but remove clutter from the right-hand cluster.
    run.classList.add('hf-p5-run');
    this.touch.root.appendChild(run);
    const add=(label,cls,action)=>{
      this.touch.addButton(actions,label,'hf-p5-'+cls,action);
      return actions.lastElementChild;
    };
    add('DASH','dash',()=>this.tryDash());
    add('S1\nMAGIA','s1',()=>{this.game.input.rightClick=true;});
    add('S2\nFUS','s2',()=>this.shout('fus'));
    this.frostButton=add('S3\nHIELO','s3',()=>this.shout('frost'));
    this.wuldButton=add('S4\nWULD','s4',()=>this.shout('wuld'));
    this.skillButtons = [this.frostButton,this.wuldButton];
    // No imaginary buttons: skills 3/4 activate only when the original quests unlock them.
  }
  makeHeader() {
    const head=make('div',null,undefined,this.touch.root);
    head.id='hf-p5-header';
    head.setAttribute('translate','no');
    const idRow=make('div','hf-p5-identity',undefined,head);
    make('div','hf-p5-avatar','✦',idRow);
    const info=make('div',null,undefined,idRow);
    make('div','hf-p5-name','DRAKEN · CAZADOR',info);
    this.level=make('div','hf-p5-level','Nv. 1',info);
    const labels=[['hp','HP'],['mp','MP'],['sp','ENERGÍA']];
    this.bars={};
    for(const [key,label] of labels){
      const bar=make('div','hf-p5-stat',undefined,head);
      const fill=make('div','hf-p5-fill '+key,undefined,bar);
      const text=make('div','hf-p5-stat-label',undefined,bar);
      make('span',null,label,text);
      const val=make('span',null,'100/100',text);
      this.bars[key]={fill,val};
    }
    const links=make('div','hf-p5-invlinks',undefined,head);
    const inventory=make('button',null,'▣ INVENTARIO',links);
    inventory.type='button';
    const bag=make('button',null,'♧ BOLSA',links);
    bag.type='button';
    for(const [btn,tab] of [[inventory,'all'],[bag,'bag']]) {
      btn.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();
        if(this.game.state==='playing')this.show(tab);
      });
    }
  }
  makeOverlay() {
    const overlay=make('div',null,undefined,document.body);overlay.id='hf-p5-overlay';
    overlay.setAttribute('translate','no');
    this.overlay=overlay;
    const panel=make('div','hf-p5-panel',undefined,overlay);
    const tabs=make('div','hf-p5-tabs',undefined,panel);
    this.tabButtons={};
    for(const [key,text] of [['all','INVENTARIO'],['equipment','EQUIPO'],['bag','BOLSA'],['quests','MISIONES']]){
      const btn=make('button',null,text,tabs);btn.type='button';
      btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.tab=key;this.selected=null;this.render();});
      this.tabButtons[key]=btn;
    }
    const close=make('button','close','✕ CERRAR',tabs);
    close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.hide();});
    const body=make('div','hf-p5-body',undefined,panel);
    this.list=make('div','hf-p5-list',undefined,body);
    this.detail=make('div','hf-p5-detail',undefined,body);
    overlay.addEventListener('click',e=>{if(e.target===overlay)this.hide();});
  }
  show(tab) {
    this.tab=tab;this.selected=null;
    this.game.setState(tab==='quests'?'quests':'inventory');
    this.render();
  }
  hide() { if(this.game.state==='inventory'||this.game.state==='quests')this.game.setState('playing'); }
  setState(s) {
    const visible=s==='inventory'||s==='quests';
    if(s==='quests')this.tab='quests';
    this.open=visible;
    this.overlay.style.display=visible?'flex':'none';
    document.body.classList.toggle('hf-p5-open',visible);
    if(visible)this.render();
  }
  refreshHeader() {
    if(!this.touch.enabled) return;
    const g=this.game,st=g.stats;
    if(!st)return;
    this.level.textContent='Nv. '+st.level;
    for(const [key,values] of Object.entries({hp:[st.hp,st.maxHp],mp:[st.mp,st.maxMp],sp:[st.sp,st.maxSp]})){
      this.bars[key].fill.style.width=percentage(values[0],values[1]);
      this.bars[key].val.textContent=Math.ceil(values[0])+'/'+Math.ceil(values[1]);
    }
    const learned=(g.combat&&g.combat.learnedShouts)||[];
    this.frostButton.classList.toggle('hf-p5-locked',!learned.includes('frost'));
    this.wuldButton.classList.toggle('hf-p5-locked',!learned.includes('wuld'));
  }
  shout(id) {
    const combat=this.game.combat;
    if(!combat.learnedShouts.includes(id)){this.game.hud.notify('Habilidad todavía bloqueada');return;}
    combat.equippedShout=id;
    this.game.input.justPressed.add('KeyF');
  }
  tryDash() {
    const g=this.game,now=performance.now();
    if(now-this.lastDash<3000){g.hud.notify('Dash recargando');return;}
    if(!g.player.onGround||g.player.dashT>=0){g.hud.notify('Dash no disponible ahora');return;}
    if(!g.stats.useStamina(16)){g.hud.notify('Falta energía');return;}
    this.lastDash=now;
    g.player.startDash(); // Existing Tianjie5 dash; directional improvements belong to P3/P4.
  }
  render() {
    if(!this.open)return;
    for(const [key,btn] of Object.entries(this.tabButtons))btn.classList.toggle('active',key===this.tab);
    this.list.replaceChildren();this.detail.replaceChildren();
    if(this.tab==='quests')return this.renderQuests();
    const inv=this.game.inventory,all=Array.from(inv.slots.entries()).filter(([,n])=>n>0);
    const filtered=all.filter(([id])=>{
      const type= id.includes('sword')?'weapon':id.includes('armor')?'armor':
        id.endsWith('_potion')?'potion':'misc';
      if(this.tab==='equipment')return type==='weapon'||type==='armor';
      if(this.tab==='bag')return type==='potion'||type==='misc';
      return true;
    });
    const count=make('div',null,filtered.length+' tipos · '+inv.gold+' monedas',this.list);
    count.style.cssText='font-size:10px;color:#a9d9fc;margin-bottom:7px';
    const grid=make('div','hf-p5-items',undefined,this.list);
    for(const [id,n] of filtered) {
      const type=id.includes('sword')?'weapon':id.includes('armor')?'armor':
        id.endsWith('_potion')?'potion':'misc';
      const btn=make('button','hf-p5-item'+(this.selected===id?' active':''),undefined,grid);
      btn.type='button';
      const icon=make('span','icon',ITEM_ICONS[type],btn);icon.setAttribute('aria-hidden','true');
      make('span',null,LABELS[id]||id,btn);
      make('span','count','×'+n+(inv.equipped.weapon===id||inv.equipped.armor===id?' · EQUIPADO':''),btn);
      btn.addEventListener('click',()=>{this.selected=id;this.render();});
    }
    if(!filtered.length)make('p',null,'Todavía no hay objetos en esta sección.',grid);
    const st=this.game.stats;
    if(!this.selected || !inv.has(this.selected)) {
      make('h3',null,'EQUIPO ACTUAL',this.detail);
      make('p',null,'Arma: '+(LABELS[inv.equipped.weapon]||inv.equipped.weapon),this.detail);
      make('p',null,'Armadura: '+(LABELS[inv.equipped.armor]||inv.equipped.armor),this.detail);
      make('p',null,'Daño '+inv.weaponDamage()+' · Defensa '+inv.armorValue(),this.detail);
      make('p',null,'HP '+Math.ceil(st.hp)+' · MP '+Math.ceil(st.mp)+' · Energía '+Math.ceil(st.sp),this.detail);
      make('p',null,'Seleccioná un objeto para equiparlo o usarlo.',this.detail);
      return;
    }
    const id=this.selected,type=id.includes('sword')?'weapon':id.includes('armor')?'armor':id.endsWith('_potion')?'potion':'misc';
    make('h3',null,LABELS[id]||id,this.detail);
    make('p',null, 'Disponibles: ×'+inv.slots.get(id),this.detail);
    if(type==='weapon'||type==='armor')make('p',null,type==='weapon'?'Daño: '+this.weaponDamage(id):'Defensa: '+this.armorValue(id),this.detail);
    if(type==='potion')make('p',null,id==='health_potion'?'Restaura 40 HP':'Restaura 40 MP',this.detail);
    if(type==='weapon'||type==='armor'||type==='potion'){
      const isEquipped=inv.equipped[type]===id;
      const btn=make('button',null,isEquipped?'EQUIPADO':type==='potion'?'USAR POCIÓN':'EQUIPAR',this.detail);
      btn.disabled=isEquipped;btn.style.opacity=isEquipped?'.5':'1';
      btn.addEventListener('click',()=>{
        this.game.inventory.useOrEquip(id);
        if(!inv.has(id))this.selected=null;
        this.render();this.refreshHeader();
      });
    } else make('p',null,'Material de crafting o misión. Guardado en tu bolsa.',this.detail);
  }
  weaponDamage(id){return {iron_sword:8,steel_sword:14,ancient_sword:22,dragonbone_sword:30}[id]||0;}
  armorValue(id){return {cloth_armor:5,hide_armor:14,dragonscale_armor:28}[id]||0;}
  renderQuests(){
    const list=this.game.quests.list(),active=list.filter(q=>q.state!=='locked');
    for(const q of active){
      const v=QUEST_ES[q.id]||[q.name,q.desc];
      const box=make('div','hf-p5-quest',undefined,this.list);
      make('strong',null,v[0],box);
      make('p',null,v[1],box);
      make('span',null,(q.state==='done'?'Completada':q.state==='complete'?'Lista para entregar':q.state==='active'?'En curso':'Disponible')+' · '+q.progress+'/'+q.need,box);
    }
    make('h3',null,'DIARIO',this.detail);
    make('p',null,'Las misiones progresan al matar monstruos y recoger objetos. Hablá con los NPC para entregar recompensas.',this.detail);
  }
}
