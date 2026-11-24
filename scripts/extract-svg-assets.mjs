#!/usr/bin/env node
/**
 * Extrai os assets vetoriais de reference/IMPRIMIR SABADO.zip para
 * src/assets/recortes/.
 *
 * O zip tem 6 SVGs de exportação do Canva, um por peça do painel-conceito
 * (ver src/components/PainelConceito.astro):
 *  - "Estrelas e rostinhos.svg", 2.svg, 3.svg — as três "velinhas" (bonecas
 *    de papel com lenço de xadrez): cada uma embute um PNG em base64
 *    (a ilustração de traço, com máscara do lenço aplicada por cima).
 *    Extraímos o maior PNG embutido de cada uma como raster/*.png (usado só
 *    como referência — a peça em si sai como SVG, ver abaixo).
 *  - 4.svg, 5.svg, 6.svg — as três estrelas de tecido xadrez (oliva, navy,
 *    vinho — as três cores da paleta Triádico). Vetor puro (autotrace),
 *    sem PNG embutido.
 *
 * Para os seis, além de copiar o SVG original, recortamos um viewBox
 * apertado ao redor da arte (os originais são uma página A4 inteira com a
 * peça num canto — ver RECORTES abaixo) e escrevemos em svg/<out> pronto
 * para <img>. Os viewBox foram medidos com getBBox() no Chrome headless.
 *
 * Uso: node scripts/extract-svg-assets.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const ZIP = resolve(root, "reference/IMPRIMIR SABADO.zip");
const OUT = resolve(root, "src/assets/recortes");

const RASTER_NAMES = {
  "Estrelas e rostinhos.svg": "rostinho-verde.png",
  "2.svg": "rostinho-vermelho.png",
  "3.svg": "xadrez-navy.png",
};

// viewBox medido com getBBox() no Chrome — a arte ocupa só um canto do A4.
const RECORTES = {
  "6.svg": { out: "estrela-oliva.svg", viewBox: "163.38 398.88 253.57 231.47" },
  "4.svg": { out: "estrela-navy.svg", viewBox: "193.75 291.05 201.70 223.06" },
  "5.svg": { out: "estrela-vinho.svg", viewBox: "159.08 351.53 308.44 281.57" },
  "3.svg": { out: "velinha-navy.svg", viewBox: "163.66 225.45 192.65 390.65" },
  "2.svg": { out: "velinha-vermelha.svg", viewBox: "217.40 305.45 162.68 232.29" },
  "Estrelas e rostinhos.svg": { out: "velinha-verde.svg", viewBox: "204.36 241.79 186.24 357.52" },
};

mkdirSync(resolve(OUT, "raster"), { recursive: true });
mkdirSync(resolve(OUT, "svg"), { recursive: true });

function readZipEntry(name) {
  return execFileSync("unzip", ["-p", ZIP, name], { maxBuffer: 1e9 }).toString("latin1");
}

function extractLargestEmbeddedPng(svgText) {
  const re = /data:image\/png;base64,([A-Za-z0-9+/=]+)/g;
  let match;
  let best = null;
  while ((match = re.exec(svgText))) {
    if (!best || match[1].length > best.length) best = match[1];
  }
  return best ? Buffer.from(best, "base64") : null;
}

/**
 * Alguns SVGs (notavelmente 3.svg) embutem o mesmo PNG em base64 várias
 * vezes — o mesmo tecido reaproveitado em vários recortes da colagem.
 * Dá pra dar um id ao primeiro <image> que usa cada URI repetida e trocar
 * as ocorrências seguintes por <use>, o que evita duplicar o base64.
 * Só troca quando x/y/width/height batem também — se não bater, mantém
 * como está (mais seguro que arriscar um <use> deslocado).
 */
function deduplicarImagensEmbutidas(svgText) {
  const imageRe = /<image\b([^>]*?)\/>/g;
  const hrefRe = /(?:xlink:href|href)="([^"]+)"/;
  const attrRe = /\b(x|y|width|height)="([^"]*)"/g;

  const porUri = new Map();
  let match;
  while ((match = imageRe.exec(svgText))) {
    const hrefMatch = hrefRe.exec(match[1]);
    if (!hrefMatch) continue;
    const uri = hrefMatch[1];
    if (!uri.startsWith("data:image/png;base64,")) continue;
    const attrs = {};
    let attrMatch;
    while ((attrMatch = attrRe.exec(match[1]))) attrs[attrMatch[1]] = attrMatch[2];
    const list = porUri.get(uri) ?? [];
    list.push({ full: match[0], attrs });
    porUri.set(uri, list);
  }

  let out = svgText;
  let nextId = 0;
  for (const [, ocorrencias] of porUri) {
    if (ocorrencias.length < 2) continue;
    const geometriaBate = ocorrencias.every(
      (o) =>
        o.attrs.x === ocorrencias[0].attrs.x &&
        o.attrs.y === ocorrencias[0].attrs.y &&
        o.attrs.width === ocorrencias[0].attrs.width &&
        o.attrs.height === ocorrencias[0].attrs.height,
    );
    if (!geometriaBate) continue;

    const id = `tecido-${nextId++}`;
    const [primeira, ...resto] = ocorrencias;
    const comId = primeira.full.replace(/^<image\b/, `<image id="${id}"`);
    out = out.replace(primeira.full, comId);
    for (const o of resto) {
      const use = `<use xlink:href="#${id}" x="${o.attrs.x}" y="${o.attrs.y}" width="${o.attrs.width}" height="${o.attrs.height}"/>`;
      out = out.replace(o.full, use);
    }
  }
  return out;
}

function recortarViewBox(svgText, viewBox) {
  return svgText
    .replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
    .replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, "$1")
    .replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, "$1");
}

console.log(`Lendo ${ZIP}`);

for (const name of Object.keys(RASTER_NAMES)) {
  const svg = readZipEntry(name);
  const png = extractLargestEmbeddedPng(svg);
  if (!png) {
    console.warn(`  ! ${name}: nenhum PNG embutido encontrado`);
    continue;
  }
  const outName = RASTER_NAMES[name];
  writeFileSync(resolve(OUT, "raster", outName), png);
  console.log(`  ${name} -> raster/${outName} (${(png.length / 1024).toFixed(0)} KB)`);
}

for (const [name, { out, viewBox }] of Object.entries(RECORTES)) {
  const original = readZipEntry(name);
  const dedup = deduplicarImagensEmbutidas(original);
  const recortado = recortarViewBox(dedup, viewBox);
  const buf = Buffer.from(recortado, "latin1");
  writeFileSync(resolve(OUT, "svg", out), buf);
  console.log(`  ${name} -> svg/${out} (${(buf.length / 1024).toFixed(0)} KB, viewBox="${viewBox}")`);
}

console.log("Pronto.");
