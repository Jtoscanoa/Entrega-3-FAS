// Presentacion de cartas. Codigo del servidor: valor + pinta (C, D, T, P), p. ej. "10C", "AP"; "*" = comodin.
export interface InfoCarta { codigo: string; valor: string; pinta: string; simbolo: string; roja: boolean; rango: number; puntos: number }

const SIMBOLOS: Record<string, string> = { C: '♥', D: '♦', T: '♣', P: '♠' };
const RANGOS: Record<string, number> = { A: 1, J: 11, Q: 12, K: 13 };
const ORDEN_PINTAS = 'CDTP';

export function infoCarta(codigo: string): InfoCarta {
  if (codigo === '*') return { codigo, valor: '★', pinta: '', simbolo: '', roja: false, rango: 99, puntos: 0 };
  const valor = codigo.slice(0, -1);
  const pinta = codigo.slice(-1);
  const rango = RANGOS[valor] ?? Number(valor);
  const puntos = valor === 'A' || rango >= 11 ? 10 : rango;
  return { codigo, valor, pinta, simbolo: SIMBOLOS[pinta] ?? pinta, roja: pinta === 'C' || pinta === 'D', rango, puntos };
}

export function ordenarPorPinta(cartas: string[]): string[] {
  return [...cartas].sort((a, b) => {
    const x = infoCarta(a), y = infoCarta(b);
    return ORDEN_PINTAS.indexOf(x.pinta) - ORDEN_PINTAS.indexOf(y.pinta) || x.rango - y.rango;
  });
}

export function ordenarPorValor(cartas: string[]): string[] {
  return [...cartas].sort((a, b) => {
    const x = infoCarta(a), y = infoCarta(b);
    return x.rango - y.rango || ORDEN_PINTAS.indexOf(x.pinta) - ORDEN_PINTAS.indexOf(y.pinta);
  });
}

/** Mantiene el orden que el jugador eligio: conserva las cartas que siguen en la mano y agrega las nuevas al final. */
export function reconciliar(ordenActual: string[], mano: string[]): string[] {
  const pendientes = [...mano];
  const resultado: string[] = [];
  for (const c of ordenActual) {
    const i = pendientes.indexOf(c);
    if (i >= 0) { resultado.push(c); pendientes.splice(i, 1); }
  }
  return [...resultado, ...pendientes];
}
