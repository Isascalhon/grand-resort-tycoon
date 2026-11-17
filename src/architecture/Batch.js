/* Lote de geometria estática: junta tudo o que usa o mesmo material numa única malha (uma draw call por material).
   As UVs são reprojetadas em metros do mundo (projeção pelo eixo dominante da normal), então a repetição das
   texturas PBR é a mesma em qualquer peça, sem esticar em paredes grandes. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export function worldUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

function normalize(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.clearGroups();
  return g;
}

/* Junta várias peças (já posicionadas) numa geometria só, mantendo as UVs originais: módulos instanciados */
export function mergeParts(geos) {
  const list = geos.map(normalize);
  geos.forEach(g => g.dispose());
  const merged = mergeGeometries(list, false);
  list.forEach(g => g.dispose());
  return merged;
}

export class Batch {
  constructor() { this.parts = new Map(); }

  /* Acrescenta uma cópia transformada. projectUV=false mantém as UVs originais (letreiros, tubos). */
  add(geometry, material, matrix, { projectUV = true } = {}) {
    const g = normalize(geometry);
    if (matrix) g.applyMatrix4(matrix);
    if (projectUV || !g.attributes.uv) worldUV(g);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }

  /* Caixa de largura w (x), altura h (y) e profundidade d (z) com a BASE em (x, y, z) */
  box(material, w, h, d, x, y, z, ry = 0) {
    _e.set(0, ry, 0); _q.setFromEuler(_e);
    _m.compose(_v.set(x, y + h / 2, z), _q, _s);
    return this.add(new THREE.BoxGeometry(w, h, d), material, _m);
  }

  /* Caixa entre dois cantos (mínimo e máximo), prática para paredes e lajes */
  span(material, x0, y0, z0, x1, y1, z1) {
    return this.box(material, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2);
  }

  build(group, { castShadow = true, receiveShadow = true, name = 'lote' } = {}) {
    for (const [material, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = `${name}:${material.name}`;
      mesh.castShadow = castShadow && !material.transparent;
      mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

/* Coleção de instâncias de um mesmo módulo (janela, poste, lâmpada) montada no fim como InstancedMesh por peça */
export class InstanceSet {
  constructor(parts) { this.parts = parts; this.matrices = []; this.colors = []; }

  add(x, y, z, ry = 0, color = null, scale = 1) {
    _e.set(0, ry, 0); _q.setFromEuler(_e);
    this.matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(scale, scale, scale)));
    this.colors.push(color);
    return this;
  }

  build(group, { castShadow = true, name = 'instancias' } = {}) {
    if (!this.matrices.length) return group;
    for (const { geometry, material, colored = false, shadow = true } of this.parts) {
      const mesh = new THREE.InstancedMesh(geometry, material, this.matrices.length);
      mesh.name = `${name}:${material.name}`;
      this.matrices.forEach((m, i) => {
        mesh.setMatrixAt(i, m);
        if (colored) mesh.setColorAt(i, this.colors[i] ?? new THREE.Color(1, 1, 1));
      });
      mesh.castShadow = castShadow && shadow && !material.transparent;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}
