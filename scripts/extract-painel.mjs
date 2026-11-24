#!/usr/bin/env node
/**
 * Prepara os recortes dos painéis Persona e Trendboard a partir dos zips de
 * referência ("fotos painel persona.zip" e "trend board.zip").
 *
 * Diferença para scripts/extract-moodboard.mjs: lá cada foto vinha centralizada
 * num canvas PRETO e o script varre os pixels atrás do bounding box do que não é
 * preto. Aqui o canvas 2000x1414 é TRANSPARENTE, então quem acha a borda é o
 * trim() do sharp — o resultado bate exatamente com o bounding box de alfa.
 *
 * O último arquivo de cada zip (16.png) não é foto: é o bloco de texto do conto
 * renderizado como imagem, com capitular e estrela. Esse vira texto de verdade
 * (src/data/textos.ts + FolhaConto.astro), por isso o --pular.
 *
 * O aspect de cada recorte é o que os painéis usam para montar as colunas e o
 * lineup (ver src/data/persona.ts e src/data/trendboard.ts), por isso o script
 * também imprime e grava as proporções resultantes.
 *
 * Uso:
 *   node scripts/extract-painel.mjs --src=<dir com 1.png..16.png> --out=persona [--pular=16] [--dry]
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
if (!args.out || args.out === true) {
  console.error("faltou --out=<persona|trendboard> (nome da pasta em src/assets)");
  process.exit(1);
}

const outDir = join(root, "src/assets", args.out);

// Alfa acima disto conta como pixel da peça. 1 já basta: o export vem com o
// fundo zerado de verdade, não com um quase-transparente de compressão.
const LIMIAR = 1;

const pular = new Set(
  typeof args.pular === "string" ? args.pular.split(",").map((n) => n.trim()) : [],
);

const arquivos = readdirSync(srcDir)
  .filter((f) => /^\d+\.png$/i.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

if (!args.dry) mkdirSync(outDir, { recursive: true });

const resultado = [];
let bytes = 0;

for (const arq of arquivos) {
  const nome = arq.replace(/\.png$/i, "");
  if (pular.has(nome)) {
    console.log(`${arq.padEnd(7)} pulado (vira texto, não imagem)`);
    continue;
  }

  // alphaQuality alto porque a borda do recorte é o desenho: numa silhueta de
  // passarela um alfa mal quantizado vira franja clara contra o fundo chapado.
  const peca = sharp(join(srcDir, arq))
    .trim({ threshold: LIMIAR })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 });

  const info = args.dry
    ? (await peca.toBuffer({ resolveWithObject: true })).info
    : await peca.toFile(join(outDir, `${nome}.webp`));

  const aspect = +(info.width / info.height).toFixed(3);
  bytes += info.size;
  console.log(
    `${arq.padEnd(7)} ${String(info.width).padStart(4)}x${String(info.height).padEnd(4)} ` +
      `${String(Math.round(info.size / 1024)).padStart(4)}KB  aspect ${aspect}`,
  );
  resultado.push({ nome, aspect, w: info.width, h: info.height });
}

const mb = (bytes / 1048576).toFixed(2);
console.log(
  `\n${resultado.length} recortes, ${mb} MB${args.dry ? " (dry-run, nada gravado)" : ` -> ${outDir}`}`,
);

if (!args.dry) {
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(resultado, null, 2) + "\n");
}
