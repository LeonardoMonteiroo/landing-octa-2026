/**
 * As fotos do "Mapa do desfile", na ordem em que aparecem: todas as fotos disponíveis. Quais aparecem no mural, e onde, é escolha da
 * lista `pendurados` em PainelColecao.astro.
 * O `nome` é o arquivo em src/assets/colecao, sem extensão; a ordem desta lista
 * é a ordem da grade. As fotos vieram prontas, então não há extrator.
 */
export interface FotoColecao {
  nome: string;
  alt: string;
}

export const colecao: FotoColecao[] = [
  { nome: "1", alt: "Na passarela, modelo de casaco longo azul com gola de xadrez cinza e faixas coloridas na frente" },
  { nome: "2", alt: "Nos bastidores, modelo de casaco longo marinho com gola de xadrez cinza, tatuagem no pescoço e batom vermelho" },
  { nome: "3", alt: "Retrato do casaco marinho de gola xadrez cinza, com o quadrado de faixas vermelhas, azuis e verdes na frente" },
  { nome: "4", alt: "Na passarela, modelo de corselete de couro vermelho com tiras e fivelas sobre blusa de tela xadrez, sutiã azul e saia longa cinza" },
  { nome: "5", alt: "Nos bastidores, modelo de corselete de couro vermelho com tiras compridas, blusa de tela xadrez e saia cinza de bainha ampla" },
  { nome: "6", alt: "Retrato do corselete de couro vermelho com fivelas e argolas no colar, sobre o sutiã azul e a saia cinza" },
  { nome: "7", alt: "Na passarela, modelo de corselete vermelho e saia longa cinza-chumbo, com as tiras de couro caindo até o chão" },
  { nome: "8", alt: "Nos bastidores, três modelos lado a lado: conjunto marrom com recortes redondos, casaco marinho e corselete de couro vermelho" },
  { nome: "9", alt: "Os três looks de novo nos bastidores, em outra pose: conjunto marrom, casaco marinho de gola xadrez e corselete vermelho" },
  { nome: "10", alt: "Na passarela, modelo de conjunto bordô com blusa de recortes redondos fechada por fivelas e saia justa, de sapatos vermelhos, sob um lustre dourado" },
  { nome: "11", alt: "Nos bastidores, modelo de conjunto marrom com blusa de recortes redondos e fivelas e saia de abertura lateral, de cabelo cacheado e batom vermelho" },
];
