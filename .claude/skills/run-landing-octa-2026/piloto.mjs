// Piloto do book digital: sobe o `astro dev`, conecta num Chrome headless por
// CDP e dirige a página. Sem dependências — o WebSocket é o global do Node 22.
//
//   node .claude/skills/run-landing-octa-2026/piloto.mjs rolagem
//   node .claude/skills/run-landing-octa-2026/piloto.mjs ancoras
//   node .claude/skills/run-landing-octa-2026/piloto.mjs reduzido
//   node .claude/skills/run-landing-octa-2026/piloto.mjs leitura
//   node .claude/skills/run-landing-octa-2026/piloto.mjs foto --tela=1366x768
//
// Sinalizadores: --tela=LARGURAxALTURA  --saida=DIR  --porta=N  --porta-dev=N
//                --cabeca

import { spawn } from "node:child_process"
import { mkdir, writeFile, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const arg = (nome, padrao) => {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return achado ? achado.slice(nome.length + 3) : padrao
}
const temSinal = (nome) => process.argv.includes(`--${nome}`)

// A porta do astro, não a do CDP. Se a 4321 já responde, o piloto reaproveita
// o servidor que está lá — e o de outro checkout (um worktree, por exemplo)
// passaria por este sem avisar. --porta-dev=4322 abre um só para a rodada.
const portaDev = Number(arg("porta-dev", "4321"))
// --rota=/piloto/tecidos-1 fotografa outra página do site em vez da home. Só
// a home tem MenuConstelação e as revelações que `rolagem` e `ancoras`
// cobram — numa rota de piloto, use `foto`.
// A barra do começo é opcional — e no Git Bash é melhor não usar: o MSYS
// converte argumento que começa com barra em caminho do Windows (ver SKILL.md).
const rota = arg("rota", "").replace(/^\/+/, "")
const ENDERECO = `http://localhost:${portaDev}/landing-octa-2026${rota ? `/${rota}` : ""}`

const comando = process.argv[2] ?? "rolagem"
const [largura, altura] = arg("tela", "1440x900").split("x").map(Number)
const saida = arg("saida", join(process.cwd(), ".piloto"))
const portaCdp = Number(arg("porta", "9222"))

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Chrome ──────────────────────────────────────────────────────────────────

function acharChrome() {
  const candidatos = [
    process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean)
  const achado = candidatos.find((c) => existsSync(c))
  if (!achado) throw new Error("Nenhum Chrome/Edge encontrado. Defina CHROME=<caminho>.")
  return achado
}

async function abrirChrome() {
  const perfil = join(tmpdir(), `piloto-triadico-${Date.now()}`)
  const proc = spawn(
    acharChrome(),
    [
      temSinal("cabeca") ? "--headless=false" : "--headless=new",
      `--remote-debugging-port=${portaCdp}`,
      `--user-data-dir=${perfil}`,
      `--window-size=${largura},${altura}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore", detached: false },
  )

  // O /json/version só responde depois que o socket de depuração abre.
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${portaCdp}/json/version`)
      if (r.ok) break
    } catch {}
    await espera(250)
  }

  const alvos = await (await fetch(`http://127.0.0.1:${portaCdp}/json/list`)).json()
  const pagina = alvos.find((a) => a.type === "page")
  if (!pagina) throw new Error("Chrome subiu mas não expôs nenhuma aba.")

  return { proc, perfil, wsUrl: pagina.webSocketDebuggerUrl }
}

// ─── Sessão CDP ──────────────────────────────────────────────────────────────

class Sessao {
  #ws
  #seq = 0
  #pendentes = new Map()
  #ouvintes = new Map()

  static async conectar(wsUrl) {
    const s = new Sessao()
    s.#ws = new WebSocket(wsUrl)
    s.#ws.addEventListener("message", (ev) => s.#receber(JSON.parse(ev.data)))
    await new Promise((ok, erro) => {
      s.#ws.addEventListener("open", ok, { once: true })
      s.#ws.addEventListener("error", () => erro(new Error("WebSocket do CDP falhou")), { once: true })
    })
    return s
  }

  #receber(msg) {
    if (msg.id != null) {
      const p = this.#pendentes.get(msg.id)
      if (!p) return
      this.#pendentes.delete(msg.id)
      msg.error ? p.erro(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? "")})`)) : p.ok(msg.result)
      return
    }
    for (const fn of this.#ouvintes.get(msg.method) ?? []) fn(msg.params)
  }

  enviar(method, params = {}) {
    const id = ++this.#seq
    return new Promise((ok, erro) => {
      this.#pendentes.set(id, { ok, erro })
      this.#ws.send(JSON.stringify({ id, method, params }))
    })
  }

  ouvir(method, fn) {
    if (!this.#ouvintes.has(method)) this.#ouvintes.set(method, [])
    this.#ouvintes.get(method).push(fn)
  }

  fechar() {
    this.#ws.close()
  }

  // Avalia no contexto da página e devolve o valor já serializado.
  async avaliar(expressao) {
    const r = await this.enviar("Runtime.evaluate", {
      expression: `(() => { ${expressao} })()`,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) throw new Error("Erro na página: " + r.exceptionDetails.text)
    return r.result.value
  }

  // Com `clip` recorta um pedaço da tela, em dobro. Um controle de 40px de
  // alto no canto de uma tela de 1280 é pequeno demais para se conferir na
  // foto inteira — e conferir pela foto é o único jeito de saber se algo foi
  // pintado onde o layout diz que está.
  async foto(caminho, clip) {
    const { data } = await this.enviar("Page.captureScreenshot", {
      format: "png",
      ...(clip ? { clip: { scale: 2, ...clip } } : {}),
    })
    await writeFile(caminho, Buffer.from(data, "base64"))
  }

  // O retângulo de um elemento, com folga, para passar ao `clip`. O `clip` do
  // CDP é em coordenada do **documento**, e o getBoundingClientRect é da
  // **viewport**: sem somar o scroll, o recorte de um controle fixo numa
  // página rolada a 2.000px sai 2.000px acima dele — só fundo.
  async caixaDe(seletor, folga = 8) {
    const r = await this.avaliar(`
      const el = document.querySelector(${JSON.stringify(seletor)})
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }
    `)
    if (!r) return null
    return { x: r.x - folga, y: r.y - folga, width: r.width + folga * 2, height: r.height + folga * 2 }
  }

  // Clique de verdade (Input.*) em vez de `el.click()`: a Lenis trata âncora
  // num ouvinte de click no documento, e evento confiável é o que mais se
  // parece com o usuário. (`el.click()` talvez funcione — não foi medido.)
  //
  // `rolar: false` é para alvo `position: fixed`: o scrollIntoView do Chrome
  // move o documento mesmo com o alvo já na tela — ele calcula o desvio até o
  // centro uma vez e rola —, e num controle fixo isso é rolagem que ninguém
  // pediu. No meio de uma aferição de "pausado não anda", daria RUIM falso.
  async clicar(seletor, { rolar = true } = {}) {
    const caixa = await this.avaliar(`
      const el = document.querySelector(${JSON.stringify(seletor)})
      if (!el) return null
      ${rolar ? 'el.scrollIntoView({ block: "center", behavior: "instant" })' : ""}
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    `)
    if (!caixa) throw new Error(`Seletor não encontrado: ${seletor}`)
    const comum = { x: caixa.x, y: caixa.y, button: "left", clickCount: 1 }
    await this.enviar("Input.dispatchMouseEvent", { type: "mousePressed", ...comum })
    await this.enviar("Input.dispatchMouseEvent", { type: "mouseReleased", ...comum })
  }
}

// ─── Servidor de desenvolvimento ─────────────────────────────────────────────

async function noAr() {
  try {
    return (await fetch(ENDERECO, { redirect: "manual" })).status < 500
  } catch {
    return false
  }
}

async function subirAstro() {
  if (await noAr()) return null

  // `npm` no Windows é um .cmd — sem shell:true o spawn estoura EINVAL.
  const proc = spawn("npm", ["run", "dev", "--", "--port", String(portaDev)], {
    stdio: "ignore",
    shell: true,
  })
  for (let i = 0; i < 120; i++) {
    await espera(500)
    if (await noAr()) return proc
  }
  matarArvore(proc)
  throw new Error("O astro dev não respondeu em 60 s.")
}

// `proc.kill()` aqui mata só o cmd.exe que o shell:true interpôs — o node do
// astro é neto e sobrevive, deixando a 4321 ocupada. Tem que ser a árvore.
function matarArvore(proc) {
  if (!proc?.pid) return
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" })
  } else {
    proc.kill()
  }
}

// ─── Coreografia: preparo comum ──────────────────────────────────────────────

async function comPagina(fn, { reduzido = false } = {}) {
  await mkdir(saida, { recursive: true })
  const astro = await subirAstro()
  const { proc: chrome, perfil, wsUrl } = await abrirChrome()
  const s = await Sessao.conectar(wsUrl)
  const problemas = []

  try {
    await s.enviar("Page.enable")
    await s.enviar("Runtime.enable")
    await s.enviar("Log.enable")
    await s.enviar("Network.enable")
    await s.enviar("Emulation.setDeviceMetricsOverride", {
      width: largura,
      height: altura,
      deviceScaleFactor: 1,
      mobile: false,
    })
    if (reduzido) {
      await s.enviar("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      })
    }

    s.ouvir("Runtime.exceptionThrown", (p) => problemas.push("exceção: " + (p.exceptionDetails?.text ?? "?")))
    s.ouvir("Log.entryAdded", (p) => {
      if (p.entry.level === "error") problemas.push(`${p.entry.source}: ${p.entry.text}`)
    })
    s.ouvir("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") problemas.push("console: " + p.args.map((a) => a.value ?? a.description).join(" "))
    })
    s.ouvir("Network.loadingFailed", (p) => problemas.push(`request falhou: ${p.type} ${p.errorText}`))

    const carregou = new Promise((ok) => s.ouvir("Page.loadEventFired", ok))
    await s.enviar("Page.navigate", { url: ENDERECO })
    await carregou
    await espera(1500) // fontes + primeiro refresh do ScrollTrigger

    await fn(s, problemas)
  } finally {
    s.fechar()
    chrome.kill()
    matarArvore(astro)
    await espera(400) // o Chrome solta o --user-data-dir um instante depois
    await rm(perfil, { recursive: true, force: true }).catch(() => {})
  }

  return problemas
}

// Conta alvos do GSAP que sobraram invisíveis — a falha clássica desta página.
const AUDITORIA = `
  const alvos = document.querySelectorAll(
    "[data-peca-conceito], [data-verso], [data-margem], [data-foto-caixa], " +
      "[data-conto-caixa] p, .folha-conto p, .peca, #conceito p, " +
      "[data-cartela-peca], [data-croqui]"
  )
  const presos = []
  for (const el of alvos) {
    const e = getComputedStyle(el)
    if (parseFloat(e.opacity) < 0.05 || e.visibility === "hidden") {
      presos.push((el.tagName + "." + el.className).slice(0, 60))
    }
  }
  return { total: alvos.length, presos }
`


// ─── Comandos ────────────────────────────────────────────────────────────────

async function rolagem() {
  const passos = Number(arg("passos", "14"))
  const problemas = await comPagina(async (s) => {
    console.log("título:", await s.avaliar(`return document.title`))
    console.log("pre-anima ainda no <html>:", await s.avaliar(`return document.documentElement.classList.contains("pre-anima")`))

    const alturaDoc = await s.avaliar(`return document.body.scrollHeight`)
    console.log("scrollHeight:", alturaDoc)

    for (let i = 0; i <= passos; i++) {
      const y = Math.round((alturaDoc - altura) * (i / passos))
      await s.avaliar(`window.scrollTo({ top: ${y}, behavior: "instant" }); return 1`)
      await espera(700) // a Lenis interpola; o ScrollTrigger dispara depois
      await s.foto(join(saida, `rolagem-${String(i).padStart(2, "0")}.png`))
    }

    const a = await s.avaliar(AUDITORIA)
    console.log(`alvos invisíveis ao final: ${a.presos.length}/${a.total}`)
    if (a.presos.length) console.log("  presos:", a.presos.join(", "))
  })
  relatar(problemas)
}

async function ancoras() {
  const problemas = await comPagina(async (s) => {
    await s.clicar('a[href="#conceito"]')
    await espera(2200)
    await s.foto(join(saida, "clique-comecar.png"))

    for (const secao of ["conceito", "mood", "persona", "trendboard", "cores", "tecidos", "estampas", "mapa"]) {
      await s.clicar(`nav a[href="#${secao}"]`)
      await espera(2200)
      const r = await s.avaliar(`
        const el = document.querySelector("#${secao}")
        return { topo: Math.round(el.getBoundingClientRect().top),
                 margem: parseInt(getComputedStyle(el).scrollMarginTop) }
      `)
      const ok = Math.abs(r.topo - r.margem) <= 2
      console.log(`${ok ? "ok " : "RUIM"} ${secao}: parou a ${r.topo}px (scroll-margin-top ${r.margem}px)`)
      await s.foto(join(saida, `ancora-${secao}.png`))
    }
  })
  relatar(problemas)
}

async function reduzido() {
  const problemas = await comPagina(
    async (s) => {
      // Sem movimento nada deve ser escondido: a `pre-anima` nem entra.
      console.log("pre-anima no <html>:", await s.avaliar(`return document.documentElement.classList.contains("pre-anima")`))
      const a = await s.avaliar(AUDITORIA)
      console.log(`alvos invisíveis sem rolar: ${a.presos.length}/${a.total}`)
      if (a.presos.length) console.log("  presos:", a.presos.join(", "))

      // A tira do trendboard tem que seguir rolável (a camada de baixo).
      const tira = await s.avaliar(`
        const t = document.querySelector(".tira")
        if (!t) return null
        return { travada: t.classList.contains("tira-travada"),
                 rolavel: t.scrollWidth > t.clientWidth + 4,
                 overflowX: getComputedStyle(t).overflowX }
      `)
      console.log("tira do trendboard:", JSON.stringify(tira))

      // Mesma espécie de contrato na materioteca: sem a classe `.armada` a
      // seção é uma lista comum, com cada amostra ao lado da própria ficha. Se
      // a classe ficar, as miniaturas somem e o palco não troca de imagem —
      // uma seção inteira sem foto nenhuma.
      const materioteca = await s.avaliar(`
        const m = document.querySelector("[data-materioteca]")
        if (!m) return null
        const minis = [...m.querySelectorAll(".mini")]
        return { armada: m.classList.contains("armada"),
                 minisVisiveis: minis.filter((el) => getComputedStyle(el).display !== "none").length,
                 minis: minis.length }
      `)
      console.log("materioteca:", JSON.stringify(materioteca))

      await s.foto(join(saida, "reduzido-topo.png"))
    },
    { reduzido: true },
  )
  relatar(problemas)
}

async function foto() {
  const y = Number(arg("y", "0"))
  const problemas = await comPagina(async (s) => {
    if (y) {
      await s.avaliar(`window.scrollTo({ top: ${y}, behavior: "instant" }); return 1`)
      await espera(900)
    }
    const nome = join(saida, `foto-${largura}x${altura}-y${y}.png`)
    await s.foto(nome)
    console.log("gravei", nome)
  })
  relatar(problemas)
}

// Dirige o controle de leitura automática. Tudo aqui é aferido por **delta de
// scroll entre dois instantes** — é a única coisa que prova que a página andou
// sozinha, andou mais depois de acelerar, e parou de andar ao pausar. Ler o
// estado do controle não prova nada: o data-estado pode dizer "andando" com a
// página imóvel, que é exatamente o bug que este comando existe para pegar.
async function leitura() {
  const problemas = await comPagina(async (s, ruins) => {
    const onde = () => s.avaliar(`return Math.round(window.scrollY)`)
    const estado = () => s.avaliar(`return document.querySelector("[data-leitura]")?.dataset.estado ?? "ausente"`)
    const conferir = (ok, texto) => {
      console.log(`${ok ? "ok  " : "RUIM"} ${texto}`)
      if (!ok) ruins.push(texto)
    }

    const convite = () =>
      s.avaliar(`
        const el = document.querySelector("[data-leitura-rotulo]")
        if (!el) return { texto: "", visivel: false }
        return { texto: el.textContent.trim(), visivel: el.getBoundingClientRect().width > 0 }
      `)

    const existe = await s.avaliar(`return Boolean(document.querySelector("[data-leitura-alternar]"))`)
    conferir(existe, "o controle de leitura automática existe na página")
    if (!existe) return

    // Na capa o controle se apresenta por extenso; dali para baixo, em
    // repouso, é só o ícone. A página abre na capa, então é aqui que se vê.
    const naCapa = await convite()
    conferir(
      naCapa.visivel && naCapa.texto === "Leitura automática",
      `na capa o convite vem escrito: "${naCapa.texto}"`,
    )
    await s.foto(join(saida, "leitura-controle-capa.png"), await s.caixaDe("[data-leitura]"))

    // 1. Anda sozinha. O passo de projeto é 0,3 tela por segundo, então em
    //    1,5 s numa tela de 720 são ~324px; 150 é meio caminho, folga para
    //    máquina lenta sem deixar passar uma página parada.
    await s.clicar("[data-leitura-alternar]", { rolar: false })
    const a0 = await onde()
    await espera(1500)
    const a1 = await onde()
    const passo1 = a1 - a0
    conferir(passo1 > 150, `andou sozinha: ${passo1}px em 1,5 s (1×)`)
    conferir((await estado()) === "andando", "o controle diz que está andando")
    await s.foto(join(saida, "leitura-andando.png"))
    await s.foto(join(saida, "leitura-controle-andando.png"), await s.caixaDe("[data-leitura]"))

    // Nenhuma parte do controle pode estar fora da tela: ele é `fixed` no
    // canto, e um botão de parar que o viewport corta é um botão que não
    // existe para quem está lendo.
    const dentro = await s.avaliar(`
      const c = document.querySelector("[data-leitura] [role=group]").getBoundingClientRect()
      return { esquerda: Math.round(c.left), direita: Math.round(c.right),
               largura: Math.round(c.width), tela: window.innerWidth }
    `)
    conferir(
      dentro.esquerda >= 0 && dentro.direita <= dentro.tela,
      `o controle cabe na tela: ${dentro.largura}px, de ${dentro.esquerda} a ${dentro.direita} (tela ${dentro.tela})`,
    )

    // A palavra "Parar" já sumiu uma vez, em 1×1px: `sm:not-sr-only` não
    // reverte o `.sr-only` deste projeto, que mora fora de `@layer` em
    // tokens.css e por isso vence o utilitário. Some sem quebrar nada — só
    // o recorte da foto mostra, e esta linha é a rede barata.
    const palavra = await s.avaliar(`
      const el = document.querySelector("[data-leitura-parar] span")
      return el ? Math.round(el.getBoundingClientRect().width) : 0
    `)
    conferir(palavra > 10, `a palavra "Parar" está visível (${palavra}px de largura)`)

    // 2. Acelera. Três cliques levam de 1× a 3×; no mesmo tempo tem que andar
    //    bem mais que o dobro do que andou em 1×.
    for (let i = 0; i < 3; i++) await s.clicar("[data-leitura-velocidade]", { rolar: false })
    const b0 = await onde()
    await espera(1500)
    const b1 = await onde()
    const passo2 = b1 - b0
    conferir(passo2 > passo1 * 2, `acelerou: ${passo2}px em 1,5 s (3×, contra ${passo1}px em 1×)`)

    // 3. Pausa. A espera antes de medir é a Lenis assentando o último quadro.
    await s.clicar("[data-leitura-alternar]", { rolar: false })
    await espera(900)
    const c0 = await onde()
    await espera(1200)
    const c1 = await onde()
    conferir(Math.abs(c1 - c0) <= 2, `pausada, não anda: ${c1 - c0}px em 1,2 s`)
    conferir((await estado()) === "pausada", "o controle diz que está pausada")

    // 4. A mão do usuário na roda pausa sozinho — quem toca no scroll assume
    //    o volante, senão a página briga com quem a está lendo.
    await s.clicar("[data-leitura-alternar]", { rolar: false })
    await espera(500)
    await s.enviar("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: Math.round(largura / 2),
      y: Math.round(altura / 2),
      deltaX: 0,
      deltaY: 240,
    })
    await espera(700)
    conferir((await estado()) === "pausada", "rolar na roda pausou a leitura sozinho")

    // 5. Parar devolve o controle ao repouso: um botão só, e a velocidade
    //    volta para 1× (senão a próxima leitura começa a 3× sem avisar).
    await s.clicar("[data-leitura-parar]", { rolar: false })
    await espera(300)
    const repouso = await s.avaliar(`
      const c = document.querySelector("[data-leitura]")
      return {
        estado: c?.dataset.estado,
        velocidadeEscondida: document.querySelector("[data-leitura-velocidade]")?.hidden,
        pararEscondido: document.querySelector("[data-leitura-parar]")?.hidden,
        fator: document.querySelector("[data-leitura-velocidade]")?.textContent?.trim(),
      }
    `)
    conferir(repouso.estado === "parada", `parou: estado ${repouso.estado}`)
    conferir(
      repouso.velocidadeEscondida === true && repouso.pararEscondido === true,
      "parada, o controle volta a ser um botão só",
    )
    conferir(repouso.fator === "1×", `a velocidade voltou para 1× (está ${repouso.fator})`)

    const d0 = await onde()
    await espera(1000)
    conferir(Math.abs((await onde()) - d0) <= 2, "parada de vez: a página não anda mais")
    await s.foto(join(saida, "leitura-parada.png"))

    // Aqui a leitura já saiu da capa: em repouso tem que sobrar só o ícone.
    const foraDaCapa = await convite()
    conferir(!foraDaCapa.visivel, `fora da capa, em repouso, fica só o ícone (rótulo visível: ${foraDaCapa.visivel})`)
    await s.foto(join(saida, "leitura-controle-repouso.png"), await s.caixaDe("[data-leitura]"))

    // Quem confere revelação presa é o `rolagem`, que varre o documento
    // inteiro. Aqui a leitura anda uns poucos milhares de pixels, e rodar a
    // AUDITORIA neste ponto acusaria como "preso" tudo o que ela ainda nem
    // visitou — RUIM falso, das sete peças da cartela de estampas para baixo.
    // O tempo sai da velocidade **medida** lá em cima, não de uma cópia do
    // passo que o componente usa: constante duplicada aqui é constante que
    // envelhece calada no dia em que o componente mudar a dele.
    const alturaDoc = await s.avaliar(`return document.body.scrollHeight`)
    const minutos = ((alturaDoc - altura) / (passo1 / 1.5) / 60).toFixed(1)
    console.log(`percorreu ${d0}px de ${alturaDoc}px; a página inteira leva ~${minutos} min a 1×`)
  })
  relatar(problemas)
}

function relatar(problemas) {
  console.log("problemas:", problemas.length ? "\n  - " + problemas.slice(0, 15).join("\n  - ") : "nenhum")
  console.log("imagens em:", saida)
  if (problemas.length) process.exitCode = 1
}

const comandos = { rolagem, ancoras, reduzido, leitura, foto }
if (!comandos[comando]) {
  console.error(`Comando desconhecido: ${comando}. Use: ${Object.keys(comandos).join(", ")}`)
  process.exit(2)
}
await comandos[comando]()
