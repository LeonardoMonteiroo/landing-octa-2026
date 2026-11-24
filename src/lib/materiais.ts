/**
 * Mapa nome -> ImageMetadata das amostras de tecido e das peças de aviamento
 * (src/assets/tecidos/*.webp e src/assets/aviamentos/*.webp, gerados por
 * scripts/extract-tecidos.mjs).
 *
 * Mesma ideia do glob do PainelTrendboard, mas compartilhada: a seção de
 * tecidos monta a mesma matéria em arranjos diferentes, e todos precisam
 * resolver um nome de src/data/tecidos.ts em arquivo. Estes passam por
 * astro:assets — são webp com alfa, não SVG.
 */
const modsTecidos = import.meta.glob<{ default: ImageMetadata }>("../assets/tecidos/*.webp", {
  eager: true,
});
const modsAviamentos = import.meta.glob<{ default: ImageMetadata }>("../assets/aviamentos/*.webp", {
  eager: true,
});

function resolver(
  mods: Record<string, { default: ImageMetadata }>,
  pasta: string,
  nome: string,
): ImageMetadata {
  const mod = mods[`../assets/${pasta}/${nome}.webp`];
  if (!mod) {
    throw new Error(
      `materiais: falta src/assets/${pasta}/${nome}.webp. Rode "npm run extract:tecidos".`,
    );
  }
  return mod.default;
}

export const amostra = (nome: string) => resolver(modsTecidos, "tecidos", nome);
export const aviamento = (nome: string) => resolver(modsAviamentos, "aviamentos", nome);
