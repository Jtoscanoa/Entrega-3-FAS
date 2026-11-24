// Partida rápida guiada paso a paso sobre la mesa animada real: permite aprender robando del pozo/mazo,
// agrupando juegos, descartando, viendo turnos rivales y cerrando una ronda. Solo presentacion (RD4).
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { infoCarta } from '../../cartas';
import type { Aviso, EventoMesa, Liquidacion, VistaMesa } from '../../estado/tipos';
import { agruparManoVisual } from './agrupacionVisual';
import { nombreCarta } from './comun';

const YO = 'tut-yo';
const RIVALES = ['tut-beto', 'tut-caro'] as const;
const JUGADORES = [YO, ...RIVALES];
const NOMBRES: Record<string, string> = {
  [YO]: 'Tú',
  'tut-beto': 'Beto',
  'tut-caro': 'Carolina',
};

const MANO_INICIAL = ['7C', '4D', '7P', 'KC', '5D', '2D', '7T', 'KD', '2C', '9T'];

interface EstadoTutorial {
  revision: number;
  paso: number;
  esperandoRivales: boolean;
  orden: string[];
  cima: string | null;
  seleccion: number | null;
  nueva: string | null;
  fase: string;
  turnoDe: string;
  numeroTurno: number;
  marcador: Record<string, number>;
  bitacora: string[];
  aviso: Aviso | null;
  liquidacion: Liquidacion | null;
  historial: Liquidacion[];
  eventos: EventoMesa[];
}

function crearEstadoInicial(revision: number): EstadoTutorial {
  return {
    revision,
    paso: 0,
    esperandoRivales: false,
    orden: [...MANO_INICIAL],
    cima: 'KP',
    seleccion: null,
    nueva: null,
    fase: 'ESPERANDO_ROBO',
    turnoDe: YO,
    numeroTurno: 1,
    marcador: { [YO]: 0, 'tut-beto': 0, 'tut-caro': 0 },
    bitacora: ['Práctica rápida: completa 2 turnos hasta cerrar la ronda.'],
    aviso: null,
    liquidacion: null,
    historial: [],
    eventos: [],
  };
}

export interface ControlTutorial {
  vista: VistaMesa;
  revision: number;
  paso: number;
  totalPasos: number;
  esperandoRivales: boolean;
  titulo: string;
  texto: string;
  objetivoSelector: string | null;
  hayLiquidacion: boolean;
  notificarAgrupado: () => void;
  reiniciar: () => void;
  salir: () => void;
}

export function usePartidaTutorial(alCerrar: () => void): ControlTutorial {
  const [st, setSt] = useState<EstadoTutorial>(() => crearEstadoInicial(1));
  const siguienteEvento = useRef(1);
  const timers = useRef<number[]>([]);

  const limpiarTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const programar = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  // Dispara el reparto inicial justo después de montar la mesa para que se animen los vuelos de apertura.
  useEffect(() => {
    limpiarTimers();
    siguienteEvento.current = 1;
    programar(() => {
      setSt((prev) => ({
        ...prev,
        eventos: [{ id: siguienteEvento.current++, tipo: 'reparto', cartas: MANO_INICIAL.length }],
      }));
    }, 90);
    return limpiarTimers;
  }, [st.revision, limpiarTimers, programar]);

  const reiniciar = useCallback(() => {
    limpiarTimers();
    siguienteEvento.current = 1;
    setSt((prev) => crearEstadoInicial(prev.revision + 1));
  }, [limpiarTimers]);

  const salir = useCallback(() => {
    limpiarTimers();
    alCerrar();
  }, [limpiarTimers, alCerrar]);

  const notificarAgrupado = useCallback(() => {
    setSt((prev) => (prev.paso === 0 ? { ...prev, paso: 1, aviso: null } : prev));
  }, []);

  const seleccionar = useCallback((indice: number | null) => {
    setSt((prev) => {
      const elegido = indice !== null ? prev.orden[indice] ?? null : null;
      let paso = prev.paso;
      if (prev.paso === 2 && elegido === '9T') paso = 3;
      else if (prev.paso === 3 && elegido !== '9T') paso = 2;
      return { ...prev, seleccion: indice, paso, aviso: null };
    });
  }, []);

  const reordenar = useCallback((orden: string[]) => {
    setSt((prev) => ({ ...prev, orden }));
  }, []);

  const ordenarPorPinta = useCallback(() => {
    setSt((prev) => ({
      ...prev,
      seleccion: null,
      orden: [...prev.orden].sort((a, b) => {
        const ia = infoCarta(a);
        const ib = infoCarta(b);
        return ia.pinta.localeCompare(ib.pinta) || ia.rango - ib.rango;
      }),
    }));
  }, []);

  const ordenarPorValor = useCallback(() => {
    setSt((prev) => ({
      ...prev,
      seleccion: null,
      orden: [...prev.orden].sort((a, b) => {
        const ia = infoCarta(a);
        const ib = infoCarta(b);
        return ia.rango - ib.rango || ia.pinta.localeCompare(ib.pinta);
      }),
    }));
  }, []);

  const robar = useCallback((delDescarte: boolean) => {
    setSt((prev) => {
      if (prev.esperandoRivales || prev.fase !== 'ESPERANDO_ROBO') return prev;
      if (prev.paso === 0) {
        return {
          ...prev,
          aviso: { tipo: 'info', cierre: false, texto: 'Primero pulsa «Agrupar juegos» para ordenar tus cartas y ver qué terna te falta.' },
        };
      }
      if (prev.paso === 1) {
        if (!delDescarte) {
          return {
            ...prev,
            aviso: { tipo: 'info', cierre: false, texto: 'Para esta jugada te conviene el Rey de picas: toca «Robar del pozo».' },
          };
        }
        const { orden } = agruparManoVisual([...prev.orden, 'KP']);
        const evRobo: EventoMesa = { id: siguienteEvento.current++, tipo: 'robo', jugadorId: YO, origen: 'DESCARTE' };
        const evRecibida: EventoMesa = { id: siguienteEvento.current++, tipo: 'recibida', carta: 'KP', origen: 'DESCARTE' };
        return {
          ...prev,
          paso: 2,
          orden,
          cima: null,
          seleccion: null,
          nueva: 'KP',
          fase: 'ESPERANDO_DESCARTE',
          aviso: null,
          bitacora: ['Robaste Rey de picas del pozo.', ...prev.bitacora].slice(0, 8),
          eventos: [...prev.eventos, evRobo, evRecibida],
        };
      }
      if (prev.paso === 4) {
        if (delDescarte) {
          return {
            ...prev,
            aviso: { tipo: 'info', cierre: false, texto: 'El 8♠ del pozo no te sirve; toca «Robar del mazo».' },
          };
        }
        const { orden } = agruparManoVisual([...prev.orden, '6D']);
        const evRobo: EventoMesa = { id: siguienteEvento.current++, tipo: 'robo', jugadorId: YO, origen: 'MAZO' };
        const evRecibida: EventoMesa = { id: siguienteEvento.current++, tipo: 'recibida', carta: '6D', origen: 'MAZO' };
        return {
          ...prev,
          paso: 5,
          orden,
          seleccion: null,
          nueva: '6D',
          fase: 'ESPERANDO_DESCARTE',
          aviso: null,
          bitacora: ['Robaste 6 de diamantes del mazo.', ...prev.bitacora].slice(0, 8),
          eventos: [...prev.eventos, evRobo, evRecibida],
        };
      }
      return prev;
    });
  }, []);

  const descartar = useCallback(() => {
    let disparaRivales = false;
    setSt((prev) => {
      if (prev.esperandoRivales || prev.fase !== 'ESPERANDO_DESCARTE') return prev;
      const cartaSel = prev.seleccion !== null ? prev.orden[prev.seleccion] ?? null : null;
      if (!cartaSel) return prev;

      if (prev.paso === 2 || prev.paso === 3) {
        if (cartaSel !== '9T') {
          return {
            ...prev,
            aviso: { tipo: 'info', cierre: false, texto: 'Elige el 9 de tréboles (9♣) al final de tu mano para descartar los puntos sueltos más altos.' },
          };
        }
        disparaRivales = true;
        const orden = prev.orden.filter((_, i) => i !== prev.seleccion);
        const evDescarte: EventoMesa = { id: siguienteEvento.current++, tipo: 'descarte', jugadorId: YO, carta: '9T' };
        return {
          ...prev,
          paso: 3,
          esperandoRivales: true,
          orden,
          cima: '9T',
          seleccion: null,
          nueva: null,
          fase: 'ESPERANDO_ROBO',
          turnoDe: 'tut-beto',
          aviso: null,
          bitacora: ['Descartaste 9 de tréboles.', ...prev.bitacora].slice(0, 8),
          eventos: [...prev.eventos, evDescarte],
        };
      }

      if (prev.paso === 5) {
        return {
          ...prev,
          aviso: { tipo: 'info', cierre: false, texto: '¡Ya tienes juego ganador! Usa «Cerrar ronda con esta carta» en lugar de solo descartar.' },
        };
      }
      return prev;
    });

    if (!disparaRivales) return;

    programar(() => {
      setSt((prev) => ({
        ...prev,
        bitacora: ['Beto robó del mazo.', ...prev.bitacora].slice(0, 8),
        eventos: [...prev.eventos, { id: siguienteEvento.current++, tipo: 'robo', jugadorId: 'tut-beto', origen: 'MAZO' }],
      }));
    }, 450);

    programar(() => {
      setSt((prev) => ({
        ...prev,
        cima: 'JC',
        turnoDe: 'tut-caro',
        numeroTurno: prev.numeroTurno + 1,
        bitacora: ['Beto descartó Jota de corazones.', ...prev.bitacora].slice(0, 8),
        eventos: [...prev.eventos, { id: siguienteEvento.current++, tipo: 'descarte', jugadorId: 'tut-beto', carta: 'JC' }],
      }));
    }, 950);

    programar(() => {
      setSt((prev) => ({
        ...prev,
        bitacora: ['Carolina robó del mazo.', ...prev.bitacora].slice(0, 8),
        eventos: [...prev.eventos, { id: siguienteEvento.current++, tipo: 'robo', jugadorId: 'tut-caro', origen: 'MAZO' }],
      }));
    }, 1400);

    programar(() => {
      setSt((prev) => ({
        ...prev,
        cima: '8P',
        turnoDe: YO,
        numeroTurno: prev.numeroTurno + 1,
        fase: 'ESPERANDO_ROBO',
        esperandoRivales: false,
        paso: 4,
        bitacora: ['Carolina descartó 8 de picas. Es tu turno.', ...prev.bitacora].slice(0, 8),
        eventos: [...prev.eventos, { id: siguienteEvento.current++, tipo: 'descarte', jugadorId: 'tut-caro', carta: '8P' }],
      }));
    }, 1900);
  }, [programar]);

  const cerrar = useCallback(() => {
    setSt((prev) => {
      if (prev.esperandoRivales || prev.fase !== 'ESPERANDO_DESCARTE') return prev;
      const cartaSel = prev.seleccion !== null ? prev.orden[prev.seleccion] ?? null : null;
      if (!cartaSel) return prev;

      if (prev.paso <= 3) {
        return {
          ...prev,
          aviso: { tipo: 'info', cierre: false, texto: 'Aún te falta armar tu tercera combinación; primero pulsa «Descartar carta».' },
        };
      }

      if (prev.paso === 5) {
        if (cartaSel !== '2C' && cartaSel !== '2D') {
          const msg = 'Si descartas esa carta desarmas un juego; elige el 2♣ o el 2♦ para cerrar.';
          return {
            ...prev,
            aviso: { tipo: 'error', cierre: true, texto: msg },
            eventos: [...prev.eventos, { id: siguienteEvento.current++, tipo: 'rechazo', motivo: msg }],
          };
        }
        const orden = prev.orden.filter((_, i) => i !== prev.seleccion);
        const puntosRonda = { [YO]: -10, 'tut-beto': 24, 'tut-caro': 38 };
        const marcador = { [YO]: -10, 'tut-beto': 24, 'tut-caro': 38 };
        const liq: Liquidacion = {
          ronda: 1,
          cerrador: YO,
          tipoCierre: 'COMPLETO',
          puntosRonda,
          marcador,
          eliminados: [],
        };
        const evDescarte: EventoMesa = { id: siguienteEvento.current++, tipo: 'descarte', jugadorId: YO, carta: cartaSel };
        const evLiq: EventoMesa = { id: siguienteEvento.current++, tipo: 'liquidacion', ronda: 1 };
        return {
          ...prev,
          paso: 6,
          orden,
          cima: cartaSel,
          seleccion: null,
          nueva: null,
          fase: 'LIQUIDACION',
          marcador,
          aviso: null,
          liquidacion: liq,
          historial: [liq],
          bitacora: [`¡Cerraste la ronda con ${nombreCarta(cartaSel)}!`, ...prev.bitacora].slice(0, 8),
          eventos: [...prev.eventos, evDescarte, evLiq],
        };
      }
      return prev;
    });
  }, []);

  const mover = useCallback((desde: number, hasta: number) => {
    setSt((prev) => {
      if (hasta < 0 || hasta >= prev.orden.length) return prev;
      const orden = [...prev.orden];
      const [item] = orden.splice(desde, 1);
      orden.splice(hasta, 0, item);
      return { ...prev, orden, seleccion: hasta };
    });
  }, []);

  const cerrarLiquidacion = useCallback(() => {
    setSt((prev) => ({ ...prev, liquidacion: null }));
  }, []);

  const cartaSel = st.seleccion !== null ? st.orden[st.seleccion] ?? null : null;
  const miTurno = st.turnoDe === YO && !st.esperandoRivales;
  const debeRobar = miTurno && st.fase === 'ESPERANDO_ROBO';
  const debeDescartar = miTurno && st.fase === 'ESPERANDO_DESCARTE';

  const instruccion = useMemo(() => {
    if (st.esperandoRivales) return `Turno de ${NOMBRES[st.turnoDe] ?? 'rival'}…`;
    if (st.paso === 0) return 'Paso 1: ordena tu mano con «Agrupar juegos».';
    if (debeRobar && st.paso === 1) return 'Tu turno: roba el K♠ del pozo.';
    if (debeRobar && st.paso === 4) return 'Tu turno: roba una carta del mazo.';
    if (debeDescartar && (st.paso === 2 || st.paso === 3)) return 'Elige el 9♣ y descártalo para pasar el turno.';
    if (debeDescartar && st.paso === 5) return 'Elige el 2♣ o el 2♦ y cierra la ronda.';
    return 'Práctica completada.';
  }, [st.esperandoRivales, st.turnoDe, st.paso, debeRobar, debeDescartar]);

  const vista = useMemo<VistaMesa>(() => ({
    yo: YO,
    codigo: 'PRÁCTICA',
    e: {
      ronda: 1,
      orden: st.orden,
      cima: st.cima,
      marcador: st.marcador,
      turnoDe: st.turnoDe,
      numeroTurno: st.numeroTurno,
      fase: st.fase,
      modalidad: 'APUNTADO_101',
      umbral: 101,
      robarDelDescarte: true,
      eliminados: [],
      finalizada: false,
      venceEn: null,
      nueva: st.nueva,
      turnoDesde: null,
      ausentes: [],
    },
    conectado: true,
    nombre: (sub) => (sub ? NOMBRES[sub] ?? sub : ''),
    alias: (sub) => NOMBRES[sub] ?? sub,
    jugadores: JUGADORES,
    seleccion: st.seleccion,
    cartaSel,
    miTurno,
    debeRobar,
    debeDescartar,
    segundos: null,
    instruccion,
    aviso: st.aviso,
    bitacora: st.bitacora,
    liquidacion: st.liquidacion,
    historial: st.historial,
    fin: null,
    eventos: st.eventos,
    chat: [],
    enviarChat: () => undefined,
    seleccionar,
    robar,
    descartar,
    cerrar,
    mover,
    reordenar,
    ordenarPorPinta,
    ordenarPorValor,
    cerrarLiquidacion,
    salir,
  }), [
    st, cartaSel, miTurno, debeRobar, debeDescartar, instruccion,
    seleccionar, robar, descartar, cerrar, mover, reordenar, ordenarPorPinta, ordenarPorValor, cerrarLiquidacion, salir,
  ]);

  const meta = useMemo(() => {
    if (st.esperandoRivales) {
      return {
        titulo: 'Turno de los rivales…',
        texto: 'Observa cómo Beto y Carolina roban y descartan rápidamente.',
        objetivoSelector: null,
      };
    }
    switch (st.paso) {
      case 0:
        return {
          titulo: 'Paso 1 de 7 · Ordena tu mano',
          texto: 'Recibiste 10 cartas. Pulsa «Agrupar juegos» para juntar tus combinaciones y ver qué cartas te faltan.',
          objetivoSelector: '[data-tut="agrupar"]',
        };
      case 1:
        return {
          titulo: 'Paso 2 de 7 · Roba del pozo',
          texto: 'Tienes dos Reyes (K♥ y K♦) y en el pozo brilla el K♠. Toca «Robar del pozo» para completar tu segunda terna.',
          objetivoSelector: '[data-tut="pozo"]',
        };
      case 2:
        return {
          titulo: 'Paso 3 de 7 · Elige tu carta más alta',
          texto: 'Ahora tienes 11 cartas y debes soltar una. Toca el 9 de tréboles (9♣) en tu mano para deshacerte de esos 9 puntos.',
          objetivoSelector: '[data-id="9T#0"]',
        };
      case 3:
        return {
          titulo: 'Paso 4 de 7 · Descarta para pasar el turno',
          texto: 'Con el 9♣ seleccionado, pulsa «Descartar carta» para terminar tu primer turno y darle paso a Beto y Carolina.',
          objetivoSelector: '[data-tut="descartar"]',
        };
      case 4:
        return {
          titulo: 'Paso 5 de 7 · Roba del mazo',
          texto: '¡Volvió tu turno! El 8♠ del pozo no te ayuda con 4♦ y 5♦. Toca «Robar del mazo» para probar suerte.',
          objetivoSelector: '[data-tut="mazo"]',
        };
      case 5:
        if (cartaSel === '2C' || cartaSel === '2D') {
          return {
            titulo: 'Paso 6 de 7 · ¡Cierra la ronda!',
            texto: 'Tus otras 10 cartas forman 3 juegos y solo 2 puntos sueltos (< 5). Pulsa «Cerrar ronda con esta carta» para ganar.',
            objetivoSelector: '[data-tut="cerrar"]',
          };
        }
        return {
          titulo: 'Paso 6 de 7 · Prepara el cierre',
          texto: '¡Salió el 6♦ y completaste 3 juegos! En Apuntado cierras si tu carta suelta vale menos de 5 puntos: toca el 2♣ o el 2♦.',
          objetivoSelector: '[data-id="2C#0"]',
        };
      default:
        return {
          titulo: 'Paso 7 de 7 · ¡Ganaste la ronda!',
          texto: 'Restaste 10 puntos por cerrar y tus rivales sumaron sus cartas sueltas. Cuando alguien llega a 101 queda eliminado.',
          objetivoSelector: null,
        };
    }
  }, [st.esperandoRivales, st.paso, cartaSel]);

  return {
    vista,
    revision: st.revision,
    paso: st.paso,
    totalPasos: 7,
    esperandoRivales: st.esperandoRivales,
    hayLiquidacion: !!st.liquidacion,
    notificarAgrupado,
    reiniciar,
    salir,
    ...meta,
  };
}

export function GuiaTutorial({ tut, contenedorRef }: { tut: ControlTutorial; contenedorRef: RefObject<HTMLDivElement | null> }) {
  const reducido = useReducedMotion();
  const [rectObj, setRectObj] = useState<DOMRect | null>(null);

  useEffect(() => {
    const fn = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') tut.salir();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [tut.salir]);

  const clavePaso = `${tut.revision}-${tut.paso}-${tut.objetivoSelector ?? 'none'}`;

  useEffect(() => {
    if (!tut.objetivoSelector || tut.hayLiquidacion) {
      setRectObj(null);
      return undefined;
    }

    const buscar = () => contenedorRef.current?.querySelector<HTMLElement>(tut.objetivoSelector!) ?? null;
    const actualizar = () => {
      const el = buscar();
      setRectObj(el ? el.getBoundingClientRect() : null);
    };

    const tScroll = window.setTimeout(() => {
      const el = buscar();
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 72 || r.bottom > window.innerHeight - 130) {
        el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
      }
      setRectObj(el.getBoundingClientRect());
    }, 120);

    actualizar();
    const intervalo = window.setInterval(actualizar, 120);
    window.addEventListener('scroll', actualizar, true);
    window.addEventListener('resize', actualizar);
    return () => {
      window.clearTimeout(tScroll);
      window.clearInterval(intervalo);
      window.removeEventListener('scroll', actualizar, true);
      window.removeEventListener('resize', actualizar);
    };
  }, [clavePaso, tut.objetivoSelector, tut.hayLiquidacion, contenedorRef, reducido]);

  const abajo = rectObj ? (rectObj.top + rectObj.height / 2) > window.innerHeight * 0.5 : false;
  const clasePos = tut.hayLiquidacion ? 'arriba liquidacion' : abajo ? 'arriba' : 'abajo';

  return (
    <div className="a-guia-capa" role="region" aria-label="Guía interactiva paso a paso">
      <AnimatePresence>
        {rectObj && !tut.hayLiquidacion && rectObj.width > 0 && rectObj.height > 0 && (
          <motion.div
            key={clavePaso}
            className="a-guia-marco"
            aria-hidden="true"
            style={{
              left: rectObj.left - 6,
              top: rectObj.top - 6,
              width: rectObj.width + 12,
              height: rectObj.height + 12,
            }}
            initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reducido ? { opacity: 1 } : { opacity: 1, scale: [1, 1.025, 1] }}
            exit={{ opacity: 0 }}
            transition={reducido
              ? { duration: 0.15 }
              : { opacity: { duration: 0.2 }, scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        key={`tarjeta-${tut.revision}-${tut.paso}-${tut.esperandoRivales ? 'esp' : 'act'}`}
        className={['a-guia-tarjeta', clasePos].join(' ')}
        aria-live="polite"
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: abajo || tut.hayLiquidacion ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="a-guia-cabecera">
          <div className="a-guia-pasos" aria-label={`Paso ${tut.paso + 1} de ${tut.totalPasos}`}>
            {Array.from({ length: tut.totalPasos }, (_, i) => (
              <span key={i} className={[i < tut.paso ? 'hecho' : '', i === tut.paso ? 'actual' : ''].join(' ')} />
            ))}
          </div>
          <span className="a-sobretitulo">Práctica guiada</span>
        </div>
        <h3>{tut.titulo}</h3>
        <p className="a-tenue a-pequeno">{tut.texto}</p>
        <div className="a-tut-pie">
          <button type="button" className="a-boton suave" onClick={tut.reiniciar}>Reiniciar</button>
          {tut.paso >= tut.totalPasos - 1 ? (
            <button type="button" className="a-boton principal" onClick={tut.salir}>¡Listo para jugar!</button>
          ) : (
            <button type="button" className="a-boton fantasma" onClick={tut.salir}>Salir</button>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
