/* Trânsito da avenida: carros procedurais (sedã, táxi, SUV, van, esportivo e ônibus) instanciados por tipo.
   Cada tipo é montado com perfis extrudados (lataria até a linha de cintura, estufa de vidro, teto), rodas com
   calota cromada e faróis/lanternas que acendem com a noite. Os carros seguem as 4 faixas, respeitando a
   distância do carro da frente; com dt = 0 (modo de teste) ficam parados nas posições sorteadas pela semente. */
import * as THREE from 'three';
import { Random } from '../core/Random.js';
import { mergeParts } from '../architecture/Batch.js';
import { PLAN } from '../data/buildings.js';

const ROAD_END = 220;
const PAINTS = [0xf2f2f2, 0x1c1c22, 0x8a8f99, 0x6b0f1a, 0x1d3a6b, 0x2f4a3a, 0xc9c2b3, 0x4b2a6b];

/* L comprimento, W largura, belt altura da cintura, clear vão livre, cabin [traseira, frente, recuo do teto atrás, à frente], roof altura do teto */
export const CAR_TYPES = {
  sedan: { L: 4.7, W: 1.82, clear: .3, belt: .98, cabin: [-1.55, 1.15, .55, .7], roof: 1.46, wheel: .34, speed: [11, 15] },
  taxi: { L: 4.6, W: 1.8, clear: .3, belt: .98, cabin: [-1.5, 1.1, .5, .65], roof: 1.48, wheel: .34, speed: [11, 14], paint: 0xf2c218, sign: true },
  suv: { L: 4.9, W: 1.95, clear: .42, belt: 1.18, cabin: [-2.2, 1.15, .1, .55], roof: 1.8, wheel: .4, speed: [10, 14] },
  van: { L: 5.3, W: 2, clear: .38, belt: 1.15, cabin: [-2.55, 1.6, .05, .5], roof: 2.25, wheel: .38, speed: [9, 12] },
  sport: { L: 4.5, W: 1.9, clear: .2, belt: .78, cabin: [-1.1, .9, .7, .9], roof: 1.2, wheel: .34, speed: [14, 18] },
  bus: { L: 11.5, W: 2.5, clear: .35, belt: 1.25, cabin: [-5.6, 5.55, 0, .12], roof: 3.05, wheel: .5, speed: [8, 10], paint: 0x6d4596 },
};

function extrudeProfile(points, width) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2, curveSegments: 4 });
  return g.translate(0, 0, -width / 2);
}

/* Peças de um tipo, no espaço do carro: frente em +x, chão em y = 0 */
function buildType(t) {
  const h = t.L / 2, nose = Math.min(.5, t.L * .08);
  const body = extrudeProfile([
    [-h, t.clear], [h, t.clear], [h + .02, t.belt - .25], [h - nose, t.belt], [-h + nose * .6, t.belt], [-h - .02, t.belt - .2],
  ], t.W - .1);
  const [c0, c1, r0, r1] = t.cabin;
  const glass = extrudeProfile([[c0, t.belt - .02], [c1, t.belt - .02], [c1 - r1, t.roof - .05], [c0 + r0, t.roof - .05]], t.W - .24);
  const roof = extrudeProfile([[c0 + r0 - .04, t.roof - .07], [c1 - r1 + .04, t.roof - .07], [c1 - r1, t.roof], [c0 + r0, t.roof]], t.W - .2);
  const paint = [body, roof];
  // pilares entre as janelas laterais (lataria), exceto no ônibus, que tem faixa contínua de janelas
  if (t !== CAR_TYPES.bus) {
    const mid = (c0 + r0 + c1 - r1) / 2;
    paint.push(new THREE.BoxGeometry(.12, t.roof - t.belt, t.W - .2).translate(mid, (t.roof + t.belt) / 2, 0));
  } else {
    for (let x = c0 + 1.4; x < c1 - .5; x += 1.4) paint.push(new THREE.BoxGeometry(.1, t.roof - t.belt, t.W - .2).translate(x, (t.roof + t.belt) / 2, 0));
  }

  const rubber = [], chrome = [], head = [], tail = [];
  const axles = t === CAR_TYPES.bus ? [-h + 2.4, h - 2.2] : [-h + .82, h - .82];
  for (const x of axles) for (const s of [-1, 1]) {
    rubber.push(new THREE.CylinderGeometry(t.wheel, t.wheel, .26, 18).rotateX(Math.PI / 2).translate(x, t.wheel, s * (t.W / 2 - .1)));
    chrome.push(new THREE.CylinderGeometry(t.wheel * .6, t.wheel * .6, .04, 14).rotateX(Math.PI / 2).translate(x, t.wheel, s * (t.W / 2 + .04)));
    rubber.push(new THREE.BoxGeometry(t.wheel * 2.5, .06, .3).translate(x, t.wheel * 2 + .04, s * (t.W / 2 - .12)));   // caixa de roda
  }
  rubber.push(new THREE.BoxGeometry(.12, .22, t.W - .1).translate(h + .03, t.clear + .1, 0));    // para-choques
  rubber.push(new THREE.BoxGeometry(.12, .22, t.W - .1).translate(-h - .03, t.clear + .1, 0));
  chrome.push(new THREE.BoxGeometry(.06, .16, t.W * .38).translate(h + .05, t.belt - .45, 0));    // grade
  for (const s of [-1, 1]) {
    head.push(new THREE.BoxGeometry(.06, .14, .34).translate(h + .03, t.belt - .3, s * (t.W / 2 - .3)));
    tail.push(new THREE.BoxGeometry(.06, .16, .36).translate(-h - .04, t.belt - .28, s * (t.W / 2 - .28)));
    chrome.push(new THREE.BoxGeometry(.18, .1, .06).translate(c1 - .1, t.belt + .08, s * (t.W / 2 + .02)));   // retrovisor
  }
  if (t.sign) paint.push(new THREE.BoxGeometry(.7, .2, .3).translate((c0 + r0 + c1 - r1) / 2, t.roof + .1, 0));
  return {
    paint: mergeParts(paint), glass: mergeParts([glass]), rubber: mergeParts(rubber), chrome: mergeParts(chrome),
    head: mergeParts(head), tail: mergeParts(tail),
  };
}

export function buildTraffic(mats, { seed = 77, perLane = 6 } = {}) {
  const group = new THREE.Group();
  group.name = 'transito';
  const rng = new Random(seed);
  const { avenue } = PLAN;
  const laneW = (avenue.z1 - avenue.z0) / 4;
  // faixas 0 e 1 (lado do hotel) seguem para −x; 2 e 3 para +x
  const lanes = [0, 1, 2, 3].map(i => ({ z: avenue.z0 + laneW * (i + .5), dir: i < 2 ? -1 : 1 }));
  const weights = [['sedan', 5], ['taxi', 3], ['suv', 3], ['van', 1.5], ['sport', 1], ['bus', .6]];
  const pickType = () => {
    let r = rng.range(0, weights.reduce((a, [, w]) => a + w, 0));
    for (const [id, w] of weights) { if ((r -= w) < 0) return id; }
    return 'sedan';
  };

  const cars = [];
  lanes.forEach((lane, li) => {
    let x = -ROAD_END + rng.range(0, 30);
    for (let i = 0; i < perLane; i++) {
      const type = pickType(), t = CAR_TYPES[type];
      cars.push({ lane: li, type, x, speed: rng.range(...t.speed), len: t.L, color: new THREE.Color(t.paint ?? rng.pick(PAINTS)) });
      x += (ROAD_END * 2) / perLane + rng.range(-12, 12);
    }
  });
  // garante carros visíveis diante do hotel nas fotos (x de −40 a 40)
  for (const [li, x] of [[0, -9], [1, 21], [2, 4], [3, -26]]) {
    const c = cars.filter(c => c.lane === li)[0];
    c.x = x;
  }

  const meshes = {};
  for (const [id, t] of Object.entries(CAR_TYPES)) {
    const list = cars.filter(c => c.type === id);
    if (!list.length) continue;
    const parts = buildType(t);
    const make = (geo, mat, colored = false, shadow = true) => {
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      m.name = `carro:${id}:${mat.name}`;
      m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
      if (colored) list.forEach((c, i) => m.setColorAt(i, c.color));
      group.add(m);
      return m;
    };
    meshes[id] = {
      list,
      parts: [
        make(parts.paint, mats.get('carPaint'), true), make(parts.glass, mats.get('carGlass')),
        make(parts.rubber, mats.get('rubber')), make(parts.chrome, mats.get('chrome'), false, false),
        make(parts.head, mats.get('lampCool'), false, false), make(parts.tail, mats.get('tailLight'), false, false),
      ],
    };
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const qPos = new THREE.Quaternion(), qNeg = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI);
  function place() {
    for (const { list, parts } of Object.values(meshes)) {
      list.forEach((c, i) => {
        const lane = lanes[c.lane];
        q.copy(lane.dir > 0 ? qPos : qNeg);
        m4.compose(p.set(c.x, 0, lane.z), q, one);
        for (const part of parts) part.setMatrixAt(i, m4);
      });
      for (const part of parts) part.instanceMatrix.needsUpdate = true;
    }
  }

  function step(dt) {
    if (dt <= 0) return;
    for (let li = 0; li < 4; li++) {
      const dir = lanes[li].dir;
      const inLane = cars.filter(c => c.lane === li).sort((a, b) => (a.x - b.x) * dir);
      inLane.forEach((c, i) => {
        const ahead = inLane[(i + 1) % inLane.length];
        let gap = (ahead.x - c.x) * dir;
        if (gap <= 0) gap += ROAD_END * 2;
        const room = gap - (ahead.len + c.len) / 2 - 4;
        const v = Math.min(c.speed, Math.max(0, room / 1.2));      // segue o da frente sem encostar
        c.x += dir * v * dt;
        if (c.x > ROAD_END) c.x -= ROAD_END * 2;
        if (c.x < -ROAD_END) c.x += ROAD_END * 2;
      });
    }
  }

  place();
  return {
    group,
    info: { cars: cars.length },
    cars,
    update(dt) { step(dt); if (dt > 0) place(); },
    dispose() { group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); },
  };
}
