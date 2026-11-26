# Design de superfície com as peças prontas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a cartela de estampas passa a mostrar cada superfície ao lado da peça pronta em
que foi usada: os xadrezes com a gola e a blusa, o retalho com o casaco e o bordado com o
desenho técnico da calça.

**Architecture:**
- **Extrator:** um extrator novo gera os três assets a partir de `src/assets/`. A limpeza
  do desenho da calça é uma função pura, testada sem rede e sem tela. A vetorização usa
  `potrace`, só no extrator.
- **Componente:** o `PainelEstampas` é recomposto em pares dentro da mesma cartela e
  reaproveita a revelação que já existe (IO, varredura e `onUpdate`).

**Tech Stack:** Astro 4, Tailwind v4, GSAP, sharp, potrace 2.1.8 (devDependency) e
`node --test`.

**Spec:** `docs/superpowers/specs/2026-11-25-design-de-superficie-pecas-design.md`

**Protótipo que já funciona:** `.piloto/prototipo-limpa-calca.mjs`, com o mapa pixel a
pixel em `.piloto/prototipo-mapa.cjs`. O Task 1 porta os passos 1 a 8 do protótipo e o
Task 2, os passos 9 e 10. Os números de `SETAS` e `REPAROS` vêm dele sem mudança.

## Global Constraints

- **Tela:** a da apresentação, 2560×1440. É nela que se confere, mais uma foto com
  densidade 2×. Nunca use 1280×720 como alvo.
- **Rapport:** a amostra de xadrez tem 242×242, com `background-size: 242px 242px`.
  Nunca reamostrar.
- **Texto:** a seção não escreve nada visível. As imagens novas têm `alt`, e a
  `figcaption` (`sr-only`) cita as peças.
- **Hierarquia:** a foto nunca é maior que a amostra do par, e nenhuma foto passa do
  tamanho nativo.
- **Idioma:** tudo em português (nomes, comentários, `data-*`), e nenhum nome de card no
  código.
- **Saída gerada** (`src/assets/estampas/aplicacoes/*` e `src/data/aplicacoes-medidas.ts`)
  nunca é editada à mão: muda-se o extrator e roda-se de novo.
- **GSAP:** nenhum alvo de GSAP com a utilidade `transition` do Tailwind; use
  `opacity`, não `autoAlpha`, em imagem com `alt`.
- **`potrace`:** só como `devDependency`, importado por `scripts/` e nunca por `src/`.
- **Gates e commits:**
  - lint, testes e build rodam num comando próprio, e o resultado é lido antes do commit;
  - a mensagem de commit vai num arquivo do scratchpad (`git commit -F <arquivo>`), porque
    o hook bloqueia "npm test" no texto;
  - commit só com o ok do Leonardo.

## Review Focus

1. **Salto pelo sumário ou `End` por cima da seção:** nenhuma das oito imagens pode
   ficar presa em `opacity: 0`. Teste: o `rolagem` e o `ancoras` do piloto (Task 3).
2. **Chegada pela âncora em 2560×1440:** o título e a cartela inteira ficam abaixo da
   barra de 6rem do sumário. Teste: uma medição no piloto (Task 3).
3. **Densidade 2×:** os xadrezes continuam nítidos (`image-set` 2×) e nenhuma emenda
   aparece. Teste: `foto --densidade=2` (Task 3).
4. **Movimento reduzido:** tudo visível e parado. Teste: o `reduzido` do piloto (Task 3).
5. **Janela estreita (390×844):** os pares empilham, sem rolagem horizontal. Teste: uma
   medição no piloto (Task 3).

---

### Task 1: Limpeza do desenho como função pura

**Files:**
- Create: `scripts/lib/limpeza-desenho.mjs` (o algoritmo: sem IO e sem sharp)
- Create: `scripts/lib/desenho-calca.mjs` (os dados da calça: `CAIXA_CALCA`,
  `SETAS_CALCA`, `REPAROS_CALCA`)
- Test: `tests/limpeza-desenho.test.mjs`

**Interfaces:**
- Produces:
  - `distanciaAoSegmento(px: number, py: number, de: [number, number], ate: [number, number]) -> { d: number, t: number }`;
  - `limparDesenho({ rgb: Uint8Array, largura: number, altura: number, setas: Seta[], reparos: Reparo[] }) -> { cinza: Uint8Array, alfa: Uint8Array, corte: { left, top, width, height } }`:
    - `rgb` tem 3 canais;
    - `cinza` e `alfa` têm 1 canal cada, no tamanho inteiro da entrada;
    - `alfa` vale 255 ou 0;
    - lança `Error` com "vazou" na mensagem quando o fundo alcança mais de 2% da peça.
  - Tipos, em JSDoc:
    - `Seta = { nome: string, bolinha: [x, y, raio], pontos: [x, y][] }`;
    - `Reparo` é um destes três:
      - `{ tipo: "traco", nome, de, ate, raio }`;
      - `{ tipo: "costura", nome, de, ate, raio, pontos }`;
      - `{ tipo: "borda", de, ate, area: [x0, y0, x1, y1] }`.
  - De `desenho-calca.mjs`: `CAIXA_CALCA = { left: 985, top: 515, width: 400, height: 500 }`,
    e `SETAS_CALCA` e `REPAROS_CALCA` copiados do protótipo, com `TINTA_COSTURA = 125` e
    o pesponto da barra com `raio: 0.6`.

- [ ] **Step 1: Write the failing tests** em `tests/limpeza-desenho.test.mjs`:

```js
test("distanciaAoSegmento: em cima, ao lado e além da ponta", () => {
  assert.equal(distanciaAoSegmento(5, 0, [0, 0], [10, 0]).d, 0);
  assert.equal(distanciaAoSegmento(5, 3, [0, 0], [10, 0]).d, 3);
  assert.equal(distanciaAoSegmento(13, 4, [0, 0], [10, 0]).d, 5);
});
```

Quadrado sintético, 40×40:
- fundo `(195, 196, 191)`;
- quadrado branco de 10 a 29, com contorno preto de 1px em x = 10, x = 29, y = 10 e
  y = 29;
- linha azul `(52, 57, 77)` em y = 20, de x = 15 a x = 39.

`seta = { nome: "teste", bolinha: [15, 20, 1.5], pontos: [[15, 20], [39, 20]] }` e
`reparo = { tipo: "traco", nome: "contorno", de: [29, 15], ate: [29, 25], raio: 0.55 }`.

- `limparDesenho: a seta some e o contorno cortado fica contínuo`. Com o reparo:
  - `alfa` em (20, 20) é 255 e em (35, 20) é 0;
  - `cinza` em (29, 20) é menor que 100, e em (22, 20) é 255;
  - `corte` é `{ left: 8, top: 8, width: 24, height: 24 }`.
- `limparDesenho: sem o reparo o fundo vaza e a função recusa`, com
  `assert.throws(..., /vazou/)`.
- `limparDesenho: a calça real fecha sem vazar e enquadra 353×472`:
  - lê `src/assets/desenhos/11.jpeg` com sharp, recortado em `CAIXA_CALCA`, com
    `removeAlpha().raw()`;
  - roda com `SETAS_CALCA` e `REPAROS_CALCA`;
  - `corte` é `{ left: 21, top: 11, width: 353, height: 472 }`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, com "Cannot find module '../scripts/lib/limpeza-desenho.mjs'".

- [ ] **Step 3: Implement `limpeza-desenho.mjs` e `desenho-calca.mjs`**

Porte os passos 1 a 8 do protótipo, cada um numa função nomeada, todas internas e
chamadas por `limparDesenho`:

- `marcarAnotacao`;
- `inundarDaBorda`;
- `votarForaDentro`;
- `maiorComponente`;
- `preencherPorMediana`;
- `aplicarReparos`;
- `fecharSilhueta`, que lança o erro quando vaza, sem gravar `vazou.png` (a função é
  pura);
- `enquadrar`.

Os limiares do protótipo entram como constantes nomeadas no topo, cada uma com o porquê
numa linha:
- azul: `b − r ≥ 7` e `lum < 215`;
- dilatação: 2;
- `LARGURA_SETA`: 2,5;
- `RAIO_VOTO`: 4;
- corte do branco: 215;
- vazamento: 2%.

No cabeçalho de `desenho-calca.mjs`, explique:
- os pontos foram lidos com o mapa pixel a pixel;
- uma regra genérica de "ponte" não converge (curta, deixa o contorno aberto; longa,
  inventa tinta entre o bolso e o bordado);
- seta nova pede reparo novo, lido no mapa.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS nos quatro testes novos e nos de `margens` e `materioteca`.

- [ ] **Step 5: Commit** (com o ok do Leonardo):
  `scripts/lib/limpeza-desenho.mjs`, `scripts/lib/desenho-calca.mjs` e
  `tests/limpeza-desenho.test.mjs`, com a mensagem "Limpa o desenho da calça: tira fundo e
  setas e refaz o traço cortado".

### Task 2: Extrator das aplicações

**Files:**
- Create: `scripts/extract-aplicacoes.mjs`
- Generated: `src/assets/estampas/aplicacoes/xadrez-gola-blusa.webp`,
  `retalho-casaco.webp` e `bordado-calca.png`
- Generated: `src/data/aplicacoes-medidas.ts`
- Modify: `package.json` (script e devDependency), `package-lock.json`
- Modify: `CLAUDE.md` (tabela de extratores e uma armadilha)

**Interfaces:**
- Consumes: `limparDesenho` e `CAIXA_CALCA`, `SETAS_CALCA` e `REPAROS_CALCA` (Task 1).
- Produces:
  - em `src/data/aplicacoes-medidas.ts`, `export const proporcaoAplicacoes: Record<string, number>`,
    com as chaves `"xadrez-gola-blusa"`, `"retalho-casaco"` e `"bordado-calca"`, largura
    por altura, com 4 casas;
  - os três arquivos em `src/assets/estampas/aplicacoes/`.

- [ ] **Step 1: Instalar o potrace**

Run: `npm install --save-dev potrace@2.1.8 --registry=https://registry.npmjs.org`
Expected: `package.json` ganha `"potrace": "^2.1.8"` em `devDependencies`. Leia o diff
do lock antes de seguir. Ele já tinha uma mudança alheia antes deste plano (11 linhas
`"dev": true` a menos nos pacotes do lightningcss); avise o Leonardo e não reverta.

- [ ] **Step 2: Implement `scripts/extract-aplicacoes.mjs`**, com `npm run extract:aplicacoes`
  e `--conferir`.

Recortes de foto, em pixels da foto original. São os recortes que o Leonardo mandou,
achados por correlação:

```js
const RECORTES = {
  "xadrez-gola-blusa": { foto: "9.jpeg", left: 236, top: 244, width: 342, height: 272 },
  "retalho-casaco": { foto: "3.jpeg", left: 124, top: 396, width: 350, height: 470 },
};
```

- **Fotos:** vão para WebP com qualidade 90, no tamanho nativo, sem redimensionar.
- **Calça:**
  - `limparDesenho` e depois a função nomeada `vetorizarCalca`, que é o passo 9 do
    protótipo (traço e silhueta pelo potrace, escala 4 e limiar 185);
  - rasterizar o SVG com sharp para PNG de **840px de altura** (3× os ~280px de
    exibição);
  - o SVG não é gravado em `src/`.
- **`--conferir`:** grava as lupas do passo 10 em `.piloto/calca-bordado-lupas.png`.
- **Cabeçalho do script:** explica por que só lê de `src/assets/` (`reference/` não existe
  em todo checkout) e por que o PNG, e não o SVG inline (a armadilha "SVG grande no HTML").
- **`aplicacoes-medidas.ts`:** começa com o cabeçalho `GERADO por
  scripts/extract-aplicacoes.mjs — não editar à mão`, no padrão de
  `estampas-medidas.ts`.

- [ ] **Step 3: Rodar e olhar**

Run: `npm run extract:aplicacoes -- --conferir`
Expected:
- os três arquivos e o `.ts` são gerados;
- em `.piloto/calca-bordado-lupas.png`, os cinco pontos ficam contínuos, como no
  protótipo;
- o Leonardo vê a calça e as lupas no Orca (`orca file open <arquivo> --focus`).

- [ ] **Step 4: Determinismo**

Run: `npm run extract:aplicacoes` duas vezes, com um `git add` dos gerados entre as duas
rodadas, e depois `git diff --stat`.
Expected: diff vazio.

- [ ] **Step 5: Documentar no `CLAUDE.md` da raiz**

- **Tabela de extratores:** uma linha com `npm run extract:aplicacoes`, que gera
  `src/assets/estampas/aplicacoes/` e `src/data/aplicacoes-medidas.ts`; com `--conferir`,
  grava `.piloto/calca-bordado-lupas.png`.
- **Armadilhas:** um item curto com três pontos:
  - as setas de legenda dos desenhos técnicos cortam o traço;
  - o reparo é por coordenada lida no mapa, e uma "ponte" genérica não converge;
  - quem confere é o `--conferir`, olhando a lupa.

- [ ] **Step 6: Commit** (com o ok do Leonardo): o script, os gerados, `package.json`,
  `package-lock.json` e o `CLAUDE.md`.

### Task 3: A cartela em pares

**Files:**
- Modify: `src/data/estampas.ts` (o bloco `aplicacoes`)
- Modify: `src/lib/superficies.ts` (`aplicacaoSuperficie`)
- Modify: `src/components/PainelEstampas.astro` (markup, estilo e atrasos)
- Modify: `.claude/skills/run-landing-octa-2026/piloto.mjs` e `SKILL.md` (`--densidade`)
- Modify: `src/components/CLAUDE.md` (o contrato do PainelEstampas)

**Interfaces:**
- Consumes: `proporcaoAplicacoes` e os três arquivos (Task 2).
- Produces:
  - em `estampas.ts`, `export interface AplicacaoSuperficie { nome: string; alt: string; aspect: number }`
    e `export const aplicacoes: Record<"xadrezes" | "retalho" | "bordado", AplicacaoSuperficie>`;
  - em `superficies.ts`, `aplicacaoSuperficie(nome: string): ImageMetadata`, com um glob
    em `../assets/estampas/aplicacoes/*.{webp,png}` e o mesmo erro `faltou` apontando
    `npm run extract:aplicacoes`.

- [ ] **Step 1: Dados.** Os `alt`, com o texto exato:
  - `xadrez-gola-blusa`: "Duas modelos lado a lado: a gola larga do casaco marinho e a
    blusa de tule por baixo do corselete de couro vermelho, as duas no xadrez cinza da
    coleção."
  - `retalho-casaco`: "Frente do casaco marinho, com a faixa de retalho em vinho, azul e
    oliva descendo da gola e cruzando na altura do quadril."
  - `bordado-calca`: "Desenho técnico das costas da calça jeans, com o bordado da
    assinatura no bolso de trás."

  O `aspect` de cada uma vem de `proporcaoAplicacoes`, e o código lança erro se faltar.

- [ ] **Step 2: Markup e estilo do `PainelEstampas`**

**Fileira 1:**
- os três panos, sem mudar nada neles;
- depois, a `.aplicacao.foto` da gola e blusa:
  - `height: 242px` e largura pela proporção (~304px);
  - a sombra do `.papel`;
  - `atraso` 0,24.

**Fileira 2:** dois `.par`.
- Retalho (`atraso` 0,28) com o casaco (`.aplicacao.foto`, `height: 270px`, `atraso`
  0,36).
- Bordado (`atraso` 0,44) com a calça:
  - `.aplicacao.desenho`, `height: 270px`, `atraso` 0,52;
  - sem sombra e sem fundo.

**Em toda imagem nova:**
- `data-cartela-peca`, para entrar na revelação, na varredura e na auditoria do piloto
  sem código novo de movimento;
- `<Image>` com `format="webp"` e `widths` que não passam da largura nativa.

**Tela estreita (`max-width: 720px`):** o `.par` vira coluna, e a foto encolhe até
`max-width: 100%`.

**Textos:**
- Atualize o cabeçalho do componente (os pares e a hierarquia).
- A `figcaption`, com o texto exato: "Cartela com as cinco superfícies da coleção e onde
  cada uma foi usada: os três xadrezes, cada um numa amostra de uma repetição, ao lado da
  gola do casaco e da blusa de tule; o retalho de nove pedaços ao lado da frente do
  casaco; e o bordado da assinatura ao lado do desenho técnico da calça, no bolso de trás."

Se a fileira 1 não couber na coluna, a foto desce de altura. O xadrez não muda.

- [ ] **Step 3: `--densidade=N` no piloto**

- vira o `deviceScaleFactor` do `Emulation.setDeviceMetricsOverride`, com padrão 1;
- entra na lista de sinalizadores do `SKILL.md`.

- [ ] **Step 4: Gates**

Run: `npm test`, depois `npx astro check`, depois `npm run build`, cada um num comando.
Expected: os três passam.

- [ ] **Step 5: Conferir no piloto (2560×1440, o padrão)**

Run, um de cada vez:
- `rolagem`;
- `ancoras`;
- `reduzido`;
- `foto --y=<topo de #estampas>`;
- `foto --densidade=2 --y=<topo de #estampas>`;
- `foto --tela=390x844 --y=<topo de #estampas>`.

Expected:
- **`rolagem`:** nenhum `[data-cartela-peca]` preso, depois de chegar por âncora e por
  `End`.
- **`ancoras`:** em `#estampas`, a cartela tem `bottom ≤ innerHeight` e o título tem
  `top ≥ 96`. Meça com `getBoundingClientRect` e confirme na foto.
- **`reduzido`:** tudo visível.
- **Fotos:**
  - o xadrez nítido, sem emenda, nas duas densidades;
  - a amostra maior que a foto do par.
- **Em 2560 e em 390:** `document.documentElement.scrollWidth ≤ innerWidth`.
- **O Leonardo vê as fotos no Orca.**

- [ ] **Step 6: Contrato em `src/components/CLAUDE.md`, seção PainelEstampas**

Acrescente:
- **os pares:** xadrezes com gola e blusa, retalho com casaco, bordado com calça;
- **a hierarquia:** a foto nunca maior que a amostra, nunca acima do tamanho nativo;
- **as fontes:** as imagens vêm de `extract:aplicacoes`;
- **a calça:** vai sem sombra porque é desenho sobre papel.

Atualize também a linha da revelação: a contagem de imagens da cartela passa de cinco
para oito.

- [ ] **Step 7: Commit** (com o ok do Leonardo): os arquivos da Task 3.
