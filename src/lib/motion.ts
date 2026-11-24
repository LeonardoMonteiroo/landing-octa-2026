/**
 * Camada de movimento do book.
 *
 * Registra os plugins do GSAP, sobe o scroll suave (Lenis) e expõe o
 * matchMedia compartilhado. Roda uma vez só, como side effect de topo de
 * módulo: o Astro junta todos os <script> da página num módulo único, e o
 * hoisting do ESM garante que este arquivo seja avaliado antes de qualquer
 * coreografia de componente — independentemente de onde o <Motion /> está
 * no HTML. Por isso o trabalho está aqui no topo, e não numa função que o
 * Motion.astro chamaria.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Query única de toda a camada. Coreografia fora dela é bug. */
export const COM_MOVIMENTO = "(prefers-reduced-motion: no-preference)";

/**
 * matchMedia compartilhado. Reverte tweens, ScrollTriggers e até gsap.set()
 * sozinho quando a query deixa de bater — é o que faz a preferência do
 * usuário poder mudar com a página aberta.
 */
export const mm = gsap.matchMedia();

/** Espelho em JS dos tokens de tokens.css (o GSAP não lê var()). */
export const dur = {
  instante: 0.12,
  rapida: 0.28,
  media: 0.6,
  lenta: 1.1,
} as const;

/**
 * Prioridade de remedida, por seção.
 *
 * O ScrollTrigger remede da **maior** prioridade para a menor (ver o sort em
 * `ScrollTrigger.js`), e o desempate é a última posição medida — nunca a ordem
 * do HTML, que ele não conhece: a ordem de criação é a do bundle do Astro, que
 * funde os `<script>` de todos os componentes num módulo só.
 *
 * Sem isto, uma seção mede antes de o `pin-spacer` de quem está acima dela
 * existir, e nasce adiantada pela altura dele. Foi o que aconteceu com o
 * lineup do trendboard: ele abria dentro da Persona, 4.000px antes da hora —
 * a altura do pin da Caixa de Fotos — e a seção dele ficava uma tela vazia.
 *
 * Regra: **quem vem antes na página leva número maior.** A página inteira
 * (`pagina`) vem por último, porque só depois de todo mundo medido é que a
 * altura do documento é a definitiva.
 */
export const prioridade = {
  capa: 60,
  conceito: 50,
  mood: 40,
  persona: 30,
  trendboard: 20,
  cores: 10,
  tecidos: 0,
  estampas: -5,
  mapa: -7,
  pagina: -10,
} as const;

/** Pareado com --curva-* em tokens.css. */
export const curva = {
  tecido: "expo.out",
  fio: "power3.out",
  agulha: "power2.inOut",
} as const;

export const lenis = new Lenis({
  lerp: 0.1,
  // A Lenis 1.3.x lê scroll-margin-top por conta própria (ver scrollMarginTop
  // em lenis.mjs), então o scroll-mt-24 das seções continua valendo e não
  // pode ser somado de novo aqui — um offset: -96 fazia a âncora parar a
  // 192px do topo, o dobro do pretendido.
  anchors: true,
  // respectReducedMotion já vem true: com "reduce" o lerp vira 1 e o scroll
  // acompanha o dispositivo 1:1.
});

// Padrão canônico Lenis + ScrollTrigger: um rAF só para a página inteira.
// Não precisa de scrollerProxy — a Lenis move o scroll real do documento,
// não translada um wrapper como o Locomotive.
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((tempo) => lenis.raf(tempo * 1000));
gsap.ticker.lagSmoothing(0);

// Fontes variáveis e imagens mudam a altura do documento depois do primeiro
// layout — sem remedir, o start/end de todo ScrollTrigger sai torto.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh());

export { gsap, ScrollTrigger, SplitText };
