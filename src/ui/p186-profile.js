/**
 * P186 visual transfer from user's 2026-11-05 mobile landscape video.
 * Values are a DEFAULT for the P186 PREVIEW only, never a hard reset:
 * distance=10, pitch=-46deg, focus height=1.7, fov=85,
 * aim sensitivity=.145, deadzone=4.
 * Character spot is actually the fixed centered CSS HUD crosshair; hide it
 * without touching physical aiming, hit confirmation or mesh materials.
 */
export const P186_FILMED_CAMERA=Object.freeze({
 distance:10,pitch:-46,height:1.7,fov:85,aim:.145,deadZone:4
});
export const P186_FILMED_HUD=Object.freeze({
 joy:{x:.039,y:.625,size:130},run:{x:.48,y:.827,size:59},
 jump:{x:.562,y:.825,size:60},dash:{x:.657,y:.825,size:60},
 use:{x:.821,y:.884,size:38},s1:{x:.75,y:.805,size:55},
 atk:{x:.856,y:.689,size:98},s2:{x:.772,y:.65,size:58},
 s3:{x:.83,y:.54,size:58},s4:{x:.906,y:.54,size:58},
 focus:{x:.955,y:.885,size:31},bag:{x:.85,y:.395,size:56},
 menu:{x:.927,y:.395,size:56}
});
const KEY='hf_p186_filmed_camera_user_override_v1';
export function applyP186VideoCamera(g){
 if(!g?.player||!g?.camera)return false;
 let value=P186_FILMED_CAMERA;
 try{
   const stored=JSON.parse(localStorage.getItem(KEY)||'null');
   if(stored&&typeof stored==='object')value={...value,...stored};
 }catch(_){}
 const p=g.player;
 p.hfCameraPresetDist=value.distance;
 p.camDist=value.distance;
 p.pitch=value.pitch*Math.PI/180;
 p.camTargetHeight=value.height;
 p._cameraReady=false;
 g.camera.fov=value.fov;g.camera.updateProjectionMatrix();
 g.p186AimSensitivity=value.aim;g.p186AimDeadzone=value.deadZone;
 return true;
}
export function installP186VisualSafety(){
 if(document.getElementById('hf-p186-visual'))return;
 const style=document.createElement('style');
 style.id='hf-p186-visual';
 style.textContent=[
  'body.hf-p810 .hud-crosshair{display:none!important}',
  'body.hf-p810 #hf-touch #hf-p186-focus{position:fixed;z-index:65;min-width:24px!important;max-width:none!important;min-height:24px!important;max-height:none!important;pointer-events:auto;touch-action:none;white-space:normal;font:800 9px/1 system-ui;text-align:center;border:2px solid #69dceb;border-radius:50%;background:#162751ef;color:#f6fdff;padding:2px;overflow:hidden}',
  'body.hf-p810 #hf-touch #hf-p186-focus.active{border-color:#ffcb7a;box-shadow:0 0 14px #f9b86a99}'
 ].join('');
 document.head.appendChild(style);
}
export function applyP186FilmedHudIfNew(editor){
 if(!editor?.layout||!editor?.apply)return false;
 // Never overwrite the user's prior HUD! Only install filmed positions on a
 // fresh profile or an explicit opt-in URL query.
 let exists=false;
 try{exists=!!localStorage.getItem('hf_p812_hud_layout_v2');}catch(_){exists=true;}
 const explicit=!!new URLSearchParams(location.search).has('hf_p186_video_hud');
 if(exists&&!explicit)return false;
 for(const [id,value] of Object.entries(P186_FILMED_HUD))
   if(editor.layout[id])Object.assign(editor.layout[id],value);
 editor.apply();
 if(explicit)editor.persist();
 return true;
}

/** Explicit cross-origin handoff from the isolated L27 lab.
 * Query parameters are untrusted; sanitize all numeric values and IDs.
 * Never overwrite an existing HUD unless user clicked LAB transfer link.
 */
export function consumeP186TransferFromUrl(){
 const token=new URLSearchParams(location.search).get('hf_p186_transfer');
 if(!token||token.length>12000)return false;
 let data;try{data=JSON.parse(token);}catch(_){return false;}
 if(!data||data.version!==1||typeof data!=='object')return false;
 const safeCamera={};
 const limits={distance:[2.5,12],pitch:[-80,15],height:[.3,3.5],
  fov:[40,110],aim:[.08,.25],deadZone:[1,35]};
 for(const [key,interval] of Object.entries(limits)){
  const n=Number(data.camera?.[key]);
  if(Number.isFinite(n))safeCamera[key]=Math.max(interval[0],Math.min(interval[1],n));
 }
 const allowed=['joy','run','jump','dash','use','s1','atk','s2','s3','s4',
   'lock','next','clear','radar','bag','menu','combo','perf','header','focus'];
 const safeHud={};
 for(const id of allowed){
  const it=data.hud?.[id];if(!it||typeof it!=='object')continue;
  const raw={};
  for(const [name,a,c] of [['x',0,.98],['y',0,.98],['size',26,350],['opacity',.25,1]]){
   const n=Number(it[name]);if(Number.isFinite(n))raw[name]=Math.max(a,Math.min(c,n));
  }
  raw.hidden=it.hidden===true;
  safeHud[id]=raw;
 }
 try{
  if(Object.keys(safeCamera).length)localStorage.setItem(KEY,JSON.stringify(safeCamera));
  if(Object.keys(safeHud).length)localStorage.setItem('hf_p812_hud_layout_v2',
   JSON.stringify({version:2,layout:safeHud}));
  // Replace the one-shot URL, so reloading does not reset later HUD edits.
  history.replaceState(history.state,'',location.pathname+
   (location.search.replace(/([?&])hf_p186_transfer=[^&]*&?/,'$1').replace(/[?&]$/,''))+
   location.hash);
  return true;
 }catch(_){return false;}
}
