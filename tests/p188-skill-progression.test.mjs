import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HIGHFLY_SKILL_EXPORT_L26} from '../src/skillslab/skill-catalog-export-l26.js';
import {
 SKILL_ORIGINS_P188,SKILL_QUEST_REWARDS_P188,
 newSkillStateP188,rewardQuestSkillP188,learnSkillP188,equipSkillP188,
 SkillProgressP188
} from '../src/combat/skill-progression-p188.js';
const f=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
assert.equal(HIGHFLY_SKILL_EXPORT_L26.length,15);
assert.equal(SKILL_ORIGINS_P188.length,15);
assert.equal(SKILL_ORIGINS_P188.filter(s=>s.implemented).length,4);
assert.equal(Object.keys(SKILL_QUEST_REWARDS_P188).length,4);
let original=newSkillStateP188();
assert.equal(Object.keys(original.discovered).length,0,'new players never receive all 15');
assert.equal(Object.keys(original.learned).length,0);
assert.deepEqual(original.equipped,[null,null,null]);
assert.equal(learnSkillP188(original,'woc_fireball').ok,false);
assert.equal(equipSkillP188(original,'woc_meteor',1).ok,false);
const award=rewardQuestSkillP188(original,'q1');
assert.equal(award.awardedId,'woc_fireball');
assert.equal(award.state.discovered.woc_fireball,true);
assert.equal(original.discovered.woc_fireball,undefined,'pure mutation');
assert.equal(rewardQuestSkillP188(award.state,'q1').awardedId,null,'no repeat rewards');
assert.equal(award.state.learned.woc_fireball,undefined,'discover != learn');
const learn=learnSkillP188(award.state,'woc_fireball');
assert.ok(learn.ok);
assert.equal(learn.state.equipped[0],null,'learn != equip');
const equip=equipSkillP188(learn.state,'woc_fireball',3);
assert.ok(equip.ok);
assert.equal(equip.state.equipped[2],'woc_fireball');
assert.equal(equipSkillP188(equip.state,'woc_fireball',1).state.equipped[2],null,
 'one ability never fills two HUD slots');
assert.equal(equipSkillP188(equip.state,'woc_fireball',4).ok,false);
assert.equal(equipSkillP188(equip.state,'woc_fireball',0).ok,false);
assert.equal(equipSkillP188(equip.state,'constructor',1).ok,false);
assert.equal(newSkillStateP188({schemaVersion:188,discovered:{'__proto__':true,woc_fireball:true},
 learned:{woc_fireball:true,constructor:true},
 equipped:['constructor','woc_fireball','woc_fireball']}).equipped.filter(Boolean).length,1);
assert.deepEqual(newSkillStateP188({schemaVersion:187,discovered:{woc_fireball:true}}).equipped,[null,null,null],
 'legacy save cannot implicitly grant a new skill');
const g={quests:{getState:x=>x==='q1'?'done':'available'}};
const runtime=new SkillProgressP188(g);
runtime.syncExistingQuests();
assert.equal(runtime.state.discovered.woc_fireball,true);
assert.equal(runtime.state.learned.woc_fireball,undefined);
assert.equal(runtime.learn('woc_fireball'),true);
assert.equal(runtime.equip('woc_fireball',1),true);
assert.equal(runtime.selected(1).id,'woc_fireball');
const serialized=JSON.parse(JSON.stringify(runtime.serialize()));
const restored=new SkillProgressP188(g);restored.applyData(serialized);
assert.equal(restored.selected(1).id,'woc_fireball');
restored.reset();
assert.equal(restored.selected(1),null);
for(const id of Object.keys(SKILL_QUEST_REWARDS_P188))
 assert.ok(SKILL_ORIGINS_P188.find(x=>x.questId===id&&x.implemented));
const bridge=f('src/combat/skill-bridge-p186.js');
const main=f('src/main.js');
const save=f('src/systems/save.js');
const hud=f('src/ui/premium-hud-p5.js');
const panel=f('src/ui/p9-panels.js');
assert.ok(bridge.includes('beginAim(slot,event)'));
assert.ok(bridge.includes('onAimMove(event)'));
assert.ok(bridge.includes('onAimEnd(event,cancelled=false)'));
assert.ok(bridge.includes('this.cancelAim()'));
assert.ok(bridge.includes("g.p188Skills?.selected(slot)"));
assert.ok(bridge.includes('if(this.game.p188Build){this.game.touch?.premium?.show'));
assert.ok(main.includes('this.p188Build=true'));
assert.ok(main.includes('this.p188Skills?.reset()'));
assert.ok(save.includes("const KEY_P188 = 'highfly_p188_save'"));
assert.ok(save.includes('skillsP188:g.p188Skills.serialize()'));
assert.ok(save.includes('this.game.p188Build?localStorage.getItem(KEY_P187):null'));
assert.ok(hud.includes("['skills','HABILIDADES']"));
assert.ok(hud.includes("if(g.p188Build && i<3 && g.p186Skills)continue;"));
assert.ok(panel.includes("renderSkillbookP188(this.hud,this)"));
assert.ok(panel.includes("renderProfessionbookP188(this.hud,this)"));
console.log('P188 PASS: 15 skills locked by default, 4 real quest discovery paths, learn/equip separate, no duplicate rewards, save migrated, preview and full size overlay wired.');
