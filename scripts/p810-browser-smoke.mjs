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
 await page.locator('#btn-new').click({timeout:30000});
 await page.waitForFunction(()=>window.game?.state==='playing',null,{timeout:12000});
 assert.ok(await page.locator('#hf-p810-bag').isVisible(),'bag shortcut visible');
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
 await page.locator('#hf-p810-quick button').filter({hasText:'GUARDAR'}).click();
 assert.ok(await page.evaluate(()=>localStorage.getItem(window.game.p812Enabled?'highfly_p812_save':'highfly_p810_save')!==null),'P812 and P810 save separately from P7');
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
