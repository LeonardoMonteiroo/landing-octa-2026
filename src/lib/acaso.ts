/**
 * Pseudoaleatório determinístico: o mesmo índice dá sempre o mesmo número em
 * [0, 1). O espalhamento das peças precisa ser irregular, mas não pode mudar a
 * cada build — nem a cada refresh do ScrollTrigger.
 *
 * Arquivo à parte de paredes.ts de propósito: os <script> de cliente importam
 * isto, e paredes.ts puxa as fotos por import.meta.glob.
 */
export function acaso(i: number, semente = 1): number {
  const x = Math.sin((i + 1) * 12.9898 * semente + semente * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
