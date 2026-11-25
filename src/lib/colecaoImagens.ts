/**
 * Imagens do "Mapa do desfile": as fotos das modelos (src/data/colecao.ts) e os
 * três croquis dos looks que desfilaram, já resolvidos para `ImageMetadata`.
 * Quem monta o painel importa daqui, para não repetir o `import.meta.glob`.
 */
import { colecao } from "../data/colecao";
import { croquis } from "../data/croquis";

const arquivosFotos = import.meta.glob<{ default: ImageMetadata }>("../assets/colecao/*.jpeg", {
  eager: true,
});
const arquivosCroquis = import.meta.glob<{ default: ImageMetadata }>("../assets/croquis/*.png", {
  eager: true,
});

export const fotosDoDesfile = colecao.map((f) => {
  const imagem = arquivosFotos[`../assets/colecao/${f.nome}.jpeg`];
  if (!imagem) throw new Error(`colecaoImagens: falta a foto "${f.nome}"`);
  return { ...f, src: imagem.default };
});

// Ordem da esquerda para a direita: conjunto vermelho, casaco marinho, corselete.
const nomesDosCroquis = ["12", "10", "3"];

export const croquisDoDesfile = nomesDosCroquis.map((nome) => {
  const imagem = arquivosCroquis[`../assets/croquis/${nome}.png`];
  const croqui = croquis.find((c) => c.nome === nome);
  if (!imagem || !croqui) throw new Error(`colecaoImagens: falta o croqui "${nome}"`);
  return { alt: croqui.alt, src: imagem.default };
});
