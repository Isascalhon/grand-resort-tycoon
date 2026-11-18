import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/* O jogo legado (index.html na raiz) usa scripts clássicos via CDN e roda sem build:
   ele é copiado byte a byte para dist/, sem nenhuma transformação do Vite. */
function copyLegacy() {
  return {
    name: 'copy-legacy',
    apply: 'build',
    writeBundle(options) {
      const out = options.dir || resolve(root, 'dist');
      mkdirSync(out, { recursive: true });
      copyFileSync(resolve(root, 'index.html'), resolve(out, 'index.html'));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyLegacy()],
  build: {
    target: 'es2022',
    assetsDir: 'build',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        game: resolve(root, 'game.html'),
        prototype: resolve(root, 'prototype.html'),
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
});
