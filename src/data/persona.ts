/**
 * Fotos do painel de persona, recortadas do zip de referência
 * "fotos painel persona.zip" por scripts/extract-painel.mjs — o zip traz cada
 * foto centralizada num canvas transparente 2000x1414, o script corta pelo alfa.
 *
 * O 16.png do zip não entra aqui: é o trecho do conto renderizado como imagem,
 * e nesta seção ele vira texto de verdade (conto.persona em src/data/textos.ts,
 * ao lado da mesa, na CaixaFotos).
 *
 * `aspect` é a proporção real do recorte (ver src/assets/persona/manifest.json).
 * `giro` é o ângulo de repouso da foto na parede, em graus — escrito à mão e de
 * propósito irregular: quem larga foto na mesa não alterna ±2,5°. O GSAP nunca
 * escreve nesse valor: ele mora no `.gira`, e a coreografia anima o wrapper.
 */

export interface PersonaFoto {
  /** Nome do arquivo em src/assets/persona, sem extensão. */
  nome: string;
  aspect: number;
  giro: number;
  alt: string;
}

export const persona: PersonaFoto[] = [
  { nome: "1", aspect: 0.845, giro: -2.1, alt: "Fotografia em preto e branco de uma mulher de maiô rodando uma criança pequena pelos braços na beira do mar" },
  { nome: "2", aspect: 0.437, giro: 1.4, alt: "Palavras-cruzadas, lápis e caixa de fósforos sobre uma toalha de mesa xadrez vermelha e branca" },
  { nome: "3", aspect: 0.483, giro: -0.8, alt: "Duas xícaras de café entornadas sobre uma bancada, com o líquido espalhado ao redor" },
  { nome: "4", aspect: 0.63, giro: 2.6, alt: "Mãos idosas trançando um cabelo louro comprido, em preto e branco sobre fundo escuro" },
  { nome: "5", aspect: 1.044, giro: -3.2, alt: "Cadarços cor-de-rosa pendurados numa barra de apoio, contra uma parede de azulejos azuis" },
  { nome: "6", aspect: 0.709, giro: 0.9, alt: "Cachorro preto deitado no retângulo de sol que atravessa o assoalho de madeira" },
  { nome: "7", aspect: 0.674, giro: -1.7, alt: "Retrato sépia antigo de uma mulher com duas crianças no jardim, com os três rostos cobertos por flores brancas coladas" },
  { nome: "8", aspect: 0.238, giro: 2.2, alt: "Carretéis de linha coloridos empilhados, com os rótulos antigos à mostra" },
  { nome: "9", aspect: 0.44, giro: -2.8, alt: "Pernas de alguém apoiadas para cima entre as poltronas vermelhas vazias de um cinema" },
  { nome: "10", aspect: 0.584, giro: 1.1, alt: "Compota de cerejas fervendo numa panela esmaltada, com a colher de pau dentro" },
  { nome: "11", aspect: 2.197, giro: -1.3, alt: "Pia de inox com louça lavada, esponja azul e um prato de flores azuis escorrendo" },
  { nome: "12", aspect: 1.757, giro: 2.8, alt: "Mulher lendo um livro encolhida numa poltrona de estampa miúda, em preto e branco" },
  { nome: "13", aspect: 0.865, giro: -2.4, alt: "Pintura de várias mãos ao redor de uma mesa posta, vistas de cima" },
  { nome: "14", aspect: 0.635, giro: 0.6, alt: "Rosas vermelhas em jarras de porcelana azul e branca sobre um degrau de pedra" },
  { nome: "15", aspect: 1.36, giro: -1.9, alt: "Mãos idosas segurando o retrato antigo de uma mulher jovem, em preto e branco" },
];

/**
 * Ordem da parede: é nesta sequência que as fotos são largadas na mesa (a
 * última da lista é a de cima da pilha, a primeira a cair). Alterna deitadas e
 * em pé para nenhum canto da mesa acumular um formato só.
 */
export const ordemPersona = ["1", "5", "8", "12", "2", "11", "7", "14", "3", "15", "6", "9", "13", "4", "10"];

