/**
 * As seções montadas da landing. Só id + título; o conteúdo de cada seção
 * está direto em src/pages/index.astro. O menu-constelação e o
 * IntersectionObserver que marca o aria-current são orientados por esta
 * lista — basta o <Capitulo> com o mesmo id existir na página.
 */
export interface Capitulo {
  id: string;
  titulo: string;
}

export const capitulos: Capitulo[] = [
  { id: "capa", titulo: "Triádico" },
  { id: "conceito", titulo: "Conceito" },
  { id: "mood", titulo: "Mood" },
  { id: "persona", titulo: "Persona" },
  { id: "trendboard", titulo: "Trendboard" },
  { id: "cores", titulo: "Cores" },
  { id: "tecidos", titulo: "Tecidos" },
  { id: "estampas", titulo: "Estampas" },
  { id: "mapa", titulo: "Mapa" },
];
