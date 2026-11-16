/* Categorias de quarto do Grand Resort 2.0 (do Econômico ao Royal Plus).
   Diária, capacidade e estrelas usam os valores do legado como âncora (Standard = Básico,
   Executivo = Executiva, Suíte Presidencial = Presidencial); o balanceamento final é feito no M3/M8. */

export const ROOM_CATEGORIES = [
  { id: 'economico', name: 'Econômico', rate: 80, capacity: 1, stars: 2, minHotelStars: 0 },
  { id: 'standard', name: 'Standard', rate: 120, capacity: 2, stars: 3, minHotelStars: 0 },
  { id: 'superior', name: 'Superior', rate: 200, capacity: 2, stars: 4.5, minHotelStars: 2 },
  { id: 'executivo', name: 'Executivo', rate: 300, capacity: 2, stars: 6, minHotelStars: 4 },
  { id: 'luxo', name: 'Luxo', rate: 450, capacity: 3, stars: 7, minHotelStars: 5 },
  { id: 'premium', name: 'Suíte Premium', rate: 600, capacity: 3, stars: 8, minHotelStars: 6 },
  { id: 'presidencial', name: 'Suíte Presidencial', rate: 800, capacity: 4, stars: 9, minHotelStars: 7 },
  { id: 'royal', name: 'Suíte Royal Plus', rate: 1500, capacity: 4, stars: 10, minHotelStars: 9 },
];

export const CATEGORY_BY_ID = Object.fromEntries(ROOM_CATEGORIES.map(c => [c.id, c]));

/* Nível do quarto no jogo legado → categoria nova */
export const LEGACY_LEVEL_TO_CATEGORY = { 1: 'standard', 2: 'executivo', 3: 'presidencial' };

/* Estados obrigatórios de um quarto */
export const ROOM_STATUS = ['construction', 'available', 'reserved', 'occupied', 'dirty', 'cleaning', 'maintenance', 'blocked'];
export const ROOM_STATUS_LABEL = {
  construction: 'Em construção', available: 'Disponível', reserved: 'Reservado', occupied: 'Ocupado',
  dirty: 'Sujo', cleaning: 'Em limpeza', maintenance: 'Em manutenção', blocked: 'Bloqueado',
};
