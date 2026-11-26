/**
 * Limpa um desenho técnico exportado do book: tira o fundo cinza da prancha e
 * as setas de legenda (azul-marinho), e refaz o traço que cada seta cortava.
 *
 * Função pura: recebe os pixels (RGB, 3 canais) e devolve o cinza limpo e o
 * alfa da peça, sem ler nem gravar arquivo. Quem lê o JPEG, vetoriza e grava é
 * scripts/extract-aplicacoes.mjs; os dados de cada desenho (onde estão as
 * setas, o que refazer) ficam ao lado, em desenho-calca.mjs.
 *
 * O caminho, na ordem:
 *  1. marcarAnotacao — o azul das legendas, mais a faixa de cada seta e a
 *     bolinha da ponta (a seta sai neutra em alguns pixels do JPEG, e só a
 *     faixa declarada pega esses);
 *  2. inundarDaBorda — o cinza da prancha alcançado a partir da borda, sem
 *     atravessar a anotação (por ela o fundo cavaria um sulco na peça);
 *  3. votarForaDentro — cada pixel apagado vira fundo ou peça pela maioria dos
 *     vizinhos não apagados;
 *  4. maiorComponente — a peça é o maior pedaço que sobrou;
 *  5. preencherPorMediana — o apagado dentro da peça vira o que está em volta;
 *  6. aplicarReparos — o traço cortado pela seta, refeito por coordenada;
 *  7. fecharSilhueta — o que o contorno preto fecha; se o fundo vazar para
 *     dentro, algum contorno ficou aberto, e isso é erro;
 *  8. enquadrar — o retângulo da peça, com margem.
 */

/** Azul da legenda: o azul passa do vermelho por pelo menos isto (o traço da peça é neutro). */
const AZUL_MINIMO = 7;
/** Acima desta luminância o pixel é pano claro, mesmo com tom azulado do JPEG. */
const LUM_MAXIMA_ANOTACAO = 215;
/** O halo do JPEG em volta da legenda chega a 2px; a anotação é dilatada por isso. */
const DILATACAO_ANOTACAO = 2;
/** Meia largura da faixa apagada em volta do miolo de cada seta, em px. */
const LARGURA_SETA = 2.5;
/** Raio da vizinhança que decide se um pixel apagado é fundo ou peça. */
const RAIO_VOTO = 4;
/** O cinza da prancha (fundo) e a tolerância de cada canal. */
const CINZA_PRANCHA = [195, 196, 191];
const TOLERANCIA_PRANCHA = 22;
/** A partir deste valor o pixel limpo é pano (passa o fundo); abaixo, é traço (barra). */
const CORTE_BRANCO = 215;
/** Fração da peça que o fundo pode alcançar no fechamento antes de ser falha de contorno. */
const VAZAMENTO_MAXIMO = 0.02;
/** Margem do enquadramento em volta da peça, em px. */
const MARGEM_CORTE = 2;
/** Tom do traço refeito (o preto do contorno no JPEG fica entre 40 e 50). */
const TINTA_TRACO = 40;
/** Tom do ponto de costura refeito: mais claro que o contorno, como no original. */
const TINTA_COSTURA = 125;
/** Largura da borda suavizada do traço refeito, em px. */
const SUAVE = 0.8;
/** Comprimento de cada ponto de costura, em fração do passo entre pontos. */
const PONTO_DO_PASSO = 0.45;
/** Tons do bordado refeito debaixo da bolinha da seta. */
const TINTA_BORDADO = 8;

/**
 * Distância do ponto (px, py) ao segmento de `de` a `ate`, e o parâmetro t
 * (0 a 1) do ponto mais perto no segmento.
 * @param {number} px
 * @param {number} py
 * @param {[number, number]} de
 * @param {[number, number]} ate
 * @returns {{ d: number, t: number }}
 */
export function distanciaAoSegmento(px, py, [ax, ay], [bx, by]) {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return { d: Math.hypot(px - (ax + t * vx), py - (ay + t * vy)), t };
}

/**
 * @typedef {{ nome: string, bolinha: [number, number, number], pontos: [number, number][] }} Seta
 * @typedef {{ tipo: "traco", nome: string, de: [number, number], ate: [number, number], raio: number }
 *   | { tipo: "costura", nome: string, de: [number, number], ate: [number, number], raio: number, pontos: number }
 *   | { tipo: "borda", nome?: string, de: [number, number], ate: [number, number], area: [number, number, number, number] }} Reparo
 */

/**
 * @param {{ rgb: Uint8Array, largura: number, altura: number, setas: Seta[], reparos: Reparo[] }} entrada
 * @returns {{ cinza: Uint8Array, alfa: Uint8Array, corte: { left: number, top: number, width: number, height: number } }}
 */
export function limparDesenho({ rgb, largura, altura, setas, reparos }) {
  const img = imagem(rgb, largura, altura);
  const apagar = marcarAnotacao(img, setas);
  const fora = inundarDaBorda(img, (i) => img.prancha(i) && !apagar[i]);
  votarForaDentro(img, apagar, fora);
  const peca = maiorComponente(img, (i) => !fora[i]);
  const cinza = preencherPorMediana(img, peca, apagar);
  aplicarReparos(img, cinza, apagar, reparos);
  const alfa = fecharSilhueta(img, cinza, peca);
  return { cinza, alfa, corte: enquadrar(img, alfa) };
}

function imagem(rgb, largura, altura) {
  const n = largura * altura;
  const lum = (i) => (rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2]) / 3;
  const prancha = (i) =>
    Math.abs(rgb[i * 3] - CINZA_PRANCHA[0]) < TOLERANCIA_PRANCHA &&
    Math.abs(rgb[i * 3 + 1] - CINZA_PRANCHA[1]) < TOLERANCIA_PRANCHA &&
    Math.abs(rgb[i * 3 + 2] - CINZA_PRANCHA[2]) < TOLERANCIA_PRANCHA;
  const azul = (i) => rgb[i * 3 + 2] - rgb[i * 3] >= AZUL_MINIMO && lum(i) < LUM_MAXIMA_ANOTACAO;
  return { rgb, largura, altura, n, lum, prancha, azul };
}

/** Os quatro vizinhos de i dentro da imagem. */
function vizinhos4(img, i) {
  const x = i % img.largura, y = (i / img.largura) | 0;
  const v = [];
  if (x > 0) v.push(i - 1);
  if (x < img.largura - 1) v.push(i + 1);
  if (y > 0) v.push(i - img.largura);
  if (y < img.altura - 1) v.push(i + img.largura);
  return v;
}

function marcarAnotacao(img, setas) {
  const { largura: W, altura: H } = img;
  const apagar = new Uint8Array(img.n);
  const D = DILATACAO_ANOTACAO;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!img.azul(y * W + x)) continue;
      for (let dy = -D; dy <= D; dy++)
        for (let dx = -D; dx <= D; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) apagar[yy * W + xx] = 1;
        }
    }
  for (const seta of setas) {
    const [cx, cy, cr] = seta.bolinha;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (Math.hypot(x - cx, y - cy) <= cr) apagar[i] = 1;
        for (let k = 0; k < seta.pontos.length - 1; k++)
          if (distanciaAoSegmento(x, y, seta.pontos[k], seta.pontos[k + 1]).d <= LARGURA_SETA) apagar[i] = 1;
      }
  }
  return apagar;
}

/** Preenche a partir da borda da imagem por onde `podePassar` deixa (4-vizinhos). */
function inundarDaBorda(img, podePassar) {
  const { largura: W, altura: H } = img;
  const marcado = new Uint8Array(img.n);
  const fila = [];
  for (let x = 0; x < W; x++) fila.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1);
  while (fila.length) {
    const i = fila.pop();
    if (marcado[i] || !podePassar(i)) continue;
    marcado[i] = 1;
    fila.push(...vizinhos4(img, i));
  }
  return marcado;
}

function votarForaDentro(img, apagar, fora) {
  const { largura: W, altura: H } = img;
  for (let i = 0; i < img.n; i++) {
    if (!apagar[i]) continue;
    const x = i % W, y = (i / W) | 0;
    let foraN = 0, dentroN = 0;
    for (let dy = -RAIO_VOTO; dy <= RAIO_VOTO; dy++)
      for (let dx = -RAIO_VOTO; dx <= RAIO_VOTO; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (apagar[j]) continue;
        if (fora[j]) foraN++;
        else dentroN++;
      }
    if (foraN > dentroN) fora[i] = 1;
  }
}

/** O maior componente 4-conexo dos pixels em que `pertence` é verdade. */
function maiorComponente(img, pertence) {
  const rotulo = new Int32Array(img.n).fill(-1);
  const tamanhos = [];
  for (let s = 0; s < img.n; s++) {
    if (!pertence(s) || rotulo[s] >= 0) continue;
    const id = tamanhos.length;
    let tamanho = 0;
    const pilha = [s];
    rotulo[s] = id;
    while (pilha.length) {
      const i = pilha.pop();
      tamanho++;
      for (const j of vizinhos4(img, i))
        if (pertence(j) && rotulo[j] < 0) {
          rotulo[j] = id;
          pilha.push(j);
        }
    }
    tamanhos.push(tamanho);
  }
  const maior = tamanhos.indexOf(Math.max(...tamanhos));
  const comp = new Uint8Array(img.n);
  for (let i = 0; i < img.n; i++) if (rotulo[i] === maior) comp[i] = 1;
  return comp;
}

/**
 * O apagado dentro da peça é preenchido pela mediana dos vizinhos conhecidos,
 * de fora para dentro. Mediana, não média: a média inventa cinza entre o traço
 * e o pano, e o cinza vira mancha preta no limiar do vetor.
 */
function preencherPorMediana(img, peca, apagar) {
  const { largura: W, altura: H } = img;
  const cinza = new Uint8Array(img.n).fill(255);
  const conhecido = new Uint8Array(img.n);
  let pendentes = [];
  for (let i = 0; i < img.n; i++) {
    if (!peca[i]) continue;
    if (apagar[i]) pendentes.push(i);
    else {
      cinza[i] = Math.round(img.lum(i));
      conhecido[i] = 1;
    }
  }
  while (pendentes.length) {
    const resolvidos = [];
    const resto = [];
    for (const i of pendentes) {
      const x = i % W, y = (i / W) | 0;
      const viz = [];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (conhecido[j]) viz.push(cinza[j]);
        }
      if (viz.length >= 3) resolvidos.push([i, viz.sort((a, c) => a - c)[viz.length >> 1]]);
      else resto.push(i);
    }
    if (!resolvidos.length) break;
    for (const [i, v] of resolvidos) {
      cinza[i] = v;
      conhecido[i] = 1;
    }
    pendentes = resto;
  }
  return cinza;
}

/** Pinta um segmento com borda suavizada, escurecendo (nunca clareando) o que já há. */
function pintarSegmento(img, cinza, de, ate, raio, tom) {
  const { largura: W, altura: H } = img;
  const x0 = Math.max(0, Math.floor(Math.min(de[0], ate[0]) - raio - 2));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(de[0], ate[0]) + raio + 2));
  const y0 = Math.max(0, Math.floor(Math.min(de[1], ate[1]) - raio - 2));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(de[1], ate[1]) + raio + 2));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const { d } = distanciaAoSegmento(x, y, de, ate);
      if (d > raio + SUAVE) continue;
      const v = d <= raio ? tom : tom + ((255 - tom) * (d - raio)) / SUAVE;
      const i = y * W + x;
      cinza[i] = Math.min(cinza[i], Math.round(v));
    }
}

/**
 * `traco`: segmento contínuo. `costura`: pontos igualmente espaçados, os das
 * pontas caindo nos pontos visíveis. `borda`: dentro de `area`, o apagado à
 * esquerda da linha (no sentido de `de` para `ate`) vira bordado e o da direita
 * vira pano.
 */
function aplicarReparos(img, cinza, apagar, reparos) {
  const W = img.largura;
  for (const rep of reparos) {
    if (rep.tipo === "traco") pintarSegmento(img, cinza, rep.de, rep.ate, rep.raio, TINTA_TRACO);
    else if (rep.tipo === "costura") {
      const [ax, ay] = rep.de, [bx, by] = rep.ate;
      const comp = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / comp, uy = (by - ay) / comp;
      const passo = comp / rep.pontos;
      const meio = (passo * PONTO_DO_PASSO) / 2;
      for (let k = 0; k <= rep.pontos; k++) {
        const cx = ax + ux * passo * k, cy = ay + uy * passo * k;
        pintarSegmento(img, cinza, [cx - ux * meio, cy - uy * meio], [cx + ux * meio, cy + uy * meio], rep.raio, TINTA_COSTURA);
      }
    } else if (rep.tipo === "borda") {
      const [ax, ay] = rep.de, [bx, by] = rep.ate;
      const comp = Math.hypot(bx - ax, by - ay);
      const nx = (by - ay) / comp, ny = -(bx - ax) / comp; // aponta para fora do bordado
      const [x0, y0, x1, y1] = rep.area;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const i = y * W + x;
          if (!apagar[i]) continue;
          const s = (x - ax) * nx + (y - ay) * ny;
          cinza[i] = s <= -0.5 ? TINTA_BORDADO : s >= 0.5 ? 255 : Math.round(TINTA_BORDADO + (255 - TINTA_BORDADO) * (s + 0.5));
        }
    } else throw new Error(`limparDesenho: reparo de tipo desconhecido "${rep.tipo}"`);
  }
}

/**
 * A silhueta é o que o contorno preto fecha. O fundo é preenchido de novo,
 * agora sobre a imagem limpa: se alcançar mais que VAZAMENTO_MAXIMO da peça,
 * algum contorno cortado pela seta ficou sem reparo. Ilhas soltas (resto de
 * letra de legenda) ficam de fora.
 */
function fecharSilhueta(img, cinza, peca) {
  const fora = inundarDaBorda(img, (i) => cinza[i] >= CORTE_BRANCO);
  let total = 0, vazou = 0;
  for (let i = 0; i < img.n; i++)
    if (peca[i]) {
      total++;
      if (fora[i]) vazou++;
    }
  if (vazou > total * VAZAMENTO_MAXIMO)
    throw new Error(`limparDesenho: o fundo vazou para dentro da peça (${vazou} de ${total} px) — falta reparo em algum contorno cortado por seta`);
  const dentro = maiorComponente(img, (i) => !fora[i]);
  const alfa = new Uint8Array(img.n);
  for (let i = 0; i < img.n; i++) {
    if (dentro[i]) alfa[i] = 255;
    else cinza[i] = 255;
  }
  return alfa;
}

function enquadrar(img, alfa) {
  const W = img.largura;
  let x0 = img.largura, y0 = img.altura, x1 = 0, y1 = 0;
  for (let i = 0; i < img.n; i++)
    if (alfa[i]) {
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  x0 = Math.max(0, x0 - MARGEM_CORTE);
  y0 = Math.max(0, y0 - MARGEM_CORTE);
  x1 = Math.min(img.largura - 1, x1 + MARGEM_CORTE);
  y1 = Math.min(img.altura - 1, y1 + MARGEM_CORTE);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
