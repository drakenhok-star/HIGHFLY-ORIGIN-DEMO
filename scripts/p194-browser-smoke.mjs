import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'
]});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5520/editor.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.highflyWorldEditorP193 && !!window.game?.p194CentralTown,
  {timeout:120000});
 const before=await page.evaluate(()=>{
  const g=window.game,e=window.highflyWorldEditorP193;
  const p=g.p194CentralTown;
  return {
    state:g.state,version:p.version,houses:p.buildings.length,
    trainers:p.trainerCount,trainersLoaded:g.npcs.list.filter(n=>n.p192TrainerId).length,
    totalNPC:g.npcs.list.length,sites:g.p192Hamlets.sites.size,
    professions:g.p187Professions?undefined:null,
    outlyingHouses:[...g.p192Hamlets.sites.values()].reduce((n,s)=>n+s.houses.filter(Boolean).length,0),
    offsite:[...g.npcs.list.filter(n=>n.p192TrainerId)].filter(n=>
     Math.hypot(n.pos.x,n.pos.z-40)>60).map(n=>n.id),
    services:p.buildings.map(x=>x.id),features:p.features.map(x=>x.id),
    handles:e.handles.size,layout:e.captureLayout().schemaVersion,
    pixelRatio:g.renderer.getPixelRatio(),shadows:g.renderer.shadowMap.enabled,
    defaultPortal:[p.portal.position.x,p.portal.position.z],
    hubCenters:[...g.p192Hamlets.sites.values()].map(s=>s.pos && [s.pos.x,s.pos.z]),
    renderFrame:g.renderer.info.render.frame,
    elapsed:g.time.elapsed
  };
 });
 console.log('P194 town:',JSON.stringify(before));
 assert.equal(before.state,'world_editor');
 assert.equal(before.version,194);
 assert.equal(before.houses,9);
 assert.equal(before.trainers,13);
 assert.equal(before.trainersLoaded,13);
 assert.equal(before.totalNPC,16);
 assert.equal(before.sites,7);
 assert.equal(before.outlyingHouses,0);
 assert.deepEqual(before.offsite,[]);
 assert.equal(before.layout,193);
 assert.ok(before.features.includes('p194:portal'));
 assert.ok(before.handles>=32);
 assert.equal(before.pixelRatio,1);
 assert.equal(before.shadows,false);
 assert.ok(before.hubCenters.every(([x,z])=>Math.hypot(x,z-40)<60));

 const move=await page.evaluate(()=>{
  const e=window.highflyWorldEditorP193;
  const h=e.handles.get('p194:district:apothecary');
  const start={x:h.object.position.x,z:h.object.position.z};
  e.move(h,start.x+2,start.z+2);e.captureHistory();
  const saved=e.captureLayout().entities['p194:district:apothecary'];
  const collider=e.g.structures.colliders.some(c=>
    Math.hypot(c.x-saved.x,c.z-saved.z)<.1);
  e.undo();
  return {start,saved,collider,undoX:h.object.position.x};
 });
 assert.ok(move.collider,'Building collider must follow movement');
 assert.ok(Math.abs(move.saved.x-move.start.x-2)<.01,'New district JSON persistence');
 assert.ok(Math.abs(move.undoX-move.start.x)<.01,'Undo must restore building');

 // Right mouse drag should follow the cursor, not invert the horizontal axis.
 const cx=await page.evaluate(()=>window.highflyWorldEditorP193.focus.x);
 await page.mouse.move(750,440);
 await page.mouse.down({button:'right'});
 await page.mouse.move(800,440,{steps:4});
 await page.mouse.up({button:'right'});
 const nx=await page.evaluate(()=>window.highflyWorldEditorP193.focus.x);
 assert.ok(nx>cx,'Right drag must move editor camera focus to the right');

 await page.waitForTimeout(360);
 const after=await page.evaluate(()=>({
  frame:window.game.renderer.info.render.frame,
  elapsed:window.game.time.elapsed
 }));
 assert.ok(after.elapsed===before.elapsed,'Editor must not simulate world elapsed time');
 assert.ok(after.frame-before.renderFrame<20,'Editor must not render at 60fps while idle');
 if(errors.length)console.warn('Browser errors:',errors.join('\n'));
 assert.deepEqual(errors,[],'Browser should start without runtime errors');
 await page.screenshot({path:'p194-world-forge.png',fullPage:true});
 writeFileSync('p194-world-forge.json',JSON.stringify({before,move,mouse:{before:cx,after:nx},after,errors},null,2));
}finally{await browser.close();}
