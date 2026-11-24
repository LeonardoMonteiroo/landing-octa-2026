/**
 * A cartela de cores da Triádico e as oito harmonias, lidas de
 * reference/cores/referencia-cores.svg.
 *
 * Aqui é o conteúdo: nome, código e tons. A geometria (as duas formas de novelo
 * e onde cada meada cai em cada harmonia) é gerada em src/data/formas-cores.ts
 * por scripts/extract-cores.mjs.
 *
 * As seis cores não são descritas por texto nenhum — o nome de cada uma já é o
 * que ela quer dizer, e explicar "Resistência" ao lado da palavra Resistência
 * seria escrever duas vezes a mesma coisa.
 */
import { formasHarmonia } from "./formas-cores";

export interface Cor {
  /** Chave: é o que liga esta cor à geometria e aos tokens --cor-*. */
  chave: string;
  nome: string;
  /** Código Pantone da prancha original. */
  tcx: string;
  /** O tom da cartela. Espelha --cor-<chave> de src/styles/tokens.css. */
  hex: string;
  /**
   * O tom claro do corpo da meada nas harmonias, como o Canva exportou. Não sai
   * do `hex` por fórmula — a Ruptura, por exemplo, virou #313131 numa harmonia
   * e #2f2f2f noutra —, então vale o que está no arquivo.
   */
  corpo: string;
  /**
   * Cor do texto escrito sobre a barra. Medido: sobre Ninho e Fragilidade o
   * papel dá 1,9:1 e 2,8:1, abaixo do mínimo, e só a tinta escura passa; sobre
   * as outras quatro é o contrário. Todas ficam acima de 4,5:1.
   */
  tinta: "papel" | "ruptura";
}

/** Na ordem da prancha original. */
export const cores: Cor[] = [
  { chave: "resistencia", nome: "Resistência", tcx: "19-1726", hex: "#3d1216", corpo: "#672e33", tinta: "papel" },
  { chave: "pertencer", nome: "Pertencer", tcx: "18-4028", hex: "#2c384f", corpo: "#32466c", tinta: "papel" },
  { chave: "ninho", nome: "Ninho", tcx: "15-0751", hex: "#c19f53", corpo: "#d9b668", tinta: "ruptura" },
  { chave: "jardim", nome: "Jardim", tcx: "18-0523", hex: "#434429", corpo: "#606147", tinta: "papel" },
  { chave: "fragilidade", nome: "Fragilidade", tcx: "14-4205", hex: "#878881", corpo: "#969791", tinta: "ruptura" },
  { chave: "ruptura", nome: "Ruptura", tcx: "19-4204", hex: "#030405", corpo: "#313131", tinta: "papel" },
];

export const porChave = new Map(cores.map((c) => [c.chave, c]));

export function cor(chave: string): Cor {
  const c = porChave.get(chave);
  if (!c) throw new Error(`cores: "${chave}" não está na cartela`);
  return c;
}

/**
 * As oito harmonias, na ordem em que a seção as mostra: as quatro duplas e
 * depois os quatro trios. A chave é o nome do arquivo de origem — é assim que
 * formas-cores.ts as indexa, e mantém o caminho de volta ao material.
 */
export const harmonias = ["9", "10", "11", "12", "5", "6", "7", "8"] as const;

/**
 * As cores de uma harmonia, na ordem da cartela. A geometria as guarda na ordem
 * de pintura (de baixo para cima na pilha), que é o que importa para desenhar e
 * não para ler.
 */
export function coresDa(harmonia: string): Cor[] {
  const forma = formasHarmonia[harmonia];
  if (!forma) throw new Error(`cores: harmonia "${harmonia}" não existe em formas-cores.ts`);
  const ordem = cores.map((c) => c.chave);
  return forma.meadas
    .map((m) => cor(m.cor))
    .sort((a, b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave));
}

/** "Resistência e Pertencer", "Resistência, Jardim e Pertencer". */
export function legenda(harmonia: string): string {
  const nomes = coresDa(harmonia).map((c) => c.nome);
  if (nomes.length < 2) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
