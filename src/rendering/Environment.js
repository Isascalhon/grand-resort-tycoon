/* Céu, sol e reflexos por hora do dia. O céu visível é o Sky (Preetham); os reflexos vêm de um HDRI CC0 da
   Poly Haven convertido em PMREM, escolhido pelo período (dia, pôr do sol, noite). setHour(h) atualiza tudo
   e devolve o fator noite (0 = dia pleno, 1 = noite) para os materiais que acendem. */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { NightSky } from './NightSky.js';

/* À noite os reflexos usam o HDRI do dia bem atenuado: o de rua noturna é todo sódio e deixava o chão laranja */
const HDRI = { day: 'hdri/wide_street_01.hdr', dusk: 'hdri/venice_sunset.hdr' };
const DEG = Math.PI / 180;
const NIGHT_SKY = new THREE.Color(0x0c1026);
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Environment {
  constructor({ renderer, scene, assets, quality }) {
    this.renderer = renderer; this.scene = scene; this.assets = assets; this.quality = quality;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.maps = {};
    this.hour = 10;
    this.night = 0;

    this.sky = new Sky();
    this.sky.scale.setScalar(4000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 4.5; u.rayleigh.value = 1.6; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .82;
    this.sky.renderOrder = -2;
    this.nightSky = new NightSky();
    scene.add(this.sky, this.nightSky.mesh);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = quality.shadows;
    const s = this.sun.shadow;
    s.mapSize.set(quality.shadowSize, quality.shadowSize);
    Object.assign(s.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 });
    s.camera.updateProjectionMatrix();
    s.bias = -.0004; s.normalBias = .04;
    scene.add(this.sun, this.sun.target);
    this.sun.target.position.set(0, 0, 4);

    this.hemi = new THREE.HemisphereLight(0xdfe6ff, 0x4a3f38, .5);
    scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0xb9c3d6, .0024);
    this.sunDir = new THREE.Vector3();
    this.focusPoint = new THREE.Vector3(0, 0, 4);
    this.focusRadius = 60;
  }

  async load() {
    const entries = await Promise.all(Object.entries(HDRI).map(async ([k, path]) => {
      const tex = await this.assets.hdr(path);
      const rt = this.pmrem.fromEquirectangular(tex);
      tex.dispose();
      return [k, rt];
    }));
    this.maps = Object.fromEntries(entries);
    this.setHour(this.hour);
    return this;
  }

  /* Hora em 0–24. O sol nasce às 6 h a leste (+x), passa à frente do prédio (+z) e se põe às 18 h a oeste. */
  setHour(h) {
    this.hour = ((h % 24) + 24) % 24;
    const t = (this.hour - 6) / 12;                          // 0 nascer, 1 pôr (fora disso, abaixo do horizonte)
    const elev = 64 * DEG * Math.sin(Math.PI * t);
    const az = THREE.MathUtils.lerp(75, -75, THREE.MathUtils.clamp(t, -.2, 1.2)) * DEG;
    this.sunDir.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).normalize();
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);

    const elevDeg = elev / DEG;
    const day = smooth(-4, 14, elevDeg);                    // 0 noite … 1 sol alto
    const golden = smooth(-4, 3, elevDeg) * (1 - smooth(8, 24, elevDeg));
    this.night = 1 - smooth(-6, 6, elevDeg);
    this.golden = golden;

    // à noite a luz direcional vira a lua: fria, fraca e alta
    const sunColor = new THREE.Color(0xfff3e2).lerp(new THREE.Color(0xffa25a), golden);
    if (this.night > .5) {
      this.sun.position.set(-30, 80, 50).add(this.sun.target.position);
      this.sun.color.set(0x8fa2d8);
      this.sun.intensity = .35;
    } else {
      this.sun.position.copy(this.sunDir).multiplyScalar(100 + this.focusRadius).add(this.sun.target.position);
      this.sun.color.copy(sunColor);
      this.sun.intensity = .4 + 3.4 * day;
    }
    this.hemi.intensity = .3 - .1 * day;           // preenchimento: o sol domina de dia, a lua e o céu à noite
    this.hemi.color.set(0xdfe6ff).lerp(new THREE.Color(0x5a6aa8), this.night);
    this.hemi.groundColor.set(0x4a3f38).lerp(new THREE.Color(0x120e16), this.night);

    const period = this.night > .6 ? 'night' : golden > .35 ? 'dusk' : 'day';
    const rt = this.maps[period === 'night' ? 'day' : period];
    if (rt) this.scene.environment = rt.texture;
    this.scene.environmentIntensity = period === 'night' ? .08 : .3 + .18 * day;     // o HDRI ensolarado não projeta sombra: pouco, para não apagá-las
    // o Sky (Preetham) fica preto com o sol baixo: à noite a cúpula com estrelas e lua cobre o céu
    this.sky.visible = this.night < .97;
    this.scene.background = NIGHT_SKY;
    this.nightSky.set(smooth(.25, .9, this.night));

    // névoa da cor do horizonte; à noite fica mais rala para as luzes da cidade aparecerem ao longe
    const fog = new THREE.Color(0xc4cfdf).lerp(new THREE.Color(0xd9a07a), golden * .6).lerp(new THREE.Color(0x0d1630), this.night);
    this.scene.fog.color.copy(fog);
    this.scene.fog.density = .0024 - .0008 * this.night;
    this.renderer.toneMappingExposure = .85 + .35 * this.night;
    return this.night;
  }

  /* Encaixa a câmera de sombra na área vista: vistas próximas ganham sombras mais nítidas (mesmo mapa, área menor) */
  focus(point, radius) {
    this.focusPoint.copy(point); this.focusRadius = THREE.MathUtils.clamp(radius, 18, 75);
    const r = this.focusRadius, cam = this.sun.shadow.camera;
    Object.assign(cam, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 140 + r * 2 });
    cam.updateProjectionMatrix();
    this.sun.shadow.normalBias = .015 + r * .0005;
    this.sun.target.position.copy(point).setY(0);
    this.setHour(this.hour);
  }

  update(dt, camera) { this.nightSky.update(dt, camera); }

  dispose() {
    this.nightSky.dispose();
    for (const rt of Object.values(this.maps)) rt.dispose();
    this.pmrem.dispose();
    this.sky.geometry.dispose(); this.sky.material.dispose();
  }
}
