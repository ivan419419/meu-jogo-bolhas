export type CorCampanha = "coral" | "azul" | "menta" | "amarelo" | "violeta";

export interface ConfiguracaoFaseCampanha {
  fase: number;
  linhas: number;
  quantidadeCores: number;
  tiros: number;
}

export const TOTAL_FASES_CAMPANHA = 10;
export const COLUNAS_CAMPANHA = 9;
export const LINHAS_TABULEIRO = 16;

const CORES: CorCampanha[] = ["coral", "azul", "menta", "amarelo", "violeta"];
const FASES: Omit<ConfiguracaoFaseCampanha, "fase">[] = [
  { linhas: 3, quantidadeCores: 3, tiros: 14 },
  { linhas: 3, quantidadeCores: 3, tiros: 15 },
  { linhas: 4, quantidadeCores: 3, tiros: 17 },
  { linhas: 4, quantidadeCores: 4, tiros: 18 },
  { linhas: 5, quantidadeCores: 4, tiros: 21 },
  { linhas: 5, quantidadeCores: 4, tiros: 23 },
  { linhas: 6, quantidadeCores: 5, tiros: 26 },
  { linhas: 6, quantidadeCores: 5, tiros: 28 },
  { linhas: 7, quantidadeCores: 5, tiros: 30 },
  { linhas: 7, quantidadeCores: 5, tiros: 32 },
];

export function obterConfiguracaoFaseCampanha(fase: number): ConfiguracaoFaseCampanha {
  if (!Number.isInteger(fase) || fase < 1 || fase > TOTAL_FASES_CAMPANHA) {
    throw new RangeError(`A fase da campanha deve estar entre 1 e ${TOTAL_FASES_CAMPANHA}.`);
  }
  return { fase, ...FASES[fase - 1]! };
}

/**
 * Cria um tabuleiro estável por fase: cada faixa horizontal forma grupos de
 * três, enquanto linhas e cores aumentam gradualmente ao longo da campanha.
 */
export function criarTabuleiroCampanha(fase: number): Array<Array<CorCampanha | null>> {
  const config = obterConfiguracaoFaseCampanha(fase);
  const coresDisponiveis = CORES.slice(0, config.quantidadeCores);
  const tabuleiro: Array<Array<CorCampanha | null>> = Array.from(
    { length: LINHAS_TABULEIRO },
    () => Array<CorCampanha | null>(COLUNAS_CAMPANHA).fill(null),
  );

  for (let linha = 0; linha < config.linhas; linha += 1) {
    for (let grupo = 0; grupo < COLUNAS_CAMPANHA / 3; grupo += 1) {
      const indiceCor = (fase - 1 + linha + grupo) % coresDisponiveis.length;
      const cor = coresDisponiveis[indiceCor]!;
      for (let coluna = grupo * 3; coluna < grupo * 3 + 3; coluna += 1) {
        tabuleiro[linha]![coluna] = cor;
      }
    }
  }

  return tabuleiro;
}
