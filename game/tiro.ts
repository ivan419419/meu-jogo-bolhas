/**
 * Lógica pura de movimento e encaixe de bolhas para Bubble Shooter.
 *
 * Não depende de Canvas nem do DOM. As dimensões visuais das células são
 * fornecidas pelo chamador através da função centroDaCelula.
 */
import { HexGrid, type HexCoord } from "./logica";

/** Ponto em coordenadas do mundo do jogo (por exemplo, pixels do Canvas). */
export interface Ponto2D {
  x: number;
  y: number;
}

/** Estado de uma bolha em movimento. vx e vy são unidades por segundo. */
export interface Tiro<T> extends Ponto2D {
  vx: number;
  vy: number;
  value: T;
}

/** Limites horizontais permitidos para o centro da bolha. */
export interface LimitesHorizontais {
  minX: number;
  maxX: number;
}

/** Resultado do encaixe, contendo uma nova grade; a original não é alterada. */
export interface ResultadoEncaixe<T> {
  grid: HexGrid<T>;
  coord: HexCoord;
}

/**
 * Dispara uma bolha a partir de uma origem.
 *
 * O ângulo é em radianos e é medido a partir da vertical para cima:
 *   0        = para cima
 *   positivo = para a direita
 *   negativo = para a esquerda
 * A velocidade é expressa em unidades do mundo por segundo.
 */
export function atirar<T>(
  anguloRad: number,
  origem: Ponto2D,
  velocidade: number,
  value: T,
): Tiro<T> {
  if (!Number.isFinite(anguloRad)) {
    throw new RangeError("anguloRad precisa ser um número finito.");
  }
  validarPonto(origem, "origem");
  if (!Number.isFinite(velocidade) || velocidade <= 0) {
    throw new RangeError("velocidade precisa ser um número finito maior que zero.");
  }

  return {
    x: origem.x,
    y: origem.y,
    vx: Math.sin(anguloRad) * velocidade,
    vy: -Math.cos(anguloRad) * velocidade,
    value,
  };
}

/**
 * Reflete um tiro nas paredes laterais e devolve um novo objeto.
 *
 * Também resolve ultrapassagens maiores que a largura do tabuleiro, inclusive
 * vários ricochetes no mesmo passo. minX/maxX devem representar os limites do
 * centro da bolha, já descontado o raio dela.
 */
export function ricochete<T>(
  tiro: Tiro<T>,
  limites: LimitesHorizontais,
): Tiro<T> {
  validarLimites(limites);
  validarTiro(tiro);

  const largura = limites.maxX - limites.minX;
  const periodo = largura * 2;
  const deslocamento = tiro.x - limites.minX;
  const fase = ((deslocamento % periodo) + periodo) % periodo;

  if (fase === 0) {
    return { ...tiro, x: limites.minX, vx: Math.abs(tiro.vx) };
  }
  if (fase === largura) {
    return { ...tiro, x: limites.maxX, vx: -Math.abs(tiro.vx) };
  }
  if (fase < largura) {
    return { ...tiro, x: limites.minX + fase };
  }

  return {
    ...tiro,
    x: limites.maxX - (fase - largura),
    vx: -tiro.vx,
  };
}

/**
 * Avança o tiro pelo tempo decorrido e aplica ricochetes laterais.
 * deltaSegundos deve ser o tempo desde o quadro anterior, em segundos.
 */
export function moverTiro<T>(
  tiro: Tiro<T>,
  deltaSegundos: number,
  limites: LimitesHorizontais,
): Tiro<T> {
  validarTiro(tiro);
  if (!Number.isFinite(deltaSegundos) || deltaSegundos < 0) {
    throw new RangeError("deltaSegundos precisa ser um número finito não negativo.");
  }

  const avancado: Tiro<T> = {
    ...tiro,
    x: tiro.x + tiro.vx * deltaSegundos,
    y: tiro.y + tiro.vy * deltaSegundos,
  };
  return ricochete(avancado, limites);
}

/**
 * Encaixa a bolha na célula vazia cujo centro está mais perto do tiro.
 *
 * A função percorre apenas células que existem na matriz (inclusive quando as
 * linhas têm comprimentos diferentes). Retorna null se o tabuleiro estiver
 * cheio ou se a célula mais próxima estiver além de distanciaMaxima.
 *
 * O tabuleiro original não é modificado: o resultado contém uma cópia com a
 * bolha inserida. distanciaMaxima usa as mesmas unidades de Ponto2D e, por
 * padrão, não tem limite; na colisão, passe um limite próximo a uma célula.
 */
export function encaixar<T>(
  grid: HexGrid<T>,
  ponto: Ponto2D,
  value: T,
  centroDaCelula: (coord: HexCoord) => Ponto2D,
  distanciaMaxima = Number.POSITIVE_INFINITY,
): ResultadoEncaixe<T> | null {
  validarPonto(ponto, "ponto");
  if (typeof centroDaCelula !== "function") {
    throw new TypeError("centroDaCelula precisa ser uma função.");
  }
  if (
    Number.isNaN(distanciaMaxima) ||
    distanciaMaxima < 0
  ) {
    throw new RangeError("distanciaMaxima precisa ser não negativa.");
  }

  const matriz = grid.toMatrix();
  let melhorCoord: HexCoord | null = null;
  let menorDistancia = Number.POSITIVE_INFINITY;

  for (let row = 0; row < matriz.length; row += 1) {
    for (let col = 0; col < matriz[row].length; col += 1) {
      const coord = { row, col };
      if (matriz[row][col] !== null) continue;

      const centro = centroDaCelula(coord);
      validarPonto(centro, "centroDaCelula(coord)");
      const distancia = Math.hypot(ponto.x - centro.x, ponto.y - centro.y);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        melhorCoord = coord;
      }
    }
  }

  if (melhorCoord === null || menorDistancia > distanciaMaxima) {
    return null;
  }

  const novaGrid = new HexGrid<T>(matriz);
  novaGrid.set(melhorCoord, value);
  return { grid: novaGrid, coord: melhorCoord };
}

function validarPonto(ponto: Ponto2D, nome: string): void {
  if (!Number.isFinite(ponto.x) || !Number.isFinite(ponto.y)) {
    throw new RangeError(`${nome} precisa ter x e y finitos.`);
  }
}

function validarTiro<T>(tiro: Tiro<T>): void {
  validarPonto(tiro, "tiro");
  if (!Number.isFinite(tiro.vx) || !Number.isFinite(tiro.vy)) {
    throw new RangeError("tiro precisa ter vx e vy finitos.");
  }
}

function validarLimites(limites: LimitesHorizontais): void {
  if (
    !Number.isFinite(limites.minX) ||
    !Number.isFinite(limites.maxX) ||
    limites.maxX <= limites.minX
  ) {
    throw new RangeError("Os limites precisam ser finitos e maxX maior que minX.");
  }
}
