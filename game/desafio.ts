/** Utilitários determinísticos do modo de desafio compartilhável. */

/** Aceita apenas sementes decimais não nulas de 32 bits. */
export function lerSementeDesafio(value: string | null): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const seed = Number(value);
  return Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff ? seed : null;
}

/**
 * Cria um gerador pseudorrandômico Mulberry32.
 * A mesma semente sempre produz a mesma sequência, independentemente do aparelho.
 */
export function criarGeradorDesafio(seed: number): () => number {
  if (!Number.isInteger(seed) || seed <= 0 || seed > 0xffffffff) {
    throw new RangeError("A semente do desafio precisa ser um inteiro de 32 bits maior que zero.");
  }

  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
