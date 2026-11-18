import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FONTS } from '../../scripts/build-fonts.js';

const load = id => JSON.parse(readFileSync(new URL(`../../public/res/fonts/${id}.typeface.json`, import.meta.url), 'utf8'));

describe('Fontes 3D (typeface JSON gerado por scripts/build-fonts.js)', () => {
  for (const { id } of FONTS) {
    test(`${id}: letreiro e acentos geram geometria`, () => {
      const json = load(id);
      for (const ch of 'GRANDESOTLUXYH&ÇÃÉÔçãéô?') expect(json.glyphs[ch]).toBeDefined();
      const font = new FontLoader().parse(json);
      for (const text of ['GRAND RESORT', 'Ação Ç ã é ô']) {
        const g = new TextGeometry(text, { font, size: 1, depth: .2, curveSegments: 4 });
        g.computeBoundingBox();
        expect(g.attributes.position.count).toBeGreaterThan(300);
        expect(g.boundingBox.max.x - g.boundingBox.min.x).toBeGreaterThan(text.length * .3);
        g.dispose();
      }
    });

    test(`${id}: contornos no sentido certo (o "O" tem um furo)`, () => {
      const shapes = new FontLoader().parse(load(id)).generateShapes('O', 1);
      expect(shapes.length).toBe(1);
      expect(shapes[0].holes.length).toBe(1);
    });
  }
});
