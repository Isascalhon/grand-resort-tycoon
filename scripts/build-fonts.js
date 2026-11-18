/* Converte as fontes OFL dos pacotes @fontsource (subconjunto latino, com acentos) para o formato
   typeface JSON do three.js, usado por FontLoader + TextGeometry nos letreiros 3D.
   Uso: bun scripts/build-fonts.js   (rodar de novo só quando a lista de fontes mudar)

   A conversão é a mesma do TTFLoader do three, que em tempo de execução importaria o opentype.js de um
   CDN; aqui ela roda uma vez e o jogo só carrega o JSON, sem rede. Diferença: a caixa delimitadora e o
   sublinhado também são escalados (como no facetype.js), para a altura de linha sair correta. */
import * as opentype from 'opentype.js';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCredits } from './credits.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'res', 'fonts');

export const FONTS = [
  { id: 'pacifico', pkg: '@fontsource/pacifico', file: 'pacifico-latin-400-normal.woff', use: 'Letreiros em script' },
  { id: 'gloock', pkg: '@fontsource/gloock', file: 'gloock-latin-400-normal.woff', use: 'Letreiros serifados (display)' },
  { id: 'outfit-bold', pkg: '@fontsource/outfit', file: 'outfit-latin-700-normal.woff', use: 'Placas e sinalização' },
];

/* Inverte o sentido dos contornos (necessário para fontes CFF, cujo contorno externo é anti-horário) */
function reverseCommands(commands) {
  const paths = [];
  let path;
  for (const c of commands) {
    const type = c.type.toLowerCase();
    if (type === 'm') { path = [c]; paths.push(path); } else if (type !== 'z') path.push(c);
  }
  const reversed = [];
  for (const p of paths) {
    reversed.push({ type: 'm', x: p[p.length - 1].x, y: p[p.length - 1].y });
    for (let i = p.length - 1; i > 0; i--) {
      const c = p[i], r = { type: c.type };
      if (c.x2 !== undefined && c.y2 !== undefined) { r.x1 = c.x2; r.y1 = c.y2; r.x2 = c.x1; r.y2 = c.y1; } else if (c.x1 !== undefined && c.y1 !== undefined) { r.x1 = c.x1; r.y1 = c.y1; }
      r.x = p[i - 1].x; r.y = p[i - 1].y;
      reversed.push(r);
    }
  }
  return reversed;
}

export function convertFont(font, { familyName } = {}) {
  const round = Math.round;
  const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
  const reversed = font.outlinesFormat === 'cff';
  const finite = v => (Number.isFinite(v) ? v : 0);
  const glyphs = {};
  const map = font.encoding.cmap.glyphIndexMap;
  for (const code of Object.keys(map)) {
    const glyph = font.glyphs.get(map[code]);
    if (!glyph) continue;
    const token = { ha: round(finite(glyph.advanceWidth) * scale), x_min: round(finite(glyph.xMin) * scale), x_max: round(finite(glyph.xMax) * scale), o: '' };
    const commands = reversed ? reverseCommands(glyph.path.commands) : glyph.path.commands;
    for (const c of commands) {
      token.o += (c.type === 'C' ? 'b' : c.type.toLowerCase()) + ' ';
      if (c.x !== undefined && c.y !== undefined) token.o += round(c.x * scale) + ' ' + round(c.y * scale) + ' ';
      if (c.x1 !== undefined && c.y1 !== undefined) token.o += round(c.x1 * scale) + ' ' + round(c.y1 * scale) + ' ';
      if (c.x2 !== undefined && c.y2 !== undefined) token.o += round(c.x2 * scale) + ' ' + round(c.y2 * scale) + ' ';
    }
    glyphs[String.fromCodePoint(Number(code))] = token;
  }
  const head = font.tables.head, post = font.tables.post;
  return {
    glyphs,
    familyName: familyName || font.getEnglishName('fullName'),
    ascender: round(font.ascender * scale),
    descender: round(font.descender * scale),
    underlinePosition: round(post.underlinePosition * scale),
    underlineThickness: round(post.underlineThickness * scale),
    boundingBox: { xMin: round(head.xMin * scale), xMax: round(head.xMax * scale), yMin: round(head.yMin * scale), yMax: round(head.yMax * scale) },
    resolution: 1000,
    original_font_information: font.tables.name,
  };
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const f of FONTS) {
    const dir = join(ROOT, 'node_modules', f.pkg);
    const buf = readFileSync(join(dir, 'files', f.file));
    const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const license = readFileSync(join(dir, 'LICENSE'), 'utf8');
    const copyright = license.split(/\r?\n/).find(l => /^copyright/i.test(l.trim()))?.trim() ?? '';
    // A OFL proíbe usar um "Reserved Font Name" em versões modificadas: nesse caso o nome é neutro
    const rfn = /with Reserved Font Names?/i.test(copyright);
    const family = font.getEnglishName('fontFamily');
    const json = convertFont(font, rfn ? { familyName: `Grand Resort ${f.id}` } : {});
    writeFileSync(join(OUT, `${f.id}.typeface.json`), JSON.stringify(json));
    copyFileSync(join(dir, 'LICENSE'), join(OUT, `${f.id}-OFL.txt`));
    const version = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
    manifest.push({ id: f.id, family, use: f.use, file: `${f.id}.typeface.json`, license: 'OFL-1.1', licenseFile: `${f.id}-OFL.txt`,
      copyright, renamed: rfn, source: `${f.pkg}@${version} (${f.file})`, glyphs: Object.keys(json.glyphs).length });
    console.log(`${f.id}: ${Object.keys(json.glyphs).length} glifos, ${family}${rfn ? ' (renomeada: nome reservado)' : ''}`);
  }
  writeFileSync(join(OUT, 'fonts.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeCredits(ROOT);
}

if (import.meta.main) main();
