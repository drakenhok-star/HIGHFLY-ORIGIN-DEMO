/**
 * Tianjie5 Android touch controller for HIGHFLY isolated lab.
 * MIT: code extension; upstream: https://github.com/zexadev/tianjie5
 */
import { PremiumHudP5 } from './premium-hud-p5.js';

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.enabled = ((navigator.maxTouchPoints || 0) > 0) ||
      (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) ||
      new URLSearchParams(location.search).has('hf_touch');
    game.input.touchMove = { x: 0, y: 0 };
    game.input.touchSprint = false;
    this.joystickId = null;
    this.cameraId = null;
    this.runIds = new Set();
    if (!this.enabled) return;
    this.build();
    this.camera();
    this.premium = null;
    if (!new URLSearchParams(location.search).has('hf_classic_hud')) {
      try { this.premium = new PremiumHudP5(this); }
      catch (err) {
        console.error('[HIGHFLY HUD] Recuperando HUD clásico:', err);
        document.body.classList.remove('hf-p5');
      }
    }
    this.setState(game.state);
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
  }

  build() {
    const style = document.createElement('style');
    style.textContent = [
      'html,body,canvas{touch-action:none!important;overscroll-behavior:none}',
      '#hf-touch{position:fixed;inset:0;z-index:24;pointer-events:none;font-family:system-ui,sans-serif;color:#eafaff;user-select:none;-webkit-user-select:none}',
      '#hf-touch *{box-sizing:border-box;touch-action:none;-webkit-tap-highlight-color:transparent}',
      '.hf-joy{position:absolute;left:max(15px,env(safe-area-inset-left));bottom:max(15px,env(safe-area-inset-bottom));width:min(126px,34vh);height:min(126px,34vh);min-width:88px;min-height:88px;border-radius:50%;border:2px solid #66dcffae;background:#081b30b8;pointer-events:auto}',
      '.hf-knob{position:absolute;top:50%;left:50%;width:43%;height:43%;transform:translate(-50%,-50%);border-radius:50%;border:2px solid #b0eaff;background:#68d8ff66;pointer-events:none}',
      '.hf-joy:before{content:"MOVER";position:absolute;top:-21px;left:0;right:0;text-align:center;font:11px system-ui;letter-spacing:1px}',
      '.hf-actions{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,min(68px,17vh));grid-template-rows:repeat(2,min(64px,16vh));gap:6px}',
      '.hf-btn{pointer-events:auto;background:#10284bd9;color:#f1fcff;border:1px solid #8edfff;border-radius:16px;font-weight:750;font-size:11px;touch-action:none}',
      '.hf-btn.hf-down{background:#2294db}',
      '.hf-btn-atk{font-size:17px;background:#235498ed}',
      '.hf-btn-magic{border-color:#bd90ff;color:#eecbff}',
      '.hf-menu{position:absolute;top:max(11px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:65px;height:36px}',
      '.hf-hint{position:absolute;right:15px;top:53px;font-size:10px;opacity:.65;pointer-events:none}',
      '@media(max-height:340px){.hf-actions{grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,44px)}.hf-joy{width:91px;height:91px}}'
    ].join('\n');
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'hf-touch';
    root.setAttribute('translate', 'no'); // labels already in Spanish: prevent Chrome auto-translation
    document.body.appendChild(root);
    this.root = root;
    const joy = document.createElement('div');
    joy.className = 'hf-joy';
    joy.setAttribute('aria-label', 'Joystick 360');
    const knob = document.createElement('div');
    knob.className = 'hf-knob';
    joy.appendChild(knob);
    root.appendChild(joy);
    this.knob = knob;
    const move = (e) => {
      const rect = joy.getBoundingClientRect();
      const radius = rect.width * .38;
      let x = (e.clientX - rect.left - rect.width/2) / radius;
      let y = (e.clientY - rect.top - rect.height/2) / radius;
      const d = Math.max(1, Math.hypot(x, y));
      x /= d; y /= d;
      this.game.input.touchMove.x = x;
      this.game.input.touchMove.y = y;
      knob.style.transform = 'translate(calc(-50% + '+(x*radius)+'px),calc(-50% + '+(y*radius)+'px))';
    };
    joy.addEventListener('pointerdown', (e) => {
      if (this.game.state !== 'playing' || this.joystickId !== null) return;
      e.preventDefault(); e.stopPropagation();
      this.joystickId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      move(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joystickId) return;
      e.preventDefault(); move(e);
    });
    const endJoy = (e) => {
      if (e.pointerId !== this.joystickId) return;
      this.joystickId = null;
      this.game.input.touchMove.x = 0; this.game.input.touchMove.y = 0;
      knob.style.transform = 'translate(-50%,-50%)';
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(k => joy.addEventListener(k,endJoy));

    const actions = document.createElement('div');
    actions.className = 'hf-actions';
    root.appendChild(actions);
    this.addButton(actions,'USAR','',()=>this.key('KeyE'));
    this.addButton(actions,'MAGIA','hf-btn-magic',()=>{this.game.input.rightClick=true;});
    this.addButton(actions,'SALTO','',()=>this.key('Space'));
    this.addButton(actions,'CORRER','',()=>{},(pressed,id)=>{
      if(pressed)this.runIds.add(id);else this.runIds.delete(id);
      this.game.input.touchSprint=this.runIds.size>0;
    });
    this.addButton(actions,'ATK','hf-btn-atk',()=>{this.game.input.leftClick=true;});
    this.addButton(actions,'GRITO','',()=>this.key('KeyF'));
    const pause = document.createElement('button');
    pause.type='button'; pause.className='hf-btn hf-menu'; pause.textContent='PAUSA';
    pause.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      if(this.game.state==='playing')this.game.setState('paused');
    });
    root.appendChild(pause);
    const hint=document.createElement('div');
    hint.className='hf-hint';hint.textContent='Deslizá a la derecha para mirar';
    root.appendChild(hint);
  }

  addButton(parent, label, cls, action, hold) {
    const b = document.createElement('button');
    b.type='button'; b.className='hf-btn '+cls; b.textContent=label;
    const active=new Set();
    b.addEventListener('pointerdown',e=>{
      if(this.game.state!=='playing')return;
      e.preventDefault();e.stopPropagation();
      b.setPointerCapture(e.pointerId);
      active.add(e.pointerId);b.classList.add('hf-down');
      action();
      if(hold)hold(true,e.pointerId);
    });
    const end=e=>{
      if(!active.has(e.pointerId))return;
      active.delete(e.pointerId);
      if(!active.size)b.classList.remove('hf-down');
      if(hold)hold(false,e.pointerId);
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(k=>b.addEventListener(k,end));
    parent.appendChild(b);
  }
  key(code){this.game.input.justPressed.add(code);}

  camera() {
    const canvas=this.game.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{
      if(this.game.state!=='playing'||this.cameraId!==null||e.clientX<innerWidth*.35)return;
      e.preventDefault();
      this.cameraId=e.pointerId;
      this.lastX=e.clientX;this.lastY=e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.cameraId)return;
      e.preventDefault();
      this.game.input.mouse.dx+=(e.clientX-this.lastX)*1.2;
      this.game.input.mouse.dy+=(e.clientY-this.lastY)*1.2;
      this.lastX=e.clientX;this.lastY=e.clientY;
    });
    const end=e=>{if(e.pointerId===this.cameraId)this.cameraId=null;};
    ['pointerup','pointercancel','lostpointercapture'].forEach(k=>canvas.addEventListener(k,end));
  }

  reset() {
    this.game.input.touchMove.x=0;this.game.input.touchMove.y=0;
    this.game.input.touchSprint=false;this.runIds.clear();
    this.joystickId=null;this.cameraId=null;
    if(this.knob)this.knob.style.transform='translate(-50%,-50%)';
  }
  setState(s) {
    if(!this.enabled)return;
    this.root.style.display=s==='playing'?'block':'none';
    if(this.premium)this.premium.setState(s);
    if(s!=='playing')this.reset();
  }
}
