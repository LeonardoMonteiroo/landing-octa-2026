#!/usr/bin/env node
/**
 * Extrai a geometria da seção "Cores e Harmonias" de reference/cores/ para
 * src/data/formas-cores.ts.
 *
 * O material de origem são dez SVGs de exportação do Canva, todos numa
 * página A4 deitada (842×595) com a arte solta no meio:
 *  - novelo-para-cores.svg — o novelo redondo com o fio saindo e a barra de
 *    cor. Uma cor só (#2c384f). É a peça que a cartela repete seis vezes.
 *  - 9, 10, 11, 12.svg — as quatro harmonias de duas cores.
 *  - 5, 6, 7, 8.svg — as quatro harmonias de três cores.
 *    Cada cor dessas oito é uma *meada* (o novelo em forma de osso, não o
 *    redondo) desenhada em duas cores: o corpo num tom claro e o fio solto
 *    no tom base da cartela.
 *  - referencia-cores.svg — a prancha inteira da cartela, com nomes e
 *    códigos TCX. Serve de referência visual; o texto está em src/data/cores.ts.
 *
 * As vinte meadas das oito harmonias são a *mesma* forma girada e reposicionada
 * à mão, mas exportada com a rotação assada nas coordenadas — vinte cópias de
 * ~41 KB de path, 1,05 MB somados. Como o CLAUDE.md já avisa que SVG inline é o
 * maior peso da página, extraímos a forma **uma vez** e medimos onde e quanto
 * cada cópia foi girada; o componente remonta as harmonias com <use> + rotate.
 * Fica ~48 KB no lugar de 1,05 MB, e as harmonias passam a ser dados.
 *
 * Como o giro é medido: a rotação não está escrita em lugar nenhum, e não dá
 * para tirar de correspondência ponto a ponto — o exportador re-emitiu a
 * geometria em cada cópia, reordenando os subpaths e até mudando o número de
 * pontos (918 numa, 919 noutra). O que sobrevive a isso é a distribuição: a
 * assinatura angular do corpo em volta do próprio centróide só se desloca
 * quando a forma gira, então a correlação cruzada circular das duas assinaturas
 * tem o pico no giro. Metade das meadas também está espelhada, e as duas
 * variantes são testadas.
 *
 * A autoverificação é a altura do pico (0..1): o script quebra abaixo de 0,9.
 * Hoje as vinte ficam entre 0,974 e 1,000. Duas confirmações independentes: a
 * escala medida é idêntica entre as meadas de um mesmo arquivo (a composição
 * foi escalada inteira), e `--conferir` remonta cada harmonia a partir dos
 * dados gerados, para comparar com o original olhando o pixel.
 *
 * (Duas tentativas anteriores não serviram, e pelo mesmo motivo: casar path por
 * índice e rodar Procrustes só fecha quando o giro é zero; ordenar os pontos em
 * ângulo para achar o deslocamento cíclico não sobrevive ao reordenamento.)
 *
 * Uso: node scripts/extract-cores.mjs [--conferir]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const REF = resolve(root, "reference/cores");
const OUT = resolve(root, "src/data/formas-cores.ts");

/** A forma de referência das harmonias: a meada vinho de 9.svg. */
const MEADA_FONTE = { arquivo: "9.svg", corpo: "#672e33", fio: "#3f0f13" };

/** O novelo redondo da cartela. Uma cor só; a barra é HTML, não vem daqui. */
const NOVELO_FONTE = { arquivo: "novelo-para-cores.svg", cor: "#2c384f" };

/**
 * Corpo -> fio de cada cor, como o Canva exportou. O corpo é um tom mais claro
 * que o da cartela; guardamos os dois porque a relação não é uma formula só
 * (o preto da Ruptura, por exemplo, saiu #313131 numa harmonia e #2f2f2f na
 * outra). A chave é o nome que src/data/cores.ts usa.
 */
const POR_CORPO = {
  "#672e33": "resistencia",
  "#5a3834": "resistencia", // 6.svg, ao lado do preto, saiu num vinho mais fechado
  "#32466c": "pertencer",
  "#d9b668": "ninho",
  "#606147": "jardim",
  "#969791": "fragilidade",
  "#313131": "ruptura",
  "#2f2f2f": "ruptura",
};

/**
 * Fio -> cor. São os tons base da cartela, os mesmos de referencia-cores.svg.
 * Mapear explícito em vez de deduzir por sobreposição de caixas: com três
 * meadas empilhadas as caixas se cruzam todas, e o fio de uma seria atribuído
 * à outra sem ninguém reclamar.
 */
const POR_FIO = {
  "#3f0f13": "resistencia",
  "#2c384f": "pertencer",
  "#c19e51": "ninho",
  "#424327": "jardim",
  "#878881": "fragilidade",
  "#000000": "ruptura",
  "#040606": "ruptura",
};

const HARMONIAS = ["9.svg", "10.svg", "11.svg", "12.svg", "5.svg", "6.svg", "7.svg", "8.svg"];

/** Fundos da página A4: não são arte. */
const IGNORAR = new Set(["#ffffff", "none"]);

/**
 * Achata o SVG numa lista de paths com a translação do grupo já aplicada.
 * Todos os transforms desses arquivos são matrix(1,0,0,1,tx,ty) — translação
 * pura — então uma pilha de somas resolve; se aparecer uma matriz com escala
 * ou rotação a gente quebra em vez de desenhar errado.
 */
function achatar(svg, { manterFundo = false } = {}) {
  const paths = [];
  const pilha = [{ tx: 0, ty: 0 }];
  const re = /<g\b([^>]*)>|<\/g>|<path\b([^>]*)\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    if (m[0] === "</g>") {
      if (pilha.length > 1) pilha.pop();
      continue;
    }
    const topo = pilha[pilha.length - 1];
    if (m[1] !== undefined) {
      const mat = /transform="matrix\(([^)]*)\)"/.exec(m[1]);
      if (!mat) {
        pilha.push(topo);
        continue;
      }
      const [a, b, c, d, e, f] = mat[1].split(",").map(Number);
      if (a !== 1 || d !== 1 || b !== 0 || c !== 0) {
        throw new Error(`extract-cores: matrix(${mat[1]}) não é translação pura`);
      }
      pilha.push({ tx: topo.tx + e, ty: topo.ty + f });
      continue;
    }
    const fill = /fill="([^"]*)"/.exec(m[2])?.[1] ?? "none";
    const d = /\bd="([^"]*)"/.exec(m[2])?.[1];
    if (d) paths.push({ fill, d, tx: topo.tx, ty: topo.ty });
  }
  return manterFundo ? paths : paths.filter((p) => !IGNORAR.has(p.fill));
}

/**
 * Pontos absolutos de um path. Os dez arquivos só usam M/L/C/Z — comandos
 * absolutos, todos em pares de coordenadas — então basta parear os números na
 * ordem. O script valida isso antes de confiar no pareamento.
 */
function pontos({ d, tx, ty }) {
  const comandos = new Set(d.match(/[A-Za-z]/g) ?? []);
  for (const c of comandos) {
    if (!"MLCZ".includes(c)) {
      throw new Error(`extract-cores: comando "${c}" fora de MLCZ — o pareamento de coordenadas não vale`);
    }
  }
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const out = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i] + tx, nums[i + 1] + ty]);
  return out;
}

function caixa(pts) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function centro(pts) {
  let sx = 0,
    sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return [sx / pts.length, sy / pts.length];
}

/** Uma meada medida: as camadas na ordem de pintura, com o fio na frente. */
function medirMeada(paths, corpo, fio) {
  const doCorpo = paths.filter((p) => p.fill === corpo);
  const doFio = paths.filter((p) => p.fill === fio);
  if (!doCorpo.length) throw new Error(`extract-cores: nenhum path com corpo ${corpo}`);
  if (!doFio.length) throw new Error(`extract-cores: nenhum path com fio ${fio}`);
  const camadas = [...doFio, ...doCorpo];
  const todos = camadas.flatMap(pontos);
  // A medição olha só o corpo. O fio solto é leve mas fica longe do centróide,
  // e a assinatura pesa pelo raio: incluí-lo derrubava o escore de 0,99 para
  // 0,79, porque a curva do fio foi ajustada à mão em cada cópia e não
  // acompanha o corpo rigidamente. Para desenhar ele vem junto; para medir, não.
  const ptsCorpo = doCorpo.flatMap(pontos);
  const [cx, cy] = centro(ptsCorpo);
  return { camadas, cx, cy, caixa: caixa(todos), assinatura: assinatura(ptsCorpo) };
}

/** Bins da assinatura angular. 1440 dá resolução de 0,25°. */
const BINS = 1440;

/**
 * Assinatura angular da nuvem: centróide, raio RMS e um histograma de massa por
 * ângulo em volta do centróide, normalizado. Girar a forma desloca o histograma
 * ciclicamente sem mudar mais nada; o centróide e o raio RMS nem se mexem. É
 * disso que saem giro, escala e posição.
 *
 * A massa de cada ponto é o raio, e não 1: pesa mais o que está longe do centro,
 * que é justamente onde o ângulo é bem definido. Cada ponto é repartido entre os
 * dois bins vizinhos, para a assinatura não andar em degraus de um bin.
 */
function assinatura(pts) {
  const [cx, cy] = centro(pts);
  const hist = new Float64Array(BINS);
  let somaR2 = 0;
  for (const [x, y] of pts) {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    somaR2 += r * r;
    const pos = (((Math.atan2(dy, dx) / (2 * Math.PI)) % 1) + 1) * BINS;
    const i = Math.floor(pos) % BINS;
    const f = pos - Math.floor(pos);
    hist[i] += r * (1 - f);
    hist[(i + 1) % BINS] += r * f;
  }
  // Normaliza: assim o escore de correlação não depende do tamanho da nuvem.
  let norma = 0;
  for (const v of hist) norma += v * v;
  norma = Math.sqrt(norma) || 1;
  for (let i = 0; i < BINS; i++) hist[i] /= norma;
  return { centro: [cx, cy], raio: Math.sqrt(somaR2 / pts.length), hist };
}

/**
 * Giro, escala e posição de uma cópia em relação à forma de referência.
 *
 * Não há correspondência ponto a ponto de que dê para tirar isso: as vinte
 * meadas saíram do mesmo desenho, mas o exportador re-emitiu a geometria em cada
 * uma — os subpaths mudam de ordem com a rotação e até o número de pontos varia
 * (918 numa, 919 noutra). Duas tentativas anteriores morreram aí: casar path por
 * índice só funciona quando o giro é zero, e ordenar os pontos em ângulo para
 * achar o deslocamento cíclico não sobrevive ao reordenamento.
 *
 * O que sobrevive é a distribuição. A correlação cruzada circular das duas
 * assinaturas angulares tem o pico no giro, e o valor do pico (0..1) diz se as
 * duas formas são mesmo a mesma — é a autoverificação do método. O pico ainda
 * ganha uma interpolação parabólica com os bins vizinhos, o que leva a precisão
 * de 0,25° para bem abaixo disso.
 *
 * O eixo y do SVG aponta para baixo e o rotate() do SVG gira no mesmo sentido
 * nesse eixo, então o giro vai direto para o transform, sem troca de sinal.
 */
/** Reflete a assinatura em torno do eixo x: φ → −φ. */
function refletir(hist) {
  const out = new Float64Array(BINS);
  for (let i = 0; i < BINS; i++) out[(BINS - i) % BINS] = hist[i];
  return out;
}

/** Melhor deslocamento circular de A sobre B, com interpolação no pico. */
function correlacionar(A, B) {
  const escore = new Float64Array(BINS);
  let melhorK = 0;
  for (let k = 0; k < BINS; k++) {
    let s = 0;
    for (let i = 0; i < BINS; i++) s += A[i] * B[(i + k) % BINS];
    escore[k] = s;
    if (s > escore[melhorK]) melhorK = k;
  }
  // Interpolação parabólica: o máximo verdadeiro quase nunca cai no centro de
  // um bin.
  const y0 = escore[(melhorK - 1 + BINS) % BINS];
  const y1 = escore[melhorK];
  const y2 = escore[(melhorK + 1) % BINS];
  const denom = y0 - 2 * y1 + y2;
  const fino = denom === 0 ? 0 : (0.5 * (y0 - y2)) / denom;
  return { giro: (((melhorK + fino) / BINS) * 360 + 360) % 360, escore: y1 };
}

function giroRelativo(ref, copia) {
  const A = ref.assinatura;
  const B = copia.assinatura;
  // Metade das vinte meadas foi espelhada antes de ser girada — é o que faz o
  // fio solto sair ora de um lado, ora do outro. Sem testar as duas variantes o
  // escore empaca em 0,63 e o giro sai errado.
  const direta = { ...correlacionar(A.hist, B.hist), espelho: false };
  const espelhada = { ...correlacionar(refletir(A.hist), B.hist), espelho: true };
  const melhor = espelhada.escore > direta.escore ? espelhada : direta;

  const escala = B.raio / A.raio;
  const rad = (melhor.giro * Math.PI) / 180;
  // p ↦ s·R(θ)·M·(p − centróide da referência) + centróide da cópia,
  // com M = diag(1, −1) quando espelhada.
  const my = melhor.espelho ? -1 : 1;
  const cos = Math.cos(rad) * escala;
  const sen = Math.sin(rad) * escala;
  const [rx, ry] = A.centro;
  const [qx, qy] = B.centro;
  return {
    giro: melhor.giro,
    escala,
    espelho: melhor.espelho,
    /** Altura do pico de correlação, 0..1. Perto de 1 = é a mesma forma. */
    escore: melhor.escore,
    levar: ([px, py]) => {
      const p = [px - rx, (py - ry) * my];
      return [p[0] * cos - p[1] * sen + qx, p[0] * sen + p[1] * cos + qy];
    },
  };
}

const arredonda = (n, casas = 2) => Number(n.toFixed(casas));

// ── A meada de referência ────────────────────────────────────────────────────
const svgMeada = readFileSync(resolve(REF, MEADA_FONTE.arquivo), "utf8");
const ref = medirMeada(achatar(svgMeada), MEADA_FONTE.corpo, MEADA_FONTE.fio);

// Encosta a forma no canto do próprio viewBox — o A4 de origem é quase todo
// espaço vazio, e o <use> posiciona a partir daqui.
const meadaDx = -ref.caixa.x0;
const meadaDy = -ref.caixa.y0;
/** Pivô: o centróide da forma. Fica dentro dela e não depende de camada nenhuma. */
const pivoRef = [ref.cx, ref.cy];
const meada = {
  largura: arredonda(ref.caixa.w),
  altura: arredonda(ref.caixa.h),
  // O pivô dentro do viewBox: é o centro do rotate() e o ponto que o componente
  // leva até a posição de cada cópia.
  pivo: [arredonda(pivoRef[0] + meadaDx), arredonda(pivoRef[1] + meadaDy)],
  camadas: ref.camadas.map((p) => ({
    papel: p.fill === MEADA_FONTE.fio ? "fio" : "corpo",
    // A translação do grupo e o recorte do viewBox entram como um translate só,
    // no <g> de fora: reescrever milhares de coordenadas para economizar um
    // transform seria trocar precisão por nada.
    dx: arredonda(p.tx + meadaDx, 4),
    dy: arredonda(p.ty + meadaDy, 4),
    d: p.d.trim(),
  })),
};

// ── O novelo redondo da cartela ──────────────────────────────────────────────
const svgNovelo = readFileSync(resolve(REF, NOVELO_FONTE.arquivo), "utf8");
const todosNovelo = achatar(svgNovelo, { manterFundo: true });
const pathsNovelo = todosNovelo.filter((p) => p.fill === NOVELO_FONTE.cor);
// A barra de cor também é #2c384f, mas é um retângulo — e vira HTML no
// componente, porque é ela que carrega o nome e o código TCX. Fora daqui:
// é o único path do arquivo feito só de M/L/Z.
const soRetas = (d) => !/C/.test(d);
const retangulos = pathsNovelo.filter((p) => soRetas(p.d));
const arte = pathsNovelo.filter((p) => !soRetas(p.d));
if (retangulos.length !== 1) {
  throw new Error(`extract-cores: esperava 1 retângulo de barra, achei ${retangulos.length}`);
}
const caixaNovelo = caixa(arte.flatMap(pontos));
const caixaBarra = caixa(pontos(retangulos[0]));

// O disco branco entre o novelo e a barra: no original é o que abre a folga
// redonda na ponta da barra, e o componente refaz isso com uma máscara. É o
// único path branco do arquivo que não é fundo de página inteira — e é
// quadrado, com o círculo inscrito.
const discos = todosNovelo.filter(
  (p) => p.fill === "#ffffff" && Math.abs(caixa(pontos(p)).w - caixa(pontos(p)).h) < 1 && caixa(pontos(p)).w < 200,
);
if (discos.length !== 1) {
  throw new Error(`extract-cores: esperava 1 disco de folga, achei ${discos.length}`);
}
const caixaDisco = caixa(pontos(discos[0]));

/** Coordenadas relativas ao canto do viewBox recortado do novelo. */
const noNovelo = (x, y) => [arredonda(x - caixaNovelo.x0), arredonda(y - caixaNovelo.y0)];
const novelo = {
  largura: arredonda(caixaNovelo.w),
  altura: arredonda(caixaNovelo.h),
  /**
   * Onde a barra de cor encosta, no sistema do viewBox. O componente desenha a
   * barra em HTML a partir daqui, para ela poder crescer com a página e levar
   * o nome e o código dentro.
   */
  barra: {
    x: noNovelo(caixaBarra.x0, 0)[0],
    y: noNovelo(0, caixaBarra.y0)[1],
    altura: arredonda(caixaBarra.h),
  },
  /** Círculo de folga entre o novelo e a barra, para a máscara da barra. */
  disco: {
    cx: noNovelo((caixaDisco.x0 + caixaDisco.x1) / 2, 0)[0],
    cy: noNovelo(0, (caixaDisco.y0 + caixaDisco.y1) / 2)[1],
    r: arredonda(caixaDisco.w / 2),
  },
  camadas: arte.map((p) => ({
    dx: arredonda(p.tx - caixaNovelo.x0, 4),
    dy: arredonda(p.ty - caixaNovelo.y0, 4),
    d: p.d.trim(),
  })),
};

// ── As oito harmonias ────────────────────────────────────────────────────────
const harmonias = HARMONIAS.map((arquivo) => {
  const paths = achatar(readFileSync(resolve(REF, arquivo), "utf8"));

  // Toda cor do arquivo tem que ser corpo ou fio de alguém. Sem esta conferência
  // uma meada some sem aviso: em 6.svg o vinho saiu num tom que não estava no
  // mapa, e a harmonia virou dupla em vez de trio — o erro só apareceu no
  // render da conferência.
  const desconhecidas = [...new Set(paths.map((p) => p.fill))].filter((f) => !POR_CORPO[f] && !POR_FIO[f]);
  if (desconhecidas.length) {
    throw new Error(`extract-cores: ${arquivo} tem cor fora do mapa: ${desconhecidas.join(", ")}`);
  }

  // Ordem do documento = ordem de pintura: a última cor fica por cima.
  const corpos = [];
  for (const p of paths) {
    if (POR_CORPO[p.fill] && !corpos.includes(p.fill)) corpos.push(p.fill);
  }

  const medidas = corpos.map((corpo) => {
    const nome = POR_CORPO[corpo];
    const fio = Object.keys(POR_FIO).find((f) => POR_FIO[f] === nome && paths.some((p) => p.fill === f));
    if (!fio) throw new Error(`extract-cores: ${arquivo} — não achei o fio da meada ${nome}`);
    const m = medirMeada(paths, corpo, fio);
    const ajuste = giroRelativo(ref, m);
    return { nome, m, ajuste, centro: ajuste.levar(pivoRef) };
  });

  const uniao = caixa(medidas.flatMap(({ m }) => [
    [m.caixa.x0, m.caixa.y0],
    [m.caixa.x1, m.caixa.y1],
  ]));

  return {
    arquivo,
    largura: arredonda(uniao.w),
    altura: arredonda(uniao.h),
    meadas: medidas.map(({ nome, ajuste, centro: c }) => ({
      cor: nome,
      // Onde o pivô da forma cai, relativo ao canto da união das caixas.
      cx: arredonda(c[0] - uniao.x0),
      cy: arredonda(c[1] - uniao.y0),
      giro: arredonda(ajuste.giro, 1),
      escala: arredonda(ajuste.escala, 3),
      espelho: ajuste.espelho,
    })),
    escores: medidas.map(({ nome, ajuste }) => ({ nome, escore: ajuste.escore })),
  };
});

// Relatório. O escore é a autoverificação: é a altura do pico de correlação
// entre as duas assinaturas angulares, e só chega perto de 1 se a cópia for
// mesmo a forma de referência girada.
const ESCORE_MINIMO = 0.9;
for (const h of harmonias) {
  console.log(
    `${h.arquivo.padEnd(8)} ${String(h.largura).padStart(6)}×${h.altura}  ` +
      h.meadas
        .map((m, i) => `${m.cor}@(${m.cx},${m.cy}) ${m.giro}° ×${m.escala}${m.espelho ? " espelhada" : ""} escore=${h.escores[i].escore.toFixed(3)}`)
        .join("\n                          "),
  );
}
const suspeitas = harmonias.flatMap((h) =>
  h.escores.filter((e) => !(e.escore > ESCORE_MINIMO)).map((e) => `${h.arquivo} ${e.nome} escore=${e.escore.toFixed(3)}`),
);
if (suspeitas.length) {
  throw new Error(
    `extract-cores: correlação fraca (escore < ${ESCORE_MINIMO}) — o giro medido não vale:\n  ` +
      suspeitas.join("\n  "),
  );
}

// ── Saída ────────────────────────────────────────────────────────────────────
const cabecalho = `/**
 * GERADO por scripts/extract-cores.mjs — não editar à mão.
 *
 * Geometria da seção "Cores e Harmonias": as duas formas de novelo extraídas
 * dos SVGs de reference/cores/, e a posição/giro de cada meada nas oito
 * harmonias. O conteúdo (nomes, códigos TCX, hexes, textos) está escrito à mão
 * em src/data/cores.ts — aqui é só forma.
 *
 * Os "d" são os path do Canva sem reescrita: cada camada carrega o próprio
 * translate (dx/dy), que junta a translação do grupo original com o recorte do
 * viewBox. Reescrever milhares de coordenadas para economizar um transform
 * trocaria precisão por nada.
 */

export interface CamadaForma {
  dx: number;
  dy: number;
  d: string;
}

/** Camada da meada: o fio solto é pintado no tom base, o corpo no tom claro. */
export interface CamadaMeada extends CamadaForma {
  papel: "fio" | "corpo";
}

/** Uma cópia da meada dentro de uma harmonia, na ordem de pintura. */
export interface MeadaNaHarmonia {
  /** Chave em src/data/cores.ts. */
  cor: string;
  /** Centro do corpo, no sistema do viewBox da harmonia. */
  cx: number;
  cy: number;
  /** Graus em relação à forma de \`meada\`, do pico da correlação angular. */
  giro: number;
  escala: number;
  /** Metade das meadas foi espelhada antes de girada — daí o fio trocar de lado. */
  espelho: boolean;
}

export interface FormaHarmonia {
  largura: number;
  altura: number;
  meadas: MeadaNaHarmonia[];
}
`;

const corpoTs = `
/** O novelo redondo da cartela. Uma cor só — a barra de cor é HTML. */
export const novelo = ${JSON.stringify(novelo, null, 2)} as const;

/**
 * A meada das harmonias, na rotação em que foi exportada. \`pivo\` é o centro do
 * corpo dentro do viewBox: é o pivô do rotate() e o ponto que vai até o (cx,cy)
 * de cada cópia.
 */
export const meada = ${JSON.stringify(meada, null, 2)} as const satisfies {
  largura: number;
  altura: number;
  pivo: readonly [number, number] | number[];
  camadas: readonly CamadaMeada[];
};

/** As oito harmonias, na ordem em que a seção as mostra: duplas e depois trios. */
export const formasHarmonia: Record<string, FormaHarmonia> = ${JSON.stringify(
  Object.fromEntries(
    harmonias.map((h) => [
      h.arquivo.replace(".svg", ""),
      { largura: h.largura, altura: h.altura, meadas: h.meadas },
    ]),
  ),
  null,
  2,
)};
`;

writeFileSync(OUT, cabecalho + corpoTs, "utf8");
const kb = (n) => (n / 1024).toFixed(1) + " KB";
console.log(`\n${OUT}`);
console.log(
  `  novelo ${novelo.camadas.length} camadas · meada ${meada.camadas.length} camadas · ${harmonias.length} harmonias`,
);
console.log(
  `  ${kb(cabecalho.length + corpoTs.length)} no lugar de ${kb(
    HARMONIAS.reduce((t, f) => t + readFileSync(resolve(REF, f)).length, 0),
  )} de SVG solto`,
);

// ── Conferência ──────────────────────────────────────────────────────────────
// Remonta cada harmonia a partir dos dados gerados e escreve ao lado do
// original, para comparar olhando o pixel. O escore da correlação diz que a
// forma casa, mas quem confirma que o transform está montado na ordem certa —
// e que o espelho não trocou o sentido do giro — é o olho.
if (process.argv.includes("--conferir")) {
  const CONFERE = resolve(REF, "conferir");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(CONFERE, { recursive: true });

  // Os tons de corpo/fio de cada cor, só para a conferência bater com o original.
  const tons = Object.fromEntries(Object.entries(POR_CORPO).map(([corpo, nome]) => [nome, corpo]));
  const fios = Object.fromEntries(Object.entries(POR_FIO).map(([fio, nome]) => [nome, fio]));

  const forma = meada.camadas
    .map((c) => `<path transform="translate(${c.dx} ${c.dy})" d="${c.d}" fill="var(--${c.papel})"/>`)
    .join("");

  for (const h of harmonias) {
    const [px, py] = meada.pivo;
    const usos = h.meadas
      .map(
        (m) =>
          `<use href="#meada" style="--corpo:${tons[m.cor]};--fio:${fios[m.cor]}" ` +
          `transform="translate(${m.cx} ${m.cy}) rotate(${m.giro}) ` +
          `scale(${m.escala} ${m.espelho ? -m.escala : m.escala}) translate(${-px} ${-py})"/>`,
      )
      .join("");
    writeFileSync(
      resolve(CONFERE, h.arquivo),
      `<svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794" viewBox="-20 -20 ${h.largura + 40} ${h.altura + 40}">` +
        `<defs><g id="meada">${forma}</g></defs>${usos}</svg>`,
      "utf8",
    );
  }
  console.log(`\n  conferência remontada em ${CONFERE}`);
}
