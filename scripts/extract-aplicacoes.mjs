#!/usr/bin/env node
/**
 * Extrai as "aplicações" do capítulo de design de superfície — onde cada
 * superfície foi parar na roupa pronta — para src/assets/estampas/aplicacoes/
 * e grava as proporções em src/data/aplicacoes-medidas.ts.
 *
 * - xadrez-gola-blusa.webp: a gola do casaco e a blusa de tule, recortadas da
 *   foto 9 da coleção (os três xadrezes estão nas duas peças);
 * - retalho-casaco.webp: a frente do casaco com a faixa de retalho, da foto 3;
 * - bordado-calca.png: as costas da calça jeans, com o bordado no bolso,
 *   limpas do desenho técnico src/assets/desenhos/11.jpeg.
 *
 * Lê só de src/assets/, de propósito: os outros extratores leem de
 * reference/, que não existe em todo checkout, e estas três imagens já têm
 * origem versionada. Os recortes de foto são os que o Leonardo escolheu,
 * achados na foto original por correlação; as fotos saem no tamanho nativo,
 * sem ampliar (a tela da apresentação é grande, e foto ampliada borra).
 *
 * A calça passa por três etapas: limparDesenho (scripts/lib/limpeza-desenho.mjs)
 * tira o fundo e as setas e refaz o traço cortado; o potrace vetoriza o traço e
 * a silhueta (ele não é dependência do projeto: entra na primeira rodada, ver
 * scripts/lib/potrace-sob-demanda.mjs); e o vetor é rasterizado num PNG de
 * ALTURA_CALCA px. O SVG não vai
 * para a página: ele tem ~176 kB, e SVG grande inline é a armadilha "SVG grande
 * no HTML" do CLAUDE.md. O PNG passa por astro:assets como as outras imagens.
 *
 * Uso:
 *   node scripts/extract-aplicacoes.mjs [--conferir]
 *
 * --conferir grava .piloto/calca-bordado-lupas.png: cada reparo ampliado, o
 * JPEG original à esquerda e o resultado à direita. É ali que se confere que o
 * traço cortado pela seta ficou contínuo — medir não basta, tem que olhar.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { limparDesenho } from "./lib/limpeza-desenho.mjs";
import { CAIXA_CALCA, SETAS_CALCA, REPAROS_CALCA } from "./lib/desenho-calca.mjs";
import { carregarPotrace } from "./lib/potrace-sob-demanda.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const potrace = carregarPotrace(raiz);
const conferir = process.argv.includes("--conferir");

const DIR_SAIDA = join(raiz, "src/assets/estampas/aplicacoes");
const ARQUIVO_MEDIDAS = join(raiz, "src/data/aplicacoes-medidas.ts");
const DESENHO_CALCA = join(raiz, "src/assets/desenhos/11.jpeg");

/** Recortes das fotos da coleção, em pixels da foto original (579 × 868). */
const RECORTES = {
  "xadrez-gola-blusa": { foto: "9.jpeg", left: 236, top: 244, width: 342, height: 272 },
  "retalho-casaco": { foto: "3.jpeg", left: 124, top: 396, width: 350, height: 470 },
};
const QUALIDADE_FOTO = 90;

/** Ampliação antes de vetorizar: o traço do JPEG tem 1–2px, e o potrace precisa de corpo. */
const ESCALA_VETOR = 4;
/** Limiar do traço ampliado: abaixo é tinta. Mais alto engrossa, mais baixo perde o pesponto. */
const LIMIAR_TRACO = 185;
const COR_TRACO = "#1d1d1b";
/** 3× os ~280px em que a calça aparece na cartela. */
const ALTURA_CALCA = 840;
const NOME_CALCA = "bordado-calca";

/** Recorta uma foto da coleção e grava em WebP, no tamanho nativo. Devolve largura / altura. */
async function recortarFoto(nome, { foto, ...recorte }) {
  await sharp(join(raiz, "src/assets/colecao", foto))
    .extract(recorte)
    .webp({ quality: QUALIDADE_FOTO })
    .toFile(join(DIR_SAIDA, `${nome}.webp`));
  return recorte.width / recorte.height;
}

/** Contorna o bitmap com o potrace e devolve o <path> na cor pedida. */
function tracarPath(png, cor) {
  return new Promise((ok, erro) => {
    const p = new potrace.Potrace({ turdSize: 10, alphaMax: 1.1, optCurve: true, optTolerance: 0.4, threshold: 128, blackOnWhite: true });
    p.loadImage(png, (e) => (e ? erro(e) : ok(p.getPathTag(cor))));
  });
}

/**
 * O SVG da calça limpa: a silhueta em branco e, por cima, o traço. O branco do
 * pano termina um pixel para dentro da silhueta — quem faz a borda é o contorno
 * preto; a silhueta inteira deixava uma franja branca serrilhada por fora dele.
 */
async function vetorizarCalca({ cinza, alfa, largura, altura, corte }) {
  const W = corte.width * ESCALA_VETOR, H = corte.height * ESCALA_VETOR;
  const umCanal = (buf) => sharp(Buffer.from(buf.buffer), { raw: { width: largura, height: altura, channels: 1 } }).extract(corte);
  const traco = await umCanal(cinza).resize(W, H, { kernel: "lanczos3" }).threshold(LIMIAR_TRACO).png().toBuffer();
  const alfaContida = new Uint8Array(alfa.length);
  for (let i = 0; i < alfa.length; i++) {
    const x = i % largura, y = (i / largura) | 0;
    if (alfa[i] && x > 0 && y > 0 && x < largura - 1 && y < altura - 1 && alfa[i - 1] && alfa[i + 1] && alfa[i - largura] && alfa[i + largura])
      alfaContida[i] = 255;
  }
  const silhueta = await umCanal(alfaContida).resize(W, H, { kernel: "lanczos3" }).negate().threshold(128).png().toBuffer();
  const pathSilhueta = await tracarPath(silhueta, "#ffffff");
  const pathTraco = await tracarPath(traco, COR_TRACO);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${pathSilhueta}\n${pathTraco}\n</svg>\n`;
}

/** Cada reparo ampliado 8×: o JPEG original à esquerda, o vetor à direita. */
async function gravarLupas(svg, corte) {
  const LADO = 34, ZOOM = 8, LP = LADO * ZOOM;
  const vetor = await sharp(Buffer.from(svg)).png().toBuffer();
  const pecas = [];
  for (const rep of REPAROS_CALCA) {
    const cx = (rep.de[0] + rep.ate[0]) / 2, cy = (rep.de[1] + rep.ate[1]) / 2;
    const l = Math.round(cx - LADO / 2), t = Math.round(cy - LADO / 2);
    const antes = await sharp(DESENHO_CALCA)
      .extract({ left: CAIXA_CALCA.left + l, top: CAIXA_CALCA.top + t, width: LADO, height: LADO })
      .resize(LP, LP, { kernel: "nearest" })
      .png()
      .toBuffer();
    const depois = await sharp(vetor)
      .extract({ left: (l - corte.left) * ESCALA_VETOR, top: (t - corte.top) * ESCALA_VETOR, width: LADO * ESCALA_VETOR, height: LADO * ESCALA_VETOR })
      .resize(LP, LP)
      .png()
      .toBuffer();
    pecas.push(antes, depois);
  }
  const linhas = REPAROS_CALCA.length;
  const destino = join(raiz, ".piloto/calca-bordado-lupas.png");
  mkdirSync(dirname(destino), { recursive: true });
  await sharp({ create: { width: LP * 2 + 30, height: (LP + 10) * linhas + 10, channels: 3, background: "#7a2630" } })
    .composite(pecas.map((input, k) => ({ input, left: 10 + (k % 2) * (LP + 10), top: 10 + Math.floor(k / 2) * (LP + 10) })))
    .png()
    .toFile(destino);
  console.log(`  lupas → ${destino}`);
}

/** Limpa, vetoriza e rasteriza a calça. Devolve largura / altura do PNG gravado. */
async function extrairCalca() {
  const { data, info } = await sharp(DESENHO_CALCA).extract(CAIXA_CALCA).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { cinza, alfa, corte } = limparDesenho({
    rgb: data,
    largura: info.width,
    altura: info.height,
    setas: SETAS_CALCA,
    reparos: REPAROS_CALCA,
  });
  const svg = await vetorizarCalca({ cinza, alfa, largura: info.width, altura: info.height, corte });
  const png = await sharp(Buffer.from(svg))
    .resize({ height: ALTURA_CALCA })
    .png({ compressionLevel: 9 })
    .toFile(join(DIR_SAIDA, `${NOME_CALCA}.png`));
  if (conferir) await gravarLupas(svg, corte);
  return png.width / png.height;
}

function gravarMedidas(proporcoes) {
  const linhas = Object.entries(proporcoes).map(([nome, p]) => `  "${nome}": ${p.toFixed(4)},`);
  writeFileSync(
    ARQUIVO_MEDIDAS,
    `/**
 * GERADO por scripts/extract-aplicacoes.mjs — não editar à mão.
 *
 * A proporção (largura / altura) de cada imagem de src/assets/estampas/aplicacoes/.
 * Na cartela é ela que dá a largura da imagem, que entra com altura fixa; o
 * texto alternativo está em src/data/estampas.ts.
 */
export const proporcaoAplicacoes: Record<string, number> = {
${linhas.join("\n")}
};
`,
  );
}

mkdirSync(DIR_SAIDA, { recursive: true });
const proporcoes = {};
for (const [nome, recorte] of Object.entries(RECORTES)) {
  proporcoes[nome] = await recortarFoto(nome, recorte);
  console.log(`  ${nome}.webp  ${recorte.width}×${recorte.height}`);
}
proporcoes[NOME_CALCA] = await extrairCalca();
console.log(`  ${NOME_CALCA}.png  altura ${ALTURA_CALCA}`);
gravarMedidas(proporcoes);
console.log(`  ${ARQUIVO_MEDIDAS}`);
