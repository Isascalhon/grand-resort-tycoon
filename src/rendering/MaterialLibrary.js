/* Biblioteca de materiais do Grand Resort. Os PBR vêm das texturas Poly Haven (diff = cor, nor = normal OpenGL,
   arm = AO/rugosidade/metal nos canais R/G/B) servidas por AssetManager; os demais são procedurais.
   Materiais que brilham à noite são registrados com a intensidade máxima e acompanham setNight(0…1). */
import * as THREE from 'three';

const BRAND = {
  lilac: 0xbcaee0, lilacDeep: 0x9c8cc8, violet: 0x4b2a6b, violetDeep: 0x2f1a45,
  gold: 0xd8a64a, goldLight: 0xf0cf7e, ruby: 0xb0182f, cream: 0xf3ead9, bronze: 0x8a6237,
};

export class MaterialLibrary {
  constructor(assets) {
    this.assets = assets;
    this.cache = new Map();
    this.glow = [];            // { mat, prop, max } — acompanham a noite
    this.night = 0;
  }

  /* Material PBR a partir de uma pasta de public/res/tex. repeat em metros por repetição já resolvido por quem chama. */
  pbr(slug, { repeat = 1, color = 0xffffff, roughness = 1, metalness = 0, normalScale = 1, key = '' } = {}) {
    const id = `pbr:${slug}:${repeat}:${color}:${roughness}:${metalness}:${normalScale}:${key}`;
    if (this.cache.has(id)) return this.cache.get(id);
    const a = this.assets, base = `tex/${slug}`;
    const r = Array.isArray(repeat) ? repeat : [repeat, repeat];
    const arm = a.repeated(a.texture(`${base}/arm.jpg`), ...r);
    const mat = new THREE.MeshStandardMaterial({
      color, roughness, metalness,
      map: a.repeated(a.texture(`${base}/diff.jpg`, { color: true }), ...r),
      normalMap: a.repeated(a.texture(`${base}/nor.jpg`), ...r),
      normalScale: new THREE.Vector2(normalScale, normalScale),
      aoMap: arm, roughnessMap: arm, metalnessMap: metalness > 0 ? arm : null,
    });
    mat.name = slug;
    this.cache.set(id, mat);
    return mat;
  }

  get(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const mat = this.#make(name);
    mat.name = name;
    this.cache.set(name, mat);
    return mat;
  }

  #make(name) {
    switch (name) {
      // fachada
      case 'lilacStucco': return this.pbr('white_stucco', { repeat: .25, color: BRAND.lilac, roughness: .9, key: 'lilac' });
      case 'lilacTrim': return new THREE.MeshStandardMaterial({ color: BRAND.lilacDeep, roughness: .7 });
      case 'violetStucco': return this.pbr('white_stucco', { repeat: .25, color: 0x6a4a8e, roughness: .85, key: 'violet' });
      case 'creamStone': return new THREE.MeshStandardMaterial({ color: BRAND.cream, roughness: .55 });
      case 'marble': return this.pbr('marble_01', { repeat: .35, roughness: .35, key: 'marble' });
      case 'terrazzo': return this.pbr('terrazzo_tiles', { repeat: .2, roughness: .5 });
      case 'gold': return new THREE.MeshPhysicalMaterial({ color: BRAND.gold, metalness: 1, roughness: .22, clearcoat: .4 });
      case 'goldGlow': return this.#glowing(new THREE.MeshStandardMaterial({ color: BRAND.gold, metalness: .9, roughness: .25, emissive: BRAND.goldLight }), 'emissiveIntensity', 1.3, .04);
      case 'bronze': return new THREE.MeshPhysicalMaterial({ color: BRAND.bronze, metalness: 1, roughness: .35, anisotropy: .7 });
      case 'brushedSteel': return new THREE.MeshPhysicalMaterial({ color: 0xc9c6cf, metalness: 1, roughness: .3, anisotropy: .9 });
      case 'ruby': return new THREE.MeshPhysicalMaterial({ color: BRAND.ruby, roughness: .35, clearcoat: .8, clearcoatRoughness: .15 });
      case 'roof': return new THREE.MeshStandardMaterial({ color: 0x3b2f4e, metalness: .55, roughness: .45 });
      case 'rubyCarpet': return new THREE.MeshStandardMaterial({ color: 0x8e1427, roughness: .95 });
      case 'darkMetal': return new THREE.MeshStandardMaterial({ color: 0x24202a, metalness: .8, roughness: .4 });
      // vidros
      case 'windowGlass': return new THREE.MeshPhysicalMaterial({
        color: 0x5d5578, metalness: .1, roughness: .04, transparent: true, opacity: .42, envMapIntensity: 1.6, depthWrite: false,
      });
      case 'clearGlass': return new THREE.MeshPhysicalMaterial({
        color: 0xdfe8f0, metalness: 0, roughness: .03, transparent: true, opacity: .22, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false,
      });
      case 'roomLight': return this.#glowing(new THREE.MeshBasicMaterial({ color: 0xffffff }), 'colorScale', 1, .1);
      case 'warmGlow': return this.#glowing(new THREE.MeshBasicMaterial({ color: 0xffd9a8 }), 'colorScale', 1.15, .18);
      // luzes
      case 'lamp': return this.#glowing(new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, roughness: .3 }), 'emissiveIntensity', 3.2, .3);
      case 'tailLight': return this.#glowing(new THREE.MeshStandardMaterial({ color: 0x5a0a10, emissive: 0xff2a2a, roughness: .3 }), 'emissiveIntensity', 2.6, .15);
      case 'carPaint': return new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .5, roughness: .32, clearcoat: 1, clearcoatRoughness: .06 });
      case 'carGlass': return new THREE.MeshPhysicalMaterial({ color: 0x14161c, metalness: .2, roughness: .05, envMapIntensity: 1.4 });
      case 'rubber': return new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .9 });
      case 'chrome': return new THREE.MeshStandardMaterial({ color: 0xe8e8ec, metalness: 1, roughness: .12 });
      case 'lampCool': return this.#glowing(new THREE.MeshStandardMaterial({ color: 0xf4f1ff, emissive: 0xfff4e6, roughness: .3 }), 'emissiveIntensity', 3, .15);
      case 'lightPool': return this.#glowing(new THREE.MeshBasicMaterial({
        map: radialTexture(), color: 0xffd7a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        polygonOffset: true, polygonOffsetFactor: -2, fog: false,
      }), 'opacity', .55, 0);
      // chão e entorno
      case 'pavers': return this.pbr('concrete_pavers', { repeat: .3, roughness: 1 });
      case 'plazaTiles': return this.pbr('large_grey_tiles', { repeat: .2, color: 0xe9e2d6, roughness: .8 });
      case 'concrete': return this.pbr('concrete_floor_02', { repeat: .15 });
      case 'asphalt': return this.pbr('asphalt_02', { repeat: .12 });
      case 'grass': return this.pbr('leafy_grass', { repeat: .3, color: 0x9cc77a });
      case 'soil': return new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 1 });
      case 'paint': return new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: .7 });
      case 'paintYellow': return new THREE.MeshStandardMaterial({ color: 0xe8b937, roughness: .7 });
      case 'water': return new THREE.MeshPhysicalMaterial({ color: 0x3fa3b8, roughness: .05, transmission: 0, metalness: .1, clearcoat: 1 });
      default: throw new Error(`material desconhecido: ${name}`);
    }
  }

  /* Registra um material cuja luz depende da hora. floor = fração da intensidade que sobra de dia. */
  #glowing(mat, prop, max, floor = 0) {
    this.glow.push({ mat, prop, max, floor, base: mat.color.clone() });
    this.#applyGlow(this.glow.at(-1));
    return mat;
  }

  #applyGlow(g) {
    const k = g.max * (g.floor + (1 - g.floor) * this.night);
    if (g.prop === 'colorScale') g.mat.color.copy(g.base).multiplyScalar(k); else g.mat[g.prop] = k;
  }

  setNight(n) {
    this.night = THREE.MathUtils.clamp(n, 0, 1);
    for (const g of this.glow) this.#applyGlow(g);
  }

  dispose() {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
    this.glow = [];
  }
}

/* Mancha radial suave (centro claro, borda transparente) para as poças de luz no chão */
function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(.35, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export { BRAND };
