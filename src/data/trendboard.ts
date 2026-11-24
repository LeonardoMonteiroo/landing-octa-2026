/**
 * Looks do trendboard, recortados do zip de referência "trend board.zip" por
 * scripts/extract-painel.mjs — o zip traz cada silhueta centralizada num canvas
 * transparente 2000x1414, o script corta pelo alfa.
 *
 * O 16.png do zip não entra aqui: é o trecho do conto renderizado como imagem,
 * e nesta seção ele vira texto de verdade (conto.trendboard em
 * src/data/textos.ts, dentro de um <FolhaConto>). O 3 e o 8 também ficaram
 * fora: eram as duas peças sem corpo (o blazer de retalhos e o busto com a
 * flor), que não pisavam a linha de base do lineup.
 *
 * `altura` é o que faz o lineup ler como gente em pé no mesmo chão: é a altura
 * da peça em % da altura do lineup, escrita à mão — todas as silhuetas são de
 * corpo inteiro e ficam perto de 100. `aspect` é a proporção real do recorte e
 * é o que converte essa altura em largura (ver
 * src/assets/trendboard/manifest.json).
 */

export interface TrendLook {
  /** Nome do arquivo em src/assets/trendboard, sem extensão. */
  nome: string;
  aspect: number;
  /** Altura da peça, em % da altura do lineup. */
  altura: number;
  alt: string;
}

export const trendboard: TrendLook[] = [
  { nome: "1", aspect: 0.352, altura: 100, alt: "Blazer xadrez vinho de ombros largos sobre camisa quadriculada, meia-calça e botas cinza acima do joelho" },
  { nome: "2", aspect: 0.324, altura: 100, alt: "Sobretudo verde-oliva xadrez comprido sobre saia listrada em vermelho e branco" },
  { nome: "4", aspect: 0.572, altura: 100, alt: "Dois modelos de mãos dadas em ternos cinza-claro idênticos, com recortes vazados nas pernas" },
  { nome: "5", aspect: 0.404, altura: 100, alt: "Vestido preto volumoso em camadas de organza, com capa transparente sobre os ombros" },
  { nome: "6", aspect: 0.383, altura: 100, alt: "Look escultural preto com volumes inflados nos ombros e estrutura pontiaguda sobre a cabeça" },
  { nome: "7", aspect: 0.332, altura: 97, alt: "Blusa degradê em amarelo e laranja com franjas de plumas nos braços, sobre calça preta" },
  { nome: "9", aspect: 0.572, altura: 96, alt: "Casaco bege de textura franzida com shorts azul-metálico e sapatos de babado" },
  { nome: "10", aspect: 0.292, altura: 99, alt: "Vestido tomara-que-caia preto com estampa de chamas em cobre e fenda lateral" },
  { nome: "11", aspect: 0.66, altura: 98, alt: "Conjunto cinza de lã com capa estruturada e saia longa drapeada arrastando no chão" },
  { nome: "12", aspect: 0.469, altura: 100, alt: "Sobretudo preto longo com respingos claros e capuz cobrindo a cabeça" },
  { nome: "13", aspect: 0.43, altura: 100, alt: "Vestido vermelho longo com babados volumosos e gola alta franzida" },
  { nome: "14", aspect: 0.323, altura: 100, alt: "Conjunto claro de estampa miúda com gravata-borboleta vermelha e chapéu de papel" },
  { nome: "15", aspect: 0.316, altura: 98, alt: "Blazer bege desestruturado com estampa marrom esfumaçada, calça larga marrom e bolsa amarela" },
];

/**
 * Ordem do lineup: alfaiataria primeiro, depois volume, depois cor, e o preto
 * fecha. É a curadoria de uma passarela, não a ordem dos arquivos.
 */
export const ordemTrendboard = ["1", "2", "15", "14", "4", "11", "9", "7", "10", "13", "5", "6", "12"];
