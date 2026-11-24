#!/usr/bin/env node
/**
 * Prepara a seção "Design de superfície" a partir dos originais da Vitória.
 *
 * Duas matérias-primas bem diferentes:
 *
 * 1. Os três xadrezes são **rapports fechados** de 242 × 242 — o arquivo
 *    inteiro é o desenho, e encostar uma cópia na outra não deixa emenda
 *    (conferido montando 2 × 2 e olhando o pixel). Por isso eles não são
 *    redimensionados nem recomprimidos com perda: saem em PNG, do mesmo
 *    tamanho, e a página os usa como `background-image` repetida. Reamostrar
 *    um rapport é o jeito de abrir emenda onde não havia.
 *
 *    O que o script faz com eles é **achatar o alfa sobre o grafite** e
 *    **medir os fios**. O achatamento importa: 1,6% dos pixels são linhas
 *    desenhadas com alfa parcial sobre um fundo que já é opaco, e deixá-las
 *    transparentes faria a parede do capítulo vazar por dentro do
 *    pano em riscos.
 *
 *    A medida dos fios não sai de contar cores: quase todo pixel de linha é
 *    mistura da linha com o grafite do fundo, e "a cor mais comum" devolve
 *    tons de mistura que não existem na cartela (#4b4041 e parentes). O que
 *    resolve é **desmisturar**: cada cor da cartela define um raio que sai do
 *    grafite na direção dela, e o pixel é atribuído ao raio de que estiver
 *    mais perto, com a distância ao longo do raio valendo a opacidade daquele
 *    fio ali. A soma dessas opacidades é a "tinta equivalente" — quanto de
 *    cada cor o pano tem, em pano cheio. É o que separa um vinho de verdade
 *    de um cinza levemente quente.
 *
 * 2. O bordado e o retalho são fotos de amostra sobre fundo chapado (preto e
 *    branco). Vale o mesmo que nos tecidos: a borda serrilhada do pinking é a
 *    assinatura da amostra e só lê como peça recortada se o fundo virar alfa.
 *    O fundo sai por preenchimento a partir da borda, e não por limiar global
 *    — o bordado é preto no meio de um pano claro, e um limiar global abriria
 *    buraco dentro da peça. Depois vem uma erosão de 1px, que come a franja de
 *    compressão do JPEG na serrilha. O mesmo raciocínio está em
 *    extract-tecidos.mjs, escrito lá para o caso de dez amostras; aqui são
 *    duas peças e nenhuma legenda assada, então o código é o curto.
 *
 * Uso:
 *   node scripts/extract-estampas.mjs [--src=reference/estampas] [--dry]
 */
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
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

const srcDir = resolve(root, String(args.src ?? "reference/estampas"));

/** O fundo dos três rapports, lido do próprio arquivo. Não é cor de cartela. */
const GRAFITE = [0x4f, 0x4f, 0x4f];

/** Lado do rapport, em px. Os três vieram assim e a página conta com isso. */
const LADO_RAPPORT = 242;

/**
 * A cartela de src/data/cores.ts, mais o linho, que aparece de véu no
 * cruzado. Cada uma vira um raio que sai do grafite.
 */
const cartela = [
  { chave: "resistencia", hex: "#3d1216" },
  { chave: "pertencer", hex: "#2c384f" },
  { chave: "ninho", hex: "#c19f53" },
  { chave: "jardim", hex: "#434429" },
  { chave: "fragilidade", hex: "#878881" },
  { chave: "ruptura", hex: "#030405" },
  { chave: "linho", hex: "#c3c3c0" },
].map((c) => {
  const rgb = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16));
  const v = rgb.map((x, i) => x - GRAFITE[i]);
  return { ...c, rgb, v, l2: v[0] * v[0] + v[1] * v[1] + v[2] * v[2] };
});

/** Abaixo desta distância do grafite o pixel é fundo, não fio. */
const LIMIAR_FUNDO = 4;
/** Perpendicular máxima até um raio para o pixel ser daquele fio. */
const LIMIAR_RAIO = 7;
/** Opacidade mínima para o pixel contar como fio, e não como ruído de borda. */
const OPACIDADE_MINIMA = 0.04;
/**
 * Tinta equivalente mínima, em fração do pano, para o fio entrar na ficha.
 * Medido: no cruzado o linho dá 0,59% e é véu de verdade, visível; o ninho dá
 * 0,004% e é ruído de antisserrilhamento em cima de um cruzamento.
 */
const TINTA_MINIMA = 0.004;

/** Acima deste valor (canal máximo) o pixel deixa de ser fundo preto. */
const LIMIAR_PRETO = 26;
/** Abaixo deste valor (canal mínimo) o pixel deixa de ser fundo branco. */
const LIMIAR_BRANCO = 226;
/** Lado maior das peças fotografadas, já recortadas. */
const LADO_PECA = 1100;

const xadrezes = [
  { nome: "grade", src: "grade.png" },
  { nome: "barra", src: "barra.png" },
  { nome: "cruzado", src: "cruzado.png" },
];

const pecas = [
  // O papel do retalho escurece para o rodapé da foto: a última linha dá 224 de
  // canal mínimo, abaixo do limiar padrão, e a faixa de papel ficava colada na
  // peça — com ela a caixa de recorte descia até a borda do arquivo e a amostra
  // saía com um rodapé pálido. 212 dá folga para toda a moldura (o mais escuro
  // dela é 223) e não alcança o pano. Os brilhos de dentro da peça chegam a 252,
  // mas são ilhas soltas: o preenchimento vem da borda e não os alcança.
  { nome: "retalho", src: "retalho.jpeg", fundo: "branco", limiar: 212 },
  { nome: "bordado", src: "bordado.jpeg", fundo: "preto" },
];

// ─── recorte por preenchimento a partir da borda ─────────────────────────────

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
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
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

// ─── xadrezes: achatar sobre o grafite e desmisturar os fios ─────────────────

const saidaEstampas = join(root, "src/assets/estampas");
if (!args.dry) mkdirSync(saidaEstampas, { recursive: true });

const medidas = [];

for (const x of xadrezes) {
  const caminho = join(srcDir, x.src);
  if (!existsSync(caminho)) {
    console.error(`FALTA ${x.src}`);
    continue;
  }
  const { data, info } = await sharp(caminho)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;
  if (W !== LADO_RAPPORT || H !== LADO_RAPPORT) {
    console.error(`${x.nome}: rapport de ${W}×${H}, esperado ${LADO_RAPPORT}²`);
  }

  const chapado = Buffer.alloc(W * H * 3);
  const tinta = new Map();
  let fundo = 0;

  for (let i = 0; i < W * H; i++) {
    const a = data[i * ch + 3] / 255;
    const p = [0, 1, 2].map((k) => data[i * ch + k] * a + GRAFITE[k] * (1 - a));
    chapado[i * 3] = Math.round(p[0]);
    chapado[i * 3 + 1] = Math.round(p[1]);
    chapado[i * 3 + 2] = Math.round(p[2]);

    const u = p.map((v, k) => v - GRAFITE[k]);
    if (Math.hypot(...u) < LIMIAR_FUNDO) {
      fundo++;
      continue;
    }
    let melhor = null;
    for (const c of cartela) {
      const t = (u[0] * c.v[0] + u[1] * c.v[1] + u[2] * c.v[2]) / c.l2;
      if (t <= OPACIDADE_MINIMA || t > 1.35) continue;
      const perp = Math.hypot(...u.map((v, k) => v - t * c.v[k]));
      if (!melhor || perp < melhor.perp) melhor = { chave: c.chave, t, perp };
    }
    if (!melhor || melhor.perp > LIMIAR_RAIO) continue;
    tinta.set(melhor.chave, (tinta.get(melhor.chave) ?? 0) + melhor.t);
  }

  const total = W * H;
  const fios = [...tinta]
    .map(([chave, peso]) => ({ chave, tinta: +(peso / total).toFixed(4) }))
    .filter((f) => f.tinta >= TINTA_MINIMA)
    .sort((a, b) => b.tinta - a.tinta);

  const medida = {
    nome: x.nome,
    lado: W,
    grafite: +(fundo / total).toFixed(3),
    fios,
    origem: x.src,
  };
  medidas.push(medida);
  console.log(
    `${x.nome.padEnd(9)} ${W}×${H}  grafite ${(medida.grafite * 100).toFixed(1)}%  ` +
      fios.map((f) => `${f.chave} ${(f.tinta * 100).toFixed(2)}%`).join("  "),
  );

  if (!args.dry) {
    const cru = sharp(chapado, { raw: { width: W, height: H, channels: 3 } });
    await cru.clone().png({ compressionLevel: 9, palette: false }).toFile(join(saidaEstampas, `${x.nome}.png`));
    // A faixa mostra o rapport em tamanho nativo, e num ecrã de 2× isso quer
    // dizer que o navegador vai ampliar: uma linha de 1px vira 2px borrados, e
    // o desenho inteiro é feito de linhas de 1px. A cópia dobrada sai por
    // **vizinho mais próximo**, que repete o pixel em vez de interpolar — a
    // linha vira 2px chapados, que num ecrã de 2× é exatamente 1px de CSS. Com
    // qualquer outro kernel a cópia grande fica mais mole que a pequena, que é
    // o contrário do que ela existe para fazer.
    await cru
      .clone()
      .resize(W * 2, H * 2, { kernel: "nearest" })
      .png({ compressionLevel: 9, palette: false })
      .toFile(join(saidaEstampas, `${x.nome}-2x.png`));
  }
}

// ─── peças fotografadas: recorte com a serrilha ──────────────────────────────

const recortadas = [];

for (const p of pecas) {
  const caminho = join(srcDir, p.src);
  if (!existsSync(caminho)) {
    console.error(`FALTA ${p.src}`);
    continue;
  }
  const { data, info } = await sharp(caminho)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;

  const limiar = p.limiar ?? (p.fundo === "preto" ? LIMIAR_PRETO : LIMIAR_BRANCO);
  const fundo = erodir(
    p.fundo === "preto"
      ? fundoPorBorda(data, W, H, ch, (d, q) => Math.max(d[q], d[q + 1], d[q + 2]) <= limiar)
      : fundoPorBorda(data, W, H, ch, (d, q) => Math.min(d[q], d[q + 1], d[q + 2]) >= limiar),
    W,
    H,
    1,
  );

  const peca = Uint8Array.from(fundo, (v) => (v ? 0 : 1));
  const cx = caixa(peca, W, H);
  if (!cx) {
    console.error(`VAZIA ${p.src}`);
    continue;
  }

  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (!peca[i]) continue;
    rgba[i * 4] = data[i * ch];
    rgba[i * 4 + 1] = data[i * ch + 1];
    rgba[i * 4 + 2] = data[i * ch + 2];
    rgba[i * 4 + 3] = 255;
  }

  const aspect = +(cx.width / cx.height).toFixed(3);
  recortadas.push({ nome: p.nome, aspect, origem: p.src });
  console.log(`${p.nome.padEnd(9)} ${cx.width}×${cx.height}  aspect ${aspect}`);

  if (!args.dry) {
    await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
      .extract(cx)
      .resize({ width: LADO_PECA, height: LADO_PECA, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(join(saidaEstampas, `${p.nome}.webp`));
  }
}

// ─── saída gerada ────────────────────────────────────────────────────────────

if (!args.dry) {
  const arquivo = `/**
 * GERADO por scripts/extract-estampas.mjs — não editar à mão.
 *
 * Os fios de cada xadrez, desmisturados do grafite do fundo (o porquê está no
 * cabeçalho do script). \`tinta\` é a fração do pano que aquela cor ocuparia se
 * estivesse chapada: um fio de vinho a 50% de opacidade em 4% do pano dá 2%.
 * É o número que ordena os fios na ficha, e o que deixa "quase não se vê"
 * medido em vez de dito de olho.
 *
 * O conteúdo escrito — título, harmonia, texto — está em src/data/estampas.ts.
 */
export interface FioMedido {
  /** Chave da cartela, de src/data/cores.ts. */
  chave: string;
  /** Fração do pano, em tinta chapada equivalente. */
  tinta: number;
}

export interface XadrezMedido {
  nome: string;
  /** Lado do rapport, em px. O arquivo inteiro é o desenho. */
  lado: number;
  /** Fração do pano que é só o grafite do fundo. */
  grafite: number;
  /** Do fio mais presente ao menos presente. */
  fios: FioMedido[];
}

export const xadrezesMedidos: Record<string, XadrezMedido> = {
${medidas
  .map(
    (m) =>
      `  ${m.nome}: {\n    nome: "${m.nome}",\n    lado: ${m.lado},\n    grafite: ${m.grafite},\n    fios: [\n${m.fios
        .map((f) => `      { chave: "${f.chave}", tinta: ${f.tinta} },`)
        .join("\n")}\n    ],\n  },`,
  )
  .join("\n")}
};

/**
 * Proporção das duas peças fotografadas, medida do recorte. É ela que dá a
 * altura da peça quando a parede se abre numa coluna só, e é contra ela que as
 * fileiras da grade estão calibradas na tela de projeto.
 */
export const proporcaoPecas: Record<string, number> = {
${recortadas.map((r) => `  ${r.nome}: ${r.aspect},`).join("\n")}
};
`;
  writeFileSync(join(root, "src/data/estampas-medidas.ts"), arquivo);
  writeFileSync(
    join(saidaEstampas, "manifest.json"),
    JSON.stringify({ xadrezes: medidas, pecas: recortadas }, null, 2) + "\n",
  );
  console.log("\nsrc/data/estampas-medidas.ts e src/assets/estampas/ atualizados");
}
