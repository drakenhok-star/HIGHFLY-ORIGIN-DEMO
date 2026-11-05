/**
 * HIGHFLY L22 full 3-target FURY P16 Skills Lab graphical smoke test for GitHub Actions (not an Android proof).
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
 await page.goto('http://127.0.0.1:8957'+(process.env.HF_LAB_ENTRY||'/lab.html')+'?hf_training=1',{waitUntil:'domcontentloaded',timeout:30000});
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
 await page.waitForFunction(()=>!!window.highflySkillsLab?.aimGuide &&
   !!window.highflyCameraLab?.config,null,{timeout:15000});
 const integration=await page.evaluate(()=>{
   const g=window.game,l=window.highflySkillsLab,c=window.highflyCameraLab;
   return {p16:g.p16Enabled,player:g.player?.rig!==undefined,
     save:g.saveSys?.key,skillStyles:l.ready.length,
     mode:c.config.preset,dist:g.player.camDist,
     sameCombat:g.combat.melee===Object.getPrototypeOf(g.combat).melee};
 });
 assert.ok(integration.p16&&integration.player&&integration.sameCombat,
   'P19 must preserve original P16 melee and player');
 assert.equal(integration.skillStyles,5);
 assert.equal(integration.mode,'hybrid');
 assert.equal(integration.dist,8.5);
 assert.equal(integration.save,'highfly_fury_skill_lab_l22_save');
 // GitHub Pages projects under the same account share an origin.
 const saveIsolation=await page.evaluate(()=>{
   const save=window.game.saveSys;
   const original=localStorage.getItem('highfly_p16_save');
   const marker='{"mainDemoMustStayUnchanged":true}';
   localStorage.setItem('highfly_p16_save',marker);
   localStorage.removeItem(save.key);
   const isolatedRead=!save.hasSave()&&save.loadRaw()===null;
   save.save();
   const untouched=localStorage.getItem('highfly_p16_save')===marker;
   const isolatedWrite=localStorage.getItem(save.key)!==null;
   if(original===null)localStorage.removeItem('highfly_p16_save');
   else localStorage.setItem('highfly_p16_save',original);
   return {isolatedRead,isolatedWrite,untouched};
 });
 assert.ok(Object.values(saveIsolation).every(Boolean),
   'Lab must never import or overwrite a P16 production save');
 const staticLab=await page.evaluate(()=>{
   const g=window.game,l=window.highflySkillsLab;
   const isStatic=()=>g.enemies.list.every(e=>e.training&&e.alive&&
     e.speed===0&&e.dmg===0&&e.aggroR===0);
   const start={count:g.enemies.list.length,isStatic:isStatic(),
     packCount:g.enemies.packs.length,dragon:!!g.enemies.dragon,
     bolts:g.enemies.bolts.length,loot:g.enemies.lootDrops.length};
   l.spawnTraining(false,3);
   const three={count:g.enemies.list.length,isStatic:isStatic(),
     distinctRig:g.enemies.list.every(e=>!!e.rig&&e.rig.root.parent===e.group)};
   const t=g.enemies.list[1],hp=t.hp,xp=g.stats.xp,loot=g.enemies.lootDrops.length;
   const impulse=g.player.vel.clone().set(1.5,9,0);
   t.takeDamage(85,impulse);
   const damage={realHp:t.hp<hp,launchImpulse:t.kbVel.y>8,
     xpUnchanged:g.stats.xp===xp,lootUnchanged:g.enemies.lootDrops.length===loot};
   g.enemies.update(.08);
   damage.airborne=t.group.position.y>g.terrain.getHeight(t.group.position.x,
     t.group.position.z)+.02;
   // A 4th-hit launches; idle enemy NEVER attacks or chases.
   l.spawnTraining(false,1);
   const remaining={count:g.enemies.list.length,isStatic:isStatic()};
   l.resetTraining();
   return {start,three,damage,remaining,
     fullResources:g.stats.hp===g.stats.maxHp &&
       g.stats.mp===g.stats.maxMp&&g.stats.sp===g.stats.maxSp};
 });
 assert.deepEqual(staticLab.start,{count:3,isStatic:true,
   packCount:0,dragon:false,bolts:0,loot:0},
   'three stationary non-aggressive training rigs by default');
 assert.ok(staticLab.three.count===3&&staticLab.three.isStatic&&staticLab.three.distinctRig,
   'three actual rigged enemies, no global mob packs');
 assert.ok(Object.values(staticLab.damage).every(Boolean),
   'training takes real damage, obeys P16 launch, no XP or drops');
 assert.ok(staticLab.remaining.count===1&&staticLab.remaining.isStatic&&staticLab.fullResources,
   '1/3 control and reset resources work');
 const cameraRoundTrip=await page.evaluate(()=>{
   const c=window.highflyCameraLab,g=window.game;
   c.selectProfile('moba');
   const elevated=g.player.camDist===10&&Math.abs(g.player.pitch*180/Math.PI+46)<.01;
   c.selectProfile('hybrid');
   return {elevated,hybrid:g.player.camDist===8.5,
     preserved:g.combat.melee===Object.getPrototypeOf(g.combat).melee};
 });
 assert.ok(cameraRoundTrip.elevated&&cameraRoundTrip.hybrid&&cameraRoundTrip.preserved);
 const telegraphs=await page.evaluate(()=>{
   const l=window.highflySkillsLab,g=window.game;
   const heights=g.terrain.getHeight;
   const h=(x,z)=>Math.sin(x*.6)*1.5+Math.cos(z*.3)*2;
   g.terrain.getHeight=h;
   let count=0,above=true;
   try{
     l.aimGuide.begin(0,2);
     l.aimGuide.updateAim(g.player.getForward());
     l.aimGuide.root.updateMatrixWorld(true);
     for(const mesh of l.aimGuide.root.children){
       const points=mesh.geometry.attributes.position;
       for(let i=0;i<points.count;i+=Math.max(1,Math.floor(points.count/20))){
         const v=new g.camera.position.constructor(points.getX(i),points.getY(i),points.getZ(i));
         v.applyMatrix4(mesh.matrixWorld);
         if(v.y<h(v.x,v.z)+.08)above=false;
         count++;
       }
     }
     l.aimGuide.clear();
     l.aimGuide.begin(3,2);
     return {count,above,meteorArc:l.aimGuide.pathEnabled};
   }finally{
     g.terrain.getHeight=heights;
     l.aimGuide.clear();
   }
 });
 assert.ok(telegraphs.count>30&&telegraphs.above&&!telegraphs.meteorArc,
   'Guinevere and meteor reticles use per-vertex terrain, without universal arcs');
 const frameP95=await page.evaluate(()=>new Promise(resolve=>{
   const values=[],raf=requestAnimationFrame.bind(window);
   let last=performance.now();
   const frame=now=>{
     values.push(now-last);last=now;
     if(values.length>=150){
       values.sort((a,b)=>a-b);
       resolve({p95:values[Math.floor(values.length*.95)],
         frames:values.length});
     }else raf(frame);
   };
   raf(frame);
 }));
 console.info('L22 Chrome software WebGL FPS P95 ms '+frameP95.p95.toFixed(1)+
   ' (simulator only, not Samsung P95)');
 assert.ok(await page.locator('#hf-p810-bag').isVisible(),'bag shortcut visible');
 if(await page.evaluate(()=>window.game.p15Enabled)){
  const p15=await page.evaluate(()=>({saveKey:window.game.saveSys.key,active:window.game.p15Enabled,
   menuText:document.getElementById('hf-p810-quick')?.textContent||'',
   initialized:window.game.combat?._meleeContext==='ground'}));
  assert.ok(p15.active&&p15.initialized,'P15 combat registered in the live 3D game');
  assert.equal(p15.saveKey,'highfly_fury_skill_lab_l22_save','L22 isolated save');
  assert.ok(!p15.menuText.includes('PROBAR PARKOUR')&&!p15.menuText.includes('MESETA MONTAÑOSA'),
   'temporary P14 teleport tools removed from player menu');
  const finisher=await page.evaluate(()=>{
   const g=window.game,c=g.combat;
   const before=g.stats.sp;
   g.stats.sp=Math.max(20,before);
   c.comboStep=3;c.comboTimer=.85;c.meleeCd=0;
   // Left stick must NEVER steer the fourth hit.
   g.input.touchMove.x=0;g.input.touchMove.y=1;
   g.touch._atkPointer=71;
   g.touch._atkContact={x:100,y:100,lastX:100,lastY:100};
   c.melee();
   const pendingStep=c.comboStep;
   g.input.furyFinisherGesture={x:0,y:-1,active:true};
   c.meleeHitT=-1;c.resolveMelee();
   const sample={step:pendingStep,mode:c._finisher?.mode,vy:c._finisher?.vy,
      energySpent:g.stats.sp<Math.max(20,before)};
   g.touch._atkPointer=null;g.touch._atkContact=null;
   g.touch.clearFinisherGesture();
   g.input.touchMove.x=0;g.input.touchMove.y=0;
   c.meleeHitT=-1;c.meleeCd=0;c.comboStep=0;c.comboTimer=0;c._finisher=null;
   g.player.attackT=-1;
   return sample;
  });
  assert.equal(finisher.step,await page.evaluate(()=>window.game.p16Enabled?3:4),'P16 attempts cannot advance before impact');
  assert.equal(finisher.mode,'launch','UP ATK drag produces fourth-hit launch independent of left stick');
  assert.ok(finisher.vy>8.5 && !finisher.energySpent,'L22 basic ATK free with preserved launcher physics');
  if(await page.evaluate(()=>window.game.p16Enabled)){
    const result=await page.evaluate(()=>{
      const g=window.game,c=g.combat,trainer=g.enemies.list.find(e=>e.training);
      if(!trainer)return {reason:'trainer absent'};
      const p=g.player.pos,dir=g.player.getCombatForward();
      const old={x:trainer.group.position.x,y:trainer.group.position.y,z:trainer.group.position.z};
      // Validated miss: trainer far away, lock removed and all other targets
      // near the town excluded with a perpendicular forward direction.
      const missed=c.comboStep===0;
      const farHP=trainer.hp;
      c.meleeCd=0;c.meleeHitT=-1;c.comboTimer=0;
      trainer.group.position.set(p.x+75,p.y,p.z+75);
      g.targeting.locked=null;
      c.melee();c.meleeHitT=-1;c.resolveMelee();
      const afterMiss=c.comboStep===0 && !c.lastConfirmedHit && trainer.hp===farHP;
      // Bring real training enemy in the natural strike arc. No fake damage.
      trainer.group.position.set(p.x+dir.x*1.9,p.y,p.z+dir.z*1.9);
      g.targeting.locked=trainer;
      const hits=[];
      for(let i=1;i<=4;i++){
        c.meleeCd=0;c.attackBuffer=0;c.meleeHitT=-1;
        g.stats.sp=Math.max(30,g.stats.sp);
        g.input.touchMove.x=0;g.input.touchMove.y=1;
        if(i===4){g.touch._atkPointer=74;g.touch._atkContact={x:50,y:50,lastX:50,lastY:50};}
        c.melee();
        if(i===4)g.input.furyFinisherGesture={x:0,y:-1,active:true};
        const before=c.comboStep;
        c.meleeHitT=-1;c.resolveMelee();
        hits.push({before,after:c.comboStep,confirmed:c.lastConfirmedHit});
      }
      g.input.touchMove.y=0;g.touch._atkPointer=null;g.touch._atkContact=null;
      g.touch.clearFinisherGesture();g.targeting.locked=null;
      trainer.group.position.set(old.x,old.y,old.z);
      c.comboStep=0;c.comboTimer=0;c.meleeCd=0;c.meleeHitT=-1;c._finisher=null;
      g.player.attackT=-1;
      return {missed,afterMiss,hits,trainerAlive:trainer.alive&&trainer.hp>0,
        upperBodyAvailable:g.player.rig.supportsUpperBody('1H_Melee_Attack_Slice_Diagonal')};
    });
    assert.equal(result.afterMiss,true,'swinging in the air cannot advance combo');
    assert.deepEqual(result.hits.map(h=>h.after),[1,2,3,4],
      'four confirmed enemy HP losses, not four ATK button presses');
    assert.ok(result.hits.every(h=>h.confirmed),'each strike must land');
    assert.equal(result.trainerAlive,true,'trainer provides no kill or loot');
  }
  const interruption=await page.evaluate(()=>{
    const g=window.game,c=g.combat,s=g.stats,p=g.player;
    c.comboStep=3;c.comboTimer=.8;c.meleeHitT=.1;c._finisher={mode:'launch'};
    const initialHp=s.hp;
    p.dodgeInvulnT=.12;
    s.damage(5);
    const dodgeKept=c.comboStep===3 && s.hp===initialHp;
    p.dodgeInvulnT=0;
    s.damage(5);
    const hitBroke=c.comboStep===0&&c.meleeHitT===-1&&c._finisher===null&&s.hp<initialHp;
    s.hp=initialHp;
    return {dodgeKept,hitBroke};
  });
  assert.ok(interruption.dodgeKept,'successful dodge preserves combo and HP');
  assert.ok(interruption.hitBroke,'real enemy hit breaks the combo and pending fourth strike');
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
  try{await page.screenshot({path:'audit-output/l22-mobile-landscape.png',animations:'disabled',fullPage:false,timeout:15000});}
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
 assert.ok(await page.evaluate(()=>localStorage.getItem(window.game.saveSys.key)!==null),'P812 and P810 save separately from P7');
 await mkdir('audit-output',{recursive:true});
 if(process.env.HF_CAPTURE==='1'){
  try{await page.screenshot({path:'audit-output/l22-mobile-landscape.png',animations:'disabled',fullPage:false,timeout:15000});}
  catch(err){console.warn('[P812] Optional software-rendered screenshot unavailable:',err.message);}
 }
 // Flying-target simulator: same genuine animated rig, hovering 4.5u above terrain.
 const flight=await page.evaluate(()=>{
   const g=window.game,l=window.highflySkillsLab;
   g.enemies.trainingFlight=true;
   g.enemies.configureTrainingTargets(3);
   const enemy=g.enemies.list.find(e=>e.trainingFlight);
   if(!enemy)return {found:false};
   const ground=g.terrain.getHeight(enemy.group.position.x,enemy.group.position.z);
   const mark=enemy.group.position.clone().setY(ground);
   const defaultGround=l.candidates(mark,3,null,180,2.1).includes(enemy);
   const verticalUltimate=l.candidates(mark,3,null,180,7.3).includes(enemy);
   l.aimGuide.begin(3,1);
   const projectileUp=new g.player.pos.constructor(0,.58,-.815);
   l.aimGuide.updateAim(projectileUp);
   const tracerUp=l.aimGuide.aerialBeam.visible &&
     l.aimGuide.aerialTip.position.y>g.player.pos.y+3;
   l.aimGuide.clear();
   return {found:true,height:enemy.group.position.y-ground,
     defaultGround,verticalUltimate,tracerUp};
 });
 assert.ok(flight.found&&flight.height>4.3&&!flight.defaultGround&&
   flight.verticalUltimate&&flight.tracerUp,
   'L22 sky target receives 3D projectile/ultimate but cannot be struck by ground-only AoE');
 const labUI=await page.evaluate(()=>({
   quality:window.highflySkillsLab.quality,
   noQualityButton:!document.getElementById('hf-lab-quality'),
   cameraDockHidden:getComputedStyle(document.getElementById('hf-p18-camera-dock')).display==='none',
   xReady:!!document.getElementById('hf-lab-cancel')
 }));
 assert.ok(labUI.quality===2&&labUI.noQualityButton&&labUI.cameraDockHidden&&labUI.xReady,
   'Premium FX default; settings moved out of HUD; cancel X exists');
 // A failed optional WebGL preview is graceful; actual JS exceptions are not.
 const fatal=errors.filter(s=>/pageerror:|Uncaught|Cannot read properties|Failed to resolve module|Failed to fetch dynamically|404 .*p810|Script error/.test(s));
 if(fatal.length)throw new Error('Browser exceptions: '+fatal.slice(0,5).join('\n'));
 console.log(JSON.stringify({status:'PASS',viewport:'915x412',editorControls:editorCount,filledBagSlots:filled,joystickAttackBug:false,errors:errors.slice(0,5)},null,2));
 await context.close();
}finally{await browser.close();}
