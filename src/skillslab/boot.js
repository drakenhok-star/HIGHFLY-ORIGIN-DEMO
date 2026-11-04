import { TianjieMobaSkillsLab } from './skills-web.js';

// No source-game import or replacement; same unmodified Tianjie P14 build.
function attach(){
  const g=window.game;
  if(!g||!g.player||!g.combat||!g.enemies||!g.touch){
    requestAnimationFrame(attach);
    return;
  }
  if(window.highflySkillsLab)return;
  const lab=new TianjieMobaSkillsLab(g);
  window.highflySkillsLab=lab;
  document.body.classList.add('hf-skills-lab');
  console.info('[HIGHFLY P15] Same P14 Tianjie/KayKit player active. 3 styles, 9 skills.');
}
requestAnimationFrame(attach);
