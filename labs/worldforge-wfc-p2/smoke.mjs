import {chromium} from 'playwright';
import fs from 'node:fs';
const failures=[],logs=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:915,height:412},isMobile:true,hasTouch:true,deviceScaleFactor:1.5});
const page=await context.newPage();
page.on('pageerror',err=>failures.push('JS '+err.message));
page.on('console',m=>{if(m.type()==='error')failures.push('CONSOLE '+m.text())});
page.on('response',r=>{if(r.status()>=400&&/world\.js|three\.module|GLTFLoader|\/assets\/.+\.glb/.test(r.url()))failures.push('HTTP '+r.status()+' '+r.url())});
for(const seed of ['AETHERIA-07','VALLE-21']){
 try{
  const start=Date.now();
  await page.goto('http://127.0.0.1:8765/labs/worldforge-wfc-p2/?seed='+seed+'&finish=premium',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.HIGHFLY_TEST&&window.HIGHFLY_TEST.biomeCount===13,undefined,{timeout:90000});
  await page.waitForFunction(()=>!document.querySelector('#loading'),undefined,{timeout:45000});
  await page.waitForFunction(()=>window.HIGHFLY_TEST.getFreeAssets().loaded>0,{timeout:20000});
  const qa=await page.evaluate(()=>{
   const t=window.HIGHFLY_TEST;
   const lakes=t.lakes.map(l=>{
    const probes=[];
    for(let frac=0;frac<=1.05;frac+=.05){
      const x=l.x+l.r*frac,z=l.z,bed=t.groundHeight(x,z);
      const water=t.waterAt(x,z,bed);
      probes.push({f:frac.toFixed(2),depth:water.depth,kind:water.kind});
    }
    return {reg:l.reg,levels:[...new Set(probes.map(p=>p.kind))],maxDepth:Math.max(...probes.map(p=>p.depth))};
   });
   return {seed:t.seed,regions:t.regions.length,scale:t.sizeRatio,mode:t.getFinish(),seams:t.runSeamTest(),wfc:t.wfcStats(),free:t.getFreeAssets(),water:lakes};
  });
  logs.push(seed+' LOADED in '+(Date.now()-start)+'ms '+JSON.stringify(qa));
  if(qa.seed!==seed||qa.regions!==13||qa.scale!==8||qa.mode!==2)failures.push(seed+' map metadata wrong');
  if(!qa.seams.pass)failures.push(seed+' 13-region seam test FAILED '+JSON.stringify(qa.seams));
  if(qa.wfc.length!==13||qa.wfc.some(w=>w.cells!==469))failures.push(seed+' WFC has incomplete tiles');
  if(qa.free.failed>0||qa.free.loaded<12)failures.push(seed+' missing real CC0 buildings '+JSON.stringify(qa.free));
  const kinds=new Set(qa.water.flatMap(l=>l.levels));
  if(!kinds.has('orilla')||!kinds.has('vadeo')||!kinds.has('profunda'))failures.push(seed+' water progression missing '+[...kinds]);
  const joystick=page.locator('#joystick'),box=await joystick.boundingBox();
  if(!box){failures.push(seed+' joystick not visible');continue}
  const posA=await page.evaluate(()=>window.HIGHFLY_TEST.getPlayerPosition());
  const c=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+25,y:y-25}]});
  await page.waitForTimeout(700);
  const joy=await page.evaluate(()=>window.HIGHFLY_TEST.getJoystick());
  const posB=await page.evaluate(()=>window.HIGHFLY_TEST.getPlayerPosition());
  await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();
  const movement=Math.hypot(posB.x-posA.x,posB.z-posA.z);
  logs.push(seed+' JOYSTICK '+movement.toFixed(3)+' '+JSON.stringify(joy));
  if(movement<.2)failures.push(seed+' third-person joystick did not move hero');
  for(let id=1;id<=12;id++){
   await page.locator('#travel').click();
   await page.locator('[data-region="'+id+'"]').click();
   await page.waitForTimeout(75);
   const actual=await page.evaluate(()=>{const t=window.HIGHFLY_TEST,p=t.getPlayerPosition();return t.regionAt(p.x,p.z)?.id??-1});
   if(actual!==id)failures.push(seed+' travel '+id+' spawned in '+actual);
  }
  logs.push(seed+' TRAVEL 12/12 tested');
  await page.locator('[data-mode="1"]').click();
  if(await page.locator('#modeLabel').innerText()!=='NORMAL')failures.push(seed+' normal finish switch failed');
  await page.locator('[data-mode="2"]').click();
  if(await page.locator('#modeLabel').innerText()!=='PREMIUM')failures.push(seed+' premium finish switch failed');
  await page.locator('#fullscreen').click();await page.waitForTimeout(100);
  logs.push(seed+' FULLSCREEN '+await page.evaluate(()=>!!document.fullscreenElement));
  await page.locator('#reset').click();
  await page.screenshot({path:'/tmp/hf-p2-'+seed+'.png'});
 }catch(e){failures.push(seed+' EXCEPTION '+e.message)}
}
await browser.close();
const report='HIGHFLY P2 WFC PREMIUM EXPLORE\n'+logs.join('\n')+'\nFAILURES:\n'+failures.join('\n')+'\n';
fs.writeFileSync('/tmp/hf-p2-qa.txt',report);
process.stdout.write(report);
if(failures.length)process.exitCode=1;
