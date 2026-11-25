// Qual ficha da materioteca manda na amostra grande quando a linha de leitura
// não cai dentro de nenhuma (depois de um salto pelo sumário, por exemplo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaMaisPerto } from "../src/lib/materioteca.ts";

const caixas = [
  { top: 0, bottom: 100 },
  { top: 100, bottom: 200 },
  { top: 260, bottom: 360 },
];

test("fichaMaisPerto: a caixa que contém a linha", () => {
  assert.equal(fichaMaisPerto(caixas, 150), 1);
});

test("fichaMaisPerto: na divisa entre duas fichas, vale a de baixo (top <= linha < bottom)", () => {
  assert.equal(fichaMaisPerto(caixas, 100), 1);
});

test("fichaMaisPerto: linha acima de todas dá a primeira", () => {
  assert.equal(fichaMaisPerto(caixas, -500), 0);
});

test("fichaMaisPerto: linha abaixo de todas dá a última", () => {
  assert.equal(fichaMaisPerto(caixas, 9000), 2);
});

test("fichaMaisPerto: linha no vão dá a mais perto", () => {
  assert.equal(fichaMaisPerto(caixas, 210), 1);
  assert.equal(fichaMaisPerto(caixas, 250), 2);
});
