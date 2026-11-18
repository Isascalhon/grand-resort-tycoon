/* Palmeiras e arbustos procedurais. Palmeira: tronco curvo com anéis (textura palm_bark) e folhas pinadas em
   faixas que arqueiam e caem; a textura das folhas é pintada em canvas (folíolos com alfa). Arbusto: cartões de
   folha espalhados num elipsoide, com normais para fora para a copa ler como volume. */
import * as THREE from 'three';
import { Random } from '../core/Random.js';
import { toGeometry } from './TreeGenerator.js';

/* Folha de palmeira: ráquis central e folíolos inclinados dos dois lados */
let frondTex = null;
export function frondTexture() {
  if (frondTex) return frondTex;
  const W = 128, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d'), rng = new Random(7);
  for (let y = 18; y < H - 8; y += 7) {
    const t = y / H, len = (W / 2 - 4) * Math.sin(Math.PI * Math.min(1, t * 1.15)) * rng.range(.85, 1);
    for (const s of [-1, 1]) {
      const l = rng.range(.8, 1.05);
      g.strokeStyle = `rgb(${Math.round(120 * l)},${Math.round(170 * l)},${Math.round(80 * l)})`;
      g.lineWidth = rng.range(3, 4.5);
      g.beginPath(); g.moveTo(W / 2, y); g.quadraticCurveTo(W / 2 + s * len * .5, y + 6, W / 2 + s * len, y + 22); g.stroke();
    }
  }
  g.strokeStyle = 'rgb(140,150,80)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
  frondTex = new THREE.CanvasTexture(c);
  frondTex.colorSpace = THREE.SRGBColorSpace;
  return frondTex;
}

export function generatePalm(seed = 1, { detail = 1 } = {}) {
  const rng = new Random(seed);
  const height = rng.range(7.5, 10.5), lean = rng.range(.6, 1.6), leanDir = rng.range(0, Math.PI * 2);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.cos(leanDir) * lean * .2, height * .55, Math.sin(leanDir) * lean * .2),
    new THREE.Vector3(Math.cos(leanDir) * lean, height, Math.sin(leanDir) * lean),
  );
  const trunk = { pos: [], nrm: [], uv: [], sway: [], idx: [] };
  const rings = detail < 1 ? 10 : 22, seg = detail < 1 ? 6 : 10;
  const frames = curve.computeFrenetFrames(rings, false);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, p = curve.getPointAt(t);
    const r = .3 * (1 - .32 * t) * (1 + .06 * Math.cos(i * Math.PI)) + (i === 0 ? .1 : 0);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      // N→B gira no sentido oposto ao das árvores: sinal negativo mantém a mesma ordem dos triângulos (face para fora)
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(-Math.sin(a)));
      const v = p.clone().addScaledVector(n, r);
      trunk.pos.push(v.x, v.y, v.z); trunk.nrm.push(n.x, n.y, n.z);
      trunk.uv.push(j / seg, t * height / 1.2);
      trunk.sway.push(t * t * .55);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
    trunk.idx.push(a, c, b, b, c, d);
  }

  // copa: de 10 a 13 folhas em faixas subdivididas que sobem e caem
  const fronds = { pos: [], nrm: [], uv: [], sway: [], idx: [] };
  const crown = curve.getPointAt(1), count = rng.int(10, 13), steps = detail < 1 ? 5 : 9;
  for (let k = 0; k < count; k++) {
    const az = (k / count) * Math.PI * 2 + rng.range(-.15, .15), len = rng.range(3.2, 4.4);
    const rise = rng.range(.35, .9), droop = rng.range(.55, .85), wid = rng.range(.9, 1.2);
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), side = new THREE.Vector3(-dir.z, 0, dir.x);
    const base = fronds.pos.length / 3;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps, d = s * len;
      const center = crown.clone().addScaledVector(dir, d * .95).add(new THREE.Vector3(0, d * rise - d * d * droop / len * 1.4, 0));
      const w = wid * Math.sin(Math.PI * Math.min(1, s * 1.1 + .05)) * .5;
      const tilt = new THREE.Vector3(0, -s * .35, 0);         // as bordas caem um pouco: folha em "V"
      for (const sd of [-1, 1]) {
        const v = center.clone().addScaledVector(side, sd * w).add(tilt.clone().multiplyScalar(Math.abs(sd) * w));
        fronds.pos.push(v.x, v.y, v.z);
        const n = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -.3).normalize();
        fronds.nrm.push(n.x, n.y, n.z);
        fronds.uv.push(sd < 0 ? 0 : 1, 1 - s);
        fronds.sway.push(.55 + s * .45);
      }
    }
    for (let i = 0; i < steps; i++) {
      const a = base + i * 2;
      fronds.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  return { trunk: toGeometry(trunk), fronds: toGeometry(fronds), height };
}

/* Arbusto arredondado: raio 1 m, achatado; escalar por instância */
export function generateBush(seed = 1, { detail = 1, cards = 80 } = {}) {
  const rng = new Random(seed);
  const d = { pos: [], nrm: [], uv: [], sway: [], idx: [] };
  const n = Math.round(cards * (detail < 1 ? .5 : 1));
  const UP = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const dir = new THREE.Vector3(rng.range(-1, 1), rng.range(-.2, 1), rng.range(-1, 1)).normalize();
    const p = dir.clone().multiply(new THREE.Vector3(1, .72, 1)).multiplyScalar(rng.range(.45, .95)).add(new THREE.Vector3(0, .62, 0));
    const size = rng.range(.55, .8);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rng.range(0, Math.PI * 2)));
    const base = d.pos.length / 3;
    for (const [cx, cy] of [[-.5, .5], [-.5, -.5], [.5, -.5], [.5, .5]]) {
      const v = new THREE.Vector3(cx * size, cy * size, 0).applyQuaternion(q).add(p);
      d.pos.push(v.x, v.y, v.z);
      const nn = v.clone().sub(new THREE.Vector3(0, .45, 0)).normalize().lerp(UP, .25).normalize();
      d.nrm.push(nn.x, nn.y, nn.z);
      d.sway.push(Math.max(0, v.y) * .25);
    }
    d.uv.push(0, 1, 0, 0, 1, 0, 1, 1);
    d.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return toGeometry(d);
}
