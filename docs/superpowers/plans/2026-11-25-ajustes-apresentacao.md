# Ajustes para a apresentação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o book coerente e sem buracos na tela de 2560×1440 da apresentação: títulos
padronizados, materioteca menor, prancha de aviamentos com estrelinha, Mood equilibrado,
estrelas do Mapa fora dos croquis e texto da Persona na coluna.

**Architecture:** Mudanças de CSS em `tokens.css` e nos componentes de cada painel; duas
funções puras novas (`src/lib/margens.ts`, `src/lib/materioteca.ts`) testadas com
`node --test`, sem dependência nova; um componente novo (`PranchaAviamentos.astro`) feito com
`<details>` nativo, sem JS.

**Tech Stack:** Astro 4, Tailwind v4, GSAP 3 + ScrollTrigger + Lenis, Node 26 (`node --test`
com remoção de tipos nativa).

**Spec:** `docs/superpowers/specs/2026-11-25-ajustes-apresentacao-design.md`

## Global Constraints

- Tela da apresentação: 2560×1440. Tela de projeto: 1280×720. Conferir também 1920×1080.
- Tudo em português: classes, variáveis, funções, `data-*`, comentários. Nenhum nome de card
  no código.
- `data-*` novos com nome próprio da seção. Nunca `data-grande` nem outro já usado.
- Nada some por CSS estático. Classe que esconde ou recua entra e sai dentro do `mm.add`.
- `@keyframes` novo leva o próprio bloco `@media (prefers-reduced-motion: reduce)` com
  `animation: none`.
- Nada de `transition` largo do Tailwind em alvo de GSAP (`transition-colors`, nunca
  `transition`).
- Nenhum ScrollTrigger novo. O `.palco` da Persona é pinado: nunca `max-width` nem
  `margin: auto` nele.
- Amostras de pano das estampas: 242×242, sem redimensionar.
- Coluna central: 76rem. As fotos do Mood não crescem.
- O `package-lock.json` modificado no worktree **não** entra em commit: `git add` só com
  caminhos explícitos.
- Antes de cada commit: `npx astro check`, `npm test` e `npm run build`, cada um num
  comando próprio, com o resultado lido. Nunca encadear check e commit. A mensagem vai
  num arquivo do scratchpad, com `git commit -F <arquivo>`, e termina com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Piloto neste Mac:
  `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node .claude/skills/run-landing-octa-2026/piloto.mjs <comando> --tela=1280x720`.
  Ele reaproveita um `astro dev` que já esteja na 4321.

## Review Focus

1. **Salto pelo sumário** que cai logo abaixo da materioteca, ou no meio dela: a amostra
   grande e a ficha marcada têm de casar. Teste no Task 3, passo 6.
2. **Movimento reduzido:** materioteca sem `.armada` e sem ficha recuada, prancha de
   aviamentos abrindo e fechando igual. Teste no Task 3 (`reduzido`) e no Task 4, passo 5.
3. **Teclado na prancha:** Tab chega em cada uma das 14 peças, Enter e Espaço abrem e fecham,
   e o foco aparece. Teste no Task 4, passo 5.
4. **1280×720:** títulos com 44px, nenhuma peça da prancha sobreposta, estrelas do Mapa
   ainda visíveis nas laterais, Mood equilibrado. Testes nos Tasks 1, 2, 4 e 5.
5. **Todas as etiquetas abertas ao mesmo tempo** não cobrem peça vizinha nem saem da prancha.
   Teste no Task 4, passo 5.

---

### Task 1: Títulos de painel padronizados

**Files:**
- Modify: `src/styles/tokens.css` (bloco `.titulo-painel`, `:root`)
- Modify: `src/components/PainelCores.astro` (wrapper do título e `max-w-6xl` da cartela,
  `.papel-cores`)
- Modify: `src/components/PainelTecidos.astro` (`.painel-tecidos`, `header`, `h3` da ficha,
  `.indice h3`)
- Modify: `src/components/PainelEstampas.astro` (`.mostruario`, `.cartela`)
- Modify: `src/components/PainelMapa.astro` (`.papel-mapa`)
- Modify: `src/components/PainelColecao.astro` (`pt-6` do wrapper)
- Modify: `src/components/CLAUDE.md` (seção "Títulos de painel")
- Add: spec e plano em `docs/superpowers/`

**Interfaces:**
- Produces (em `:root` de `tokens.css`):
  - `--titulo-tamanho: clamp(1.75rem, 2rem + 0.9375vw, 3.5rem)` (44px em 1280, 50 em 1920,
    56 em 2560)
  - `--titulo-topo: clamp(2.5rem, 4vw, 4.5rem)`: do topo da seção ao topo da caixa do título
  - `--titulo-ate-conteudo: clamp(1.5rem, 2.2vw, 2.75rem)`: do pé do título ao primeiro
    conteúdo pintado
  - `--coluna-painel: 76rem`
- Produces (classes):
  - `.titulo-painel`, que passa a usar `--titulo-tamanho` e
    `margin: 0 auto var(--titulo-ate-conteudo)`, com `width: min(100%, var(--coluna-painel))`.
  - `.subtitulo-painel`, o segundo nível: mesma família e peso, tamanho
    `calc(var(--titulo-tamanho) * 0.62)`, `line-height: 1.1`, sem borda e sem margem própria.
    Usado pelo nome do tecido (Task 3) e por "Aviamentos" (Task 4).

- [ ] **Step 1: Medir o estado de hoje (o teste que falha)**

Com o `astro dev` de pé, rodar no navegador (Playwright `browser_evaluate`), em 1280×720,
1920×1080 e 2560×1440, depois de rolar a página inteira uma vez para as revelações
acontecerem:

```js
() => {
  const primeiro = {
    cores: "#cores .novelo",
    tecidos: "#tecidos .armada .moldura, #tecidos .entrada .mini",
    estampas: "#estampas .cartela",
    mapa: "#mapa .croqui img, #mapa .selo",
    colecao: "#colecao .fotos img, #colecao .croquis img",
  };
  return Object.entries(primeiro).map(([id, sel]) => {
    const sec = document.getElementById(id);
    const h = sec.querySelector(".titulo-painel");
    const rs = [...sec.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
    const t = h.getBoundingClientRect(), s = sec.getBoundingClientRect();
    return {
      id, fonte: getComputedStyle(h).fontSize,
      topo: Math.round(t.top - s.top),
      ateConteudo: Math.round(Math.min(...rs.map((r) => r.top)) - t.bottom),
      esqTitulo: Math.round(t.left), esqConteudo: Math.round(Math.min(...rs.map((r) => r.left))),
    };
  });
}
```

Expected: FAIL. Hoje `topo` varia de 24 a 112, `fonte` é 44px nas três telas, e
`esqConteudo` ≠ `esqTitulo` em cores, estampas e tecidos.

- [ ] **Step 2: Tokens e classes em `tokens.css`**

Adicionar os quatro tokens ao `:root` e reescrever `.titulo-painel` com eles. Criar
`.subtitulo-painel`. O comentário do bloco diz por que a distância é medida até o conteúdo
pintado.

- [ ] **Step 3: Cada painel deixa o espaçamento com os tokens**

- O `padding-top` de quem contém o título passa a ser `var(--titulo-topo)`: `.papel-cores`
  (hoje `padding-block` 3,5–7rem; o de baixo fica), `.painel-tecidos`, `.mostruario`,
  `.papel-mapa`, e o wrapper do `PainelColecao` (troca `pt-6`).
- Sai toda margem extra entre título e conteúdo: `mb-8` do wrapper em `PainelCores`,
  `header { margin-bottom }` em `PainelTecidos`.
- Onde o primeiro conteúdo pintado não está no topo do próprio bloco, compensar com
  `margin-top` negativo no bloco, até o Step 1 dar `ateConteudo` igual ao token. Isso vale
  para o `padding` de 1,1rem do `.croqui-botao` e o `top: -0.4rem` do `.selo` no Mapa, para
  o `top` da foto mais alta no palco do `PainelColecao`, e para o espaço acima do primeiro
  novelo na `CartelaCores`.

- [ ] **Step 4: Conteúdo na coluna do título**

- `PainelCores`: o wrapper da cartela troca `max-w-6xl px-5 sm:px-8` por
  `width: min(100%, var(--coluna-painel))` centrado, com o mesmo preenchimento lateral do
  wrapper do título. Assim a cartela começa na mesma linha do título.
- `PainelEstampas`: `.cartela { max-width: var(--coluna-painel) }` (era 68rem). As amostras
  continuam com 242px.
- `PainelTecidos` (tecidos e aviamentos) entra na coluna no Task 3 e no Task 4.
- `PainelMapa` e `PainelColecao`: só o título está na coluna, e o conteúdo continua
  centrado.

- [ ] **Step 5: Segundo nível**

O `h3` da ficha de tecido e o `.indice h3` passam a usar `.subtitulo-painel`. O `h3` da
ficha mantém a borda de 3px na cor `--tom`, a margem e o preenchimento de baixo. Os
`font-size` próprios saem.

- [ ] **Step 6: Medir de novo**

Rodar o snippet do Step 1 nas três telas. Expected:
- `fonte`: 44px, 50px e 56px.
- `topo`: igual nos cinco painéis (±1px), 51, 72 e 72.
- `ateConteudo`: igual ao token (±4px), 28, 42 e 44. Estampas ±12px, por causa do parallax
  de ±10px da cartela.
- `esqConteudo` = `esqTitulo` (±8px) em cores e estampas.

Fotografar cada painel com o piloto (`foto --tela=... --y=<topo da seção>`) nas três telas e
olhar no pixel. Nenhum título encostado em estrela ou croqui, e o novelo de Ninho encaixado
na barra.

- [ ] **Step 7: Documentar**

Em `src/components/CLAUDE.md`, "Títulos de painel" passa a dizer:
- os quatro tokens, e a distância medida até o conteúdo pintado;
- que blocos retangulares ocupam a coluna e composições livres ficam centradas nela;
- que existe o segundo nível `.subtitulo-painel`.

- [ ] **Step 8: Checar e fazer commit**

Run (cada um num comando próprio): `npx astro check` → `0 errors`; `npm run build` →
`Complete!`.

```bash
git add src/styles/tokens.css src/components/PainelCores.astro src/components/PainelTecidos.astro src/components/PainelEstampas.astro src/components/PainelMapa.astro src/components/PainelColecao.astro src/components/CLAUDE.md docs/superpowers/specs/2026-11-25-ajustes-apresentacao-design.md docs/superpowers/plans/2026-11-25-ajustes-apresentacao.md
git commit -F <scratchpad>/msg-titulos.txt   # "Padroniza tamanho e espaçamento dos títulos de painel"
```

---

### Task 2: Mood com as colunas equilibradas

**Files:**
- Create: `src/lib/margens.ts`
- Create: `tests/margens.test.mjs`
- Modify: `package.json` (script `"test": "node --test tests/"`)
- Modify: `src/components/Marginalia.astro` (frontmatter e o `map` das anotações)
- Modify: `src/components/CLAUDE.md` (seção "Marginalia")

**Interfaces:**
- Produces (`src/lib/margens.ts`, sem nenhum import):
  - `interface TelaMargem { coluna: number; alturaTela: number; vao: number; deslocamentoDireita: number }`
  - `const TELA_REFERENCIA_MOOD: TelaMargem = { coluna: 400, alturaTela: 1440, vao: 28.8, deslocamentoDireita: 80 }`.
    São os números de 2560×1440: `.marginalia` com `min(94vw, 88rem)` = 1408; coluna
    (1408 − 480 − 2×64) / 2 = 400; vão `clamp(0.9rem, 2vw, 1.8rem)` = 28,8;
    `padding-top` da margem direita `clamp(2rem, 6vw, 5rem)` = 80. Fica num comentário.
  - `alturaEstimada(foto: { aspect: number; largura: number }, tela: TelaMargem): number`,
    em que `largura` é a fração da coluna (0,8–1). É a mesma conta do CSS de
    `.anotacao`: `min(largura × coluna, aspect × 0,7 × alturaTela, coluna) / aspect`.
  - `dividirMargens(alturas: number[], tela: Pick<TelaMargem, "vao" | "deslocamentoDireita">): { esquerda: number[]; direita: number[] }`
    devolve índices de `alturas`, em ordem crescente dentro de cada coluna. A divisão é
    **exaustiva**: testa as 2ⁿ divisões (bit 1 = direita; n é 6 por verso) e fica com a de
    menor `|esquerda − direita|`. No empate, fica a primeira em ordem crescente de
    máscara. A altura de uma coluna é a soma das alturas mais um `vao` entre itens
    vizinhos, e a direita começa em `deslocamentoDireita`, mesmo vazia. Colocar cada item
    na coluna mais curta, na ordem, não serve: no primeiro verso sobram 519px, porque a
    última foto é alta.

- [ ] **Step 1: Escrever o teste que falha**

`tests/margens.test.mjs` (importa `../src/lib/margens.ts` e `../src/lib/acaso.ts`, com
extensão):

```js
test("dividirMargens acha a divisão de menor diferença e desempata pela menor máscara", () => {
  assert.deepEqual(dividirMargens([100, 300, 100, 100], { vao: 0, deslocamentoDireita: 0 }),
    { esquerda: [0, 2, 3], direita: [1] });
});
test("dividirMargens conta o deslocamento da direita", () => {
  assert.deepEqual(dividirMargens([100, 100], { vao: 0, deslocamentoDireita: 150 }),
    { esquerda: [0, 1], direita: [] });
});
test("alturaEstimada respeita o teto de 70svh das peças em pé", () => {
  assert.equal(Math.round(alturaEstimada({ aspect: 0.252, largura: 1 }, TELA_REFERENCIA_MOOD)), 1008);
  assert.equal(alturaEstimada({ aspect: 2, largura: 0.9 }, TELA_REFERENCIA_MOOD), 180);
});
test("primeiro verso do Mood: a divisão nova fica abaixo de uma foto média de diferença", () => {
  const aspects = [1.335, 0.514, 2.353, 0.683, 1.128, 0.59]; // ordemMood[0..5]
  const alturas = aspects.map((aspect, k) =>
    alturaEstimada({ aspect, largura: 0.8 + acaso(k, 11) * 0.2 }, TELA_REFERENCIA_MOOD));
  const soma = (ix, desl) => ix.reduce((s, i, n) => s + alturas[i] + (n ? 28.8 : 0), desl);
  const media = alturas.reduce((a, b) => a + b) / alturas.length;
  const { esquerda, direita } = dividirMargens(alturas, TELA_REFERENCIA_MOOD);
  assert.ok(Math.abs(soma(esquerda, 0) - soma(direita, 80)) < media);
  // a divisão antiga (par/ímpar) é o defeito: passa de uma foto média
  assert.ok(Math.abs(soma([0, 2, 4], 0) - soma([1, 3, 5], 80)) > media);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`. Expected: FAIL, com o módulo `src/lib/margens.ts` não encontrado (o script
`test` entra neste passo).

- [ ] **Step 3: Implementar `src/lib/margens.ts`**

Com as assinaturas e a constante do bloco Interfaces. No cabeçalho, um comentário com dois
porquês:
- a ordem da parede alterna deitada e em pé e a divisão alternava lado, e as duas se
  anulavam (731px contra 1.778px no primeiro verso em 2560);
- a divisão é exaustiva e não "cada uma na coluna mais curta", porque assim sobravam 519px
  no primeiro verso.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`. Expected: 4 testes, `pass 4`, `fail 0`.

- [ ] **Step 5: Ligar na `Marginalia`**

- A largura e a velocidade de cada foto passam a sair do índice da foto **na parede**
  (posição em `fotos`), não da ordem de renderização: `largura = 0.8 + acaso(k, 11) * 0.2`,
  `velocidade = Math.round(26 + acaso(k, 7) * 46)`. Some o contador `n`.
- `repartir` continua formando os versos. Dentro de cada verso, `dividirMargens` sobre
  `alturaEstimada` de cada foto com `TELA_REFERENCIA_MOOD` decide esquerda e direita.
- `--largura` recebe `Math.round(largura * 100)%`. CSS, parallax e verso sem mudança.

- [ ] **Step 6: Medir no navegador**

Em 2560×1440 e em 1280×720, para cada `.estrofe` de `#mood`, somar as alturas das
`.anotacao` de `.margem.esq` e de `.margem.dir`.
- Expected: em cada verso, a diferença fica abaixo da altura média de uma foto daquele
  verso, nas duas telas. Hoje em 2560: 1.047, 325 e 527px.
- Fotografar o Mood em 2560 em três alturas e olhar: nenhuma coluna termina sozinha com uma
  tela de azul embaixo.

- [ ] **Step 7: Documentar, checar e fazer commit**

Em `src/components/CLAUDE.md`, "Marginalia" ganha um parágrafo:
- a divisão é pela altura estimada, com tela de referência 2560×1440;
- se a medida da `.marginalia` ou da coluna mudar, `TELA_REFERENCIA_MOOD` muda junto.

Run, cada um num comando: `npm test` → `pass 4`; `npx astro check` → `0 errors`;
`npm run build` → `Complete!`.

```bash
git add src/lib/margens.ts tests/margens.test.mjs package.json src/components/Marginalia.astro src/components/CLAUDE.md
git commit -F <scratchpad>/msg-mood.txt   # "Reparte as fotos do Mood pela altura e fecha os buracos entre elas"
```

---

### Task 3: Materioteca menor, com a ficha da vez marcada e a amostra certa depois de um salto

**Files:**
- Create: `src/lib/materioteca.ts`
- Create: `tests/materioteca.test.mjs`
- Modify: `src/components/PainelTecidos.astro` (CSS da camada 2 e `<script>`)
- Modify: `src/components/CLAUDE.md` (seção "PainelTecidos")

**Interfaces:**
- Consumes: `.subtitulo-painel` e `--coluna-painel` (Task 1).
- Produces (`src/lib/materioteca.ts`, sem import):
  `fichaMaisPerto(caixas: { top: number; bottom: number }[], linha: number): number`.
  Devolve o índice da caixa que contém a linha (`top <= linha < bottom`) e, se nenhuma
  contém, a de menor distância da linha até a borda mais próxima. Com a linha acima de
  todas, dá 0; abaixo de todas, dá a última.
- Produces (DOM): atributo `data-entrada-acesa` na `.entrada` cuja amostra está acesa, só
  com `.armada`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/materioteca.test.mjs`:

```js
const caixas = [{ top: 0, bottom: 100 }, { top: 100, bottom: 200 }, { top: 260, bottom: 360 }];
test("a caixa que contém a linha", () => assert.equal(fichaMaisPerto(caixas, 150), 1));
test("linha acima de todas: a primeira", () => assert.equal(fichaMaisPerto(caixas, -500), 0));
test("linha abaixo de todas: a última", () => assert.equal(fichaMaisPerto(caixas, 9000), 2));
test("linha no vão: a mais perto", () => {
  assert.equal(fichaMaisPerto(caixas, 210), 1);
  assert.equal(fichaMaisPerto(caixas, 250), 2);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`. Expected: FAIL nos testes de `materioteca`, com o módulo não encontrado.
Os 4 de `margens` passam.

- [ ] **Step 3: Implementar `src/lib/materioteca.ts`**

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`. Expected: `pass 8`, `fail 0`.

- [ ] **Step 5: CSS e script da camada 2**

CSS (só dentro de `.armada`; a camada 1 não muda):
- `.materioteca.armada`:
  - `width: min(100%, var(--coluna-painel))` e `margin-inline: auto`;
  - `grid-template-columns: min(45svh, 45%) minmax(0, 1fr)`;
  - `gap: 4rem`;
  - `align-items: start`.
- `.armada .palco`:
  - `position: sticky`, com `top: 27.5svh` e `height: auto`. Na entrada da seção a
    amostra fica logo abaixo do título, e quando gruda fica centrada na tela;
  - sem `display: grid` centrando em 100svh.
- `.armada .moldura`: `width: 100%`, `aspect-ratio: 1`, sem `max-height`.
- `.armada .entrada`: `min-height: 50svh` (era 82svh), `padding-block: 1.5rem`.
- `.armada .entrada:not([data-entrada-acesa]) .texto`: `opacity: 0.45`, com
  `transition: opacity var(--dur-rapida) var(--curva-agulha)`. Não é alvo de GSAP.
- `.painel-tecidos`: o preenchimento lateral continua; a materioteca já está na coluna.

Script, dentro do mesmo `mm.add`:
- `mostrar(i)` também move `data-entrada-acesa` para `entradas[i]`. A primeira entrada
  nasce com ele.
- O callback do `IntersectionObserver` atual passa a chamar uma função só:
  `acenderMaisPerto()`. Ela faz
  `mostrar(fichaMaisPerto(entradas.map((e) => e.getBoundingClientRect()), innerHeight * 0.55))`.
- O mesmo observador observa também a `caixa` (a `.materioteca`). Assim, entrar na seção
  por qualquer caminho, inclusive um salto, dispara `acenderMaisPerto()`.
- O cleanup tira `data-entrada-acesa` de todas as entradas, além do `disconnect` e da
  `.armada`.
- O comentário do IO ganha uma linha: a linha de leitura pode cair fora de todas as fichas
  depois de um salto; por isso a escolha é pela ficha mais perto, e não pela que avisou.

- [ ] **Step 6: Conferir no navegador (inclui o Review Focus 1)**

Em 2560×1440 e 1280×720:
- **Rolando devagar pela seção:** a cada parada, a ficha com `data-entrada-acesa` é a do
  tecido mostrado (o `alt` da `.mini` da entrada acesa casa com o índice da `[data-grande]`
  de opacidade 1). Nunca duas `[data-grande]` acima de 0,5 depois de 400ms parado.
- **Salto:** `window.scrollTo` instantâneo vindo da seção Estampas até 100px abaixo do fim
  da última `.entrada`, e depois até o meio da 5ª. Espera 700ms. Expected: Denim aceso com
  a ficha do Denim marcada; depois, Lã acrílica com a ficha dela.
- **Medidas:** a amostra tem ~45% da altura da tela, e a `#tecidos` mede ~5 telas até o
  começo dos aviamentos (hoje ~8,5).
- **Foto em 2560:** amostra e ficha juntas, sem o vazio de ~450px entre elas.

Run: `CHROME=... node .claude/skills/run-landing-octa-2026/piloto.mjs rolagem --tela=1280x720`
→ `alvos invisíveis ao final: 0/70`, `problemas: nenhum`.

Run: `... piloto.mjs reduzido --tela=1280x720` →
`materioteca: {"armada":false,"minisVisiveis":10,"minis":10}`.

- [ ] **Step 7: Documentar, checar e fazer commit**

Em `src/components/CLAUDE.md`, "PainelTecidos" passa a dizer:
- o tamanho (45svh) e a ficha de 50svh;
- a ficha marcada (`data-entrada-acesa`, só na `.armada`);
- a regra da ficha mais perto da linha, e por que existe.

Run: `npm test` → `pass 8`; `npx astro check` → `0 errors`; `npm run build` →
`Complete!`.

```bash
git add src/lib/materioteca.ts tests/materioteca.test.mjs src/components/PainelTecidos.astro src/components/CLAUDE.md
git commit -F <scratchpad>/msg-materioteca.txt   # "Diminui a materioteca e acerta a amostra depois de um salto"
```

---

### Task 4: Prancha de aviamentos com estrelinha

**Files:**
- Create: `src/components/PranchaAviamentos.astro`
- Modify: `src/data/tecidos.ts` (constante de densidade)
- Modify: `src/components/PainelTecidos.astro` (a `<section class="indice">` dá lugar a
  `<PranchaAviamentos />`; o CSS de `.indice` sai; a `figcaption` diz "prancha")
- Modify: `src/components/CLAUDE.md` (seção nova "PranchaAviamentos")

**Interfaces:**
- Consumes: `aviamentos` e `Aviamento` de `src/data/tecidos.ts`; `aviamento(nome)` de
  `src/lib/materiais.ts`; `EstrelaClicavel`; `.subtitulo-painel` e `--coluna-painel`
  (Task 1).
- Produces:
  - `export const DENSIDADE_AVIAMENTOS = 1` em `src/data/tecidos.ts`, com comentário: com
    recortes 2× dos originais, troca para 2. A largura na tela de cada peça é
    `largura do arquivo / DENSIDADE_AVIAMENTOS` px.
  - Os atributos `data-aviamento` (no `<details>`) e `data-aviamento-etiqueta`.

**Markup por peça:** `<details class="peca" data-aviamento style="--x;--y;--giro;--larg">`
com `<summary>` contendo o `<Image>` (`alt` = `a.alt`, `width`/`height` do arquivo, um
`widths` só, o tamanho do arquivo) e `<EstrelaClicavel class="selo" tamanho={28} />`, e depois do
`summary` a `<span class="etiqueta" data-aviamento-etiqueta>{a.titulo}</span>`.

**Posições iniciais** (centro em % da prancha; a ordem de `tecidos.ts` lida da esquerda para
a direita; `etiqueta` diz de que lado ela sai). São o ponto de partida, e se ajustam olhando
o Step 5:

| nome | x | y | giro | etiqueta |
|---|---|---|---|---|
| ziper-metalico | 7 | 42 | -4 | abaixo |
| ziper-invisivel | 21 | 30 | 3 | abaixo |
| fecho-sutia | 20 | 80 | -2 | acima |
| botao-pressao | 36 | 20 | 2 | abaixo |
| botao-flexivel | 35 | 62 | -3 | abaixo |
| rebite | 48 | 40 | 4 | abaixo |
| ilhos | 47 | 82 | -2 | acima |
| fivela-tres-pinos | 60 | 22 | -5 | abaixo |
| fivela-dois-pinos | 61 | 58 | 3 | abaixo |
| regulador-metalico | 71 | 84 | 0 | acima |
| argolas-metalicas | 73 | 34 | -3 | abaixo |
| meia-argola | 84 | 66 | 4 | acima |
| regulador-sutia | 86 | 24 | -2 | abaixo |
| vies-algodao | 94 | 50 | 3 | acima |

**CSS:**
- **`.prancha` em tela larga (≥900px):**
  - `width: min(100%, var(--coluna-painel))`, centrada;
  - `aspect-ratio: 13 / 6`, `position: relative`.
- **`.peca`:**
  - `position: absolute`, com `left: calc(var(--x) * 1%)` e `top: calc(var(--y) * 1%)`;
  - `translate: -50% -50%`;
  - largura `var(--larg)`.
- **Imagem:** o `rotate: var(--giro)` vai na imagem, não na `.peca`.
- **`summary`:** `list-style: none`, sem marcador (`::-webkit-details-marker`
  `{ display: none }`), `cursor: pointer`.
- **Selo:** a `.selo` no canto de cima à direita da peça. `--estrela-clicavel-cor` vira
  `var(--cor-resistencia)` no `:hover` e no `:focus-visible` do `summary`, como no Mapa.
- **`.etiqueta`:**
  - fica fora do fluxo, centrada na peça, acima ou abaixo conforme a tabela;
  - `rotate: -6deg`;
  - fonte `var(--font-ficha)` em itálico, `0.95rem`, `white-space: nowrap`;
  - sem fundo, na cor do texto da seção.
- **Animação:** `@keyframes etiqueta-surge` (opacidade de 0 a 1 e translate de 0.4rem),
  disparada em `[open] .etiqueta`, com o bloco de movimento reduzido.
- **Abaixo de 900px:** a `.prancha` vira `display: grid` com
  `repeat(auto-fill, minmax(8rem, 1fr))`, a `.peca` volta ao fluxo (`position: static`,
  `translate: none`), e a etiqueta fica embaixo da peça, sem giro.

- [ ] **Step 1: Escrever o teste que falha**

Conferência no navegador em 2560×1440 (Playwright), depois do build de dev:

```js
() => {
  const pecas = [...document.querySelectorAll("#tecidos [data-aviamento]")];
  return { pecas: pecas.length, abertas: pecas.filter((p) => p.open).length,
    grandes: document.querySelectorAll("[data-grande]").length };
}
```

Expected hoje: FAIL, com `pecas: 0`. Depois: `pecas: 14`, `abertas: 0` e `grandes: 10` (a
materioteca continua com as dez dela; a prancha não pega `data-grande`).

- [ ] **Step 2: `DENSIDADE_AVIAMENTOS` em `tecidos.ts`**

- [ ] **Step 3: Criar `PranchaAviamentos.astro`**

Com o markup, as posições e o CSS acima. O cabeçalho do arquivo explica três coisas:
- por que `<details>`: funciona sem JS, e o nome escondido é do navegador, não de CSS do
  projeto;
- por que o tamanho natural: não há originais neste Mac;
- que posição e lado da etiqueta são escritos à mão, como os `pendurados` do
  `PainelColecao`.

Sem `<script>`.

- [ ] **Step 4: Trocar o índice pela prancha em `PainelTecidos`**

O `<h3>Aviamentos</h3>` vira `<h3 class="subtitulo-painel">` dentro da prancha, alinhado à
coluna. O filete tracejado de cima (`border-top`) fica na prancha.

- [ ] **Step 5: Conferir (inclui os Review Focus 2, 3 e 5)**

- **Fechadas:** o snippet do Step 1 dá `pecas: 14`, `abertas: 0`, `grandes: 10`.
- **Teclado:** focar a primeira peça e dar 14 Tabs. Cada `summary` recebe foco, com o
  tracejado visível. Enter abre e fecha; Espaço também.
- **Todas abertas:** com `document.querySelectorAll("[data-aviamento]").forEach(d => d.open = true)`,
  fotografar a prancha em 1280×720, 1920×1080 e 2560×1440. Nenhuma etiqueta cobre peça
  vizinha nem sai da `.prancha`, e nenhuma peça cobre outra. Se cobrir, ajustar x/y ou o
  lado da etiqueta na tabela.
- **Movimento reduzido** (emular `prefers-reduced-motion: reduce`): abrir uma peça. A
  etiqueta aparece sem animação.
- **Densidade 2×:** a 2560×1440 com `deviceScaleFactor: 2` (CDP
  `Emulation.setDeviceMetricsOverride`), fotografar a prancha e anotar se as peças ficam
  moles. Só registrar, sem mudar nada.
- **Tela estreita:** em 600px de largura, a grade com as 14 peças abre e fecha igual.

- [ ] **Step 6: Documentar, checar e fazer commit**

`src/components/CLAUDE.md` ganha a seção "PranchaAviamentos", com estes pontos:
- `<details>` nativo, e o nome escondido pelo navegador;
- `DENSIDADE_AVIAMENTOS`;
- as posições escritas à mão;
- `data-aviamento`, e por que não `data-grande`;
- que o "Botão imantado" do book ficou de fora por decisão.

Run: `npx astro check` → `0 errors`; `npm run build` → `Complete!`; `npm test` →
`pass 8`.

```bash
git add src/components/PranchaAviamentos.astro src/data/tecidos.ts src/components/PainelTecidos.astro src/components/CLAUDE.md
git commit -F <scratchpad>/msg-aviamentos.txt   # "Troca o índice de aviamentos por uma prancha com estrelinha e nome no clique"
```

---

### Task 5: Estrelas do Mapa fora dos croquis e do título

**Files:**
- Modify: `src/components/PainelMapa.astro` (CSS de `.fila` e do `h2`)
- Modify: `src/components/CLAUDE.md` (seção "PainelMapa")

**Interfaces:** nenhuma nova.

**Mecanismo (decidido):** cada `.fila` e o `h2` do Mapa ganham
`background-color: var(--cor-linho-claro)` e um `box-shadow: 0 0 1.25rem 1.25rem var(--cor-linho-claro)`.
O campo de estrelas vive em `z-index: -1` dentro do `.papel-mapa` isolado, então tudo o que é
conteúdo pinta por cima dele. O fundo apaga as estrelas atrás dos croquis, e a sombra da cor
do papel esfuma as que ficam na beira, sem estrela cortada a faca. Máscara CSS foi
descartada: não alcança o retângulo de cada fileira, que muda com `--h`.

- [ ] **Step 1: O teste que falha**

Fotografar o Mapa em 2560×1440, 1920×1080 e 1280×720. Hoje há estrela atrás e entre os
croquis, e encostada no título.

- [ ] **Step 2: Aplicar o CSS acima**

Com um comentário: as estrelas foram postas de propósito, e o fundo das fileiras é o que as
tira de trás dos croquis.

- [ ] **Step 3: Fotografar de novo nas três telas e olhar no pixel**

Expected:
- nenhuma estrela atrás ou na frente de croqui, nem encostada no título;
- em 1280×720 ainda há estrelas nas duas laterais (sobram ~190px de cada lado da fileira);
- o papel não mostra retângulo mais claro em volta das fileiras;
- o croqui continua subindo 6px no hover sem levar fundo junto. O fundo é da `.fila`, não do
  botão.

- [ ] **Step 4: Documentar, checar e fazer commit**

Em `src/components/CLAUDE.md`, "PainelMapa" ganha uma linha: as fileiras e o título têm
fundo de papel com sombra da mesma cor, para o campo de estrelas não passar por trás dos
croquis.

Run: `npx astro check` → `0 errors`; `npm run build` → `Complete!`.

```bash
git add src/components/PainelMapa.astro src/components/CLAUDE.md
git commit -F <scratchpad>/msg-mapa.txt   # "Tira as estrelas do fundo de trás dos croquis do mapa"
```

---

### Task 6: Texto da Persona na coluna dos títulos

**Files:**
- Modify: `src/components/CaixaFotos.astro` (`.palco.caixa-armada`)
- Modify: `src/components/CLAUDE.md` (seção "CaixaFotos")

**Interfaces:** nenhuma nova.

**CSS (decidido):** em `.palco.caixa-armada`:
- `padding-left: max(clamp(1.5rem, 5vw, 4rem), calc((100% - var(--coluna-painel)) / 2))`;
- o `padding-right` continua `clamp(1.5rem, 5vw, 4rem)`;
- `grid-template-columns: min(38%, 32rem) 1fr`.

Em 1280 os dois valores dão o de hoje (38% < 32rem; preenchimento de 4rem > o da coluna).
Nada de `max-width` nem margem automática no `.palco`.

- [ ] **Step 1: O teste que falha**

Em 2560×1440 e 1920×1080, com a Persona armada (rolar até o meio do pin), medir a borda
esquerda do `[data-conto-caixa]` e a de `#cores .titulo-painel`. Hoje: 56 contra 665 em
2560.

- [ ] **Step 2: Aplicar o CSS**

- [ ] **Step 3: Medir e fotografar**

Expected:
- a borda esquerda do conto é igual à do título (±8px) em 1920 e 2560;
- em 1280 o conto fica onde está hoje (64px);
- percorrendo o pin inteiro em 2560, nenhuma foto da mesa sai cortada pelo
  `overflow: hidden` do palco. Fotografar no começo, no meio e no fim.

Run: `CHROME=... piloto.mjs rolagem --tela=1280x720` → `0/70`, `problemas: nenhum`.

- [ ] **Step 4: Documentar, checar e fazer commit**

Em `src/components/CLAUDE.md`, "CaixaFotos" ganha uma linha: o conto começa na coluna dos
títulos pelo `padding-left` do palco e pela coluna `min(38%, 32rem)`, nunca por `max-width`
no palco pinado.

Run: `npx astro check` → `0 errors`; `npm run build` → `Complete!`.

```bash
git add src/components/CaixaFotos.astro src/components/CLAUDE.md
git commit -F <scratchpad>/msg-persona.txt   # "Alinha o texto da Persona com a coluna dos títulos"
```

---

### Task 7: Bateria final

**Files:** nenhum (só conferência), a não ser que algo falhe.

- [ ] **Step 1: Checks**

Run (cada um num comando): `npm test` → `pass 8`; `npx astro check` → `0 errors`;
`npm run build` → `Complete!`.

- [ ] **Step 2: Piloto em 1280×720**

Run: `rolagem` → `0/70`, `problemas: nenhum`; `ancoras` → todas as seções com `ok` a 96px;
`reduzido` → `0/70` e a materioteca sem `.armada`, com 10 minis.

- [ ] **Step 3: Volta completa em 2560×1440**

Rolar a página inteira devagar e fotografar cada seção mexida, olhando no pixel: Cores,
Tecidos (começo, meio e prancha com tudo aberto), Estampas, Mapa, Mapa do desfile, Mood e
Persona. Comparar com as fotos de antes em
`/private/tmp/claude-502/-Users-leonardomonteiro-orca-workspaces-landing-octa-2026-new/3cb8cd5e-6bdf-4cb8-946e-f79b14e7b0a0/scratchpad/1440/`.

- [ ] **Step 4: Relatar**

Mandar para o Leonardo o que passou e o que ficou de fora, incluindo a foto da prancha em
2×. O `package-lock.json` segue modificado e fora dos commits.
