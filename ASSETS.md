# Créditos e licenças

O jogo usa apenas material com licença livre (CC0, OFL ou MIT). Este arquivo é gerado por
`bun run assets` e `bun run fonts` a partir de `public/res/assets.json` e `public/res/fonts/fonts.json`.

## Código

| Projeto | Licença | Autoria | Uso | Fonte |
| --- | --- | --- | --- | --- |
| three.js | MIT | three.js authors | Motor 3D (renderização, carregadores, pós-processamento) | https://github.com/mrdoob/three.js |
| three-mesh-bvh | MIT | Garrett Johnson | Colisão do personagem e raycast acelerado | https://github.com/gkjohnson/three-mesh-bvh |
| EZ-Tree | MIT | Daniel Greenheck | Referência do algoritmo de árvores (adaptado em `src/vegetation`; o pacote não vai para o jogo) | https://github.com/dgreenheck/ez-tree |
| opentype.js | MIT | opentype.js contributors | Conversão das fontes para texto 3D (só no build) | https://github.com/opentypejs/opentype.js |
| Vite | MIT | VoidZero Inc. e colaboradores | Empacotamento (só no build) | https://github.com/vitejs/vite |

## Fontes (SIL Open Font License 1.1)

Interface: Gloock e Outfit, via `@fontsource` (arquivos WOFF/WOFF2 empacotados pelo Vite).

Texto 3D (letreiros): convertidas para typeface JSON por `scripts/build-fonts.js`, sem alterar os desenhos;
o texto da licença acompanha cada arquivo em `public/res/fonts/`.

| Fonte | Uso | Copyright | Origem | Arquivo |
| --- | --- | --- | --- | --- |
| Pacifico | Letreiros em script | Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/Pacifico) | @fontsource/pacifico@5.3.0 (pacifico-latin-400-normal.woff) | pacifico.typeface.json + pacifico-OFL.txt |
| Gloock | Letreiros serifados (display) | Copyright 2022 The Gloock Project Authors (https://github.com/duartp/gloock) | @fontsource/gloock@5.3.0 (gloock-latin-400-normal.woff) | gloock.typeface.json + gloock-OFL.txt |
| Outfit | Placas e sinalização | Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts) | @fontsource/outfit@5.3.0 (outfit-latin-700-normal.woff) | outfit-bold.typeface.json + outfit-bold-OFL.txt |
