/* Vegetação do entorno: árvores (carvalho, bordo, cipreste), palmeiras e arbustos, todos instanciados com
   dois níveis de detalhe. A cada 0,5 s cada planta vai para o nível alto (perto da câmera) ou baixo (longe);
   o vento é um uniform compartilhado avançado em update(). */
import * as THREE from 'three';
import { Random } from '../core/Random.js';
import { Batch } from '../architecture/Batch.js';
import { PLAN } from '../data/buildings.js';
import { generateTree, leafTexture, addWind, wind } from './TreeGenerator.js';
import { generatePalm, generateBush, frondTexture } from './Palms.js';

const LOD_DISTANCE = 70;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

/* Um modelo (variante de planta) com nível alto e baixo; cada nível tem várias peças (casca, folhas) */
class LodInstances {
  constructor(name, levels, items) {
    this.items = items;                    // { pos: Vector3, ry, scale, color }
    this.group = new THREE.Group();
    this.group.name = name;
    this.levels = levels.map(parts => parts.map(({ geometry, material, colored }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
      mesh.name = `${name}:${material.name}`;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.frustumCulled = false;          // instâncias espalhadas: a esfera da geometria-base não serve
      mesh.userData.colored = colored;
      this.group.add(mesh);
      return mesh;
    }));
    this.assign(null);
  }

  /* Distribui as instâncias entre os níveis pela distância da câmera (sem câmera: tudo no nível alto) */
  assign(cameraPos) {
    const counts = this.levels.map(() => 0);
    for (const it of this.items) {
      const lvl = cameraPos && it.pos.distanceTo(cameraPos) > LOD_DISTANCE ? 1 : 0;
      const k = counts[lvl]++;
      _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, it.ry);
      _m.compose(it.pos, _q, _s.setScalar(it.scale));
      for (const mesh of this.levels[lvl]) {
        mesh.setMatrixAt(k, _m);
        if (mesh.userData.colored) mesh.setColorAt(k, it.color);
      }
    }
    this.levels.forEach((meshes, lvl) => meshes.forEach(mesh => {
      mesh.count = counts[lvl];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }));
    return counts;
  }
}

export function buildVegetation(mats, { seed = 2026 } = {}) {
  const group = new THREE.Group();
  group.name = 'vegetacao';
  const rng = new Random(seed);

  // materiais: casca PBR com vento; folhas com alfa recortado, dupla face e cor por instância.
  // Um emissivo verde bem fraco imita a luz que atravessa a folha: sem ele o verso das palmas fica preto.
  const bark = addWind(mats.pbr('bark_brown_02', { repeat: [2, .5], color: 0xc9b9a8, key: 'arvore' }).clone());
  const pine = addWind(mats.pbr('pine_bark', { repeat: [2, .5], key: 'cipreste' }).clone());
  const palmBark = addWind(mats.pbr('palm_bark', { repeat: [1, .8], key: 'palmeira' }).clone());
  const leafMat = kind => addWind(new THREE.MeshStandardMaterial({
    map: leafTexture(kind), alphaTest: .45, side: THREE.DoubleSide, roughness: .75, emissive: 0x16240d,
  }), { leafFlutter: .04 });
  const broad = leafMat('broad'); broad.name = 'folhas';
  const needle = leafMat('needle'); needle.name = 'folhas-agulha';
  const frond = addWind(new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: .4, side: THREE.DoubleSide, roughness: .7, emissive: 0x1e3010 }), { leafFlutter: .06 });
  frond.name = 'palma';
  const bushMat = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('broad'), alphaTest: .45, side: THREE.DoubleSide, roughness: .8, emissive: 0x16240d }));
  bushMat.name = 'arbusto';
  bark.name = 'casca'; pine.name = 'casca-pinho'; palmBark.name = 'casca-palmeira';
  const owned = [bark, pine, palmBark, broad, needle, frond, bushMat];

  const sets = [];
  const tint = (hex, j = .12) => new THREE.Color(hex).offsetHSL(rng.range(-.02, .02), rng.range(-j, j) * .5, rng.range(-j, j));
  const item = (x, z, scale, color) => ({ pos: new THREE.Vector3(x, 0, z), ry: rng.range(0, Math.PI * 2), scale, color });

  /* ---------- posições ---------- */
  const { plaza, avenue } = PLAN;
  const plots = { oak: [], maple: [], cypress: [], palm: [], bush: [] };
  // palmeiras em duas fileiras ladeando a fonte e nos cantos da praça
  for (const x of [-12, 12]) for (const z of [6, 14, 22]) plots.palm.push(item(x + rng.range(-.4, .4), z, rng.range(.9, 1.1)));
  for (const x of [-31, 31]) for (const z of [-4, 10]) plots.palm.push(item(x, z, rng.range(.95, 1.15)));
  // ciprestes em pares marcando as entradas laterais da praça
  for (const x of [-37, 37]) for (const z of [20, 25, -12, -18]) plots.cypress.push(item(x, z, rng.range(.85, 1.05), tint(0x2f5530)));
  // árvores de rua na calçada oposta, entre os postes
  for (let x = -102; x <= 102; x += 16) {
    if (Math.abs(x + 6) < 14) continue;                                    // vista livre do hotel a partir da calçada oposta
    plots[rng.chance(.5) ? 'oak' : 'maple'].push(item(x + 6, avenue.z1 + 2.6, rng.range(.75, .9), null));
  }
  // parque: laterais e fundos do terreno, sem invadir a praça e o prédio
  let tries = 0;
  while (plots.oak.length + plots.maple.length < 64 && tries++ < 2000) {
    const x = rng.range(-110, 110), z = rng.range(-95, 22);
    if (x > plaza.x0 - 6 && x < plaza.x1 + 6 && z > -32) continue;          // praça e prédio
    const all = [...plots.oak, ...plots.maple, ...plots.cypress];
    if (all.some(t => (t.pos.x - x) ** 2 + (t.pos.z - z) ** 2 < 64)) continue;
    plots[rng.chance(.55) ? 'oak' : 'maple'].push(item(x, z, rng.range(.8, 1.2), null));
  }
  plots.oak.forEach(t => { t.color = tint(0x5e8a3a); });
  plots.maple.forEach(t => { t.color = tint(rng.chance(.25) ? 0xb59a3c : 0x7a9b3c); });
  // arbustos ao redor da fonte e nos canteiros diante das torres
  for (let i = 0; i < 8; i++) {
    const a = (i + .5) / 8 * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < .3 && Math.cos(a) < 0) continue;               // deixa o lado do tapete livre
    plots.bush.push(item(Math.sin(a) * 6.4, 17 + Math.cos(a) * 6.4, rng.range(.7, .85), tint(0x6a9a46)));
  }
  const planters = new Batch();
  for (const [x0, x1] of [[-23.2, -9], [9, 23.2]]) {
    planters.span(mats.get('marble'), x0, 0, .5, x1, .55, 1.5);
    planters.span(mats.get('soil'), x0 + .1, .55, .6, x1 - .1, .58, 1.4);
    for (let x = x0 + .5; x < x1 - .3; x += .75) plots.bush.push(item(x, 1, rng.range(.55, .65), tint(0x6a9a46)));
  }
  for (const b of plots.bush) if (b.pos.z < 2) b.pos.y = .5;
  planters.build(group, { name: 'canteiros' });

  /* ---------- modelos ---------- */
  const treeSet = (species, barkMat, leaves, list, variants = 2) => {
    for (let v = 0; v < variants; v++) {
      const items = list.filter((_, i) => i % variants === v);
      if (!items.length) continue;
      const hi = generateTree(species, 100 + v * 17 + species.length), lo = generateTree(species, 100 + v * 17 + species.length, { detail: .5 });
      sets.push(new LodInstances(`${species}-${v}`, [
        [{ geometry: hi.branches, material: barkMat }, { geometry: hi.leaves, material: leaves, colored: true }],
        [{ geometry: lo.branches, material: barkMat }, { geometry: lo.leaves, material: leaves, colored: true }],
      ], items));
    }
  };
  treeSet('oak', bark, broad, plots.oak);
  treeSet('maple', bark, broad, plots.maple);
  treeSet('cypress', pine, needle, plots.cypress);
  for (let v = 0; v < 2; v++) {
    const items = plots.palm.filter((_, i) => i % 2 === v);
    const hi = generatePalm(40 + v), lo = generatePalm(40 + v, { detail: .5 });
    items.forEach(t => { t.color = tint(0x8fb35a, .08); });
    sets.push(new LodInstances(`palmeira-${v}`, [
      [{ geometry: hi.trunk, material: palmBark }, { geometry: hi.fronds, material: frond, colored: true }],
      [{ geometry: lo.trunk, material: palmBark }, { geometry: lo.fronds, material: frond, colored: true }],
    ], items));
  }
  sets.push(new LodInstances('arbustos', [
    [{ geometry: generateBush(5), material: bushMat, colored: true }],
    [{ geometry: generateBush(5, { detail: .5 }), material: bushMat, colored: true }],
  ], plots.bush));
  for (const s of sets) group.add(s.group);

  let lodClock = 0, time = 0;
  const count = Object.fromEntries(Object.entries(plots).map(([k, v]) => [k, v.length]));
  return {
    group,
    info: { plants: Object.values(count).reduce((a, b) => a + b, 0), ...count },
    /* Nível alto/baixo atual (soma de instâncias por nível), útil nos testes */
    lodCounts(cameraPos) {
      const total = [0, 0];
      for (const s of sets) s.assign(cameraPos).forEach((n, i) => { total[i] += n; });
      return total;
    },
    update(dt, camera, { force = false } = {}) {
      time += dt;
      wind.uTime.value = time;
      lodClock += dt;
      if (camera && (force || lodClock > .5)) { lodClock = 0; for (const s of sets) s.assign(camera.position); }
    },
    dispose() {
      group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      owned.forEach(m => m.dispose());
    },
  };
}
