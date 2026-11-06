import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const browser=await chromium.launch({
 headless:true,args:['--enable-webgl','--use-gl=angle',
 '--use-angle=swiftshader','--disable-dev-shm-usage']
});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const editor=await context.newPage();
 editor.on('pageerror',e=>errors.push('editor: '+String(e)));
 await editor.goto('http://127.0.0.1:5520/editor.html',{waitUntil:'domcontentloaded',timeout:60000});
 await editor.waitForFunction(()=>!!window.highflyWorldEditorP193 &&
   !!window.game?.p195EditorEnvironment,{timeout:120000});
 const before=await editor.evaluate(()=>{
  const g=window.game,e=window.highflyWorldEditorP193;
  return {
    state:g.state,version:g.p194CentralTown.version,
    title:document.title,
    waterMaterial:g.water.mesh.material.type,
    gameplayMaterial:g.water.p195GameMaterial?.type,
    sunDistance:g.sky.sunDisc.position.length(),
    moonDistance:g.sky.moonMesh.position.length(),
    moonVisible:g.sky.moonMesh.visible,
    portal:g.p194CentralTown.portal.position.toArray(),
    pier:!!g.p194CentralTown.pier,
    buildings:g.p194CentralTown.buildings.length,
    npc:g.npcs.list.length,
    trainerCount:g.p194CentralTown.trainerCount,
    townAudit:g.p196TownAudit,
    lanterns:g.p194CentralTown.features.filter(f=>f.id.startsWith('p196:lantern:')).length,
    premiumSigns:g.p194CentralTown.buildings.filter(b=>b.group.children.some(c=>c.name?.startsWith('HIGHFLY_P196_SIGN_'))).length,
    enemySpots:g.enemies.p196Spots||[],
    boarSpotCenter:g.enemies.p196Spots?.find(s=>s.id==='boar_meadow_p196')?.center||null,
    spotHandles:[...e.handles.keys()].filter(k=>k.startsWith('p196:spot:')),
    npcCoastal:g.npcs.list.filter(n=>n.p196Town?.safe===false).map(n=>n.id),
    terrainChunks:[...g.terrain.chunks.keys()],
    orbitYaw:e.orbitYaw,orbitElevation:e.orbitElevation,
    bodyText:e.root.innerText.slice(0,1600),
    frame:g.renderer.info.render.frame
  };
 });
 console.log('P195 editor environment:',JSON.stringify(before));
 assert.equal(before.state,'world_editor');
 assert.equal(before.version,194);
 assert.equal(before.waterMaterial,'MeshStandardMaterial');
 assert.equal(before.gameplayMaterial,'MeshPhongMaterial'); // actual original HIGHFLY water material
 assert.ok(before.sunDistance>1400 && before.moonDistance>1400,
   'Celestial discs must not remain over the island at world origin');
 assert.equal(before.moonVisible,false,'Moon should not cover a daytime town');
 assert.equal(before.buildings,9);
 assert.equal(before.trainerCount,13);
 assert.equal(before.townAudit.total,13);
 assert.equal(before.townAudit.safe,13,'All profession NPC homes should be dry and navigable');
 assert.equal(before.premiumSigns,9,'Each profession building should have a readable facing sign');
 assert.ok(before.lanterns>=5,'At least five safe torch posts should light the town');
 assert.equal(before.spotHandles.length,3,'All wilderness spots should be visible in the editor');
 assert.equal(before.enemySpots.length,3,'Three wilderness centers must exist');
 assert.ok(before.enemySpots.every(s=>s.spawned===5),
   'Each of the three spots should have exactly 5 real monsters: '+JSON.stringify(before.enemySpots));
 assert.equal(before.npc,16);
 assert.equal(before.pier,true);
 assert.ok(before.terrainChunks.includes('0,0') && before.terrainChunks.includes('-1,-1'),
   'The central island should be ready before opening the editor');
 assert.ok(before.bodyText.includes('WORLD FORGE 2.0'));
 assert.ok(before.bodyText.includes('Probar en el juego'));
 
 const yaw0=before.orbitYaw;
 await editor.mouse.move(775,450);
 await editor.mouse.down({button:'middle'});
 await editor.mouse.move(860,500,{steps:5});
 await editor.mouse.up({button:'middle'});
 const orbit=await editor.evaluate(()=>{
  const e=window.highflyWorldEditorP193;
  return {yaw:e.orbitYaw,elevation:e.orbitElevation,mode:e.mode,
    camera:e.g.camera.position.toArray()};
 });
 assert.notEqual(orbit.yaw,yaw0,'Middle mouse orbit must rotate camera');
 assert.notEqual(orbit.elevation,before.orbitElevation,'Middle mouse must tilt camera');
 assert.equal(orbit.mode,'3d');
 console.log('P195 orbital camera:',JSON.stringify(orbit));

 // Verify map panning visually: drag right and the chosen landmark moves right
 // on the screen. This is independent of the camera azimuth.
 const snap=()=>editor.evaluate(()=>{
  const g=window.game;const v=g.p194CentralTown.portal.position.clone().project(g.camera);
  return v.x;
 });
 const screenBefore=await snap();
 await editor.mouse.move(770,450);
 await editor.mouse.down({button:'right'});
 await editor.mouse.move(825,450,{steps:3});
 await editor.mouse.up({button:'right'});
 const screenAfter=await snap();
 assert.ok(screenAfter>screenBefore,'Right drag should pan the world to screen-right');

 const edits=await editor.evaluate(()=>{
  const e=window.highflyWorldEditorP193,g=window.game;
  const district=e.handles.get('p194:district:apothecary');
  const p=district.object.position.clone();
  e.move(district,p.x+1.5,p.z+.5);e.editField(district,'rotation',0.45);
  const portal=e.handles.get('p194:portal');
  const target={x:portal.object.position.x+2,z:portal.object.position.z+1};
  e.move(portal,target.x,target.z);e.editField(portal,'rotation',.35);
  const pier=e.handles.get('p194:pier');
  const pt={x:pier.object.position.x+.4,z:pier.object.position.z+.4};
  e.move(pier,pt.x,pt.z);e.editField(pier,'rotation',.2);
  const hub=e.handles.get('hub:herbal_hamlet');
  const hb={x:hub.ref.pos.x+.8,z:hub.ref.pos.z+.6};
  e.move(hub,hb.x,hb.z,false);
  const spot=e.handles.get('p196:spot:boar_meadow_p196');
  const sp={x:spot.object.position.x+.7,z:spot.object.position.z+.3};
  e.move(spot,sp.x,sp.z);
  const saved=e.captureLayout();
  return {district:saved.entities['p194:district:apothecary'],
    portal:saved.entities['p194:portal'],
    pier:saved.entities['p194:pier'],
    spot:saved.entities['p196:spot:boar_meadow_p196'],
    hub:saved.hubs.herbal_hamlet,
    savedOK:e.saveDraft(),
    localStorageKey:'hf_p195_world_forge_v2_draft',
    stored:!!localStorage.getItem('hf_p195_world_forge_v2_draft')};
 });
 console.log('P195 JSON draft:',JSON.stringify(edits));
 assert.equal(edits.savedOK,true);
 assert.ok(edits.stored);

 const preview=await context.newPage();
 preview.on('pageerror',e=>errors.push('game: '+String(e)));
 await preview.goto('http://127.0.0.1:5520/?hf_world_draft=1',
   {waitUntil:'domcontentloaded',timeout:60000});
 await preview.waitForFunction(()=>!!window.game?.p194CentralTown,{timeout:120000});
 const actual=await preview.evaluate(()=>{
  const g=window.game;
  const h=g.p194CentralTown.buildings.find(v=>v.id==='p194:district:apothecary');
  const pier=g.p194CentralTown.pier;
  const hub=g.p192Hamlets.sites.get('herbal_hamlet');
  return {
    state:g.state,editorEnvironment:!!g.p195EditorEnvironment,
    gameWaterMaterial:g.water.mesh.material.type,
    district:{x:h.group.position.x,z:h.group.position.z,rotation:h.group.rotation.y},
    portal:{x:g.p194CentralTown.portal.position.x,
      z:g.p194CentralTown.portal.position.z,
      rotation:g.p194CentralTown.portal.rotation.y},
    pier:{x:pier.position.x,z:pier.position.z,rotation:pier.rotation.y,
      y:pier.position.y},
    expectedPierY:g.terrain.waterY+1.05,
    hub:{x:hub.pos.x,z:hub.pos.z},
    trainers:g.npcs.list.filter(n=>n.p192TrainerId).length,
    townAudit:g.p196TownAudit,
    enemySpots:g.enemies.p196Spots||[],
    boarSpotCenter:g.enemies.p196Spots?.find(s=>s.id==='boar_meadow_p196')?.center||null,
    lanterns:g.p194CentralTown.features.filter(f=>f.id.startsWith('p196:lantern:')).length,
    outlyingBuildings:[...g.p192Hamlets.sites.values()]
      .reduce((sum,v)=>sum+v.houses.filter(Boolean).length,0),
    savedSchema:g.worldLayoutP193.schemaVersion
  };
 });
 console.log('P195 PLAYABLE draft transfer:',JSON.stringify(actual));
 assert.equal(actual.editorEnvironment,false,
   'Playable game must keep original environment');
 assert.equal(actual.gameWaterMaterial,'MeshPhongMaterial'); // original material must remain unchanged
 assert.equal(actual.savedSchema,193);
 assert.equal(actual.trainers,13);
 assert.equal(actual.townAudit.safe,13);
 assert.equal(actual.enemySpots.length,3);
 assert.ok(actual.enemySpots.every(s=>s.spawned===5),
   'Play mode should preserve fifteen added monsters');
 assert.equal(actual.outlyingBuildings,0);
 for(const id of ['district','portal','pier']){
  for(const key of ['x','z','rotation'])assert.ok(
    Math.abs(actual[id][key]-edits[id][key])<.015,
    id+' '+key+' must match exported editor placement');
 }
 assert.ok(Math.abs(actual.pier.y-actual.expectedPierY)<.001,
   'Pier must stay at real water elevation');
 for(const id of ['x','z'])assert.ok(
  Math.abs(actual.boarSpotCenter[id]-edits.spot[id])<153,
  'Edited wilderness camp must remain grounded near the requested position');
 for(const id of ['x','z'])assert.ok(
  Math.abs(actual.hub[id]-edits.hub[id])<.015,
  'Quest hub '+id+' must match editor');
 assert.deepEqual(errors,[],'No JavaScript runtime errors');

 writeFileSync('p195-forge-verification.json',
   JSON.stringify({before,orbit,pan:{screenBefore,screenAfter},edits,actual,errors},null,2));
 // Software-GPU screenshots can time out even when the actual browser test passes.
 try{await editor.screenshot({path:'p195-editor-screenshot.png',fullPage:false,
  timeout:10000,animations:'disabled'});}
 catch(e){console.warn('Optional screenshot unavailable:',String(e).slice(0,160));}
}finally{await browser.close();}
