/* Estado do jogo: a única fonte de verdade. Só contém dados lógicos e serializáveis
   (nada de objetos three.js); o mundo 3D é reconstruído a partir dele. */
import { CATEGORY_BY_ID, ROOM_STATUS } from '../data/rooms.js';
import { BRANCHES, ROLES } from '../data/legacy.js';

export const SAVE_VERSION = 3;
export const START_CASH = 1500;
export const MAX_FLOORS = 10;
export const ROOMS_PER_FLOOR = 8;
export const LOG_LIMIT = 40;

/* ---------- validação ---------- */
export const num = (v, def, min = -Infinity, max = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
export const int = (v, def, min, max) => Math.round(num(v, def, min, max));
export const bool = (v, def = false) => (typeof v === 'boolean' ? v : def);
export const str = (v, def = '', maxLen = 200) => (typeof v === 'string' ? v.slice(0, maxLen) : def);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function createInitialState({ now = Date.now(), seed } = {}) {
  return {
    version: SAVE_VERSION,
    meta: {
      createdAt: new Date(now).toISOString(), savedAt: null, playSeconds: 0,
      seed: seed ?? (now % 2147483647), source: 'new', importedAt: null, notes: [],
    },
    clock: { day: 1, t: 0 },
    economy: { cash: START_CASH, debt: 0, incomeToday: 0, expenseToday: 0, txSeq: 0, log: [] },
    reputation: { points: 0 },
    hotel: {
      floors: 1,
      // como no legado: o hotel começa com o quarto 101 comprado e sujo
      rooms: [{ id: '101', floor: 1, slot: 0, category: 'standard', status: 'dirty' }],
      upgrades: { bar: false, floor: false, light: false },
    },
    staff: { seq: 0, hired: [], levels: { recep: 1, maid: 1 } },
    guests: { seq: 0 },
    stats: { served: 0 },
    progression: { friend: 0 },
    branches: { active: 'city', owned: ['city'], plus: {} },
    partners: { adsT: 0, supplier: false },
    settings: { quality: 'auto', volume: 0.8, sensitivity: 1, invertY: false },
  };
}

function normalizeRooms(list, floors) {
  const out = [], seen = new Set();
  if (!Array.isArray(list)) return out;
  for (const r of list) {
    if (!isObj(r)) continue;
    const floor = int(r.floor, 1, 1, MAX_FLOORS), slot = int(r.slot, 0, 0, ROOMS_PER_FLOOR - 1);
    const id = str(r.id, `${floor}${String(slot + 1).padStart(2, '0')}`, 6);
    if (seen.has(id) || floor > floors) continue;
    seen.add(id);
    out.push({
      id, floor, slot,
      category: CATEGORY_BY_ID[r.category] ? r.category : 'standard',
      status: ROOM_STATUS.includes(r.status) ? r.status : 'available',
    });
  }
  return out;
}

function normalizeLog(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, LOG_LIMIT).filter(isObj).map(e => ({
    day: int(e.day, 1, 1, 1e6), time: str(e.time, '--:--', 5), why: str(e.why, '', 120), v: num(e.v, 0, -1e9, 1e9),
  }));
}

/* Recebe um objeto vindo do disco (já na versão atual) e devolve um estado completo e válido.
   Valores ausentes ou fora de faixa voltam para o padrão; nunca propaga NaN. */
export function normalizeState(raw) {
  if (!isObj(raw)) throw new Error('estado inválido');
  if (raw.version !== SAVE_VERSION) throw new Error(`versão ${raw.version} precisa de migração`);
  const base = createInitialState();
  const m = isObj(raw.meta) ? raw.meta : {}, c = isObj(raw.clock) ? raw.clock : {}, e = isObj(raw.economy) ? raw.economy : {};
  const h = isObj(raw.hotel) ? raw.hotel : {}, st = isObj(raw.staff) ? raw.staff : {}, br = isObj(raw.branches) ? raw.branches : {};
  const floors = int(h.floors, 1, 1, MAX_FLOORS);
  const branchIds = BRANCHES.map(b => b.id);

  const hired = [];
  const perRole = {};
  if (Array.isArray(st.hired)) {
    for (const p of st.hired) {
      if (!isObj(p) || !ROLES[p.role]) continue;
      perRole[p.role] = (perRole[p.role] || 0) + 1;
      if (perRole[p.role] > ROLES[p.role].max) continue;
      hired.push({ id: str(p.id, `s${hired.length + 1}`, 12), role: p.role, name: str(p.name, 'Funcionário', 40) });
    }
  }
  const lv = isObj(st.levels) ? st.levels : {};
  const owned = Array.isArray(br.owned) ? br.owned.filter(id => branchIds.includes(id)) : ['city'];
  if (!owned.includes('city')) owned.unshift('city');
  const plus = {};
  if (isObj(br.plus)) for (const id of branchIds) if (br.plus[id] === true) plus[id] = true;

  return {
    version: SAVE_VERSION,
    meta: {
      createdAt: str(m.createdAt, base.meta.createdAt, 40), savedAt: m.savedAt ? str(m.savedAt, null, 40) : null,
      playSeconds: num(m.playSeconds, 0, 0, 1e9), seed: int(m.seed, base.meta.seed, 0, 2147483646),
      source: ['new', 'legacy-v2', 'import'].includes(m.source) ? m.source : 'new',
      importedAt: m.importedAt ? str(m.importedAt, null, 40) : null,
      notes: Array.isArray(m.notes) ? m.notes.slice(0, 20).map(n => str(n, '', 160)) : [],
    },
    clock: { day: int(c.day, 1, 1, 1e6), t: num(c.t, 0, 0, 240 - 1e-6) },
    economy: {
      cash: num(e.cash, START_CASH, -1e9, 1e12), debt: Math.round(num(e.debt, 0, 0, 1e12)),
      incomeToday: num(e.incomeToday, 0, 0, 1e12), expenseToday: num(e.expenseToday, 0, 0, 1e12),
      txSeq: int(e.txSeq, 0, 0, 1e12), log: normalizeLog(e.log),
    },
    reputation: { points: num(raw.reputation?.points, 0, 0, 100) },
    hotel: {
      floors,
      rooms: normalizeRooms(h.rooms, floors),
      upgrades: { bar: bool(h.upgrades?.bar), floor: bool(h.upgrades?.floor), light: bool(h.upgrades?.light) },
    },
    staff: { seq: int(st.seq, hired.length, 0, 1e9), hired, levels: { recep: int(lv.recep, 1, 1, 3), maid: int(lv.maid, 1, 1, 3) } },
    guests: { seq: int(raw.guests?.seq, 0, 0, 1e9) },
    stats: { served: int(raw.stats?.served, 0, 0, 1e9) },
    progression: { friend: int(raw.progression?.friend, 0, 0, 10) },
    branches: { active: owned.includes(br.active) ? br.active : 'city', owned, plus },
    partners: { adsT: num(raw.partners?.adsT, 0, 0, 180), supplier: bool(raw.partners?.supplier) },
    settings: {
      quality: ['auto', 'low', 'medium', 'high'].includes(raw.settings?.quality) ? raw.settings.quality : 'auto',
      volume: num(raw.settings?.volume, .8, 0, 1), sensitivity: num(raw.settings?.sensitivity, 1, .2, 3),
      invertY: bool(raw.settings?.invertY),
    },
  };
}

/* Resumo curto para listas de saves e para o HUD inicial */
export function summarize(state) {
  return {
    day: state.clock.day, cash: Math.round(state.economy.cash), stars: Math.round(state.reputation.points) / 10,
    rooms: state.hotel.rooms.length, floors: state.hotel.floors,
  };
}
