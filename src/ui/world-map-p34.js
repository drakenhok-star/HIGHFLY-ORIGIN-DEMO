/**
 * HIGHFLY P3/P4 A: minimap + browsable world map. No gameplay mutations.
 * Positions grounded in Tianjie5's structures/enemies/terrain source.
 */
const POIS = [
  ["Aldea",0,40,"#f8de89"],
  ["Ruinas",-220,-180,"#dfb3e6"],
  ["Cripta",-243,-157,"#f3a29a"],
  ["Claro y cofre",150,150,"#f9e48b"],
  ["Lobos A",120,160,"#ffa69d"],
  ["Lobos B",-150,120,"#ffa69d"],
  ["Lobos C",80,-180,"#ffa69d"],
  ["Lobos de hielo",380,-150,"#a8e3ff"],
  ["Torre del dragón",300,-300,"#ff987d"],
];

export class WorldMapP34 {
  constructor(game) {
    this.game = game;
    this.atlas = document.createElement("canvas");
    this.atlas.width = this.atlas.height = 128;
    this.atlasReady = false;
    this.atlasStarted = false;
    this.opened = false;
    this.mount();
    this.setState(game.state);
    this.timer = window.setInterval(() => this.tick(), 280);
    document.addEventListener("keydown", e => {
      if (this.opened && e.code === "Escape") {
        e.preventDefault(); e.stopPropagation(); this.toggle(false);
      }
    }, {capture: true});
  }
  mount() {
    const css = document.createElement("style");
    css.textContent = [
      '#hf-worldmini{position:fixed;right:max(10px,env(safe-area-inset-right));top:max(58px,env(safe-area-inset-top) + 54px);z-index:43;width:139px;height:158px;padding:4px;display:none;flex-direction:column;background:#0b2237e8;border:1px solid #83d6f8;border-radius:9px;color:#ebfaff;cursor:pointer;touch-action:manipulation}',
      '#hf-worldmini canvas{width:129px;height:129px;border-radius:5px;pointer-events:none}',
      '#hf-worldcoords{font:10px system-ui;line-height:17px;text-align:center;white-space:nowrap}',
      '#hf-worldoverlay{position:fixed;inset:0;z-index:76;display:none;align-items:center;justify-content:center;background:#06111beb;color:white;font-family:system-ui;touch-action:manipulation}',
      '#hf-worldpanel{display:flex;flex-direction:column;align-items:center;gap:5px;background:#10283a;border:1px solid #98d8ee;border-radius:12px;padding:8px 14px;max-height:95vh;max-width:95vw}',
      '#hf-worldhead{display:flex;justify-content:space-between;align-items:center;width:100%;gap:15px;font-weight:700;font-size:13px}',
      '#hf-worldclose{background:#215171;border:1px solid #91ddff;color:white;border-radius:7px;padding:5px 15px;touch-action:manipulation}',
      '#hf-worldbig{width:min(70vh,430px,75vw);height:min(70vh,430px,75vw);border:1px solid #416979;border-radius:5px}',
      '#hf-worldlegend{font:10px system-ui;text-align:center;opacity:.86}',
      '#hf-touch .hf-hint{display:none}',
    ].join("\n");
    document.head.appendChild(css);

    const mini = document.createElement("button");
    mini.type = "button"; mini.id = "hf-worldmini";
    mini.setAttribute("aria-label","Abrir mapamundi");
    this.miniCanvas = document.createElement("canvas");
    this.miniCanvas.width = this.miniCanvas.height = 192;
    mini.appendChild(this.miniCanvas);
    const coords = document.createElement("div");
    coords.id = "hf-worldcoords"; mini.appendChild(coords);
    this.coords = coords;
    mini.addEventListener("click", e => {e.preventDefault(); e.stopPropagation();this.toggle(true)});
    document.body.appendChild(mini); this.mini = mini;

    const overlay = document.createElement("div");
    overlay.id = "hf-worldoverlay";
    overlay.innerHTML = '<div id="hf-worldpanel" role="dialog" aria-modal="true" aria-label="Mapa de Tianjie5">'
      + '<div id="hf-worldhead"><span>HIGHFLY · MAPAMUNDI</span><button type="button" id="hf-worldclose">CERRAR</button></div>'
      + '<canvas id="hf-worldbig" width="512" height="512"></canvas>'
      + '<div id="hf-worldlegend">Norte ↑ · Punto turquesa = cazador · Coordenadas reales del juego<br>'
      + 'El terreno continúa fuera de este mapa. Zonas futuras todavía no representadas.</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector("#hf-worldclose").addEventListener("click", e => {e.preventDefault(); e.stopPropagation(); this.toggle(false)});
    overlay.addEventListener("click", e => {if(e.target === overlay)this.toggle(false)});
    this.overlay = overlay;
    this.bigCanvas = overlay.querySelector("#hf-worldbig");
  }
  setState(s) {
    this.mini.style.display = s === "playing" ? "flex" : "none";
    if(s !== "playing")this.toggle(false);
  }
  toggle(open) {
    this.opened = Boolean(open);
    this.overlay.style.display = this.opened ? "flex" : "none";
    if(this.opened){this.buildAtlas();this.drawBig()}
  }
  buildAtlas() {
    if(this.atlasStarted)return;
    this.atlasStarted = true;
    const n = this.atlas.width, ctx=this.atlas.getContext("2d", {alpha:false});
    const img=ctx.createImageData(n,n);
    let row=0;
    const step=()=>{
      const until=Math.min(row+4,n);
      for(let y=row;y<until;y++){
        const z=-700+(y+.5)*1400/n;
        for(let x=0;x<n;x++){
          const wx=-700+(x+.5)*1400/n;
          const h=this.game.terrain.getHeight(wx,z);
          const i=4*(y*n+x);
          const c = h < -2 ? [33,82,118] : h < 1 ? [177,164,111]
            : h < 35 ? [48,92,63] : h < 53 ? [112,110,105] : [213,223,226];
          img.data[i]=c[0];img.data[i+1]=c[1];img.data[i+2]=c[2];img.data[i+3]=255;
        }
      }
      row=until;
      if(row<n)window.setTimeout(step,20);
      else {
        ctx.putImageData(img,0,0);this.atlasReady=true;
        this.drawBig();this.drawMini();
      }
    };
    window.setTimeout(step,40);
  }
  dot(ctx,x,y,r,color) {
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();ctx.strokeStyle="#0c2530";ctx.lineWidth=2;ctx.stroke();
  }
  drawBig() {
    if(!this.opened)return;
    const ctx=this.bigCanvas.getContext("2d"),n=this.bigCanvas.width;
    ctx.fillStyle="#214a42";ctx.fillRect(0,0,n,n);
    if(this.atlasReady)ctx.drawImage(this.atlas,0,0,n,n);
    const at=v=>(v+700)/1400*n;
    ctx.font="bold 14px system-ui";ctx.textBaseline="middle";
    for(const [name,x,z,color] of POIS) {
      const px=at(x),py=at(z);
      this.dot(ctx,px,py,5,color);
      ctx.lineWidth=3;ctx.strokeStyle="#06141a";ctx.fillStyle="#fff";
      ctx.strokeText(name,px+8,py);ctx.fillText(name,px+8,py);
    }
    const p=this.game.player.pos,px=at(p.x),py=at(p.z);
    if(px>=0&&px<n&&py>=0&&py<n)this.dot(ctx,px,py,7,"#52ffd8");
    ctx.fillStyle="#fff";ctx.font="bold 18px system-ui";ctx.fillText("N ↑",12,20);
    ctx.font="12px system-ui";ctx.fillText("X "+Math.round(p.x)+" · Z "+Math.round(p.z),12,n-14);
    if(!this.atlasReady)ctx.fillText("Calculando relieve...",n-170,n-14);
  }
  drawMini() {
    const n=this.miniCanvas.width,ctx=this.miniCanvas.getContext("2d"),p=this.game.player.pos;
    const radius=120,scale=n/(radius*2);
    ctx.fillStyle="#203d3b";ctx.fillRect(0,0,n,n);
    if(this.atlasReady) {
      const size=1400*scale,left=n/2-(p.x+700)*scale,top=n/2-(p.z+700)*scale;
      ctx.drawImage(this.atlas,left,top,size,size);
    }
    ctx.strokeStyle="#c6e5e933";ctx.lineWidth=1;
    for(const offset of [-60,0,60]) {
      ctx.beginPath();ctx.moveTo(n/2+offset,0);ctx.lineTo(n/2+offset,n);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,n/2+offset);ctx.lineTo(n,n/2+offset);ctx.stroke();
    }
    for(const [,x,z,color] of POIS) {
      const px=n/2+(x-p.x)*scale,py=n/2+(z-p.z)*scale;
      if(px<6||py<6||px>n-6||py>n-6)continue;
      this.dot(ctx,px,py,4,color);
    }
    ctx.save();ctx.translate(n/2,n/2);ctx.rotate(-this.game.player.yaw);
    ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(8,10);ctx.lineTo(0,5);ctx.lineTo(-8,10);ctx.closePath();
    ctx.fillStyle="#64ffe2";ctx.fill();ctx.strokeStyle="#052b29";ctx.stroke();ctx.restore();
    ctx.fillStyle="#eaffff";ctx.font="bold 14px system-ui";ctx.fillText("N",n/2-4,16);
    this.coords.textContent="X "+Math.round(p.x)+" · Z "+Math.round(p.z)+"  |  MAPA";
  }
  tick() {
    if(this.game.state!=="playing")return;
    this.drawMini();
    if(this.opened)this.drawBig();
  }
}
