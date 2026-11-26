/**
 * Os dados da limpeza do desenho técnico da calça jeans — as costas, com o
 * bordado no bolso — em src/assets/desenhos/11.jpeg. O algoritmo está em
 * limpeza-desenho.mjs; aqui está só o que é deste desenho.
 *
 * Coordenadas em pixels de CAIXA_CALCA (o recorte de 400 × 500 do JPEG que
 * contém a calça inteira e nada do conjunto de cima, a não ser a ponta da
 * blusa, que a limpeza descarta por ser um pedaço menor).
 *
 * Os pontos não são estimados: foram lidos num mapa pixel a pixel do JPEG, que
 * marca fundo, azul da legenda, traço escuro e traço claro em cada coluna. Uma
 * regra genérica de "ponte" — achar traço escuro dos dois lados de cada pixel
 * apagado e ligar — foi tentada e não converge: com alcance curto o contorno
 * da perna fica aberto (a faixa da seta tem 7 linhas onde cruza o contorno);
 * com alcance longo ela liga traços que não têm nada a ver (o canto do bolso,
 * o pesponto e o bordado ficam a poucos pixels um do outro) e inventa tinta.
 * Seta nova, ou desenho novo, pede reparo novo lido no mapa — e conferido na
 * lupa do `npm run extract:aplicacoes -- --conferir`.
 */

/** O recorte de src/assets/desenhos/11.jpeg que contém as costas da calça. */
export const CAIXA_CALCA = { left: 985, top: 515, width: 400, height: 500 };

/**
 * As três setas de legenda que entram na peça: o miolo como polilinha e a
 * bolinha da ponta. Saem pela direita até a borda da caixa (o resto delas, e
 * as legendas, estão no fundo e somem com ele).
 */
export const SETAS_CALCA = [
  { nome: "bordado", bolinha: [240.5, 95.5, 4.5], pontos: [[240.5, 95.5], [276, 146.5], [276.5, 147.5], [400, 147.5]] },
  { nome: "denim", bolinha: [281, 212, 3.5], pontos: [[281, 211.5], [400, 211.5]] },
  { nome: "pesponto", bolinha: [334.5, 463.5, 4], pontos: [[334.5, 463.5], [341, 476], [350, 489], [400, 491]] },
];

/**
 * O que as setas cortavam, refeito. Cada `traco` e cada `costura` liga dois
 * pontos visíveis do traço, um de cada lado da faixa apagada; a `borda` é o
 * contorno direito do bordado debaixo da bolinha da seta (à esquerda da linha
 * é bordado, à direita é pano).
 */
export const REPAROS_CALCA = [
  { tipo: "borda", nome: "bordado, borda direita", de: [242.5, 91], ate: [238.5, 100], area: [233, 88, 248, 103] },
  { tipo: "traco", nome: "bolso, contorno", de: [263, 119], ate: [253, 124], raio: 0.55 },
  { tipo: "costura", nome: "bolso, pesponto", de: [261, 115], ate: [251, 120], raio: 0.55, pontos: 2 },
  { tipo: "traco", nome: "perna, seta do bordado", de: [300, 142], ate: [302, 153], raio: 0.55 },
  { tipo: "traco", nome: "perna, seta do denim", de: [315, 207], ate: [316, 216], raio: 0.55 },
  { tipo: "traco", nome: "barra, contorno", de: [326, 468], ate: [346, 464], raio: 0.6 },
  { tipo: "costura", nome: "barra, pesponto duplo", de: [326, 463], ate: [342, 460.5], raio: 0.6, pontos: 3 },
];
