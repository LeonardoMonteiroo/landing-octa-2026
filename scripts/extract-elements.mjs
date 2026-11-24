#!/usr/bin/env node
/**
 * Recorta elementos individuais de dentro de uma página do book
 * (fotos de uma colagem, uma ilustração isolada do fundo colorido,
 * um item de aviamento) — em vez de usar a página inteira como imagem
 * de fundo. Lê direto do PDF fonte (mesma rotina de extract-book.mjs)
 * para manter a resolução máxima disponível no recorte.
 *
 * Modos:
 *   crop    — recorta um retângulo (percentuais 0–1 da página) como está.
 *   cutout  — recorta o retângulo e torna transparente tudo que estiver
 *             perto de `--bg` (cor de fundo a remover), cortando depois
 *             para o bounding box do que sobrou opaco. Uso: isolar uma
 *             ilustração (estrela, mão, cachorro) do fundo de cor chapada
 *             da página, sem depender de um editor de imagem.
 *
 * Uso:
 *   node scripts/extract-elements.mjs --page=5 --rect=0.02,0.02,0.5,0.3 --out=painel-conceito/foto-01
 *   node scripts/extract-elements.mjs --page=6 --rect=0.1,0.1,0.4,0.3 --cutout --bg=2c384f --tolerance=28 --out=conto-01/estrela
 *
 * `--page` é 0-based, mesma ordem de src/assets/book/manifest.json.
 * `--rect` é "x0,y0,x1,y1" em fração da largura/altura da página.
 * Saída em src/assets/recortes/elementos/<out>.png.
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
const OUT_DIR = resolve(root, "src/assets/recortes/elementos");

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Fatia uma colagem em fotos individuais de verdade: monta uma máscara
 * de "argamassa" (pixels perto de `grout`) sobre uma versão reamostrada
 * da página, encontra os componentes conectados de NÃO-argamassa
 * (flood fill 4-conexo) e devolve o bounding box de cada um em pixels
 * originais — cada componente é uma foto/ilustração da colagem.
 */
function segmentGrid(page, grout, tolerance, { step = 6, minAreaCells = 40 } = {}) {
  const { width: W, height: H, ncomp, data } = page;
  const gridW = Math.floor(W / step);
  const gridH = Math.floor(H / step);
  const groutColors = grout.split(",").map(hexToRgb);
  const tol2 = tolerance * tolerance;

  const isGrout = new Uint8Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const x = gx * step;
      const y = gy * step;
      const o = (y * W + x) * ncomp;
      const r = data[o],
        g = data[o + 1],
        b = data[o + 2];
      const match = groutColors.some(([gr, gg, gb]) => {
        const dr = r - gr,
          dg = g - gg,
          db = b - gb;
        return dr * dr + dg * dg + db * db <= tol2;
      });
      isGrout[gy * gridW + gx] = match ? 1 : 0;
    }
  }

  const visited = new Uint8Array(gridW * gridH);
  const components = [];
  const stackX = new Int32Array(gridW * gridH);
  const stackY = new Int32Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (isGrout[idx] || visited[idx]) continue;

      let sp = 0;
      stackX[sp] = gx;
      stackY[sp] = gy;
      sp++;
      visited[idx] = 1;
      let minX = gx,
        maxX = gx,
        minY = gy,
        maxY = gy,
        area = 0;

      while (sp > 0) {
        sp--;
        const cx = stackX[sp];
        const cy = stackY[sp];
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
          const nIdx = ny * gridW + nx;
          if (isGrout[nIdx] || visited[nIdx]) continue;
          visited[nIdx] = 1;
          stackX[sp] = nx;
          stackY[sp] = ny;
          sp++;
        }
      }

      if (area >= minAreaCells) {
        components.push({
          x0: minX * step,
          y0: minY * step,
          x1: Math.min(W, (maxX + 1) * step),
          y1: Math.min(H, (maxY + 1) * step),
          area,
        });
      }
    }
  }

  // Ordem de leitura: linha (bucket por y0) depois coluna (x0).
  const rowBucket = step * 20;
  components.sort((a, b) => {
    const rowA = Math.round(a.y0 / rowBucket);
    const rowB = Math.round(b.y0 / rowBucket);
    if (rowA !== rowB) return rowA - rowB;
    return a.x0 - b.x0;
  });

  return components;
}

function runAutoGrid() {
  const pageIndex = Number(args.page);
  const outName = args.out;
  const grout = args.grout;
  const tolerance = Number(args.tolerance || 22);
  const inset = Number(args.inset || 6);
  if (Number.isNaN(pageIndex) || !outName || !grout) {
    console.error("Uso: --page=N --auto-grid --grout=RRGGBB[,RRGGBB2] --out=nome [--tolerance=22] [--inset=6] [--min-area=40]");
    process.exit(1);
  }

  const buf = readPdf(SRC);
  const images = findPageImages(buf);
  const page = getPageRGB(buf, images, pageIndex);
  const minAreaCells = Number(args["min-area"] || 40);
  const components = segmentGrid(page, grout, tolerance, { minAreaCells });

  if (!components.length) {
    console.error(`auto-grid ${outName}: nenhum componente encontrado — confira a cor de argamassa/tolerância.`);
    process.exit(1);
  }

  mkdirSync(resolve(OUT_DIR, dirname(outName)), { recursive: true });

  function pixelAt(x, y) {
    const o = (y * page.width + x) * page.ncomp;
    return [page.data[o], page.data[o + 1], page.data[o + 2]];
  }

  const manifest = [];
  components.forEach((c, i) => {
    const x0 = Math.min(page.width - 1, c.x0 + inset);
    const y0 = Math.min(page.height - 1, c.y0 + inset);
    const x1 = Math.max(x0 + 1, c.x1 - inset);
    const y1 = Math.max(y0 + 1, c.y1 - inset);
    const cw = x1 - x0;
    const ch = y1 - y0;
    const out = Buffer.alloc(cw * ch * 3);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const [r, g, b] = pixelAt(x0 + x, y0 + y);
        const o = (y * cw + x) * 3;
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
      }
    }
    const png = encodePNG(out, cw, ch, 3);
    const filename = `${outName}-${String(i + 1).padStart(2, "0")}.png`;
    writeFileSync(resolve(OUT_DIR, filename), png);
    manifest.push({ file: filename, width: cw, height: ch, aspect: +(cw / ch).toFixed(3) });
    console.log(`  ${filename}  ${cw}x${ch}`);
  });

  writeFileSync(resolve(OUT_DIR, `${outName}-manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`auto-grid ${outName}: ${components.length} peças (página ${pageIndex}, grout #${grout}, tol ${tolerance})`);
}

function main() {
  if (args["auto-grid"]) {
    runAutoGrid();
    return;
  }

  const pageIndex = Number(args.page);
  const [x0, y0, x1, y1] = String(args.rect)
    .split(",")
    .map(Number);
  const outName = args.out;
  if (Number.isNaN(pageIndex) || [x0, y0, x1, y1].some(Number.isNaN) || !outName) {
    console.error("Uso: --page=N --rect=x0,y0,x1,y1 --out=nome [--cutout --bg=RRGGBB --tolerance=28]");
    process.exit(1);
  }

  const buf = readPdf(SRC);
  const images = findPageImages(buf);
  const page = getPageRGB(buf, images, pageIndex);
  const { width: W, height: H, ncomp, data } = page;

  const rx0 = Math.round(x0 * W);
  const ry0 = Math.round(y0 * H);
  const rx1 = Math.round(x1 * W);
  const ry1 = Math.round(y1 * H);
  const cw = rx1 - rx0;
  const ch = ry1 - ry0;

  if (cw <= 0 || ch <= 0) {
    console.error(`Retângulo inválido: ${cw}x${ch}`);
    process.exit(1);
  }

  function pixelAt(x, y) {
    const o = (y * W + x) * ncomp;
    return [data[o], data[o + 1], data[o + 2]];
  }

  if (!args.cutout) {
    // --- modo crop: retângulo opaco, sem tratamento ---
    const out = Buffer.alloc(cw * ch * 3);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const [r, g, b] = pixelAt(rx0 + x, ry0 + y);
        const o = (y * cw + x) * 3;
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
      }
    }
    const png = encodePNG(out, cw, ch, 3);
    const dest = resolve(OUT_DIR, `${outName}.png`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, png);
    console.log(`crop  ${outName}.png  ${cw}x${ch}  (página ${pageIndex}, rect ${args.rect})`);
    return;
  }

  // --- modo cutout: remove a(s) cor(es) de fundo e recorta pro bbox do que sobrou ---
  // --bg aceita uma ou mais cores separadas por vírgula (ex.: o fundo chapado
  // da página + a cor do texto antigo que não deve sobrar no recorte).
  const bgColors = String(args.bg || "ffffff").split(",").map(hexToRgb);
  const tolerance = Number(args.tolerance || 24);
  const tol2 = tolerance * tolerance;

  const alpha = new Uint8Array(cw * ch);
  let minX = cw,
    minY = ch,
    maxX = -1,
    maxY = -1;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const [r, g, b] = pixelAt(rx0 + x, ry0 + y);
      const isBg = bgColors.some(([br, bg_, bb]) => {
        const dr = r - br,
          dg = g - bg_,
          db = b - bb;
        return dr * dr + dg * dg + db * db <= tol2;
      });
      const idx = y * cw + x;
      alpha[idx] = isBg ? 0 : 255;
      if (!isBg) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX) {
    console.error(`cutout ${outName}: nada sobrou depois de remover o fundo — tolerância alta demais ou bg errado.`);
    process.exit(1);
  }

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(cw - 1, maxX + pad);
  maxY = Math.min(ch - 1, maxY + pad);
  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;

  const out = Buffer.alloc(bboxW * bboxH * 4);
  for (let y = 0; y < bboxH; y++) {
    for (let x = 0; x < bboxW; x++) {
      const sx = minX + x;
      const sy = minY + y;
      const [r, g, b] = pixelAt(rx0 + sx, ry0 + sy);
      const a = alpha[sy * cw + sx];
      const o = (y * bboxW + x) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }
  }
  const png = encodePNG(out, bboxW, bboxH, 4);
  const dest = resolve(OUT_DIR, `${outName}.png`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, png);
  console.log(`cutout ${outName}.png  ${bboxW}x${bboxH}  (página ${pageIndex}, rect ${args.rect}, bg #${args.bg}, tol ${tolerance})`);
}

main();
