import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const context=await browser.newContext({viewport:{width:823,height:384},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage();
const failures=[],notes=[];
page.on('pageerror',error=>failures.push('JS: '+error.message));
page.on('console',msg=>{if(msg.type()==='error')failures.push('console: '+msg.text());});
page.on('requestfailed',req=>{if(/world\.js|three\.module|GLTFLoader/.test(req.url()))failures.push('network: '+req.url()+' '+req.failure()?.errorText)});
page.on('response',res=>{if(res.status()>=400&&/world\.js|three\.module|GLTFLoader/.test(res.url()))failures.push('http: '+res.status()+' '+res.url())});
await page.goto('http://127.0.0.1:8765/labs/worldforge-five-realms/',{waitUntil:'domcontentloaded',timeout:60000});
notes.push('document title: '+await page.title());
try{
 await page.waitForFunction(()=>!!window.HIGHFLY_TEST,{timeout:45000});
 notes.push('scene READY');
 const test=await page.evaluate(()=>window.HIGHFLY_TEST.runSeamTest());
 notes.push('seam test: '+JSON.stringify(test));if(!test.pass)failures.push('seam test failed '+JSON.stringify(test));
 await page.waitForTimeout(1700);
 notes.push('loader display: '+await page.locator('#loading').count());
 const stick=page.locator('#joystick');notes.push('joystick visible: '+await stick.isVisible());
 const rect=await stick.boundingBox();if(!rect)failures.push('joystick has no bounding box');else{
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  const beforePos=await page.evaluate(()=>window.HIGHFLY_TEST.getPlayerPosition());
  const client=await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+26,y:y-26}]});
  await page.waitForTimeout(900);
  const joyVal=await page.evaluate(()=>window.HIGHFLY_TEST.getJoystick());
  const afterPos=await page.evaluate(()=>window.HIGHFLY_TEST.getPlayerPosition());
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const dist=Math.hypot(afterPos.x-beforePos.x,afterPos.z-beforePos.z);
  notes.push('touch joystick: '+JSON.stringify(joyVal)+' displacement='+dist.toFixed(3));
  if(dist<.20)failures.push('Android joystick did not move player, distance='+dist);
  await client.detach();
 }
 const before=await page.evaluate(()=>({x:document.querySelector('#biomeName').textContent,mode:document.querySelector('#modeLabel').textContent}));
 await page.locator('[data-mode="1"]').click();notes.push('mode switched: '+await page.locator('#modeLabel').innerText());
 await page.locator('[data-mode="2"]').click();notes.push('mode switched: '+await page.locator('#modeLabel').innerText());
 notes.push('before: '+JSON.stringify(before));
 await page.screenshot({path:'/tmp/hf-worldforge-five-realms.png'});
}catch(e){failures.push('WAIT/TEST ERROR: '+e.message)}
await browser.close();
const log='HIGHFLY WORLD FORGE CHROMIUM SMOKE\n'+notes.join('\n')+'\nFAILURES:\n'+failures.join('\n')+'\n';
fs.writeFileSync('/tmp/hf-worldforge-smoke.txt',log);process.stdout.write(log);if(failures.length)process.exitCode=1;
