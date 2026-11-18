/* Barramento de eventos: os sistemas se comunicam sem depender uns dos outros.
   Um ouvinte que falha não impede os demais de receberem o evento. */
export class EventBus {
  constructor() { this.listeners = new Map(); }

  on(type, fn) {
    let set = this.listeners.get(type);
    if (!set) { set = new Set(); this.listeners.set(type, set); }
    set.add(fn);
    return () => this.off(type, fn);
  }

  once(type, fn) {
    const off = this.on(type, payload => { off(); fn(payload); });
    return off;
  }

  off(type, fn) { this.listeners.get(type)?.delete(fn); }

  emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error(`[evento ${type}]`, e); }
    }
  }

  clear() { this.listeners.clear(); }
}
