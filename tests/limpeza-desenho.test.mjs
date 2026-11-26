// A limpeza do desenho técnico da calça: tira o fundo cinza e as setas de
// legenda, e refaz o traço que a seta cortava. Um quadrado sintético prova o
// mecanismo; a calça de verdade prova os números de desenho-calca.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { distanciaAoSegmento, limparDesenho } from "../scripts/lib/limpeza-desenho.mjs";
import { CAIXA_CALCA, SETAS_CALCA, REPAROS_CALCA } from "../scripts/lib/desenho-calca.mjs";

test("distanciaAoSegmento: em cima, ao lado e além da ponta", () => {
  assert.equal(distanciaAoSegmento(5, 0, [0, 0], [10, 0]).d, 0);
  assert.equal(distanciaAoSegmento(5, 3, [0, 0], [10, 0]).d, 3);
  assert.equal(distanciaAoSegmento(13, 4, [0, 0], [10, 0]).d, 5);
});

/** Prancha cinza com um quadrado branco de contorno preto, e uma seta azul que cruza o contorno direito. */
function quadradoComSeta() {
  const largura = 40, altura = 40;
  const rgb = new Uint8Array(largura * altura * 3);
  const pinta = (x, y, [r, g, b]) => {
    const i = (y * largura + x) * 3;
    rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b;
  };
  for (let y = 0; y < altura; y++)
    for (let x = 0; x < largura; x++) {
      const noQuadrado = x >= 10 && x <= 29 && y >= 10 && y <= 29;
      const noContorno = noQuadrado && (x === 10 || x === 29 || y === 10 || y === 29);
      pinta(x, y, noContorno ? [0, 0, 0] : noQuadrado ? [255, 255, 255] : [195, 196, 191]);
    }
  for (let x = 15; x <= 39; x++) pinta(x, 20, [52, 57, 77]);
  const setas = [{ nome: "teste", bolinha: [15, 20, 1.5], pontos: [[15, 20], [39, 20]] }];
  const reparo = { tipo: "traco", nome: "contorno", de: [29, 15], ate: [29, 25], raio: 0.55 };
  return { rgb, largura, altura, setas, reparo };
}

test("limparDesenho: a seta some e o contorno cortado fica contínuo", () => {
  const { rgb, largura, altura, setas, reparo } = quadradoComSeta();
  const { cinza, alfa, corte } = limparDesenho({ rgb, largura, altura, setas, reparos: [reparo] });
  const em = (x, y) => y * largura + x;
  assert.equal(alfa[em(20, 20)], 255);
  assert.equal(alfa[em(35, 20)], 0);
  assert.ok(cinza[em(29, 20)] < 100, `contorno em (29, 20) deveria ser escuro, é ${cinza[em(29, 20)]}`);
  assert.equal(cinza[em(22, 20)], 255);
  // 25 de largura, não 24: a borda suavizada do traço refeito escurece um pixel
  // para fora do contorno (x = 30), como o antisserrilhado do contorno original.
  assert.deepEqual(corte, { left: 8, top: 8, width: 25, height: 24 });
});

test("limparDesenho: sem o reparo o fundo vaza e a função recusa", () => {
  const { rgb, largura, altura, setas } = quadradoComSeta();
  assert.throws(() => limparDesenho({ rgb, largura, altura, setas, reparos: [] }), /vazou/);
});

test("limparDesenho: a calça real fecha sem vazar e enquadra 353×472", async () => {
  const arquivo = fileURLToPath(new URL("../src/assets/desenhos/11.jpeg", import.meta.url));
  const { data, info } = await sharp(arquivo).extract(CAIXA_CALCA).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { corte } = limparDesenho({
    rgb: data,
    largura: info.width,
    altura: info.height,
    setas: SETAS_CALCA,
    reparos: REPAROS_CALCA,
  });
  assert.deepEqual(corte, { left: 21, top: 11, width: 353, height: 472 });
});
