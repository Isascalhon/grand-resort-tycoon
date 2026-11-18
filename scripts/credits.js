/* Gera ASSETS.md (créditos e licenças) a partir dos manifestos de texturas/HDRIs e de fontes.
   Chamado ao fim de `bun run assets` e de `bun run fonts`; não edite o ASSETS.md à mão. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CODE = [
  ['three.js', 'MIT', 'three.js authors', 'Motor 3D (renderização, carregadores, pós-processamento)', 'https://github.com/mrdoob/three.js'],
  ['three-mesh-bvh', 'MIT', 'Garrett Johnson', 'Colisão do personagem e raycast acelerado', 'https://github.com/gkjohnson/three-mesh-bvh'],
  ['EZ-Tree', 'MIT', 'Daniel Greenheck', 'Referência do algoritmo de árvores (adaptado em `src/vegetation`; o pacote não vai para o jogo)', 'https://github.com/dgreenheck/ez-tree'],
  ['opentype.js', 'MIT', 'opentype.js contributors', 'Conversão das fontes para texto 3D (só no build)', 'https://github.com/opentypejs/opentype.js'],
  ['Vite', 'MIT', 'VoidZero Inc. e colaboradores', 'Empacotamento (só no build)', 'https://github.com/vitejs/vite'],
];

const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const row = cols => `| ${cols.map(cell).join(' | ')} |`;

function readJson(root, path) {
  const file = join(root, path);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

export function writeCredits(root) {
  const assets = readJson(root, 'public/res/assets.json');
  const fonts = readJson(root, 'public/res/fonts/fonts.json');
  const out = [
    '# Créditos e licenças',
    '',
    'O jogo usa apenas material com licença livre (CC0, OFL ou MIT). Este arquivo é gerado por',
    '`bun run assets` e `bun run fonts` a partir de `public/res/assets.json` e `public/res/fonts/fonts.json`.',
    '',
    '## Código',
    '',
    row(['Projeto', 'Licença', 'Autoria', 'Uso', 'Fonte']),
    row(['---', '---', '---', '---', '---']),
    ...CODE.map(c => row(c)),
    '',
  ];
  if (assets) {
    out.push('## Texturas PBR e HDRIs — Poly Haven (CC0)', '',
      'Domínio público ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)); os créditos abaixo são cortesia.', '',
      row(['Asset', 'Tipo', 'Autoria', 'Arquivos', 'Página']), row(['---', '---', '---', '---', '---']));
    for (const a of assets.items) {
      out.push(row([`${a.name} (\`${a.slug}\`)`, a.type === 'hdri' ? 'HDRI' : 'textura', a.authors.join(', '),
        a.files.map(f => `${f.map} ${a.resolution}`).join(', '), `https://polyhaven.com/a/${a.slug}`]));
    }
    out.push('');
  }
  out.push('## Fontes (SIL Open Font License 1.1)', '',
    'Interface: Gloock e Outfit, via `@fontsource` (arquivos WOFF/WOFF2 empacotados pelo Vite).', '');
  if (fonts) {
    out.push('Texto 3D (letreiros): convertidas para typeface JSON por `scripts/build-fonts.js`, sem alterar os desenhos;',
      'o texto da licença acompanha cada arquivo em `public/res/fonts/`.', '',
      row(['Fonte', 'Uso', 'Copyright', 'Origem', 'Arquivo']), row(['---', '---', '---', '---', '---']));
    for (const f of fonts) out.push(row([f.family + (f.renamed ? ' (renomeada)' : ''), f.use, f.copyright, f.source, `${f.file} + ${f.licenseFile}`]));
    out.push('');
  }
  writeFileSync(join(root, 'ASSETS.md'), out.join('\n'));
}
