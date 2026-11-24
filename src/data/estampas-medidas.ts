/**
 * GERADO por scripts/extract-estampas.mjs — não editar à mão.
 *
 * Os fios de cada xadrez, desmisturados do grafite do fundo (o porquê está no
 * cabeçalho do script). `tinta` é a fração do pano que aquela cor ocuparia se
 * estivesse chapada: um fio de vinho a 50% de opacidade em 4% do pano dá 2%.
 * É o número que ordena os fios na ficha, e o que deixa "quase não se vê"
 * medido em vez de dito de olho.
 *
 * O conteúdo escrito — título, harmonia, texto — está em src/data/estampas.ts.
 */
export interface FioMedido {
  /** Chave da cartela, de src/data/cores.ts. */
  chave: string;
  /** Fração do pano, em tinta chapada equivalente. */
  tinta: number;
}

export interface XadrezMedido {
  nome: string;
  /** Lado do rapport, em px. O arquivo inteiro é o desenho. */
  lado: number;
  /** Fração do pano que é só o grafite do fundo. */
  grafite: number;
  /** Do fio mais presente ao menos presente. */
  fios: FioMedido[];
}

export const xadrezesMedidos: Record<string, XadrezMedido> = {
  grade: {
    nome: "grade",
    lado: 242,
    grafite: 0.803,
    fios: [
      { chave: "fragilidade", tinta: 0.0444 },
      { chave: "resistencia", tinta: 0.0179 },
    ],
  },
  barra: {
    nome: "barra",
    lado: 242,
    grafite: 0.784,
    fios: [
      { chave: "resistencia", tinta: 0.087 },
      { chave: "jardim", tinta: 0.028 },
    ],
  },
  cruzado: {
    nome: "cruzado",
    lado: 242,
    grafite: 0.612,
    fios: [
      { chave: "jardim", tinta: 0.0502 },
      { chave: "pertencer", tinta: 0.0389 },
      { chave: "resistencia", tinta: 0.0246 },
      { chave: "fragilidade", tinta: 0.0076 },
      { chave: "linho", tinta: 0.0059 },
    ],
  },
};

/**
 * Proporção das duas peças fotografadas, medida do recorte. É ela que dá a
 * altura da peça quando a parede se abre numa coluna só, e é contra ela que as
 * fileiras da grade estão calibradas na tela de projeto.
 */
export const proporcaoPecas: Record<string, number> = {
  retalho: 0.714,
  bordado: 0.971,
};
