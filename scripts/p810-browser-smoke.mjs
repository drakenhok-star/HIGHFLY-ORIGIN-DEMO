/**
 * HIGHFLY P8+P9+P10 graphical smoke test for GitHub Actions (not an Android proof).
 * Starts on the same origin and in a mobile-landscape simulated viewport.
 * Requires playwright-core and system google-chrome.
 */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const errors=[];
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({
 executablePath:chrome,headless:true,timeout:30000,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']
});
try{
 const context=await browser.newContext({
   viewport:{width:915,height:412},deviceScaleFactor:1,
   isMobile:true,hasTouch:true,locale:'es-AR'
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,300));});
 await page.goto('http://127.0.0.1:8957/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.game?.touch?.premium?.p810,null,{timeout:90000});
 await page.waitForFunction(()=>document.getElementById('asset-splash')===null,null,{timeout:60000}).catch(async err=>{
   const info=await page.evaluate(()=>{
    const splash=document.querySelector('#asset-splash'),menu=document.querySelector('#btn-new');
    return {splash:!!splash,state:window.game?.state,gameReady:!!window.game,
      menuDisplay:menu?getComputedStyle(menu).display:null,menuBounds:menu?.getBoundingClientRect().toJSON()};
   });
   throw new Error('Splash still blocking entry: '+JSON.stringify(info)+' ERR '+err.message+
       ' JS '+errors.slice(0,4).join(', '));
 });
 if(await page.evaluate(()=>window.game.p14Enabled)){
   const ghost=await page.evaluate(()=>{
     const el=document.getElementById('hf-p810-combo');
     return {text:el?.textContent,display:el?getComputedStyle(el).display:null};
   });
   assert.equal(ghost.text,'','no combo text on title screen');
   assert.equal(ghost.display,'none','empty combo panel hidden before starting game');
 }
 await page.locator('#btn-new').click({timeout:30000});
 await page.waitForFunction(()=>window.game?.state==='playing',null,{timeout:12000});
 assert.ok(await page.locator('#hf-p810-bag').isVisible(),'bag shortcut visible');
 if(await page.evaluate(()=>window.game.p15Enabled)){
  const p15=await page.evaluate(()=>({saveKey:window.game.saveSys.key,active:window.game.p15Enabled,
   menuText:document.getElementById('hf-p810-quick')?.textContent||'',
   initialized:window.game.combat?._meleeContext==='ground'}));
  assert.ok(p15.active&&p15.initialized,'P15 combat registered in the live 3D game');
  assert.equal(p15.saveKey,'highfly_p15_save','save is separate from P14');
  assert.ok(!p15.menuText.includes('PROBAR PARKOUR')&&!p15.menuText.includes('MESETA MONTAÑOSA'),
   'temporary P14 teleport tools removed from player menu');
  const finisher=await page.evaluate(()=>{
   const g=window.game,c=g.combat;
   const before=g.stats.sp;
   g.stats.sp=Math.max(20,before);
   c.comboStep=3;c.comboTimer=.85;c.meleeCd=0;
   g.input.touchMove.x=0;g.input.touchMove.y=-1;
   c.melee();
   const sample={step:c.comboStep,mode:c._finisher?.mode,vy:c._finisher?.vy,
      energySpent:g.stats.sp<Math.max(20,before)};
   g.input.touchMove.x=0;g.input.touchMove.y=0;
   c.meleeHitT=-1;c.meleeCd=0;c.comboStep=0;c.comboTimer=0;c._finisher=null;
   g.player.attackT=-1;
   return sample;
  });
  assert.equal(finisher.step,4,'fourth hit triggers from an existing chain');
  assert.equal(finisher.mode,'launch','UP joystick is captured as fourth-hit launch');
  assert.ok(finisher.vy>8.5 && finisher.energySpent,'launcher has real vertical physics and usual attack cost');
 }
 if(await page.evaluate(()=>window.game.p13Enabled)){
   const ready=await page.evaluate(()=>({
     traversal:!!window.game.player.fury,
     trees:window.game.scatter.obstacles?.count||0,
     clipReady:window.game.player.rig.clips.has('Jump_Idle'),
     collision:window.game.scatter.obstacles?.blocked(9999,0,9999)===false
   }));
   assert.ok(ready.traversal&&ready.trees>200&&ready.clipReady&&ready.collision,
     'P13 traversal and world colliders load in real WebGL scene');
 }
 assert.ok(await page.locator('#hf-p810-menu').isVisible(),'four-tile menu visible');
 await page.locator('#hf-worldmini').waitFor({state:'visible',timeout:10000}).catch(async err=>{
  const why=await page.evaluate(()=>{
   const mini=document.querySelector('#hf-worldmini');
   return {game:window.game?.state,hasMap:!!window.game?.worldMapP34,
     mounted:window.game?.touch?.premium?.p810?._mapMounted,
     inline:mini?.getAttribute('style'),computed:mini?getComputedStyle(mini).cssText:null,
     bounds:mini?.getBoundingClientRect().toJSON()};
  });
  throw new Error('Real minimap not visible: '+JSON.stringify(why));
 });
 assert.ok(await page.locator('#hf-p810-perf').isVisible(),'FPS monitor visible');
 const editorCount=await page.evaluate(()=>window.game.touch.premium.p810.editor.elements.size);
 assert.ok(editorCount>=13,'HUD editor registered live gameplay controls');
 const before=await page.evaluate(()=>{
  window.__meleeProbe=0;
  const combat=window.game.combat,original=combat.melee.bind(combat);
  combat.melee=function(){window.__meleeProbe++;return original();};
  return window.__meleeProbe;
 });
 await page.touchscreen.tap(80,326);
 await page.waitForTimeout(180);
 const after=await page.evaluate(()=>window.__meleeProbe);
 assert.equal(after,before,'touching left joystick never causes a melee');
 await page.locator('#hf-p810-bag').dispatchEvent('pointerdown',{
  pointerId:44,pointerType:'touch',bubbles:true,cancelable:true
 });
 await page.waitForFunction(()=>window.game?.state==='inventory',null,{timeout:7000});
 assert.ok(await page.locator('.p7-grid').isVisible(),'MOCHILA is a slot grid');
 if(await page.evaluate(()=>window.game.p14Enabled)){
   const gap=await page.locator('.p7-grid').evaluate(el=>parseFloat(getComputedStyle(el).rowGap));
   assert.ok(gap>=11,'P14 backpack rows must have actual vertical spacing');
 }
 const filled=await page.locator('.p7-cell:not(.empty)').count();
 assert.ok(filled>=3,'actual player bag items appear');
 await page.locator('.hf-p5-tabs button').filter({hasText:'INVENTARIO'}).first().click();
 assert.ok(await page.locator('.p7-layout').isVisible(),'INVENTARIO displays equipment/character');
 await page.locator('.hf-p5-tabs button').filter({hasText:'MISIONES'}).first().click();
 assert.ok(await page.locator('.hf-p9-mission-row').count()>=3,'real main and side quests');
 await page.locator('.hf-p5-tabs button').filter({hasText:'AJUSTES'}).first().click();
 assert.ok(await page.locator('.hf-p9-settings-menu').isVisible(),'functional settings categories');
 await page.locator('.hf-p9-settings-menu button').filter({hasText:'Interfaz'}).first().click();
 await page.locator('.hf-p9-settings-rows button').filter({hasText:'ABRIR EDITOR HUD'}).first().click();
 await page.waitForFunction(()=>window.game.touch.premium.p810.editor.editing,null,{timeout:7000});
 const changed=await page.evaluate(()=>{
   const editor=window.game.touch.premium.p810.editor;
   editor.choose('atk');editor.change('size',102);editor.persist();
   return [editor.layout.atk.size,JSON.parse(localStorage.getItem(window.game.p812Enabled?'hf_p812_hud_layout_v2':'hf_p10_hud_layout_v1')).layout.atk.size];
 });
 assert.deepEqual(changed,[102,102],'HUD size saved');
 await page.locator('#hf-p10-editor button').filter({hasText:'TERMINAR'}).first().click();
 const playing=await page.evaluate(()=>window.game?.state==='playing' && !window.game?.input?.hudEditing);
 assert.equal(playing,true,'HUD editor closes and returns movement controls');
 await mkdir('audit-output',{recursive:true});
 if(process.env.HF_CAPTURE==='1'){
  try{await page.screenshot({path:'audit-output/p810-mobile-landscape.png',animations:'disabled',fullPage:false,timeout:15000});}
  catch(err){console.warn('[P812] Optional software-rendered screenshot unavailable:',err.message);}
 }
 await page.locator('#hf-p810-menu').dispatchEvent('pointerdown',{
  pointerId:45,pointerType:'touch',bubbles:true,cancelable:true
 });
 assert.ok(await page.locator('#hf-p810-quick').isVisible(),'quick menu really expands');
 const saveButton=page.locator('#hf-p810-quick button').filter({hasText:'GUARDAR'});
 assert.ok(await saveButton.count()===1,'quick save control exists');
 // No GPU/compositor stability dependency in software WebGL runner.
 // Pointer behavior is covered independently in the touch smoke checks.
 await saveButton.dispatchEvent('click',{bubbles:true,cancelable:true});
 assert.ok(await page.evaluate(()=>localStorage.getItem(window.game.p15Enabled?'highfly_p15_save':window.game.p14Enabled?'highfly_p14_save':window.game.p13Enabled?'highfly_p13_save':window.game.p812Enabled?'highfly_p812_save':'highfly_p810_save')!==null),'P812 and P810 save separately from P7');
 await mkdir('audit-output',{recursive:true});
 if(process.env.HF_CAPTURE==='1'){
  try{await page.screenshot({path:'audit-output/p810-mobile-landscape.png',animations:'disabled',fullPage:false,timeout:15000});}
  catch(err){console.warn('[P812] Optional software-rendered screenshot unavailable:',err.message);}
 }
 // A failed optional WebGL preview is graceful; actual JS exceptions are not.
 const fatal=errors.filter(s=>/pageerror:|Uncaught|Cannot read properties|Failed to resolve module|Failed to fetch dynamically|404 .*p810|Script error/.test(s));
 if(fatal.length)throw new Error('Browser exceptions: '+fatal.slice(0,5).join('\n'));
 console.log(JSON.stringify({status:'PASS',viewport:'915x412',editorControls:editorCount,filledBagSlots:filled,joystickAttackBug:false,errors:errors.slice(0,5)},null,2));
 await context.close();
}finally{await browser.close();}
