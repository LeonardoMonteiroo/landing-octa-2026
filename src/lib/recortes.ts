/**
 * Mapa filename -> URL para os recortes SVG do painel-conceito
 * (src/assets/recortes/svg/*.svg — ver scripts/extract-svg-assets.mjs).
 * Astro 4 não passa SVG pelo pipeline de astro:assets, então aqui a gente
 * só pede pro Vite emitir o arquivo (`?url`) e consome como <img src>
 * normal — mesma ideia de src/lib/bookImages.ts, mas sem otimização de
 * imagem porque não se aplica a vetor.
 */
const modules = import.meta.glob<string>("../assets/recortes/svg/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

export const recortes: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.split("/").pop()!, url]),
);

export function recorte(nome: string): string {
  const url = recortes[nome];
  if (!url) {
    throw new Error(`recorte: "${nome}" não existe em src/assets/recortes/svg/. Rode "npm run extract:svg" para gerar os recortes.`);
  }
  return url;
}
