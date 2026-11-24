#!/usr/bin/env node
/**
 * Extrai as estrelinhas de fundo de reference/estrelas-backgroun-liso.svg
 * para src/data/estrelasFundo.ts.
 *
 * O arquivo de origem é um SVG só no nome: são dois PNGs em base64 (1996×1679)
 * dentro de uma <mask> de luminância, 196 kB para onze estrelas desenhadas à
 * mão. Pôr isso na página custaria quase 10% do que os recortes do
 * painel-conceito já custam (ver a nota sobre svg/ no CLAUDE.md), e ainda
 * chegaria como bitmap — borrado ao ampliar, impossível de tingir com
 * currentColor.
 *
 * Então aqui a gente vetoriza: decodifica a máscara, separa as onze manchas,
 * caminha o contorno de cada uma (Moore-neighbor com o critério de parada de
 * Jacob) e simplifica o polígono (Douglas-Peucker). O traço reto preserva as
 * pontas em agulha — suavizar com bezier arredondaria justamente o que dá
 * caráter ao desenho.
 *
 * As posições saem em % do próprio desenho — do retângulo do bitmap, não do
 * viewBox A4 em volta dele. A dispersão continua sendo a que a Vitória compôs
 * (as distâncias relativas são as mesmas), mas enquadrada pelo desenho: usar o
 * A4 deixava 14% de margem morta de cada lado, e era exatamente ali que ficam
 * as calhas de parede lisa do mood e da persona, as mais vazias da página.
 *
 * Uso: node scripts/extract-estrelas-fundo.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const ORIGEM = resolve(root, "reference/estrelas-backgroun-liso.svg");
const DESTINO = resolve(root, "src/data/estrelasFundo.ts");

/** Abaixo disto é respingo da exportação, não estrela. */
const AREA_MINIMA = 400;
/**
 * Estrela encostada na borda do bitmap sai com a ponta cisalhada reta — no
 * tamanho de fundo ninguém vê, mas é defeito. Acima de tantos pixels apoiados
 * na borda a mancha é descartada; abaixo disso é só a ponta raspando, e uma
 * estrela inteira não se joga fora por um pixel.
 */
const PIXELS_NA_BORDA = 8;
/** Tolerância do Douglas-Peucker, em pixels da máscara. */
const TOLERANCIA = 0.9;
/** Lado maior de cada estrela no viewBox que ela leva junto. */
const LADO = 100;

// ---------------------------------------------------------------- máscara

/** O primeiro PNG embutido é o da <mask>: estrelas brancas em fundo preto. */
function pngDaMascara() {
  const svg = readFileSync(ORIGEM, "utf8");
  const achado = /data:image\/png;base64,([A-Za-z0-9+/=]+)/.exec(svg);
  if (!achado) throw new Error(`Nenhum PNG embutido em ${ORIGEM}.`);
  return Buffer.from(achado[1], "base64");
}

// -------------------------------------------------------------- manchas

/** Rotula as manchas brancas por varredura em largura, vizinhança de 8. */
function separarManchas(bits, larg, alt) {
  const rotulo = new Int32Array(larg * alt).fill(-1);
  const manchas = [];
  const fila = new Int32Array(larg * alt);

  for (let semente = 0; semente < bits.length; semente++) {
    if (bits[semente] === 0 || rotulo[semente] !== -1) continue;

    const atual = manchas.length;
    let inicio = 0;
    let fim = 0;
    fila[fim++] = semente;
    rotulo[semente] = atual;

    const pixels = [];
    let x0 = larg;
    let y0 = alt;
    let x1 = -1;
    let y1 = -1;
    let somaX = 0;
    let somaY = 0;
    let naBorda = 0;

    while (inicio < fim) {
      const i = fila[inicio++];
      const x = i % larg;
      const y = (i / larg) | 0;
      pixels.push(i);
      if (x === 0 || y === 0 || x === larg - 1 || y === alt - 1) naBorda++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      somaX += x;
      somaY += y;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const vx = x + dx;
          const vy = y + dy;
          if (vx < 0 || vy < 0 || vx >= larg || vy >= alt) continue;
          const j = vy * larg + vx;
          if (bits[j] === 0 || rotulo[j] !== -1) continue;
          rotulo[j] = atual;
          fila[fim++] = j;
        }
      }
    }

    manchas.push({
      pixels,
      area: pixels.length,
      naBorda,
      caixa: { x0, y0, x1, y1 },
      centro: { x: somaX / pixels.length, y: somaY / pixels.length },
    });
  }

  return manchas.filter((m) => m.area >= AREA_MINIMA && m.naBorda <= PIXELS_NA_BORDA);
}

// ------------------------------------------------------------- contorno

const VIZINHOS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Moore-neighbor: parte do pixel mais alto e mais à esquerda da mancha (cujo
 * vizinho oeste é, por construção, fundo) e gira em torno do pixel atual até
 * achar o próximo de dentro. Para quando volta ao pixel inicial — o critério
 * de Jacob, que evita fechar cedo demais numa ponta fina.
 */
function contornar(mancha, larg) {
  const daMancha = new Set(mancha.pixels);
  const dentro = (x, y) => daMancha.has(y * larg + x);

  const inicioIdx = mancha.pixels.reduce((a, b) => (a < b ? a : b));
  const sx = inicioIdx % larg;
  const sy = (inicioIdx / larg) | 0;

  let px = sx;
  let py = sy;
  let entrada = 4; // veio do oeste
  const pontos = [[sx, sy]];

  for (let passo = 0; passo < mancha.pixels.length * 8 + 64; passo++) {
    let dado = -1;
    for (let k = 1; k <= 8; k++) {
      const d = (entrada + k) % 8;
      const vx = px + VIZINHOS[d][0];
      const vy = py + VIZINHOS[d][1];
      if (dentro(vx, vy)) {
        dado = d;
        px = vx;
        py = vy;
        break;
      }
    }
    if (dado === -1) break; // mancha de um pixel só

    // De onde se entrou no novo pixel: meia volta do passo dado, para o giro
    // recomeçar colado no fundo em vez de cortar por dentro da mancha.
    entrada = (dado + 5) % 8;

    if (px === sx && py === sy) break;
    pontos.push([px, py]);
  }

  return pontos;
}

// --------------------------------------------------------- simplificação

function distanciaAoSegmento([x, y], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const quadrado = dx * dx + dy * dy;
  if (quadrado === 0) return Math.hypot(x - ax, y - ay);
  let t = ((x - ax) * dx + (y - ay) * dy) / quadrado;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

function douglasPeucker(pontos, tolerancia) {
  if (pontos.length < 3) return pontos;
  let pior = 0;
  let idx = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = distanciaAoSegmento(pontos[i], pontos[0], pontos[pontos.length - 1]);
    if (d > pior) {
      pior = d;
      idx = i;
    }
  }
  if (pior <= tolerancia) return [pontos[0], pontos[pontos.length - 1]];
  return [
    ...douglasPeucker(pontos.slice(0, idx + 1), tolerancia),
    ...douglasPeucker(pontos.slice(idx), tolerancia).slice(1),
  ];
}

/**
 * Douglas-Peucker em polígono fechado: corta em dois arcos, senão o primeiro e
 * o último ponto ficam presos como âncora e a ponta onde o traço começou sai
 * amassada.
 */
function simplificarFechado(pontos, tolerancia) {
  if (pontos.length < 8) return pontos;
  const meio = Math.floor(pontos.length / 2);
  const a = douglasPeucker(pontos.slice(0, meio + 1), tolerancia);
  const b = douglasPeucker([...pontos.slice(meio), pontos[0]], tolerancia);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

// ----------------------------------------------------------------- saída

const num = (v, casas = 2) => Number(v.toFixed(casas));

async function main() {
  const { data, info } = await sharp(pngDaMascara()).greyscale().raw().toBuffer({
    resolveWithObject: true,
  });

  const { width: larg, height: alt, channels } = info;
  const bits = new Uint8Array(larg * alt);
  for (let i = 0; i < bits.length; i++) bits[i] = data[i * channels] > 128 ? 1 : 0;

  const manchas = separarManchas(bits, larg, alt)
    // Ordem de leitura: de cima para baixo, da esquerda para a direita. Assim a
    // lista sai estável entre execuções e legível ao lado da imagem de origem.
    .sort((a, b) => a.centro.y - b.centro.y || a.centro.x - b.centro.x);

  const estrelas = manchas.map((mancha) => {
    const contorno = simplificarFechado(contornar(mancha, larg), TOLERANCIA);

    const { x0, y0, x1, y1 } = mancha.caixa;
    const largPx = x1 - x0 + 1;
    const altPx = y1 - y0 + 1;
    const escala = LADO / Math.max(largPx, altPx);

    const traco =
      contorno
        .map(
          ([x, y], i) =>
            `${i === 0 ? "M" : "L"}${num((x - x0) * escala)} ${num((y - y0) * escala)}`,
        )
        .join("") + "Z";

    return {
      traco,
      caixa: `0 0 ${num(largPx * escala)} ${num(altPx * escala)}`,
      x: num((mancha.centro.x / larg) * 100, 1),
      y: num((mancha.centro.y / alt) * 100, 1),
      larg: num((largPx / larg) * 100, 2),
      pontos: contorno.length,
      naBorda: mancha.naBorda,
    };
  });

  const corpo = estrelas
    .map(
      (e) => `  { x: ${e.x}, y: ${e.y}, larg: ${e.larg}, caixa: "${e.caixa}", traco: "${e.traco}" },`,
    )
    .join("\n");

  const arquivo = `/**
 * As ${estrelas.length} estrelinhas desenhadas à mão de "estrelas-backgroun-liso.svg",
 * vetorizadas. GERADO — não editar na mão.
 *
 * Rode \`npm run extract:estrelas\` para regerar a partir de
 * reference/estrelas-backgroun-liso.svg. O script explica por que vetorizar:
 * o original é bitmap dentro de uma máscara, 196 kB para estas ${estrelas.length} formas.
 *
 * \`x\`/\`y\`/\`larg\` estão em % do desenho — a dispersão é a do original, não uma
 * random(). \`caixa\` é o viewBox do próprio traço, com lado maior ${LADO}: cada
 * estrela guarda a proporção que tem.
 */
export interface EstrelaFundo {
  /** Centro horizontal, em % da largura do desenho. */
  x: number;
  /** Centro vertical, em % da altura do desenho. */
  y: number;
  /** Largura, em % da largura do desenho. */
  larg: number;
  /** viewBox do traço. */
  caixa: string;
  /** O \`d\` do <path>. */
  traco: string;
}

export const estrelasFundo: EstrelaFundo[] = [
${corpo}
];
`;

  writeFileSync(DESTINO, arquivo);

  console.log(`${estrelas.length} estrelas -> ${DESTINO}`);
  for (const e of estrelas) {
    console.log(
      `  x ${String(e.x).padStart(5)}%  y ${String(e.y).padStart(5)}%  larg ${String(e.larg).padStart(5)}%  ${String(e.pontos).padStart(3)} pontos` +
        (e.naBorda ? `  (${e.naBorda}px raspando a borda do bitmap)` : ""),
    );
  }
  console.log(
    `origem ${(readFileSync(ORIGEM).length / 1024).toFixed(0)} kB -> saída ${(Buffer.byteLength(arquivo) / 1024).toFixed(1)} kB`,
  );
}

main();
