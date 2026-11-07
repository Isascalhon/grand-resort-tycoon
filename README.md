# Grand Resort & Kitchen Tycoon 3D

Um tycoon de hotel e restaurante em primeira pessoa, feito em um único arquivo HTML com [Three.js](https://threejs.org/).

Você é o gerente do resort. Faça o check-in dos hóspedes, limpe os quartos, recolha gorjetas e vendas da piscina, contrate e treine a equipe e compre melhorias. Na cozinha, a Chef Maria tem receitas para você preparar com as próprias mãos.

## Como jogar

Abra o `index.html` em um navegador moderno (Chrome, Edge ou Firefox) com internet, porque o Three.js é carregado por CDN.

| Tecla / ação | Função |
| --- | --- |
| `W A S D` ou setas | Andar |
| `Shift` | Correr |
| `Espaço` | Pular |
| Mouse | Olhar ao redor |
| `E` ou clique esquerdo | Interagir com o objeto na mira |
| `Esc` | Pausar e soltar o mouse |

Olhe para um objeto a menos de 4 metros: a mira fica amarela e mostra o que a tecla `E` faz.

## Zonas

- **Lobby e recepção:** campainha para o check-in, computador para a Gestão do Hotel (finanças, equipe e melhorias).
- **Quartos:** portas que abrem e fecham, sujeira para limpar e placas para comprar ou evoluir as suítes (Básico, Executiva e Presidencial).
- **Restaurante e cozinha:** mesas com gorjetas, fogão para acelerar os pedidos, despensa e refrigerados, bancada de corte, estação de empratamento e a Chef Maria.
- **Piscina e pool bar:** espreguiçadeiras que geram renda com drinks e o bar molhado (liberado em Melhorias).

## Receitas da Chef Maria

Fale com a Chef Maria (o "!" amarelo sobre a cabeça dela) para escolher uma receita. Cada uma passa por quatro etapas:

1. **Ingredientes:** pegue os certos na despensa e nos refrigerados.
2. **Corte:** aperte `E` quando a agulha passar pela faixa verde na bancada da ilha.
3. **Cozimento:** tire a panela do fogo dentro da faixa ideal, antes de queimar.
4. **Empratar e servir:** monte o prato no passa-pratos e leve à mesa do cliente.

A nota de 1 a 5 estrelas depende da precisão, do corte, do ponto e do tempo. Notas altas dão bônus em dinheiro e liberam receitas novas com a amizade da Chef.

## Tecnologia

- HTML, CSS e JavaScript puro
- [Three.js 0.128.0](https://threejs.org/) via jsDelivr
- Texturas e modelos feitos por código, sem arquivos externos
