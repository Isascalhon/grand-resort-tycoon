/* Planta de referência do Grand Resort (1 unidade = 1 m). Frente do prédio voltada para +z (a avenida).
   As torres têm a fachada em z = 0; o núcleo central fica recuado até z = −4 e sobe um andar além delas. */

export const PLAN = {
  groundHeight: 5.6,          // térreo (pé-direito do lobby)
  floorHeight: 3.4,           // andar de hóspedes
  maxFloors: 10,
  roomsPerFloor: 8,
  depth: 22,                  // z de 0 (frente) a −22 (fundos)
  towers: [{ x0: -24, x1: -8 }, { x0: 8, x1: 24 }],
  core: { x0: -8, x1: 8, front: -4, extraFloors: 1 },
  bay: { front: 6, side: 8 }, // janelas por face de torre (3 por quarto)
  window: { w: 1.5, h: 1.9, sill: .85, depth: .28 },
  corridor: { z0: -12.2, z1: -9.8 },
  canopy: { cx: 0, cz: 3, rx: 9, rz: 7, y: 5.6, thick: .55 },
  pavilion: { rx: 6, rz: 4, h: 3.2 },
  plaza: { z0: 0, z1: 26, x0: -34, x1: 34 },
  sidewalk: { z0: 26, z1: 30 },
  avenue: { z0: 30, z1: 44 },
};

/* Altura do topo da torre (sem coroamento) para um número de andares */
export const towerTop = floors => PLAN.groundHeight + floors * PLAN.floorHeight;
export const coreTop = floors => towerTop(floors + PLAN.core.extraFloors);
