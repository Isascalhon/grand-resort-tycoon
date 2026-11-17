/* Pós-processamento por preset: RenderPass → GTAO (Alta) → UnrealBloom → OutputPass (ACES + sRGB) → SMAA.
   O bloom trabalha em HDR linear, então só lâmpadas e letreiros (emissivos acima de ~1) brilham. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

export class PostFX {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 0 }));
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.addPass(new RenderPass(scene, camera));
    if (quality.ao) {
      this.ao = new GTAOPass(scene, camera, size.x, size.y);
      this.ao.output = GTAOPass.OUTPUT.Default;
      this.ao.blendIntensity = .8;
      this.composer.addPass(this.ao);
    }
    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(size, .25, .22, 1.6);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    if (quality.smaa) this.composer.addPass(new SMAAPass());
  }

  /* O bloom só entra ao anoitecer: de dia o céu (Preetham) e as superfícies ao sol passam de 1 em HDR
     e viram névoa. Ao escurecer, o limiar desce para as lâmpadas da marquise e os letreiros. */
  setNight(n) {
    if (!this.bloom) return;
    this.bloom.enabled = n > .3;
    this.bloom.strength = .18 + .3 * n;
    this.bloom.threshold = 2.6 - 1.5 * n;
  }

  setSize(w, h) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
  render(dt) { this.composer.render(dt); }
  dispose() { this.composer.dispose(); }
}
