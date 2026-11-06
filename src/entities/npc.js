import * as THREE from 'three';
import { npcRoutineP18 } from '../world/world-registry-p18.js';
import {SIGRID_STARTER_RECIPES_P191,craftWithSigridP191} from '../world/sigrid-forge-p191.js';
import {openCraftPreviewP192} from '../ui/crafting-preview-p192.js';
import {HAMLET_QUESTS_P192} from '../world/hamlets-p192.js';
import {ITEM_DB} from '../systems/inventory.js';
import {INICIOS_PROFESSIONS_P186} from '../world/inicios-v2-p186.js';
import {GEAR_RECIPES_P192,craftGearP192} from '../world/gear-crafting-p192.js';

const BJORN_LINES = [
  'Dicen que vieron un dragón cerca de la torre de la montaña.',
  'Anoche vi una aurora verde sobre las montañas del norte.',
  'Este año llegó temprano la nieve.',
  'En la cumbre nevada hay una pared de piedra que susurra.',
  'De noche sale luz azul de la puerta de la vieja cripta.',
];

// NPC 的 yaw 约定是 atan2(dx, dz)（+Z 朝目标），KayKit 模型本身面向 +Z，
// 故偏移为 0；player 的 yaw 约定是 forward=(-sin,-cos)，E2 处偏移为 Math.PI。
const MODEL_YAW_OFFSET = 0;

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class NPCs {
  constructor(game) {
    this.game = game;
    this.list = [];

    const olaf = this._makeNPC({
      id: 'olaf', name: 'Olaf, jefe de la aldea', x: 3, z: 36, model: 'npc_mage',
    });
    const sigrid = this._makeNPC({
      id: 'sigrid', name: 'Sigrid, herrera', x: 16.5, z: 49.5, model: 'npc_knight',
    });
    const bjorn = this._makeNPC({
      id: 'bjorn', name: 'Bjorn, aldeano', x: -5, z: 46, model: 'npc_rogue',
    });
    bjorn.wander = { homeX: 0, homeZ: 40, r: 12, target: null, idleT: 1.5 };
    sigrid.hammer = { t: 3 + Math.random() * 3, busy: false };

    this.list.push(olaf, sigrid, bjorn);
  }

  _makeNPC(cfg) {
    const rig = this.game.assets.spawn(cfg.model);
    const g = new THREE.Group();
    rig.root.rotation.y = MODEL_YAW_OFFSET;
    g.add(rig.root);

    const y = this.game.terrain.getHeight(cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);
    const yaw = Math.atan2(0 - cfg.x, 40 - cfg.z);
    g.rotation.y = yaw;
    this.game.scene.add(g);

    rig.play('Idle', { fade: 0 });

    return {
      id: cfg.id,
      name: cfg.name,
      group: g,
      rig,
      pos: g.position,
      yaw,
      wander: null,
      hammer: null,
      flavorIdx: 0,
    };
  }

  startDialogue(npc) {
    if(this.game.p192Build&&npc.p192TrainerId){
      this.game.setState('dialogue');
      this.game.menus.showDialogue(this.hamletDialogueP192(npc));
      return;
    }
    if(this.game.p18Enabled)this.game.livingWorld?.onNpcTalk(npc.id);
    this.game.setState('dialogue');
    const dialogue=this.buildDialogue(npc);
    // P187 real teaching interaction on an EXISTING NPC, not a fake spawned master.
    // Appends to the original quest/forge dialogue without altering its branches.
    if(npc.id==='sigrid' && this.game.p187Professions &&
       this.game.stats.level>=2 &&
       (!this.game.p187Professions.isLearned('weaponcrafting') ||
        !this.game.p187Professions.isLearned('armorcrafting'))){
      const teacher={
        label:'Aprender herrería básica (armas y armaduras)',
        action:()=>{
          const p=this.game.p187Professions;
          const weapon=p.learnAtTrainer('weaponcrafting','sigrid');
          const armor=p.learnAtTrainer('armorcrafting','sigrid');
          if(weapon.ok||armor.ok){
            this.game.saveSys.save({silent:true});
            this.game.hud.notify('¡Herrería inicial aprendida! Consultá OFICIOS 1–20');
          }
          this.startDialogue(npc);
        }
      };
      dialogue.options=Array.isArray(dialogue.options)?[teacher,...dialogue.options]:[teacher];
    }
    if(this.game.p191Build&&npc.id==='sigrid'){
      const intro=SIGRID_STARTER_RECIPES_P191.filter(recipe=>
       this.game.p187Professions?.isLearned(recipe.profession));
      if(intro.length){
       const options=intro.map(recipe=>({
        label:recipe.name+' ('+recipe.inputs.map(x=>x.qty+' '+(
         x.id==='wolf_pelt'?'pieles de lobo':'colmillos de lobo')).join(' + ')+
         ' + '+recipe.gold+' oro)',
        action:()=>{
         if(this.game.p192Build){
          openCraftPreviewP192(this,npc,recipe,
            ()=>craftWithSigridP191(this.game,recipe.id));
          return;
         }
         const result=craftWithSigridP191(this.game,recipe.id);
         if(result.ok)this.startDialogue(npc);
         else this.game.hud.notify('No se pudo fabricar: '+result.reason);
        }
       }));
       dialogue.options=Array.isArray(dialogue.options)?
        [...options,...dialogue.options]:[...options];
      }
    }
    if(this.game.p192Build&&npc.id==='sigrid'){
      for(const recipe of GEAR_RECIPES_P192.filter(r=>r.trainerId==='sigrid'&&
        this.game.p187Professions?.isLearned(r.profession))){
        dialogue.options.unshift({
          label:'VER RECETA · '+recipe.name,
          action:()=>openCraftPreviewP192(this,npc,recipe,
            ()=>craftGearP192(this.game,npc.id,recipe.id))
        });
      }
    }
    this.game.menus.showDialogue(dialogue);
  }

  hamletDialogueP192(npc){
    const game=this.game,runtime=game.p192Hamlets;
    const hubId=npc.p192HubId,site=runtime.sites.get(hubId);
    const quest=HAMLET_QUESTS_P192.find(q=>q.hubId===hubId);
    const status=runtime.status(hubId);
    const back={label:'Hasta luego',action:()=>game.menus.closeDialogue()};
    const opts=[];
    const item=ITEM_DB[quest.item]?.name||quest.item;
    const owned=game.inventory.slots.get(quest.item)||0;
    if(status==='available')opts.push({
      label:'ACEPTAR MISIÓN · '+quest.name,action:()=>{
        runtime.accept(hubId);this.startDialogue(npc);
      }
    });
    if(runtime.ready(hubId))opts.push({
      label:'ENTREGAR '+quest.qty+' × '+item+' · recompensa '+quest.gold+' oro',action:()=>{
        runtime.turnIn(hubId);this.startDialogue(npc);
      }
    });
    if(status==='done'){
      for(const profession of INICIOS_PROFESSIONS_P186.filter(p=>p.trainerId===npc.id)){
        const isLearned=game.p187Professions.isLearned(profession.id);
        if(!isLearned)opts.push({
          label:'APRENDER '+profession.name+' · Nv. '+profession.introLevel,action:()=>{
            const res=runtime.learnAtTrainer(npc,profession.id);
            game.hud.notify(res.ok?'Oficio aprendido: '+profession.name:
              res.reason==='LEVEL_TOO_LOW'?'Necesitás nivel '+profession.introLevel:
                'Aún no está disponible esa formación');
            this.startDialogue(npc);
          }
        });
      }
    }
    opts.push(back);
    const description=status==='available'?
      'Este pueblo necesita ayuda. '+quest.desc+' Recompensa '+quest.gold+' oro y '+quest.xp+' XP.':
      status==='active'?
        'Misión '+quest.name+' · '+item+': '+owned+'/'+quest.qty+
        '. Conseguí el material en el mundo y regresá a entregarlo.':
      '¡Gracias por completar '+quest.name+'! Puedo enseñarte mi oficio con materiales reales del mundo.';
    return {name:npc.name+' · '+(site?.hub.name||'Pueblo'),
      text:description,options:opts};
  }

  _questProgress(id) {
    const entry = this.game.quests.list().find((q) => q.id === id);
    return entry ? entry.progress : 0;
  }

  buildDialogue(npc) {
    const game = this.game;
    const q = game.quests;
    const close = () => game.menus.closeDialogue();
    const bye = { label: 'Hasta luego', action: close };

    if (npc.id === 'olaf') {
      const s1 = q.getState('q1');
      if (s1 === 'available') {
        return {
          name: npc.name,
          text: 'Los lobos están atacando nuestra aldea. Necesitamos que nos ayudes.',
          options: [
            { label: 'Aceptar: Amenaza de lobos', action: () => { q.accept('q1'); close(); } },
            bye,
          ],
        };
      }
      if (s1 === 'active') {
        return {
          name: npc.name,
          text: '¿Cuántos lobos eliminaste? (' + this._questProgress('q1') + '/5)',
          options: [bye],
        };
      }
      if (s1 === 'complete') {
        return {
          name: npc.name,
          text: '¡Excelente trabajo! Te ganaste esta recompensa.',
          options: [
            { label: 'Entregar misión', action: () => { q.turnIn('q1'); this.startDialogue(npc); } },
            bye,
          ],
        };
      }
      const s3 = q.getState('q3');
      if (s3 === 'available') {
        return {
          name: npc.name,
          text: 'El dragón de la torre despertó. ¡Ayudanos a proteger la región!',
          options: [
            { label: 'Aceptar: Amenaza del dragón', action: () => { q.accept('q3'); close(); } },
            bye,
          ],
        };
      }
      if (s3 === 'active') {
        return {
          name: npc.name,
          text: 'El dragón sigue volando sobre la torre. Tené cuidado.',
          options: [bye],
        };
      }
      if (s3 === 'complete') {
        return {
          name: npc.name,
          text: '¡Derrotaste al dragón! ¡Sos una leyenda!',
          options: [
            { label: 'Entregar misión', action: () => { q.turnIn('q3'); this.startDialogue(npc); } },
            bye,
          ],
        };
      }
      if (s3 === 'done') {
        return {
          name: npc.name,
          text: 'Gracias a vos, la región está en paz.',
          options: [bye],
        };
      }
      return {
        name: npc.name,
        text: 'Sigrid, la herrera, parece necesitar ayuda.',
        options: [bye],
      };
    }

    if (npc.id === 'sigrid') {
      const s2 = q.getState('q2');
      if (s2 === 'available') {
        return {
          name: npc.name,
          text: 'Unos draugr robaron mi espada ancestral. Si la recuperás del cofre de las ruinas, te la quedás.',
          options: [
            { label: 'Aceptar: Espada ancestral', action: () => { q.accept('q2'); close(); } },
            bye,
          ],
        };
      }
      if (s2 === 'active') {
        return {
          name: npc.name,
          text: 'Cuidado con los draugr de las ruinas.',
          options: [bye],
        };
      }
      if (s2 === 'complete') {
        return {
          name: npc.name,
          text: '¡Recuperaste la espada! Ahora te pertenece.',
          options: [
            { label: 'Entregar misión', action: () => { q.turnIn('q2'); this.startDialogue(npc); } },
            bye,
          ],
        };
      }
      if (q.getState('q3') === 'done') {
        const craft = (label, materialId, cost, resultId, doneMsg) => ({
          label,
          action: () => {
            if(game.p192Build){
              const recipe={id:'dragon_'+resultId,name:label.split(' (')[0],
               inputs:[{id:materialId,qty:1}],gold:cost,result:resultId};
              openCraftPreviewP192(this,npc,recipe,()=>{
                const inv=game.inventory;
                if(game.quests.getState('q3')!=='done')return {ok:false,reason:'QUEST_LOCKED'};
                if(!inv.has(materialId)||inv.gold<cost)return {ok:false,reason:'MISSING_MATERIALS'};
                inv.removeItem(materialId,1);inv.gold-=cost;inv.addItem(resultId,1);
                game.audio.play('craft');game.saveSys.save({silent:true});
                return {ok:true,itemId:resultId};
              });
              return;
            }
            const inv = game.inventory;
            if (!inv.has(materialId) || inv.gold < cost) {
              game.hud.notify('No tenés materiales u oro suficientes');
              return;
            }
            inv.removeItem(materialId, 1);
            inv.gold -= cost;
            inv.addItem(resultId);
            game.audio.play('craft');
            game.hud.notify(doneMsg);
            this.startDialogue(npc);
          },
        });
        return {
          name: npc.name,
          text: 'Tenés materiales de dragón. Puedo forjarte equipo legendario.',
          options: [
            craft('Forjar armadura de escamas (1 escama + 200 oro)', 'dragon_scale', 200, 'dragonscale_armor', 'Sigrid forjó tu armadura de escamas'),
            craft('Forjar espada de dragón (1 hueso + 300 oro)', 'dragon_bone', 300, 'dragonbone_sword', 'Sigrid forjó tu espada de dragón'),
            bye,
          ],
        };
      }
      return {
        name: npc.name,
        text: 'La espada ancestral está en buenas manos. Traeme materiales de dragón y forjaré algo especial.',
        options: [bye],
      };
    }

    // P18 extra playable quest: Bjorn sends the hunter to the two new wolf
    // frontier patrols. Does NOT change existing Olaf/Sigrid quest branches.
    if (game.p18Enabled && game.livingWorld && npc.id==='bjorn') {
      const frontier=game.livingWorld.quest;
      if(frontier.status==='available') return {
        name:npc.name,
        text:'Los Centinelas de la frontera son lobos que acechan los senderos del este y oeste. Eliminá 3. Recompensa: 75 oro y 60 XP. ¿Nos ayudás?',
        options:[
          {label:'Aceptar: Lobo centinela · 75 oro + 60 XP',action:()=>{game.livingWorld.acceptFrontier();close();}},
          bye
        ]
      };
      if(frontier.status==='active')return {
        name:npc.name,
        text:'Eliminá 3 lobos centinela de las patrullas del este u oeste. ('+frontier.progress+'/3). Recompensa: 75 oro + 60 XP.',
        options:[bye]
      };
      if(frontier.status==='complete')return {
        name:npc.name,
        text:'¡Excelente! Los senderos estarán más seguros. Acá tenés tu recompensa.',
        options:[
          {label:'Entregar misión · 75 oro + 60 XP',action:()=>{
            if(game.livingWorld.turnInFrontier())this.startDialogue(npc);
          }},
          bye
        ]
      };
    }
    const text = BJORN_LINES[npc.flavorIdx % BJORN_LINES.length];
    npc.flavorIdx = (npc.flavorIdx + 1) % BJORN_LINES.length;
    return { name: npc.name, text, options: [bye] };
  }

  update(dt) {
    const game = this.game;
    const player = game.player;

    for (let i = 0; i < this.list.length; i++) {
      const npc = this.list[i];
      const schedule = game.p18Enabled ? npcRoutineP18(npc.id,game.time.dayTime) : null;

      let moving = false;
      let playerNear = false;
      if (player) {
        const pdx = player.pos.x - npc.pos.x;
        const pdz = player.pos.z - npc.pos.z;
        if (pdx * pdx + pdz * pdz < 36) {
          playerNear = true;
          const targetYaw = Math.atan2(pdx, pdz);
          npc.yaw = lerpAngle(npc.yaw, targetYaw, 1 - Math.exp(-6 * dt));
        }
      }

      if (npc.wander && !playerNear && (!schedule || schedule.activity==='village_wander')) {
        const w = npc.wander;
        if (w.idleT > 0) {
          w.idleT -= dt;
        } else {
          if (!w.target) {
            const a = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * (w.r - 2);
            w.target = { x: w.homeX + Math.cos(a) * r, z: w.homeZ + Math.sin(a) * r };
          }
          const dx = w.target.x - npc.pos.x;
          const dz = w.target.z - npc.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.5) {
            w.target = null;
            w.idleT = 2 + Math.random() * 4;
          } else {
            const speed = 1.7;
            npc.yaw = lerpAngle(npc.yaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
            npc.pos.x += (dx / d) * speed * dt;
            npc.pos.z += (dz / d) * speed * dt;
            npc.pos.y = game.terrain.getHeight(npc.pos.x, npc.pos.z);
            moving = true;
          }
        }
      }

      npc.group.rotation.y = npc.yaw;

      if (npc.hammer) {
        const h = npc.hammer;
        if (!h.busy) {
          if (schedule && schedule.activity!=='smithy_work') {
            npc.rig.play('Idle');
          } else if (playerNear) {
            npc.rig.play('Idle');
          } else {
            h.t -= dt;
            if (h.t <= 0) {
              h.busy = true;
              npc.rig.play('Interact', {
                once: true,
                onDone: () => {
                  h.busy = false;
                  h.t = 4.5 + Math.random() * 2.5;
                  npc.rig.play('Idle');
                },
              });
            } else {
              npc.rig.play('Idle');
            }
          }
        }
      } else if (moving) {
        npc.rig.play('Walking_A');
      } else {
        npc.rig.play('Idle');
      }

      npc.rig.update(dt);
    }
  }
}
