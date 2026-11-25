# Triádico — book digital (Vitória Baratto, UDESC 2026/2)

Astro 4 estático, Tailwind v4 via `@tailwindcss/vite`, sem integrações e sem
framework de ilha. Deploy no GitHub Pages sob `base: "/landing-octa-2026"` —
todo caminho montado em runtime passa por `import.meta.env.BASE_URL`.

**Os contratos de cada componente vivem em `src/components/CLAUDE.md`.** Aqui
fica só o que vale para a página inteira.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | sobe o servidor do Astro |
| `npm run build` | build estático para `dist/` |
| `npm run preview` | serve o `dist/` já construído |
| `npx astro check` | checagem de tipos |
| `npm test` | testes das funções puras (`tests/*.test.mjs`) com o `node --test` do próprio Node, sem dependência. Pede Node 23.6 ou mais novo, que importa `.ts` direto; o script passa um glob, porque o `node --test` não aceita pasta |

`astro check` e o build passarem **não** é conferir: metade das armadilhas
abaixo passou pelos dois. Quem confere olhando é a skill
`run-landing-octa-2026` (`piloto.mjs`) — revelações do GSAP, ponto de parada
das âncoras, movimento reduzido, `--tela=1280x720`; `piloto.mjs leitura`
percorre a `LeituraAutomatica`.

### Extratores

Reescrevem arquivos **gerados**. Nunca editar a saída à mão — editar o script
e rodar de novo. Todos leem de `reference/`.

| Comando | Gera |
| --- | --- |
| `npm run extract:book` | `src/assets/book/` — as páginas do PDF do Canva como PNG |
| `npm run extract:el` | `src/assets/recortes/elementos/` — recortes de dentro de uma página (`crop`/`cutout`) |
| `npm run extract:svg` | `src/assets/recortes/` — as 6 peças vetoriais do painel-conceito |
| `npm run extract:persona` | `src/assets/persona/` e as proporções de `src/data/persona.ts` |
| `npm run extract:trendboard` | `src/assets/trendboard/` e as proporções de `src/data/trendboard.ts` |
| `npm run extract:cores` | `src/data/formas-cores.ts` — novelo e meadas |
| `npm run extract:tecidos` | `src/assets/tecidos/` e `src/assets/aviamentos/` |
| `npm run extract:estampas` | `src/assets/estampas/` e `src/data/estampas-medidas.ts` |
| `npm run extract:croquis` | `src/assets/croquis/` e `src/data/croquis-medidas.ts`; `--conferir` grava `.piloto/croquis-antes-depois.png` |
| `npm run extract:estrelas` | `src/data/estrelasFundo.ts` |
| `npm run conferir:estrelas` | `.piloto/estrelas-vetorizadas.png`, para comparar no pixel |

O conteúdo escrito à mão fica em `src/data/cores.ts` (nome, TCX, tons, tinta) e
`src/data/tecidos.ts` (`titulo`, `composicao`, `gramatura`, `fornecedor` —
transcrição da ficha da Vitória, inclusive a composição da lã acrílica, que
soma 105%: é para conferir com ela, não para consertar no código; o `tom` é
medido, média do miolo do recorte, longe da serrilha).

Por que cada extrator é do jeito que é — a desmistura dos fios, o preenchimento
a partir da borda, os componentes conexos no alfa, a vetorização — está no
cabeçalho de cada `scripts/extract-*.mjs`; o que acontece se mexer está nas
Armadilhas.

## Idioma do código

**Tudo em português.** Classes, variáveis, funções, data-attributes e
comentários: `painel`, `recorte`, `estrela`, `velinha`, `capitulo`, `giro`,
`prof`, `atraso`, `peca`, `grupo-decorativo`. Nada de `wrapper`, `item`,
`container`, `depth`, `delay`.

## Padrão de movimento

- Bootstrap único em `src/lib/motion.ts` (side effect de topo de módulo),
  puxado pelo `src/components/Motion.astro`, montado uma vez no `BaseLayout`.
  O Astro funde todos os `<script>` da página num módulo só; é o hoisting do
  ESM que garante que `motion.ts` avalie antes de qualquer coreografia,
  independentemente de onde o `<Motion />` está no HTML.
- Toda coreografia vive dentro de `mm.add(COM_MOVIMENTO, () => { ... })`. O
  matchMedia reverte tudo — inclusive `gsap.set()` — quando a query deixa de
  bater, então a preferência pode mudar com a página aberta.
- **Nada some via CSS estático.** Só a classe `pre-anima` (posta por um script
  inline no `<head>`, condicionada a `prefers-reduced-motion: no-preference`,
  com watchdog de 3 s) pode esconder conteúdo — e quem esconde é sempre quem
  revela.
- `once: true` nas revelações. Um `onLeaveBack` mal calibrado é o jeito
  clássico de deixar as 18 fotos do mood travadas em `opacity: 0`.
- `opacity`, não `autoAlpha`, em imagem com `alt` real: `visibility: hidden`
  tira o texto da árvore de acessibilidade. `autoAlpha` só no que já é
  `aria-hidden` (a `Estrela`).
- `@keyframes` novos precisam do próprio bloco
  `@media (prefers-reduced-motion: reduce) { animation: none }` — o
  kill-switch global de `tokens.css` só zera a duração, o que deixaria um
  loop `alternate` parado no estado final.
- Padrão antigo (listener `scroll` com flag `ticking` + rAF) está aposentado.
  Exceção: o `IntersectionObserver` do `MenuConstelacao` continua como está —
  a Lenis move o scroll real do documento, então IO, `position: fixed` e
  `scroll-margin` seguem funcionando e `ScrollTrigger.scrollerProxy()` não é
  necessário em lugar nenhum.

## Princípios que valem para a página inteira

Cinco regras que os contratos de componente referenciam pelo nome, em vez de
repetir uma por seção.

- **A tela de projeto é 1280×720.** Não é uma página responsiva: ela é
  desenhada para esse quadro, e é nele que se confere (`--tela=1280x720` no
  piloto). O que existe de `@media` e de camada sem JS continua valendo — é
  acessibilidade e degradação, não um segundo desenho. Numa tela baixa o que
  quebra primeiro é altura: `100svh` de painel **não cabe** abaixo da barra do
  sumário, que come 6rem (o `scroll-mt-24` das seções). O painel do conceito
  usa `max-h-[calc(100svh-6rem)]` por isso — com `max-h-screen`, a legenda do
  conto caía embaixo da barra quando se chegava ali pela âncora.

- **Todo ScrollTrigger leva `refreshPriority`**, tirado do mapa `prioridade` de
  `src/lib/motion.ts`, em que **quem vem antes na página leva número maior** e
  a página inteira (a `LinhaCostura`) vem por último, com número negativo.
  Gatilho novo sem `refreshPriority` é bug esperando a próxima seção nascer. A
  história completa está no cabeçalho de `motion.ts`; a armadilha abaixo diz
  por que `ScrollTrigger.refresh()` não resolve.

- **Duas camadas, e a de baixo nunca some.** `PainelTrendboard`, `CaixaFotos` e
  `PainelTecidos` têm uma camada base que funciona sem JS, no celular e com
  movimento reduzido — uma tira que rola, uma grade de fotos, uma lista comum.
  A camada de cima é uma classe (`.tira-travada`, `.caixa-armada`, `.armada`)
  que entra e sai **dentro** do `mm.add`, e volta atrás no cleanup. Se o
  matchMedia reverter e a classe ficar, a seção vira uma tira que não rola de
  jeito nenhum, ou uma pilha de fotos que nunca se abre, ou uma lista sem
  imagem nenhuma.

- **Pin sempre num `<div>` simples**, um `.palco`, nunca num `<figure>`
  full-bleed: o `.pin-spacer` do ScrollTrigger reparenteia o alvo, e as margens
  negativas (`-mx-[50vw] w-screen`) e o contexto de container-query se
  re-resolvem errado.

- **Três propriedades, três donos.** Onde o CSS já usa `rotate:` (o `--giro`),
  `translate:` (o parallax) e `transform:` (um `@keyframes`), o GSAP **não toca
  na peça** — anima o wrapper (`[data-peca-conceito]`, `[data-margem]`,
  `[data-foto-caixa]`), com `clearProps` no fim. Transform do GSAP não se
  empilha em cima de um `rotate:` do CSS, e o `clearProps` ainda desfaz o
  contexto de empilhamento que o transform criou. Onde não há wrapper
  (`CampoEstrelas`), a centragem é `left`/`top` mais margem negativa, para
  deixar `translate` só para o parallax e `rotate` só para o giro.

## Armadilhas já pagas (não reintroduzir)

- **`transition` largo do Tailwind em elemento animado pelo GSAP.** O
  `transition` do Tailwind inclui `opacity`. Num `gsap.from({ opacity: 0 })`,
  o GSAP lê a opacidade de repouso no início do tween — que é exatamente o
  instante em que a classe `pre-anima` sai. Com uma transição de CSS em curso,
  o valor lido é o do meio do caminho (0), e o tween grava 0 como destino: o
  elemento fica invisível para sempre. Foi o que aconteceu com o botão
  "Começar a leitura". Em qualquer alvo de GSAP use a utilidade estreita
  (`transition-colors`), nunca `transition`.
- **`anchors: { offset }` na Lenis.** A 1.3.x já lê `scroll-margin-top`
  sozinha (ver `scrollMarginTop` em `lenis.mjs`), então o `scroll-mt-24` das
  seções continua valendo. Somar um offset aqui dobra o deslocamento — a
  âncora parava a 192px do topo em vez de 96. O ajuste fino do ponto de parada
  é no `scroll-mt-*` do markup, não na configuração da Lenis.
- **Elemento posicionado que transborda, dentro de `columns`.** No mural (já
  aposentado) a folha do conto vivia num container multicoluna, e ali o Chrome
  não pinta um filho `position: absolute` que estoure a caixa do pai no
  fragmento certo: a estrela da capitular sumia da letra e reaparecia no topo
  da parede. No Trendboard, com a mesma marcação e sem multicoluna, sempre
  funcionou. A cura tem duas partes, e as duas importam: recuo na
  `.folha-conto` para a estrela caber inteira dentro dela, e `overflow: hidden`
  na folha, que abre um contexto de formatação novo e conserta a pintura. Não
  adiantaram `isolation`, `contain`, `will-change`, `transform: translateZ(0)`
  nem trocar o float por `inline-block` — foram todos medidos.
- **Medir não é ver.** `getBoundingClientRect` dizia que a estrela estava
  centrada na letra com 0px de desvio enquanto ela era pintada a mil pixels
  dali: o retângulo é o layout, não a pintura. Bug de pintura só se confirma
  olhando o pixel. Vale também para `innerText`, que insere espaço em volta de
  elemento flutuado — ele acusava "E ssa" num texto que estava correto.
- **Medir opacidade logo depois de mexer numa classe.** `getComputedStyle`
  durante uma transição devolve o valor intermediário. Vale para teste e para
  código: espere a transição terminar antes de ler.
- **Achar que a rotação de uma peça exportada está escrita no arquivo.** As 20
  meadas das harmonias são a mesma forma girada, mas o Canva assa a rotação nas
  coordenadas. Casar path por índice e resolver por Procrustes não serve: o
  exportador reordena os subpaths ao girar (só fecha quando o giro é zero) e o
  número de pontos muda (918 numa cópia, 919 noutra). O que sobrevive é a
  distribuição — `extract-cores.mjs` correlaciona a assinatura angular do corpo
  em volta do centróide, e testa também a forma espelhada, porque metade das
  meadas está. O escore do pico é a autoverificação, e o `--conferir` remonta as
  harmonias para comparar com o original no pixel. Foi o `--conferir` que
  mostrou que faltava uma meada inteira em `6.svg`, cujo vinho saiu num tom fora
  do mapa e estava sendo descartado em silêncio.
- **O ScrollTrigger remede na ordem de criação, e a ordem de criação é a do
  bundle — não a do HTML.** O Astro funde os `<script>` de todos os componentes
  num módulo só, e nada garante que a seção de baixo da página registre seus
  gatilhos por último. Duas seções pinam (Persona e Trendboard), e um pin só
  abre seu `pin-spacer` quando remede: quem tiver medido antes disso nasce
  adiantado pela altura do espaçador. Deu os dois piores bugs já vistos aqui,
  os dois invisíveis para qualquer teste que não olhasse o pixel: o lineup do
  Trendboard abria **dentro da Persona**, 4.000px antes da hora — a altura
  exata do pin da Caixa de Fotos —, e no painel de tecidos a amostra grande
  mostrava o denim enquanto a ficha ao lado dizia couro sintético, uns 5.000px
  de erro. `ScrollTrigger.refresh()` não conserta nenhum dos dois: ele remede
  na mesma ordem. A cura é o `refreshPriority` acima, e **prioridade maior
  remede primeiro** — o contrário do que a skill `gsap-scrolltrigger` afirma
  (ela é cópia do upstream e não se edita; a regra de verdade está no sort da
  linha 2655 de `node_modules/gsap/ScrollTrigger.js`).
  Onde a medida não é necessária, melhor não medir: na materioteca a amostra
  acesa não depende de medida guardada pelo ScrollTrigger. A linha de leitura é
  o centro da amostra grudada, calculado uma vez dentro do `mm.add`. Um
  `IntersectionObserver` com `rootMargin` esmagando a raiz nessa linha só
  **dispara** a escolha. Quem **decide** é `fichaMaisPerto`
  (`src/lib/materioteca.ts`), com a medida feita na hora. Mais duas redes
  pegam os saltos que não cruzam ficha nenhuma: um segundo IO sobre a
  materioteca inteira e o `scrollend`. Detalhes no `CLAUDE.md` de
  `src/components/`, seção PainelTecidos.
- **O mesmo `data-*` em duas seções.** `querySelector` devolve o primeiro da
  página. O `PainelEstampas` procurava `[data-cartela]`, que é também da
  `CartelaCores`, 8.000px acima: o parallax e a segunda rede da varredura
  rodavam medindo a seção errada, e ninguém viu enquanto as estampas eram a
  última seção, porque toda rolagem terminava em cima delas. Quando o mapa
  nasceu depois, um salto as atravessou e as cinco amostras ficaram presas em
  `opacity: 0`. Atributo de seção tem nome próprio dela.
- **Dois tweens de opacidade na mesma peça, um apagando e outro acendendo.** No
  fundido cruzado da materioteca, uma rolagem rápida fazia o apagar de uma
  amostra terminar antes do acender que ainda estava em curso na mesma peça — e
  ela voltava para 1 e ficava ligada, duas amostras acesas ao mesmo tempo. O
  GSAP não sobrescreve por padrão. É um tween só, sobre a pilha inteira, com
  valor por função (`opacity: (i) => (i === atual ? 1 : 0)`) e `overwrite: true`.
- **O IntersectionObserver só avisa quando a interseção *muda*.** Numa rolagem
  que salta — âncora do sumário, `End`, roda de mouse pesada —, um elemento
  pode estar abaixo da tela num quadro e acima dela no seguinte sem nunca ter
  cruzado a borda, e então não recebe aviso nenhum: fica no estado escondido
  para sempre. É a armadilha das 18 fotos do mood por outra porta, e o piloto
  a pegou na parede de estampas (a versão da seção anterior à cartela) — três
  retalhos presos em `opacity: 0` no fim da rolagem. Todo IO que revela de uma
  vez só precisa da varredura junto: quando qualquer peça avisa, as que já
  passaram por cima da tela assentam na hora, sem cerimônia (animar devagar o
  que ninguém está olhando é animação para ninguém). A segunda rede é o
  `onUpdate` do ScrollTrigger da própria seção, que sai na primeira linha
  quando não há nada pendente.
- **`z-index: -1` dentro de um elemento com `clip-path`.** Um negativo só vai
  para trás do fundo do **pai** quando o pai não abre contexto de
  empilhamento; `clip-path` abre um. Dentro dele o `::after` negativo pinta
  depois do fundo do próprio elemento, ou seja **por cima** dele. Na cartela
  de estampas o forro (um filete na cor do fio) engoliu os três xadrezes: as
  amostras saíram chapadas de cinza, vinho e oliva, sem desenho nenhum, e o
  `astro check` e o build passaram os dois. A cura é separar em dois
  elementos — o recortado por dentro, o forro no wrapper de fora. Vale para
  `filter`, `transform`, `opacity < 1` e `will-change` pelo mesmo motivo.
- **`sm:not-sr-only` não reverte o `.sr-only` daqui.** O `.sr-only` deste
  projeto é uma regra própria de `tokens.css`, escrita **fora de `@layer`**, e
  os utilitários do Tailwind v4 moram em `@layer utilities` — CSS sem camada
  ganha de CSS em camada, em qualquer especificidade e em qualquer largura. Um
  `class="sr-only sm:not-sr-only"` fica, portanto, em 1×1px para sempre. Foi o
  que engoliu a palavra "Parar" do controle de leitura automática, num botão
  que continuava clicável e nomeado pelo `aria-label`: nada quebrou, o
  `astro check` e o build passaram, e só o recorte da foto mostrou. Para
  esconder por largura, use `hidden sm:inline` — ou, como ali, não esconda.
- **Redimensionar um rapport.** Os três xadrezes de `PainelEstampas` são
  rapports fechados de 242 × 242 e não passam por `astro:assets` (`?url` em
  `src/lib/superficies.ts`): redimensionar abre emenda onde não havia. A
  nitidez em ecrã de 2× vem de uma cópia dobrada por **vizinho mais próximo**
  (`image-set`), não do navegador ampliando — o desenho é todo de linhas de
  1px, e qualquer kernel que interpole deixa a cópia grande mais mole que a
  pequena. Os seis arquivos somam 51 kB.
- **Achatar o alfa e contar cores num xadrez.** `extract-estampas.mjs` acha os
  fios **desmisturando**, não contando: quase todo pixel de linha é mistura da
  linha com o grafite do fundo, e "a cor mais comum" devolve tons que não
  existem na cartela. Cada cor define um raio saindo do grafite, o pixel vai
  para o raio mais perto e a distância ao longo dele vale a opacidade — a soma
  é a tinta equivalente. E ele achata o alfa sobre o grafite porque 1,6% dos
  pixels são linhas desenhadas com alfa parcial: deixá-las transparentes faz a
  parede do capítulo vazar por dentro do pano em riscos.
- **Limiar global para tirar o fundo de uma foto de pano.**
  `extract-tecidos.mjs` usa preenchimento a partir da borda: o feltro e a sarja
  têm miolo tão escuro quanto o fundo preto, e um limiar global abre buraco
  dentro do pano. Nos aviamentos ele separa a peça da legenda por componentes
  conexos no alfa — cada letra é uma ilha pequena, a peça é uma ilha grande —,
  porque o nome vinha assado no PNG e na página tem de ser texto. O vão que
  decide se duas ilhas são a mesma peça é medido e estreito: 30px separam as
  duas vistas do zíper invisível, que é uma peça só, e 42px separam o regulador
  da fivela, que são duas.
- **`will-change` espalhado.** Ele fica no `.peca` e só ali — é o que dá camada
  de composição às seis peças do painel-conceito. Não espalhar para outros
  lugares, em especial não para as 18 imagens do mood.
- **SVG grande no HTML.** Os de `src/assets/recortes/svg/` não passam por
  `astro:assets` (o Astro 4 não processa SVG) — `recortes.ts` usa
  `query: "?url"` e eles vão inteiros para o `index.html` (~2,24 MB somados).
  É o maior peso da página.

## Skills

As 8 `gsap-*` de `.claude/skills/` são cópia de
[greensock/gsap-skills](https://github.com/greensock/gsap-skills)
@ `aed9cfd3277740755f6bfc1155c7aa645403b760`, MIT (ver `LICENSE-gsap-skills`),
só markdown. Atualizar = reclonar `skills/` do upstream e trocar o SHA aqui —
é o único pin que existe. **Reclonar não pode levar embora o que não é
`gsap-*`.**

`run-landing-octa-2026/` é local, não vem do upstream: sobe o `astro dev`,
dirige a página num Chrome por CDP e confere as revelações do GSAP, o ponto de
parada das âncoras e o modo de movimento reduzido. O `piloto.mjs` não tem
dependência nenhuma (o `WebSocket` é o global do Node 22) — de propósito, para
não trazer `playwright` para um projeto enxuto.
