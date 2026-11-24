/**
 * Fotos do moodboard (página 13 do book), recortadas do zip de referência
 * "fotos moodboard.zip" por scripts/extract-moodboard.mjs — o zip traz cada
 * foto centralizada num canvas preto 2000x1414, o script tira o letterbox.
 *
 * `aspect` é a proporção real do recorte (ver src/assets/moodboard/manifest.json);
 * a Marginália usa isso para pôr teto nas peças estreitas, que sem ele descem
 * uma tela inteira (a tira de tecido, com 0,252, ocuparia quase setenta rem de
 * altura numa margem de largura fixa).
 *
 * `giro` é o ângulo de repouso da foto na parede, em graus — escrito à mão e de
 * propósito irregular: quem prega foto numa parede não alterna ±2,5°.
 */

export interface MoodFoto {
  /** Nome do arquivo em src/assets/moodboard, sem extensão. */
  nome: string;
  aspect: number;
  giro: number;
  alt: string;
}

export const moodboard: MoodFoto[] = [
  { nome: "1", aspect: 1.335, giro: -1.8, alt: "Pintura surrealista: cinco figuras fantásticas dançando em roda" },
  { nome: "2", aspect: 0.252, giro: 2.4, alt: "Detalhe de tecido avermelhado, com veios abertos como uma teia" },
  { nome: "3", aspect: 0.59, giro: -2.6, alt: "Desenho de uma figura caindo sobre um fundo rosa coberto de olhos" },
  { nome: "4", aspect: 0.757, giro: 1.2, alt: "Colagem: figura sentada com uma casa no lugar da cabeça, segurando um bebê nas mãos" },
  { nome: "5", aspect: 2.353, giro: -0.7, alt: "Copa de uma árvore sem folhas fotografada de baixo, em preto e branco" },
  { nome: "6", aspect: 1.818, giro: 2.9, alt: "Três cordeiros saltando num campo cercado, em preto e branco" },
  { nome: "7", aspect: 1.179, giro: -1.4, alt: "Ninho de gravetos sobre fundo claro" },
  { nome: "8", aspect: 0.612, giro: 0.8, alt: "Ilustração recortada em preto: rostos e mãos emergindo de uma mancha" },
  { nome: "9", aspect: 0.584, giro: -3.1, alt: "Retrato de uma senhora de óculos, sorrindo" },
  { nome: "10", aspect: 1.128, giro: 1.6, alt: "Foto de família: mãe, avó e um bebê recém-nascido no colo" },
  { nome: "11", aspect: 0.514, giro: -2.2, alt: "Retalhos de tecido xadrez costurados uns aos outros" },
  { nome: "12", aspect: 0.376, giro: 2.1, alt: "Criança dançando de braço erguido num corredor azulado" },
  { nome: "13", aspect: 1.186, giro: -0.9, alt: "Escultura de aranha gigante diante do horizonte de uma cidade" },
  { nome: "14", aspect: 1.276, giro: 2.7, alt: "Pintura com três figuras femininas alinhadas lado a lado" },
  { nome: "15", aspect: 0.683, giro: -1.5, alt: "Cianotipia: silhuetas de figuras recortadas em azul" },
  { nome: "16", aspect: 1.009, giro: 0.5, alt: "Retrato de uma jovem sorrindo ao ar livre" },
  { nome: "17", aspect: 0.699, giro: -2.9, alt: "Mãos plantando uma flor vermelha numa roda de ferro enterrada na terra" },
  { nome: "18", aspect: 0.545, giro: 1.9, alt: "Fotograma botânico: flores e hastes em preto e branco" },
];

/**
 * Ordem da parede. As margens da Marginália são servidas nesta sequência
 * (pares para a esquerda, ímpares para a direita), então ela alterna deitadas e
 * em pé para nenhum lado acumular um formato só. A foto das três gerações (mãe,
 * avó e bebê) vem cedo, junto do verso que conta o "uma que se multiplicava em
 * três".
 */
export const ordemMood = [
  "1", "11", "5", "15", "10",
  "3", "6", "9", "18", "13", "2", "17", "14", "7", "12", "16", "4", "8",
];

