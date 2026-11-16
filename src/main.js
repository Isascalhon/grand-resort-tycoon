/* Grand Resort 2.0 — entrada do jogo novo.
   Marco 0 (Fundação): carrega o progresso (save novo ou importação do jogo atual, sem gravar nada),
   mostra um resumo e oferece os caminhos para o jogo atual e para o protótipo da fachada. */
import '@fontsource/gloock/400.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import './styles/base.css';
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Game } from './core/Game.js';
import { SaveManager } from './core/SaveManager.js';
import { summarize } from './core/GameState.js';
import { ROLES } from './data/legacy.js';
import { CATEGORY_BY_ID } from './data/rooms.js';
import { resolveQuality } from './rendering/Quality.js';
import { createRenderer, bindResize } from './rendering/Renderer.js';
import { escapeHtml, money, el, toast, downloadText } from './ui/dom.js';

const params = new URLSearchParams(location.search);
const testMode = params.has('test');

const ORIGIN_LABEL = {
  legacy: 'Progresso importado do jogo atual',
  save: 'Progresso salvo do jogo novo',
  new: 'Novo hotel',
};

/* Cenário de fundo provisório: céu ao entardecer sobre o terreno do hotel */
function buildBackdrop(renderer, quality) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .5, 4000);
  camera.position.set(0, 9, 60);
  const sky = new Sky();
  sky.scale.setScalar(3000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 2.2; u.mieCoefficient.value = .006; u.mieDirectionalG.value = .86;
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(87), THREE.MathUtils.degToRad(200));
  u.sunPosition.value.copy(sun);
  scene.add(sky);
  scene.fog = new THREE.FogExp2(0x2a2238, .0065);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({ color: 0x27222c, roughness: .95 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(new THREE.HemisphereLight(0xc9b8e4, 0x1a1420, .9 * Math.PI));
  renderer.toneMappingExposure = .55;
  bindResize(renderer, camera);
  let a = 0;
  return {
    scene, camera,
    frame(dt) { a += dt * .02; camera.position.set(Math.sin(a) * 60, 9, Math.cos(a) * 60); camera.lookAt(0, 14, 0); },
    render() { renderer.render(scene, camera); },
    quality,
  };
}

function renderCard(ui, game, saves, result) {
  const s = game.state, sum = summarize(s);
  const staff = s.staff.hired.reduce((acc, p) => { acc[p.role] = (acc[p.role] || 0) + 1; return acc; }, {});
  const staffText = Object.entries(staff).map(([r, n]) => `${n} ${ROLES[r]?.name ?? r}`).join(', ') || 'nenhum';
  const rooms = s.hotel.rooms.map(r => `${r.id} · ${CATEGORY_BY_ID[r.category].name}`).join(' — ') || 'nenhum';
  const notes = [
    ...result.notes.map(n => `<li>${escapeHtml(n)}</li>`),
    ...result.warnings.map(w => `<li class="warn">${escapeHtml(w)}</li>`),
  ].join('');
  const card = el('section', { class: 'card', 'aria-labelledby': 'gr-title' }, `
    <p class="eyebrow">Versão 2.0 em construção · Marco 0 — Fundação</p>
    <h1 class="title" id="gr-title">Grand <em>Resort</em></h1>
    <p class="lead">O novo motor (three.js moderno, salvamento seguro e testes) está pronto.
      Enquanto a fachada monumental e o novo prédio são construídos, o jogo atual continua sendo o principal —
      e o seu progresso será trazido para cá.</p>
    <p class="eyebrow" style="margin-top:6px">${escapeHtml(ORIGIN_LABEL[result.origin])}</p>
    <div class="kpis">
      <div class="kpi"><span>Dia</span><b>${sum.day}</b></div>
      <div class="kpi"><span>Caixa</span><b>${money(sum.cash)}</b></div>
      <div class="kpi"><span>Reputação</span><b>${sum.stars.toFixed(1).replace('.', ',')}★</b></div>
      <div class="kpi"><span>Andares</span><b>${sum.floors}</b></div>
    </div>
    <p class="lead" style="margin:4px 0 0;font-size:14px"><b>Quartos:</b> ${escapeHtml(rooms)}<br><b>Equipe:</b> ${escapeHtml(staffText)}</p>
    ${notes ? `<ul class="notes">${notes}</ul>` : ''}
    <div class="actions">
      <a class="btn" href="./index.html">Jogar a versão atual</a>
      <a class="btn ghost" href="./prototype.html">Protótipo da fachada</a>
      <button class="btn ghost" type="button" data-act="export">Exportar progresso</button>
      <button class="btn ghost" type="button" data-act="import">Importar progresso</button>
    </div>
    <p class="foot">Nada foi gravado: o progresso do jogo atual só é lido. ${saves.readOnly ? 'Jogo aberto em outra aba.' : ''}</p>
  `);
  card.querySelector('[data-act="export"]').onclick = () => {
    downloadText(`grand-resort-progresso-dia-${s.clock.day}.json`, saves.exportText(s));
    toast('Progresso exportado como arquivo JSON.', 'good');
  };
  card.querySelector('[data-act="import"]').onclick = () => {
    const input = el('input', { type: 'file', accept: '.json,application/json,text/plain' });
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        const state = saves.parseImport(await file.text());
        game.setState(state);
        card.remove(); renderCard(ui, game, saves, { origin: 'save', notes: ['Progresso importado do arquivo.'], warnings: [] });
        toast('Progresso importado. Ele será usado quando o jogo novo abrir.', 'good');
      } catch (e) { toast(e.message, 'bad'); }
    };
    input.click();
  };
  ui.append(card);
}

async function boot() {
  const ui = document.getElementById('ui');
  const game = new Game({ testMode });
  const saves = await new SaveManager({ bus: game.bus }).init();
  game.saves = saves;
  const result = await saves.loadInitial();
  game.setState(result.state);
  game.bus.on('error', ({ where, count }) => { if (count <= 3) toast(`Algo inesperado aconteceu (${where}), mas o jogo continua.`, 'bad'); });

  const quality = resolveQuality(game.state.settings.quality);
  const renderer = createRenderer(document.getElementById('gl'), quality);
  const backdrop = buildBackdrop(renderer, quality);
  game.add({ name: 'backdrop', frame: dt => backdrop.frame(dt) });
  game.render = () => backdrop.render();
  document.addEventListener('visibilitychange', () => { game.hiddenPause = document.hidden; });

  renderCard(ui, game, saves, result);

  if (testMode) {
    window.__GAME__ = {
      game, saves, result, renderer,
      get state() { return game.state; },
      step: seconds => game.step(seconds),
      frame: dt => game.frame(dt),
      renderOnce: () => backdrop.render(),
      saveSlot: slot => saves.save(game.state, slot),
      loadSlot: async slot => { const st = await saves.load(slot); if (st) game.setState(st); return st; },
      addSystem: sys => game.add(sys),
    };
    window.__GAME_READY__ = true;
  } else {
    game.start();
  }
}

boot().catch(e => {
  console.error(e);
  document.getElementById('ui').innerHTML = `<section class="card"><h1 class="title">Ops</h1><p class="lead">O jogo não conseguiu iniciar: ${escapeHtml(e.message)}</p><a class="btn" href="./index.html">Jogar a versão atual</a></section>`;
});
