# Histórico de mudanças

## 2.0.0-dev — Grand Resort 2.0 (em construção)

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
