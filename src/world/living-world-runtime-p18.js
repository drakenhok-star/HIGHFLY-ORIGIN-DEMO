/**
 * HIGHFLY P18 playable pilot — regional discovery + Bjorn frontier bounty.
 * Runtime extension only on /p18/. Does not modify original P16.3 quest IDs,
 * NPC dialogue topology, training authority or equipment stats.
 */
import {
  regionAtP18,npcRoutineP18,createWorldStateP18,
  applyWorldEventP18,worldSnapshotP18
} from './world-registry-p18.js';

const FRONTIER = Object.freeze({
  id:'frontier_patrol_01', name:'Centinelas de la frontera',
  need:3, rewardGold:75, rewardXp:60
});
const VALID_STATUSES = Object.freeze(['available','active','complete','done']);
const safeProgress=(v)=>Number.isInteger(v)?Math.max(0,Math.min(FRONTIER.need,v)):0;
const saveQuest=quest=>({status:quest.status,progress:quest.progress});
const clock=() => Date.now();

export class LivingWorldP18 {
  constructor(game){
    this.game=game;
    this.enabled=!!game.p18Enabled;
    this.timer=0;this.lastRegion=null;this.zone=null;this.lastNotified=-Infinity;
    this.reset();
    this.node=document.createElement('div');
    this.node.id='hf-p18-zone';
    this.node.setAttribute('aria-label','HIGHFLY · zona del mundo');
    this.node.style.display='none';
    document.body.appendChild(this.node);
    const css=document.createElement('style');
    css.id='hf-p18-zone-style';
    css.textContent=[
      '#hf-p18-zone{position:fixed;left:50%;transform:translateX(-50%);top:max(57px,calc(env(safe-area-inset-top) + 49px));',
      'max-width:min(45vw,350px);padding:5px 10px;z-index:38;pointer-events:none;text-align:center;',
      'color:#e2efff;border-radius:9px;border:1px solid #709acb90;background:#07162ce6;',
      'font:700 11px/1.25 system-ui,sans-serif;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;',
      'box-shadow:0 3px 12px #0006}',
      '#hf-p18-zone strong{color:#8adeff}',
      '#hf-p18-zone[data-safe="yes"] strong{color:#9ff8c8}',
      '#hf-p18-zone[data-safe="no"] strong{color:#ffd198}',
      '@media(max-height:460px){#hf-p18-zone{top:46px;font-size:9px;padding:3px 8px;max-width:40vw}}'
    ].join('');
    document.head.appendChild(css);
    if(typeof window!=='undefined')window.highflyP18Report=()=>this.report();
  }
  reset(){
    this.world=createWorldStateP18();
    this.quest={status:'available',progress:0};
    this.lastRegion=null;this.zone=null;this.timer=0;
  }
  serialize(){
    return {schemaVersion:18,world:worldSnapshotP18(this.world),frontier:saveQuest(this.quest)};
  }
  applyData(input){
    this.reset();
    if(!input||input.schemaVersion!==18)return;
    this.world=createWorldStateP18(input.world);
    const q=input.frontier;
    if(q&&VALID_STATUSES.includes(q.status)){
      this.quest.status=q.status;
      this.quest.progress=safeProgress(q.progress);
      if(this.quest.status==='complete'||this.quest.status==='done')
        this.quest.progress=FRONTIER.need;
      if(this.quest.status==='active'&&this.quest.progress>=FRONTIER.need)
        this.quest.status='complete';
    }
  }
  setVisible(yes){
    this.node.style.display=yes&&this.enabled?'block':'none';
  }
  refreshLabel(){
    const z=this.zone;
    if(!z)return;
    const quest=this.quest.status==='active'
      ?' · Centinelas '+this.quest.progress+'/'+FRONTIER.need
      :this.quest.status==='complete'?' · Volvé con Bjorn':'';
    this.node.dataset.safe=z.kind==='safe_city'?'yes':'no';
    this.node.textContent='P18 · '+z.name+
      (z.kind==='safe_city'?' · SEGURA':' · EXPLORACIÓN')+quest;
  }
  onNpcTalk(id){
    if(!this.enabled)return;
    this.world=applyWorldEventP18(this.world,{type:'npcTalked',id});
  }
  acceptFrontier(){
    if(this.quest.status!=='available')return false;
    this.quest.status='active';
    this.quest.progress=0;
    this.refreshLabel();
    this.game.hud.questBanner('Nueva misión: '+FRONTIER.name);
    this.game.hud.notify('Eliminá '+FRONTIER.need+' lobos de frontera y volvé con Bjorn');
    this.game.saveSys.save();
    return true;
  }
  onEnemyKilled(enemy){
    if(!this.enabled||!enemy?.p18Frontier||this.quest.status!=='active')return false;
    this.quest.progress=Math.min(FRONTIER.need,this.quest.progress+1);
    this.refreshLabel();
    this.game.hud.notify(FRONTIER.name+': '+this.quest.progress+'/'+FRONTIER.need);
    if(this.quest.progress===FRONTIER.need){
      this.quest.status='complete';
      this.refreshLabel();
      this.game.hud.questBanner('Patrulla completa · Volvé con Bjorn');
    }
    this.game.saveSys.save();
    return true;
  }
  turnInFrontier(){
    if(this.quest.status!=='complete')return false;
    this.quest.status='done';
    this.refreshLabel();
    this.game.inventory.gold+=FRONTIER.rewardGold;
    this.game.stats.addXP(FRONTIER.rewardXp);
    this.world=applyWorldEventP18(this.world,{type:'questCompleted',id:FRONTIER.id});
    this.game.hud.questBanner('Recompensa: '+FRONTIER.rewardGold+' oro + '+FRONTIER.rewardXp+' XP');
    this.game.saveSys.save();
    return true;
  }
  update(dt){
    if(!this.enabled||this.game.state!=='playing')return;
    this.timer+=dt;
    if(this.timer<.35)return;
    this.timer=0;
    const g=this.game,p=g.player.pos;
    const layer=g.interiors?.inside?.kind==='dungeon'?'interior':'overworld';
    const z=regionAtP18(p.x,p.z,layer);
    if(!z)return;
    this.zone=z;
    if(z.id===this.lastRegion)return;
    const isNew=!this.world.visited[z.id];
    this.world=applyWorldEventP18(this.world,{type:'areaVisited',id:z.id});
    this.lastRegion=z.id;
    this.refreshLabel();
    if(isNew && clock()-this.lastNotified>5000){
      this.lastNotified=clock();
      g.hud.notify('Exploraste: '+z.name);
    }
  }
  report(){
    const g=this.game;
    const near=g.enemies?.list?.filter(e=>e.alive&&e.p18Frontier)||[];
    return {
      version:'P18.0 playable living ecosystem',
      zone:this.zone?.id||null,
      safeZone:this.zone?.kind==='safe_city',
      zonesVisited:Object.keys(this.world.visited).length,
      frontierQuest:saveQuest(this.quest),
      frontierMobsAlive:near.length,
      frontierMobsActive:near.filter(e=>e.state==='chase'||e.state==='attack').length,
      frontierPacks:g.enemies?.packs?.filter(p=>p.p18).length||0,
      npcRoutines:Object.fromEntries((g.npcs?.list||[]).map(n=>[
        n.id,npcRoutineP18(n.id,g.time.dayTime)?.activity||null
      ])),
      saveNamespace:g.saveSys?.key||null,
      fpsGovernor:g.perf163?.report?.()||null
    };
  }
}
export const P18_FRONTIER_QUEST = FRONTIER;
