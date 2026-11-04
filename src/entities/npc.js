import * as THREE from 'three';

const BJORN_LINES = [
  '听说山顶的古塔最近有龙影出没……',
  '昨夜我看见北边天上有绿光流动，像河一样。',
  '今年的雪来得早。',
  '东北雪峰上有面会低语的石墙……我可不敢上去。',
  '立石阵旁的古冢大门，夜里会透出蓝光。',
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
      id: 'olaf', name: '村长奥拉夫', x: 3, z: 36, model: 'npc_mage',
    });
    const sigrid = this._makeNPC({
      id: 'sigrid', name: '铁匠西格丽德', x: 16.5, z: 49.5, model: 'npc_knight',
    });
    const bjorn = this._makeNPC({
      id: 'bjorn', name: '村民比约恩', x: -5, z: 46, model: 'npc_rogue',
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
    this.game.setState('dialogue');
    this.game.menus.showDialogue(this.buildDialogue(npc));
  }

  _questProgress(id) {
    const entry = this.game.quests.list().find((q) => q.id === id);
    return entry ? entry.progress : 0;
  }

  buildDialogue(npc) {
    const game = this.game;
    const q = game.quests;
    const close = () => game.menus.closeDialogue();
    const bye = { label: '再见', action: close };

    if (npc.id === 'olaf') {
      const s1 = q.getState('q1');
      if (s1 === 'available') {
        return {
          name: npc.name,
          text: '陌生人，冰原狼最近频频袭击村庄，孩子们都不敢出门了。你看起来像个能打的——帮帮我们。',
          options: [
            { label: '接受「狼患」', action: () => { q.accept('q1'); close(); } },
            bye,
          ],
        };
      }
      if (s1 === 'active') {
        return {
          name: npc.name,
          text: '狼解决得怎么样了？（' + this._questProgress('q1') + '/5）',
          options: [bye],
        };
      }
      if (s1 === 'complete') {
        return {
          name: npc.name,
          text: '干得好！这是你应得的报酬。',
          options: [
            { label: '完成任务', action: () => { q.turnIn('q1'); this.startDialogue(npc); } },
            bye,
          ],
        };
      }
      const s3 = q.getState('q3');
      if (s3 === 'available') {
        return {
          name: npc.name,
          text: '山顶古塔的远古巨龙苏醒了……求你了，为天际除掉这祸患！',
          options: [
            { label: '接受「天际之祸」', action: () => { q.accept('q3'); close(); } },
            bye,
          ],
        };
      }
      if (s3 === 'active') {
        return {
          name: npc.name,
          text: '巨龙还在古塔上空盘旋……愿诸神护佑你。',
          options: [bye],
        };
      }
      if (s3 === 'complete') {
        return {
          name: npc.name,
          text: '屠龙者！你就是传说中的龙裔！',
          options: [
            { label: '完成任务', action: () => { q.turnIn('q3'); this.startDialogue(npc); } },
            bye,
          ],
        };
      }
      if (s3 === 'done') {
        return {
          name: npc.name,
          text: '天际因你而安宁，龙裔。',
          options: [bye],
        };
      }
      return {
        name: npc.name,
        text: '铁匠西格丽德好像有事相求。',
        options: [bye],
      };
    }

    if (npc.id === 'sigrid') {
      const s2 = q.getState('q2');
      if (s2 === 'available') {
        return {
          name: npc.name,
          text: '我家祖传的「先祖之刃」被尸鬼夺走了，就藏在西北立石阵的石箱里。若你能取回，它就归你了。',
          options: [
            { label: '接受「先祖之刃」', action: () => { q.accept('q2'); close(); } },
            bye,
          ],
        };
      }
      if (s2 === 'active') {
        return {
          name: npc.name,
          text: '小心立石阵的尸鬼，它们不知疲倦。',
          options: [bye],
        };
      }
      if (s2 === 'complete') {
        return {
          name: npc.name,
          text: '你……真的取回来了。它就托付给你了，挥舞它吧。',
          options: [
            { label: '完成任务', action: () => { q.turnIn('q2'); this.startDialogue(npc); } },
            bye,
          ],
        };
      }
      if (q.getState('q3') === 'done') {
        const craft = (label, materialId, cost, resultId, doneMsg) => ({
          label,
          action: () => {
            const inv = game.inventory;
            if (!inv.has(materialId) || inv.gold < cost) {
              game.hud.notify('材料或金币不足');
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
          text: '屠龙者的材料……让我看看。我这双手，还能为你打出传说之物。',
          options: [
            craft('锻造·龙鳞甲（龙鳞 ×1 + 200 金币）', 'dragon_scale', 200, 'dragonscale_armor', '西格丽德为你锻造了龙鳞甲'),
            craft('锻造·龙骨剑（龙骨 ×1 + 300 金币）', 'dragon_bone', 300, 'dragonbone_sword', '西格丽德为你锻造了龙骨剑'),
            bye,
          ],
        };
      }
      return {
        name: npc.name,
        text: '先祖之刃在你手中熠熠生辉。……若你能取来巨龙之材，我能为你锻造传说之物。',
        options: [bye],
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

      if (npc.wander && !playerNear) {
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
          if (playerNear) {
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
