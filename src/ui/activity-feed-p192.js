/**
 * P192 — compact adventure log instead of 5 large right-side toasts.
 * Keeps 120 in-session messages, major quest banners unchanged.
 */
const CSS=[
 '#hf-p192-feed{position:fixed;z-index:57;left:32%;bottom:3px;',
 'width:min(40vw,510px);max-height:min(43vh,260px);display:flex;flex-direction:column;',
 'border:1px solid #8664b6;box-shadow:0 2px 9px #0008;border-radius:10px;',
 'background:linear-gradient(110deg,#0e0b23d9,#25143dca);color:#f5ecff;',
 'font:11px/1.4 system-ui;overflow:hidden;touch-action:pan-y}',
 '#hf-p192-feed[hidden]{display:none}',
 '#hf-p192-feed button{height:23px;min-height:23px;border:0;',
 'border-bottom:1px solid #58477c;background:transparent;',
 'color:#ffe1ad;font:700 10px system-ui;text-align:left;padding:3px 9px;',
 'touch-action:manipulation}',
 '#hf-p192-feed .hf-p192-lines{display:flex;flex-direction:column;gap:3px;',
 'padding:4px 8px;max-height:min(34vh,210px);overflow-y:auto;touch-action:pan-y}',
 '#hf-p192-feed .hf-p192-line{color:#e7d7f4;white-space:nowrap;overflow:hidden;',
 'text-overflow:ellipsis}',
 '#hf-p192-feed.expanded{background:#170f2df4}',
 '#hf-p192-feed.expanded .hf-p192-line{white-space:normal}',
 '#hf-p192-feed .hf-p192-line[data-kind=loot]{color:#f8dfa2}',
 '#hf-p192-feed .hf-p192-line[data-kind=quest]{color:#b6f1ff}'
].join('');
function kindFor(s){
 if(/obtuviste|botín|obtenid|recogiste|oro|forj|fabric|equipado/i.test(s))return 'loot';
 if(/misión|objetivo|volvé con|recompensa|profesión|oficio/i.test(s))return 'quest';
 return 'system';
}
export class ActivityFeedP192{
 constructor(game){
  this.game=game;this.entries=[];this.expanded=false;
  if(!document.getElementById('hf-p192-feed-style')){
   const css=document.createElement('style');css.id='hf-p192-feed-style';
   css.textContent=CSS;document.head.appendChild(css);
  }
  this.root=document.createElement('section');
  this.root.id='hf-p192-feed';this.root.setAttribute('aria-label','Registro de aventuras');
  this.toggle=document.createElement('button');this.toggle.type='button';
  this.toggle.setAttribute('aria-label','Expandir o minimizar el registro');
  this.toggle.addEventListener('click',()=>{
   this.expanded=!this.expanded;
   this.root.classList.toggle('expanded',this.expanded);
   this.render();
  });
  this.lines=document.createElement('div');this.lines.className='hf-p192-lines';
  this.root.append(this.toggle,this.lines);document.body.appendChild(this.root);
  this.render();
 }
 push(message,kind=null){
  if(typeof message!=='string'||!message.trim())return;
  const text=message.replace(/\s+/g,' ').slice(0,190);
  const actualKind=kind||kindFor(text);
  const previous=this.entries.at(-1);
  if(previous?.text===text&&Date.now()-previous.time<850)return;
  this.entries.push({text,kind:actualKind,time:Date.now()});
  if(this.entries.length>120)this.entries.splice(0,this.entries.length-120);
  this.render();
 }
 render(){
  this.toggle.textContent='▤ REGISTRO · '+this.entries.length+
   (this.expanded?'   ▲ CERRAR':'   ▾ VER TODO');
  this.lines.replaceChildren();
  const entries=this.expanded?this.entries.slice(-40):this.entries.slice(-3);
  for(const {text,kind} of entries){
   const line=document.createElement('div');
   line.className='hf-p192-line';line.dataset.kind=kind;
   line.textContent=text;line.title=text;
   this.lines.appendChild(line);
  }
  if(this.expanded)this.lines.scrollTop=this.lines.scrollHeight;
 }
 updateState(state){this.root.hidden=state!=='playing';}
}
