// Piezas compartidas de la version animada: cartas dibujadas con CSS (sin imagenes con derechos), avatares
// con iniciales y utilidades de movimiento. Solo se anima transform y opacity.
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { infoCarta } from '../../cartas';

const NOMBRE_PINTA: Record<string, string> = { C: 'corazones', D: 'diamantes', T: 'tréboles', P: 'picas' };
const NOMBRE_VALOR: Record<string, string> = { A: 'As', J: 'Jota', Q: 'Reina', K: 'Rey' };

/** Texto accesible de una carta: "7 de corazones, 7 puntos". */
export function nombreCarta(codigo: string): string {
  if (codigo === '*') return 'Comodín, 0 puntos';
  const c = infoCarta(codigo);
  return `${NOMBRE_VALOR[c.valor] ?? c.valor} de ${NOMBRE_PINTA[c.pinta] ?? c.pinta}, ${c.puntos} puntos`;
}

export function CaraCarta({ codigo }: { codigo: string }) {
  const c = infoCarta(codigo);
  const figura = ['J', 'Q', 'K'].includes(c.valor);
  const comodin = codigo === '*';
  return (
    <div className={['a-cara', c.roja ? 'roja' : '', figura ? 'figura' : ''].join(' ')}>
      <span className="a-esquina arriba"><b>{c.valor}</b><i>{c.simbolo}</i></span>
      <span className="a-centro" aria-hidden="true">
        {comodin ? '★' : figura ? <><em>{c.valor}</em><small>{c.simbolo}</small></> : c.simbolo}
      </span>
      <span className="a-esquina abajo"><b>{c.valor}</b><i>{c.simbolo}</i></span>
    </div>
  );
}

export function DorsoCarta() {
  return <div className="a-dorso" aria-hidden="true"><span>101</span></div>;
}

/** Carta con dos caras: gira en 3D cuando pasa de boca abajo a boca arriba o completa una vuelta al robar. */
export function Carta({
  codigo,
  bocaAbajo = false,
  girar = false,
  retraso = 0,
  giroInicialY,
  giroFinalY,
  duracionGiro,
}: {
  codigo: string | null;
  bocaAbajo?: boolean;
  girar?: boolean;
  retraso?: number;
  giroInicialY?: number;
  giroFinalY?: number;
  duracionGiro?: number;
}) {
  const reducido = useReducedMotion();
  const oculta = bocaAbajo || !codigo;
  const destinoY = !reducido && giroFinalY !== undefined ? giroFinalY : oculta ? 180 : 0;
  const inicioY = !reducido
    ? (giroInicialY !== undefined ? giroInicialY : girar ? 180 : false)
    : false;
  return (
    <div className="a-carta">
      <motion.div className="a-carta-interior"
        initial={inicioY === false ? false : { rotateY: inicioY }}
        animate={{ rotateY: destinoY }}
        transition={{
          duration: duracionGiro ?? 0.5,
          delay: retraso,
          ease: giroInicialY !== undefined ? [0.22, 1, 0.36, 1] : [0.3, 0.7, 0.2, 1],
        }}>
        <div className="a-frente">{codigo && <CaraCarta codigo={codigo} />}</div>
        <div className="a-reverso"><DorsoCarta /></div>
      </motion.div>
    </div>
  );
}

const TONOS = [28, 152, 205, 340, 45, 265, 110, 15];

function tono(sub: string): number {
  let h = 0;
  for (let i = 0; i < sub.length; i++) h = (h * 31 + sub.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  return (partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[1][0]).toUpperCase();
}

/** Avatar con iniciales y anillo de turno que gira y brilla en quien juega. */
export function Avatar({ sub, nombre, enTurno, tam = 48 }: { sub: string; nombre: string; enTurno: boolean; tam?: number }) {
  const reducido = useReducedMotion();
  return (
    <span className="a-avatar" style={{ width: tam, height: tam, ['--tono' as string]: tono(sub) }}>
      <motion.span className="a-anillo" aria-hidden="true"
        animate={{ opacity: enTurno ? 1 : 0, rotate: enTurno && !reducido ? 360 : 0 }}
        transition={{ opacity: { duration: 0.3 }, rotate: enTurno && !reducido
          ? { duration: 4, ease: 'linear', repeat: Infinity } : { duration: 0 } }} />
      <span className="a-iniciales">{iniciales(nombre)}</span>
    </span>
  );
}

/**
 * Registro de anclas (mazo, pozo, asientos, mano) para que los vuelos sepan de donde salen y a donde llegan.
 * Devuelve callbacks de ref estables por nombre.
 */
export function useAnclas() {
  const elementos = useRef(new Map<string, HTMLElement>());
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const anclar = useCallback((nombre: string) => {
    let r = refs.current.get(nombre);
    if (!r) {
      r = (el: HTMLElement | null) => { if (el) elementos.current.set(nombre, el); else elementos.current.delete(nombre); };
      refs.current.set(nombre, r);
    }
    return r;
  }, []);
  const rect = useCallback((nombre: string): DOMRect | null =>
    elementos.current.get(nombre)?.getBoundingClientRect() ?? null, []);
  return { anclar, rect };
}

/** Píldora numérica que late brevemente cuando cambia su valor. */
export function ContadorVivo({ valor, texto }: { valor: number; texto?: string }) {
  const reducido = useReducedMotion();
  const previo = useRef(valor);
  const [pulso, setPulso] = useState(0);
  useEffect(() => {
    if (previo.current !== valor) {
      previo.current = valor;
      if (!reducido) setPulso((p) => p + 1);
    }
  }, [valor, reducido]);
  return (
    <motion.span key={pulso} className="a-contador"
      initial={pulso > 0 && !reducido ? { scale: 1 } : false}
      animate={pulso > 0 && !reducido ? { scale: [1, 1.26, 0.96, 1] } : { scale: 1 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
      {pulso > 0 && !reducido && (
        <motion.span className="a-contador-brillo" aria-hidden="true"
          initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.38 }} />
      )}
      {texto ?? valor}
    </motion.span>
  );
}

/** Transicion de resorte sobria (sin rebote exagerado). */
export const RESORTE = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
