/**
 * Divide as fotos de cada verso do Mood entre as duas margens da Marginália.
 *
 * Por que existe: a ordem da parede (`ordemMood`) alterna foto deitada e foto em
 * pé, e a Marginália mandava as de índice par para a esquerda e as ímpares para a
 * direita. As duas alternâncias se anulavam: no primeiro verso as três deitadas
 * iam para a esquerda e as três em pé para a direita, 731px de fotos contra
 * 1.778px em 2560×1440, e uma tela de parede vazia embaixo da coluna curta.
 *
 * A divisão é exaustiva (2ⁿ, com n = 6 fotos por verso), e não "cada foto na
 * coluna mais curta até ali": essa regra gulosa deixava 519px de diferença no
 * primeiro verso, porque a última foto é alta e não tem para onde ir.
 *
 * Sem nenhum import, de propósito: os testes rodam com `node --test`, sem o Vite.
 */

export interface TelaMargem {
  /** Largura de uma coluna de margem, em px. */
  coluna: number;
  /** Altura da tela, em px (o teto das peças em pé é 70% dela). */
  alturaTela: number;
  /** Vão entre duas fotos da mesma coluna, em px. */
  vao: number;
  /** Quanto a coluna da direita começa mais abaixo, em px. */
  deslocamentoDireita: number;
}

/**
 * A tela da apresentação, 2560×1440, que é onde os buracos apareciam. Os números
 * saem do CSS da Marginália:
 * - `.marginalia` com `min(94vw, 88rem)` = 1408px;
 * - coluna = (1408 − 30rem do verso − 2 × 4rem de vão) / 2 = 400px;
 * - vão entre fotos: `clamp(0.9rem, 2vw, 1.8rem)` = 28,8px;
 * - `padding-top` da margem direita: `clamp(2rem, 6vw, 5rem)` = 80px.
 * Mexeu numa dessas medidas no CSS, muda aqui também.
 */
export const TELA_REFERENCIA_MOOD: TelaMargem = {
  coluna: 400,
  alturaTela: 1440,
  vao: 28.8,
  deslocamentoDireita: 80,
};

/**
 * A altura que a foto vai ter na coluna: a mesma conta do CSS de `.anotacao`
 * (largura dada, com teto de `aspect × 70svh` e nunca mais larga que a coluna).
 * `largura` é a fração da coluna (0,8 a 1).
 */
export function alturaEstimada(
  foto: { aspect: number; largura: number },
  tela: TelaMargem,
): number {
  const largura = Math.min(
    foto.largura * tela.coluna,
    foto.aspect * 0.7 * tela.alturaTela,
    tela.coluna,
  );
  return largura / foto.aspect;
}

function alturaDaColuna(alturas: number[], indices: number[], vao: number, inicio: number): number {
  return indices.reduce((total, i, n) => total + alturas[i] + (n > 0 ? vao : 0), inicio);
}

/**
 * Testa todas as divisões (bit 1 da máscara = direita) e devolve a de menor
 * diferença entre as duas colunas; no empate, a de menor máscara. Os índices
 * saem em ordem crescente, então cada coluna mantém a ordem da parede.
 */
export function dividirMargens(
  alturas: number[],
  tela: Pick<TelaMargem, "vao" | "deslocamentoDireita">,
): { esquerda: number[]; direita: number[] } {
  let melhor = { esquerda: [] as number[], direita: [] as number[] };
  let menorDiferenca = Infinity;
  for (let mascara = 0; mascara < 2 ** alturas.length; mascara++) {
    const esquerda: number[] = [];
    const direita: number[] = [];
    alturas.forEach((_, i) => ((mascara >> i) & 1 ? direita : esquerda).push(i));
    const diferenca = Math.abs(
      alturaDaColuna(alturas, esquerda, tela.vao, 0) -
        alturaDaColuna(alturas, direita, tela.vao, tela.deslocamentoDireita),
    );
    if (diferenca < menorDiferenca) {
      menorDiferenca = diferenca;
      melhor = { esquerda, direita };
    }
  }
  return melhor;
}
