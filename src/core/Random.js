/* Números aleatórios com semente (mulberry32): o mesmo valor de entrada gera sempre a mesma
   sequência, o que deixa fachadas, árvores e cidade idênticas a cada carregamento. */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Hash estável de texto (FNV-1a) para derivar sementes por nome, ex.: "fachada:janela:12" */
export function hashString(text) {
  let h = 0x811C9DC5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export class Random {
  constructor(seed = 1) { this.seed = seed >>> 0; this.next = mulberry32(this.seed); }
  float() { return this.next(); }
  range(min, max) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  chance(p) { return this.next() < p; }
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
  sign() { return this.next() < .5 ? -1 : 1; }
  /* Gerador independente e determinístico para um subsistema */
  fork(label) { return new Random(hashString(`${this.seed}:${label}`)); }
}
