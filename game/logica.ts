/**
 * Lógica pura para um tabuleiro hexagonal em grade offset por linhas.
 *
 * Convenção usada: odd-r (linhas ímpares deslocadas para a direita).
 * O tabuleiro não sabe desenhar bolhas nem depende de Canvas/DOM.
 *
 * Coordenadas são indexadas a partir de zero:
 *   linha 0, coluna 0 -> { row: 0, col: 0 }
 *
 * Cada célula guarda um valor do tipo T ou null (célula vazia).
 */

/** Coordenada de uma célula do tabuleiro. */
export interface HexCoord {
  row: number;
  col: number;
}

/** Coordenada acompanhada do conteúdo da célula. */
export interface OccupiedHexCell<T> {
  coord: HexCoord;
  value: T;
}

/** Tipo de matriz: cada linha pode ter comprimento diferente. */
export type HexMatrix<T> = Array<Array<T | null>>;

/**
 * Tabuleiro hexagonal mutável com regras de vizinhança independentes da UI.
 *
 * A matriz pode ser retangular ou ter linhas de comprimentos diferentes.
 * Células fora dos limites reais de uma linha não são consideradas vizinhas.
 */
export class HexGrid<T> {
  private readonly cells: HexMatrix<T>;

  /**
   * Cria o tabuleiro a partir de uma matriz já existente.
   * A matriz e suas linhas são copiadas para não compartilhar os arrays de entrada.
   */
  constructor(matrix: HexMatrix<T>) {
    if (matrix.length === 0) {
      throw new Error("O tabuleiro precisa ter pelo menos uma linha.");
    }

    if (matrix.some((row) => !Array.isArray(row))) {
      throw new Error("Cada linha do tabuleiro precisa ser uma matriz.");
    }

    this.cells = matrix.map((row) => [...row]);
  }

  /**
   * Cria um tabuleiro retangular vazio.
   * Todas as células começam com null.
   */
  static empty<T>(rows: number, cols: number): HexGrid<T> {
    if (!Number.isInteger(rows) || rows <= 0) {
      throw new Error("rows precisa ser um inteiro maior que zero.");
    }
    if (!Number.isInteger(cols) || cols <= 0) {
      throw new Error("cols precisa ser um inteiro maior que zero.");
    }

    const matrix: HexMatrix<T> = Array.from({ length: rows }, () =>
      Array<T | null>(cols).fill(null),
    );
    return new HexGrid<T>(matrix);
  }

  /** Quantidade de linhas. */
  get rowCount(): number {
    return this.cells.length;
  }

  /** Maior quantidade de colunas entre as linhas. */
  get maxColumnCount(): number {
    return Math.max(...this.cells.map((row) => row.length));
  }

  /** Retorna true se a coordenada aponta para uma célula existente. */
  isInside(coord: HexCoord): boolean {
    return (
      Number.isInteger(coord.row) &&
      Number.isInteger(coord.col) &&
      coord.row >= 0 &&
      coord.row < this.cells.length &&
      coord.col >= 0 &&
      coord.col < this.cells[coord.row].length
    );
  }

  /** Lê o conteúdo de uma célula. Lança erro se a coordenada estiver fora do tabuleiro. */
  get(coord: HexCoord): T | null {
    this.assertInside(coord);
    return this.cells[coord.row][coord.col];
  }

  /** Escreve em uma célula. Use null para deixá-la vazia. */
  set(coord: HexCoord, value: T | null): void {
    this.assertInside(coord);
    this.cells[coord.row][coord.col] = value;
  }

  /**
   * Retorna as coordenadas das células vizinhas que existem no tabuleiro.
   * O resultado inclui vizinhos vazios e ocupados; a ordem é estável.
   *
   * Para odd-r:
   * - linha par: diagonais apontam para col-1 nas linhas adjacentes;
   * - linha ímpar: diagonais apontam para col+1 nas linhas adjacentes.
   */
  getNeighborCoords(coord: HexCoord): HexCoord[] {
    this.assertInside(coord);

    const { row, col } = coord;
    const sameRow = [
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];

    const diagonals = row % 2 === 0
      ? [
          { row: row - 1, col: col - 1 },
          { row: row - 1, col },
          { row: row + 1, col: col - 1 },
          { row: row + 1, col },
        ]
      : [
          { row: row - 1, col },
          { row: row - 1, col: col + 1 },
          { row: row + 1, col },
          { row: row + 1, col: col + 1 },
        ];

    return [...sameRow, ...diagonals].filter((neighbor) =>
      this.isInside(neighbor),
    );
  }

  /** Retorna apenas os vizinhos que atualmente contêm um valor não nulo. */
  getOccupiedNeighbors(coord: HexCoord): OccupiedHexCell<T>[] {
    return this.getNeighborCoords(coord)
      .map((neighborCoord) => ({
        coord: neighborCoord,
        value: this.get(neighborCoord),
      }))
      .filter(
        (cell): cell is OccupiedHexCell<T> => cell.value !== null,
      );
  }

  /** Devolve uma cópia das linhas da matriz. */
  toMatrix(): HexMatrix<T> {
    return this.cells.map((row) => [...row]);
  }

  private assertInside(coord: HexCoord): void {
    if (!this.isInside(coord)) {
      throw new RangeError(
        `Coordenada fora do tabuleiro: linha ${coord.row}, coluna ${coord.col}.`,
      );
    }
  }
}

/*
Exemplo rápido de uso:

const board = HexGrid.empty<string>(5, 8);
board.set({ row: 2, col: 3 }, "azul");
board.set({ row: 1, col: 3 }, "azul");

const vizinhos = board.getNeighborCoords({ row: 2, col: 3 });
const vizinhosOcupados = board.getOccupiedNeighbors({ row: 2, col: 3 });

console.log(vizinhos);          // coordenadas adjacentes válidas
console.log(vizinhosOcupados); // contém a célula azul da linha 1, coluna 3
*/
