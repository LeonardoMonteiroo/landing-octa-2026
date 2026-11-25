/**
 * Qual ficha da materioteca manda na amostra grande.
 *
 * O `IntersectionObserver` da materioteca só avisa quando uma ficha **cruza** a
 * linha de leitura. Depois de um salto (âncora do sumário, `End`, roda pesada) a
 * linha pode cair fora de todas as fichas, ou no vão entre a última e os
 * aviamentos, e nenhuma ficha avisa nada: a amostra grande ficava presa na
 * anterior (a sarja ao lado da ficha do denim). A escolha passa a ser pela ficha
 * mais perto da linha, medida na hora, e não pela que avisou.
 *
 * Sem nenhum import: os testes rodam com `node --test`, sem o Vite.
 */
export function fichaMaisPerto(caixas: { top: number; bottom: number }[], linha: number): number {
  let melhor = 0;
  let menorDistancia = Infinity;
  for (const [i, caixa] of caixas.entries()) {
    if (linha >= caixa.top && linha < caixa.bottom) return i;
    const distancia = linha < caixa.top ? caixa.top - linha : linha - caixa.bottom;
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = i;
    }
  }
  return melhor;
}
