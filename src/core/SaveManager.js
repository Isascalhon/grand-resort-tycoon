/* Persistência do jogo em IndexedDB.
   Regras: nunca apagar nem sobrescrever um save que não pôde ser lido (ele é guardado com outro nome),
   nunca escrever na chave do jogo antigo (só leitura), e não salvar se outra aba já estiver jogando. */
import { SAVE_VERSION, normalizeState, createInitialState, summarize } from './GameState.js';
import { parseLegacySave, importLegacyV2 } from './LegacyImport.js';
import { LEGACY_SAVE_KEY } from '../data/legacy.js';

const DB_NAME = 'grand-resort';
const DB_VERSION = 1;
const STORE = 'saves';
const BACKUP_EVERY_MS = 5 * 60 * 1000;
export const MANUAL_SLOTS = ['manual-1', 'manual-2', 'manual-3'];

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB indisponível')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueado por outra aba'));
  });
}

function request(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result;
    const req = action(tx.objectStore(STORE));
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transação cancelada'));
  });
}

/* Trava por aba (Web Locks): só a primeira aba aberta grava; as outras ficam em modo leitura */
function acquireTabLock(name) {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) return Promise.resolve(true);
  return new Promise(resolve => {
    navigator.locks.request(name, { ifAvailable: true }, lock => {
      if (!lock) { resolve(false); return undefined; }
      resolve(true);
      return new Promise(() => {});   // segura a trava enquanto a aba existir
    }).catch(() => resolve(true));
  });
}

/* Migração de saves do jogo novo, versão a versão (hoje só existe a v3) */
export function migrateState(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('save vazio');
  const s = raw;
  // futuras versões: if (s.version === 3) s = migrate3to4(s); ...
  if (s.version !== SAVE_VERSION) throw new Error(`versão ${s.version} desconhecida`);
  return normalizeState(s);
}

export function readLegacyRaw() {
  try { return localStorage.getItem(LEGACY_SAVE_KEY); } catch { return null; }
}

export class SaveManager {
  constructor({ bus } = {}) {
    this.bus = bus;
    this.db = null;
    this.available = false;
    this.readOnly = false;
    this.lastBackup = 0;
    this.lastError = null;
  }

  async init() {
    try { this.db = await openDB(); this.available = true; } catch (e) { this.lastError = e; this.available = false; }
    this.readOnly = !(await acquireTabLock('grand-resort-save'));
    return this;
  }

  async get(slot) {
    if (!this.db) return null;
    return (await request(this.db, 'readonly', s => s.get(slot))) ?? null;
  }

  async put(record) {
    if (!this.db) throw new Error('armazenamento indisponível');
    return request(this.db, 'readwrite', s => s.put(record));
  }

  async remove(slot) {
    if (!this.db || this.readOnly) return false;
    await request(this.db, 'readwrite', s => s.delete(slot));
    return true;
  }

  async list() {
    if (!this.db) return [];
    const all = (await request(this.db, 'readonly', s => s.getAll())) || [];
    return all.map(r => ({ slot: r.slot, savedAt: r.savedAt, version: r.version, summary: r.summary }));
  }

  /* Estado inicial: save automático → progresso do jogo antigo → jogo novo. Nada é apagado. */
  async loadInitial({ now = Date.now() } = {}) {
    const result = { state: null, origin: 'new', notes: [], warnings: [] };
    if (!this.available) result.warnings.push('O navegador não permitiu salvar o progresso (IndexedDB indisponível).');
    if (this.readOnly) result.warnings.push('O jogo já está aberto em outra aba: esta aba não salva o progresso.');

    let auto = null;
    try { auto = await this.get('auto'); } catch { result.warnings.push('Não foi possível ler o save automático.'); }
    if (auto) {
      try {
        result.state = migrateState(auto.state);
        result.origin = 'save';
        return result;
      } catch {
        if (!this.readOnly) await this.put({ ...auto, slot: `corrompido-${now}` }).catch(() => {});
        result.warnings.push('O save automático estava ilegível; uma cópia foi guardada como "corrompido" e nada foi apagado.');
      }
    }

    const legacyRaw = readLegacyRaw();
    if (legacyRaw !== null) {
      const parsed = parseLegacySave(legacyRaw);
      if (parsed.ok) {
        const imported = importLegacyV2(parsed.data, { now });
        result.state = imported.state;
        result.origin = 'legacy';
        result.notes = imported.notes;
        return result;
      }
      result.warnings.push(`O progresso do jogo antigo não pôde ser lido (${parsed.reason}). Ele continua guardado e o jogo antigo segue jogável.`);
    }

    result.state = createInitialState({ now });
    return result;
  }

  async save(state, slot = 'auto') {
    if (!this.db || this.readOnly) return false;
    const now = Date.now();
    if (slot === 'auto' && now - this.lastBackup > BACKUP_EVERY_MS) {
      const prev = await this.get('auto').catch(() => null);
      if (prev) await this.put({ ...prev, slot: 'backup' });
      this.lastBackup = now;
    }
    state.meta.savedAt = new Date(now).toISOString();
    const record = { slot, version: SAVE_VERSION, savedAt: state.meta.savedAt, summary: summarize(state), state: structuredClone(state) };
    await this.put(record);
    this.bus?.emit('save:done', { slot });
    return true;
  }

  async load(slot) {
    const rec = await this.get(slot);
    return rec ? migrateState(rec.state) : null;
  }

  exportText(state) {
    return JSON.stringify({ format: 'grand-resort-save', version: SAVE_VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
  }

  /* Aceita um save exportado pelo jogo novo ou o texto de um save do jogo antigo */
  parseImport(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('O arquivo não é um save válido.'); }
    if (data && data.format === 'grand-resort-save') return migrateState(data.state);
    const legacy = parseLegacySave(text);
    if (legacy.ok) return importLegacyV2(legacy.data).state;
    throw new Error('Formato de save desconhecido.');
  }
}
