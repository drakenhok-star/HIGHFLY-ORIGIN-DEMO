/** HIGHFLY P16 full Three.js world smoke in software-rendered Android landscape.
 * This checks real source modules, not performance on a physical Samsung S23.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({
 executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
 headless:true,timeout:30000,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader','--disable-gpu-sandbox']
});
const errors=[];
try {
 const context=await browser.newContext({
  viewport:{width:915,height:412},deviceScaleFactor:1,
  isMobile:true,hasTouch:true,locale:'es-AR'
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8957/lab.html',{
   waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.highflySkillsLab&&!!window.game?.player?.rig,
   null,{timeout:90000});
 await page.waitForFunction(()=>!document.getElementById('asset-splash'),
   null,{timeout:80000});
 await page.evaluate(()=>document.getElementById('btn-new')?.click());
 await page.waitForFunction(()=>window.game?.state==='playing',
   null,{timeout:18000});
 const result=await page.evaluate(()=>{
   const g=window.game,l=window.highflySkillsLab;
   const assert=(condition,msg)=>{if(!condition)throw Error(msg);};
   assert(g.p14Enabled&&!!g.player.fury,'native FURY P14 missing');
   assert(g.player.rig.clips.has('Jump_Idle'),'real KayKit animated player missing');
   assert(!!document.querySelector('.hf-joy')&&
     !!document.querySelector('.hf-p5-atk'),'original joystick/ATK missing');
   assert(document.querySelectorAll('[data-style]').length===5,
     'expected 3 MOBA + 2 Claude styles');
   const required=['line','cone','zone','dash','self'];
   const shapes=[];
   for(let style=0;style<5;style++)for(let slot=1;slot<=3;slot++){
      l.aimGuide.begin(style,slot);
      const dir=g.player.getForward();
      const state=l.aimGuide.updateAim(dir);
      assert(l.aimGuide.root.children.length>=3,'reticle mesh missing');
      assert(l.aimGuide.root.children.every(o=>o.isMesh),
        'hairline primitive unexpectedly used');
      shapes.push(l.aimGuide.profile.kind);
      l.aimGuide.clear();
   }
   for(const kind of required)assert(shapes.includes(kind),
      'missing '+kind+' reticle');
   const p=g.player,origin=p.pos.clone(),forward=p.getForward();
   let landing=null;
   outer: for(const d of [4.5,3.0,2.0,5.8]){
     for(let i=0;i<12;i++){
       const angle=i*Math.PI*2/12;
       const x=origin.x+Math.sin(angle)*d,z=origin.z+Math.cos(angle)*d;
       const y=g.terrain.getHeight(x,z);
       const collide=g.scatter?.obstacles?.blocked?.(x,y,z,.5);
       if(!collide&& !g.structures.colliders.some(c=>{
         const dx=x-c.x,dz=z-c.z,co=Math.cos(c.ry),si=Math.sin(c.ry);
         return Math.abs(dx*co-dz*si)<c.hw+1.2 &&
           Math.abs(dx*si+dz*co)<c.hd+1.2;
       })){
         landing=origin.clone();landing.set(x,y,z);break outer;
       }
     }
   }
   assert(!!landing,'no clear target found for controlled landing test');
   g.stats.mp=g.stats.maxMp;
   p.onGround=true;p.dashT=-1;
   const direction=landing.clone().sub(origin).setY(0).normalize();
   const before=g.stats.mp;
   const cast=l.cast(2,direction,'qa',landing);
   assert(cast,'AERIAL S2 rejected clear landing destination');
   const pre={active:!!l.activeLeap,rec: l.canRecast(),spent:before-g.stats.mp};
   assert(pre.active&&!pre.rec&&pre.spent===23,
      'airborne S2 must not lift/recast before landing');
   // Explicitly emulate the native physics-confirmed landing transition.
   // This is a state-machine check; actual jump trajectory must be checked
   // on the user's phone.
   const start=l.activeLeap.started;
   p.dashT=-1;p.onGround=true;
   g.time.elapsed=start+.5;
   l.updateLeap();
   const post={active:!!l.activeLeap,recast:l.canRecast(),
     cooldown:l.cooldown(2)};
   assert(!post.active&&post.recast&&post.cooldown===0,
      'landing impact must unlock combo recast');
   l.setStyle(3);
   g.time.elapsed=Math.max(g.time.elapsed,l.busyUntil+.45);
   g.stats.mp=g.stats.maxMp;
   const mana=g.stats.mp;
   const magic=l.cast(1,direction,'qa');
   assert(magic&&mana-g.stats.mp===20&&l.cooldown(1)>0,
     'ClaudeCraft-inspired Fireball must spend HIGHFLY MP / start cooldown');
   l.setStyle(4);
   g.time.elapsed=Math.max(g.time.elapsed,l.busyUntil+.45);
   g.stats.sp=g.stats.maxSp;
   const stamina=g.stats.sp;
   const stab=l.cast(1,direction,'qa');
   assert(stab&&stamina-g.stats.sp===17&&l.cooldown(1)>0,
     'ClaudeCraft-inspired Backstab must spend HIGHFLY energy / start cooldown');
   l.setStyle(0);
   l.aimGuide.begin(0,2);
   const ground=l.aimGuide.updateAim(direction,landing);
   assert(ground?.target&&l.aimGuide.profile.kind==='zone',
     'Aerial S2 previews a GROUND CIRCLE before impact');
   l.aimGuide.clear();
   return {styles:5,skills:15,shapes:[...new Set(shapes)],pre,post,
     resources:{fireballMana:20,backstabEnergy:17},
     rig:g.player.rig.clips.size,canvas:g.renderer.domElement.tagName};
 });
 console.log('P16 BROWSER:',JSON.stringify(result));
 assert.deepEqual(errors,[],'no unhandled JavaScript errors during P16 gameplay');
 console.log('PASS P16: 5 styles / 15 skills on real P14 FURY + KayKit, thick reticles, landing gate, Claude mana/stamina.');
 await context.close();
}finally{await browser.close();}
