/* Presets de qualidade gráfica. "auto" escolhe pelo aparelho; o jogador pode trocar nas configurações.
   ao: false | 'half' (8 amostras) | 'full' (16). interiors: quartos com profundidade falsa atrás das janelas.
   city: quarteirões vizinhos (0 nenhum, 1 perto, 2 perto e longe). people: pedestres na cena. */

export const QUALITY = {
  low: {
    id: 'low', label: 'Baixa', pixelRatio: 1, shadows: false, shadowSize: 1024, ao: false, bloom: true, smaa: false, grade: true,
    anisotropy: 2, dynamicLights: 4, treeDetail: .6, drawDistance: 140, interiors: false, city: 1, people: 20, props: .5,
  },
  medium: {
    id: 'medium', label: 'Média', pixelRatio: 1.5, shadows: true, shadowSize: 2048, ao: 'half', bloom: true, smaa: true, grade: true,
    anisotropy: 4, dynamicLights: 8, treeDetail: 1, drawDistance: 220, interiors: true, city: 2, people: 50, props: 1,
  },
  high: {
    id: 'high', label: 'Alta', pixelRatio: 2, shadows: true, shadowSize: 4096, ao: 'full', bloom: true, smaa: true, grade: true,
    anisotropy: 8, dynamicLights: 12, treeDetail: 1.4, drawDistance: 320, interiors: true, city: 2, people: 90, props: 1,
  },
};

export function resolveQuality(setting = 'auto') {
  if (QUALITY[setting]) return QUALITY[setting];
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent || '') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
  const cores = nav.hardwareConcurrency || 4, memory = nav.deviceMemory || 4;
  if (mobile || cores <= 4 || memory <= 2) return QUALITY.low;
  if (cores >= 8 && memory >= 8) return QUALITY.high;
  return QUALITY.medium;
}
