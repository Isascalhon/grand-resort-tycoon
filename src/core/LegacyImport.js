/* Importa o progresso do jogo legado (localStorage "grand_resort_save", versão 2) para o estado v3.
   Função pura: só lê o texto do save antigo e devolve um estado novo. A chave antiga nunca é escrita. */
import { createInitialState, num, int, bool, str, LOG_LIMIT } from './GameState.js';
import { LEGACY_SAVE_VERSION, NAMES, ROLES, BRANCHES } from '../data/legacy.js';
import { LEGACY_LEVEL_TO_CATEGORY } from '../data/rooms.js';

const LEGACY_SUITE_LEVEL = [2, 2, 3];   // nível de compra das suítes 201, 202 e 203 no legado

export function parseLegacySave(text) {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, reason: 'vazio' };
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: 'JSON inválido' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'formato desconhecido' };
  if (data.v !== LEGACY_SAVE_VERSION) return { ok: false, reason: `versão ${data.v} não suportada` };
  return { ok: true, data };
}

export function importLegacyV2(d, { now = Date.now() } = {}) {
  const s = createInitialState({ now });
  const notes = [];
  s.meta.source = 'legacy-v2';
  s.meta.importedAt = new Date(now).toISOString();

  // economia e tempo
  s.economy.cash = num(d.money, s.economy.cash, -1e9, 1e12);
  s.economy.debt = Math.round(num(d.debt, 0, 0, 1e12));
  s.economy.incomeToday = num(d.incomeToday, 0, 0, 1e12);
  s.economy.expenseToday = num(d.expenseToday, 0, 0, 1e12);
  s.reputation.points = num(d.rep, 0, 0, 100);
  s.clock.day = int(d.day, 1, 1, 1e6);
  s.clock.t = num(d.t, 0, 0, 240 - 1e-6);
  s.meta.playSeconds = num(d.elapsed, 0, 0, 1e9);
  s.stats.served = int(d.served, 0, 0, 1e9);
  s.progression.friend = int(d.friend, 0, 0, 10);
  s.guests.seq = int(d.guestSeq, 0, 0, 1e9);

  // melhorias do hotel
  const upg = d.upg && typeof d.upg === 'object' ? d.upg : {};
  s.hotel.upgrades = { bar: bool(upg.bar), floor: bool(upg.floor), light: bool(upg.light) };

  // quartos: 101–104 (térreo do legado) vão para o andar 1; suítes 201–203 para o andar 2
  const rooms = [];
  const legacyRooms = Array.isArray(d.rooms) ? d.rooms.slice(0, 4) : [];
  legacyRooms.forEach((r, i) => {
    if (!r || !r.owned) return;
    const level = int(r.level, 1, 1, 3);
    rooms.push({ id: `10${i + 1}`, floor: 1, slot: i, category: LEGACY_LEVEL_TO_CATEGORY[level], status: 'available' });
  });
  const upper = Array.isArray(d.upper) ? d.upper.slice(0, 3) : [];
  upper.forEach((r, i) => {
    if (!r || !r.owned) return;
    const level = int(r.level, LEGACY_SUITE_LEVEL[i], 1, 3);
    rooms.push({ id: `20${i + 1}`, floor: 2, slot: i, category: LEGACY_LEVEL_TO_CATEGORY[level], status: 'available' });
  });
  s.hotel.rooms = rooms;
  s.hotel.floors = rooms.some(r => r.floor === 2) ? 2 : 1;
  if (rooms.length) notes.push(`${rooms.length} quarto${rooms.length > 1 ? 's' : ''} importado${rooms.length > 1 ? 's' : ''} (${rooms.map(r => r.id).join(', ')})`);
  if (s.hotel.floors === 2) notes.push('As suítes do 2º andar do jogo antigo ficam no andar 2 do novo hotel');

  // funcionários: quantidade por cargo (respeitando o máximo) e nível de treino
  const staff = d.staff && typeof d.staff === 'object' ? d.staff : {};
  let n = 0;
  for (const role of Object.keys(ROLES)) {
    const count = int(staff[role], 0, 0, ROLES[role].max);
    for (let i = 0; i < count; i++) {
      n++;
      s.staff.hired.push({ id: `s${n}`, role, name: NAMES[(n * 7) % NAMES.length] });
    }
  }
  s.staff.seq = n;
  const lv = d.staffLv && typeof d.staffLv === 'object' ? d.staffLv : {};
  s.staff.levels = { recep: int(lv.recep, 1, 1, 3), maid: int(lv.maid, 1, 1, 3) };
  if (n) notes.push(`${n} funcionário${n > 1 ? 's' : ''} mantido${n > 1 ? 's' : ''}`);

  // filiais e parceiros
  const ids = BRANCHES.map(b => b.id);
  const owned = Array.isArray(d.owned) ? d.owned.filter(id => ids.includes(id)) : ['city'];
  if (!owned.includes('city')) owned.unshift('city');
  s.branches.owned = owned;
  s.branches.active = owned.includes(d.branch) ? d.branch : 'city';
  s.branches.plus = {};
  if (d.plus && typeof d.plus === 'object') for (const id of ids) if (d.plus[id] === true) s.branches.plus[id] = true;
  const p = d.partners && typeof d.partners === 'object' ? d.partners : {};
  s.partners = { adsT: num(p.adsT, 0, 0, 180), supplier: bool(p.supplier) };

  // extrato (só texto; ao exibir, o conteúdo é escapado)
  s.economy.log = Array.isArray(d.log) ? d.log.slice(0, LOG_LIMIT).filter(e => e && typeof e === 'object').map(e => ({
    day: int(e.day, 1, 1, 1e6), time: str(e.time, '--:--', 5), why: str(e.why, '', 120), v: num(e.v, 0, -1e9, 1e9),
  })) : [];

  s.meta.notes = notes;
  return { state: s, notes };
}
