/** P186 headless live Three.js smoke. This is NOT S23 Ultra GPU profiling. */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const errors=[];
const browser=await chromium.launch({
 executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try {
 const context=await browser.newContext({
  viewport:{width:1030,height:480},deviceScaleFactor:1,
  isMobile:true,hasTouch:true,locale:'es-AR'
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push('pageerror '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text().slice(0,280));});
 await page.goto('http://127.0.0.1:5520/index.html?hf_touch=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.game?.touch?.premium?.p810?.editor,undefined,{timeout:90000});
 await page.waitForFunction(()=>!document.getElementById('asset-splash'),undefined,{timeout:60000});
 await page.locator('#btn-new').click({timeout:30000});
 await page.waitForFunction(()=>window.game?.state==='playing'&&!!window.game?.p186Skills,
  undefined,{timeout:15000});
 await page.waitForFunction(()=>window.game.touch.premium.p810.editor.elements.has('focus'),
  undefined,{timeout:12000});
 const state=await page.evaluate(()=>{
  const g=window.game,e=g.touch.premium.p810.editor,p=g.player,ui=g.p186Skills;
  return {p16:g.p16Enabled,p185:!!g.livingWorld,
   player:!!p.rig,combat:!!g.combat,world:!!g.terrain,style:ui.style,
   camera:{distance:p.camDist,pitch:Math.round(p.pitch*180/Math.PI),
    height:p.camTargetHeight,fov:g.camera.fov},
   hud:e.elements.has('focus'),dot:getComputedStyle(document.querySelector('.hud-crosshair')).display,
   nativeS4:!!g.touch.root.querySelector('.hf-p5-s4'),
   items:ui.skills.map(s=>s.id),count:g.enemies.list.length};
 });
 assert.ok(state.p16&&state.p185&&state.player&&state.combat&&state.world);
 assert.deepEqual(state.camera,{distance:10,pitch:-46,height:1.7,fov:85},
  'the video camera defaults match user recording');
 assert.equal(state.dot,'none','white center dot must not obscure player head');
 assert.ok(state.hud&&state.nativeS4,'editable focus with existing S4 WULD');
 assert.equal(state.items.length,3);
 const casts=await page.evaluate(()=>{
  const g=window.game,adapter=g.p186Skills,results=[];
  g.stats.maxMp=1000;g.stats.mp=1000;
  g.stats.maxSp=1000;g.stats.sp=1000;
  for(let i=0;i<5;i++){
   adapter.style=i;
   for(let s=1;s<=3;s++){
    try{results.push({kit:i,slot:s,ok:adapter.cast(s)});}
    catch(err){results.push({kit:i,slot:s,ok:false,error:String(err)});}
   }
  }
  const nativeStill=g.combat.melee===Object.getPrototypeOf(g.combat).melee;
  adapter.style=3;adapter.drawSkillButtons();
  return {results,nativeStill,active:adapter.fx.active.length,
    cap:adapter.fx.poolLimit,projectiles:adapter.projectiles.length};
 });
 assert.deepEqual(casts.results.filter(x=>!x.ok),[],
  'all 15 skill handlers must cast without JS exceptions');
 assert.ok(casts.nativeStill,'native P16 melee implementation unchanged');
 assert.ok(casts.active<=casts.cap,'mobile FX pool bounded');
 // P187 real browser: display all 15 skill cards and all registered professions.
 await page.evaluate(()=>window.game.p186Skills.openStyleMenu());
 assert.equal(await page.locator('#hf-p186-styles .hf-p187-skill-cards article').count(),15,
  'all fifteen cards show in a compact scrollable mobile panel');
 await page.evaluate(()=>window.game.p186Skills.openStyleMenu());
 const villageStatus=await page.evaluate(()=>{
  const g=window.game;
  g.p187VillageGuide.update(1);
  return {gameState:g.state,menuReady:!!g.touch?.premium?.p810?.quick,
   menuDomReady:!!document.getElementById('hf-p810-quick'),
   buttonReady:!!g.p187VillageGuide?.button};
 });
 assert.ok(villageStatus.buttonReady,'Village guide must mount in the existing HUD: '+JSON.stringify(villageStatus));
 // Existing quick menu now has 4 accessible tabs rather than >10 stacked actions.
 const quickSections=await page.evaluate(()=>{
  const ui=window.game.touch.premium.p810,nav=ui.quickNav;
  if(!nav)return null;
  return {sections:[...nav.sections.keys()],
   actions:Object.fromEntries([...nav.sections].map(([id,part])=>
     [id,[...part.panel.querySelectorAll('button')].map(b=>b.textContent)]))};
 });
 assert.ok(quickSections,'P187 grouped quick menu installed');
 assert.deepEqual(quickSections.sections,['aventura','combate','oficios','sistema']);
 assert.ok(quickSections.actions.aventura.some(x=>x.includes('INVENTARIO')));
 assert.ok(quickSections.actions.aventura.some(x=>x.includes('MISIONES')));
 assert.ok(quickSections.actions.combate.some(x=>x.includes('15 SKILLS')));
 assert.ok(quickSections.actions.oficios.some(x=>x.includes('OFICIOS 1–20')));
 assert.ok(quickSections.actions.sistema.some(x=>x.includes('EDITAR HUD')));
 assert.ok(quickSections.actions.sistema.some(x=>x.includes('GUARDAR')));
 const switchWorks=await page.evaluate(()=>{
  const ui=window.game.touch.premium.p810;
  ui.toggleQuickMenu(true);
  ui.quickNav.sections.get('oficios').tab.click();
  const correct=ui.quickNav.selected==='oficios' &&
   !ui.quickNav.sections.get('oficios').panel.hidden &&
   ui.quickNav.sections.get('aventura').panel.hidden;
  ui.toggleQuickMenu(false);
  return correct;
 });
 assert.ok(switchWorks,'mobile tab switching works without losing original actions');
 await page.evaluate(()=>window.game.p187VillageGuide.open());
 const villageCopy=await page.locator('#hf-p187-inicios-guide').innerText();
 assert.ok(villageCopy.includes('Minería')&&villageCopy.includes('Encantamiento')&&
  villageCopy.includes('Fabricación de armaduras'),
  'the initial town registers all trade families in the existing HUD');
 await page.evaluate(()=>window.game.p187VillageGuide.close());
 const teaching=await page.evaluate(()=>{
  const g=window.game,prof=g.p187Professions;
  g.stats.level=2;
  const first=prof.learnAtTrainer('weaponcrafting','sigrid');
  const second=prof.learnAtTrainer('armorcrafting','sigrid');
  const previous=localStorage.getItem('highfly_p183_save');
  g.saveSys.save({silent:true});
  return {first:first.ok,second:second.ok,key:g.saveSys.key,
    saved:JSON.parse(localStorage.getItem('highfly_p187_save')).professionsP187,
    oldUnchanged:localStorage.getItem('highfly_p183_save')===previous};
 });
 assert.ok(teaching.first&&teaching.second,'real Sigrid trainer teaches weapon+armor');
 assert.equal(teaching.key,'highfly_p187_save','prior P185 save kept read-only');
 assert.equal(teaching.saved.learned.weaponcrafting,true);
 assert.equal(teaching.saved.learned.armorcrafting,true);
 assert.equal(teaching.oldUnchanged,true,'older P185 save never overwritten');
 await mkdir('audit-output',{recursive:true});
 try{await page.screenshot({path:'audit-output/p186-landscape.png',timeout:15000,animations:'disabled'});}
 catch(e){console.log('Noncritical screenshot:',e.message);}
 const fatal=errors.filter(s=>/pageerror|Uncaught|Cannot read properties|Module not found|Failed to resolve module/.test(s));
 if(fatal.length)throw Error('Browser errors: '+fatal.slice(0,5).join('\n'));
 console.log(JSON.stringify({status:'PASS',viewport:'1030x480',world:'P185',native:'P16',
  camera:state.camera,focus:true,centerDot:false,
  styles:5,skills:15,fx:casts.active,projectiles:casts.projectiles},null,2));
 await context.close();
}finally{await browser.close();}
