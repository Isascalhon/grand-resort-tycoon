import { describe, test, expect } from 'bun:test';
import { createInitialState, normalizeState, SAVE_VERSION, START_CASH } from '../../src/core/GameState.js';
import { parseLegacySave, importLegacyV2 } from '../../src/core/LegacyImport.js';

describe('GameState', () => {
  test('estado inicial: quarto 101 sujo e caixa de $1.500, como no jogo atual', () => {
    const s = createInitialState({ now: 0 });
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.economy.cash).toBe(START_CASH);
    expect(s.hotel.rooms).toEqual([{ id: '101', floor: 1, slot: 0, category: 'standard', status: 'dirty' }]);
  });

  test('normalizeState corrige valores inválidos sem propagar NaN', () => {
    const raw = createInitialState({ now: 0 });
    raw.economy.cash = NaN;
    raw.reputation.points = 150;
    raw.clock.day = -3;
    raw.hotel.floors = 2;
    raw.hotel.rooms = [
      { id: '101', floor: 1, slot: 0, category: 'inexistente', status: 'xyz' },
      { id: '101', floor: 1, slot: 1, category: 'luxo' },          // id repetido: descartado
      { id: '305', floor: 3, slot: 4, category: 'luxo' },          // acima dos andares construídos: descartado
    ];
    raw.staff.hired = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, role: 'recep', name: 'X' }));   // máx. 1
    raw.branches = { active: 'lua', owned: ['lua'], plus: { city: true, lua: true } };
    const s = normalizeState(raw);
    expect(s.economy.cash).toBe(START_CASH);
    expect(s.reputation.points).toBe(100);
    expect(s.clock.day).toBe(1);
    expect(s.hotel.rooms).toEqual([{ id: '101', floor: 1, slot: 0, category: 'standard', status: 'available' }]);
    expect(s.staff.hired.length).toBe(1);
    expect(s.branches).toEqual({ active: 'city', owned: ['city'], plus: { city: true } });
  });

  test('normalizeState recusa versão diferente (precisa de migração)', () => {
    expect(() => normalizeState({ version: 2 })).toThrow();
    expect(() => normalizeState(null)).toThrow();
  });
});

const LEGACY_FULL = {
  v: 2, money: 7340, rep: 52.5, day: 9, t: 120, elapsed: 2050, incomeToday: 900, expenseToday: 120,
  served: 31, debt: 40, friend: 5, guestSeq: 77,
  upg: { bar: true, floor: false, light: true },
  staff: { recep: 1, maid: 2, chef: 1, waiter: 0 }, staffLv: { recep: 2, maid: 3 },
  branch: 'city', owned: ['city'], plus: {}, partners: { adsT: 33, supplier: true },
  rooms: [{ owned: true, level: 1 }, { owned: true, level: 2 }, { owned: false, level: 0 }, { owned: true, level: 3 }],
  upper: [{ owned: true, level: 2 }, { owned: false, level: 0 }, { owned: true, level: 3 }],
  log: [{ day: 9, time: '10:30', why: '<b>Check-in</b> Ana Lima', v: 240 }],
};

describe('Importação do save do jogo atual (v2)', () => {
  test('parseLegacySave aceita só a versão 2', () => {
    expect(parseLegacySave(JSON.stringify(LEGACY_FULL)).ok).toBe(true);
    expect(parseLegacySave(JSON.stringify({ v: 1, money: 999 })).ok).toBe(false);
    expect(parseLegacySave('{quebrado').ok).toBe(false);
    expect(parseLegacySave('').ok).toBe(false);
  });

  test('mapeia dinheiro, reputação, dia, quartos, equipe, melhorias e parceiros', () => {
    const { state: s, notes } = importLegacyV2(LEGACY_FULL, { now: 0 });
    expect(s.meta.source).toBe('legacy-v2');
    expect(s.economy.cash).toBe(7340);
    expect(s.economy.debt).toBe(40);
    expect(s.reputation.points).toBe(52.5);
    expect(s.clock).toEqual({ day: 9, t: 120 });
    expect(s.progression.friend).toBe(5);
    expect(s.stats.served).toBe(31);
    expect(s.hotel.floors).toBe(2);
    expect(s.hotel.rooms.map(r => [r.id, r.floor, r.category])).toEqual([
      ['101', 1, 'standard'], ['102', 1, 'executivo'], ['104', 1, 'presidencial'],
      ['201', 2, 'executivo'], ['203', 2, 'presidencial'],
    ]);
    expect(s.hotel.upgrades).toEqual({ bar: true, floor: false, light: true });
    expect(s.staff.hired.map(p => p.role)).toEqual(['recep', 'maid', 'maid', 'chef']);
    expect(s.staff.levels).toEqual({ recep: 2, maid: 3 });
    expect(s.partners).toEqual({ adsT: 33, supplier: true });
    expect(s.economy.log[0].why).toBe('<b>Check-in</b> Ana Lima');   // guardado como texto; escapado ao exibir
    expect(notes.length).toBeGreaterThan(0);
  });

  test('saves antigos sem suítes e sem dívida usam padrões', () => {
    const { v, money, rep, day, rooms } = LEGACY_FULL;
    const { state: s } = importLegacyV2({ v, money, rep, day, rooms }, { now: 0 });
    expect(s.economy.debt).toBe(0);
    expect(s.hotel.floors).toBe(1);
    expect(s.hotel.rooms.every(r => r.floor === 1)).toBe(true);
  });

  test('valores corrompidos são limitados', () => {
    const { state: s } = importLegacyV2({ v: 2, money: 'muito', rep: 900, day: 0, staff: { maid: 9 }, staffLv: { maid: 7 }, friend: -2 }, { now: 0 });
    expect(s.economy.cash).toBe(1500);
    expect(s.reputation.points).toBe(100);
    expect(s.clock.day).toBe(1);
    expect(s.staff.hired.filter(p => p.role === 'maid').length).toBe(2);
    expect(s.staff.levels.maid).toBe(3);
    expect(s.progression.friend).toBe(0);
  });
});
