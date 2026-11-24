/**
 * Mapa "pasta/arquivo.png" -> ImageMetadata para todos os elementos
 * decompostos em src/assets/recortes/elementos/ (fotos de colagem
 * fatiadas, ilustrações recortadas do fundo, etc — ver
 * scripts/extract-elements.mjs). Mesma ideia de src/lib/bookImages.ts,
 * só que para os recortes em vez das páginas inteiras.
 */
import type { ImageMetadata } from "astro";

const modules = import.meta.glob<{ default: ImageMetadata }>("../assets/recortes/elementos/**/*.png", {
  eager: true,
});

export const elementos: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => {
    const key = path.split("/elementos/")[1];
    return [key, mod.default];
  }),
);

/** Todas as chaves de uma "pasta" (ex.: "painel-conceito"), na ordem em que os arquivos foram gerados. */
export function elementosDe(pasta: string): ImageMetadata[] {
  return Object.entries(elementos)
    .filter(([key]) => key.startsWith(`${pasta}/`))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, img]) => img);
}
