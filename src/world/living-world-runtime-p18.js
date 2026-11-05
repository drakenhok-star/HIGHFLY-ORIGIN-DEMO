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
    this.node.setAttribute('aria-label','Misión activa');
    this.node.style.display='none';
    document.body.appendChild(this.node);
    const css=document.createElement('style');
    css.id='hf-p18-zone-style';
    css.textContent=[
      '#hf-p18-zone{position:fixed;left:50%;transform:translateX(-50%);',
      'top:max(9px,calc(env(safe-area-inset-top) + 8px));',
      'max-width:min(50vw,360px);padding:6px 12px;z-index:48;pointer-events:none;text-align:center;',
      'color:#ffdfaa;border-radius:9px;border:1px solid #c18ae0a0;background:#1a1035da;',
      'font:750 11px/1.25 system-ui,sans-serif;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;',
      'box-shadow:0 2px 8px #0005}',
      '@media(max-height:460px){#hf-p18-zone{top:5px;font-size:10px;padding:4px 9px;max-width:46vw}}'
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
      if(this.quest.status==='active'||this.quest.status==='complete')
        this.game.worldMapP34?.trackQuest('p18_frontier');
    }
  }
  setVisible(yes){
    const active=this.quest.status==='active'||this.quest.status==='complete';
    this.node.style.display=yes&&this.enabled&&active?'block':'none';
  }
  refreshLabel(){
    // The zone is internal quest/visit state, not a permanent HUD banner.
    // This top-center strip displays ONLY an actual active mission.
    const active=this.quest.status==='active';
    const complete=this.quest.status==='complete';
    this.node.textContent=active
      ?'✦ MISIÓN ACTIVA · CENTINELAS '+this.quest.progress+'/'+FRONTIER.need
      :complete?'✦ MISIÓN LISTA · VOLVÉ CON BJORN':'';
    this.setVisible(this.game.state==='playing');
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
    this.game.worldMapP34?.trackQuest('p18_frontier');
    this.game.hud.questBanner('Nueva misión: '+FRONTIER.name);
    this.game.hud.notify('Eliminá '+FRONTIER.need+' lobos de frontera y volvé con Bjorn');
    // Preserve the quest immediately without creating a black save-notification card.
    this.game.saveSys.save({silent:true});
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
    // Preserve the quest immediately without creating a black save-notification card.
    this.game.saveSys.save({silent:true});
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
    // Preserve the quest immediately without creating a black save-notification card.
    this.game.saveSys.save({silent:true});
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
