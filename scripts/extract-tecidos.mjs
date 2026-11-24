#!/usr/bin/env node
/**
 * Prepara as amostras de tecido e as peças de aviamento da seção "Tecidos e
 * aviamentos", a partir dos arquivos originais que vieram da Vitória.
 *
 * Duas matérias-primas, dois problemas diferentes:
 *
 * 1. Os tecidos são fotos de amostra sobre fundo chapado (preto, quase
 *    sempre) ou já com alfa. O que interessa é o recorte de pinking — a borda
 *    em zigue-zague é a assinatura da amostra, e ela só lê como objeto
 *    recortado se o fundo virar alfa de verdade. O fundo sai por
 *    preenchimento a partir das bordas, não por limiar global: o feltro
 *    azul-marinho e a sarja bordô têm pixels tão escuros quanto o fundo no
 *    meio do pano, e um limiar global abriria buracos dentro da amostra.
 *    Depois vem uma erosão de 1px, que come a franja de compressão do JPEG na
 *    serrilha.
 *
 * 2. Os aviamentos vêm em PNG com alfa, mas com o nome da peça **assado na
 *    imagem** como texto rasterizado — e o nome tem de ser texto de verdade na
 *    página, não pixel. A separação sai de componentes conexos no alfa: cada
 *    letra é uma ilha pequena, a peça é uma ilha grande. Tudo abaixo de 12% da
 *    maior ilha é legenda e é descartado. As ilhas que sobram são agrupadas
 *    por proximidade, porque "Ativo 5.png" traz duas peças diferentes
 *    (regulador e fivela) numa folha só — e elas viram dois arquivos.
 *
 * Uso:
 *   node scripts/extract-tecidos.mjs --src=<dir com os originais> [--dry]
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const srcDir = args.src ? resolve(String(args.src)) : null;
if (!srcDir) {
  console.error("faltou --src=<dir com os originais>");
  process.exit(1);
}

/** Acima deste valor (canal máximo) o pixel deixa de ser fundo preto. */
const LIMIAR_PRETO = 26;
/** Abaixo deste valor (canal mínimo) o pixel deixa de ser fundo branco. */
const LIMIAR_BRANCO = 226;
/** Alfa a partir do qual o pixel conta como peça, no original que já tem alfa. */
const LIMIAR_ALFA = 128;
/** Ilha de alfa menor que esta fração da maior é legenda assada, não peça. */
const FRACAO_LEGENDA = 0.12;
/**
 * Vão máximo, em px, entre duas ilhas da mesma peça. A folga real é estreita e
 * foi medida: 30px separam as duas vistas do zíper invisível, que são a mesma
 * peça e têm de sair no mesmo arquivo; 42px separam o regulador da fivela em
 * "Ativo 5.png", que são peças diferentes e têm de sair separadas.
 */
const VAO = 32;
/** Lado maior do arquivo gravado. */
const LADO_TECIDO = 1000;
const LADO_AVIAMENTO = 520;

/**
 * As amostras. `fundo` diz como separar a peça do que está atrás dela; o nome
 * do arquivo de saída é o nome do tecido na ficha da Vitória, porque o número
 * do original não diz nada. `limiar` e `erosao` só aparecem onde o padrão não
 * serve — o denim é o caso: a ourela desfiada é branca, e um limiar de branco
 * folgado comeria os fios soltos junto com o papel.
 */
const tecidos = [
  { src: "tecido-01.jpg", nome: "alicia", fundo: "preto" },
  { src: "tecido-02.jpg", nome: "chiffon", fundo: "preto" },
  { src: "tecido-03.png", nome: "couro-sintetico", fundo: "alfa" },
  { src: "tecido-04.jpg", nome: "sarja", fundo: "preto" },
  { src: "tecido-05.jpg", nome: "la-acrilica", fundo: "preto" },
  { src: "tecido-06.png", nome: "setta", fundo: "alfa" },
  { src: "tecido-07.jpg", nome: "tinker", fundo: "preto" },
  { src: "tecido-08.jpg", nome: "tule-malha", fundo: "preto" },
  { src: "tecido-09.jpg", nome: "lidel", fundo: "preto" },
  { src: "tecido-10.png", nome: "denim", fundo: "branco", limiar: 246, erosao: 1 },
];

/**
 * Os aviamentos. A legenda assada no PNG é a fonte dos nomes daqui — ela sai
 * na extração e reaparece como texto em src/data/tecidos.ts. Quando um arquivo
 * traz mais de uma peça, `nomes` tem mais de um item, na ordem de cima para
 * baixo e da esquerda para a direita.
 */
const aviamentos = [
  { src: "Ativo 5.png", nomes: ["regulador-metalico", "fivela-tres-pinos"] },
  { src: "Ativo 6.png", nomes: ["ilhos"] },
  { src: "Ativo 7.png", nomes: ["argolas-metalicas"] },
  { src: "Ativo 8.png", nomes: ["botao-flexivel"] },
  { src: "Ativo 9.png", nomes: ["ziper-invisivel"] },
  { src: "Ativo 10.png", nomes: ["ziper-metalico"] },
  { src: "Ativo 11.png", nomes: ["regulador-sutia"] },
  { src: "Ativo 13.png", nomes: ["vies-algodao"] },
  { src: "Ativo 15.png", nomes: ["fecho-sutia"] },
  { src: "Ativo 16.png", nomes: ["fivela-dois-pinos"] },
  { src: "Ativo 17.png", nomes: ["meia-argola"] },
  { src: "Ativo 18.png", nomes: ["rebite"] },
  { src: "Ativo 19.png", nomes: ["botao-pressao"] },
];

// ─── máscara de fundo ────────────────────────────────────────────────────────

/**
 * Marca o fundo a partir das quatro bordas, por preenchimento. O que não é
 * alcançado de fora fica de pé, mesmo sendo tão escuro quanto o fundo — é o
 * que preserva a trama fechada do feltro e as sombras dentro da amostra.
 */
function fundoPorBorda(data, W, H, ch, ehFundo) {
  const fundo = new Uint8Array(W * H);
  const pilha = [];
  const olhar = (x, y) => {
    const i = y * W + x;
    if (fundo[i] || !ehFundo(data, i * ch)) return;
    fundo[i] = 1;
    pilha.push(i);
  };
  for (let x = 0; x < W; x++) {
    olhar(x, 0);
    olhar(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    olhar(0, y);
    olhar(W - 1, y);
  }
  while (pilha.length) {
    const i = pilha.pop();
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) olhar(x - 1, y);
    if (x < W - 1) olhar(x + 1, y);
    if (y > 0) olhar(x, y - 1);
    if (y < H - 1) olhar(x, y + 1);
  }
  return fundo;
}

/** Come uma casca de `raio` px da peça — a franja de compressão da serrilha. */
function erodir(fundo, W, H, raio) {
  let atual = fundo;
  for (let r = 0; r < raio; r++) {
    const proximo = Uint8Array.from(atual);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (atual[i]) continue;
        if (
          (x > 0 && atual[i - 1]) ||
          (x < W - 1 && atual[i + 1]) ||
          (y > 0 && atual[i - W]) ||
          (y < H - 1 && atual[i + W])
        ) {
          proximo[i] = 1;
        }
      }
    }
    atual = proximo;
  }
  return atual;
}

function caixa(mascara, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mascara[y * W + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// ─── ilhas de alfa (aviamentos) ──────────────────────────────────────────────

/** Componentes conexos de alfa opaco, do maior para o menor. */
function ilhas(data, W, H, ch) {
  const visto = new Uint8Array(W * H);
  const achadas = [];
  for (let s = 0; s < W * H; s++) {
    if (visto[s] || data[s * ch + 3] <= 16) continue;
    const pilha = [s];
    visto[s] = 1;
    let area = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
    const pixels = [];
    while (pilha.length) {
      const i = pilha.pop();
      const x = i % W;
      const y = (i - x) / W;
      area++;
      pixels.push(i);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const viz = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
      for (const q of viz) {
        if (q >= 0 && !visto[q] && data[q * ch + 3] > 16) {
          visto[q] = 1;
          pilha.push(q);
        }
      }
    }
    achadas.push({ area, x0, y0, x1, y1, pixels });
  }
  return achadas.sort((a, b) => b.area - a.area);
}

const vaoEntre = (a, b) =>
  Math.max(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.y0 - b.y1, b.y0 - a.y1, 0));

/** Junta ilhas que se encostam (vão < VAO) — uma peça pode ter várias partes. */
function agrupar(lista) {
  const grupos = [];
  for (const ilha of lista) {
    const vizinhos = grupos.filter((g) => g.some((o) => vaoEntre(ilha, o) < VAO));
    if (vizinhos.length === 0) {
      grupos.push([ilha]);
      continue;
    }
    const juntos = [ilha, ...vizinhos.flat()];
    for (const v of vizinhos) grupos.splice(grupos.indexOf(v), 1);
    grupos.push(juntos);
  }
  // De cima para baixo, depois da esquerda para a direita: a mesma leitura da
  // folha original, que é a ordem em que os nomes foram escritos na config.
  const topo = (g) => Math.min(...g.map((i) => i.y0));
  const esq = (g) => Math.min(...g.map((i) => i.x0));
  return grupos.sort((a, b) => topo(a) - topo(b) || esq(a) - esq(b));
}

// ─── extração ────────────────────────────────────────────────────────────────

const saidaTecidos = join(root, "src/assets/tecidos");
const saidaAviamentos = join(root, "src/assets/aviamentos");
if (!args.dry) {
  mkdirSync(saidaTecidos, { recursive: true });
  mkdirSync(saidaAviamentos, { recursive: true });
}

const manifestoTecidos = [];
const manifestoAviamentos = [];

for (const t of tecidos) {
  const caminho = join(srcDir, t.src);
  if (!existsSync(caminho)) {
    console.error(`FALTA ${t.src}`);
    continue;
  }
  const { data, info } = await sharp(caminho).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;

  let fundo;
  if (t.fundo === "alfa") {
    // Corta na metade da rampa de antisserrilhamento: abaixo disso o que
    // sobra é a auréola clara do exportador, que sobre fundo escuro vira um
    // contorno branco em volta da serrilha.
    fundo = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) fundo[i] = data[i * ch + 3] < LIMIAR_ALFA ? 1 : 0;
  } else if (t.fundo === "preto") {
    const limiar = t.limiar ?? LIMIAR_PRETO;
    fundo = fundoPorBorda(data, W, H, ch, (d, p) => Math.max(d[p], d[p + 1], d[p + 2]) <= limiar);
  } else {
    const limiar = t.limiar ?? LIMIAR_BRANCO;
    fundo = fundoPorBorda(data, W, H, ch, (d, p) => Math.min(d[p], d[p + 1], d[p + 2]) >= limiar);
  }
  // O alfa já veio limpo do exportador; o que foi fotografado carrega a franja
  // de compressão na serrilha.
  if (t.fundo !== "alfa") fundo = erodir(fundo, W, H, t.erosao ?? 1);

  const peca = Uint8Array.from(fundo, (v) => (v ? 0 : 1));
  const cx = caixa(peca, W, H);
  if (!cx) {
    console.error(`VAZIA ${t.src}`);
    continue;
  }

  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (!peca[i]) continue;
    rgba[i * 4] = data[i * ch];
    rgba[i * 4 + 1] = data[i * ch + 1];
    rgba[i * 4 + 2] = data[i * ch + 2];
    // No original com alfa o antisserrilhamento da serrilha é bom e vale a
    // pena manter; no que foi fotografado, a máscara é que manda.
    rgba[i * 4 + 3] = t.fundo === "alfa" ? data[i * ch + 3] : 255;
  }

  const aspect = +(cx.width / cx.height).toFixed(3);
  console.log(`${t.nome.padEnd(18)} ${String(cx.width).padStart(4)}x${String(cx.height).padEnd(4)} aspect ${aspect}`);
  manifestoTecidos.push({ nome: t.nome, aspect, origem: t.src });

  if (!args.dry) {
    await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
      .extract(cx)
      .resize({ width: LADO_TECIDO, height: LADO_TECIDO, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(join(saidaTecidos, `${t.nome}.webp`));
  }
}

for (const a of aviamentos) {
  const caminho = join(srcDir, a.src);
  if (!existsSync(caminho)) {
    console.error(`FALTA ${a.src}`);
    continue;
  }
  const { data, info } = await sharp(caminho).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;

  const todas = ilhas(data, W, H, ch);
  if (todas.length === 0) {
    console.error(`VAZIA ${a.src}`);
    continue;
  }
  const corte = todas[0].area * FRACAO_LEGENDA;
  const grupos = agrupar(todas.filter((i) => i.area >= corte));

  if (grupos.length !== a.nomes.length) {
    console.error(`AVISO ${a.src}: ${grupos.length} peça(s) para ${a.nomes.length} nome(s) — confira o VAO`);
  }

  for (const [k, grupo] of grupos.entries()) {
    const nome = a.nomes[k] ?? `${a.nomes[0]}-${k + 1}`;
    const mascara = new Uint8Array(W * H);
    for (const ilha of grupo) for (const p of ilha.pixels) mascara[p] = 1;
    const cx = caixa(mascara, W, H);

    const rgba = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      if (!mascara[i]) continue;
      rgba[i * 4] = data[i * ch];
      rgba[i * 4 + 1] = data[i * ch + 1];
      rgba[i * 4 + 2] = data[i * ch + 2];
      rgba[i * 4 + 3] = data[i * ch + 3];
    }

    const aspect = +(cx.width / cx.height).toFixed(3);
    console.log(`${nome.padEnd(18)} ${String(cx.width).padStart(4)}x${String(cx.height).padEnd(4)} aspect ${aspect}  (${a.src})`);
    manifestoAviamentos.push({ nome, aspect, origem: a.src });

    if (!args.dry) {
      await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
        .extract(cx)
        .resize({ width: LADO_AVIAMENTO, height: LADO_AVIAMENTO, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 92, alphaQuality: 100 })
        .toFile(join(saidaAviamentos, `${nome}.webp`));
    }
  }
}

console.log(
  `\n${manifestoTecidos.length} tecidos e ${manifestoAviamentos.length} aviamentos` +
    (args.dry ? " (dry-run, nada gravado)" : ""),
);
if (!args.dry) {
  writeFileSync(join(saidaTecidos, "manifest.json"), JSON.stringify(manifestoTecidos, null, 2) + "\n");
  writeFileSync(join(saidaAviamentos, "manifest.json"), JSON.stringify(manifestoAviamentos, null, 2) + "\n");
}
