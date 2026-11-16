/* Baixa as texturas PBR e os HDRIs CC0 da Poly Haven usados pelo jogo e gera o manifesto e os créditos.
   Uso: bun scripts/fetch-assets.js [--grupo exterior,interior] [--todos]
   - URLs, md5 e autores vêm da API oficial (https://api.polyhaven.com), porque os nomes dos arquivos variam;
   - idempotente: arquivo existente com md5 correto não é baixado de novo;
   - o jogo nunca chama a API: só carrega os arquivos já salvos em public/res. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCredits } from './credits.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'public', 'res');
const MANIFEST = join(RES, 'assets.json');
const API = 'https://api.polyhaven.com';
const HEADERS = { 'User-Agent': 'grand-resort-tycoon-assets/1.0 (jogo open source; download unico por asset)' };
const RESOLUTION = '1k';
const PARALLEL = 4;

/* Mapas de cada textura: cor (diff), normal OpenGL (nor) e oclusão/rugosidade/metal num só arquivo (arm).
   Se o asset não tiver "arm", a rugosidade vem sozinha (rough). */
const MAPS = [['diff', 'Diffuse'], ['nor', 'nor_gl'], ['arm', 'arm']];
const ROUGH_FALLBACK = ['rough', 'Rough'];

export const CATALOG = {
  exterior: {
    textures: ['concrete_floor_02', 'asphalt_02', 'concrete_pavers', 'large_grey_tiles', 'terrazzo_tiles', 'marble_01',
      'white_stucco', 'bark_brown_02', 'pine_bark', 'palm_bark', 'leafy_grass'],
    hdris: ['wide_street_01', 'venice_sunset', 'cobblestone_street_night'],
  },
  interior: {
    textures: ['wooden_floor_02', 'oak_wood_planks', 'herringbone_parquet', 'dark_wood', 'walnut_veneer', 'velour_velvet',
      'wool_boucle', 'poly_wool_herringbone', 'rough_linen', 'brown_leather', 'beige_wall_001', 'long_white_tiles', 'interior_tiles'],
    hdris: [],
  },
};

const md5 = bytes => createHash('md5').update(bytes).digest('hex');

async function api(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API ${path}: HTTP ${res.status}`);
  return res.json();
}

/* Baixa um arquivo conferindo o md5; até 3 tentativas. Devolve true se baixou, false se já estava certo. */
async function download(entry, dest) {
  if (existsSync(dest) && md5(readFileSync(dest)) === entry.md5) return false;
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(entry.url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (md5(bytes) !== entry.md5) throw new Error('md5 não confere');
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, bytes);
      return true;
    } catch (e) { last = e; }
  }
  throw new Error(`${entry.url}: ${last.message}`);
}

async function pool(tasks, size) {
  const results = [];
  let next = 0;
  const worker = async () => { while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); } };
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker));
  return results;
}

/* Monta a lista de arquivos de um asset a partir da API */
async function plan(slug, type, group) {
  const [files, info] = await Promise.all([api(`/files/${slug}`), api(`/info/${slug}`)]);
  const item = { slug, name: info.name, type, group, authors: Object.keys(info.authors || {}), resolution: RESOLUTION, files: [] };
  const jobs = [];
  if (type === 'hdri') {
    const entry = files.hdri?.[RESOLUTION]?.hdr;
    if (!entry) throw new Error(`${slug}: sem HDR ${RESOLUTION}`);
    jobs.push({ map: 'hdr', entry, path: `hdri/${slug}.hdr` });
  } else {
    const maps = files.arm ? MAPS : [...MAPS.slice(0, 2), ROUGH_FALLBACK];
    for (const [map, key] of maps) {
      const entry = files[key]?.[RESOLUTION]?.jpg;
      if (!entry) throw new Error(`${slug}: sem ${key} ${RESOLUTION} em JPG`);
      jobs.push({ map, entry, path: `tex/${slug}/${map}.jpg` });
    }
  }
  item.files = jobs.map(j => ({ map: j.map, path: j.path, md5: j.entry.md5, size: Number(j.entry.size) }));
  return { item, jobs };
}

async function main() {
  const args = process.argv.slice(2);
  const groupArg = args.includes('--grupo') ? args[args.indexOf('--grupo') + 1] : 'exterior';
  const groups = args.includes('--todos') ? Object.keys(CATALOG) : groupArg.split(',');
  for (const g of groups) if (!CATALOG[g]) throw new Error(`grupo desconhecido: ${g} (use ${Object.keys(CATALOG).join(', ')})`);

  const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')).items : [];
  const items = new Map(previous.map(i => [i.slug, i]));
  const failures = [];
  let downloaded = 0, skipped = 0, bytes = 0;

  for (const group of groups) {
    const wanted = [...CATALOG[group].textures.map(s => [s, 'texture']), ...CATALOG[group].hdris.map(s => [s, 'hdri'])];
    console.log(`== ${group}: ${wanted.length} assets`);
    const plans = await pool(wanted.map(([slug, type]) => async () => {
      try { return await plan(slug, type, group); } catch (e) { failures.push(e.message); return null; }
    }), PARALLEL);
    const jobs = plans.filter(Boolean).flatMap(p => p.jobs.map(j => ({ ...j, slug: p.item.slug })));
    const failedSlugs = new Set();
    await pool(jobs.map(j => async () => {
      try {
        if (await download(j.entry, join(RES, j.path))) { downloaded++; bytes += Number(j.entry.size); } else skipped++;
      } catch (e) { failures.push(e.message); failedSlugs.add(j.slug); }
    }), PARALLEL);
    for (const p of plans.filter(Boolean)) {
      if (failedSlugs.has(p.item.slug)) continue;
      items.set(p.item.slug, p.item);
      console.log(`   ${p.item.slug.padEnd(26)} ${p.item.files.map(f => f.map).join(', ')}`);
    }
  }

  const sorted = [...items.values()].sort((a, b) => a.group.localeCompare(b.group) || a.type.localeCompare(b.type) || a.slug.localeCompare(b.slug));
  writeFileSync(MANIFEST, JSON.stringify({ source: 'Poly Haven (https://polyhaven.com) — CC0 1.0', items: sorted }, null, 2) + '\n');
  writeCredits(ROOT);
  const total = sorted.reduce((s, i) => s + i.files.reduce((t, f) => t + f.size, 0), 0);
  console.log(`baixados ${downloaded} (${(bytes / 1048576).toFixed(1)} MB), já atualizados ${skipped}; total em disco ${(total / 1048576).toFixed(1)} MB`);
  if (failures.length) {
    console.error(`FALHAS (${failures.length}):\n - ${failures.join('\n - ')}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
