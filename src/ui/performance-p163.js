/**
 * HIGHFLY P16.3 — bounded adaptive resolution, CPU-light (no JS objects per frame).
 * Changes only render resolution, NEVER simulation timestep, input or game logic.
 * Native 60/90/120 Hz refresh caps are respected; eco 30 fps disables adaptation.
 */
export const P163_DPR_FLOOR = .70;
export const P163_DPR_STEP_DOWN = .08;
export const P163_DPR_STEP_UP = .04;
export const P163_SAMPLE_MIN = 84;
export const P163_HOLD_MS = 6200;

export function percentileFrameMs(sample, fractile=.95){
  if(!sample.length)return null;
  const sorted=[...sample].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*fractile)-1))];
}

/** Pure decision function, used by Node CI and in-browser governor. */
export function decideDprP163({fps,p95,current,min,max,eco=false,enabled=true}){
  if(!enabled||eco||!Number.isFinite(fps)||!Number.isFinite(p95)||!Number.isFinite(current))return current;
  const base=Math.max(min,Math.min(max,current));
  // Require BOTH sustained poor FPS and slow P95; avoid reacting to lone spikes.
  if(fps<39 && p95>27 && base>min+.015)return Math.max(min,+(base-P163_DPR_STEP_DOWN).toFixed(2));
  // Upgrade conservatively only when frame times have comfortable headroom.
  if(fps>=55 && p95<21 && base<max-.015)return Math.min(max,+(base+P163_DPR_STEP_UP).toFixed(2));
  return base;
}

export class PerfGovernorP163 {
  constructor(game){
    this.game=game;
    const q=typeof location==='undefined'?new URLSearchParams():new URLSearchParams(location.search);
    this.enabled=!!game.p163Enabled && q.get('hf_p163_auto')!=='0' && (game.touch?.enabled||q.get('hf_p163_auto')==='1');
    this.samples=[];
    this.lastTime=null;
    this.lastDecision=-Infinity;
    this.window=null;
    this.movesDown=0;this.movesUp=0;this.presetTransitions=0;
    this.baseDpr=game.renderer.getPixelRatio();
    // Clarity preserves more spatial detail in character silhouettes, yet
    // can still downscale slightly under sustained GPU pressure.
    this.dprMin=Math.min(this.baseDpr,
      game.p191Build&&game.performanceP2?.preset==='CLARITY'?.95:P163_DPR_FLOOR);
    this.reason=this.enabled?'warming':'disabled';
    if(typeof window!=='undefined')window.highflyP163Report=()=>this.report();
    if(game.mobileAudit?.report){
      const original=game.mobileAudit.report.bind(game.mobileAudit);
      game.mobileAudit.report=()=>({...original(),p163:this.report()});
    }
  }

  onPresetChange(){
    this.presetTransitions++;
    this.samples.length=0;this.lastTime=null;this.lastDecision=performance.now();
    this.baseDpr=this.game.renderer.getPixelRatio();
    this.dprMin=Math.min(this.baseDpr,
      this.game.p191Build&&this.game.performanceP2?.preset==='CLARITY'?.95:P163_DPR_FLOOR);
    this.reason='preset-change';
  }

  update(rafTime){
    if(!this.enabled)return;
    const g=this.game;
    if(g.state!=='playing'||g.p812Eco||document.visibilityState==='hidden'||
       (g.performanceP2?.preset!=='FLUID'&&g.performanceP2?.preset!=='BALANCED'&&g.performanceP2?.preset!=='CLARITY')){
      this.lastTime=null;this.samples.length=0;
      this.reason=g.p812Eco?'eco-cap':g.state!=='playing'?'not-playing':'not-lite-preset';
      return;
    }
    if(this.lastTime!==null){
      const delta=rafTime-this.lastTime;
      if(delta>4 && delta<180)this.samples.push(delta);
      else if(delta>=180)this.samples.length=0;
    }
    this.lastTime=rafTime;
    if(this.samples.length<P163_SAMPLE_MIN||rafTime-this.lastDecision<P163_HOLD_MS)return;

    const span=this.samples.reduce((n,x)=>n+x,0)/this.samples.length;
    const fps=1000/span;
    const p95=percentileFrameMs(this.samples);
    const current=g.renderer.getPixelRatio();
    const max=this.baseDpr;
    const min=this.dprMin;
    this.window={frames:this.samples.length,fps:Math.round(fps*10)/10,p95Ms:Math.round(p95*10)/10};
    const next=decideDprP163({fps,p95,current,min,max,eco:false,enabled:true});
    this.samples.length=0;
    this.lastDecision=rafTime;

    if(Math.abs(next-current)<.018){this.reason='hold';return;}
    this.reason=next<current?'downscale':'upscale';
    if(next<current)this.movesDown++;
    else this.movesUp++;
    g.renderer.setPixelRatio(next);
    g.onResize(); // sync composer, camera aspect and canvas buffer with DPR
  }

  report(){
    const g=this.game;
    return {
      version:'P16.3 adaptive render v1',
      enabled:this.enabled,
      reason:this.reason,
      preset:g.performanceP2?.preset??null,
      ecoCap:!!g.p812Eco,
      nativeDevicePixelRatio:typeof window==='undefined'?null:window.devicePixelRatio,
      currentPixelRatio:g.renderer.getPixelRatio(),
      floorDpr:this.dprMin,
      baseDpr:this.baseDpr,
      upscales:this.movesUp,downscales:this.movesDown,presetTransitions:this.presetTransitions,
      lastWindow:this.window,
      waterMeshTriangles:g.performanceP2?.flatWaterGeometry &&
          g.water?.mesh?.geometry===g.performanceP2.flatWaterGeometry ? 1152 : 100352,
      bloomEnabled:!!g.performanceP2?.bloomPass?.enabled,
      shadowsEnabled:!!g.renderer.shadowMap.enabled
    };
  }
}
