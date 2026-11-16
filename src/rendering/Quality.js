/* Presets de qualidade gráfica. "auto" escolhe pelo aparelho; o jogador pode trocar nas configurações. */

export const QUALITY = {
  low: {
    id: 'low', label: 'Baixa', pixelRatio: 1, shadows: false, shadowSize: 1024, ao: false, bloom: true, smaa: false,
    anisotropy: 2, dynamicLights: 4, treeDetail: .6, drawDistance: 140,
  },
  medium: {
    id: 'medium', label: 'Média', pixelRatio: 1.5, shadows: true, shadowSize: 2048, ao: false, bloom: true, smaa: true,
    anisotropy: 4, dynamicLights: 8, treeDetail: 1, drawDistance: 220,
  },
  high: {
    id: 'high', label: 'Alta', pixelRatio: 2, shadows: true, shadowSize: 4096, ao: true, bloom: true, smaa: true,
    anisotropy: 8, dynamicLights: 12, treeDetail: 1.4, drawDistance: 320,
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
