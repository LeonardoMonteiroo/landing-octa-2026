/**
 * Resolve os arquivos da seção de design de superfície
 * (src/assets/estampas/, gerados por scripts/extract-estampas.mjs).
 *
 * Duas resoluções diferentes, de propósito:
 *
 * - As peças fotografadas são webp com alfa e passam por `astro:assets`, como
 *   as amostras da materioteca: a página quer vários tamanhos e um `<img>`.
 * - Os xadrezes **não** passam. Cada um é um rapport fechado de 242 × 242 que
 *   a página usa como `background-image` repetida, e o que o `astro:assets`
 *   faz de útil ali é justamente o que não pode acontecer: redimensionar.
 *   Um rapport reamostrado abre emenda onde não havia. Por isso `?url` — o
 *   arquivo vai inteiro, do jeito que foi medido, e ainda assim com hash no
 *   nome. São 18 kB somados nos três.
 */
const modsPecas = import.meta.glob<{ default: ImageMetadata }>("../assets/estampas/*.webp", {
  eager: true,
});
const modsXadrezes = import.meta.glob<string>("../assets/estampas/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const faltou = (arquivo: string) =>
  new Error(`superficies: falta src/assets/estampas/${arquivo}. Rode "npm run extract:estampas".`);

/** ImageMetadata do recorte de uma peça fotografada (retalho, bordado). */
export function pecaSuperficie(nome: string): ImageMetadata {
  const mod = modsPecas[`../assets/estampas/${nome}.webp`];
  if (!mod) throw faltou(`${nome}.webp`);
  return mod.default;
}

/**
 * As duas cópias do rapport, para entrar numa `background-image`: a de tamanho
 * nativo e a dobrada por vizinho mais próximo, que é a que um ecrã de 2× usa.
 * O desenho é feito de linhas de 1px — deixar o navegador ampliar a pequena
 * borra o pano inteiro.
 */
export function rapport(nome: string): { um: string; dois: string } {
  const um = modsXadrezes[`../assets/estampas/${nome}.png`];
  const dois = modsXadrezes[`../assets/estampas/${nome}-2x.png`];
  if (!um) throw faltou(`${nome}.png`);
  if (!dois) throw faltou(`${nome}-2x.png`);
  return { um, dois };
}
