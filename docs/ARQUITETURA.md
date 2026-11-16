# Arquitetura do Grand Resort 2.0

## Visão geral

| Página | Papel |
| --- | --- |
| `index.html` | Jogo atual (legado, three r128 por CDN). Copiado byte a byte para `dist/` até a troca no M2 |
| `game.html` → `src/main.js` | Jogo novo (Vite + three 0.187). No M0 mostra o progresso importado |
| `prototype.html` → `src/prototype.js` | Cena de avaliação visual da fachada (M1), separada do jogo |

Build com Vite (`base: './'`, funciona em subpasta do GitHub Pages) e Bun como gerenciador e executor
(sempre `bun --bun run …`). `JOGAR.bat` faz build e abre o `vite preview` em `http://localhost:4173/`.

## Regras
1. **Um único estado**: tudo o que é salvo vive em `GameState` (`src/core/GameState.js`), serializável e versionado.
   Sistemas leem e alteram o estado; a cena 3D é derivada dele e nunca é a fonte da verdade.
2. **Simulação separada da renderização**: `Game` avança a lógica em passos fixos de 1/30 s (até 10 por quadro)
   e desenha uma vez por quadro. Testes chamam `step(segundos)` sem depender do navegador desenhar.
3. **Erros isolados**: cada sistema roda em `try/catch`; um erro vira aviso e contagem, não congela o jogo.
4. **Sem dependências circulares**: `core` não importa nada de `rendering`, `world` ou `ui`.
5. **GPU com dono**: texturas, geometrias e materiais são criados e descartados por um ponto central (`AssetManager`).
6. **Dados fora do código**: balanceamento, catálogos e plantas ficam em `src/data/`.

## Módulos

| Pasta | Conteúdo |
| --- | --- |
| `src/core` | `Game` (laço), `GameState` (estado v3 + validação), `GameClock` (dia de 240 s), `EventBus`, `Random` (semente), `SaveManager`, `LegacyImport` |
| `src/data` | Tabelas do legado (`legacy.js`), categorias e estados de quarto (`rooms.js`); depois plantas, receitas, cargos |
| `src/rendering` | `Renderer` (sRGB, ACES, sombras), `Quality` (Baixa/Média/Alta), `AssetManager` (texturas, HDRI, fontes) |
| `src/ui` | Utilitários de DOM (`dom.js`) e, depois, HUD, painéis e modais |
| `src/styles` | Identidade visual (paleta violeta, lilás, dourado e rubi; Gloock e Outfit) |
| Próximos | `architecture` (fachada), `vegetation`, `city`, `hotel`, `player`, `world` (colisão e navegação), `guests`, `services`, `kitchen`, `economy`, `progression` |

## Salvamento
- IndexedDB (`grand-resort`, store `saves`): `auto`, `manual-1..3`, `backup` (a cada 5 min) e `corrompido-<data>`.
- Ordem ao abrir: save automático → progresso do jogo atual (só leitura) → jogo novo.
- Save ilegível nunca é apagado: vira `corrompido-<data>` e o jogo segue com o próximo da lista.
- Trava entre abas (Web Locks): só a primeira aba grava; as outras ficam em modo leitura.
- Exportar e importar JSON (formato `grand-resort-save`; também aceita o texto do save do jogo atual).

## Assets
- `bun run assets` (`scripts/fetch-assets.js`): texturas PBR e HDRIs CC0 da Poly Haven, com md5, em `public/res/`.
- `bun run fonts` (`scripts/build-fonts.js`): fontes OFL convertidas para typeface JSON (texto 3D sem CDN).
- Créditos gerados em `ASSETS.md`. Só entram licenças CC0, OFL ou MIT.

## Testes
- `bun test tests/unit`: lógica pura (relógio, estado, importação do save, fontes 3D).
- `python tests/run.py`: unidade + build + e2e no Chromium contra o `vite preview` + regressão do jogo atual.
  - O Chromium de teste usa ANGLE + SwiftShader e não aguenta desenho contínuo: as páginas abrem com `?test=1`,
    o `requestAnimationFrame` é anulado e a lógica avança por `__GAME__.step()`.
  - **Toda espera usa `wait_for_function(..., polling=100)`**: o padrão (`'raf'`) nunca repete a checagem com o
    `requestAnimationFrame` anulado.
- `tests/visual/` (M1): fotos de pontos de câmera em `artifacts/` para revisão antes de cada commit visual.
