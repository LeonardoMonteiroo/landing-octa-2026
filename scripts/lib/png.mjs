/**
 * Codificador PNG mínimo (sem libpng), RGB e RGBA. Compartilhado pelos
 * scripts de extração — não há poppler/mutool/sharp disponíveis neste
 * ambiente, então falamos PNG diretamente por chunk.
 */
import zlib from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

/**
 * @param {Buffer} pixels linha a linha, sem byte de filtro, componentes intercalados
 * @param {number} width
 * @param {number} height
 * @param {4|3} channels 3 = RGB (color type 2), 4 = RGBA (color type 6)
 */
export function encodePNG(pixels, width, height, channels = 3) {
  const bpp = channels;
  const stride = width * bpp;
  const rows = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    const srcOff = y * stride;
    const dstOff = y * (1 + stride);
    rows[dstOff] = 0; // filtro "none"
    pixels.copy(rows, dstOff + 1, srcOff, srcOff + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  const idat = zlib.deflateSync(rows, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
