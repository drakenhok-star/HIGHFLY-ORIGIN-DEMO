/** P191 real 1030×480 WebGL Chrome touch browser smoke, does not replace Android QA. */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({
 executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage',
 '--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const errors=[];
try{
 const context=await browser.newContext({
  viewport:{width:1030,height:480},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'es-AR'
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300));});
 await page.goto('http://127.0.0.1:5520/index.html?hf_touch=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.game?.touch?.premium?.p810?.editor,undefined,{timeout:90000});
 await page.waitForFunction(()=>!document.getElementById('asset-splash'),undefined,{timeout:60000});
 await page.locator('#btn-new').click({timeout:30000});
 await page.waitForFunction(()=>window.game?.state==='playing'&&!!window.game?.p188Skills,
  undefined,{timeout:15000});
 await page.waitForFunction(()=>!!window.game?.touch?.premium?.p810?.quickNav,undefined,{timeout:15000});
 const blank=await page.evaluate(()=>{
  const g=window.game;
  const original=g.stats.mp,skill=g.p186Skills;
  return {p188:g.p188Build,p187:g.p187Build,p185:!!g.livingWorld,
   original,cast:skill.cast(1),after:g.stats.mp,eq:g.p188Skills.state.equipped,
   known:Object.keys(g.p188Skills.state.discovered),aimPreview:!!skill.preview,
   nativeCombat:!!g.combat,focus:!!skill.focusButton};
 });
 assert.equal(blank.p188,true);assert.equal(blank.p185,true);
 assert.equal(blank.cast,false,'brand-new character cannot use 15 lab skills for free');
 assert.equal(blank.original,blank.after,'locked skill cannot consume MP');
 assert.deepEqual(blank.eq,[null,null,null,null,null,null]);
 assert.deepEqual(blank.known,[]);
 assert.ok(blank.aimPreview&&blank.nativeCombat);
 const mission=await page.evaluate(()=>{
  const g=window.game,p=g.p188Skills;
  const initial=p.serialize();
  g.quests.states.q1='done';p.syncExistingQuests();
  const discovered=p.state.discovered.woc_fireball===true;
  const notLearned=!p.state.learned.woc_fireball;
  const noMeteor=!p.state.discovered.woc_meteor;
  const learned=p.learn('woc_fireball');
  const equip=p.equip('woc_fireball',1);
  g.p186Skills.drawSkillButtons();
  return {initial,discovered,notLearned,noMeteor,learned,equip,
   label:g.touch.root.querySelector('.hf-p5-s1')?.textContent};
 });
 assert.equal(Object.keys(mission.initial.discovered).length,0);
 for(const key of ['discovered','notLearned','noMeteor','learned','equip'])assert.ok(mission[key],key);
 assert.ok(mission.label.includes('Fireball'),'S1 displays equipped skill instead of cycling');
 const stable=await page.evaluate(()=>{
  const g=window.game,el=g.touch.root.querySelector('.hf-p5-s1');
  const original=el.textContent;
  for(let i=0;i<8;i++)g.touch.premium.refreshHeader();
  return {original,after:el.textContent,locked:el.classList.contains('hf-p5-locked')};
 });
 assert.equal(stable.original,stable.after,'native legacy refresh cannot overwrite labels');
 assert.equal(stable.locked,false);

 // Hold = visible actual-world preview. Drag = directional target. Cancel = no cost/CD.
 const circle=await page.evaluate(()=>{
  const g=window.game,ed=g.touch.premium.p810.editor;
  const button=document.getElementById('hf-p188-skill-cancel');
  if(!button)return {exists:false};
  const before=getComputedStyle(button);
  const idle=before.visibility;
  ed.start();ed.choose('skillCancel');
  const during=getComputedStyle(button);
  const inEditor=during.visibility;
  const borderRadius=during.borderRadius;
  const size0=button.getBoundingClientRect().width;
  ed.change('opacity',.55);
  ed.change('size',41);
  ed.change('x',.73);
  ed.persist();
  const saved=JSON.parse(localStorage.getItem('hf_p812_hud_layout_v2')).layout.skillCancel;
  ed.stop(true);
  return {exists:true,idle,inEditor,borderRadius,size0,saved,
   hiddenAgain:getComputedStyle(button).visibility,
   registered:ed.elements.get('skillCancel')===button,
   label:button.textContent};
 });
 assert.equal(circle.exists,true,'editable cancel skill must be pre-mounted');
 assert.equal(circle.registered,true);
 assert.equal(circle.idle,'hidden','circle only appears while aiming or editing');
 assert.equal(circle.inEditor,'visible','circle is draggable in HUD editor');
 assert.equal(circle.hiddenAgain,'hidden','editor close must not leave a floating button');
 assert.equal(circle.label,'✕','only circular red X, no big rectangular text');
 assert.equal(circle.saved.opacity,.55,'opacity persists in original HUD key');
 assert.equal(circle.saved.size,41,'size persists in original HUD key');
 assert.equal(circle.saved.x,.73,'position persists in original HUD key');
 assert.ok(Number.parseFloat(circle.borderRadius)>15,'cancel has circular border radius');
 const aiming=await page.evaluate(()=>{
  const g=window.game,btn=g.touch.root.querySelector('.hf-p5-s1');
  const mp=g.stats.mp,bridge=g.p186Skills;
  const down=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,
   pointerId:24,clientX:840,clientY:385,pointerType:'touch'});
  btn.dispatchEvent(down);
  const circle=document.getElementById('hf-p188-skill-cancel');
  const prepared=!!bridge.pendingAim&&bridge.preview?.group.visible &&
    bridge.preview.spec.kind==='line'&&!!circle;
  const circleVisible=getComputedStyle(circle).visibility==='visible';
  const startDir=bridge.pendingAim?.dir.clone();
  document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,
   pointerId:24,clientX:910,clientY:290,pointerType:'touch'}));
  const changed=startDir?.distanceTo(bridge.pendingAim?.dir||startDir)>.01;
  document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,cancelable:true,
   pointerId:24,clientX:910,clientY:290,pointerType:'touch'}));
  const cancelled=bridge.pendingAim===null&&!bridge.preview.group.visible;
  return {prepared,circleVisible,changed,cancelled,mpBefore:mp,mpAfter:g.stats.mp,
   cooldown:bridge.cooldowns.woc_fireball||0,
   onBody:circle?.parentElement===document.body,
   zIndex:Number(getComputedStyle(circle).zIndex)};
 });
 assert.ok(aiming.prepared,'real L27 3D line telegraph appears before firing');
 assert.ok(aiming.circleVisible,'red cancellation circle visible while aiming');
 assert.ok(aiming.onBody&&aiming.zIndex>=100,'cancel above coords/FPS overlay');
 assert.ok(aiming.changed,'drag changes ground aiming orientation');
 assert.ok(aiming.cancelled,'cancellation hides aim');
 assert.equal(aiming.mpBefore,aiming.mpAfter,'cancel without resource cost');
 assert.equal(aiming.cooldown,0,'cancel without cooldown');
 const confirmed=await page.evaluate(()=>{
  const g=window.game,bridge=g.p186Skills,btn=g.touch.root.querySelector('.hf-p5-s1');
  const before=g.stats.mp;
  btn.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,
   pointerId:25,clientX:842,clientY:380,pointerType:'touch'}));
  document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,
   pointerId:25,clientX:882,clientY:300,pointerType:'touch'}));
  return {before,after:g.stats.mp,cd:bridge.cooldowns.woc_fireball,
   closed:bridge.pendingAim===null};
 });
 assert.ok(confirmed.after<confirmed.before,'confirmation consumes MP once');
 assert.ok(confirmed.cd>0,'confirmation sets cooldown once');
 assert.equal(confirmed.closed,true);
 const display=await page.evaluate(()=>{
  const g=window.game,p=g.touch.premium;
  p.show('skills');
  const panel=document.querySelector('#hf-p5-overlay .hf-p5-panel');
  return {state:g.state,number:document.querySelectorAll('.hf-p188-card').length,
   width:panel.getBoundingClientRect().width,height:panel.getBoundingClientRect().height,
   title:p.list.textContent.slice(0,100),
   hasLearned:p.list.textContent.includes('APRENDIDA')||p.list.textContent.includes('EQUIPADA')};
 });
 assert.equal(display.state,'inventory');
 assert.equal(display.number,18,'all eighteen skills visible without granting them');
 assert.ok(display.width>880&&display.height>370,'skill book same size as bag');
 assert.ok(display.hasLearned);
 const ux=await page.evaluate(()=>{
  const g=window.game,p=g.touch.premium,ui=p.p810.panels;
  p.show('skills');
  // Create a truly scrollable list in Chrome; not a static string inspection.
  const first=p.list.querySelector('.hf-p188-book');
  first.scrollTop=first.scrollHeight;
  p.list.scrollTop=p.list.scrollHeight;
  const listBefore=first.scrollTop;
  const cards=[...first.querySelectorAll('.hf-p188-card')];
  const topKnown=cards.find(x=>x.textContent.includes('Fireball'));
  const hidden=cards.find(x=>x.textContent.includes('Por descubrir'));
  const skill=cards.find(x=>x.textContent.includes('Onda de fuerza'));
  const sorted=cards.findIndex(x=>x.textContent.includes('Fireball'))<
   cards.findIndex(x=>x.textContent.includes('Por descubrir'));
  if(hidden)hidden.click();
  const listAfter=p.list.querySelector('.hf-p188-book')?.scrollTop;
  ui.p188SelectedSkill='woc_fireball';ui.render('skills');
  const slots=p.detail.querySelectorAll('.hf-p191-slot');
  const compact=slots.length===6&&!!p.detail.querySelector('.hf-p191-equip-grid');
  const scrollBeforeEquip=p.list.querySelector('.hf-p188-book')?.scrollTop||0;
  const unequip=p.detail.querySelector('.hf-p191-unequip');
  const hadUnequip=!!unequip;
  unequip?.click();
  const afterEquip=p.list.querySelector('.hf-p188-book')?.scrollTop||0;
  return {listBefore,listAfter,sorted,compact,hadUnequip,
   scrollBeforeEquip,afterEquip};
 });
 assert.ok(ux.sorted,'known skills are above undiscovered skills');
 assert.ok(ux.listBefore>=0&&Math.abs(ux.listAfter-ux.listBefore)<3,
  'touching a skill never jumps to the top');
 assert.ok(ux.compact,'six equip slots are a compact grid');
 assert.ok(ux.hadUnequip,'selected equipped skill can be unequipped in one tap');
 assert.ok(Math.abs(ux.scrollBeforeEquip-ux.afterEquip)<3,
  'unequipping preserves scroll position');
 // Restore fireball in S1 so the remainder of original regression still runs.
 await page.evaluate(()=>{
  const g=window.game;
  g.p188Skills.equip('woc_fireball',1);
  g.p186Skills.drawSkillButtons();
 });
 const percentHud=await page.evaluate(()=>{
  const ed=window.game.touch.premium.p810.editor;
  ed.start();ed.choose('s5');
  const input=ed.size;
  const initial=ed.layout.s5.size;
  input.value='125';input.dispatchEvent(new Event('input',{bubbles:true}));
  const pct=ed.sizeHint.textContent;
  const scaled=ed.layout.s5.size;
  ed.choose('s1');
  ed.panel.querySelector('.hf-p10-editor-buttons button:nth-child(2)')?.click();
  const sizes=Array.from({length:6},(_,i)=>ed.layout['s'+(i+1)].size);
  // The FPS element is normally pointer-inert, but draggable during edit.
  const fps= document.getElementById('hf-p810-perf');
  const movable=getComputedStyle(fps).pointerEvents;
  const value=fps.textContent;
  ed.stop(true);
  const coordinates=document.getElementById('hf-p191-coords');
  return {initial,scaled,pct,sizes,movable,value,
   coords:coordinates?.textContent,coordsVisible:getComputedStyle(coordinates).display};
 });
 assert.equal(percentHud.pct,'125%');
 assert.ok(percentHud.scaled>percentHud.initial);
 assert.ok(percentHud.sizes.every(n=>n===percentHud.sizes[0]),
  'equalize all six slot sizes with one action');
 assert.equal(percentHud.movable,'auto','FPS movable in edit mode');
 assert.ok(!percentHud.value.includes('P95'),'no clutter');
 assert.ok(percentHud.coords?.includes('X '),'coords below radar');

 const classless=await page.evaluate(()=>{
  const g=window.game,p=g.touch.premium;
  const list=p.list.textContent,detail=p.detail.textContent;
  return {physical:list.includes('HABILIDADES FÍSICAS'),
   magical:list.includes('HABILIDADES MÁGICAS'),
   noDeveloperVfx:!detail.includes('VFX actual'),
   noSpecial:!detail.includes('TÉCNICA ESPECIAL'),sixSlots:detail.includes('EQUIPAR EN S6')};
 });
 assert.ok(classless.physical&&classless.magical);
 assert.ok(classless.noDeveloperVfx&&classless.noSpecial);
 const six=await page.evaluate(()=>{
  const g=window.game,progress=g.p188Skills;
  const editor=g.touch.premium.p810.editor;
  const buttons=Array.from({length:6},(_,i)=>g.touch.root.querySelector('.hf-p5-s'+(i+1)));
  const allMounted=buttons.every(Boolean);
  const editable=editor.elements.has('s5')&&editor.elements.has('s6');
  const savedLayout=editor.layout;
  const initialSlots=progress.state.equipped.length;
  // Simulates an OLD save already possessing WULD, not a free new-player reward.
  progress.migratePriorCombat({learned:['fus','wuld'],equipped:'wuld'});
  g.combat.learnedShouts=[...new Set([...g.combat.learnedShouts,'wuld'])];
  const migrated=progress.selected(4)?.id==='native_wuld';
  // Native and lab can now be equipped in ANY slot, no reserved specials.
  progress.equip('native_wuld',6);
  const moved=progress.selected(4)===null&&progress.selected(6)?.id==='native_wuld';
  progress.equip('native_wuld',4);
  g.p186Skills.drawSkillButtons();
  return {allMounted,editable,initialSlots,migrated,moved,
   s4:buttons[3]?.textContent,s5:buttons[4]?.textContent,
   s6:buttons[5]?.textContent,nativeLearned:progress.state.learned.native_wuld};
 });
 assert.ok(six.allMounted&&six.editable,'six HUD buttons, all editable');
 assert.equal(six.initialSlots,6);
 assert.ok(six.migrated&&six.moved&&six.nativeLearned,
  'old rune migrated into regular S4 but can move to S6');
 assert.ok(six.s4.includes('Embestida'),'S4 is updated by the unified skill writer');
 assert.ok(six.s5.includes('VACÍA'),'new slots start empty');
 const nativeBook=await page.evaluate(()=>{
  const g=window.game,p=g.touch.premium;
  p.p810.panels.p188SelectedSkill='native_wuld';
  p.show('skills');
  const left=p.list.textContent,details=p.detail.textContent;
  return {hasNative:left.includes('Embestida veloz'),
   six:details.includes('EQUIPAR EN S6'),
   noSpecial:!details.includes('TÉCNICA ESPECIAL')};
 });
 assert.ok(nativeBook.hasNative&&nativeBook.six&&nativeBook.noSpecial);
 await page.evaluate(()=>window.game.touch.premium.show('professions'));
 assert.equal(await page.locator('.hf-p188-card').count(),15,'all fifteen professions in native bag-sized panel');
 await page.evaluate(()=>window.game.touch.premium.hide());
 const mainMenu=await page.evaluate(()=>{
  const ui=window.game.touch.premium.p810;
  ui.toggleQuickMenu(true);
  const menu=document.getElementById('hf-p810-quick');
  const bounds=menu.getBoundingClientRect();
  const tabs=[...menu.querySelectorAll('.hf-p187-tab')].map(x=>x.textContent);
  const close=menu.querySelector('.hf-p187-head button');
  close.click();
  return {width:bounds.width,height:bounds.height,tabs,
   canClose:ui.quickOpen===false,hasClose:!!close};
 });
 assert.ok(mainMenu.width>880&&mainMenu.height>370,
  'MAIN four-tab menu is also same size as backpack, not a tiny popover');
 assert.equal(mainMenu.tabs.length,4);
 assert.ok(mainMenu.hasClose&&mainMenu.canClose);
 const sharedTouch=await page.evaluate(()=>{
  const g=window.game,ui=g.touch.premium.p810;
  const menu=document.getElementById('hf-p810-menu').getBoundingClientRect();
  const radar=g.worldMapP34;
  radar.mini.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,
   clientX:menu.left+menu.width/2,clientY:menu.top+menu.height/2}));
  const openedMenu=ui.quickOpen,openedMap=radar.opened;
  ui.toggleQuickMenu(false);
  return {openedMenu,openedMap};
 });
 assert.ok(sharedTouch.openedMenu,'tap around shared menu/radar area favors MENU');
 assert.equal(sharedTouch.openedMap,false,'radar must not open on mistaken menu tap');
 const save=await page.evaluate(()=>{
  const g=window.game,old=localStorage.getItem('highfly_p187_save');
  g.saveSys.save({silent:true});
  const newdata=JSON.parse(localStorage.getItem('highfly_p190_save'));
  return {key:g.saveSys.key,oldUnchanged:old===localStorage.getItem('highfly_p187_save'),
   learned:newdata.skillsP191?.learned?.woc_fireball,
   equipped:newdata.skillsP191?.equipped?.[0]};
 });
 assert.equal(save.key,'highfly_p190_save');
 assert.equal(save.oldUnchanged,true,'old game keys never overwritten');
 assert.equal(save.learned,true);assert.equal(save.equipped,'woc_fireball');
 await mkdir('audit-output',{recursive:true});
 try{await page.screenshot({path:'audit-output/p191-landscape.png',timeout:15000,animations:'disabled'});}
 catch(e){console.log('Screenshot issue:',e.message);}
 const fatal=errors.filter(x=>/Uncaught|Cannot read properties|Failed to resolve module|SyntaxError/i.test(x));
 assert.deepEqual(fatal,[],'browser fatal errors');
 console.log(JSON.stringify({status:'PASS',mobile:'1030x480',
   combat:'locked-until-learned',aim:'3D+drag+cancel+confirm',
   skills:18,professions:15,oldSave:'preserved',main:'P185 world retained',
   panel:'native full-sized',mainMenu:'full-sized with close',sixSlots:true,chromeErrors:errors},null,2));
 await context.close();
}finally{await browser.close();}
