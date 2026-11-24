/**
 * Matéria-prima das duas paredes de fotos do book: o Mood e a Persona já na
 * ordem em que aparecem, e o conto recortado em versos.
 *
 * Os dois painéis montavam essa lista cada um por conta própria, com o mesmo
 * import.meta.glob e a mesma busca por nome. Agora ela é montada aqui, uma vez
 * por parede — o que muda de um painel para o outro é o arranjo (a Marginália
 * do Mood, a CaixaFotos da Persona), não a matéria.
 */
import { moodboard, ordemMood } from "../data/moodboard";
import { persona, ordemPersona } from "../data/persona";

export interface FotoParede {
  src: ImageMetadata;
  alt: string;
  /** Ângulo de repouso, em graus. */
  giro: number;
  /** Proporção real do recorte. */
  aspect: number;
}

const fotosMood = import.meta.glob<{ default: ImageMetadata }>("../assets/moodboard/*.webp", {
  eager: true,
});
const fotosPersona = import.meta.glob<{ default: ImageMetadata }>("../assets/persona/*.webp", {
  eager: true,
});

function montar(
  pasta: string,
  arquivos: Record<string, { default: ImageMetadata }>,
  ordem: string[],
  fotos: { nome: string; alt: string; giro: number; aspect: number }[],
): FotoParede[] {
  return ordem.map((n) => {
    const foto = fotos.find((f) => f.nome === n);
    const mod = arquivos[`../assets/${pasta}/${n}.webp`];
    if (!foto || !mod) throw new Error(`paredes: falta a foto ${pasta}/${n}`);
    return { src: mod.default, alt: foto.alt, giro: foto.giro, aspect: foto.aspect };
  });
}

export const paredeMood = () => montar("moodboard", fotosMood, ordemMood, moodboard);
export const paredePersona = () => montar("persona", fotosPersona, ordemPersona, persona);

export interface Verso {
  texto: string;
  /** Primeiro verso de um parágrafo do conto — ganha o respiro de parágrafo. */
  abreParagrafo: boolean;
}

/**
 * Recorta o conto em versos pela pontuação (ponto, vírgula, ponto e vírgula),
 * juntando os pedaços curtos até cada verso ter pelo menos `minimo` letras.
 * "No vaivém do tempo," sozinho não se sustenta; com a oração seguinte, sim.
 * O resto curto do fim do parágrafo cola no verso anterior em vez de ficar
 * órfão.
 */
export function versos(paragrafos: string[], minimo = 40): Verso[] {
  const saida: Verso[] = [];
  for (const paragrafo of paragrafos) {
    const pedacos = paragrafo.split(/(?<=[.,;:])\s+/);
    const doParagrafo: string[] = [];
    let atual = "";
    for (const p of pedacos) {
      atual = atual ? `${atual} ${p}` : p;
      if (atual.length >= minimo) {
        doParagrafo.push(atual);
        atual = "";
      }
    }
    if (atual) {
      if (doParagrafo.length) doParagrafo[doParagrafo.length - 1] += ` ${atual}`;
      else doParagrafo.push(atual);
    }
    doParagrafo.forEach((texto, i) => saida.push({ texto, abreParagrafo: i === 0 }));
  }
  return saida;
}

/** Reparte `itens` em `n` grupos seguidos, do tamanho mais parecido possível. */
export function repartir<T>(itens: T[], n: number): T[][] {
  const grupos: T[][] = Array.from({ length: n }, () => []);
  itens.forEach((item, i) => grupos[Math.floor((i * n) / itens.length)].push(item));
  return grupos;
}
