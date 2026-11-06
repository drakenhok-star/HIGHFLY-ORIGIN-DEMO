/**
 * P188 black-screen diagnostics + safe WebGL restore hints.
 * Context loss is a possible cause of transient black frames, NOT a confirmed
 * explanation for every black flash. Never auto-reload or delete saves.
 */
export class GpuDiagnosticsP188{
 constructor(game){
  this.game=game;this.events=[];this.lost=false;
  this.canvas=game.renderer?.domElement;
  if(!this.canvas)return;
  this.onLost=e=>{
   e.preventDefault();
   this.lost=true;this.record('WEBGL_CONTEXT_LOST');
   this.show('HIGHFLY: el sistema gráfico perdió el contexto. Intentando recuperar…');
  };
  this.onRestored=()=>{
   this.lost=false;this.record('WEBGL_CONTEXT_RESTORED');
   try{
    game.renderer?.resetState?.();
    game.renderer?.setSize?.(window.innerWidth,window.innerHeight);
    game.composer?.setSize?.(window.innerWidth,window.innerHeight);
    game.camera?.updateProjectionMatrix?.();
   }catch(error){this.record('WEBGL_RESTORE_REINIT_FAILED',String(error));}
   this.clear();
   game.hud?.notify?.('Gráficos recuperados. Revisá el rendimiento.');
  };
  this.canvas.addEventListener('webglcontextlost',this.onLost,false);
  this.canvas.addEventListener('webglcontextrestored',this.onRestored,false);
  this.onError=e=>this.record('APP_ERROR',e?.message||String(e?.error||'Error'));
  this.onReject=e=>this.record('UNHANDLED_PROMISE',String(e?.reason||'Error'));
  window.addEventListener('error',this.onError);
  window.addEventListener('unhandledrejection',this.onReject);
 }
 record(type,details=''){
  const event={time:Date.now(),type,details:details.slice(0,200)};
  this.events.push(event);if(this.events.length>40)this.events.shift();
  console.warn('[HIGHFLY P188 GPU WATCH]',type,details);
 }
 report(){return {contextLost:this.lost,recentEvents:this.events.slice(-12)};}
 show(message){
  if(!this.notice){
   const el=document.createElement('div');el.id='hf-p188-gpu-notice';
   el.style.cssText='position:fixed;inset:auto 10% 9%;z-index:500;'+
    'padding:12px;background:#291531eb;color:#fff;text-align:center;'+
    'border:2px solid #d979a7;border-radius:12px;font:700 14px system-ui';
   document.body.appendChild(el);this.notice=el;
  }
  this.notice.textContent=message;
 }
 clear(){this.notice?.remove();this.notice=null;}
}
