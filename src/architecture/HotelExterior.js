/* Exterior do Grand Resort, montado em camadas: térreo e base, torres com janelas modulares instanciadas,
   telhado mansarda, núcleo violeta e bronze com lobby envidraçado, marquise elíptica com lâmpadas, pavilhão
   de vidro facetado, coroamento com letreiros 3D e curvas douradas.
   buildHotelExterior(floors, mats, fonts) devolve { group, update(dt, camera), info }. */
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Batch, InstanceSet, mergeParts } from './Batch.js';
import { PLAN, towerTop, coreTop } from '../data/buildings.js';
import { Random } from '../core/Random.js';

const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const tmpM = new THREE.Matrix4();

/* Face de fachada: centro (cx, cz) na superfície, rotação ry (normal = (sin ry, cos ry)) e comprimento */
const face = (cx, cz, ry, len) => ({ cx, cz, ry, len, c: Math.cos(ry), s: Math.sin(ry) });
/* Ponto da face: u ao longo dela, n para fora */
const at = (f, u, n = 0) => [f.cx + f.c * u + f.s * n, f.cz - f.s * u + f.c * n];

/* Módulo de janela no espaço local: superfície da parede em z = 0, centro da abertura na origem, saindo para +z */
function windowModule(mats, { w, h, depth: D, hood = true, transom = .22, frameMat = 'creamStone' }) {
  const fw = .2;
  const frame = mergeParts([
    box(fw, h + .2, D, -(w / 2 + fw / 2), 0, D / 2),
    box(fw, h + .2, D, w / 2 + fw / 2, 0, D / 2),
    box(w + .6, .28, D + .06, 0, h / 2 + .14, (D + .06) / 2),
    ...(hood ? [box(w + .9, .1, D + .22, 0, h / 2 + .33, (D + .22) / 2)] : []),
  ]);
  return [
    { geometry: frame, material: mats.get(frameMat) },
    { geometry: box(w + .5, .12, D + .16, 0, -h / 2 - .06, (D + .16) / 2), material: mats.get('marble') },
    { geometry: mergeParts([box(.05, h, .05, 0, 0, .13), box(w, .05, .05, 0, h * transom, .13)]), material: mats.get('bronze'), shadow: false },
    { geometry: new THREE.PlaneGeometry(w, h).translate(0, 0, .04), material: mats.get('roomLight'), colored: true, shadow: false },
    { geometry: new THREE.PlaneGeometry(w, h).translate(0, 0, .1), material: mats.get('windowGlass'), shadow: false },
  ];
}

/* Cor da luz do quarto vista de fora: a maioria acesa em tons quentes, algumas apagadas */
function roomColor(rng) {
  if (rng.chance(.28)) return new THREE.Color(.05, .045, .06);
  const k = rng.range(.55, 1);
  return new THREE.Color(1, rng.range(.68, .82), rng.range(.42, .55)).multiplyScalar(k);
}

/* Curva elíptica horizontal (para aros e frisos dourados) */
class EllipseXZ extends THREE.Curve {
  constructor(cx, y, cz, rx, rz, a0 = 0, a1 = Math.PI * 2) { super(); Object.assign(this, { cx, y, cz, rx, rz, a0, a1 }); }
  getPoint(t, out = new THREE.Vector3()) {
    const a = this.a0 + (this.a1 - this.a0) * t;
    return out.set(this.cx + this.rx * Math.cos(a), this.y, this.cz + this.rz * Math.sin(a));
  }
}

/* Arco no plano vertical xy (curvas douradas do coroamento) */
class ArchXY extends THREE.Curve {
  constructor(cx, y, z, rx, ry, a0 = 0, a1 = Math.PI) { super(); Object.assign(this, { cx, y, z, rx, ry, a0, a1 }); }
  getPoint(t, out = new THREE.Vector3()) {
    const a = this.a0 + (this.a1 - this.a0) * t;
    return out.set(this.cx + this.rx * Math.cos(a), this.y + this.ry * Math.sin(a), this.z);
  }
}

function textGeometry(text, font, size, depth, bevel = .02) {
  const g = new TextGeometry(text, {
    font, size, depth, curveSegments: 6, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 2,
  });
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0);
  return g;
}

export function buildHotelExterior(floors, mats, fonts) {
  const group = new THREE.Group();
  group.name = 'hotel';
  const b = new Batch();
  const rng = new Random(20261116);
  const top = towerTop(floors), cTop = coreTop(floors);
  const { groundHeight: GH, floorHeight: FH, window: W } = PLAN;

  const rooms = new InstanceSet(windowModule(mats, W));
  const shop = new InstanceSet(windowModule(mats, { w: 2.1, h: 3.5, depth: .34, hood: false, transom: .3, frameMat: 'marble' }));
  const M = name => mats.get(name);

  /* ---------- torres ---------- */
  for (const t of PLAN.towers) {
    const cx = (t.x0 + t.x1) / 2, wdt = t.x1 - t.x0, D = PLAN.depth;
    b.span(M('creamStone'), t.x0, 0, -D, t.x1, GH, 0);
    b.span(M('lilacStucco'), t.x0, GH, -D, t.x1, top, 0);
    const outer = t.x0 < 0 ? face(t.x0, -D / 2, -Math.PI / 2, D) : face(t.x1, -D / 2, Math.PI / 2, D);
    const faces = [
      [face(cx, 0, 0, wdt), PLAN.bay.front],
      [face(cx, -D, Math.PI, wdt), PLAN.bay.front],
      [outer, PLAN.bay.side],
    ];
    for (const [f, bays] of faces) decorateFace(f, bays);
    // face interna exposta à frente do núcleo (z 0…−4): só base e frisos
    const inner = t.x0 < 0 ? face(t.x1, -2, Math.PI / 2, 4) : face(t.x0, -2, -Math.PI / 2, 4);
    trimFace(inner);
    mansard(t.x0, t.x1);
  }

  function trimFace(f) {
    let [x, z] = at(f, 0, .1);
    b.box(M('marble'), f.len + .3, .8, .2, x, 0, z, f.ry);
    [x, z] = at(f, 0, .3);
    b.box(M('creamStone'), f.len + .7, .5, .6, x, GH - .3, z, f.ry);
    [x, z] = at(f, 0, .31);
    b.box(M('gold'), f.len + .4, .07, .62, x, GH - .38, z, f.ry);
    [x, z] = at(f, 0, .4);
    b.box(M('creamStone'), f.len + .9, .55, .8, x, top - .55, z, f.ry);
    [x, z] = at(f, 0, .41);
    b.box(M('gold'), f.len + .6, .08, .82, x, top - .62, z, f.ry);
    [x, z] = at(f, 0, -.15);
    b.box(M('lilacTrim'), f.len, .9, .3, x, top, z, f.ry);           // parapeito
    for (let k = 1; k < floors; k++) {
      [x, z] = at(f, 0, .08);
      b.box(M('lilacTrim'), f.len, .16, .16, x, GH + k * FH - .08, z, f.ry);
    }
  }

  function decorateFace(f, bays) {
    trimFace(f);
    const bw = f.len / bays;
    for (let i = 0; i <= bays; i++) {
      const u = -f.len / 2 + i * bw, corner = i === 0 || i === bays;
      let [x, z] = at(f, u, corner ? .2 : .14);
      b.box(M('lilacTrim'), corner ? .9 : .42, top - GH - 1.1, corner ? .4 : .28, x, GH + .2, z, f.ry);
      [x, z] = at(f, u, .14);
      b.box(M('marble'), corner ? 1 : .55, GH - 1.2, .28, x, .8, z, f.ry);   // pilastras do térreo
    }
    for (let i = 0; i < bays; i++) {
      const u = -f.len / 2 + (i + .5) * bw;
      const [x, z] = at(f, u, 0);
      shop.add(x, .9 + 3.5 / 2, z, f.ry, roomColor(rng).multiplyScalar(1.15));
      for (let k = 0; k < floors; k++) rooms.add(x, GH + k * FH + W.sill + W.h / 2, z, f.ry, roomColor(rng));
    }
  }

  /* Telhado mansarda com lucarnas (as janelinhas reaproveitam o módulo de quarto em escala menor) */
  function mansard(x0, x1) {
    const inset = .5, h = 3.4, wdt = x1 - x0 - inset * 2, dep = PLAN.depth - inset * 2;
    const geo = new THREE.CylinderGeometry(.78 / Math.SQRT2, 1 / Math.SQRT2, h, 4, 1).rotateY(Math.PI / 4).scale(wdt, 1, dep);
    b.add(geo, M('roof'), tmpM.makeTranslation((x0 + x1) / 2, top + h / 2 + .2, -PLAN.depth / 2));
    b.box(M('gold'), wdt * .78 + .2, .14, dep * .78 + .2, (x0 + x1) / 2, top + h + .2, -PLAN.depth / 2);
    for (const [zFace, ry] of [[-inset - .6, 0], [-PLAN.depth + inset + .6, Math.PI]]) {
      for (let i = 0; i < 4; i++) {
        const x = x0 + inset + wdt * (i + .5) / 4, dir = ry === 0 ? 1 : -1;
        b.box(M('creamStone'), 1.6, 1.9, 2.2, x, top + .9, zFace - dir * 1.1, ry);
        b.add(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 3, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).scale(.8, .5, 1),
          M('roof'), tmpM.makeRotationY(ry).setPosition(x, top + 2.8, zFace - dir * 1.1));
        rooms.add(x, top + 1.85, zFace, ry, roomColor(rng), .5);
      }
    }
  }

  /* ---------- núcleo ---------- */
  const C = PLAN.core, lobbyBack = -12;
  b.span(M('violetStucco'), C.x0, GH, -PLAN.depth, C.x1, cTop, C.front);
  b.span(M('violetStucco'), C.x0, 0, -PLAN.depth, C.x1, GH, lobbyBack);
  // lobby visto pelo vidro: piso de mármore, parede do fundo em mármore com friso dourado, teto e luz quente
  b.span(M('marble'), C.x0, 0, lobbyBack, C.x1, .04, C.front);
  b.span(M('marble'), C.x0, 0, lobbyBack - .01, C.x1, GH, lobbyBack + .2);
  b.span(M('gold'), C.x0, 3.6, lobbyBack + .2, C.x1, 3.75, lobbyBack + .26);
  b.span(M('warmGlow'), C.x0 + .3, GH - .25, lobbyBack, C.x1 - .3, GH - .2, C.front - .3);
  b.span(M('marble'), -3, 0, lobbyBack + 1.8, 3, 1.1, lobbyBack + 2.6);         // balcão da recepção
  b.span(M('gold'), -3.05, 1.1, lobbyBack + 1.75, 3.05, 1.16, lobbyBack + 2.65);
  for (const x of [-5, 5]) {
    b.add(new THREE.CylinderGeometry(.35, .35, GH, 20), M('marble'), tmpM.makeTranslation(x, GH / 2, -8));
    b.add(new THREE.SphereGeometry(.55, 16, 10), M('lamp'), tmpM.makeTranslation(x * .6, GH - 1.2, -7.5));
  }
  // vitrine do lobby: vidro, montantes de bronze e verga
  // o vão das portas fica sem o vidro fixo: painéis laterais e bandeira acima das portas
  const side = (C.x1 - C.x0 - 4) / 2;
  for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(side, GH - .2), M('clearGlass'), tmpM.makeTranslation(s * (2 + side / 2), (GH - .2) / 2, C.front + .02), { projectUV: false });
  b.add(new THREE.PlaneGeometry(4, GH - 3.4), M('clearGlass'), tmpM.makeTranslation(0, 3.2 + (GH - 3.4) / 2, C.front + .02), { projectUV: false });
  for (const x of [-8, -6, -4, -2, 2, 4, 6, 8]) b.span(M('bronze'), x - .07, 0, C.front - .05, x + .07, GH, C.front + .12);
  b.span(M('bronze'), C.x0, 3.1, C.front - .05, C.x1, 3.25, C.front + .12);
  b.span(M('bronze'), C.x0, GH - .3, C.front - .05, C.x1, GH, C.front + .14);

  // faixa do letreiro intermediário (rubi com moldura dourada) e o pano de vidro do núcleo
  const signY = GH + 4.2;
  b.span(M('ruby'), -6.6, signY, C.front, 6.6, signY + 2.1, C.front + .3);
  for (const y of [signY - .06, signY + 2.1]) b.span(M('gold'), -6.75, y, C.front, 6.75, y + .08, C.front + .36);
  const cwBottom = signY + 2.7, cwTop = cTop - 2.2;
  if (cwTop - cwBottom > 2) {
    b.span(M('warmGlow'), -5, cwBottom, C.front + .02, 5, cwTop, C.front + .03);
    b.span(M('windowGlass'), -5, cwBottom, C.front + .09, 5, cwTop, C.front + .1);
    for (let x = -5; x <= 5.01; x += 1.25) b.span(M('bronze'), x - .06, cwBottom - .1, C.front, x + .06, cwTop + .1, C.front + .5);
    for (let y = GH + FH * Math.ceil((cwBottom - GH) / FH); y < cwTop; y += FH) b.span(M('bronze'), -5, y - .07, C.front, 5, y + .07, C.front + .3);
    for (const x of [-5.3, 5.3]) b.span(M('gold'), x - .12, cwBottom - .2, C.front, x + .12, cwTop + .2, C.front + .4);
  }
  for (const x of [-7.4, 7.4]) b.span(M('bronze'), x - .25, GH, C.front, x + .25, cTop, C.front + .35);
  // fundos do núcleo e o andar extra acima das torres também ganham janelas
  coreWindows();
  function coreWindows() {
    const back = face(0, -PLAN.depth, Math.PI, C.x1 - C.x0);
    for (let i = 0; i < 6; i++) {
      const u = -8 + (i + .5) * 16 / 6, [x, z] = at(back, u);
      for (let k = 0; k < floors + C.extraFloors; k++) rooms.add(x, GH + k * FH + W.sill + W.h / 2, z, Math.PI, roomColor(rng));
    }
    for (const s of [-1, 1]) {
      const f = face(s * 8, -13, s * Math.PI / 2, 18);
      for (let i = 0; i < 6; i++) {
        const [x, z] = at(f, -9 + (i + .5) * 3);
        for (let k = floors; k < floors + C.extraFloors; k++) rooms.add(x, GH + k * FH + W.sill + W.h / 2, z, f.ry, roomColor(rng));
      }
    }
  }

  /* ---------- coroamento do núcleo ---------- */
  b.span(M('creamStone'), C.x0 - .5, cTop - .6, C.front + .5, C.x1 + .5, cTop, -PLAN.depth - .5);
  b.span(M('gold'), C.x0 - .3, cTop - .7, C.front + .56, C.x1 + .3, cTop - .62, -PLAN.depth - .56);
  b.span(M('violetStucco'), -6.5, cTop, C.front - 1.2, 6.5, cTop + 2.6, -PLAN.depth + 2);
  b.span(M('creamStone'), -6.9, cTop + 2.6, C.front - .8, 6.9, cTop + 3, -PLAN.depth + 1.6);
  b.span(M('roof'), -4, cTop + 3, C.front - 3, 4, cTop + 4.4, -PLAN.depth + 4);
  b.add(new THREE.ConeGeometry(.35, 4.5, 8), M('gold'), tmpM.makeTranslation(0, cTop + 6.6, -12));
  b.add(new THREE.SphereGeometry(.45, 16, 12), M('goldGlow'), tmpM.makeTranslation(0, cTop + 4.6, -12));
  // curvas douradas: arco grande sobre o letreiro e dois arcos menores nas laterais
  const tube = (curve, r = .09, seg = 64) => b.add(new THREE.TubeGeometry(curve, seg, r, 8, false), M('goldGlow'), null, { projectUV: false });
  tube(new ArchXY(0, cTop + 3, C.front - .6, 6.9, 2.6), .12);
  tube(new ArchXY(0, cTop + 3, C.front - .6, 5.6, 1.8), .07);
  for (const s of [-1, 1]) tube(new ArchXY(s * 7.8, GH + .2, C.front + .5, 1.4, cwTop - GH - .4 > 3 ? 1.6 : .8, s > 0 ? 0 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI), .06, 24);

  /* ---------- marquise elíptica, colunas, tapete e pavilhão ---------- */
  const K = PLAN.canopy, P = PLAN.pavilion;
  const slabShape = new THREE.Shape().absellipse(0, 0, K.rx, K.rz, 0, Math.PI * 2);
  const slab = new THREE.ExtrudeGeometry(slabShape, { depth: K.thick, bevelEnabled: true, bevelThickness: .06, bevelSize: .08, bevelSegments: 2, curveSegments: 72 });
  slab.rotateX(-Math.PI / 2);
  b.add(slab, M('creamStone'), tmpM.makeTranslation(K.cx, K.y, K.cz));
  for (const y of [K.y - .02, K.y + K.thick + .02]) tube(new EllipseXZ(K.cx, y, K.cz, K.rx + .1, K.rz + .1), .06, 160);
  for (const [x, z] of [[-6, .4], [6, .4], [-6, 7.3], [6, 7.3]]) {
    b.add(new THREE.CylinderGeometry(.3, .36, K.y - .9, 24), M('marble'), tmpM.makeTranslation(x, .4 + (K.y - .9) / 2, z));
    b.box(M('marble'), .95, .4, .95, x, 0, z);
    b.add(new THREE.CylinderGeometry(.55, .32, .5, 24), M('gold'), tmpM.makeTranslation(x, K.y - .25, z));
    b.add(new THREE.TorusGeometry(.34, .05, 8, 24).rotateX(Math.PI / 2), M('gold'), tmpM.makeTranslation(x, 1.2, z));
  }
  b.span(M('rubyCarpet'), -1.6, .04, C.front, 1.6, .06, K.cz + K.rz + 2);
  for (const s of [-1, 1]) b.span(M('gold'), s * 1.6 - .04, .04, C.front, s * 1.6 + .04, .07, K.cz + K.rz + 2);

  // lâmpadas: ~400 no aro, ~3.000 no forro
  const rim = new InstanceSet([{ geometry: new THREE.SphereGeometry(.075, 8, 6), material: M('lamp'), shadow: false }]);
  for (let i = 0; i < 400; i++) {
    const a = i / 400 * Math.PI * 2;
    rim.add(K.cx + (K.rx + .06) * Math.cos(a), K.y - .06, K.cz + (K.rz + .06) * Math.sin(a));
  }
  const soffit = new InstanceSet([{ geometry: new THREE.SphereGeometry(.05, 6, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), material: M('lamp'), shadow: false }]);
  const step = .27;
  for (let x = -K.rx; x <= K.rx; x += step) {
    for (let z = -K.rz; z <= K.rz; z += step) {
      if ((x / (K.rx - .5)) ** 2 + (z / (K.rz - .5)) ** 2 > 1 || K.cz + z < C.front + .3) continue;
      soffit.add(K.cx + x, K.y - .005, K.cz + z);
    }
  }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(K.rx * 2.6, K.rz * 2.6).rotateX(-Math.PI / 2), M('lightPool'));
  pool.position.set(K.cx, .08, K.cz + 1.5); pool.name = 'marquise:luz';
  group.add(pool);
  rim.build(group, { castShadow: false, name: 'marquise:aro' });
  soffit.build(group, { castShadow: false, name: 'marquise:forro' });

  // pavilhão de vidro facetado sobre a marquise
  const py = K.y + K.thick, pcz = K.cz + .6;
  b.add(new THREE.CylinderGeometry(1, 1, P.h, 16, 1, true).scale(P.rx, 1, P.rz), M('clearGlass'), tmpM.makeTranslation(K.cx, py + P.h / 2, pcz), { projectUV: false });
  b.add(new THREE.SphereGeometry(1, 16, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(P.rx, 1.9, P.rz), M('clearGlass'), tmpM.makeTranslation(K.cx, py + P.h, pcz), { projectUV: false });
  b.add(new THREE.CylinderGeometry(1, 1, .12, 32).scale(P.rx - .2, 1, P.rz - .2), M('terrazzo'), tmpM.makeTranslation(K.cx, py + .06, pcz));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, x = Math.sin(a) * P.rx, z = Math.cos(a) * P.rz;
    b.add(box(.09, P.h, .09), M('bronze'), tmpM.makeTranslation(K.cx + x, py + P.h / 2, pcz + z));
    const rib = new THREE.Curve();
    rib.getPoint = (t, out = new THREE.Vector3()) => {
      const e = t * Math.PI / 2;
      return out.set(K.cx + x * Math.cos(e), py + P.h + 1.9 * Math.sin(e), pcz + z * Math.cos(e));
    };
    tube(rib, .045, 12);
  }
  for (const y of [py + .05, py + P.h]) tube(new EllipseXZ(K.cx, y, pcz, P.rx + .03, P.rz + .03), .07, 96);
  b.add(new THREE.SphereGeometry(.28, 14, 10), M('goldGlow'), tmpM.makeTranslation(K.cx, py + P.h + 2.05, pcz));
  b.add(new THREE.SphereGeometry(.6, 18, 12), M('lamp'), tmpM.makeTranslation(K.cx, py + P.h - .3, pcz));

  /* ---------- letreiros 3D ---------- */
  if (fonts.gloock) {
    b.add(textGeometry('GRAND RESORT', fonts.gloock, 1.25, .25, .03), M('goldGlow'), tmpM.makeTranslation(0, cTop + .55, C.front - 1.2 + .02), { projectUV: false });
  }
  if (fonts.pacifico) {
    b.add(textGeometry('Grand Resort', fonts.pacifico, 1.05, .14, .02), M('goldGlow'), tmpM.makeTranslation(0, signY + .45, C.front + .3), { projectUV: false });
  }
  if (fonts.outfit) {
    b.add(textGeometry('HOTEL  ·  RESTAURANTE  ·  BAR', fonts.outfit, .32, .05, 0), M('gold'), tmpM.makeTranslation(0, K.y + .12, K.cz + K.rz + .14), { projectUV: false });
  }

  b.build(group, { name: 'hotel' });
  rooms.build(group, { name: 'janelas' });
  shop.build(group, { name: 'vitrines' });

  /* ---------- portas automáticas do lobby ---------- */
  const doors = new THREE.Group();
  doors.name = 'portas';
  const leafGeo = new THREE.PlaneGeometry(2, 3);
  const frameGeo = mergeParts([box(.08, 3, .08, -1, 0, 0), box(.08, 3, .08, 1, 0, 0), box(2, .08, .08, 0, 1.5, 0), box(2, .08, .08, 0, -1.5, 0)]);
  const leaves = [-1, 1].map(s => {
    const leaf = new THREE.Group();
    leaf.add(new THREE.Mesh(leafGeo, M('clearGlass')), new THREE.Mesh(frameGeo, M('brushedSteel')));
    leaf.position.set(s, 1.55, C.front + .08);
    leaf.userData.side = s;
    doors.add(leaf);
    return leaf;
  });
  group.add(doors);
  let open = 0;
  const entrance = new THREE.Vector3(0, 1.6, C.front + 1);

  return {
    group,
    info: { floors, top, coreTop: cTop, windows: rooms.matrices.length, lamps: rim.matrices.length + soffit.matrices.length },
    /* Abre as portas quando a câmera chega perto da entrada */
    update(dt, camera) {
      const target = camera && camera.position.distanceTo(entrance) < 9 ? 1 : 0;
      open = THREE.MathUtils.damp(open, target, 4, dt);
      for (const leaf of leaves) leaf.position.x = leaf.userData.side * (1 + open * 1.9);
    },
    dispose() {
      group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    },
  };
}
