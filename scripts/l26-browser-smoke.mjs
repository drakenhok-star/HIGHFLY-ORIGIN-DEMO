/**
 * HIGHFLY L26 browser smoke: real module graph, 915x412 touch viewport,
 * HUD drag/size persistence and all six Claude VFX + nine original HIGHFLY.
 * Requires playwright-core and a system Chrome.
 * This is software-rendered CI, not measured GPU performance on S23 Ultra.
 */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const errs=[];
const browser=await chromium.launch({
 executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
 headless:true,timeout:30000,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader','--disable-gpu-sandbox']
});
try {
 const context=await browser.newContext({
  viewport:{width:915,height:412},deviceScaleFactor:1,
  isMobile:true,hasTouch:true,locale:'es-AR'
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errs.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
 await page.goto('http://127.0.0.1:5520/lab.html?hf_touch=1',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.game?.touch?.premium?.p810?.editor,
  null,{timeout:90000});
 await page.waitForFunction(()=>document.getElementById('asset-splash')===null,
  null,{timeout:60000});
 await page.locator('#btn-new').click({timeout:30000});
 await page.waitForFunction(()=>window.game?.state==='playing'&&
  !!window.highflySkillsLab?.claudeFx,null,{timeout:20000});
 await page.waitForFunction(()=>window.game.touch.premium.p810.editor.elements.has('focus'),
  null,{timeout:12000}).catch(async error=>{
   const diagnostic=await page.evaluate(()=>{
    const g=window.game,l=window.highflySkillsLab;
    const ed=g?.touch?.premium?.p810?.editor;
    return {state:g?.state,time:g?.time?.elapsed,lab:!!l,
      styles:l?.style,editor:!!ed,registered:ed?.elements?.has('focus'),
      ids:ed?.layout?Object.keys(ed.layout):null,
      focusInDom:!!document.querySelector('#hf-l23-focus'),
      lastHud:l?.lastHud,focusEditor:!!l?.focusEditor};
   });
   try{await mkdir('audit-output',{recursive:true});await page.screenshot({
      path:'audit-output/l26-failure.png',timeout:8000});}catch(_){}
   throw new Error('ENFOCAR HUD registration timeout: '+JSON.stringify(diagnostic)+
     ' errors='+errs.slice(0,5).join(' | ')+' cause='+error.message);
  });
 const hud=await page.evaluate(()=>{
  const g=window.game,e=g.touch.premium.p810.editor;
  const lab=window.highflySkillsLab;
  const focus=document.getElementById('hf-l23-focus');
  const hadLayout=JSON.parse(localStorage.getItem('hf_p812_hud_layout_v2')||'null');
  const before=focus.getBoundingClientRect().toJSON();
  e.start();e.choose('focus');
  e.change('x',.65);e.change('y',.76);
  e.change('size',61);e.change('opacity',.65);e.persist();
  const after=focus.getBoundingClientRect().toJSON();
  const saved=JSON.parse(localStorage.getItem('hf_p812_hud_layout_v2'));
  e.stop();
  return {registered:e.elements.has('focus'),label:e.select.value,
   before,after,editSize:e.layout.focus.size,
   saved:saved.layout.focus,focusInDOM:!!focus,priorSaved:!!hadLayout,
   previousCallbackActive:typeof g.combat.melee==='function',
   focusUpstreamSource:!!lab.airRupture};
 });
 assert.ok(hud.registered&&hud.focusInDOM&&hud.focusUpstreamSource);
 assert.equal(hud.label,'focus');
 assert.equal(hud.editSize,61);
 assert.equal(hud.saved.size,61);
 assert.equal(hud.saved.opacity,.65);
 assert.equal(hud.saved.x,.65);
 assert.equal(hud.saved.y,.76);
 assert.ok(Math.abs(hud.after.left-hud.before.left)>20,
  'ENFOCAR actually moves in the editable HUD');
 assert.ok(hud.after.width>hud.before.width,
  'ENFOCAR actually changes rendered size');
 assert.ok(hud.previousCallbackActive,'original P16 melee bridge available');
 const effects=await page.evaluate(()=>{
   const g=window.game,lab=window.highflySkillsLab;
   const three=lab.game.player.pos.constructor;
   const origin=g.player.pos.clone();
   const raw=g.player.getCombatForward();
   const forward=raw.lengthSq()>.1?raw.clone().normalize():new three(0,0,-1);
   const enemy=g.enemies.list.find(x=>x.training&&!x.trainingDragon&&x.alive);
   if(!enemy)throw new Error('No skeleton training target');
   const at=enemy.group.position.clone();
   lab.claudeFx.fireCharge(origin,forward);
   lab.claudeFx.fireImpact(at);
   lab.claudeFx.meteorSkybeam(at,.65);
   lab.claudeFx.meteorDetonate(at);
   lab.claudeFx.frostNova(origin,[enemy]);
   lab.claudeFx.backstabContact(enemy,forward,true);
   lab.claudeFx.kidneyContact(enemy,forward);
   lab.claudeFx.chargeWindup(origin,forward);
   lab.claudeFx.chargeCrash(at,forward,1);
   let profileCount=0;
   for(let style=0;style<3;style++)for(let slot=1;slot<=3;slot++){
     lab.premiumFx.onCast(style,slot,origin,forward,at);
     profileCount++;
   }
   lab.fx.update(1/60);
   const active=lab.fx.active.length;
   const dragon=g.enemies.list.find(x=>x.trainingDragon&&x.alive);
   const count=g.enemies.list.filter(x=>x.training).length;
   const flyerCandidates=lab.aerialFocusCandidates();
   return {profiles:profileCount,active,cap:lab.fx.poolLimit,trainCount:count,
     dragon:!!dragon,allFocusAreFlyers:flyerCandidates.every(x=>x.air),
     originalP16:g.p16Enabled,editorStillPlaying:g.state==='playing'};
 });
 assert.equal(effects.profiles,9);
 assert.ok(effects.active>3 && effects.active<=effects.cap);
 assert.equal(effects.trainCount,4);
 assert.ok(effects.dragon&&effects.allFocusAreFlyers&&effects.originalP16);
 assert.ok(effects.editorStillPlaying);
 await mkdir('audit-output',{recursive:true});
 try{await page.screenshot({path:'audit-output/l26-landscape.png',
  animations:'disabled',timeout:15000});}
 catch(err){console.warn('[L26] software screenshot optional:',err.message);}
 const fatal=errs.filter(s=>/pageerror:|Uncaught|Cannot read properties|Failed to resolve module|Script error/.test(s));
 if(fatal.length)throw Error('L26 browser exceptions:\n'+fatal.slice(0,7).join('\n'));
 console.log(JSON.stringify({status:'PASS',viewport:'915x412',
  hud:{registered:hud.registered,move:true,scale:true,persist:true},
  vfx:{claudeSix:'all callable',mobaNine:effects.profiles,active:effects.active},
  training:{count:effects.trainCount,dragon:true,airFocusOnly:true},
  errors:errs.slice(0,5)},null,2));
 await context.close();
} finally {
 await browser.close();
}
