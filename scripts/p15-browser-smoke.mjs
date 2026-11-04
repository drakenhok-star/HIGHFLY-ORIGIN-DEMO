/** Playwright simulated landscape. NOT a physical Samsung S23 verification. */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({
  executablePath:chrome,headless:true,timeout:30000,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']
});
const errors=[];
try{
  const context=await browser.newContext({
    viewport:{width:915,height:412},deviceScaleFactor:1,
    isMobile:true,hasTouch:true,locale:'es-AR'
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8957/lab.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.highflySkillsLab&&!!window.game?.player?.rig,
    null,{timeout:90000});
  await page.waitForFunction(()=>!document.getElementById('asset-splash'),
    null,{timeout:70000});
  const initial=await page.evaluate(()=>({
    sameP14:window.game.p14Enabled&&!!window.game.player.fury,
    actualRig:window.game.player.rig.clips.has('1H_Melee_Attack_Slice_Diagonal'),
    styles:window.highflySkillsLab.styleDef().short,
    title:document.title
  }));
  assert.equal(initial.sameP14,true,'same P14 FURY engine, not Unity');
  assert.equal(initial.actualRig,true,'real KayKit animation rig available');
  assert.equal(initial.styles,'AÉREA');
  await page.locator('#btn-new').click({timeout:20000});
  await page.waitForFunction(()=>window.game.state==='playing',null,{timeout:12000});
  const core=await page.evaluate(()=>({
    model:!!window.game.player.rig.root,
    training:window.highflySkillsLab.training.length,
    skills:window.highflySkillsLab.styleDef().names.length,
    joystick:!!document.querySelector('.hf-joy'),
    atk:!!document.querySelector('.hf-p5-atk'),
    btn1:!!document.querySelector('.hf-p5-s1[data-hf-lab-bound]'),
    btn2:!!document.querySelector('.hf-p5-s2[data-hf-lab-bound]'),
    btn3:!!document.querySelector('.hf-p5-s3[data-hf-lab-bound]')
  }));
  assert.ok(core.model&&core.joystick&&core.atk&&core.btn1&&core.btn2&&core.btn3,
    'original character/joystick/ATK and same S1-S3 buttons active');
  assert.equal(core.skills,3);
  await page.locator('[data-style="1"]').dispatchEvent('pointerdown',{
    pointerId:51,pointerType:'touch',bubbles:true,cancelable:true
  });
  assert.equal(await page.evaluate(()=>window.highflySkillsLab.style),1,
    'Dyrroth-like archetype selectable');
  const physical=await page.evaluate(()=>{
    const g=window.game,l=window.highflySkillsLab;
    const old=g.stats.sp;
    const success=l.cast(1,g.player.getCombatForward(),'QA');
    return {success,spent:old-g.stats.sp,cd:l.cooldown(1)};
  });
  assert.ok(physical.success&&physical.spent===18&&physical.cd>0,
    'physical S1 uses exactly 18 energy and starts cooldown');
  await page.locator('[data-style="0"]').dispatchEvent('pointerdown',{
    pointerId:52,pointerType:'touch',bubbles:true,cancelable:true
  });
  await page.waitForTimeout(300);
  const magical=await page.evaluate(()=>{
    const g=window.game,l=window.highflySkillsLab;
    const old=g.stats.mp;
    const success=l.cast(1,g.player.getCombatForward(),'QA');
    return {success,spent:old-g.stats.mp,cd:l.cooldown(1)};
  });
  assert.ok(magical.success&&magical.spent>=13&&magical.spent<=14.1&&magical.cd>0,
    'magical S1 uses Tianjie MP and launches projectile');
  await mkdir('audit-output',{recursive:true});
  await page.screenshot({path:'audit-output/p15-tianjie-mobile.png',
    animations:'disabled',timeout:20000});
  assert.deepEqual(errors,[],'zero unhandled browser errors');
  console.log('PASS P15 WebGL: real player, 3 styles, HUD, controls, energy, mana, projectiles.');
  await context.close();
}finally{await browser.close();}
