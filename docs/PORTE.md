# Porte do jogo atual para o Grand Resort 2.0

Referência do M2 (paridade): tudo o que o `index.html` atual faz e precisa existir no jogo novo, com os valores
exatos. As **tabelas numéricas** já estão em [`src/data/legacy.js`](../src/data/legacy.js), que é a fonte única;
aqui ficam as fórmulas, as regras, a interface e as peculiaridades a corrigir.

## 1. Tabelas (em `src/data/legacy.js`)

| Tabela | Conteúdo |
| --- | --- |
| `PRICE`, `RATE`, `ROOM_STARS` | Compra, diária e estrelas dos níveis 1–3 (Básico, Executiva, Presidencial) |
| `LEVEL`, `STARS_FOR_LEVEL` | Nomes dos níveis e estrelas do hotel exigidas para evoluir |
| `STAGES` | Etapas do hotel: Ruína (0★), Limpeza & Reparo (1★), Modernização (4★), Alto Padrão (7★) |
| `CLIENT_TYPES` | Mochileiro, família, executivo e VIP: exigência, orçamento, noites, etapa mínima e peso |
| `BRANCHES`, `PARTNERS` | Filiais (cidade, ilha, montanha, deserto, floresta) e parceiros (anúncios, fornecedor) |
| `ROLES`, `UPGRADES` | Cargos (custo, salário, máximo, níveis de treino) e melhorias (bar, piso, iluminação) |
| `INGR`, `PANTRY`, `CHILL`, `RECIPES`, `STEPS` | Ingredientes, despensa, refrigerados, receitas e etapas da cozinha |
| `TIMING` | Todos os tempos da simulação (dia de 240 s, fila, paciência, limpeza, crises, reparo…) |
| `NAMES` | 20 nomes de funcionários e hóspedes |

## 2. Fórmulas e regras

### Hospedagem
- **Avaliação do quarto** (`reviewOf(p, room)`): `need = exig / 10`, `total = RATE[level] * noites`.
  - sujo, ou `ROOM_STARS[level] < need` → **ruim**: paga `round(total * .4)`, reputação −5 ("Quarto sujo" / "Abaixo da exigência");
  - `RATE[level] > budget` → **acima do orçamento**: paga `round(total * .8)`, reputação 0;
  - senão → **perfeito**: paga `total`, reputação +2.
  - A estadia inteira é paga no check-in.
- **Escolha do quarto** (`bestRoomFor`): quartos comprados e sem hóspede (sujos incluídos), ordenados por
  perfeito > acima > ruim e, no empate, pelo maior pagamento. O check-in automático da recepcionista recusa quarto "ruim".
- **Gorjeta** no restaurante: `round((RATE[level] * .2 + 5 + rand * 10) * (pisoNovo ? 1.15 : 1))`.
- **Moedas na mesa**: `min(qtdMoedas, max(1, ceil(valor / 8)))`.
- **Drinks na piscina** (com a melhoria do bar), a cada 5 s: espreguiçadeira `+ (4 + 2 * lv)` e bar `+ (2 + 2 * lv)`,
  onde `lv` é o nível usado pelo legado nesse cálculo (conferir no código ao portar).

### Salários e dívida (fim do dia)
- `devido = Σ salário × quantidade + dívida`; `pago = min(devido, max(0, caixa))`; `dívida = round(devido − pago)`.
- Se sobrar dívida: reputação −2. O caixa nunca fica negativo por salário.

### Cozinha — nota da receita (`rateMission`)
- `ing = max(0, 1 − erros * .2)`; `corte = acertos / (necessários + falhas)`; `ponto = queimou ? 0 : doneness`,
  com `doneness = d <= tol ? 1 : max(0, 1 − (d − tol) / 30)`.
- `tempo = fração <= .55 ? 1 : max(0, 1 − (fração − .55) / .45)`.
- `total = .3 * ing + .15 * corte + .3 * ponto + .25 * tempo`; estrelas: 5 se `total >= .9`, senão `clamp(round(total * 5), 1, 4)`.
- Dinheiro: `round(base * (.4 + .15 * estrelas) * (pisoNovo ? 1.15 : 1)) + (5★ ? bônus : 0)`.
- Reputação por estrelas: 5★ +5, 4★ +3, 3★ +1, 2★ −1, 1★ −3. Amizade da Chef: +2 em 5★, +1 em 4★ (máximo 10).

### Minijogo de corte
- Agulha: velocidade `2.4 + índiceDaReceita * .45`; posição `(sin((T − t0) * velocidade − π/2) + 1) / 2`.
- A faixa verde recentraliza em `.15 + rand * .7` após cada acerto ou falha.
- Termina com `acertos >= necessários` ou `acertos + falhas >= necessários + 3`.

### Reparos e crises
- Crises: vazamento, cano e lâmpada (50/50 entre o térreo e o corredor de cima); cada crise ativa tira .04 de reputação por segundo.
- Reparo: agulha vai e volta com velocidade `1.1 + rand * .6`; faixa de largura .22 centrada em `.2 + rand * .6`;
  segurar 3 s dentro da faixa; fora dela o progresso cai `.5 * dt`. Conclusão: +$40 e reputação +2.

### Limpeza e sujeira
- Jogador: +$5 por sujeira; quarto limpo dá +$10 e reputação +1 (+1 extra com camareira nível ≥ 2).
- Sujeira periódica: um quarto comprado, livre e desocupado recebe `1 + floor(rand * 2)` sujeiras.
- `dirtyRoom` sem quantidade (checkout) adiciona 3–5 sujeiras e uma teia.

### Hotel Plus
- Com 10★, a filial atual ganha o selo `plus[filial] = true`.

## 3. Reputação (variações)

| Evento | Δ | Evento | Δ |
| --- | --- | --- | --- |
| Compra ou evolução de quarto | +3 | Fila abandonada | −4 |
| Quarto limpo | +1 | Dívida no fim do dia | −2 |
| Check-in perfeito / acima / ruim | +2 / 0 / −5 | Melhoria de piso | +5 |
| Refeição servida | +1 | Melhoria de iluminação | +4 |
| Checkout | +1 | Receita fora do tempo | −3 |
| Crise reparada | +2 | Receita cancelada | −1 |

## 4. Save v2 (`localStorage["grand_resort_save"]`)

Campos: `v` (2), `money`, `rep`, `day`, `t`, `elapsed`, `incomeToday`, `expenseToday`, `served`, `debt`, `friend`,
`guestSeq`, `upg {bar, floor, light}`, `staff {recep, maid, chef, waiter}`, `staffLv {recep, maid}`, `branch`,
`owned`, `plus`, `partners {adsT, supplier}`, `rooms` (4 × `{owned, level}`), `upper` (3 × `{owned, level}`), `log` (até 40).

- Saves anteriores a `7135eec` não têm `upper`; anteriores a `53a3715` não têm `debt`.
- A conversão para o estado v3 está em [`src/core/LegacyImport.js`](../src/core/LegacyImport.js): quartos 101–104 → andar 1,
  suítes 201–203 → andar 2; Básico → Standard, Executiva → Executivo, Presidencial → Suíte Presidencial. A chave antiga nunca é escrita.

## 5. Interface (IDs do DOM no legado)

| Área | IDs |
| --- | --- |
| HUD | `money income rep starsNum stage occ guests queue clock zone` |
| Receita | `mission mName mTime mTimeBar mSteps mIngr mCook mZone mNeedle mCookTxt` |
| Reparo | `repair repTitle repZone repNeedle repFill` |
| Início | `start play lockNote resetSave` |
| Computador (abas fin, staff, upg, branch, partner) | `pc pcTabs pcClose pcBody` |
| Ficha e Chef | `ficha fichaClose fichaBody chef chefFriend chefClose chefBody chefCancel` |
| Corte | `chop chopZone chopNeedle chopTxt` |
| Outros | `rating touch touchE gl ch prompt feed` |

## 6. Controles e física do jogador
- `W A S D` ou setas andam (4,2 m/s), `Shift` corre (7,5 m/s), `Espaço` pula (vy 4,8; gravidade 14); olhos a 1,65 m.
- `E` ou clique interage com o que está na mira (até 4 m); `Esc` fecha janelas e cancela o reparo.
- Modo arrastar (sem pointer lock): 0,0042 rad por pixel; toque com menos de 6 px de movimento interage. Celular: direcional `touchK`.

## 7. Sons (Web Audio, `tone(freq, dur, tipo, vol, atraso)`)

| Som | Composição |
| --- | --- |
| Campainha | 1568 Hz/1,5 s seno .25 + 3136/.9 seno .07 + 2349/1,2 triângulo .05 |
| Moeda | 988/.1 quadrada .05 + 1319/.28 quadrada .05 (atraso .08) |
| Compra | 523, 659 e 784 Hz em triângulo, atrasos 0/.1/.2 |
| Porta | 140 Hz dente de serra + 90 Hz seno |
| Erro | 220 + 185 Hz quadrada |
| Chiado | 6 tons agudos aleatórios em quadrada |
| Limpeza | ruído por passa-banda de 2600 Hz |
| Corte | 260 Hz quadrada + 140 Hz seno |

## 8. Personas dos hóspedes
- Mochileiro: 13 personas (tropical, mochileira, surfista, artista, atleta, jardineiro, fotógrafo, geek, astrônoma,
  bombeiro, música, encanador, mergulhadora). Família, executiva e VIP têm uma persona cada.
- Cada persona define cores de camisa e calça e acessórios feitos de primitivas.

## 9. Peculiaridades do legado e o tratamento no 2.0

| # | No legado | No 2.0 |
| --- | --- | --- |
| 1 | `endDay()` grava o save mesmo com `saveBlocked` | Bloqueio centralizado no `SaveManager` (já feito, M0) |
| 2 | Altura do NPC salta nas pontas da escada | Altura vem dos nós do grafo de navegação (M2) |
| 3 | Fornecedor, temas de filial, `p.request` e Mixamo são só esboços | Implementar de verdade (M4, M6, M9) ou remover |
| 4 | O computador mostra a diária errada de suítes não compradas | Preço vem de `src/data/rooms.js` (M3) |
| 5 | Sujeira de suíte de cima pode cair na vizinha; a teia fica do lado de fora | Sujeira limitada aos limites do quarto (M2) |
| 6 | Acelerar o fogão não tem recarga | Recarga por fogão (M2) |
| 7 | "Evoluir" funciona sem funcionário contratado | Exigir o cargo contratado (M2) |
| 8 | O modo arrastar não pausa | Pausa em todos os modos de controle (M2) |
| 9 | Reparo sem checagem de distância | Interação sempre limitada pelo alcance (M2) |
| 10 | O quadro de chaves só cobre os 4 quartos do térreo | Quadro gerado a partir dos quartos de todos os andares (M2/M3) |
| 11 | Materiais da sujeira e dos pedaços cortados vazam | Descarte central de GPU no `AssetManager` (M2) |
| 12 | Lógica do fogão dentro da animação | Simulação separada da renderização (`Game`, já feito, M0) |
| 13 | A virada do dia descarta o resto do tempo | `GameClock` guarda o resto (já feito e testado, M0) |
| 14 | `stageCur` não é salvo | Etapa derivada do estado salvo (M2) |
| 15 | Check-in permitido em quarto em limpeza | Check-in só em quarto com status `available` (M2/M5) |

## 10. Regressão do legado que vira teste de paridade
`tests/fase1_regressao.py` (12 casos) precisa ter equivalente no jogo novo: o laço continua após exceção; save
ilegível bloqueia o autosave e é preservado; cancelar após servir é ignorado; obra em quarto ocupado é recusada;
salário não deixa o caixa negativo; salário faltante vira dívida e reduz a reputação; sujeira não se duplica; camareira
ignora quarto com hóspede; texturas WebGL não crescem ao refazer objetos; a etapa não oscila perto do limiar; nenhum
erro de página.
