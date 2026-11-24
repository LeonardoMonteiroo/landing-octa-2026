/**
 * O capítulo de design de superfície: os três xadrezes e as duas peças
 * costuradas, pregados numa cartela de amostras.
 *
 * **A seção não escreve nada.** Não há título por estampa, nem descrição, nem
 * lista de cores na tela — a cartela é o argumento. O que sobra aqui de texto
 * é só alternativa textual: `descricao` para os panos, que entram como imagem
 * de fundo, e `alt` para as duas fotos. Quem não vê a cartela recebe o mesmo
 * que quem vê.
 *
 * O que é medido está em src/data/estampas-medidas.ts, gerado por
 * scripts/extract-estampas.mjs: os fios de cada xadrez (desmisturados do
 * grafite do fundo) e a proporção dos dois recortes. O fio dominante de cada
 * xadrez é o forro que assoma por baixo daquela amostra — não foi escolhido a
 * olho. As duas fotos não levam serrilha desenhada: a do pinking já é a borda
 * de verdade delas, e é dela que o recorte dos três panos foi copiado.
 *
 * Duas coisas para conferir com a Vitória, não para consertar no código:
 * o desenho do bordado não veio com nome, e é descrito aqui pelo que se vê
 * (dois ganchos enlaçados, cada um terminando num ponto redondo); e os três
 * panos do retalho estão descritos pela cor, porque a foto não diz qual dos
 * dez da materioteca é cada um.
 */
import { xadrezesMedidos, proporcaoPecas } from "./estampas-medidas";
import type { XadrezMedido } from "./estampas-medidas";

export interface Estampa {
  /** Chave: liga aos arquivos src/assets/estampas/<nome>.png e à medida. */
  nome: string;
  /** Alternativa textual do pano, que na cartela é imagem de fundo. */
  descricao: string;
  medida: XadrezMedido;
  /**
   * Fio dominante, medido. É a cor do forro que assoma por baixo da amostra
   * deste pano na cartela — a espessura do tecido vista de canto, na própria
   * cor dele.
   */
  linha: string;
}

const comLinha = (nome: string, descricao: string): Estampa => {
  const medida = xadrezesMedidos[nome];
  if (!medida) throw new Error(`estampas: falta a medida de "${nome}" — rode "npm run extract:estampas"`);
  return { nome, descricao, medida, linha: `var(--cor-${medida.fios[0].chave})` };
};

/** Do pano mais contido ao mais cheio. */
export const estampas: Estampa[] = [
  comLinha(
    "grade",
    "Xadrez de grade cinza fina sobre fundo grafite, cortada por um feixe de três fios vinho em cada sentido.",
  ),
  comLinha(
    "barra",
    "Xadrez de barras largas vinho sobre fundo grafite, com fios verdes finos correndo entre elas.",
  ),
  comLinha(
    "cruzado",
    "Xadrez denso sobre fundo grafite, com fios verdes, azuis e vinho cruzando em feixes sobre um quadriculado claro.",
  ),
];

export const porNome = new Map(estampas.map((e) => [e.nome, e]));

export function estampa(nome: string): Estampa {
  const e = porNome.get(nome);
  if (!e) throw new Error(`estampas: "${nome}" não existe`);
  return e;
}

export interface PecaSuperficie {
  /** Chave: liga ao arquivo src/assets/estampas/<nome>.webp. */
  nome: string;
  alt: string;
  /**
   * Proporção do recorte, medida. Na cartela é ela que dá a largura da peça:
   * as duas fotos entram com altura fixa e largura pela proporção, e por isso
   * nenhuma das duas é cortada — o `object-fit` ali é `contain`.
   */
  aspect: number;
}

const peca = (nome: string, alt: string): PecaSuperficie => ({
  nome,
  alt,
  aspect: proporcaoPecas[nome],
});

export const pecas: Record<string, PecaSuperficie> = {
  retalho: peca(
    "retalho",
    "Amostra de retalho com borda serrilhada: três colunas de pano — vinho, azul e oliva — atravessadas por uma faixa no meio em que a ordem das três anda uma casa.",
  ),
  bordado: peca(
    "bordado",
    "Amostra de sarja crua com borda serrilhada, bordada em preto com dois ganchos enlaçados, cada um terminando num ponto redondo.",
  ),
};
