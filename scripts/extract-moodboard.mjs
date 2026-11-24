#!/usr/bin/env node
/**
 * Prepara as fotos do moodboard (página 13 do book) a partir do zip de
 * referência "fotos moodboard.zip". Cada arquivo do zip vem com a foto
 * centralizada num canvas preto 2000x1414 (letterbox do export), então
 * aqui detectamos o bounding box do que não é preto, recortamos e
 * gravamos em src/assets/moodboard/NN.webp.
 *
 * O aspect de cada recorte é o que o mosaico usa para montar as colunas
 * (ver src/data/moodboard.ts), por isso o script também imprime/grava
 * as proporções resultantes.
 *
 * Uso:
 *   node scripts/extract-moodboard.mjs --src=<dir com 1.png..20.png> [--dry]
 */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
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

const srcDir = args.src ? resolve(args.src) : null;
if (!srcDir) {
  console.error("faltou --src=<dir com os png do zip>");
  process.exit(1);
}

const outDir = join(root, "src/assets/moodboard");
// Acima deste valor o pixel deixa de ser "preto de letterbox". O preto do
// canvas é 0,0,0 chapado; as fotos escuras do moodboard (as mãos da vó no
// fundo preto) chegam perto, daí a margem curta.
const LIMIAR = 18;

/** Bounding box do que não é preto. Retorna null se a imagem for toda preta. */
function boundingBox(data, W, H, ch) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * ch;
      if (data[p] > LIMIAR || data[p + 1] > LIMIAR || data[p + 2] > LIMIAR) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const arquivos = readdirSync(srcDir)
  .filter((f) => /^\d+\.png$/i.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

if (!args.dry) mkdirSync(outDir, { recursive: true });

const resultado = [];
for (const arq of arquivos) {
  const img = sharp(join(srcDir, arq));
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const cx = boundingBox(data, info.width, info.height, info.channels);

  if (!cx) {
    console.log(`${arq.padEnd(7)} VAZIA — descartada`);
    continue;
  }

  const aspect = +(cx.width / cx.height).toFixed(3);
  const nome = arq.replace(/\.png$/i, "");
  console.log(
    `${arq.padEnd(7)} ${String(cx.width).padStart(4)}x${String(cx.height).padEnd(4)} ` +
      `@(${cx.left},${cx.top})  aspect ${aspect}`,
  );
  resultado.push({ nome, aspect, w: cx.width, h: cx.height });

  if (!args.dry) {
    await sharp(join(srcDir, arq))
      .extract(cx)
      .webp({ quality: 90 })
      .toFile(join(outDir, `${nome}.webp`));
  }
}

console.log(`\n${resultado.length} fotos${args.dry ? " (dry-run, nada gravado)" : ` -> ${outDir}`}`);
if (!args.dry) {
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(resultado, null, 2) + "\n");
}
