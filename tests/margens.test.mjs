// A divisão das fotos de cada verso do Mood entre as duas margens da Marginália.
// Roda com `npm test` (node --test, que importa o .ts direto, sem build).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dividirMargens, alturaEstimada, TELA_REFERENCIA_MOOD } from "../src/lib/margens.ts";
import { acaso } from "../src/lib/acaso.ts";

test("dividirMargens acha a divisão de menor diferença e desempata pela menor máscara", () => {
  assert.deepEqual(dividirMargens([100, 300, 100, 100], { vao: 0, deslocamentoDireita: 0 }), {
    esquerda: [0, 2, 3],
    direita: [1],
  });
});

test("dividirMargens conta o deslocamento da direita", () => {
  assert.deepEqual(dividirMargens([100, 100], { vao: 0, deslocamentoDireita: 150 }), {
    esquerda: [0, 1],
    direita: [],
  });
});

test("alturaEstimada respeita o teto de 70svh das peças em pé", () => {
  assert.equal(Math.round(alturaEstimada({ aspect: 0.252, largura: 1 }, TELA_REFERENCIA_MOOD)), 1008);
  assert.equal(alturaEstimada({ aspect: 2, largura: 0.9 }, TELA_REFERENCIA_MOOD), 180);
});

test("primeiro verso do Mood: a divisão nova fica abaixo de uma foto média de diferença", () => {
  const aspects = [1.335, 0.514, 2.353, 0.683, 1.128, 0.59]; // ordemMood[0..5]
  const alturas = aspects.map((aspect, k) =>
    alturaEstimada({ aspect, largura: 0.8 + acaso(k, 11) * 0.2 }, TELA_REFERENCIA_MOOD),
  );
  const soma = (indices, deslocamento) =>
    indices.reduce((total, i, n) => total + alturas[i] + (n ? TELA_REFERENCIA_MOOD.vao : 0), deslocamento);
  const media = alturas.reduce((a, b) => a + b) / alturas.length;
  const { esquerda, direita } = dividirMargens(alturas, TELA_REFERENCIA_MOOD);
  assert.ok(Math.abs(soma(esquerda, 0) - soma(direita, 80)) < media);
  // A divisão antiga (par/ímpar) é o defeito: a diferença passa de uma foto média.
  assert.ok(Math.abs(soma([0, 2, 4], 0) - soma([1, 3, 5], 80)) > media);
});
