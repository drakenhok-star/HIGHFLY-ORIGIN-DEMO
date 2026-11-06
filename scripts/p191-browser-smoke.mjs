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
  const premiumTip=!!bridge.preview?.guide?.groundTip?.visible;
  const startDir=bridge.pendingAim?.dir.clone();
  document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,
   pointerId:24,clientX:910,clientY:290,pointerType:'touch'}));
  const changed=startDir?.distanceTo(bridge.pendingAim?.dir||startDir)>.01;
  document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,cancelable:true,
   pointerId:24,clientX:910,clientY:290,pointerType:'touch'}));
  const cancelled=bridge.pendingAim===null&&!bridge.preview.group.visible;
  return {prepared,circleVisible,premiumTip,changed,cancelled,mpBefore:mp,mpAfter:g.stats.mp,
   cooldown:bridge.cooldowns.woc_fireball||0,
   onBody:circle?.parentElement===document.body,
   zIndex:Number(getComputedStyle(circle).zIndex)};
 });
 assert.ok(aiming.prepared,'real L27 3D line telegraph appears before firing');
 assert.ok(aiming.circleVisible,'red cancellation circle visible while aiming');
 assert.ok(aiming.premiumTip,'P191 ground endpoint reticle visible before cast');
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
 const classless=await page.evaluate(()=>{
  const g=window.game,p=g.touch.premium;
  const list=p.list.textContent,detail=p.detail.textContent;
  return {physical:list.includes('FÍSICAS · ENERGÍA'),
   magical:list.includes('MÁGICAS · MANÁ'),
   noDeveloperVfx:!detail.includes('VFX actual'),
   noSpecial:!detail.includes('TÉCNICA ESPECIAL'),sixSlots:detail.includes('EQUIPAR EN S6')};
 });
 assert.ok(classless.physical&&classless.magical);
 assert.ok(classless.noDeveloperVfx&&classless.noSpecial);
 const scroll=await page.evaluate(()=>{
  const ui=window.game.touch.premium,inner=ui.list.querySelector('.hf-p188-book');
  const groups=[...inner.querySelectorAll('.hf-p191-skill-acquired,.hf-p191-skill-hidden')];
  inner.scrollTop=inner.scrollHeight;const before=inner.scrollTop;
  const skills=inner.querySelectorAll('.hf-p188-card');skills[skills.length-1].click();
  return {before,after:ui.list.querySelector('.hf-p188-book').scrollTop,
    groups:groups.map(x=>x.className)};
 });
 assert.ok(scroll.groups[0].includes('acquired')&&scroll.groups[1].includes('hidden'));
 assert.ok(Math.abs(scroll.after-scroll.before)<3,'selecting a skill must NOT scroll to top');
 const quality=await page.evaluate(()=>{
  const g=window.game;return {preset:g.performanceP2.preset,dpr:g.renderer.getPixelRatio()};
 });
 assert.equal(quality.preset,'CLARITY');
 assert.ok(quality.dpr>=.94);

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
   six:details.includes('S6 ·'),
   noSpecial:!details.includes('TÉCNICA ESPECIAL')};
 });
 assert.ok(nativeBook.hasNative&&nativeBook.six&&nativeBook.noSpecial);
 await page.evaluate(()=>window.game.touch.premium.show('professions'));
 assert.equal(await page.locator('.hf-p188-card').count(),15,'all fifteen professions in native bag-sized panel');
 await page.evaluate(()=>window.game.touch.premium.hide());
 const editorCheck=await page.evaluate(()=>{
  const g=window.game,ed=g.touch.premium.p810.editor;
  const x=ed.layout.s1.x;
  ed.start();ed.choose('s2');
  ed.changeSizePercent(120);
  const percent=ed.layout.s2.size;
  ed.equalizeSkillSizes(95);
  const same=['s1','s2','s3','s4','s5','s6'].every(id=>ed.layout[id].size===ed.layout.s1.size);
  ed.choose('perf');
  const move=getComputedStyle(ed.elements.get('perf')).pointerEvents==='auto';
  ed.stop(true);
  const clickThrough=getComputedStyle(ed.elements.get('perf')).pointerEvents==='none';
  return {percent,same,move,clickThrough,positions:ed.layout.s1.x===x};
 });
 assert.ok(editorCheck.percent>55&&editorCheck.same&&editorCheck.move&&editorCheck.clickThrough&&editorCheck.positions);
 const overlayCheck=await page.evaluate(()=>{
  const g=window.game,m=g.worldMapP34,radar=m.mini.getBoundingClientRect();
  const coords=m.coords.getBoundingClientRect();
  return {parent:m.coords.parentElement===document.body,
   below:coords.top>=radar.bottom-2,
   metrics:g.touch.premium.p810.perf.textContent};
 });
 assert.ok(overlayCheck.parent&&overlayCheck.below,'X/Z display below radar');
 assert.ok(overlayCheck.metrics.includes('ms')&&!overlayCheck.metrics.includes('P95'));
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
   learned:newdata.skillsP190?.learned?.woc_fireball,
   equipped:newdata.skillsP190?.equipped?.[0]};
 });
 assert.equal(save.key,'highfly_p190_save');
 assert.equal(save.oldUnchanged,true,'old game keys never overwritten');
 assert.equal(save.learned,true);assert.equal(save.equipped,'woc_fireball');
 const sigrid=await page.evaluate(()=>{
  const g=window.game,npc=g.npcs.list.find(n=>n.id==='sigrid'),inv=g.inventory;
  const original={pos:g.player.pos.clone(),level:g.stats.level,
   pelt:inv.slots.get('wolf_pelt')||0,armor:inv.slots.get('hide_armor')||0,gold:inv.gold};
  const originalDialogue=g.menus.showDialogue;
  let supplied=null,got=null;
  try{
   g.stats.level=8;g.player.pos.copy(npc.pos);
   g.p187Professions.learnAtTrainer('armorcrafting','sigrid');
   inv.slots.set('wolf_pelt',2);inv.gold=100;
   g.menus.showDialogue=(d)=>{supplied=d.options;};
   g.npcs.startDialogue(npc);
   const option=supplied?.find(x=>x.label.includes('Confeccionar armadura de cazador'));
   const before=inv.slots.get('hide_armor')||0;
   const expBefore=g.p187Professions.state.experience.armorcrafting;
   option?.action();
   got={found:!!option,crafted:(inv.slots.get('hide_armor')||0)===before+1,
    exp:g.p187Professions.state.experience.armorcrafting-expBefore,
    cost:100-inv.gold,consumed:inv.slots.get('wolf_pelt')===0,
    saved:!!JSON.parse(localStorage.getItem('highfly_p190_save')).professionsP187};
  }finally{
   g.menus.showDialogue=originalDialogue;
   g.player.pos.copy(original.pos);g.stats.level=original.level;
   inv.slots.set('wolf_pelt',original.pelt);
   inv.slots.set('hide_armor',original.armor);
   inv.gold=original.gold;g.setState('playing');
  }
  return got;
 });
 assert.ok(sigrid.found&&sigrid.crafted&&sigrid.consumed&&sigrid.saved);
 assert.equal(sigrid.cost,20);
 assert.equal(sigrid.exp,3);
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
