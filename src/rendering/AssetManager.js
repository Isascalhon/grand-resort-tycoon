/* Carregamento e cache de recursos (texturas PBR, HDRIs, fontes 3D) servidos de public/res.
   Cada arquivo é baixado uma vez; repetições de UV usam clones, que compartilham a imagem na GPU. */
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export const resUrl = path => new URL(`res/${path}`, document.baseURI).href;

export class AssetManager {
  constructor(renderer, quality) {
    this.renderer = renderer;
    this.anisotropy = Math.min(quality.anisotropy, renderer.capabilities.getMaxAnisotropy());
    this.manager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.manager);
    this.hdrLoader = new HDRLoader(this.manager);
    this.fontLoader = new FontLoader(this.manager);
    this.textures = new Map();
    this.fonts = new Map();
    this.owned = new Set();      // tudo o que este gerenciador criou e deve liberar no fim
  }

  /* Textura base (sem repetição). color=true para mapas de cor (sRGB); dados (normal, rugosidade) ficam lineares. */
  texture(path, { color = false } = {}) {
    const key = `${path}|${color}`;
    let t = this.textures.get(key);
    if (!t) {
      t = this.textureLoader.load(resUrl(path));
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.anisotropy;
      this.textures.set(key, t);
      this.owned.add(t);
    }
    return t;
  }

  /* Variação com repetição própria: clona os parâmetros, mas a imagem na GPU é a mesma */
  repeated(base, rx, ry = rx) {
    const t = base.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    this.owned.add(t);
    return t;
  }

  async hdr(path) {
    const tex = await this.hdrLoader.loadAsync(resUrl(path));
    tex.mapping = THREE.EquirectangularReflectionMapping;
    this.owned.add(tex);
    return tex;
  }

  async font(path) {
    if (!this.fonts.has(path)) this.fonts.set(path, this.fontLoader.loadAsync(resUrl(path)));
    return this.fonts.get(path);
  }

  dispose() {
    for (const r of this.owned) r.dispose?.();
    this.owned.clear();
    this.textures.clear();
    this.fonts.clear();
  }
}
