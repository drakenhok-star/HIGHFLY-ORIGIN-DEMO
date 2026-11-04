/**
 * HIGHFLY P6 CPU phase profiler. Zero per-phase timestamps unless explicitly enabled.
 * FPS/P95 continue to come from MobileAudit's uncapped requestAnimationFrame timing.
 */
export class PerfProbeP6 {
  constructor(game) {
    this.enabled=new URLSearchParams(location.search).has('hf_p6_profile');
    this.last=0;
    this.samples={world:[],player:[],combat:[],entities:[],render:[],frame:[]};
    if(game.mobileAudit){
      const oldReport=game.mobileAudit.report.bind(game.mobileAudit);
      game.mobileAudit.report=()=>({...oldReport(),p6Cpu:this.report()});
    }
    window.highflyP6Report=()=>this.report();
  }
  begin(){if(!this.enabled)return;this.frameStart=performance.now();this.last=this.frameStart;}
  mark(key){if(!this.enabled)return;const now=performance.now();this.push(key,now-this.last);this.last=now;}
  end(){if(!this.enabled)return;const now=performance.now();this.push('frame',now-this.frameStart);}
  push(key,v){const s=this.samples[key];if(!s)return;s.push(v);if(s.length>160)s.shift();}
  report(){
    const out={enabled:this.enabled,note:'CPU phases, not GPU time or actual Android FPS'};
    for(const [key,s] of Object.entries(this.samples)){
      if(!s.length){out[key]=null;continue;}
      const a=s.slice().sort((x,y)=>x-y);
      out[key]={meanMs:Number((s.reduce((x,y)=>x+y,0)/s.length).toFixed(2)),
        p95Ms:Number(a[Math.min(a.length-1,Math.ceil(a.length*0.95)-1)].toFixed(2))};
    }
    return out;
  }
}
