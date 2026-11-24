/**
 * Trechos do conto transcritos das páginas do book (o PDF não tem
 * camada de texto — foram transcritos visualmente das páginas
 * originais). Cada trecho está pareado com a seção que o usa:
 * conceito=vermelho/Resistência (o trecho fala literalmente do avental
 * xadrez da vó), mood=azul/Pertencer, persona=cinza/Fragilidade e
 * trendboard=verde/Jardim.
 *
 * No conceito o trecho é legenda sobreposta na imagem; no mood, na persona
 * e no trendboard ele é peça da composição, dentro de um <FolhaConto> —
 * folha pregada na parede nos dois murais, primeiro painel do lineup no
 * trendboard.
 */

export interface ContoTrecho {
  id: string;
  paragrafos: string[];
}

export const conto: Record<string, ContoTrecho> = {
  conceito: {
    id: "conceito",
    paragrafos: [
      "As costuras tortas dos retalhos que compõem o avental xadrez da vóvó servem de plano de fundo para esse conto: um mosaico de conexões, afetos e dificuldades. Cada retalho carrega um pedaço de memória, cada linha torta revela o gesto apressado de quem costura mais sentimentos que tecidos.",
    ],
  },
  mood: {
    id: "mood",
    paragrafos: [
      "Essa é a história de uma que se multiplicava em três e de três que sempre retornavam à mesma origem. No vaivém do tempo, entre fios e costuras do destino, suas trajetórias se confundiam, se completavam, e se perdiam entre tantas outras.",
    ],
  },
  persona: {
    id: "persona",
    paragrafos: [
      "E a partir da perspectiva de três, uma se constrói. Essa é fiel às memórias de um tempo conturbado e segue se apegando aos detalhes do ritmo inquieto dos dias. Com elas, aprendeu a respirar nos intervalos, saborear as memórias das comidas caseiras e descobriu que até os momentos solitários podem ser tumultuados, porque dentro do seu peito moram muitas.",
      "Levando tudo que pode dentro de si, passa seu tempo colecionando memórias ao lado das pessoas que ama, bordando-se de novas histórias de livros e filmes e permitindo que seus sentimentos transbordem em tudo que faz.",
    ],
  },
  trendboard: {
    id: "trendboard",
    paragrafos: [
      "Havia um brilho nos olhos sempre que observava a mãe se arrumando, o mesmo brilho que retornava ao folhear as fotos de quando ela era mais jovem. Reimaginar o passado torna-se, então, uma forma de costurar sonhos antigos e projetar, no silêncio do presente, tudo aquilo que um dia deseja ser.",
      "Revisitar o que foi deixado é permitir que os sentimentos, amadurecidos pelo tempo, se transformem em peças que exageram em tamanho, cores e padrões, moldadas pelo íntimo que foi sendo tecido numa relação compartilhada. É a partir desse gesto que se ergue a construção de um novo imaginário, vivo, afetivo e profundamente enraizado na memória.",
    ],
  },
};
