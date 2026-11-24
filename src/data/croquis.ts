/**
 * Os doze croquis do mapa da coleção, na ordem das páginas do Canva: o `nome` é
 * o número do arquivo exportado, e a ordem desta lista é a ordem da fileira.
 *
 * Aqui fica só o que é escrito à mão, a alternativa textual de cada desenho. As
 * proporções são medidas e moram em croquis-medidas.ts, gerado junto com as
 * imagens por scripts/extract-croquis.mjs.
 */
export interface Croqui {
  /** Nome do arquivo em src/assets/croquis, sem extensão. */
  nome: string;
  alt: string;
}

export const croquis: Croqui[] = [
  { nome: "1", alt: "Máscara azul-petróleo de pontas curvas, camisa mostarda de gola azul, saia laranja sobre saia transparente e sapatos pretos de plataforma" },
  { nome: "2", alt: "Máscara dourada de raios, top vermelho, saia vermelha com fivelas e camada xadrez sobre saia preta pespontada, sapatos pretos de plataforma" },
  { nome: "3", alt: "Máscara branca com lenço xadrez, blusa de tricô creme, sutiã azul, corselete coral e saia longa água-marinha de xadrez vermelho e azul" },
  { nome: "4", alt: "Máscara oliva de orelhas pontudas, corpete listrado, saia balão laranja e botas pretas" },
  { nome: "5", alt: "Máscara branca com lenço xadrez, top preto assimétrico, calça corsário jeans marinho com recortes redondos cinza e sapatos pretos" },
  { nome: "6", alt: "Máscara azul-petróleo de pontas curvas, blusa e calça divididas em metades cinza e marinho, com listras e fivelas, e sapatos pretos" },
  { nome: "7", alt: "Máscara branca com lenço xadrez, blazer e calça cinza com recortes vermelhos e sapatos pretos" },
  { nome: "8", alt: "Máscara dourada de raios, regata clara, cinto com avental xadrez sobre saia jeans marinho e botas pretas de plataforma" },
  { nome: "9", alt: "Máscara branca com lenço xadrez, vestido longo água-marinha com recortes, sobreposição grafite, barra preta e sapatos vinho" },
  { nome: "10", alt: "Máscara oliva de orelhas pontudas, casaco longo marinho com listra vermelha e punhos claros, faixas soltas no chão e botas pretas" },
  { nome: "11", alt: "Máscara branca com lenço xadrez, top xadrez, calça preta pespontada com lenço cinza na cintura e sapatos vermelhos" },
  { nome: "12", alt: "Máscara dourada de raios, blusa e saia longa vermelhas com recortes redondos cinza e sapatos marrons de plataforma" },
];
