/* Núcleo do jogo: simulação em passo fixo (independente do FPS) separada da renderização.
   Cada sistema roda isolado: um erro é registrado e avisado, mas não congela o jogo. */
import { EventBus } from './EventBus.js';
import { GameClock } from './GameClock.js';

export const FIXED_STEP = 1 / 30;
const MAX_FRAME = 0.25;            // após aba suspensa, no máximo 1/4 s de atraso é simulado
const MAX_STEPS_PER_FRAME = 10;

export class Game {
  constructor({ testMode = false } = {}) {
    this.bus = new EventBus();
    this.testMode = testMode;
    this.systems = [];
    this.state = null;
    this.clock = null;
    this.saves = null;
    this.paused = true;            // começa pausado até o jogador entrar
    this.hiddenPause = false;      // aba oculta
    this.acc = 0;
    this.errors = 0;
    this.render = null;            // função de desenho, definida pela camada de renderização
    this.running = false;
  }

  setState(state) {
    this.state = state;
    this.clock = new GameClock(state.clock, this.bus);
    this.bus.emit('state:loaded', state);
  }

  add(system) {
    this.systems.push(system);
    try { system.init?.(this); } catch (e) { this.reportError(`init:${system.name}`, e); }
    return system;
  }

  get simulating() { return !this.paused && !this.hiddenPause; }

  simulate(dt) {
    this.clock.advance(dt);
    this.state.meta.playSeconds += dt;
    for (const s of this.systems) {
      if (!s.simulate) continue;
      try { s.simulate(dt, this); } catch (e) { this.reportError(s.name, e); }
    }
  }

  frame(dt) {
    if (this.simulating) {
      this.acc = Math.min(this.acc + dt, FIXED_STEP * MAX_STEPS_PER_FRAME);
      while (this.acc >= FIXED_STEP) { this.simulate(FIXED_STEP); this.acc -= FIXED_STEP; }
    }
    for (const s of this.systems) {
      if (!s.frame) continue;
      try { s.frame(dt, this); } catch (e) { this.reportError(s.name, e); }
    }
    if (this.render) { try { this.render(dt); } catch (e) { this.reportError('render', e); } }
  }

  /* Avança a simulação manualmente (testes): sempre em passos fixos */
  step(seconds) {
    let n = Math.max(1, Math.round(seconds / FIXED_STEP));
    while (n--) this.simulate(FIXED_STEP);
  }

  start() {
    if (this.testMode || this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(MAX_FRAME, Math.max(0, (now - last) / 1000));
      last = now;
      try { this.frame(dt); } catch (e) { this.reportError('frame', e); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  reportError(where, error) {
    this.errors++;
    console.error(`[${where}]`, error);
    this.bus.emit('error', { where, error, count: this.errors });
  }
}
