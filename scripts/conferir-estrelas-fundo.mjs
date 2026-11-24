#!/usr/bin/env node
/**
 * Conferência visual do que extract-estrelas-fundo.mjs traçou: remonta as
 * estrelas vetorizadas na dispersão original e rasteriza em .piloto/, para
 * comparar com a máscara de origem.
 *
 * Existe porque contorno traçado é coisa que só se confere olhando — uma ponta
 * cisalhada pela borda do bitmap ou um Douglas-Peucker agressivo demais não
 * aparecem em contagem de ponto nenhuma (a mesma lição da estrela da capitular,
 * ver "Medir não é ver" no CLAUDE.md).
 *
 * Uso: node scripts/conferir-estrelas-fundo.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// .ts não importa direto no Node: pesca cada literal do array pelo formato
// fixo com que o extrator escreve as linhas.
const texto = readFileSync(resolve(root, "src/data/estrelasFundo.ts"), "utf8");
const estrelasFundo = [...texto.matchAll(/^\s*\{ (x: .+) \},$/gm)].map((m) =>
  JSON.parse(`{${m[1].replace(/(\w+):/g, '"$1":')}}`),
);

const LARG = 1123;
const ALT = 944; // proporção do desenho de origem (1996 × 1679)

const pecas = estrelasFundo
  .map((e) => {
    const [, , caixaLarg, caixaAlt] = e.caixa.split(" ").map(Number);
    const larg = (e.larg / 100) * LARG;
    const alt = (larg / caixaLarg) * caixaAlt;
    const x = (e.x / 100) * LARG - larg / 2;
    const y = (e.y / 100) * ALT - alt / 2;
    return `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${larg.toFixed(2)}" height="${alt.toFixed(2)}" viewBox="${e.caixa}"><path d="${e.traco}" fill="#1b1d18"/></svg>`;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARG}" height="${ALT}" viewBox="0 0 ${LARG} ${ALT}"><rect width="${LARG}" height="${ALT}" fill="#e2e2e1"/>${pecas}</svg>`;

mkdirSync(resolve(root, ".piloto"), { recursive: true });
writeFileSync(resolve(root, ".piloto/estrelas-vetorizadas.svg"), svg);
await sharp(Buffer.from(svg)).png().toFile(resolve(root, ".piloto/estrelas-vetorizadas.png"));

console.log(`${estrelasFundo.length} estrelas em .piloto/estrelas-vetorizadas.png — olhe a imagem.`);
