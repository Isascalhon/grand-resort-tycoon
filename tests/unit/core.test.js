import { describe, test, expect } from 'bun:test';
import { Random, hashString } from '../../src/core/Random.js';
import { GameClock, minuteOfDay, formatMinute, DAY_SECONDS } from '../../src/core/GameClock.js';
import { EventBus } from '../../src/core/EventBus.js';

describe('Random', () => {
  test('a mesma semente gera a mesma sequência', () => {
    const a = new Random(42), b = new Random(42);
    for (let i = 0; i < 20; i++) expect(a.float()).toBe(b.float());
  });
  test('fork é determinístico e independente', () => {
    const r = new Random(7);
    const f1 = r.fork('arvores').float(), f2 = new Random(7).fork('arvores').float();
    expect(f1).toBe(f2);
    expect(new Random(7).fork('carros').float()).not.toBe(f1);
  });
  test('int respeita os limites', () => {
    const r = new Random(3);
    for (let i = 0; i < 500; i++) { const v = r.int(2, 5); expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(5); }
  });
  test('hashString é estável', () => {
    expect(hashString('fachada:janela:12')).toBe(hashString('fachada:janela:12'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('GameClock', () => {
  test('o dia começa às 07:00 e o expediente termina às 21:00', () => {
    expect(formatMinute(minuteOfDay(0))).toBe('07:00');
    expect(formatMinute(minuteOfDay(DAY_SECONDS * .75))).toBe('21:00');
    expect(minuteOfDay(DAY_SECONDS * .9999)).toBeLessThan(7 * 60);   // madrugada antes das 07:00
  });
  test('virada de dia emite eventos e guarda o resto do tempo', () => {
    const bus = new EventBus(), state = { day: 1, t: 230 };
    const ended = [];
    bus.on('day:end', e => ended.push(e.day));
    const clock = new GameClock(state, bus);
    clock.advance(15);
    expect(state.day).toBe(2);
    expect(state.t).toBeCloseTo(5, 6);
    expect(ended).toEqual([1]);
    expect(clock.label).toMatch(/^Dia 2 · \d\d:\d\d$/);
  });
  test('vários dias de uma vez', () => {
    const state = { day: 1, t: 0 };
    new GameClock(state).advance(DAY_SECONDS * 3 + 1);
    expect(state.day).toBe(4);
  });
});

describe('EventBus', () => {
  test('um ouvinte com erro não impede os outros', () => {
    const bus = new EventBus(); let ok = 0;
    const original = console.error; console.error = () => {};
    bus.on('x', () => { throw new Error('falha'); });
    bus.on('x', () => { ok++; });
    bus.emit('x');
    console.error = original;
    expect(ok).toBe(1);
  });
  test('once dispara uma vez só', () => {
    const bus = new EventBus(); let n = 0;
    bus.once('y', () => n++);
    bus.emit('y'); bus.emit('y');
    expect(n).toBe(1);
  });
});
