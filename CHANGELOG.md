# Histórico de mudanças

## Jogo atual (index.html)

### Caminhada, falas e sonoplastia (18/11/2026)
- Caminhada com ciclo de marcha real: joelho dobra no balanço e estica no toque do calcanhar, pés acompanham, braço
  oposto à perna, bacia sobe no apoio, peso passa de um pé ao outro, arranque suave e cadência pela velocidade.
  Velocidade por tipo de hóspede. Personagens estáticos ganham esqueleto automático de pernas.
- Recepcionista com voz (speechSynthesis em português): boas-vindas, check-in, campainha, fila, desistência,
  checkout, telefone da recepção e dicas.
- Sonoplastia: barramento com compressor e reverb por ambiente, ambiências por zona, eventos (pássaros, grilos,
  carros, taças, mergulhos, fliperama), música lounge de bossa, passos por piso com estéreo, portas e efeitos
  refeitos. Tecla M liga e desliga o som.

### Personagens e modelos 3D (18/11/2026)
- Todos os modelos de `public/res/models` em uso: seis hóspedes (dois com esqueleto) escolhidos pela persona, arbustos
  do jardim e das floreiras, conjuntos espreguiçadeira + guarda-sol no deck e carrinhos de limpeza no corredor.
- NPCs olham para o jogador quando ele chega perto (corpo e, nos modelos com esqueleto, pescoço e cabeça).
- Recepcionista cumprimenta com reverência, sino e saudação pela hora do jogo; equipe e hóspedes têm falas curtas.
- Modelos estáticos andam com balanço e voltam ao boneco articulado para sentar e deitar.

### Recepção, pool bar, drinques e comandas (18/11/2026)
- Recepção: sofás de veludo com almofadas soltas e pés de latão, poltronas SheenChair (modelo dos exemplos do three.js),
  mesa de centro de mármore e latão com bandeja, livros e orquídea, tapete com borda e luminária Iridescence no balcão.
- Novo lustre de cristal em cascata (três aros, gotas em vidro físico instanciadas, braços com lâmpadas-vela).
- Cozinha: pendente linear de LED sobre a ilha e pendentes industriais de esmalte sobre a bancada.
- Pool bar: frente em ripas de madeira, tampo de pedra envernizado, apoio de pés de latão, fita de LED, garrafas reais
  no back-bar, taças penduradas, frutas, coqueteleira, balde de gelo e arandelas Barn Lamp nas colunas.
- Estação de drinques em 6 etapas (comanda, copo, bebidas e dose, gelo e preparo, acessórios, conferência) com prévia 3D;
  12 copos, 22 ingredientes, 14 acessórios e 13 receitas. Pedidos de acordo com o cliente (criança sem álcool, executivo
  discreto, VIP com cristal e flor, mochileiro sem frescura) e observações (sem açúcar, sem gelo, alergia a morango).
  Nota de 0 a 100 define pagamento, gorjeta e reputação.
- Cozinha: comandas numeradas com observações, alergias, prioridade VIP, prazo e cronômetro; monitor de comandas (KDS)
  no passe e painel no HUD (tecla C) com botão para priorizar.

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
