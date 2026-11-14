import {chromium} from 'playwright';
import fs from 'node:fs';
const failures=[],notes=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:823,height:384},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage();
page.on('pageerror',err=>failures.push('JS '+err.message));
page.on('console',msg=>{if(msg.type()==='error')failures.push('console '+msg.text())});
page.on('response',res=>{if(res.status()>=400&&/world\.js|three\.module|GLTFLoader/.test(res.url()))failures.push('HTTP '+res.status()+' '+res.url())});
for(const kind of ['manual','wfc']){
 try{
  await page.goto('http://127.0.0.1:8765/labs/worldforge-compare-4x/?world='+kind+'&finish=premium',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.HIGHFLY_TEST,undefined,{timeout:60000});
  await page.waitForTimeout(1200);
  const data=await page.evaluate(()=>({
   world:window.HIGHFLY_TEST.worldMode,
   size:window.HIGHFLY_TEST.sizeRatio,
   seam:window.HIGHFLY_TEST.runSeamTest(),
   wfc:window.HIGHFLY_TEST.wfcStats(),
   finish:window.HIGHFLY_TEST.getFinish(),
   player:window.HIGHFLY_TEST.getPlayerPosition()
  }));
  notes.push(kind+': scene ready '+JSON.stringify(data));
  if(data.world!==kind)failures.push(kind+': world mode mismatch');
  if(data.size!==4)failures.push(kind+': size scale mismatch');
  if(!data.seam.pass)failures.push(kind+': seam test failed '+JSON.stringify(data.seam));
  if(data.finish!==2)failures.push(kind+': premium not initialized');
  if(kind==='wfc'&&data.wfc.length!==5)failures.push('WFC generation missing');
  if(kind==='manual'&&data.wfc.length)failures.push('Manual mode unexpectedly creates WFC map');
  if(await page.locator('#loading').count())failures.push(kind+': loading overlay still visible');
  const bounds=await page.locator('#joystick').boundingBox();
  if(!bounds){failures.push(kind+': joystick not visible');continue}
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  const posBefore=await page.evaluate(()=>window.HIGHFLY_TEST.getPlayerPosition());
  const client=await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y:y-26}]});
  await page.waitForTimeout(650);
  const joy=await page.evaluate(()=>window.HIGHFLY_TEST.getJoystick());
  const posAfter=await page.evaluate(()=>window.HIGHFLY_TEST.getPlayerPosition());
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
  const displacement=Math.hypot(posAfter.x-posBefore.x,posAfter.z-posBefore.z);
  notes.push(kind+': joystick='+JSON.stringify(joy)+' move='+displacement.toFixed(3));
  if(displacement<.15)failures.push(kind+': joystick touch did not move player');
  await page.locator('[data-mode="1"]').click();
  const normal=await page.locator('#modeLabel').innerText();if(normal!=='NORMAL')failures.push(kind+': normal finish failed '+normal);
  await page.locator('[data-mode="2"]').click();
  const premium=await page.locator('#modeLabel').innerText();if(premium!=='PREMIUM')failures.push(kind+': premium finish failed '+premium);
  const fsBtn=page.locator('#fullscreen');if(!(await fsBtn.isVisible()))failures.push(kind+': fullscreen button hidden');
  else{await fsBtn.click();notes.push(kind+': fullscreen='+await page.evaluate(()=>!!document.fullscreenElement));}
  await page.screenshot({path:'/tmp/hf-worldforge-4x-'+kind+'.png'});
 }catch(e){failures.push(kind+': EXCEPTION '+e.message)}
}
await browser.close();
const report='WORLD FORGE 4X ANDROID QA\n'+notes.join('\n')+'\nFAILURES:\n'+failures.join('\n')+'\n';
fs.writeFileSync('/tmp/hf-worldforge-4x-smoke.txt',report);process.stdout.write(report);if(failures.length)process.exitCode=1;
