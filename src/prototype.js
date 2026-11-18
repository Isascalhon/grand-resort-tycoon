/* Grand Resort 2.0 — protótipo visual da fachada (M1).
   Cena isolada para avaliar o exterior: câmera orbital, painel com andares, hora e qualidade, e 6 vistas prontas.
   Com ?test=1 não há laço contínuo: os testes chamam __PROTO__.renderOnce() depois de cada ajuste. */
import '@fontsource/gloock/400.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import './styles/base.css';
import './styles/prototype.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { QUALITY, resolveQuality } from './rendering/Quality.js';
import { createRenderer, bindResize } from './rendering/Renderer.js';
import { AssetManager } from './rendering/AssetManager.js';
import { MaterialLibrary } from './rendering/MaterialLibrary.js';
import { Environment } from './rendering/Environment.js';
import { PostFX } from './rendering/PostFX.js';
import { buildSite } from './architecture/Site.js';
import { buildHotelExterior } from './architecture/HotelExterior.js';
import { buildVegetation } from './vegetation/Vegetation.js';
import { buildTraffic } from './city/Cars.js';
import { el, escapeHtml } from './ui/dom.js';

const params = new URLSearchParams(location.search);
const testMode = params.has('test');

/* Vistas de avaliação: posição da câmera, alvo e hora sugerida */
export const VIEWS = {
  frontal: { label: 'Frontal', pos: [0, 15, 78], target: [0, 15, -6], hour: 10 },
  calcada: { label: 'Calçada', pos: [16, 1.7, 28.5], target: [0, 10, 0], hour: 16 },
  lateral: { label: 'Lateral', pos: [62, 20, 32], target: [0, 13, -10], hour: 9 },
  noite: { label: 'Noite', pos: [0, 10, 62], target: [0, 13, -4], hour: 21 },
  dia: { label: 'Dia', pos: [-52, 32, 60], target: [0, 11, -8], hour: 12.5 },
  entrada: { label: 'Entrada', pos: [3.5, 1.8, 15], target: [0, 4.6, -4], hour: 18.6 },
};

async function boot() {
  const qualityId = params.get('q') || (testMode ? 'medium' : 'auto');
  const quality = QUALITY[qualityId] || resolveQuality(qualityId);
  const renderer = createRenderer(document.getElementById('gl'), quality);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .8, 3000);

  const assets = new AssetManager(renderer, quality);
  const mats = new MaterialLibrary(assets);
  const env = new Environment({ renderer, scene, assets, quality });
  const [fonts] = await Promise.all([
    Promise.all(['gloock', 'pacifico', 'outfit-bold'].map(id => assets.font(`fonts/${id}.typeface.json`)))
      .then(([gloock, pacifico, outfit]) => ({ gloock, pacifico, outfit })),
    env.load(),
  ]);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - .02;
  controls.minDistance = 3; controls.maxDistance = 260;

  const post = new PostFX(renderer, scene, camera, quality, { stillFrames: testMode });
  bindResize(renderer, camera, (w, h) => post.setSize(w, h));

  scene.add(buildSite(mats));
  const vegetation = buildVegetation(mats);
  scene.add(vegetation.group);
  const traffic = buildTraffic(mats);
  scene.add(traffic.group);
  let hotel = null;
  const state = { floors: Number(params.get('andares')) || 6, hour: 10, view: 'frontal' };

  function setFloors(n) {
    if (hotel) { scene.remove(hotel.group); hotel.dispose(); }
    state.floors = THREE.MathUtils.clamp(Math.round(n), 1, 10);
    hotel = buildHotelExterior(state.floors, mats, fonts);
    scene.add(hotel.group);
    syncPanel();
  }

  function setTime(h) {
    state.hour = h;
    const night = env.setHour(h);
    mats.setNight(night);
    post.setNight(night, env.golden);
    syncPanel();
  }

  function setView(id) {
    const v = VIEWS[id]; if (!v) throw new Error(`vista desconhecida: ${id}`);
    state.view = id;
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    controls.update();
    focusShadows();
    setTime(v.hour);
  }

  /* Sombra concentrada no que a câmera vê: o alvo da órbita e um raio que cresce com a distância */
  const lastFocus = new THREE.Vector3(1e9, 0, 0);
  let lastRadius = 0;
  function focusShadows() {
    const r = Math.ceil(camera.position.distanceTo(controls.target) * .55 / 4) * 4;
    if (lastFocus.distanceTo(controls.target) < 6 && r === lastRadius) return;
    lastFocus.copy(controls.target); lastRadius = r;
    env.focus(controls.target, r);
  }

  /* ---------- painel ---------- */
  const panel = el('aside', { class: 'proto-panel', 'aria-label': 'Controles do protótipo' }, `
    <p class="eyebrow">Marco 1 · Protótipo da fachada</p>
    <h1 class="proto-title">Grand <em>Resort</em></h1>
    <label class="proto-row"><span>Andares</span>
      <span class="seg" role="group" aria-label="Andares">${[3, 6, 10].map(n => `<button type="button" data-floors="${n}">${n}</button>`).join('')}</span></label>
    <label class="proto-row"><span>Hora <b data-out="hour"></b></span>
      <input type="range" min="0" max="24" step="0.25" data-in="hour"></label>
    <label class="proto-row"><span>Qualidade</span>
      <select data-in="quality">${Object.values(QUALITY).map(q => `<option value="${q.id}">${escapeHtml(q.label)}</option>`).join('')}</select></label>
    <div class="proto-views" role="group" aria-label="Vistas">${Object.entries(VIEWS).map(([id, v]) => `<button type="button" class="btn ghost" data-view="${id}">${escapeHtml(v.label)}</button>`).join('')}</div>
    <p class="proto-stats" data-out="stats"></p>
    <a class="btn ghost proto-back" href="./game.html">Voltar</a>
  `);
  document.getElementById('ui').append(panel);
  panel.querySelectorAll('[data-floors]').forEach(btn => { btn.onclick = () => setFloors(Number(btn.dataset.floors)); });
  panel.querySelectorAll('[data-view]').forEach(btn => { btn.onclick = () => setView(btn.dataset.view); });
  const hourIn = panel.querySelector('[data-in="hour"]');
  hourIn.oninput = () => setTime(Number(hourIn.value));
  const qualityIn = panel.querySelector('[data-in="quality"]');
  qualityIn.value = quality.id;
  qualityIn.onchange = () => { params.set('q', qualityIn.value); location.search = params.toString(); };

  function syncPanel() {
    panel.querySelectorAll('[data-floors]').forEach(btn => btn.setAttribute('aria-pressed', String(Number(btn.dataset.floors) === state.floors)));
    panel.querySelectorAll('[data-view]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.view === state.view)));
    hourIn.value = state.hour;
    const h = Math.floor(state.hour), m = Math.round((state.hour - h) * 60);
    panel.querySelector('[data-out="hour"]').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  setFloors(state.floors);
  setView(params.get('vista') in VIEWS ? params.get('vista') : 'frontal');

  const statsOut = panel.querySelector('[data-out="stats"]');
  const info = () => ({
    floors: state.floors, hour: state.hour, view: state.view, quality: quality.id,
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
    ...hotel.info, plants: vegetation.info.plants, cars: traffic.info.cars,
  });

  /* Conta as draw calls da cena em si (o pós-processamento soma passes de tela cheia) */
  function renderFrame(dt = 0) {
    hotel.update(dt, camera);
    vegetation.update(dt, camera, { force: true });
    env.update(dt, camera);
    renderer.info.autoReset = false;
    renderer.info.reset();
    renderer.render(scene, camera);
    const scenePass = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    post.render(dt);
    renderer.info.autoReset = true;
    lastStats = scenePass;
  }
  let lastStats = { calls: 0, triangles: 0 };

  if (testMode) {
    window.__PROTO__ = {
      VIEWS: Object.keys(VIEWS),
      scene, renderer, mats, post, env, vegetation, traffic, camera, setView, setTime, setFloors,
      renderOnce: () => { renderFrame(0); return { ...info(), ...lastStats }; },
      info: () => ({ ...info(), ...lastStats }),
    };
    window.__PROTO_READY__ = true;
    return;
  }

  // fora dos testes, as draw calls do quadro ficam visíveis no painel
  const timer = new THREE.Timer();
  timer.connect(document);
  let statsClock = 0;
  renderer.info.autoReset = false;      // soma o quadro inteiro (cena + passes de tela cheia)
  renderer.setAnimationLoop(t => {
    timer.update(t);
    const dt = Math.min(timer.getDelta(), .1);
    controls.update(dt);
    renderer.info.reset();
    hotel.update(dt, camera);
    vegetation.update(dt, camera);
    traffic.update(dt);
    env.update(dt, camera);
    focusShadows();
    post.render(dt);
    statsClock += dt;
    if (statsClock > .5) {
      statsClock = 0;
      const r = renderer.info.render;
      statsOut.textContent = `${r.calls} draw calls · ${(r.triangles / 1000).toFixed(0)} mil triângulos · ${hotel.info.windows} janelas · ${hotel.info.lamps} lâmpadas`;
    }
  });
}

boot().catch(e => {
  console.error(e);
  if (testMode) window.__PROTO_BOOT_ERROR__ = String(e?.stack || e);
  document.getElementById('ui').innerHTML = `<section class="card"><h1 class="title">Ops</h1><p class="lead">O protótipo não conseguiu iniciar: ${escapeHtml(e.message)}</p><a class="btn" href="./game.html">Voltar</a></section>`;
});
