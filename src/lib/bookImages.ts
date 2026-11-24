/**
 * Mapa filename -> ImageMetadata para as páginas extraídas do book
 * (src/assets/book/*.png), resolvido em build time via import.meta.glob
 * para que cada uso passe pelo pipeline de otimização de astro:assets
 * (AVIF/WebP + srcset) sem precisar de import manual por página.
 */
import type { ImageMetadata } from "astro";

const modules = import.meta.glob<{ default: ImageMetadata }>("../assets/book/*.png", { eager: true });

export const bookImages: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.split("/").pop()!, mod.default]),
);
