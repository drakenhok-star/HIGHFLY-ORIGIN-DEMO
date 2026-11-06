import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const browser=await chromium.launch({
 headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']
});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:5520/?hf_world_editor=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.highflyWorldEditorP193,{timeout:120000});
 const snapshot=await page.evaluate(()=>{
  const g=window.game,e=window.highflyWorldEditorP193;
  return {
   state:g.state, houses:g.structures._ringHouses.length,
   hubs:g.p192Hamlets.sites.size,handles:e.handles.size,
   npcs:g.npcs.list.length,versions:e.captureLayout().schemaVersion,
   menuHidden:[...g.menus.screens?Object.values(g.menus.screens):[]]
     .every(s=>getComputedStyle(s).display==='none')
  };
 });
 console.log('P193 browser initialized:',JSON.stringify(snapshot));
 assert.equal(snapshot.state,'world_editor');
 assert.equal(snapshot.versions,193);
 assert.equal(snapshot.houses,5);
 assert.equal(snapshot.hubs,7);
 assert.ok(snapshot.handles>=16);
 assert.ok(snapshot.npcs>=3);
 assert.ok(snapshot.menuHidden);
 const moved=await page.evaluate(()=>{
  const e=window.highflyWorldEditorP193;
  const h=e.handles.get('village:house:2');
  const before={x:h.object.position.x,z:h.object.position.z};
  e.move(h,before.x+2,before.z+2);e.captureHistory();
  const saved=e.captureLayout().entities['village:house:2'];
  const collider=e.g.structures.colliders.find(c=>
    Math.hypot(c.x-(before.x+2),c.z-(before.z+2))<.1);
  e.undo();
  return {before,saved,collider:!!collider,undoX:h.object.position.x};
 });
 assert.ok(Math.abs(moved.saved.x-(moved.before.x+2))<.01);
 assert.ok(moved.collider,'House collider must follow 3D move');
 assert.ok(Math.abs(moved.undoX-moved.before.x)<.01,'Undo must restore world transform');
 console.log('P193 move, JSON export and undo:',JSON.stringify(moved));
 if(errors.length)console.warn('Browser runtime errors:',errors.slice(0,8).join('\n'));
 assert.equal(errors.length,0,'Unexpected browser runtime error');
 await page.screenshot({path:'p193-browser-smoke.png',fullPage:true});
 writeFileSync('p193-browser-smoke.json',JSON.stringify({snapshot,moved,errors},null,2));
}finally{await browser.close();}
