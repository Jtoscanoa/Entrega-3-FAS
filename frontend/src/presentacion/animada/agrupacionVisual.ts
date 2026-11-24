// Solo presentacion visual para ordenar y resaltar grupos en la mano (RD4: no valida reglas ni cierres del servidor).
import { infoCarta } from '../../cartas';

interface CartaIdx {
  idx: number;
  codigo: string;
  rango: number;
  pinta: string;
  comodin: boolean;
}

function analizar(cartas: string[]): CartaIdx[] {
  return cartas.map((codigo, idx) => {
    const info = infoCarta(codigo);
    return { idx, codigo, rango: info.rango, pinta: info.pinta, comodin: codigo === '*' };
  });
}

function esGrupoValido(sub: CartaIdx[]): boolean {
  if (sub.length < 3) return false;
  const comodines = sub.filter((c) => c.comodin).length;
  const nat = sub.filter((c) => !c.comodin);
  if (comodines > 1 || nat.length < 2) return false;

  // Terna o cuarta del mismo valor (sin exigir pintas distintas: solo agrupacion visual).
  if (sub.length <= 4 && nat.every((c) => c.rango === nat[0].rango)) return true;

  // Escalera del mismo palo (As como 1 o 14, sin vuelta).
  const pinta = nat[0].pinta;
  if (!nat.every((c) => c.pinta === pinta)) return false;

  const probarConAs = (asComo14: boolean): boolean => {
    const valores = nat.map((c) => (asComo14 && c.rango === 1 ? 14 : c.rango)).sort((a, b) => a - b);
    for (let i = 1; i < valores.length; i++) if (valores[i] === valores[i - 1]) return false;
    const huecos = valores[valores.length - 1] - valores[0] + 1 - valores.length;
    return huecos <= comodines && valores[valores.length - 1] - valores[0] + 1 <= sub.length;
  };
  return probarConAs(false) || probarConAs(true);
}

function ordenarIndicesDeEscalera(sub: CartaIdx[]): number[] {
  const nat = sub.filter((c) => !c.comodin);
  const comodines = sub.filter((c) => c.comodin);
  const as14 = nat.some((c) => c.rango === 1) && nat.some((c) => c.rango >= 12);
  const ordenados = [...nat].sort((a, b) => (as14 && a.rango === 1 ? 14 : a.rango) - (as14 && b.rango === 1 ? 14 : b.rango));
  if (!comodines.length) return ordenados.map((c) => c.idx);

  const res: number[] = [];
  let comodinUsado = false;
  for (let i = 0; i < ordenados.length; i++) {
    const val = as14 && ordenados[i].rango === 1 ? 14 : ordenados[i].rango;
    if (i > 0) {
      const prev = as14 && ordenados[i - 1].rango === 1 ? 14 : ordenados[i - 1].rango;
      if (val - prev === 2 && !comodinUsado) {
        res.push(comodines[0].idx);
        comodinUsado = true;
      }
    }
    res.push(ordenados[i].idx);
  }
  if (!comodinUsado) res.push(comodines[0].idx);
  return res;
}

function generarCandidatos(items: CartaIdx[]): number[][] {
  const candidatos: number[][] = [];
  const comodines = items.filter((c) => c.comodin);

  // 1. Ternas y cuartas del mismo valor.
  const porRango = new Map<number, CartaIdx[]>();
  items.filter((c) => !c.comodin).forEach((c) => {
    const lista = porRango.get(c.rango) ?? [];
    lista.push(c);
    porRango.set(c.rango, lista);
  });
  porRango.forEach((lista) => {
    if (lista.length >= 3) {
      candidatos.push(lista.slice(0, 3).map((c) => c.idx));
      if (lista.length >= 4) candidatos.push(lista.slice(0, 4).map((c) => c.idx));
    }
    if (lista.length >= 2 && comodines.length > 0) {
      candidatos.push([...lista.slice(0, 2).map((c) => c.idx), comodines[0].idx]);
    }
  });

  // 2. Escaleras del mismo palo (As como 1 y como 14).
  const porPinta = new Map<string, CartaIdx[]>();
  items.filter((c) => !c.comodin).forEach((c) => {
    const lista = porPinta.get(c.pinta) ?? [];
    lista.push(c);
    porPinta.set(c.pinta, lista);
  });
  porPinta.forEach((lista) => {
    for (const as14 of [false, true]) {
      if (as14 && !lista.some((c) => c.rango === 1)) continue;
      const ord = [...lista].sort((a, b) => (as14 && a.rango === 1 ? 14 : a.rango) - (as14 && b.rango === 1 ? 14 : b.rango));
      for (let i = 0; i < ord.length; i++) {
        for (let j = i + 2; j < ord.length && j - i < 6; j++) {
          const tramo = ord.slice(i, j + 1);
          if (esGrupoValido(tramo)) candidatos.push(tramo.map((c) => c.idx));
        }
        if (comodines.length > 0 && i + 1 < ord.length) {
          const tramo = [ord[i], ord[i + 1], comodines[0]];
          if (esGrupoValido(tramo)) candidatos.push(ordenarIndicesDeEscalera(tramo));
        }
      }
    }
  });

  // Quitar duplicados por mascara de bits y ordenar de mayor a menor tamano.
  const vistos = new Set<number>();
  return candidatos
    .filter((g) => {
      const mask = g.reduce((m, idx) => m | (1 << idx), 0);
      if (vistos.has(mask)) return false;
      vistos.add(mask);
      return true;
    })
    .sort((a, b) => b.length - a.length);
}

/**
 * Reordena la mano agrupando primero las ternas, cuartas y escaleras visuales encontradas
 * para facilitar la lectura y reducir solapes en pantalla.
 */
export function agruparManoVisual(cartas: string[]): { orden: string[]; grupos: number[] } {
  const items = analizar(cartas);
  if (items.length < 3 || items.length > 24) {
    return { orden: [...cartas], grupos: cartas.map(() => -1) };
  }

  const candidatos = generarCandidatos(items).map((g) => ({
    indices: g,
    mask: g.reduce((m, idx) => m | (1 << idx), 0),
  }));

  let mejorCubiertas = 0;
  let mejorGrupos: number[][] = [];

  function buscar(pos: number, usada: number, cubiertas: number, actuales: number[][]) {
    if (cubiertas > mejorCubiertas || (cubiertas === mejorCubiertas && actuales.length < mejorGrupos.length)) {
      mejorCubiertas = cubiertas;
      mejorGrupos = actuales.map((g) => [...g]);
    }
    if (pos >= candidatos.length) return;
    // Cota optimista sencilla: evitar explorar si no puede superar lo mejor encontrado.
    let potencial = cubiertas;
    for (let k = pos; k < candidatos.length && potencial < items.length; k++) {
      if ((candidatos[k].mask & usada) === 0) potencial += candidatos[k].indices.length;
    }
    if (potencial < mejorCubiertas) return;

    const cand = candidatos[pos];
    if ((cand.mask & usada) === 0) {
      actuales.push(cand.indices);
      buscar(pos + 1, usada | cand.mask, cubiertas + cand.indices.length, actuales);
      actuales.pop();
    }
    buscar(pos + 1, usada, cubiertas, actuales);
  }

  buscar(0, 0, 0, []);

  const usados = new Set<number>();
  const orden: string[] = [];
  const grupos: number[] = [];

  mejorGrupos.forEach((g, idGrupo) => {
    g.forEach((idx) => {
      usados.add(idx);
      orden.push(cartas[idx]);
      grupos.push(idGrupo);
    });
  });

  const sueltas = items
    .filter((c) => !usados.has(c.idx))
    .sort((a, b) => a.rango - b.rango || a.pinta.localeCompare(b.pinta));

  sueltas.forEach((c) => {
    orden.push(c.codigo);
    grupos.push(-1);
  });

  return { orden, grupos };
}

/**
 * Detecta grupos visuales contiguos en el orden actual de la mano (ternas, cuartas o escaleras).
 * Devuelve un arreglo paralelo con el id del grupo (0, 1, ...) o -1 si la carta esta suelta.
 */
export function detectarGruposContiguos(cartas: string[]): number[] {
  const items = analizar(cartas);
  const res = cartas.map(() => -1);
  let i = 0;
  let idGrupo = 0;

  while (i <= items.length - 3) {
    let mejorFin = -1;
    for (let fin = Math.min(items.length, i + 6); fin >= i + 3; fin--) {
      if (esGrupoValido(items.slice(i, fin))) {
        mejorFin = fin;
        break;
      }
    }
    if (mejorFin > 0) {
      for (let k = i; k < mejorFin; k++) res[k] = idGrupo;
      idGrupo++;
      i = mejorFin;
    } else {
      i++;
    }
  }
  return res;
}
