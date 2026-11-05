import {TianjieMobaSkillsLab} from './skills-web.js';
import {TianjieCameraLabP18} from './camera-lab-p18.js';
// P19 installs ONLY isolated Skill Lab on top of the actual FURY P16 runtime.
function attach(){
 const g=window.game;
 if(!g||!g.player||!g.combat||!g.enemies||!g.touch){
  requestAnimationFrame(attach);return;
 }
 // P16 Game.newGame()/continueGame() calls player.reset() before playing.
 // Attach only AFTER native P16 resets the camera, not during menu splash.
 if(g.state!=='playing'){requestAnimationFrame(attach);return;}
 if(window.highflySkillsLab)return;
 if(!g.p16Enabled){
  console.error('[HIGHFLY P19] FURY P16 is required; refusing downgraded boot.');
  return;
 }
 const lab=new TianjieMobaSkillsLab(g);
 window.highflySkillsLab=lab;
 window.highflyCameraLab=new TianjieCameraLabP18(g,lab);
 document.body.classList.add('hf-skills-lab');
 console.info('[HIGHFLY P19] FURY P16 + 15 original skills + HYBRID camera.');
}
requestAnimationFrame(attach);
