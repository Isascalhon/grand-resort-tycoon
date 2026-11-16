/* Relógio do jogo. Um dia dura DAY_SECONDS de simulação (o mesmo ritmo do legado, para manter
   o balanceamento). O dia de trabalho (07h às 21h) ocupa 75% desse tempo; a noite (21h às 07h), 25%. */

export const DAY_SECONDS = 240;
const DAY_PART = .75;
const DAY_START = 7 * 60, DAY_END = 21 * 60;

const pad2 = v => String(v).padStart(2, '0');

/* Minuto do dia (0–1439) para um instante t (segundos) dentro do dia */
export function minuteOfDay(t) {
  const p = Math.min(.999999, Math.max(0, t / DAY_SECONDS));
  if (p < DAY_PART) return DAY_START + (p / DAY_PART) * (DAY_END - DAY_START);
  const night = (p - DAY_PART) / (1 - DAY_PART) * (24 * 60 - (DAY_END - DAY_START));
  return (DAY_END + night) % (24 * 60);
}

export function formatMinute(m) { const mm = Math.floor(m); return `${pad2(Math.floor(mm / 60) % 24)}:${pad2(mm % 60)}`; }

export class GameClock {
  /* state é o objeto clock do GameState ({day, t}); o relógio o altera diretamente */
  constructor(state, bus) { this.state = state; this.bus = bus; }

  advance(dt) {
    const s = this.state;
    s.t += dt;
    while (s.t >= DAY_SECONDS) {
      s.t -= DAY_SECONDS;
      const ended = s.day;
      s.day++;
      this.bus?.emit('day:end', { day: ended });
      this.bus?.emit('day:start', { day: s.day });
    }
  }

  get day() { return this.state.day; }
  get minute() { return minuteOfDay(this.state.t); }
  /* Hora do dia em horas decimais (0–24), usada pelo ciclo dia/noite */
  get hours() { return this.minute / 60; }
  get label() { return `Dia ${this.state.day} · ${formatMinute(this.minute)}`; }
}
