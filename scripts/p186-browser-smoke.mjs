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
