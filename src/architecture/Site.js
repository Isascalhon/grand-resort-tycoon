/* Terreno do hotel: gramado, praça de entrada com fonte, calçada com meio-fio, avenida de 4 faixas com faixa de
   pedestres, calçada oposta e postes. Tudo estático, montado em lotes por material. */
import * as THREE from 'three';
import { Batch, InstanceSet, mergeParts, worldUV } from './Batch.js';
import { PLAN } from '../data/buildings.js';

const ROAD_HALF = 260;

export function buildSite(mats) {
  const group = new THREE.Group();
  group.name = 'terreno';
  const b = new Batch();
  const { plaza, sidewalk, avenue } = PLAN;

  group.add(buildLawn(mats));

  // praça em placas claras, com borda de concreto e base do prédio
  b.span(mats.get('plazaTiles'), plaza.x0, -.1, -26, plaza.x1, .02, plaza.z1);
  b.span(mats.get('concrete'), plaza.x0 - .4, -.1, -26.4, plaza.x0, .14, plaza.z1);
  b.span(mats.get('concrete'), plaza.x1, -.1, -26.4, plaza.x1 + .4, .14, plaza.z1);
  // faixa central de terrazzo levando à porta (o "tapete" de pedra)
  b.span(mats.get('terrazzo'), -4, .02, 10, 4, .04, plaza.z1);

  // calçadas e meios-fios dos dois lados da avenida
  b.span(mats.get('pavers'), -ROAD_HALF, -.1, sidewalk.z0, ROAD_HALF, .16, sidewalk.z1);
  b.span(mats.get('concrete'), -ROAD_HALF, -.2, sidewalk.z1 - .3, ROAD_HALF, .18, sidewalk.z1);
  b.span(mats.get('pavers'), -ROAD_HALF, -.1, avenue.z1, ROAD_HALF, .16, avenue.z1 + 5);
  b.span(mats.get('concrete'), -ROAD_HALF, -.2, avenue.z1, ROAD_HALF, .18, avenue.z1 + .3);
  b.span(mats.get('grass'), -ROAD_HALF, -.2, avenue.z1 + 5, ROAD_HALF, .02, avenue.z1 + 60);

  // avenida
  b.span(mats.get('asphalt'), -ROAD_HALF, -.2, avenue.z0 - .01, ROAD_HALF, 0, avenue.z1);
  const mid = (avenue.z0 + avenue.z1) / 2, lane = (avenue.z1 - avenue.z0) / 4;
  for (const dz of [-.12, .12]) b.span(mats.get('paintYellow'), -ROAD_HALF, 0, mid + dz - .06, ROAD_HALF, .012, mid + dz + .06);
  for (const z of [mid - lane, mid + lane]) {
    for (let x = -ROAD_HALF; x < ROAD_HALF; x += 9) {
      if (Math.abs(x) < 6) continue;          // a faixa de pedestres interrompe a marcação
      b.span(mats.get('paint'), x, 0, z - .07, x + 4.5, .012, z + .07);
    }
  }
  for (let x = -4.6; x <= 4.6; x += 1.15) b.span(mats.get('paint'), x - .32, 0, avenue.z0 + .6, x + .32, .014, avenue.z1 - .6);

  // fonte circular no eixo da entrada
  const fz = 17;
  b.add(ring(5.2, 4.7, .75), mats.get('marble'), new THREE.Matrix4().makeTranslation(0, 0, fz));
  b.add(new THREE.CylinderGeometry(1.1, 1.4, .9, 24), mats.get('marble'), new THREE.Matrix4().makeTranslation(0, .45, fz));
  b.add(new THREE.CylinderGeometry(.22, .3, 1.6, 12), mats.get('marble'), new THREE.Matrix4().makeTranslation(0, 1.6, fz));
  b.add(new THREE.CylinderGeometry(1.6, .5, .35, 24), mats.get('marble'), new THREE.Matrix4().makeTranslation(0, 2.5, fz));
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.72, 48), mats.get('water'));
  water.rotation.x = -Math.PI / 2; water.position.set(0, .6, fz); water.name = 'fonte:agua';
  group.add(water);

  // bancos de mármore ao redor da fonte
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, r = 8;
    b.box(mats.get('marble'), 2.6, .45, .7, Math.sin(a) * r, 0, fz + Math.cos(a) * r, a);
  }
  b.build(group, { name: 'terreno' });

  group.add(buildStreetLamps(mats));
  return group;
}

/* Gramado em volta da área construída, recortado para não ficar sob praça, calçadas e avenida: um plano único
   de 3 km passava por baixo do asfalto e, com a câmera longe e oblíqua, vencia o teste de profundidade */
const LAWN_HALF = 1500;
function buildLawn(mats) {
  const { plaza, sidewalk, avenue } = PLAN;
  const px0 = plaza.x0 - .4, px1 = plaza.x1 + .4, back = -26.4, front = sidewalk.z0, far = avenue.z1 + 60;
  const rects = [
    [-LAWN_HALF, -LAWN_HALF, LAWN_HALF, back],          // atrás do hotel
    [-LAWN_HALF, back, px0, front],                     // laterais da praça
    [px1, back, LAWN_HALF, front],
    [-LAWN_HALF, front, -ROAD_HALF, far],               // além das pontas da avenida
    [ROAD_HALF, front, LAWN_HALF, far],
    [-LAWN_HALF, far, LAWN_HALF, LAWN_HALF],            // do outro lado da avenida
  ];
  const parts = rects.map(([x0, z0, x1, z1]) => {
    // subdividido em placas de ~50 m: triângulos de quilômetros perdem precisão de profundidade
    const w = x1 - x0, d = z1 - z0;
    return new THREE.PlaneGeometry(w, d, Math.ceil(w / 50), Math.ceil(d / 50)).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, -.02, (z0 + z1) / 2);
  });
  const geo = mergeParts(parts);
  worldUV(geo);
  const lawn = new THREE.Mesh(geo, mats.get('grass'));
  lawn.receiveShadow = true; lawn.name = 'gramado';
  return lawn;
}

/* Anel (coroa circular) com altura h: borda da fonte */
function ring(rOut, rIn, h) {
  const shape = new THREE.Shape().absarc(0, 0, rOut, 0, Math.PI * 2);
  shape.holes.push(new THREE.Path().absarc(0, 0, rIn, 0, Math.PI * 2, true));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/* Postes de rua: haste escura, braço curvo e luminária — instanciados nas duas calçadas e na praça */
function buildStreetLamps(mats) {
  const group = new THREE.Group();
  group.name = 'postes';
  const pole = new THREE.CylinderGeometry(.08, .13, 7.7, 10).translate(0, 3.85, 0);
  const base = new THREE.CylinderGeometry(.22, .26, .6, 10).translate(0, .3, 0);
  const arm = new THREE.CylinderGeometry(.045, .06, 1.15, 8).rotateX(Math.PI / 2).translate(0, 7.62, .55);
  const head = new THREE.CylinderGeometry(.18, .42, .26, 12).translate(0, 7.62, 1.05);
  const bulb = new THREE.SphereGeometry(.2, 12, 8).scale(1, .45, 1).translate(0, 7.47, 1.05);
  const metal = mergeParts([pole, base, arm, head]);
  const set = new InstanceSet([
    { geometry: metal, material: mats.get('darkMetal') },
    { geometry: bulb, material: mats.get('lampCool'), shadow: false },
  ]);
  const pools = new InstanceSet([{ geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), material: mats.get('lightPool'), shadow: false }]);
  const { sidewalk, avenue } = PLAN;
  for (let x = -96; x <= 96; x += 24) {
    set.add(x, .16, sidewalk.z1 - .8, 0);                    // calçada do hotel, braço para a rua
    pools.add(x, .2, sidewalk.z1 + .3, 0, null, 11);
    set.add(x + 12, .16, avenue.z1 + .8, Math.PI);           // calçada oposta
    pools.add(x + 12, .2, avenue.z1 - .3, 0, null, 11);
  }
  // lanternas baixas ao redor da praça
  for (const x of [-30, 30]) {
    for (const z of [4, 14, 24]) {
      set.add(x, 0, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, null, .7);
      pools.add(x + Math.sign(-x) * .7, .06, z, 0, null, 7);
    }
  }
  pools.build(group, { castShadow: false, name: 'postes:luz' });
  return set.build(group, { name: 'postes' });
}
