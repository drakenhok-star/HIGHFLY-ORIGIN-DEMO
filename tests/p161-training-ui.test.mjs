import assert from 'node:assert/strict';
import { HIGHFLY_TRAINING_DAYS, HIGHFLY_TRAINING_WEEKS, HIGHFLY_CORE_STAT_NAMES } from '../src/ui/training-schedule-p161.js';
import { TrainingPreviewP161, emptyTrainingP161, pendingExercise, sessionKey, isResting, isWeekComplete } from '../src/ui/training-p161.js';
import { readFile } from 'node:fs/promises';

assert.equal(HIGHFLY_TRAINING_DAYS.length,5);
assert.equal(HIGHFLY_TRAINING_WEEKS.length,4);
assert.equal(HIGHFLY_TRAINING_DAYS.reduce((n,d)=>n+d.exercises.length,0),37);
assert.deepEqual(HIGHFLY_CORE_STAT_NAMES,['STR','AGI','VIT','PER','INT']);
for(const d of HIGHFLY_TRAINING_DAYS){
 assert.ok(d.exercises.length>=5);
 for(const ex of d.exercises){
  assert.equal(ex.weekly.length,4);
  assert.ok(ex.restSec>=60,'real HIGHFLY rests are mandatory');
  for(const rx of ex.weekly.filter(Boolean)){
   assert.ok(rx.sets>0 && rx.reps>0);
   assert.equal('loadKg' in rx,false,'no private user load embedded in public UI');
  }
  assert.equal('referenceRmKg' in ex,false,'no personal 1RM embedded in public UI');
 }
}
const empty=emptyTrainingP161();
assert.equal(empty.version,1);
assert.equal(empty.activeWeek,1);
assert.equal(empty.startedAt,0);
assert.equal(isWeekComplete(empty,1),false);
assert.equal(pendingExercise(empty).id,HIGHFLY_TRAINING_DAYS[0].exercises[0].id);
assert.equal(isResting({rest:{until:200}},100),true);
assert.equal(isResting({rest:{until:200}},200),false);
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
globalThis.document={
 head:{appendChild(){}},
 createElement:()=>({rel:'',href:''})
};
const el={
 innerHTML:'',setAttribute(){},addEventListener(){},querySelector(){return null}
};
const game={state:'menu',setState(s){this.state=s;this.states.push(s);},states:[],stats:{xp:0}};
const menus={screen(){return el;},showScreen(){}};
const ui=new TrainingPreviewP161(game,menus);
clearInterval(ui.timer);
assert.match(el.innerHTML,/TRAINING CORE/);
assert.match(el.innerHTML,/REGISTRAR SERIE/);
assert.match(el.innerHTML,/SIN CALIBRAR/);
assert.match(el.innerHTML,/STR/);
assert.match(el.innerHTML,/AGI/);
assert.match(el.innerHTML,/VIT/);
assert.match(el.innerHTML,/PER/);
assert.match(el.innerHTML,/INT/);
const click=(action,details={})=>ui.click({target:{closest:()=>({dataset:{hfTrAction:action,...details}})}});
ui.open('menu');
assert.equal(game.state,'training');
click('week',{week:'4'});
assert.equal(ui.model.week,4,'future week is view-only');
const before=ui.model.sets;
click('set');assert.deepEqual(ui.model.sets,before,'future week cannot record sets');
click('week',{week:'1'});
const ex=pendingExercise(ui.model),key=sessionKey(1,1)+':'+ex.id;
ui.input({target:{dataset:{hfTrDraft:'kg'},value:'45'}});
ui.input({target:{dataset:{hfTrDraft:'reps'},value:'3'}});
click('set');
assert.equal(ui.model.sets[key].length,1);
assert.equal(ui.model.sets[key][0].kg,45);
assert.equal(ui.model.sets[key][0].reps,3);
assert.ok(isResting(ui.model),'rest is compulsory after incomplete exercise');
const oldDay=ui.model.day;
click('day',{day:'2'});
assert.equal(ui.model.day,oldDay,'cannot change day during required rest');
assert.equal(ui.close(),false,'cannot close Training during required rest');
assert.equal(game.state,'training');
assert.equal(game.stats.xp,0,'must not award RPG XP');
ui.model.rest.until=Date.now()-1;
click('day',{day:'2'});
assert.equal(ui.model.day,2);
assert.equal(ui.close(),true);
assert.equal(game.state,'menu');
assert.equal(store.has('hf_p161_training_preview_v1'),true,'only preview localStorage written');
const source=await readFile(new URL('../src/ui/training-p161.js',import.meta.url),'utf8');
assert.ok(!source.includes('stats.addXp') && !source.includes('training.core['));
const menusSource=await readFile(new URL('../src/ui/menus.js',import.meta.url),'utf8');
assert.match(menusSource,/ENTRENAMIENTO · TRAINING/);
assert.match(menusSource,/this.training.show\(\)/);
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/this.menus.training\?\.close\(\)/);
console.log('HIGHFLY P16.1 PASS: training schedule/privacy, menu UI, real set logs, mandatory rest and RPG isolation');
