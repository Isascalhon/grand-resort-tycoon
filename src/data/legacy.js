/* Tabelas do jogo legado (index.html, save v2), copiadas sem alteração.
   Servem para a paridade do M2 e para importar o progresso antigo. Fonte: docs/PORTE.md §1. */

export const LEGACY_SAVE_KEY = 'grand_resort_save';
export const LEGACY_SAVE_VERSION = 2;

export const PRICE = { 1: 500, 2: 2500, 3: 10000 };           // compra do quarto e etapa de reforma
export const RATE = { 1: 120, 2: 300, 3: 800 };               // diária por nível do quarto
export const ROOM_STARS = { 1: 3, 2: 6, 3: 9 };               // estrelas do quarto x exigência do cliente
export const LEVEL = { 0: 'Em obras', 1: 'Básico', 2: 'Executiva', 3: 'Presidencial' };
export const STARS_FOR_LEVEL = { 1: 0, 2: 4, 3: 7 };          // estrelas do hotel exigidas por nível
export const STAGES = [
  { min: 0, name: 'Ruína' },
  { min: 1, name: 'Limpeza & Reparo' },
  { min: 4, name: 'Modernização' },
  { min: 7, name: 'Alto Padrão' },
];

export const CLIENT_TYPES = {
  mochileiro: { name: 'Mochileiro', exig: [10, 35], budget: [90, 150], stay: [1, 2], stage: 0, weight: 4 },
  familia: { name: 'Família', exig: [30, 60], budget: [160, 260], stay: [2, 4], stage: 2, weight: 3 },
  executivo: { name: 'Executivo', exig: [40, 75], budget: [220, 380], stay: [1, 3], stage: 2, weight: 3 },
  vip: { name: 'VIP', exig: [65, 100], budget: [400, 900], stay: [2, 5], stage: 3, weight: 1 },
};

export const BRANCHES = [
  { id: 'city', name: 'Cidade Urbano', cost: 0, prev: null, fog: 0xCFE8F2, sun: 0xFFF0D6, desc: 'Prédio corporativo, recepção moderna e restaurante interno.' },
  { id: 'island', name: 'Ilha / Resort Tropical', cost: 50000, prev: 'city', fog: 0x9FE3EE, sun: 0xFFE7B0, desc: 'Areia, oceano e bangalôs sobre a água, com bar de praia.' },
  { id: 'mountain', name: 'Montanha / Chalé Alpino', cost: 200000, prev: 'island', fog: 0xD9E6F2, sun: 0xE8F0FF, desc: 'Terreno nevado, chalés de madeira e lareiras.' },
  { id: 'desert', name: 'Deserto / Oásis de Luxo', cost: 1000000, prev: 'mountain', fog: 0xF2D2A0, sun: 0xFFD08A, desc: 'Domos de vidro translúcido, céu estrelado e spas aquecidos.' },
  { id: 'forest', name: 'Floresta / Eco-Lodge', cost: 5000000, prev: 'desert', fog: 0xB8D9A6, sun: 0xE6F2C0, desc: 'Casas na árvore, pontes suspensas e vegetação densa.' },
];

export const PARTNERS = [
  { id: 'ads', name: 'Campanha de marketing', cost: 800, desc: 'Por 3 minutos, os hóspedes chegam cerca de 40% mais depressa.' },
  { id: 'supplier', name: 'Fornecedor premium', cost: 2000, desc: 'Ingredientes de alta qualidade: +0,1 na nota de todas as receitas. Compra única.' },
];

export const NAMES = ['Ana Lima', 'Bruno Reis', 'Carla Dias', 'Diego Melo', 'Elisa Faria', 'Fábio Costa', 'Gabi Rocha', 'Hugo Pires', 'Iara Leal', 'João Prado', 'Laura Maia', 'Marcos Brito', 'Nina Sá', 'Otávio Lobo', 'Paula Vidal', 'Rafa Teles', 'Sofia Nunes', 'Tiago Abreu', 'Vera Lins', 'Yuri Castro'];

export const ROLES = {
  recep: {
    name: 'Recepcionista', cost: 300, wage: 60, max: 1,
    desc: 'Faz o check-in sozinha. Cada nível atende mais rápido e deixa a fila mais paciente.',
    levels: [
      { cost: 0, txt: 'check-in a cada 8 s · fila +15 s de paciência' },
      { cost: 450, txt: 'check-in a cada 5 s · fila +30 s de paciência' },
      { cost: 800, txt: 'check-in a cada 3 s · fila +45 s de paciência' },
    ],
  },
  maid: {
    name: 'Faxineira', cost: 250, wage: 45, max: 2,
    desc: 'Limpa sozinha os quartos sujos, um quarto por vez.',
    levels: [
      { cost: 0, txt: 'limpa quartos Básicos a cada 20 s' },
      { cost: 500, txt: 'também limpa a Executiva, a cada 14 s · +1 de satisfação por quarto' },
      { cost: 900, txt: 'limpa todos, inclusive a Presidencial, a cada 10 s · +1 de satisfação por quarto' },
    ],
  },
  chef: { name: 'Ajudante de cozinha', cost: 350, wage: 70, max: 2, desc: 'Cada ajudante deixa os pedidos automáticos da cozinha 75% mais rápidos.' },
  waiter: { name: 'Garçom', cost: 200, wage: 40, max: 2, desc: 'Recolhe as gorjetas das mesas e leva para o caixa.' },
};

export const UPGRADES = {
  bar: { name: 'Liberar o pool bar', cost: 600, desc: 'Abre o bar molhado: chega o barman, os hóspedes pedem drinks nas espreguiçadeiras e o bar passa a vender.' },
  floor: { name: 'Reformar o piso', cost: 900, desc: 'Mármore verde com frisos de ouro no lobby e taco em espinha no restaurante. +5 de reputação e gorjetas 15% maiores.' },
  light: { name: 'Melhorar a iluminação', cost: 700, desc: 'Luzes mais fortes e sancas de LED no lobby e no salão. +4 de reputação e a fila fica 10 s mais paciente.' },
};

export const INGR = {
  pao: { name: 'Pão brioche', c: 0xD9A35B, s: 'bun' }, carne: { name: 'Carne moída', c: 0x9A3B2E, s: 'box' }, queijo: { name: 'Queijo cheddar', c: 0xF2B630, s: 'wedge' },
  alface: { name: 'Alface', c: 0x7BC86C, s: 'leaf' }, tomate: { name: 'Tomate', c: 0xD9483B, s: 'ball' }, massa: { name: 'Massa de pizza', c: 0xF1E3C2, s: 'disc' },
  molho: { name: 'Molho de tomate', c: 0xC2203A, s: 'jar' }, mussarela: { name: 'Mussarela', c: 0xF8F4E8, s: 'ball' }, manjericao: { name: 'Manjericão', c: 0x2F8F4E, s: 'leaf' },
  salmao: { name: 'Salmão fresco', c: 0xF08A6A, s: 'box' }, ervas: { name: 'Ervas finas', c: 0x4C9A3A, s: 'bunch' }, limao: { name: 'Limão siciliano', c: 0xE8E05A, s: 'ball' },
  manteiga: { name: 'Manteiga', c: 0xF5E6A0, s: 'box' }, batata: { name: 'Batata', c: 0xB98B5E, s: 'egg' }, arroz: { name: 'Arroz arbóreo', c: 0xF4F1EA, s: 'sack' },
  camarao: { name: 'Camarão', c: 0xF2895A, s: 'ring' },
};
export const PANTRY = ['pao', 'massa', 'molho', 'arroz', 'batata', 'limao', 'ervas', 'manjericao'];
export const CHILL = ['carne', 'queijo', 'alface', 'tomate', 'mussarela', 'salmao', 'manteiga', 'camarao'];

export const RECIPES = [
  { id: 'burger', name: 'Hambúrguer Gourmet', need: ['pao', 'carne', 'queijo', 'alface', 'tomate'], chops: 3, zone: .24, cook: { speed: 9, ideal: 62, tol: 9 }, limit: 150, base: 80, bonus: 120, unlock: 0, raw: 0xB0453A, done: 0x6B3A22 },
  { id: 'pizza', name: 'Pizza Artesanal', need: ['massa', 'molho', 'mussarela', 'manjericao', 'tomate'], chops: 3, zone: .19, cook: { speed: 7, ideal: 70, tol: 8 }, limit: 170, base: 120, bonus: 180, unlock: 2, raw: 0xF1E3C2, done: 0xD99A4A },
  { id: 'salmao', name: 'Salmão ao Molho de Ervas', need: ['salmao', 'ervas', 'limao', 'manteiga', 'batata'], chops: 4, zone: .15, cook: { speed: 10, ideal: 58, tol: 6 }, limit: 170, base: 180, bonus: 260, unlock: 4, raw: 0xF08A6A, done: 0xD9784A },
  { id: 'risoto', name: 'Risoto de Camarão', need: ['arroz', 'camarao', 'queijo', 'manteiga', 'ervas'], chops: 4, zone: .12, cook: { speed: 6, ideal: 72, tol: 6 }, limit: 190, base: 260, bonus: 380, unlock: 7, raw: 0xF4F1EA, done: 0xE8C77A },
];

export const STEPS = [['collect', 'Pegar os ingredientes'], ['chop', 'Cortar na bancada da ilha'], ['cook', 'Cozinhar e tirar no ponto'], ['plate', 'Empratar no passa-pratos'], ['serve', 'Servir na mesa'], ['eat', 'Avaliação do cliente']];

/* Ritmos e constantes de balanceamento do legado (segundos de simulação) */
export const TIMING = {
  dayLength: 240,
  firstGuestAfter: 4, guestInterval: [15, 30], adsFactor: .6, maxQueue: 6, maxGuests: 16,
  patienceBase: 75, patienceRecep: [15, 30, 45], patienceLight: 10,
  roomStay: 22, eatTime: 9, poolStay: 26, drinkEvery: 5,
  stoveCookTime: 14, chefSpeedup: .75, stoveBoost: .3,
  recepEvery: [8, 5, 3], maidPieceEvery: 2.5, maidCooldown: [20, 14, 10], waiterScan: 4,
  dirtFirst: 40, dirtInterval: [40, 65],
  crisisRoll: 45, crisisChance: .4, crisisMax: 2, crisisRepDrain: .04,
  repairHold: 3, repairZone: .22,
};
