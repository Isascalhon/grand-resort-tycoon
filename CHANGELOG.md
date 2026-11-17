# Histórico de mudanças

## 2.0.0-dev — Grand Resort 2.0 (em construção)

### M1 — Protótipo da fachada (16/11/2026, aguardando aprovação)
- `prototype.html`: câmera orbital, painel com 3/6/10 andares, hora do dia e qualidade, e 6 vistas prontas.
- Fachada em camadas: praça com fonte, torres lilás com janelas modulares instanciadas e telhado mansarda,
  núcleo violeta e bronze com lobby envidraçado e portas automáticas, marquise elíptica com ~3.400 lâmpadas,
  pavilhão de vidro facetado, letreiros 3D e curvas douradas.
- Luz por hora: sol e sombras, céu, reflexos HDRI, janelas e letreiros que acendem à noite, poças de luz dos postes.
- Vegetação procedural com vento e LOD (carvalhos, bordos, ciprestes, palmeiras, arbustos) e trânsito com seis tipos de carro.
- Orçamento no preset Média com 10 andares: ~200 draw calls e ~1 M de triângulos (limite: 600 e 2 M).
- `tests/visual/shoot.py` (fotos de revisão) e e2e do M1.

### M0 — Fundação (16/11/2026)
- Projeto modular com Vite 8 + three.js 0.187, Bun e build estático compatível com GitHub Pages.
- Núcleo: laço em passo fixo separado da renderização, estado único versionado (v3) com validação,
  relógio do dia, eventos e números aleatórios com semente.
- Salvamento em IndexedDB com save automático, 3 manuais e backup; save ilegível preservado; trava entre abas;
  exportar e importar JSON.
- Importação do progresso do jogo atual (save v2) sem alterar o save antigo.
- `JOGAR.bat` para abrir o jogo com duplo clique.
- Texturas PBR e HDRIs CC0 (Poly Haven) e fontes OFL para letreiros 3D, com créditos em `ASSETS.md`.
- Testes: unidade (Bun), e2e no navegador (Playwright) e a regressão do jogo atual numa só execução.
- Documentação do porte (`docs/PORTE.md`) e da arquitetura (`docs/ARQUITETURA.md`).

## Jogo atual (`index.html`)

### Fase 1 — Estabilização (12/11/2026)
- O laço do jogo sobrevive a erros; save ilegível não é sobrescrito.
- Salários sem caixa negativo (o que falta vira dívida); limpeza sem duplicar sujeira; camareira não entra em quarto ocupado.
- Liberação de memória da GPU ao refazer NPCs e objetos.

### Expansão do hotel
- 2º andar com suítes à venda, escada com patamar e corrimãos, hóspedes e camareira no andar de cima.
- Cidade ao redor do hotel, texturas PBR feitas por código, palmeiras e arbustos novos.
- Comidas e partículas na cozinha.
