---
name: run-landing-octa-2026
description: Sobe, roda e dirige o book digital Triádico (Astro estático) — build, dev server, screenshot e as conferências do piloto (revelações do GSAP, âncoras da Lenis, movimento reduzido). Use quando pedirem para rodar, subir, abrir, testar, tirar screenshot ou conferir visualmente a página. Roda UM comando por pedido, o que cobre exatamente o que foi pedido; a bateria inteira só quando o usuário pedir por ela.
---

# Rodar o Triádico

Astro 4 estático em `http://localhost:4321/landing-octa-2026` (o `base` do
GitHub Pages vale também no dev — a raiz `/` devolve 404). A página é toda
scroll-driven: GSAP + ScrollTrigger + Lenis. Abrir e não rolar não prova nada,
porque as falhas típicas daqui são revelações que ficam presas em `opacity: 0`.

Quem dirige é `.claude/skills/run-landing-octa-2026/piloto.mjs`: liga no Chrome
por CDP, **sem nenhuma dependência** (o `WebSocket` é o global do Node 22). Ele
mesmo sobe o `astro dev` se a 4321 estiver livre, e derruba no fim.

Caminhos abaixo são relativos à raiz do repositório.

## Escopo: rode só o que foi pedido

**Um comando por pedido.** Cada invocação do piloto sobe o `astro dev`, abre um
Chrome, dirige a página e derruba tudo: são ~14 s a frio, e o `rolagem` ainda
devolve 15 quadros para olhar um a um. Rodar a bateria inteira "por garantia"
custa perto de um minuto de relógio mais três leituras de imagem, e na maioria
dos pedidos confere coisa que ninguém tocou. Não faça isso.

Escolha **o** comando que cobre o que o usuário pediu:

| O pedido / o que mudou | O que rodar |
|---|---|
| "roda", "sobe", "abre", "tira um print", "como ficou a seção X" | `foto --tela=1280x720 --y=<altura da seção>` |
| Mudança só de cor, tipografia, texto, espaçamento — CSS estático | `npm run build` (ou `foto`, se ele quiser ver) |
| Mexeu em `mm.add`, em `gsap.from/to`, em revelação, em `opacity` | `rolagem` |
| Mexeu em âncora, `scroll-mt-*`, sumário, configuração da Lenis | `ancoras` |
| Mexeu em `matchMedia`, `.armada`, `.tira-travada`, `@keyframes` | `reduzido` |
| Mexeu na `LeituraAutomatica`, na velocidade dela ou na Lenis | `leitura` |
| Novo `ScrollTrigger`, `refreshPriority`, seção nova entre outras duas | `rolagem` |

A bateria completa (`rolagem` + `ancoras` + `reduzido`) só sai quando o usuário
**pedir por ela** — "roda tudo", "confere tudo", "bateria completa", "antes de
commitar confere a página". Não rode nada por iniciativa própria depois de cada
edição, e não emende um segundo comando "já que o servidor está de pé": ele não
fica de pé entre invocações.

Se você não souber qual comando cobre a mudança, **pergunte** em uma linha em
vez de rodar os três.

## Pré-requisitos

Nada de `npm i` extra. Só o que o repo já pede, mais um Chrome (ou Edge) no
sistema:

```bash
npm ci
```

O piloto acha o navegador sozinho em `C:/Program Files/Google/Chrome/...`,
no Edge, ou em `/usr/bin/google-chrome` e `/usr/bin/chromium`. Fora desses,
aponte com `CHROME=<caminho>`.

Medido nesta máquina: Node v22.17.1, Chrome em
`C:/Program Files/Google/Chrome/Application/chrome.exe`.

## Rodar (caminho do agente)

Cada um dos comandos abaixo sobe tudo, confere e limpa atrás de si — e é para
rodar **um**, o que o pedido pede (ver *Escopo* acima). Saem com código
1 se a página acusar erro de console, exceção não tratada ou recurso que não
carregou — `problemas: nenhum` também quer dizer que nenhum dos recortes deu
404, o que importa numa página cujo peso é quase todo imagem.

```bash
# Varre o documento inteiro e fotografa 15 quadros. ~14 s a frio.
node .claude/skills/run-landing-octa-2026/piloto.mjs rolagem

# Clica em cada link do MenuConstelação e confere o ponto de parada.
node .claude/skills/run-landing-octa-2026/piloto.mjs ancoras

# Emula prefers-reduced-motion: reduce e confere que nada ficou escondido.
node .claude/skills/run-landing-octa-2026/piloto.mjs reduzido

# Dirige a leitura automática: anda, acelera, pausa e para. ~25 s.
node .claude/skills/run-landing-octa-2026/piloto.mjs leitura

# Um quadro só, em outra tela / outra altura.
node .claude/skills/run-landing-octa-2026/piloto.mjs foto --tela=1366x768 --y=2200
```

A tela de projeto é **1280×720** — é nela que se confere (`--tela=1280x720`).
O padrão do piloto ainda é 1440x900 por inércia; passe a tela sempre.

Sinalizadores: `--tela=LARGURAxALTURA` (padrão `1440x900`), `--saida=DIR`
(padrão `.piloto/`, já ignorado pelo git), `--passos=N` (quadros do `rolagem`,
padrão 14), `--porta=N` (porta do CDP, padrão 9222), `--porta-dev=N` (porta do
astro, padrão 4321), `--cabeca` (abre com janela em vez de headless),
`--rota=CAMINHO` (outra página do site em vez da home — só a home tem o
MenuConstelação e as revelações que `rolagem` e `ancoras` cobram, então numa
rota de piloto use `foto`).

**`--rota` no Git Bash precisa de `MSYS_NO_PATHCONV=1`.** O MSYS converte todo
argumento que começa com barra em caminho do Windows: `--rota=/piloto/x` chega
no script como `--rota=C:/Program Files/Git/piloto/x`, a navegação vai para uma
URL inexistente e o piloto **trava calado** esperando o `load` que nunca vem.
Foi meia hora de depuração. Duas saídas: `MSYS_NO_PATHCONV=1 node ...` ou
escrever a rota sem a barra inicial (`--rota=piloto/x`). No PowerShell não
acontece.

`--porta-dev` existe por causa de uma armadilha silenciosa: se a 4321 já
responde, o piloto **reaproveita** aquele servidor — e um `npm run dev` aberto
noutro checkout (um worktree, por exemplo) passa por este sem avisar. Quando
houver um dev server de outra pasta no ar, use `--porta-dev=4322` (e
`--porta=9223`, se também houver um Chrome na 9222).

**Olhe as imagens.** O piloto confere o que dá para medir, mas os bugs desta
página são de *pintura* — a estrela da capitular já foi pintada a mil pixels
do lugar enquanto o `getBoundingClientRect` jurava 0px de desvio. Quadro em
branco ou peça fora do lugar só aparece no pixel.

### O que cada comando afirma

`rolagem` imprime o título, se a classe `pre-anima` saiu do `<html>`, o
`scrollHeight`, e quantos alvos do GSAP (`[data-peca-conceito]`,
`[data-verso]`, `[data-margem]`, `[data-foto-caixa]`, `[data-conto-caixa] p`,
`.folha-conto p`, `.peca`, `#conceito p`, `[data-cartela-peca]`, `[data-croqui]`) ficaram com
`opacity < 0.05` ou `visibility: hidden` depois de tudo revelado. Saída boa:

```
título: Triádico — Book Digital · Vitória Baratto
pre-anima ainda no <html>: false
scrollHeight: 26948
alvos invisíveis ao final: 0/70
problemas: nenhum
```

Qualquer número diferente de `0/70` é revelação presa — provavelmente um
`onLeaveBack` mal calibrado ou um `transition` largo do Tailwind num alvo de
`gsap.from({ opacity: 0 })`.

`ancoras` exige que cada seção pare a exatamente o próprio `scroll-margin-top`
(96px, do `scroll-mt-24`), com 2px de tolerância. É o detector do
`anchors: { offset }` na Lenis, que dobraria para 192px:

```
ok  conceito: parou a 96px (scroll-margin-top 96px)
ok  mood: parou a 96px (scroll-margin-top 96px)
ok  persona: parou a 96px (scroll-margin-top 96px)
ok  trendboard: parou a 96px (scroll-margin-top 96px)
```

`reduzido` cobra os contratos de movimento reduzido de uma vez: a `pre-anima`
nem deve entrar, nada deve estar escondido **sem rolar**, a `.tira` do
trendboard tem de seguir rolável e **sem** a classe `tira-travada` (se o
matchMedia reverter e a classe ficar, a seção vira uma tira que não rola), e a
materioteca tem de estar **sem** `.armada`, com as dez miniaturas visíveis (se
a classe ficar, a seção fica sem imagem nenhuma):

```
pre-anima no <html>: false
alvos invisíveis sem rolar: 0/70
tira do trendboard: {"travada":false,"rolavel":true,"overflowX":"auto"}
materioteca: {"armada":false,"minisVisiveis":10,"minis":10}
```

`leitura` dirige a `LeituraAutomatica`. Tudo o que ele afirma sobre andar sai
de **delta de scroll entre dois instantes**, nunca do estado do controle: o
`data-estado` pode dizer "andando" com a página imóvel, e é justamente esse o
bug que o comando existe para pegar. Ele também recorta o controle em duas
fotos (`leitura-controle-capa.png` e `leitura-controle-repouso.png`) — um
controle de 40px de alto some numa foto de 1280px, e já houve palavra sumida
ali que só o recorte mostrou (ver a armadilha do `.sr-only`, abaixo):

```
ok   na capa o convite vem escrito: "Leitura automática"
ok   andou sozinha: 241px em 1,5 s (1×)
ok   o controle cabe na tela: 278px, de 986 a 1264 (tela 1280)
ok   acelerou: 724px em 1,5 s (3×, contra 241px em 1×)
ok   pausada, não anda: 0px em 1,2 s
ok   rolar na roda pausou a leitura sozinho
ok   fora da capa, em repouso, fica só o ícone
percorreu 1540px de 22365px; a página inteira leva ~2.2 min a 1×
```

Quem confere revelação presa continua sendo o `rolagem`: a leitura anda uns
poucos milhares de pixels, e rodar a auditoria ali acusaria como "preso" tudo
o que ela ainda nem visitou.

## Rodar (caminho humano)

```bash
npm run dev
```

Sobe em ~750 ms e imprime `http://localhost:4321/landing-octa-2026`. Abra no
navegador e role. Ctrl-C para parar — mas veja a primeira armadilha abaixo.

## Build

```bash
npm run build
npm run preview
```

## Armadilhas

- **Matar o `npm run dev` não mata o `astro`.** O `npm` do Windows é um `.cmd`,
  então o processo é neto: derrubar o `npm` (ou o `spawn` do Node com
  `shell: true`) deixa o node do astro escutando e a 4321 ocupada. Foi o que
  vazou aqui antes do piloto passar a usar `taskkill /T /F`. Se a porta ficar
  presa, ache o dono e derrube:

  ```powershell
  Get-NetTCPConnection -LocalPort 4321 -State Listen | Select-Object OwningProcess
  Stop-Process -Id <pid> -Force -Confirm:$false
  ```

- **A barra de ferramentas do Astro entra em todo screenshot.** Aparece no
  rodapé, centralizada, em cima do conteúdo — o widget escuro que corta a
  legenda do painel conceito nos quadros. Ela também injeta ids no documento
  (`integration-list`, `links`, `header-left`, `audit-counts`), então uma
  varredura por `[id]` traz lixo junto dos ids reais (`conceito`, `mood`,
  `persona`, `trendboard`). Não é bug da página.

- **O `clip` do `Page.captureScreenshot` é coordenada do documento.** O
  `getBoundingClientRect` é da viewport. Recortar um controle `position: fixed`
  com o retângulo cru, numa página rolada a 2.000px, devolve um pedaço de fundo
  2.000px acima dele — imagem plausível, lugar errado. O `caixaDe()` do piloto
  soma o `scrollX/scrollY` por isso.

- **Esperar depois de rolar não é opcional.** A Lenis interpola o scroll e o
  ScrollTrigger dispara *depois* dela assentar. O piloto usa 700 ms por passo,
  que foi o que funcionou; valores menores não foram medidos. Ler opacidade
  antes disso devolve o meio da transição, não o repouso — o mesmo motivo pelo
  qual não se mede `getComputedStyle` logo após mexer numa classe.

- **O Chrome solta o `--user-data-dir` um instante depois de morrer.** Apagar o
  perfil na mesma hora falha calado e deixa lixo no `%TEMP%`. O piloto espera
  400 ms antes do `rm`. Se sobrar:

  ```powershell
  Get-ChildItem $env:TEMP -Filter 'piloto-triadico-*' -Directory | Remove-Item -Recurse -Force
  ```

- **`/` devolve 404.** O `base` é `/landing-octa-2026` e vale no dev também.

- **Não há `playwright` no projeto.** Os browsers do Playwright até estão em
  cache em `~/AppData/Local/ms-playwright`, mas o pacote não é dependência e o
  projeto é deliberadamente enxuto — por isso o piloto fala CDP puro em vez de
  trazer `playwright-core`. Não adicione a dependência só para dirigir a página.

## Troubleshooting

| Sintoma | Causa e conserto |
|---|---|
| `O astro dev não respondeu em 60 s.` | Quase sempre a 4321 já está tomada por um astro órfão de uma rodada anterior. Veja a primeira armadilha. |
| `Nenhum Chrome/Edge encontrado.` | Passe `CHROME=<caminho do executável>`. |
| `Chrome subiu mas não expôs nenhuma aba.` | Outro Chrome já ocupa a 9222. Use `--porta=9223`. |
| `alvos invisíveis ao final: N/64` com N > 0 | Revelação presa. O nome das peças presas sai na linha seguinte. |
| `RUIM <seção>: parou a 192px` | Voltou o `anchors: { offset }` na Lenis. O ajuste é no `scroll-mt-*` do markup. |
| Screenshot em branco | A página não carregou; confira a linha `problemas:` e se a 4321 responde. |
