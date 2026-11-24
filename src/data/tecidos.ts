/**
 * A cartela de materiais da coleção: as amostras de tecido e os aviamentos.
 *
 * As imagens são geradas por `npm run extract:tecidos` — o `nome` de cada item
 * é o nome do arquivo em src/assets/tecidos e src/assets/aviamentos, e o
 * `aspect` é a proporção do recorte, medida lá (ver os manifest.json).
 *
 * `titulo`, `composicao`, `gramatura` e `fornecedor` vieram da ficha da
 * Vitória e estão transcritos como ela escreveu, inclusive a composição da lã
 * acrílica, que soma 105% — é para conferir com ela, não para consertar aqui.
 *
 * O `tom` é medido: a média do miolo de cada recorte, longe da serrilha (ver
 * o script). Serve de acento tipográfico e de cor de costura, e por isso não
 * pode ser escolhido a olho.
 *
 * Os nomes dos aviamentos vêm da legenda que estava assada no PNG original e
 * que a extração descarta: ali eram pixel, aqui são texto.
 */

export interface Tecido {
  /** Nome do arquivo em src/assets/tecidos, sem extensão. */
  nome: string;
  titulo: string;
  composicao: string;
  gramatura: string;
  fornecedor: string;
  /** Tom médio do miolo da amostra (medido, não escolhido). */
  tom: string;
  aspect: number;
  alt: string;
}

export interface Aviamento {
  /** Nome do arquivo em src/assets/aviamentos, sem extensão. */
  nome: string;
  titulo: string;
  aspect: number;
  alt: string;
}

/** As dez amostras de base, na ordem da ficha. */
export const tecidos: Tecido[] = [
  {
    nome: "alicia",
    titulo: "Alicia",
    composicao: "100% algodão",
    gramatura: "115 g/m²",
    fornecedor: "RenauxView",
    tom: "#5c524b",
    aspect: 1.011,
    alt: "Amostra do tecido Alicia, em cinza-esverdeado de trama miúda e aberta, recortada com tesoura de picotar",
  },
  {
    nome: "chiffon",
    titulo: "Chiffon",
    composicao: "100% poliéster",
    gramatura: "90 g/m²",
    fornecedor: "Central Importadora",
    tom: "#9d9594",
    aspect: 0.983,
    alt: "Amostra de chiffon prateado com o amassado marcado no tecido, que devolve a luz em dobras irregulares",
  },
  {
    nome: "couro-sintetico",
    titulo: "Couro sintético",
    composicao: "95% poliéster, 5% elastano",
    gramatura: "280 g/m²",
    fornecedor: "Central Importadora",
    tom: "#b3323d",
    aspect: 1.018,
    alt: "Amostra de couro sintético vermelho, de superfície lisa e levemente marcada, recortada com tesoura de picotar",
  },
  {
    nome: "sarja",
    titulo: "Sarja",
    composicao: "100% algodão",
    gramatura: "259 g/m²",
    fornecedor: "Paranatex",
    tom: "#6a1d23",
    aspect: 0.993,
    alt: "Amostra de sarja vermelho-escura de trama diagonal fechada, recortada com tesoura de picotar",
  },
  {
    nome: "la-acrilica",
    titulo: "Lã acrílica",
    composicao: "97% poliéster, 5% viscose e 3% elastano",
    gramatura: "390 g/m²",
    fornecedor: "JLM Tecidos",
    tom: "#333e62",
    aspect: 1.001,
    alt: "Amostra de lã acrílica azul-marinho, de superfície felpuda e sem trama aparente, recortada com tesoura de picotar",
  },
  {
    nome: "setta",
    titulo: "Setta",
    composicao: "97% algodão, 3% elastano",
    gramatura: "230 g/m²",
    fornecedor: "RenauxView",
    tom: "#8d453c",
    aspect: 0.994,
    alt: "Amostra do tecido Setta, em terracota de trama diagonal fina e uniforme, recortada com tesoura de picotar",
  },
  {
    nome: "tinker",
    titulo: "Tinker",
    composicao: "100% algodão",
    gramatura: "115 g/m²",
    fornecedor: "RenauxView",
    tom: "#3e4d5b",
    aspect: 0.965,
    alt: "Amostra do tecido Tinker, em azul desbotado de trama miúda, com a borda ondulada",
  },
  {
    nome: "tule-malha",
    titulo: "Tule de malha texturizado",
    composicao: "94% poliéster, 6% elastano",
    gramatura: "85 g/m²",
    fornecedor: "Central Importadora",
    tom: "#3c3b50",
    aspect: 1.121,
    alt: "Amostra de tule de malha texturizado, azul-marinho, de canelado horizontal miúdo",
  },
  {
    nome: "lidel",
    titulo: "Lidel",
    composicao: "100% algodão",
    gramatura: "120 g/m²",
    fornecedor: "RenauxView",
    tom: "#70262f",
    aspect: 0.996,
    alt: "Amostra do tecido Lidel, em vinho mesclado com fios claros na diagonal, recortada com tesoura de picotar",
  },
  {
    nome: "denim",
    titulo: "Denim",
    composicao: "100% algodão",
    gramatura: "12 oz",
    fornecedor: "Capricórnio Têxtil",
    tom: "#3e3e41",
    aspect: 0.992,
    alt: "Amostra de denim preto de trama diagonal, com a ourela desfiada aparecendo num dos lados",
  },
];

/**
 * Os aviamentos, agrupados pelo que fazem: o que fecha, o que regula e o que
 * arremata. A ordem é essa, e é o que dá leitura à prancha.
 */
export const aviamentos: Aviamento[] = [
  {
    nome: "ziper-metalico",
    titulo: "Zíper metálico destacável",
    aspect: 0.593,
    alt: "Zíper metálico destacável de dentes dourados sobre cadarço preto, visto fechado e aberto",
  },
  {
    nome: "ziper-invisivel",
    titulo: "Zíper invisível",
    aspect: 0.921,
    alt: "Zíper invisível azul-claro, visto fechado com o cursor e aberto pelo avesso",
  },
  {
    nome: "fecho-sutia",
    titulo: "Fecho de sutiã",
    aspect: 0.803,
    alt: "Fecho de sutiã preto de três colchetes, com as duas metades separadas",
  },
  {
    nome: "botao-pressao",
    titulo: "Botão de pressão pequeno",
    aspect: 2.103,
    alt: "Seis peças de botão de pressão metálico pequeno, macho e fêmea",
  },
  {
    nome: "botao-flexivel",
    titulo: "Botão flexível",
    aspect: 1.538,
    alt: "Botão flexível metálico em três vistas: a cabeça de frente, o conjunto montado e o pino",
  },
  {
    nome: "rebite",
    titulo: "Rebite",
    aspect: 1.006,
    alt: "Quatro rebites metálicos, a cabeça lisa e os pinos vistos de cima",
  },
  {
    nome: "ilhos",
    titulo: "Ilhós",
    aspect: 1.846,
    alt: "Dois ilhoses metálicos, um de frente e um de trás, mostrando o anel e o rebaixo",
  },
  {
    nome: "fivela-tres-pinos",
    titulo: "Fivela de três pinos",
    aspect: 1.184,
    alt: "Fivela metálica retangular de três pinos, vista de frente",
  },
  {
    nome: "fivela-dois-pinos",
    titulo: "Fivela de dois pinos",
    aspect: 1.209,
    alt: "Fivela metálica quadrada de dois pinos, vista de frente",
  },
  {
    nome: "regulador-metalico",
    titulo: "Regulador metálico",
    aspect: 1.014,
    alt: "Regulador metálico retangular de barra central, visto de frente",
  },
  {
    nome: "argolas-metalicas",
    titulo: "Argolas metálicas",
    aspect: 1.087,
    alt: "Três argolas metálicas redondas de diâmetros diferentes",
  },
  {
    nome: "meia-argola",
    titulo: "Meia argola metálica",
    aspect: 1.06,
    alt: "Meia argola metálica em D, vista de frente",
  },
  {
    nome: "regulador-sutia",
    titulo: "Regulador e argola de sutiã",
    aspect: 0.716,
    alt: "Regulador e argola de sutiã em metal claro, um acima do outro",
  },
  {
    nome: "vies-algodao",
    titulo: "Viés de algodão",
    aspect: 0.641,
    alt: "Rolo de viés de algodão amarelo enrolado em carretel",
  },
];
