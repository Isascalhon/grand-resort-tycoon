/* Gerador de árvores do Grand Resort.
   O crescimento dos galhos adapta o algoritmo do ez-tree (MIT, © 2024 Daniel Greenheck —
   https://github.com/dgreenheck/ez-tree): seções com perturbação ("gnarliness"), torção, força de crescimento,
   filhos distribuídos radialmente ao longo do pai e folhas em cartões duplos nos últimos galhos.
   Diferenças: saída em geometrias prontas para InstancedMesh, dois níveis de detalhe, atributo de vento
   (rigidez cresce do tronco às pontas) e nenhuma textura externa (folhas pintadas em canvas). */
import * as THREE from 'three';
import { Random } from '../core/Random.js';

const UP = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);

/* Espécies usadas no entorno. Comprimentos e raios em metros; índices = nível do galho (0 = tronco). */
export const SPECIES = {
  oak: {
    levels: 3, length: [7, 4.6, 2.4, 1], radius: [.42, .62, .7, .7], sections: [9, 6, 4, 3], segments: [9, 6, 4, 3],
    children: [7, 5, 4], angle: [0, 58, 55, 50], start: [0, .38, .3, .2], taper: [.7, .7, .7, .7],
    gnarliness: [.1, .18, .24, .1], twist: [.04, .1, .1, 0], force: .012,
    leaves: { count: 6, size: 1.15, start: .1, angle: 40 }, tint: [0x5e8a3a, 0x6f9a42, 0x4f7d34],
  },
  maple: {
    levels: 3, length: [6, 3.6, 2, .9], radius: [.32, .6, .7, .7], sections: [8, 6, 4, 3], segments: [8, 6, 4, 3],
    children: [6, 5, 4], angle: [0, 42, 50, 50], start: [0, .45, .3, .2], taper: [.7, .7, .7, .7],
    gnarliness: [.08, .14, .2, .1], twist: [.08, .1, .1, 0], force: .02,
    leaves: { count: 6, size: .95, start: .15, angle: 45 }, tint: [0x7a9b3c, 0x9aa83e, 0x6e8f36],
  },
  cypress: {
    levels: 2, length: [9, 2.2, .9], radius: [.28, .5, .6], sections: [10, 4, 3], segments: [7, 4, 3],
    children: [26, 4], angle: [0, 28, 35], start: [0, .12, .2], taper: [.9, .8, .8],
    gnarliness: [.04, .1, .1], twist: [.3, .1, 0], force: .03,
    leaves: { count: 7, size: .8, start: .05, angle: 30 }, tint: [0x355e33, 0x2f5530, 0x3d6a3a],
  },
};

/* ---------- textura das folhas (canvas): ramalhete de folhas elípticas com nervura ---------- */
const leafTextures = new Map();
export function leafTexture(kind = 'broad') {
  if (leafTextures.has(kind)) return leafTextures.get(kind);
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), rng = new Random(kind === 'broad' ? 11 : 23);
  const leaves = kind === 'needle' ? 34 : 13;
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + rng.range(-1.1, 1.1), r = rng.range(.12, .36) * S;
    const x = S / 2 + Math.cos(a) * r * .8, y = S * .92 + Math.sin(a) * r * 2.1;
    const len = kind === 'needle' ? rng.range(.16, .26) * S : rng.range(.17, .24) * S, wid = kind === 'needle' ? len * .14 : len * .45;
    const l = rng.range(.78, 1.08);
    g.save();
    g.translate(x, y); g.rotate(a + Math.PI / 2 + rng.range(-.35, .35));
    const grad = g.createLinearGradient(-wid, 0, wid, 0);
    grad.addColorStop(0, `rgb(${Math.round(150 * l)},${Math.round(190 * l)},${Math.round(110 * l)})`);
    grad.addColorStop(.5, `rgb(${Math.round(205 * l)},${Math.round(235 * l)},${Math.round(160 * l)})`);
    grad.addColorStop(1, `rgb(${Math.round(135 * l)},${Math.round(175 * l)},${Math.round(100 * l)})`);
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(0, -len / 2, wid / 2, len / 2, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(80,110,60,.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * .95); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  leafTextures.set(kind, t);
  return t;
}

/* ---------- vento: deslocamento no vértice, compatível com instâncias ---------- */
export const wind = { uTime: { value: 0 }, uStrength: { value: .35 } };

/* Injeta balanço no vertex shader. O atributo "sway" (0 no pé do tronco, 1 nas pontas) controla a amplitude;
   a fase vem da posição da instância, então árvores vizinhas não balançam em uníssono. */
export function addWind(material, { leafFlutter = 0 } = {}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uStrength = wind.uStrength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float sway;
        uniform float uTime, uStrength;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 base = vec3(0.0);
        #ifdef USE_INSTANCING
          base = instanceMatrix[3].xyz;
        #endif
        float ph = dot(base, vec3(.37, 0., .21));
        float gust = .6 + .4 * sin(uTime * .35 + ph * .2);
        float s = sway * sway * uStrength * gust;
        transformed.x += s * (sin(uTime * 1.3 + ph) * .6 + sin(uTime * 2.7 + ph * 1.7) * .25);
        transformed.z += s * (cos(uTime * 1.1 + ph * 1.3) * .45);
        ${leafFlutter ? `transformed.y += sway * ${leafFlutter.toFixed(3)} * sin(uTime * 7.0 + position.x * 3.0 + position.z * 2.0 + ph);` : ''}`);
  };
  material.customProgramCacheKey = () => `vento:${leafFlutter}`;
  return material;
}

/* ---------- gerador ---------- */
export function generateTree(species, seed = 1, { detail = 1 } = {}) {
  const sp = typeof species === 'string' ? SPECIES[species] : species;
  const rng = new Random(seed);
  const branches = { pos: [], nrm: [], uv: [], sway: [], idx: [] };
  const leaves = { pos: [], nrm: [], uv: [], sway: [], idx: [] };
  const totalHeight = sp.length[0];
  const queue = [{ origin: new THREE.Vector3(), orient: new THREE.Euler(), length: sp.length[0], radius: sp.radius[0], level: 0, v0: 0 }];
  const segOf = level => Math.max(3, Math.round(sp.segments[level] * (detail < 1 ? .6 : 1)));
  const secOf = level => Math.max(2, Math.round(sp.sections[level] * (detail < 1 ? .6 : 1)));
  const leafCount = Math.max(2, Math.round(sp.leaves.count * (detail < 1 ? .55 : 1)));

  const swayAt = (p, level) => Math.min(1, (p.y / totalHeight) * .7 + level * .18);

  while (queue.length) {
    const br = queue.shift();
    const sections = [], seg = segOf(br.level), secs = secOf(br.level);
    const indexOffset = branches.pos.length / 3;
    const orient = br.orient.clone(), origin = br.origin.clone();
    const secLen = br.length / secs;
    let v = br.v0;
    for (let i = 0; i <= secs; i++) {
      let r = br.radius * (1 - sp.taper[br.level] * (i / secs));
      if (i === secs && br.level === sp.levels) r = .002;
      for (let j = 0; j <= seg; j++) {
        const a = (2 * Math.PI * j) / seg;
        const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).applyEuler(orient);
        const p = n.clone().multiplyScalar(r).add(origin);
        branches.pos.push(p.x, p.y, p.z);
        branches.nrm.push(n.x, n.y, n.z);
        branches.uv.push(j / seg, v);
        branches.sway.push(swayAt(p, br.level));
      }
      sections.push({ origin: origin.clone(), orient: orient.clone(), radius: r });
      origin.add(new THREE.Vector3(0, secLen, 0).applyEuler(orient));
      v += secLen / (2 * Math.PI * Math.max(br.radius, .05)) * .5;

      const gn = Math.max(1, 1 / Math.sqrt(Math.max(r, .01))) * sp.gnarliness[br.level];
      orient.x += rng.range(-gn, gn);
      orient.z += rng.range(-gn, gn);
      const q = new THREE.Quaternion().setFromEuler(orient);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, sp.twist[br.level]));
      q.rotateTowards(new THREE.Quaternion(), sp.force / Math.max(r, .02));
      orient.setFromQuaternion(q);
    }
    const N = seg + 1;
    for (let i = 0; i < secs; i++) {
      for (let j = 0; j < seg; j++) {
        const a = indexOffset + i * N + j, b = a + 1, c = a + N, d = b + N;
        branches.idx.push(a, c, b, b, c, d);
      }
    }

    if (br.level === sp.levels) {
      for (let i = 0; i < leafCount; i++) addLeaf(sections, sp.leaves.start, i / leafCount);
      continue;
    }
    const count = sp.children[br.level], radial = rng.float(), lvl = br.level + 1;
    for (let i = 0; i < count; i++) {
      const t = rng.range(sp.start[lvl], 1);
      const { o, q, r } = sample(sections, t);
      const childQ = new THREE.Quaternion().setFromAxisAngle(UP, 2 * Math.PI * (radial + i / count) + rng.range(-.2, .2))
        .multiply(new THREE.Quaternion().setFromAxisAngle(X, (sp.angle[lvl] + rng.range(-8, 8)) * Math.PI / 180));
      queue.push({
        origin: o, orient: new THREE.Euler().setFromQuaternion(q.multiply(childQ)),
        length: sp.length[lvl] * rng.range(.8, 1.15) * (br.level === 0 ? 1 - t * .45 : 1),
        radius: sp.radius[lvl] * r, level: lvl, v0: 0,
      });
    }
  }

  /* Ponto, orientação e raio a uma fração t do galho */
  function sample(sections, t) {
    const f = t * (sections.length - 1), i = Math.min(Math.floor(f), sections.length - 2), a = f - i;
    const A = sections[i], B = sections[i + 1];
    const qa = new THREE.Quaternion().setFromEuler(A.orient), qb = new THREE.Quaternion().setFromEuler(B.orient);
    return { o: A.origin.clone().lerp(B.origin, a), q: qa.slerp(qb, a), r: A.radius * (1 - a) + B.radius * a };
  }

  function addLeaf(sections, start, frac) {
    const { o, q } = sample(sections, rng.range(start, 1));
    const size = sp.leaves.size * rng.range(.75, 1.25);
    const lq = q.clone()
      .multiply(new THREE.Quaternion().setFromAxisAngle(UP, 2 * Math.PI * frac + rng.range(0, 1)))
      .multiply(new THREE.Quaternion().setFromAxisAngle(X, sp.leaves.angle * Math.PI / 180));
    for (const rot of [0, Math.PI / 2]) {
      const base = leaves.pos.length / 3;
      const rq = lq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, rot));
      const corners = [[-.5, 1], [-.5, 0], [.5, 0], [.5, 1]];
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(rq);
      for (const [cx, cy] of corners) {
        const p = new THREE.Vector3(cx * size, cy * size, 0).applyQuaternion(rq).add(o);
        leaves.pos.push(p.x, p.y, p.z);
        // normais "infladas" para fora da copa: iluminação suave, sem cartões chapados
        const out = p.clone().sub(new THREE.Vector3(0, totalHeight * .75, 0)).normalize().lerp(n, .3).normalize();
        leaves.nrm.push(out.x, out.y, out.z);
        leaves.sway.push(Math.min(1, swayAt(p, sp.levels) + .15));
      }
      leaves.uv.push(0, 1, 0, 0, 1, 0, 1, 1);
      leaves.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  return { branches: toGeometry(branches), leaves: toGeometry(leaves), height: totalHeight };
}

export function toGeometry(d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
  g.setAttribute('sway', new THREE.Float32BufferAttribute(d.sway, 1));
  g.setIndex(d.idx);
  g.computeBoundingSphere();
  return g;
}
