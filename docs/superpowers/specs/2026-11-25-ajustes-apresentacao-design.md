# Ajustes para a apresentação em tela grande

Data: 25/11/2026 · Branch: `new`

## Intenção

O book vai ser apresentado ao vivo numa tela de **2560×1440** (área que o navegador
enxerga; a densidade de pixels do computador da apresentação ainda não é conhecida). O
dono do site pediu três ajustes, o Leonardo acrescentou um quarto, e a revisão da página
nessa tela achou mais três. O objetivo é a página ficar coerente e sem buracos nessa
tela, sem quebrar a tela de projeto (1280×720), que continua sendo onde se confere o
movimento.

Pedidos do dono do site:

1. Estrelinha nos aviamentos, e o nome de cada um aparece ao clicar nela.
2. Diminuir a cartela de tecidos.
3. Títulos padronizados: mesma proporção entre si, mesmo espaçamento.

Pedido do Leonardo:

4. Menos buracos entre as fotos do Mood.

Achados da revisão, aprovados para entrar:

5. As estrelas vermelhas do fundo do Mapa passam por cima e por trás dos croquis e
   encostam no título.
6. Na materioteca, quem chega pelo sumário e para logo abaixo da lista vê a amostra
   errada (medido em 2560×1440: a sarja ao lado da ficha do Denim).
7. Na Persona, o texto encosta na borda esquerda (56px em 2560).

## Metas, não metas e o que seria falha

**Metas**

- Os cinco títulos de painel (Cores e harmonias, Tecidos e aviamentos, Design de
  superfície, Mapa do desfile e desenhos técnicos, Mapa do desfile) com o mesmo tamanho,
  a mesma distância do topo da seção e a mesma distância até o primeiro conteúdo, em
  1280, 1920 e 2560.
- Tecidos: a amostra menor e a seção mais curta, mantendo o arranjo de uma amostra por
  vez.
- Aviamentos: prancha de peças soltas, como as páginas 25 e 26 do book, com estrelinha
  e nome no clique.
- Mood: as duas colunas de fotos de cada verso terminando quase juntas.

**Não metas** (decididas com o Leonardo)

- Nenhuma seção ganha título novo. Conceito, Mood, Persona, Trendboard e Filme continuam
  sem título visível.
- O nome da última seção ("Mapa do desfile") fica como está.
- As fotos do Mood não crescem. Elas têm de 156 a 900px de largura (12 das 18 abaixo de
  480px), vindas de um zip sem versão maior; crescer em 2560 amplia a maioria de 1,2 a
  3×.
- A coluna central continua com teto de 76rem. Crescer a coluna mexeria no desenho de
  todas as cartelas.
- Os recortes dos aviamentos não são extraídos de novo agora: a pasta `reference/` não
  está neste Mac.
- O "Botão imantado" da página 26 do book continua fora do site. A prancha tem as 14
  peças de `tecidos.ts`, não as 15 do book.

**Falha mesmo que funcione**

- Qualquer revelação presa em `opacity: 0` (o `rolagem` do piloto precisa dar
  `0/70`, ou o novo total se os alvos mudarem).
- O nome do aviamento escondido por CSS estático dependendo de JS para aparecer (viola
  "nada some via CSS estático").
- Duas amostras acesas ao mesmo tempo, ou amostra que não casa com a ficha marcada.
- A seção de cores, de estampas ou o mapa perdendo o desenho em 1280×720.

## Restrições

Todas as do `CLAUDE.md` da raiz e de `src/components/CLAUDE.md`. As que mais pesam aqui:

- **Duas camadas** na materioteca: a lista comum continua sendo a camada de baixo; a
  `.armada` entra e sai dentro do `mm.add`.
- **`data-*` com nome próprio da seção.** `[data-grande]` já engoliu um botão do Mapa.
- **Rapport de 242×242** nas três amostras de pano das estampas: não redimensionar.
- **`refreshPriority`** em qualquer ScrollTrigger novo; preferir não criar nenhum.
- **`@keyframes` novos** levam o próprio bloco de `prefers-reduced-motion`.
- **Nada de `transition` largo** do Tailwind em alvo de GSAP.
- **Pin num `<div>` simples**: o `.palco` da Persona é pinado, e não pode ganhar
  `max-width` nem margem automática.
- O `package-lock.json` está modificado no worktree (11 linhas `"dev": true` a menos),
  sem relação com este trabalho. Não entra em commit.

## Caminhos considerados

**Cartela de tecidos.** (a) Grade 5×2 como no book, com a amostra grande num quadro ao
clicar; (b) manter uma amostra por vez, menor, e encurtar a seção; (c) só encolher a
amostra, mesma altura de seção. **Escolhido: (b).** Mantém o arranjo que mostra a trama
e o mecanismo já testado, e resolve o tamanho e o comprimento.

**Aviamentos.** (a) Prancha de peças soltas, como no book; (b) a grade de hoje sem o
nome, com miniatura maior e estrelinha no canto. **Escolhido: (a).** Para esconder e
mostrar o nome: elemento nativo `<details>`/`<summary>`, que funciona sem JS e não
esconde nada por CSS próprio; o Popover API foi descartado porque posicionar o popover
junto da peça exige ancoragem CSS, que nem todo navegador tem.

**Títulos nas seções sem título.** Só o Trendboard, todas as cinco, ou nenhuma.
**Escolhido: nenhuma.**

**Mood.** (a) Só dividir as fotos pela altura; (b) dividir e deixar a seção crescer até
~1.800px em 2560; (c) crescer só até o tamanho real de cada foto. **Escolhido: (a)**,
depois de medir a resolução das fotos (ver não metas).

## Desenho

### 1. Títulos de painel

Tudo em `tokens.css`, numa regra só; os painéis deixam de ter espaçamento próprio em
volta do título.

- **Tamanho:** cresce com a tela, de 44px em 1280 a 56px em 2560, com piso de 28px no
  celular. Referência: `clamp(1.75rem, 2rem + 0.9375vw, 3.5rem)`.
- **Distância do topo da seção ao título:** um token só, medido da borda de cima da
  parede ou do papel do painel até o topo da caixa do título. Referência:
  `clamp(2.5rem, 4vw, 4.5rem)` (~51px em 1280, ~72px em 2560).
- **Distância do título ao primeiro conteúdo:** um token só, medido até o primeiro
  conteúdo **pintado** (o novelo da primeira barra, o papel da cartela de estampas, a
  amostra de tecido, a cabeça do croqui mais alto, a primeira foto do desfile), não até
  a caixa do irmão. Referência: `clamp(1.5rem, 2.2vw, 2.75rem)`. A conferência é no
  pixel, nas três telas.
- **Coluna:** o título fica na coluna de 76rem. Os blocos retangulares passam a ocupar
  a mesma coluna, de modo que começam na mesma linha do título: a cartela de cores (hoje
  `max-w-6xl`, ~68rem de conteúdo), a cartela de estampas (hoje `max-width: 68rem`), a
  materioteca e a prancha de aviamentos (hoje sangram até a borda). As composições
  livres (a fileira de croquis do Mapa e o palco do Mapa do desfile) continuam
  centradas nessa coluna, com o título na beira esquerda dela.
- **Hierarquia:** um segundo nível de título, abaixo do título de painel, para o nome
  de cada tecido na ficha e para o subtítulo "Aviamentos". Hoje o nome do tecido tem
  54px, mais que o título. Referência: ~0,62 do título de painel (27–35px).

Ao alargar a cartela de estampas de 68 para 76rem, as amostras continuam com 242px; o
que cresce é o papel em volta. Ao alargar a cartela de cores, a geometria é toda em
`--un` e em `100cqw`, e deve reescalar sozinha; conferir o encaixe do novelo na barra.

### 2. Tecidos (a materioteca)

O mesmo arranjo de hoje: a amostra grande parada de um lado, as fichas passando do
outro, a amostra trocando quando uma ficha passa pela linha de leitura. Muda:

- **Tamanho da amostra:** ~45% da altura da tela (hoje ~870px em 2560, ~810px em 1920).
- **Ficha encostada:** a amostra e a ficha ficam juntas dentro da coluna de 76rem,
  separadas por um vão de ~4rem, sem o vazio de ~450px de hoje.
- **Comprimento:** cada ficha ocupa ~50% da altura da tela, e a seção cai de ~8,5 para
  ~5 telas. As fichas continuam encostadas umas nas outras, para exatamente uma cruzar a
  linha de leitura por vez.
- **Começo da seção:** na entrada, a amostra começa a uma distância do título igual à
  dos outros painéis (o token do item 1). Depois ela gruda e fica parada enquanto as
  fichas passam.
- **Ficha da vez marcada:** com fichas mais curtas, duas aparecem na tela ao mesmo
  tempo. A ficha que corresponde à amostra acesa fica marcada e as outras recuam (por
  exemplo, opacidade 0,45). A marca entra e sai dentro do `mm.add`; sem movimento, ou
  sem JS, todas as fichas aparecem iguais.
- **Amostra certa depois de um salto:** hoje o `IntersectionObserver` só avisa quando
  uma ficha cruza a linha, e um salto que cai fora de todas as fichas não avisa nada. A
  regra nova: em qualquer aviso, e também quando a materioteca entra na tela por
  qualquer caminho, se nenhuma ficha está na linha, acende a ficha mais perto dela (a
  primeira, se a linha está acima da lista; a última, se está abaixo). Sem ScrollTrigger
  novo; o observador pode passar a observar também a própria materioteca. Continua
  valendo o tween único sobre a pilha inteira, com `overwrite: true`.
- A camada de baixo (lista comum com miniatura) fica como está.

### 3. Aviamentos (a prancha)

A lista de 6 a 8 colunas vira uma prancha: as 14 peças soltas sobre a parede, dentro da
coluna de 76rem, como nas páginas 25 e 26 do book. Ela continua sendo a parte de baixo
da seção de tecidos, depois da materioteca, com o subtítulo "Aviamentos" no segundo
nível de título.

- **Posição:** uma lista escrita à mão no componente, como os `pendurados` do
  `PainelColecao`: centro da peça em porcentagem da prancha, giro de repouso e o lado da
  etiqueta. A prancha tem proporção fixa e largura da coluna. A ordem continua a de
  `tecidos.ts` (o que fecha, o que regula, o que arremata), lida da esquerda para a
  direita.
- **Tamanho de cada peça:** o tamanho natural do arquivo, dividido por uma constante
  única de densidade (hoje 1). As peças têm de 74 a 280px. Quando chegarem recortes 2×
  dos originais, troca-se a constante para 2 e nada mais. As peças não crescem com a
  tela; em 2560 a prancha fica mais aberta, e é isso que se aceita sem os originais.
- **Clique:** cada peça é um `<details>` cujo `<summary>` leva a imagem e a
  `EstrelaClicavel`. O `<summary>` inteiro é clicável, não só a estrela. Aberto, mostra
  o nome (`titulo` de `tecidos.ts`) numa etiqueta pequena inclinada, ao lado da peça,
  como as legendas do book; clicar de novo fecha. Cada peça abre e fecha sozinha, e
  várias podem ficar abertas ao mesmo tempo.
- **Acessibilidade:** a imagem mantém o `alt` descritivo de hoje, que já nomeia a peça,
  e por isso o leitor de tela sempre sabe o que é. O nome escondido é escondido pelo
  próprio `<details>` fechado, não por CSS do projeto. Sem o marcador de triângulo
  padrão do `<summary>`. Foco visível no padrão do site (tracejado em `currentColor`).
- **Estrelinha:** dourada Ninho em repouso, trocando de cor no hover e no foco pelo
  `--estrela-clicavel-cor`, como no Mapa.
- **Aparecer da etiqueta:** um `@keyframes` curto, com o bloco de movimento reduzido.
  Sem GSAP, sem revelação por rolagem.
- **Atributos:** nomes próprios da seção (`data-aviamento…`), nunca `data-grande` nem
  outro já usado.
- **Tela estreita (<900px):** grade simples de duas ou três colunas, com as mesmas
  peças e o mesmo `<details>`.

### 4. Mood

Em `Marginalia.astro`, a divisão das fotos de cada verso entre esquerda e direita deixa
de ser por índice par e ímpar. Hoje a ordem da parede alterna deitada e em pé e a
divisão alterna lado, e as duas se anulam: no primeiro verso as três deitadas vão para a
esquerda (731px de fotos) e as três em pé para a direita (1.778px).

- **Regra nova:** dentro de cada verso, na ordem da parede, cada foto vai para a coluna
  que estiver mais curta até ali. Os versos continuam com as mesmas fotos (a das três
  gerações fica no primeiro verso).
- **Altura estimada:** a mesma conta do CSS: a largura é `--largura` da coluna, com teto
  de `aspect × 70svh`; a altura é largura ÷ aspect. A conta precisa de uma tela de
  referência; usar 2560×1440. O deslocamento de partida da coluna direita (o
  `padding-top`) entra na conta.
- **Conferência:** medir a diferença entre as duas colunas de cada verso em 2560×1440 e
  em 1280×720. A meta é ficar abaixo de uma foto média de altura em cada verso.
- Tamanho das fotos, verso parado e parallax: sem mudança.

### 5. Estrelas do Mapa

O campo de estrelas vermelhas do `PainelMapa` (opacidade 0,85, posto de propósito ontem)
continua, mas sem passar por trás nem pela frente de croqui nenhum e sem encostar no
título. As estrelas ficam nas laterais e no vão entre as duas fileiras. Caminho sugerido:
uma máscara CSS sobre o `.campo-estrelas` que apaga as faixas das fileiras e a do
título. Condição: em 1280×720, onde os croquis ocupam quase a largura toda, ainda
sobram estrelas visíveis nas laterais e entre as fileiras.

### 6. Persona

O texto da Persona começa na mesma linha dos títulos (a beira esquerda da coluna de
76rem). O ajuste é no `.palco.caixa-armada`:

- **Preenchimento esquerdo:** o maior entre o de hoje e `(100% − 76rem) / 2`. O direito
  fica como está.
- **Grade:** a coluna do conto deixa de ser 38% e passa a ter largura de leitura (~30rem
  em tela larga). A mesa fica com o resto.
- **Consequência aceita (decisão de quem escreveu este documento):** em 2560 a mesa
  encolhe ~11–15% e as fotos pousam um pouco menores; em 1920, ~8%; em 1280 nada muda.
  Manter a grade em 38% encolheria a mesa ~26% em 2560, e manter a mesa inteira deixaria
  ~316px para o texto. As casas das fotos são medidas da mesa pelo JS
  (`CaixaFotos.astro`), então nada mais precisa mudar ali.

Nada de `max-width` nem margem automática no `.palco`, que é pinado. Depois de mudar,
conferir que nenhuma foto da mesa sai cortada pelo `overflow: hidden` do palco.

## Verificação

- `npx astro check` e `npm run build`.
- O piloto (`.claude/skills/run-landing-octa-2026/piloto.mjs`) neste Mac precisa de
  `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`, e reaproveita
  um dev server que já esteja na 4321. Rodar `rolagem`, `ancoras` e `reduzido` em
  `--tela=1280x720`. `reduzido` precisa continuar dando a materioteca sem `.armada` e
  com as miniaturas visíveis.
- Fotos de cada seção mexida em 1280×720, 1920×1080 e 2560×1440, olhadas no pixel:
  títulos (tamanho, distância do topo, distância até o conteúdo pintado, alinhamento
  com o conteúdo), materioteca (amostra e ficha marcada casando ao rolar devagar e
  depois de um salto pelo sumário), prancha de aviamentos (peças abertas e fechadas,
  etiquetas sem sobrepor peça vizinha), Mood (colunas de cada verso), Mapa (estrelas
  fora dos croquis e do título, e ainda presentes em 1280), Persona (texto alinhado,
  nenhuma foto cortada).
- Uma foto da prancha de aviamentos em 2560×1440 com densidade 2×, para saber como ela
  fica se o computador da apresentação for Retina.

## Documentação

Atualizar `src/components/CLAUDE.md`: títulos de painel (tokens, coluna, segundo nível),
PainelTecidos (tamanho, ficha marcada, regra da ficha mais perto da linha), a prancha de
aviamentos (`<details>`, constante de densidade, posições à mão), Marginália (divisão
pela altura e tela de referência), PainelMapa (estrelas fora dos croquis) e CaixaFotos
(preenchimento esquerdo, nunca `max-width` no palco).

## Fica com quem constrói

- Os números exatos de referência (tamanhos, tokens, opacidade da ficha não marcada),
  desde que batam no pixel com o que está descrito.
- As posições de cada aviamento na prancha e a proporção dela.
- O jeito de fazer a máscara das estrelas do Mapa.
- Como o observador da materioteca percebe a entrada da seção na tela.
- A divisão do trabalho em commits.
