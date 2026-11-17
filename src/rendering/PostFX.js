/* Pós-processamento por preset: RenderPass → GTAO (Média e Alta) → UnrealBloom → OutputPass (ACES + sRGB) → SMAA → correção de cor.
   O bloom trabalha em HDR linear, então só lâmpadas e letreiros (emissivos acima de ~1) brilham. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GradeShader } from './GradeShader.js';

export class PostFX {
  constructor(renderer, scene, camera, quality, { stillFrames = false } = {}) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 0 }));
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.addPass(new RenderPass(scene, camera));
    if (quality.ao) {
      this.ao = new GTAOPass(scene, camera, size.x, size.y);
      this.ao.output = GTAOPass.OUTPUT.Default;
      this.ao.blendIntensity = quality.ao === 'full' ? .9 : .75;
      this.ao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: quality.ao === 'full' ? 16 : 8 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: quality.ao === 'full' ? 16 : 8 });
      this.composer.addPass(this.ao);
    }
    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(size, .25, .22, 1.6);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    if (quality.smaa) this.composer.addPass(new SMAAPass());
    if (quality.grade) {
      this.grade = new ShaderPass(GradeShader);
      if (stillFrames) this.grade.uniforms.uGrain.value = 0;
      this.composer.addPass(this.grade);
    }
  }

  /* O bloom só entra ao anoitecer: de dia o céu (Preetham) e as superfícies ao sol passam de 1 em HDR
     e viram névoa. Ao escurecer, o limiar desce para as lâmpadas da marquise e os letreiros.
     A correção de cor acompanha: dia neutro, pôr do sol quente, noite mais fria e com mais contraste. */
  setNight(n, golden = 0) {
    if (this.bloom) {
      this.bloom.enabled = n > .3;
      this.bloom.strength = .18 + .3 * n;
      this.bloom.threshold = 2.6 - 1.5 * n;
    }
    if (this.grade) {
      const u = this.grade.uniforms;
      u.uContrast.value = 1.06 + .06 * n;
      u.uSaturation.value = 1.05 + .08 * golden - .08 * n;
      u.uShadowTint.value.set(.98 - .03 * n, 1, 1.04 + .06 * n);
      u.uHighTint.value.set(1.03 + .04 * golden + .02 * n, 1.005 + .01 * n, .97 - .04 * golden - .05 * n);
      u.uVignette.value = .26 + .14 * n;
    }
  }

  setSize(w, h) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
  render(dt) {
    if (this.grade && this.grade.uniforms.uGrain.value > 0) this.grade.uniforms.uTime.value = (this.grade.uniforms.uTime.value + dt) % 100;
    this.composer.render(dt);
  }
  dispose() { this.composer.dispose(); }
}
