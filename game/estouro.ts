/**
 * Lógica pura para estourar grupos de bolhas e derrubar as que se soltam.
 *
 * Compatível com HexGrid<T> de ./logica. Não depende de Canvas nem do DOM.
 */
import { HexGrid, type HexCoord, type OccupiedHexCell } from "./logica";

/** Resultado de resolver um encaixe que pode formar um grupo. */
export interface ResultadoEstouro<T> {
  /** Nova grade após a resolução; a grade recebida não é modificada. */
  grid: HexGrid<T>;
  /** Bolhas removidas por pertencerem ao grupo que atingiu o mínimo. */
  estouradas: OccupiedHexCell<T>[];
  /** Bolhas removidas por não estarem mais ligadas a nenhuma célula da linha 0. */
  caidas: OccupiedHexCell<T>[];
}

/** Compara duas cores/valores de bolha. */
export type CompararBolhas<T> = (a: T, b: T) => boolean;

/**
 * Resolve o grupo da bolha recém-encaixada.
 *
 * Se o grupo conectado da mesma cor tiver pelo menos `minimo` células,
 * remove esse grupo e, em seguida, remove todas as bolhas que não puderem
 * mais alcançar uma célula ocupada da linha 0.
 *
 * Por padrão, os valores são comparados com Object.is (adequado para strings,
 * números e enums). Se cada cor for representada por um objeto, passe uma
 * função de comparação que compare a propriedade da cor.
 *
 * Lança RangeError se `origem` não for uma célula existente ou estiver vazia.
 */
export function resolverEstouro<T>(
  grid: HexGrid<T>,
  origem: HexCoord,
  minimo = 3,
  iguais: CompararBolhas<T> = Object.is,
): ResultadoEstouro<T> {
  if (!Number.isInteger(minimo) || minimo < 1) {
    throw new RangeError("minimo precisa ser um inteiro maior que zero.");
  }
  if (typeof iguais !== "function") {
    throw new TypeError("iguais precisa ser uma função.");
  }
  if (!grid.isInside(origem)) {
    throw new RangeError(
      `Coordenada fora do tabuleiro: linha ${origem.row}, coluna ${origem.col}.`,
    );
  }

  const novaGrid = new HexGrid<T>(grid.toMatrix());
  const valorOrigem = novaGrid.get(origem);
  if (valorOrigem === null) {
    throw new RangeError("A célula de origem está vazia.");
  }

  const grupo = encontrarGrupoDaMesmaCor(novaGrid, origem, valorOrigem, iguais);
  if (grupo.length < minimo) {
    return { grid: novaGrid, estouradas: [], caidas: [] };
  }

  const estouradas: OccupiedHexCell<T>[] = grupo.map((coord) => ({
    coord: { ...coord },
    value: novaGrid.get(coord) as T,
  }));
  for (const coord of grupo) {
    novaGrid.set(coord, null);
  }

  const conectadasAoTopo = encontrarCelulasLigadasAoTopo(novaGrid);
  const caidas: OccupiedHexCell<T>[] = [];
  const matrizDepoisDoEstouro = novaGrid.toMatrix();

  for (let row = 0; row < matrizDepoisDoEstouro.length; row += 1) {
    for (let col = 0; col < matrizDepoisDoEstouro[row].length; col += 1) {
      const value = matrizDepoisDoEstouro[row][col];
      if (value === null) continue;

      const coord = { row, col };
      if (!conectadasAoTopo.has(chave(coord))) {
        caidas.push({ coord, value });
        novaGrid.set(coord, null);
      }
    }
  }

  return { grid: novaGrid, estouradas, caidas };
}

/** Retorna as coordenadas do grupo conectado da mesma cor que começa em origem. */
export function encontrarGrupoDaMesmaCor<T>(
  grid: HexGrid<T>,
  origem: HexCoord,
  valor: T,
  iguais: CompararBolhas<T> = Object.is,
): HexCoord[] {
  if (!grid.isInside(origem)) return [];
  const valorInicial = grid.get(origem);
  if (valorInicial === null || !iguais(valorInicial, valor)) return [];

  const visitadas = new Set<string>();
  const resultado: HexCoord[] = [];
  const fila: HexCoord[] = [{ ...origem }];

  for (let indice = 0; indice < fila.length; indice += 1) {
    const atual = fila[indice];
    const atualChave = chave(atual);
    if (visitadas.has(atualChave)) continue;
    visitadas.add(atualChave);

    const valorAtual = grid.get(atual);
    if (valorAtual === null || !iguais(valorAtual, valor)) continue;
    resultado.push(atual);

    for (const vizinho of grid.getNeighborCoords(atual)) {
      const vizinhoChave = chave(vizinho);
      if (!visitadas.has(vizinhoChave)) fila.push(vizinho);
    }
  }

  return resultado;
}

/** Marca todas as bolhas que ainda têm um caminho ocupado até a linha 0. */
function encontrarCelulasLigadasAoTopo<T>(grid: HexGrid<T>): Set<string> {
  const visitadas = new Set<string>();
  const fila: HexCoord[] = [];

  if (grid.rowCount === 0) return visitadas;
  const linhaDoTopo = grid.toMatrix()[0];
  for (let col = 0; col < linhaDoTopo.length; col += 1) {
    if (grid.get({ row: 0, col }) !== null) {
      fila.push({ row: 0, col });
    }
  }

  for (let indice = 0; indice < fila.length; indice += 1) {
    const atual = fila[indice];
    const atualChave = chave(atual);
    if (visitadas.has(atualChave)) continue;
    visitadas.add(atualChave);

    for (const vizinho of grid.getNeighborCoords(atual)) {
      const vizinhoChave = chave(vizinho);
      if (!visitadas.has(vizinhoChave) && grid.get(vizinho) !== null) {
        fila.push(vizinho);
      }
    }
  }

  return visitadas;
}

function chave(coord: HexCoord): string {
  return `${coord.row},${coord.col}`;
}
