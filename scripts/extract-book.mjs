#!/usr/bin/env node
/**
 * Extrai as páginas do "book vitoria 01.pdf" (export do Canva) como PNGs
 * numerados, para uso como assets de origem em src/assets/book/.
 *
 * Usadas hoje só como pano de fundo/referência de algumas seções — a
 * maior parte do conteúdo por trás das páginas foi decomposta em
 * elementos individuais por scripts/extract-elements.mjs.
 *
 * Uso:
 *   node scripts/extract-book.mjs [--width=1800] [--src=reference/book\ vitoria\ 01.pdf]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPdf, findPageImages, getPageRGB } from "./lib/pdf-pages.mjs";
import { encodePNG } from "./lib/png.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const SRC = resolve(root, args.src || "reference/book vitoria 01.pdf");
const OUT_DIR = resolve(root, args.out || "src/assets/book");
const TARGET_WIDTH = Number(args.width || 1800);

mkdirSync(OUT_DIR, { recursive: true });

function resample(raw, srcW, srcH, ncomp, targetW) {
  const scale = srcW / targetW;
  const targetH = Math.round(srcH / scale);
  const out = Buffer.alloc(targetW * targetH * 3);
  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(srcH - 1, Math.floor(y * scale));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(srcW - 1, Math.floor(x * scale));
      const so = (sy * srcW + sx) * ncomp;
      const to = (y * targetW + x) * 3;
      if (ncomp >= 3) {
        out[to] = raw[so];
        out[to + 1] = raw[so + 1];
        out[to + 2] = raw[so + 2];
      } else {
        out[to] = out[to + 1] = out[to + 2] = raw[so];
      }
    }
  }
  return { pixels: out, width: targetW, height: targetH };
}

function main() {
  console.log(`Lendo ${SRC}`);
  const buf = readPdf(SRC);
  const images = findPageImages(buf);
  console.log(`${images.length} páginas encontradas. Extraindo para ${OUT_DIR} (largura alvo ${TARGET_WIDTH}px)…`);

  const manifest = [];
  images.forEach((_, i) => {
    const page = getPageRGB(buf, images, i);
    const { pixels, width, height } = resample(page.data, page.width, page.height, page.ncomp, TARGET_WIDTH);
    const png = encodePNG(pixels, width, height, 3);
    const filename = `page-${String(i).padStart(2, "0")}.png`;
    writeFileSync(resolve(OUT_DIR, filename), png);
    manifest.push({ index: i, file: filename, width, height, sourceWidth: page.width, sourceHeight: page.height });
    console.log(`  ${filename}  ${page.width}x${page.height} -> ${width}x${height}`);
  });

  writeFileSync(resolve(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Pronto. ${images.length} páginas + manifest.json.`);
}

main();
