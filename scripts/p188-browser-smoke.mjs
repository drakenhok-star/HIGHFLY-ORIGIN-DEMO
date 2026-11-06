/** P188 real 1030×480 WebGL Chrome touch browser smoke, does not replace Android QA. */
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
 assert.deepEqual(blank.eq,[null,null,null]);
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
 const aiming=await page.evaluate(()=>{
  const g=window.game,btn=g.touch.root.querySelector('.hf-p5-s1');
  const mp=g.stats.mp,bridge=g.p186Skills;
  const down=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,
   pointerId:24,clientX:840,clientY:385,pointerType:'touch'});
  btn.dispatchEvent(down);
  const prepared=!!bridge.pendingAim&&bridge.preview?.group.visible &&
    bridge.preview.spec.kind==='line'&&!!document.getElementById('hf-p188-skill-cancel');
  const startDir=bridge.pendingAim?.dir.clone();
  document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,
   pointerId:24,clientX:910,clientY:290,pointerType:'touch'}));
  const changed=startDir?.distanceTo(bridge.pendingAim?.dir||startDir)>.01;
  document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,cancelable:true,
   pointerId:24,clientX:910,clientY:290,pointerType:'touch'}));
  const cancelled=bridge.pendingAim===null&&!bridge.preview.group.visible;
  return {prepared,changed,cancelled,mpBefore:mp,mpAfter:g.stats.mp,
   cooldown:bridge.cooldowns.woc_fireball||0};
 });
 assert.ok(aiming.prepared,'real 3D line telegraph appears before firing');
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
 assert.equal(display.number,15,'all fifteen abilities visible but not granted');
 assert.ok(display.width>880&&display.height>370,'skill book same size as bag');
 assert.ok(display.hasLearned);
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
 const save=await page.evaluate(()=>{
  const g=window.game,old=localStorage.getItem('highfly_p187_save');
  g.saveSys.save({silent:true});
  const newdata=JSON.parse(localStorage.getItem('highfly_p188_save'));
  return {key:g.saveSys.key,oldUnchanged:old===localStorage.getItem('highfly_p187_save'),
   learned:newdata.skillsP188.learned.woc_fireball,
   equipped:newdata.skillsP188.equipped[0]};
 });
 assert.equal(save.key,'highfly_p188_save');
 assert.equal(save.oldUnchanged,true,'old game keys never overwritten');
 assert.equal(save.learned,true);assert.equal(save.equipped,'woc_fireball');
 await mkdir('audit-output',{recursive:true});
 try{await page.screenshot({path:'audit-output/p188-landscape.png',timeout:15000,animations:'disabled'});}
 catch(e){console.log('Screenshot issue:',e.message);}
 const fatal=errors.filter(x=>/Uncaught|Cannot read properties|Failed to resolve module|SyntaxError/i.test(x));
 assert.deepEqual(fatal,[],'browser fatal errors');
 console.log(JSON.stringify({status:'PASS',mobile:'1030x480',
   combat:'locked-until-learned',aim:'3D+drag+cancel+confirm',
   skills:15,professions:15,oldSave:'preserved',main:'P185 world retained',
   panel:'native full-sized',mainMenu:'full-sized with close',chromeErrors:errors},null,2));
 await context.close();
}finally{await browser.close();}
