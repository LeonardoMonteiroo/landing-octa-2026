/**
 * Leitura de baixo nível das páginas-imagem do "book vitoria 01.pdf"
 * (export do Canva: cada página é um único objeto /Subtype /Image
 * FlateDecode do tamanho inteiro da página, RGB 8bpc). Compartilhado
 * por extract-book.mjs (páginas inteiras) e extract-elements.mjs
 * (recortes/elementos individuais dentro de uma página).
 */
import { readFileSync } from "node:fs";
import zlib from "node:zlib";

export function readPdf(path) {
  return readFileSync(path);
}

/** Varre o PDF por objetos de imagem RGB de página inteira, deduplicados. */
export function findPageImages(buf) {
  const s = buf.toString("latin1");
  const re = /\/Subtype\s*\/Image/g;
  const images = [];
  let m;
  while ((m = re.exec(s))) {
    const objStart = s.lastIndexOf(" obj", m.index);
    const streamIdx = s.indexOf("stream", m.index);
    if (objStart < 0 || streamIdx < 0) continue;
    const dict = s.slice(objStart, streamIdx);
    if (!/FlateDecode/.test(dict)) continue;
    const wMatch = /\/Width\s+(\d+)/.exec(dict);
    const hMatch = /\/Height\s+(\d+)/.exec(dict);
    const lMatch = /\/Length\s+(\d+)/.exec(dict);
    if (!wMatch || !hMatch || !lMatch) continue;

    let dataStart = streamIdx + "stream".length;
    if (buf[dataStart] === 13) dataStart++;
    if (buf[dataStart] === 10) dataStart++;

    images.push({
      width: Number(wMatch[1]),
      height: Number(hMatch[1]),
      length: Number(lMatch[1]),
      start: dataStart,
    });
  }
  const seen = new Set();
  return images.filter((im) => {
    const key = `${im.start}_${im.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Infla a página `index` (0-based, ordem do documento) e devolve pixels RGB brutos. */
export function getPageRGB(buf, images, index) {
  const im = images[index];
  if (!im) throw new Error(`Página ${index} não existe (PDF tem ${images.length} páginas).`);
  const raw = zlib.inflateSync(buf.subarray(im.start, im.start + im.length));
  const ncomp = Math.round(raw.length / (im.width * im.height));
  return { width: im.width, height: im.height, ncomp, data: raw };
}
