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

## Texturas PBR e HDRIs — Poly Haven (CC0)

Domínio público ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)); os créditos abaixo são cortesia.

| Asset | Tipo | Autoria | Arquivos | Página |
| --- | --- | --- | --- | --- |
| Cobblestone Street Night (`cobblestone_street_night`) | HDRI | Greg Zaal, Jenelle van Heerden | hdr 1k | https://polyhaven.com/a/cobblestone_street_night |
| Venice Sunset (`venice_sunset`) | HDRI | Greg Zaal | hdr 1k | https://polyhaven.com/a/venice_sunset |
| Wide Street 01 (`wide_street_01`) | HDRI | Sergej Majboroda | hdr 1k | https://polyhaven.com/a/wide_street_01 |
| Asphalt 02 (`asphalt_02`) | textura | Rob Tuytel | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/asphalt_02 |
| Bark Brown 02 (`bark_brown_02`) | textura | Rob Tuytel | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/bark_brown_02 |
| Concrete Floor 02 (`concrete_floor_02`) | textura | Rob Tuytel | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/concrete_floor_02 |
| Concrete Pavers (`concrete_pavers`) | textura | Amal Kumar | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/concrete_pavers |
| Large Grey Tiles (`large_grey_tiles`) | textura | Rob Tuytel | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/large_grey_tiles |
| Leafy Grass (`leafy_grass`) | textura | Charlotte Baglioni | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/leafy_grass |
| Marble 01 (`marble_01`) | textura | Rob Tuytel | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/marble_01 |
| Palm Bark (`palm_bark`) | textura | Charlotte Baglioni | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/palm_bark |
| Pine Bark (`pine_bark`) | textura | Dimitrios Savva | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/pine_bark |
| Terrazzo Tiles (`terrazzo_tiles`) | textura | Amal Kumar | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/terrazzo_tiles |
| White Stucco (`white_stucco`) | textura | Amal Kumar | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/white_stucco |
| Beige Wall 001 (`beige_wall_001`) | textura | Dimitrios Savva, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/beige_wall_001 |
| Brown Leather (`brown_leather`) | textura | Rob Tuytel | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/brown_leather |
| Dark Wood (`dark_wood`) | textura | Dario Barresi, Dimitrios Savva, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/dark_wood |
| Herringbone Parquet (`herringbone_parquet`) | textura | Jenelle van Heerden, Sergej Majboroda | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/herringbone_parquet |
| Interior Tiles (`interior_tiles`) | textura | Charlotte Baglioni | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/interior_tiles |
| Long White Tiles (`long_white_tiles`) | textura | Jenelle van Heerden, Sergej Majboroda | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/long_white_tiles |
| Oak Wood Planks (`oak_wood_planks`) | textura | Dimitrios Savva | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/oak_wood_planks |
| Poly Wool Herringbone (`poly_wool_herringbone`) | textura | colormass, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/poly_wool_herringbone |
| Rough Linen (`rough_linen`) | textura | colormass, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/rough_linen |
| Velour Velvet (`velour_velvet`) | textura | colormass, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/velour_velvet |
| Walnut Veneer (`walnut_veneer`) | textura | Jenelle van Heerden | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/walnut_veneer |
| Wooden Floor 02 (`wooden_floor_02`) | textura | Charlotte Baglioni, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/wooden_floor_02 |
| Wool Boucle (`wool_boucle`) | textura | colormass, Rico Cilliers | diff 1k, nor 1k, arm 1k | https://polyhaven.com/a/wool_boucle |

## Fontes (SIL Open Font License 1.1)

Interface: Gloock e Outfit, via `@fontsource` (arquivos WOFF/WOFF2 empacotados pelo Vite).

Texto 3D (letreiros): convertidas para typeface JSON por `scripts/build-fonts.js`, sem alterar os desenhos;
o texto da licença acompanha cada arquivo em `public/res/fonts/`.

| Fonte | Uso | Copyright | Origem | Arquivo |
| --- | --- | --- | --- | --- |
| Pacifico | Letreiros em script | Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/Pacifico) | @fontsource/pacifico@5.3.0 (pacifico-latin-400-normal.woff) | pacifico.typeface.json + pacifico-OFL.txt |
| Gloock | Letreiros serifados (display) | Copyright 2022 The Gloock Project Authors (https://github.com/duartp/gloock) | @fontsource/gloock@5.3.0 (gloock-latin-400-normal.woff) | gloock.typeface.json + gloock-OFL.txt |
| Outfit | Placas e sinalização | Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts) | @fontsource/outfit@5.3.0 (outfit-latin-700-normal.woff) | outfit-bold.typeface.json + outfit-bold-OFL.txt |

## Piso da cozinha (checker_floor)

- `public/res/tex/checker_floor/diff.jpg` e `nor.jpg`: texturas `FloorsCheckerboard_S_Diffuse.jpg` e `FloorsCheckerboard_S_Normal.jpg` dos exemplos oficiais do three.js (https://threejs.org/examples/textures/floors/), distribuídas no repositório mrdoob/three.js (licença MIT).
