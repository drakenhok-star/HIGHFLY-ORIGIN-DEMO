import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 HIGHFLY_SKILLS_P190,SKILL_ORIGINS_P190,SKILL_SLOT_COUNT_P190,
 newSkillStateP190,learnSkillP190,equipSkillP190,
 rewardQuestSkillP190,SkillProgressP190
} from '../src/combat/skill-progression-p190.js';
import {HUD_DEFAULTS,HUD_LAYOUT_KEY,sanitizeHudLayout} from '../src/ui/p10-layout.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ids=new Set(HIGHFLY_SKILLS_P190.map(s=>s.id));
assert.equal(HIGHFLY_SKILLS_P190.length,18);
assert.equal(ids.size,18);
assert.equal(SKILL_ORIGINS_P190.length,18);
assert.equal(SKILL_SLOT_COUNT_P190,6);
assert.equal(HIGHFLY_SKILLS_P190.filter(s=>s.resource==='MP').length,7);
assert.equal(HIGHFLY_SKILLS_P190.filter(s=>s.resource==='ENERGY').length,11);
for(const native of ['native_fus','native_frost','native_wuld'])assert.ok(ids.has(native));
for(const s of HIGHFLY_SKILLS_P190)assert.ok(['MP','ENERGY'].includes(s.resource));
const blank=newSkillStateP190();
assert.equal(Object.keys(blank.discovered).length,0);
assert.equal(Object.keys(blank.learned).length,0);
assert.deepEqual(blank.equipped,[null,null,null,null,null,null]);
assert.equal(equipSkillP190(blank,'native_fus',4).ok,false);
assert.equal(learnSkillP190(blank,'native_fus').ok,false);
assert.equal(equipSkillP190(blank,'woc_fireball',6).ok,false);
const prior={schemaVersion:188,discovered:{woc_fireball:true,tig_iron_wave:true},
 learned:{woc_fireball:true,tig_iron_wave:true},
 equipped:['woc_fireball','tig_iron_wave',null]};
const upgraded=newSkillStateP190(prior);
assert.equal(upgraded.schemaVersion,190);
assert.deepEqual(upgraded.equipped,['woc_fireball','tig_iron_wave',null,null,null,null]);
assert.equal(upgraded.learned.woc_fireball,true);
assert.equal(upgraded.learned.tig_iron_wave,true);
const duplicate=equipSkillP190(upgraded,'woc_fireball',6);
assert.ok(duplicate.ok);
assert.equal(duplicate.state.equipped[0],null);
assert.equal(duplicate.state.equipped[5],'woc_fireball');
assert.equal(equipSkillP190(upgraded,'woc_fireball',7).ok,false);
assert.equal(equipSkillP190(upgraded,'constructor',1).ok,false);
const quest=rewardQuestSkillP190(blank,'q1');
assert.equal(quest.awardedId,'woc_fireball');
assert.equal(quest.state.learned.woc_fireball,undefined,'discover does not learn');
assert.equal(learnSkillP190(quest.state,'woc_fireball').ok,true);
assert.equal(rewardQuestSkillP190(quest.state,'q1').awardedId,null);
const game={
 quests:{getState:id=>id==='q1'?'done':'available'},
 combat:{learnedShouts:['fus']},
 structures:{wordWalls:[{shoutId:'frost',learned:false},{shoutId:'wuld',learned:false}]},
 saveSys:{save(){}},hud:{notify(){}}
};
const p=new SkillProgressP190(game);
p.syncExistingQuests();
assert.equal(p.state.discovered.woc_fireball,true);
assert.equal(p.state.learned.native_fus,undefined,
 'compatibility seed FUS is NOT a free skill for new characters');
assert.equal(p.learn('native_fus'),false,'cannot learn native rune from a menu');
game.structures.wordWalls[0].learned=true;
game.combat.learnedShouts.push('frost');
p.syncWorldRunes();
assert.equal(p.state.discovered.native_frost,true);
assert.equal(p.state.learned.native_frost,true);
assert.equal(p.equip('native_frost',4),true);
assert.equal(p.selected(4).nativeId,'frost');
assert.equal(p.equip('native_frost',6),true);
assert.equal(p.selected(4),null);
assert.equal(p.selected(6).nativeId,'frost');
const serialized=JSON.parse(JSON.stringify(p.serialize()));
const restored=new SkillProgressP190(game);
restored.applyData(serialized);
assert.equal(restored.selected(6).nativeId,'frost');
restored.reset();
assert.equal(restored.selected(6),null);
restored.applyData(prior);
restored.migratePriorCombat({learned:['fus','wuld'],equipped:'wuld'});
assert.equal(restored.state.learned.native_fus,true);
assert.equal(restored.selected(4).nativeId,'wuld');
const back=restored.serialize();
assert.equal(back.equipped.length,6);
assert.equal(newSkillStateP190(back).equipped[3],'native_wuld');

assert.equal(HUD_LAYOUT_KEY,'hf_p812_hud_layout_v2');
assert.ok(HUD_DEFAULTS.s5&&HUD_DEFAULTS.s6);
const saved=sanitizeHudLayout({s1:{x:.41,y:.74,size:83,opacity:.51},
 s4:{x:.88,y:.50,size:55},skillCancel:{x:.71,y:.25,size:45,opacity:.65}});
assert.equal(saved.s1.x,.41);
assert.equal(saved.s1.opacity,.51);
assert.equal(saved.s4.size,55);
assert.equal(saved.skillCancel.opacity,.65);
assert.equal(saved.s5.size,HUD_DEFAULTS.s5.size);
assert.equal(saved.s6.size,HUD_DEFAULTS.s6.size);
const bridge=read('src/combat/skill-bridge-p186.js');
assert.ok(bridge.includes("['.hf-p5-s5',5]"));
assert.ok(bridge.includes("['.hf-p5-s6',6]"));
assert.ok(bridge.includes("for(let slot=1;slot<=(g.p190Build?6:3);slot++)"));
assert.ok(bridge.includes('this.spawnBolt(start,aim,3,75,23,34'));
assert.ok(bridge.includes('this.spawnBolt(start,dir,0,47,17,38'));
assert.ok(bridge.includes('document.body.appendChild(b)'));
assert.ok(bridge.includes("z-index:119"));
const controls=read('src/ui/p810-ui.js');
assert.ok(controls.includes("for(const slot of [5,6])"));
assert.ok(controls.includes("'hf-p5-s'+slot"));
const editor=read('src/ui/p10-hud-editor.js');
assert.ok(editor.includes("s5:'HABILIDAD S5'"));
assert.ok(editor.includes("s6:'HABILIDAD S6'"));
const core=read('src/combat/combat.js');
assert.ok(core.includes('this.game.p6Enabled&&!this.game.p190Build'));
assert.ok(core.includes("g.p188Skills.state.equipped.includes('native_'+def.id)"));
const book=read('src/ui/rpg-books-p188.js');
assert.ok(book.includes('const acquired=HIGHFLY_SKILLS_P190.filter'));
assert.ok(book.includes('const hidden=HIGHFLY_SKILLS_P190.filter'));
assert.ok(book.includes('for(let slot=1;slot<=6;slot++)'));
assert.ok(!book.includes('TÉCNICA ESPECIAL'));
assert.ok(!book.includes('VFX actual'));
const save=read('src/systems/save.js');
assert.ok(save.includes("const KEY_P190 = 'highfly_p190_save'"));
assert.ok(save.includes('skillsP190:g.p188Skills.serialize()'));
assert.ok(save.includes('migratePriorCombat(d.combat)'));
console.log('P190 PASS: 18 classless skill IDs, six equal slots, no free rune, native wall learning, P188 migration, preserved HUD and readable bolts.');
