# Design de superfície: as estampas e as peças prontas

Data: 25/11/2026 · Branch: `zaz`

## Intenção

A seção "Design de superfície" mostra hoje só as cinco amostras na cartela de papel: os
três xadrezes (grade, barra, cruzado), o retalho e o bordado. O Leonardo quer que ela
mostre também **onde cada estampa foi parar na roupa pronta**, com o foco continuando nas
estampas. A peça é a prova da aplicação, não a protagonista.

Onde cada superfície aparece na roupa (confirmado com o Leonardo):

| Superfície | Onde aparece | Imagem |
| --- | --- | --- |
| Os três xadrezes | gola do casaco marinho e blusa de tule do corselete | recorte da foto 9 (as duas modelos lado a lado) |
| Retalho | faixa da frente do casaco marinho ("design têxtil nº 01") | recorte da foto 3 (retrato do casaco) |
| Bordado | bolso de trás da calça jeans ("design têxtil nº 02") | desenho técnico da calça, limpo |

Não precisa casar cada xadrez com a peça exata: os três aparecem juntos, e a gola e a
blusa juntas mostram que eles viraram roupa. Os xadrezes não aparecem na saia.

## Metas, não metas e o que seria falha

- **Meta:** cada grupo de amostras com a peça ao lado, na mesma cartela, e a ligação
  legível sem texto.
- **Não meta:** reescrever a cartela de cores, mexer no Mapa do desfile, trocar as fotos
  por outras de melhor resolução.
- **Seria falha, mesmo funcionando:**
  - a foto maior ou mais chamativa que a amostra;
  - o xadrez reamostrado (fora de 242px);
  - a cartela saindo da parede vinho para o papel claro de outra seção;
  - amostra presa em `opacity: 0` depois de um salto de rolagem.

## Restrições

- **Rapport:** as amostras de xadrez continuam com 242 × 242 e `background-size` nativo
  (contrato do `PainelEstampas` e armadilha da raiz).
- **Fotos pequenas:** as fotos da coleção têm 579 × 868. O recorte da gola e da blusa
  sai com uns 375px de largura e o do casaco com uns 370px. Elas aparecem no tamanho
  nativo ou menor; em tela 2× ficam um pouco moles, e isso é aceito.
- **Desenho da calça:** o único original é `src/assets/desenhos/11.jpeg`, de 1600 × 1030,
  e a calça ocupa 353 × 472 dele. A limpeza vem de um extrator, porque saída gerada não
  se edita à mão. Os pontos de reparo foram lidos pixel a pixel e conferidos em lupa.
- **Tela:** a da apresentação, **2560 × 1440**, com densidade de pixels ainda
  desconhecida. É nela que se desenha e se confere.
- **Texto:** a seção continua sem texto visível (contrato "a seção não escreve nada"). As
  imagens novas ganham `alt` e a `figcaption` passa a citar as peças.

## Caminhos considerados

1. **Pares na cartela (escolhido pelo Leonardo).** Cada amostra ganha a peça ao lado, na
   mesma cartela. É a ligação mais direta, e as amostras maiores que as fotos mantêm o
   foco. Custo: a cartela é recomposta e fica mais alta (~750px), ainda inteira numa
   tela de 1440.
2. **Cartela intacta e uma faixa "na peça" embaixo, na parede.** Mexe menos, mas a ligação
   entre amostra e peça fica só pela ordem.
3. **Amostra clicável que abre a peça numa janela,** como o croqui do Mapa. É o foco
   máximo nas estampas, mas quem não clica não vê as peças.

## Desenho

**Cartela, duas fileiras:**

```
┌──────────────────────── cartela (papel claro) ────────────────────────┐
│ [grade] [barra] [cruzado]      ┌─────────────┐                        │
│  242     242     242           │ gola + blusa│ (foto 9, ~242 de altura)│
│                                └─────────────┘                        │
│ [retalho]  ┌────────┐        [bordado]  ┌────────┐                    │
│            │ casaco │                   │ calça  │                    │
│            │ frente │                   │desenho │                    │
│            └────────┘                   └────────┘                    │
└───────────────────────────────────────────────────────────────────────┘
```

- **Fileira 1:** os três xadrezes como hoje, com o recorte de gola e blusa à direita, na
  altura do rapport (242px). Na coluna de 1216px a conta é apertada: 3 × 242, dois vãos
  de 20px, um vão de ~40px e ~304px de foto, total ~1110px, contra ~1112px úteis. Se não
  couber, a foto desce de altura antes de a amostra mudar.
- **Fileira 2:** dois pares, retalho com casaco e bordado com calça. As peças ficam um
  pouco mais altas que as amostras costuradas (~260–280px contra 210px), para a
  aplicação se ler.
- **Hierarquia:** a amostra é a peça de mostruário; a foto entra como "prova" encostada
  nela, sem serrilha, com sombra de papel colado (a mesma do `.papel`). A calça vai sem
  fundo e sem sombra, porque é desenho sobre o papel.
- **Movimento:** as imagens novas levam `data-cartela-peca` e entram na mesma revelação
  (IO, varredura e `onUpdate`), com atraso escalonado depois da amostra do mesmo par.
  Nenhum ScrollTrigger novo.
- **Na tela da apresentação, minha decisão:** a cartela continua na coluna de 76rem
  (1216px), como a cartela de cores, a materioteca e a prancha de aviamentos.
  - **Altura:** com ~750px mais o título, ela cabe inteira na tela, e a seção é vista de
    uma vez, sem rolar.
  - **Largura:** ocupa ~47% da largura da tela grande. Crescer não dá: o xadrez só pode ir
    a 484px (2× o rapport), e três deles não cabem na coluna; as fotos passariam do
    tamanho nativo e borrariam.
  - **Densidade 2×:** se o computador da apresentação for 2×, os xadrezes continuam
    nítidos (há cópia 2× por vizinho mais próximo) e as fotos ficam um pouco moles.
- **Tela estreita:** abaixo de 720px, cada par empilha (amostra em cima, peça embaixo) e a
  foto encolhe até a largura da coluna.

**Assets (minha decisão):** um extrator novo, `scripts/extract-aplicacoes.mjs`
(`npm run extract:aplicacoes`), que lê só de `src/assets/`, porque `reference/` não
existe nesta máquina e o `extract-estampas` depende dela. Ele grava em
`src/assets/estampas/aplicacoes/`:

- `xadrez-gola-blusa.webp`: recorte da foto 9, nas coordenadas do recorte que o Leonardo
  mandou;
- `retalho-casaco.webp`: recorte da foto 3;
- `bordado-calca.png`: a calça limpa, com fundo transparente, rasterizada a 3× o tamanho
  de exibição a partir do vetor, e não o SVG de 176 kB inline (a armadilha "SVG grande no
  HTML"). Ela passa por `astro:assets`.

A vetorização usa `potrace`, que **não** é dependência do projeto: ele traz ~77
pacotes, e o Leonardo decidiu que ele é instalado só na hora de usar. A primeira
rodada do extrator o instala em `node_modules/.cache/potrace-2.1.8/`, fora do
`package.json` e do lock (`scripts/lib/potrace-sob-demanda.mjs`). Guardar o PNG sem o
script quebraria a regra de que saída gerada se refaz pelo script.

**Dados:** em `src/data/estampas.ts`, um bloco `aplicacoes` com `alt` e proporção de cada
imagem, no padrão de `pecas`. As proporções saem do extrator, num arquivo gerado como o
`estampas-medidas.ts`.

## Verificação

- `npm test`, `npx astro check` e `npm run build` passam.
- O piloto em 2560 × 1440, olhando o pixel, mais uma foto com densidade 2× para ver as
  fotos como ficariam num computador 2×:
  - as oito imagens da cartela reveladas, inclusive depois de salto por âncora e de `End`;
  - o título e a cartela inteira cabem na tela abaixo da barra do sumário quando se chega
    pela âncora;
  - o xadrez continua com 242px e `background-size` nativo.
- Movimento reduzido: tudo visível e parado.
- O extrator roda de novo e gera arquivos iguais (sem diferença no git).

## Documentação

- `src/components/CLAUDE.md`, seção PainelEstampas: os pares, a hierarquia (a amostra é
  maior que a foto) e de onde vem cada imagem.
- `CLAUDE.md` da raiz: o extrator novo na tabela de extratores e a armadilha do desenho
  (setas cortam traço; os reparos são por coordenada lida no mapa, e a regra genérica de
  ponte não converge).

## Fica com quem constrói

- O vão exato entre amostra e peça, e o atraso da revelação de cada imagem.
- O recorte fino da foto 3 (de onde começa a gola até onde termina o retalho).
- A largura exata em que cada par empilha.

## Revisão depois de ver na tela (25/11/2026)

Olhando a cartela em pares na tela da apresentação, o Leonardo mudou três coisas:

- **Sem o quadrado de papel.** As peças ficam direto na parede vinho. A restrição do
  grafite que afundaria no vinho foi conferida no pixel, em 2560 × 1440: o cinza do pano
  se lê bem contra o vinho.
- **Disposição solta.** Foi comparada com "três colunas" em fotos de teste. Ficaram três
  grupos espalhados pela largura, com as peças levemente giradas e cada roupa encostada
  no canto da amostra dela. Os xadrezes ficam retos, porque girar o rapport reamostraria
  as linhas de 1px.
- **Um nome embaixo de cada grupo:** "estampa digital", "patchwork" e "bordado". A regra
  "a seção não escreve nada" fica revogada para esses três nomes. O resto continua sendo
  só alternativa textual.

Continuam valendo:
- a hierarquia: a amostra é maior que a roupa;
- o tamanho nativo das fotos;
- o rapport de 242px;
- a mesma revelação para tudo.

Os nomes também entram na revelação. O contrato atualizado está em
`src/components/CLAUDE.md`, seção PainelEstampas.
