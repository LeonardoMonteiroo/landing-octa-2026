# Contratos dos componentes

Os cinco princípios gerais — **tela 1280×720**, **`refreshPriority` em todo
ScrollTrigger**, **duas camadas**, **pin num `<div>` simples** e **três
propriedades, três donos** — estão no `CLAUDE.md` da raiz, junto com as
armadilhas já pagas. Aqui fica só o que é próprio de cada componente.

## LeituraAutomatica

A travessia é **contínua**, nunca por salto. Ela empurra a Lenis quadro a
quadro pelo `gsap.ticker` (`lenis.scrollTo(alvo, { immediate: true })`, com um
acumulador em ponto flutuante, porque o scroll da página é inteiro e a fração
de cada quadro morreria no arredondamento). Assim pin, scrub e revelação
acontecem como aconteceriam na mão, e nenhuma das armadilhas de rolagem que
salta — a do IntersectionObserver que só avisa quando a interseção muda, em
especial — alcança esta seção. Trocar por `scrollTo` de capítulo em capítulo é
reintroduzir as duas de uma vez.

Três coisas que parecem detalhe e não são: o delta do ticker leva teto de 100ms
(o `lagSmoothing` está desligado, e um quadro perdido viraria salto); quem toca
no scroll **assume o volante**, então roda, toque, tecla de rolagem e clique em
âncora pausam sozinhos; e o passo é medido em **alturas de tela por segundo**
(0,22), não em pixels — é o que mantém a velocidade igual em qualquer tela e,
sobretudo, no dia em que a página crescer de novo.

Ela vive **fora** do `mm.add`, e isso é de propósito: não é coreografia, é
navegação, disparada pelo usuário e com pausar e parar sempre à mão. Com
`prefers-reduced-motion` a própria Lenis já força o `immediate` em scroll
programático, então o caminho é o mesmo nos dois modos, sem ramo extra. Quem
confere é `piloto.mjs leitura`.

## PainelEstampas (a cartela de amostras)

- A seção **não escreve nada** — sem título por peça, sem descrição, sem lista
  de cores. O que existe de texto é o letreiro e a alternativa textual
  (`aria-label` nos panos, `alt` nas fotos, `figcaption` na figura). Quem não vê
  a cartela recebe o mesmo que quem vê; encher a cartela de rótulo é desfazer a
  seção.
- **A amostra de pano tem 242 × 242 e esse número não é de enfeite** — é o lado
  do rapport, uma repetição inteira e nenhuma fração. A versão anterior era uma
  parede de retalhos com ~380 × 300 por peça, ou seja uma repetição e meia, e o
  olho lê isso como campo cinza chapado: oito das onze peças não mostravam
  xadrez nenhum. Não é gosto, é quanto do desenho cabe na casa. Tamanho novo
  para `.forro` tem de ser múltiplo de 242 ou uma fatia menor que 242 — nunca
  1,x. Em tela estreita a amostra encolhe (`min(242px, 68vw)`) mas o
  `background-size` **não**: ali ela mostra menos do desenho, nunca um desenho
  menor. Ver a armadilha de redimensionar um rapport, na raiz.
- O suporte é de papel claro, e isso é medido, não gosto. Os três panos são de
  61% a 80% grafite (ver `grafite` em `estampas-medidas.ts`); sobre o vinho da
  parede esse grafite afunda, sobre o `--cor-linho-claro` ele volta a ter forma.
  Pôr a cartela na cor da parede é desfazer a seção pela segunda vez.
- A serrilha de pinking dos três panos é `clip-path: polygon()` gerado por
  `serrilha()`, e a profundidade do dente (2,6% de 242px ≈ 6px) está casada com
  a da tesoura de picotar das duas peças fotografadas. É ela que faz das cinco
  uma família só, em vez de "três fundos e duas fotos". As duas fotos **não**
  levam `clip-path`: já têm a serrilha de verdade no recorte, e picotar o que já
  está picotado serrilha a serrilha.
- O forro de cada pano — o filete do fio dominante que assoma 5px abaixo da
  amostra — mora num elemento **à parte** do `.pano`; ver a armadilha do
  `clip-path` com contexto de empilhamento, na raiz. E a cor dele é o fio
  dominante daquele xadrez, medido, não uma cor escolhida.
- O único ScrollTrigger da seção move a cartela uns 10px (`--p`, o contrato do
  painel-conceito) e existe sobretudo pelo `onUpdate`, que é a segunda rede da
  varredura. Nada da composição depende de medida: a revelação é por
  `IntersectionObserver`, porque esta seção vem depois de duas que pinam.

## PainelMapa (o mapa da coleção)

- A ordem é o conteúdo: a lista de `src/data/croquis.ts` segue as páginas do
  Canva, e o número embaixo de cada croqui é essa ordem. Reordenar por cor ou
  por máscara é desfazer a seção.
- **Fileira única, na mesma escala.** `--h` é a altura da página do Canva, e
  altura e largura de cada croqui saem dela, sem medição em JS. O 2,75 que
  divide a largura é a soma das larguras (2,91) menos a sobreposição: croqui
  novo muda esse número.
- A tonalidade é resolvida no extrator, só na foto: as máscaras vetoriais não
  passam pela correção. Não corrigir com `filter` no CSS, e não usar a mediana de
  L como alvo, porque ela é a roupa (ver o cabeçalho de `extract-croquis.mjs`).
- A revelação é por `IntersectionObserver` com varredura, como na cartela de
  estampas; o ScrollTrigger não anima nada, é só a segunda rede.

## Capitulo

O capítulo de estampas divide a parede `resistencia` com o do conceito. Desde a
cartela, nenhum dos dois depende do `fundo` do outro — o que aparece por entre
os dentes da serrilha das duas peças fotografadas é o papel da cartela
(`--cor-linho-claro`), não a cor da seção. A `ruptura` ficou sem parede; o
`Capitulo` segue aceitando as seis.

O `isolate` no `<section>` não sai dali: é dele que depende o `CampoEstrelas`.

## PainelConceito

- A custom property `--p` no `<figure>`. O CSS de `.peca` lê
  `translate: 0 calc(var(--p) * var(--prof) * var(--un, 1px))` enquanto
  `@keyframes flutuar` anima `transform` — as duas compõem sem brigar. Quem
  escreve `--p` pode mudar; o nome e a escala (~ -35..105) não. O `--un` é o
  tamanho de um passo de `--p`: 1px para as velinhas (que escalam com o jornal)
  e `--esc` para as estrelas, porque a faixa de xadrez em que elas vivem encolhe
  muito mais que o painel.
- **O GSAP nunca toca no `.peca`** — ver "três propriedades, três donos" na
  raiz. Toda a coreografia de entrada vive nos wrappers `[data-peca-conceito]`:
  as velinhas já tinham um, e as estrelas ganharam um `<div>` que carrega o
  `left/top/width`, deixando `--giro`/`--prof`/`--atraso` no `<img>`. O
  `clearProps` no fim é o que desfaz o contexto de empilhamento do transform —
  do que depende a velinha que fica **atrás** da borda rasgada do jornal.
- O palco das estrelas é a **faixa de xadrez** — o que sobra do painel acima do
  jornal. Os três tokens do `<figure>` (`--altura-jornal`, `--faixa-xadrez`,
  `--esc`) resolvem esse layout só em CSS, com unidades de container query; não
  há mais passo de medição em JS (o antigo `ajustarGrupoDecorativo()`, que
  encaixava um canvas 3:4 em `contain` e espremia a composição no meio de
  qualquer tela larga). O fundo é `object-cover` e as estrelas seguem a largura
  do painel, como ele.
- Cada estrela fica no eixo (`centro`) da velinha da mesma cor, lido do próprio
  array de velinhas por `eixo()`. O `.grupo-decorativo` vem **antes** da camada
  do jornal no HTML: em 16:9 a faixa encolhe até a cabeça da velinha verde
  chegar no meio dela, e a estrela precisa passar por trás da boneca em vez de
  por cima.
- Não pinar o `<figure class="painel-conceito">`: ele combina full-bleed
  (`-mx-[50vw] w-screen`) com `[container-type:size]`. Ver "pin num `<div>`
  simples" na raiz.

## PainelTrendboard

O pin é no `.palco`. A camada de baixo é a `.tira` com `overflow-x: auto`,
`scroll-snap` e `tabindex="0"`, que funciona sem JS, no celular e com movimento
reduzido; a de cima troca isso por `.tira-travada` dentro do `mm.add`. Ver
"duas camadas" na raiz.

O `FolhaConto` só vive aqui dentro, desde que o `Mural` foi aposentado.

## Marginalia (o arranjo do Mood) e CaixaFotos (o da Persona)

As duas tomaram o lugar do `Mural` e herdaram os contratos da parede: o `--giro`
fica num `.gira` de dentro e o GSAP anima só o wrapper (`[data-margem]`,
`[data-foto-caixa]`) — ver "três propriedades, três donos" na raiz; e a peça tem
teto de altura pela proporção — sem ele um recorte de 0,25 desce uma tela
inteira e engole o texto ao lado. Nas duas a foto **sangra**: o `.gira` leva a
classe `papel` só pela sombra de coisa encostada, e nenhum preenchimento —
filete claro em volta era margem que a composição não pedia.

**`Marginalia`:** o verso parado é `position: sticky`, CSS puro — o texto não
depende do GSAP para ficar legível, e o scrub nunca o leva abaixo de 0,25. Quem
dispara o ScrollTrigger é a `.estrofe`, **não** o verso: medir um elemento
grudado devolve onde ele está grudado, não onde ele mora. Duas coisas que
parecem detalhe e não são: `align-items` fica no padrão (`stretch`), que é o que
dá percurso ao sticky — com `start` a célula encolhe até o tamanho do parágrafo
e o verso sai de cena junto com as fotos; e o palco sangra (`relative left-1/2
right-1/2 -mx-[50vw] w-screen`) porque a `.marginalia` se mede em `94vw` e a
`SecaoTematica` a hospeda numa coluna de 64rem — sem isso a grade transborda só
para a direita, cortando as fotos daquela margem. No bloco escopado do palco vai
`margin-block: 0`, nunca `margin: 0`: o escopo do Astro tem especificidade maior
que o utilitário do Tailwind e apagaria o `-mx-[50vw]`, deixando só o
`left: 50%` — a seção inteira meia tela à direita.

**`CaixaFotos`:** a camada de baixo é o conto em cima e as fotos numa grade; a de
cima é a classe `.caixa-armada`. O pin é no `.palco`. A `casa()` devolve o
**centro** da foto, e por isso a área de pouso é 0,86 × 0,8 da mesa: sem essa
folga a fileira de cima nasce com meia foto para fora e o `overflow: hidden` do
palco a corta. O conto acende por palavra (`SplitText`, `type: "words"`) e nunca
abaixo de 0,2.

## FolhaConto

O GSAP anima só os `<p>`. A estrela fica de fora porque já usa três propriedades
próprias — `translate` (o deslocamento na diagonal), `rotate` e `scale` (o
`@keyframes cintilar`). O `cintilar` mantém a escala sempre abaixo de 1: a folha
recorta o que transborda, e crescer encostaria a ponta na borda.

## PainelTecidos (a materioteca)

A camada de baixo, que sempre funciona, é uma lista comum — a amostra ao lado da
própria ficha. A de cima é a classe `.armada`, que troca as miniaturas pelo
palco fixo; ver "duas camadas" na raiz. A amostra grande é a única coisa da
página que esconde irmãos por projeto (nove de dez em `opacity: 0`), e por isso
o esconder e o revelar vivem os dois no mesmo `mm.add`. Quem escolhe qual está
acesa é o `IntersectionObserver` — ver a armadilha da ordem de remedida, na
raiz, e a dos dois tweens de opacidade na mesma peça.

## CampoEstrelas (as estrelinhas nas paredes de cor chapada dos capítulos)

A camada vive em `z-index: -1` e **depende do `isolate` no `<section>` do
`Capitulo`**. Sem contexto de empilhamento ali, o z-index negativo afunda atrás
da própria cor da seção e o campo some. Tirar o `isolate` é o jeito de perder as
80 estrelas de uma vez.

A estrela não tem wrapper, e isso é de propósito: a centragem é `left`/`top`
mais margem negativa, o que deixa `translate` só para o parallax e `rotate` só
para o giro. E a opacidade da profundidade vai no `fill-opacity`, porque a
`opacity` está reservada ao `cintilar-fundo`. Vale o contrato `--p` do
painel-conceito: o GSAP escreve `--p` (-70..70) na camada, cada estrela lê via
`var()` e pesa por `--prof`.

O traçado vem de `src/data/estrelasFundo.ts`, que é gerado. Mexeu nele, confira
**olhando**: `npm run conferir:estrelas`.

## CartelaCores e Harmonias

- O novelo e a meada são desenhados **uma vez** num `<defs>`, e as 6 + 20 cópias
  são `<use>`. A cor entra por custom property (`--cor` na cartela; `--corpo` e
  `--fio` nas harmonias), que é herdada e por isso atravessa a árvore-sombra do
  `<use>` até o `fill="var(...)"` do path. É o que permite um desenho e seis
  cores. Trocar por `<img src>` ou por SVG externo mata a recoloração e traz de
  volta os 930 KB dos oito arquivos.
- Toda a geometria da linha — desenho, barra, mordida do disco e corpo da
  tipografia — é múltiplo de `--un`, um passo do sistema de coordenadas do
  novelo. O encaixe entre o desenho e a barra sai medido do arquivo original
  (`novelo.barra`, `novelo.disco`), não de número escolhido a olho: mexer em
  `--un` reescala a linha inteira junta e continua encaixando.
- O GSAP anima **uma coisa só**, o `--r` do `.fio` (1 = fio enrolado, com o
  novelo na ponta de dentro e a barra num toco atrás dele; 0 = repouso). O
  novelo caminha até a borda e a cor fica estendida no rastro porque as três
  peças saem do mesmo número: o `translate` do desenho, o `clip-path` da barra e
  o centro da mordida do disco. Descolar uma delas é deixar a barra pintar por
  baixo do novelo, cujas linhas são vazadas — ele vira um borrão de cor no meio
  do caminho. O percurso é medido em `100cqw` (a `.fio` é o container, e o
  `--anda` é declarado nos filhos porque um container não se consulta a si
  mesmo), então não voltou passo de medição em JS. Nenhuma `transition` na
  `.barra`, nem utilitária — ver a primeira armadilha da raiz.
- O fundo da seção de cores é `--cor-linho-claro`, e não o linho das outras. As
  linhas do fio no desenho são **vazadas**: o que se vê entre elas é o fundo. O
  papel precisa ser mais claro que o mais claro dos corpos (Ninho, `#d9b668`);
  sobre o linho (`#c3c3c0`) as linhas do novelo de Ninho escureceriam e o
  desenho inverteria.
- A tinta escrita sobre cada barra vem do campo `tinta` de `cores.ts`, que foi
  medido por contraste — não deduzido de "cor clara" ou "cor escura" no olho.
  Sobre Ninho e Fragilidade só a tinta escura passa (o papel dá 1,9:1 e 2,8:1);
  sobre as outras quatro, só a clara.
