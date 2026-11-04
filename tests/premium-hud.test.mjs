// HIGHFLY P5-A: fast DOM-free contract test. Run: node tests/premium-hud.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class FakeNode {
  constructor(tag){
    this.tagName=tag;this.className='';this.style={};this.children=[];
    this.parentNode=null;this.listeners={};this.attrs={};this.textContent='';
    this.classList={
      add:(...a)=>{for(const v of a){if(!this.className.split(' ').includes(v))this.className+=' '+v;}},
      remove:v=>{this.className=this.className.split(' ').filter(s=>s!==v).join(' ');},
      toggle:(v,on)=>{if(on)this.classList.add(v);else this.classList.remove(v);}
    };
  }
  appendChild(n){
    if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(x=>x!==n);
    this.children.push(n);n.parentNode=this;return n;
  }
  replaceChildren(){this.children=[];}
  addEventListener(type,cb){this.listeners[type]=cb;}
  setAttribute(k,v){this.attrs[k]=v;}
  querySelector(sel){return this.children.find(n=>n.className===sel.slice(1))||null;}
  querySelectorAll(sel){return sel==='button'?this.children.filter(n=>n.tagName==='button'):[];}
  get lastElementChild(){return this.children.at(-1);}
}

const body=new FakeNode('body');
const head=new FakeNode('head');
globalThis.document={body,head,createElement:t=>new FakeNode(t)};
globalThis.window={setInterval:()=>1};

const source=await readFile(new URL('../src/ui/premium-hud-p5.js',import.meta.url),'utf8');
const {PremiumHudP5}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const alerts=[];
const inventory={
  slots:new Map([['iron_sword',1],['steel_sword',1],['cloth_armor',1],['health_potion',2],['wolf_pelt',4]]),
  equipped:{weapon:'iron_sword',armor:'cloth_armor'},gold:50,
  has(id){return (this.slots.get(id)||0)>0;},
  useOrEquip(id){
    if(id.endsWith('sword'))this.equipped.weapon=id;
    else if(id.endsWith('potion'))this.slots.set(id,this.slots.get(id)-1);
  },
  weaponDamage(){return this.equipped.weapon==='steel_sword'?14:8;},
  armorValue(){return 5;}
};
const game={
  state:'playing',
  stats:{hp:100,maxHp:100,mp:80,maxMp:100,sp:90,maxSp:100,level:1,
    useStamina(n){this.sp-=n;return true;}},
  player:{dashT:-1,onGround:true,startDash(){this.dashT=0;}},
  combat:{learnedShouts:['fus'],equippedShout:'fus'},
  inventory,quests:{list:()=>[{id:'q1',state:'active',progress:2,need:5}]},
  input:{justPressed:new Set(),rightClick:false},
  hud:{notify:t=>alerts.push(t)},
  setState(s){this.state=s;premium.setState(s);}
};
const root=new FakeNode('div');
const actions=new FakeNode('div');actions.className='hf-actions';root.appendChild(actions);
for(const label of ['USAR','MAGIA','SALTO','CORRER','ATK','GRITO']){
  const button=new FakeNode('button');button.textContent=label;actions.appendChild(button);
}
const oldRun=actions.children[3];
const touch={
  game,root,enabled:true,
  cameraSensitivity:1.5,
  setCameraSensitivity(v){this.cameraSensitivity=Number(v);},
  addButton(parent,label,cls,action){
    const el=new FakeNode('button');
    el.className='hf-btn '+cls;el.textContent=label;el.listeners.action=action;
    parent.appendChild(el);
  }
};
const premium=new PremiumHudP5(touch);
premium.setState('playing');
assert.deepEqual(Object.keys(premium.bars),['hp','mp','sp']);
assert.equal(premium.level.textContent,'Nv. 1');
assert.equal(oldRun.parentNode,root,'running is repositioned near joystick');
assert.equal(actions.children.filter(n=>n.className.includes('hf-p5-s')).length,4);

premium.show('all');
assert.equal(game.state,'inventory');
assert.equal(premium.overlay.style.display,'flex');
assert.equal(premium.list.children.at(-1).children.length,5);

premium.selected='steel_sword';
premium.render();
const equipBtn=premium.detail.children.find(n=>n.tagName==='button');
assert.ok(equipBtn,'equipment action is present');
equipBtn.listeners.click();
assert.equal(inventory.equipped.weapon,'steel_sword');

premium.tab='bag';premium.render();
assert.equal(premium.list.children.at(-1).children.length,2,'bag filters materials/potions');
premium.tab='quests';premium.render();
assert.equal(premium.list.children.length,1,'mission list renders');
premium.tab='settings';premium.render();
const sensitivitySlider=premium.list.children.find(n=>n.tagName==='input');
assert.ok(sensitivitySlider,'settings camera slider exists');
assert.equal(sensitivitySlider.value,'1.5','default sensitivity +25%');
sensitivitySlider.value='1.7';
sensitivitySlider.listeners.input();
assert.equal(touch.cameraSensitivity,1.7,'slider updates live camera speed');

premium.hide();
assert.equal(game.state,'playing');
assert.equal(premium.overlay.style.display,'none');
premium.shout('frost');
assert.ok(alerts.some(a=>a.includes('bloqueada')));
premium.shout('fus');
assert.ok(game.input.justPressed.has('KeyF'));
premium.tryDash();
assert.equal(game.player.dashT,0);
assert.equal(game.stats.sp,74);
console.log('HIGHFLY P5-A: HUD, inventory/equipment, bag, quests, skill locks, jump/dash wiring — PASS');
