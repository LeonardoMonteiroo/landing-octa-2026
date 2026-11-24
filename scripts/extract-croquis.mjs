#!/usr/bin/env node
/**
 * Prepara os 12 croquis do mapa da coleção a partir dos SVGs exportados do
 * Canva (reference/croquis/1.svg … 12.svg). O número do arquivo é a ordem das
 * páginas no Canva, e é a ordem do mapa.
 *
 * Cada SVG é uma foto do desenho (PNG RGB) dentro de uma máscara (PNG em tons
 * de cinza) e, em parte deles, a máscara de personagem desenhada em vetor por
 * cima. A correção de tom entra **só na foto**: as peças vetoriais já estão na
 * cor certa. Por isso o script abre o SVG, troca o PNG da foto pelo corrigido e
 * só então rasteriza a página inteira.
 *
 * As fotos não têm o mesmo tom, e isso é medido em Lab sobre os pixels dentro
 * da máscara. A 3 e a 9 têm os escuros esverdeados (a* ≈ -3, contra +2 das
 * outras) e o preto levantado (L 16-17, contra 10). A 12 tem os escuros
 * avermelhados, e a 1, a 4, a 6 e a 10 têm as luzes apagadas. São três
 * correções, com alvo na **mediana dos doze** — nenhum croqui é o gabarito:
 *
 * 1. **Dominante:** um deslocamento em a*b*, medido nos escuros neutros (L < 22,
 *    croma < 10), que são quase só sapato e sombra. Não dá para medir nos claros:
 *    o vestido da 3 e o da 9 são mesmo água-marinha, e "neutralizar" isso
 *    apagaria a roupa. O teto evita que uma peça escura colorida vire dominante.
 * 2. **Pontos de preto e de branco** em L (percentis 1 e 99). Luz baixa sobe só
 *    até metade do caminho: um casaco marinho como o da 10 quase não tem claro,
 *    e levar o p99 dele até o alvo clarearia a roupa inteira.
 * 3. **Croma** só diminui, e só onde o p90 passa do teto. Não há alvo de mediana:
 *    croma baixo é roupa cinza, não falta de saturação.
 *
 * A mediana de L nunca é alvo: ela é a roupa, e igualá-la deixaria o preto e o
 * branco da coleção no mesmo cinza.
 *
 * O enquadramento é o recorte pelo alfa, e `altura` guarda o tamanho relativo na
 * página do Canva: os croquis têm alturas diferentes (as máscaras não são do
 * mesmo tamanho) e o mapa os põe todos na mesma escala.
 *
 * Uso:
 *   node scripts/extract-croquis.mjs [--conferir]
 *
 * `--conferir` grava .piloto/croquis-antes-depois.png, com o antes em cima e o
 * depois embaixo. Bug de cor só se confirma olhando.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origem = join(raiz, "reference/croquis");
const saida = join(raiz, "src/assets/croquis");
const conferir = process.argv.includes("--conferir");

/** Máscara acima disto conta como pixel do desenho, longe da borda suave. */
const DENTRO = 250;
const TETO_DOMINANTE = 6.5;
const TETO_CROMA = 50;
/** Quanto do caminho até o alvo uma luz baixa percorre. */
const SOBE_LUZ = 0.5;

const D65 = [0.95047, 1, 1.08883];
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
const fi = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

function paraLab(r, g, b) {
  const R = lin(r / 255);
  const G = lin(g / 255);
  const B = lin(b / 255);
  const x = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / D65[0]);
  const y = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / D65[2]);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function deLab(L, a, b) {
  const y = (L + 16) / 116;
  const X = fi(y + a / 500) * D65[0];
  const Y = fi(y);
  const Z = fi(y - b / 200) * D65[2];
  const canal = (v) => Math.round(Math.min(1, Math.max(0, gam(Math.max(0, v)))) * 255);
  return [
    canal(3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z),
    canal(-0.969266 * X + 1.8760108 * Y + 0.041556 * Z),
    canal(0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z),
  ];
}

const percentil = (ordenado, p) => ordenado[Math.floor((ordenado.length - 1) * p)];
const mediana = (v) => percentil([...v].sort((x, y) => x - y), 0.5);
const limita = (v, teto) => Math.max(-teto, Math.min(teto, v));
const fmt = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;

/** Os dois PNGs embutidos: o primeiro é a máscara, o segundo a foto. */
function abrir(svg) {
  const achados = [...svg.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)];
  if (achados.length !== 2) throw new Error(`esperava 2 PNGs, achei ${achados.length}`);
  const [mascara, foto] = achados.map((m) => Buffer.from(m[1], "base64"));
  return { mascara, foto, base64Foto: achados[1][1] };
}

async function medir(nome, svg) {
  const { mascara, foto } = abrir(svg);
  const m = await sharp(mascara).greyscale().raw().toBuffer();
  const { data, info } = await sharp(foto).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (m.length !== info.width * info.height) throw new Error(`${nome}: máscara de outro tamanho`);

  const Ls = new Float32Array(m.length);
  const Cs = new Float32Array(m.length);
  let n = 0;
  let somaA = 0;
  let somaB = 0;
  let escuros = 0;
  for (let i = 0; i < m.length; i++) {
    if (m[i] < DENTRO) continue;
    const [L, a, b] = paraLab(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
    const C = Math.hypot(a, b);
    Ls[n] = L;
    Cs[n] = C;
    n++;
    if (L < 22 && C < 10) {
      escuros++;
      somaA += a;
      somaB += b;
    }
  }
  const L = Ls.subarray(0, n).sort();
  const C = Cs.subarray(0, n).sort();
  return {
    nome,
    svg,
    data,
    info,
    preto: percentil(L, 0.01),
    branco: percentil(L, 0.99),
    croma: percentil(C, 0.9),
    a: escuros ? somaA / escuros : 0,
    b: escuros ? somaB / escuros : 0,
  };
}

async function corrigir(medida, alvo) {
  const { data, info } = medida;
  const da = limita(alvo.a - medida.a, TETO_DOMINANTE);
  const db = limita(alvo.b - medida.b, TETO_DOMINANTE);
  const branco =
    medida.branco < alvo.branco
      ? medida.branco + (alvo.branco - medida.branco) * SOBE_LUZ
      : alvo.branco;
  const ganho = (branco - alvo.preto) / (medida.branco - medida.preto);
  const croma = medida.croma > TETO_CROMA ? Math.sqrt(TETO_CROMA / medida.croma) : 1;

  const novo = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const [L, a, b] = paraLab(data[i], data[i + 1], data[i + 2]);
    const [R, G, B] = deLab(
      Math.max(0, alvo.preto + (L - medida.preto) * ganho),
      (a + da) * croma,
      (b + db) * croma,
    );
    novo[i] = R;
    novo[i + 1] = G;
    novo[i + 2] = B;
  }
  console.log(
    `${medida.nome.padStart(2)}  a${fmt(da)}  b${fmt(db)}  ` +
      `L ${medida.preto.toFixed(1)}–${medida.branco.toFixed(1)} → ` +
      `${alvo.preto.toFixed(1)}–${branco.toFixed(1)}  croma ×${croma.toFixed(2)}`,
  );
  return sharp(novo, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toBuffer();
}

async function montarConferencia(quadros) {
  const L = 220;
  const A = 400;
  const camadas = [];
  for (const [i, q] of quadros.entries()) {
    for (const [linha, png] of [q.antes, q.depois].entries()) {
      const input = await sharp(png)
        .resize(L, A, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      camadas.push({ input, left: (i % 6) * L, top: (Math.floor(i / 6) * 2 + linha) * A });
    }
  }
  mkdirSync(join(raiz, ".piloto"), { recursive: true });
  const destino = join(raiz, ".piloto/croquis-antes-depois.png");
  await sharp({ create: { width: L * 6, height: A * 4, channels: 3, background: "#e2e2e1" } })
    .composite(camadas)
    .png()
    .toFile(destino);
  console.log(`conferência em ${destino}`);
}

async function principal() {
  const nomes = readdirSync(origem)
    .filter((n) => /^\d+\.svg$/.test(n))
    .map((n) => n.replace(".svg", ""))
    .sort((x, y) => Number(x) - Number(y));
  if (nomes.length !== 12) throw new Error(`esperava 12 croquis, achei ${nomes.length}`);

  const medidas = [];
  for (const nome of nomes) {
    medidas.push(await medir(nome, readFileSync(join(origem, `${nome}.svg`), "utf8")));
  }
  const alvo = {
    a: mediana(medidas.map((m) => m.a)),
    b: mediana(medidas.map((m) => m.b)),
    preto: mediana(medidas.map((m) => m.preto)),
    branco: mediana(medidas.map((m) => m.branco)),
  };
  console.log(
    `alvo: a ${alvo.a.toFixed(1)}, b ${alvo.b.toFixed(1)}, ` +
      `L ${alvo.preto.toFixed(1)}–${alvo.branco.toFixed(1)}`,
  );

  mkdirSync(saida, { recursive: true });
  const linhas = [];
  const quadros = [];
  for (const medida of medidas) {
    const png = await corrigir(medida, alvo);
    const svg = medida.svg.replace(abrir(medida.svg).base64Foto, png.toString("base64"));
    const pagina = await sharp(Buffer.from(svg)).png().toBuffer();
    const altoPagina = (await sharp(pagina).metadata()).height;
    const { data, info } = await sharp(pagina)
      .trim({ threshold: 1 })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
    writeFileSync(join(saida, `${medida.nome}.png`), data);
    linhas.push(
      `  "${medida.nome}": { aspect: ${(info.width / info.height).toFixed(4)}, ` +
        `altura: ${(info.height / altoPagina).toFixed(4)} },`,
    );
    if (conferir) {
      const antes = await sharp(Buffer.from(medida.svg)).png().toBuffer();
      quadros.push({ antes, depois: pagina });
    }
  }

  writeFileSync(
    join(raiz, "src/data/croquis-medidas.ts"),
    `/**
 * Medidas dos croquis. GERADO por scripts/extract-croquis.mjs — não editar na mão.
 *
 * \`aspect\` é largura/altura do recorte pelo alfa; \`altura\` é a altura do
 * recorte como fração da página do Canva.
 */
export const croquisMedidas: Record<string, { aspect: number; altura: number }> = {
${linhas.join("\n")}
};
`,
  );

  if (conferir) await montarConferencia(quadros);
}

principal();
