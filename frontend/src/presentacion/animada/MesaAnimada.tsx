// Version animada de la mesa. Recibe solo lo que entrega useMesa() (FF-19); no decide si una jugada es valida (RD4):
// habilita botones segun el turno y la fase que comunica el servidor, igual que la ligera.
import { AnimatePresence, motion, MotionConfig, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ayudaCierre, NOMBRE_MODALIDAD } from '../../mensajes';
import type { EventoMesa, VistaMesa } from '../../estado/tipos';
import { Avatar, Carta, DorsoCarta, nombreCarta, useAnclas } from './comun';
import { ItemMano, itemsDe, Mano } from './Mano';
import { PanelFin, PanelLiquidacion } from './Paneles';
import { RelojTurno } from './RelojTurno';
import { CapaVuelos, Vuelo } from './Vuelos';
import { FranjaRed, useEstadoRed } from './EstadoRed';
import './tema';

export default function MesaAnimada({ mesa }: { mesa: VistaMesa }) {
  return (
    <MotionConfig reducedMotion="user">
      <Mesa mesa={mesa} />
    </MotionConfig>
  );
}

type Anclar = (nombre: string) => (el: HTMLElement | null) => void;

function Asiento({ mesa, sub, k, total, anclar, propio = false }:
  { mesa: VistaMesa; sub: string; k: number; total: number; anclar: Anclar; propio?: boolean }) {
  const { e } = mesa;
  const enTurno = e.turnoDe === sub && !e.finalizada;
  const eliminado = e.eliminados.includes(sub);
  const ausente = e.ausentes.includes(sub);
  const d = total > 1 ? (k - (total - 1) / 2) / ((total - 1) / 2) : 0;
  const puntos = e.marcador[sub] ?? 0;
  return (
    <motion.div ref={anclar(`asiento:${sub}`)} role="group" aria-label={`${mesa.nombre(sub)}, ${puntos} puntos${enTurno ? ', en turno' : ''}${ausente ? ', sin conexión' : ''}`}
      className={['a-asiento', propio ? 'propio' : '', enTurno ? 'en-turno' : '', eliminado ? 'eliminado' : '', ausente ? 'ausente' : ''].join(' ')}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: eliminado ? 0.42 : ausente ? 0.55 : 1, y: propio ? 0 : d * d * 16 }}
      transition={{ duration: 0.4 }}>
      <Avatar sub={sub} nombre={mesa.alias(sub)} enTurno={enTurno} tam={propio ? 44 : 48} />
      <span className="a-asiento-texto">
        <span className="a-asiento-nombre">{mesa.nombre(sub)}</span>
        <span className="a-asiento-puntos">
          <motion.b key={puntos} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>{puntos}</motion.b>
          {e.modalidad === 'APUNTADO_101' && <small> / {e.umbral}</small>}
        </span>
        {eliminado && <span className="a-etiqueta">eliminado</span>}
        <AnimatePresence initial={false}>
          {ausente && (
            <motion.span key="sin-red" className="a-etiqueta a-sin-red" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M2 6.5a9 9 0 0 1 12 0M4.5 9a5.5 5.5 0 0 1 7 0M7 11.5a2 2 0 0 1 2 0M2.5 2.5l11 11" fill="none"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              sin conexión
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {!propio && (
        <span className="a-dorsos" aria-hidden="true">
          {[0, 1, 2].map((i) => <span key={i} style={{ transform: `rotate(${(i - 1) * 13}deg)` }}><DorsoCarta /></span>)}
        </span>
      )}
    </motion.div>
  );
}

function Mesa({ mesa }: { mesa: VistaMesa }) {
  const { e, seleccion, cartaSel, aviso } = mesa;
  const reducido = !!useReducedMotion();
  const { anclar, rect } = useAnclas();
  const manoRef = useRef<HTMLUListElement>(null);
  const [marcoMano, animarMano] = useAnimate<HTMLDivElement>();
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(new Set());
  const [cimaRetenida, setCimaRetenida] = useState<string | null | undefined>(undefined);
  const [avisoTurno, setAvisoTurno] = useState(false);
  const siguienteVuelo = useRef(1);
  const visto = useRef(mesa.eventos.length ? mesa.eventos[mesa.eventos.length - 1].id : 0);
  const cimaAnterior = useRef(e.cima);
  const rectDescarte = useRef<DOMRect | null>(null);

  const red = useEstadoRed(mesa.conectado);
  const items = useMemo(() => itemsDe(e.orden), [e.orden]);
  const rivales = mesa.jugadores.filter((s) => s !== mesa.yo);
  const total = e.venceEn && e.turnoDesde ? Math.max(1, Math.round((new Date(e.venceEn).getTime() - e.turnoDesde) / 1000)) : 0;
  const cimaMostrada = cimaRetenida !== undefined ? cimaRetenida : e.cima;

  const rectDeItem = (id: string) =>
    manoRef.current?.querySelector(`[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() ?? null;

  // Los eventos nuevos se animan antes de pintar (useLayoutEffect): asi la carta que llega no parpadea en la mano.
  useLayoutEffect(() => {
    const nuevos = mesa.eventos.filter((ev) => ev.id > visto.current);
    if (!nuevos.length) return;
    visto.current = nuevos[nuevos.length - 1].id;
    const lanzados: Vuelo[] = [];
    const aOcultar = new Set<string>();
    const lanzar = (v: Omit<Vuelo, 'id'>) => lanzados.push({ ...v, id: siguienteVuelo.current++ });
    const mostrar = (id: string) => setOcultas((s) => { const n = new Set(s); n.delete(id); return n; });

    const procesar = (ev: EventoMesa) => {
      if (ev.tipo === 'rechazo') {
        if (!reducido && marcoMano.current) {
          void animarMano(marcoMano.current, { x: [0, -12, 12, -9, 9, -5, 5, 0] }, { duration: 0.5 });
        }
        return;
      }
      if (reducido) return;
      const mazo = rect('mazo');
      const pozo = rect('pozo');
      if (ev.tipo === 'reparto' && mazo) {
        items.forEach((it, i) => {
          const r = rectDeItem(it.id);
          if (!r) return;
          aOcultar.add(it.id);
          lanzar({ desde: mazo, hasta: r, carta: it.codigo, voltear: true, retraso: 0.15 + i * 0.07, alAterrizar: () => mostrar(it.id) });
        });
        rivales.forEach((s, k) => {
          const r = rect(`asiento:${s}`);
          for (let j = 0; r && j < 2; j++) lanzar({ desde: mazo, hasta: r, carta: null, voltear: false, retraso: 0.1 + (k * 2 + j) * 0.08 });
        });
      } else if (ev.tipo === 'robo' && ev.jugadorId !== mesa.yo) {
        const desde = ev.origen === 'DESCARTE' ? pozo : mazo;
        const hasta = rect(`asiento:${ev.jugadorId}`);
        if (desde && hasta) {
          lanzar({ desde, hasta, carta: ev.origen === 'DESCARTE' ? cimaAnterior.current : null, voltear: false, retraso: 0 });
        }
      } else if (ev.tipo === 'recibida') {
        const it = [...items].reverse().find((x) => x.codigo === ev.carta);
        const desde = ev.origen === 'DESCARTE' ? pozo : mazo;
        const hasta = it ? rectDeItem(it.id) : null;
        if (it && desde && hasta) {
          aOcultar.add(it.id);
          lanzar({ desde, hasta, carta: ev.carta, voltear: ev.origen !== 'DESCARTE', retraso: 0, alAterrizar: () => mostrar(it.id) });
        }
      } else if (ev.tipo === 'descarte' && pozo) {
        const desde = ev.jugadorId === mesa.yo
          ? rectDescarte.current ?? manoRef.current?.getBoundingClientRect() ?? null
          : rect(`asiento:${ev.jugadorId}`);
        rectDescarte.current = null;
        if (desde) {
          setCimaRetenida(cimaAnterior.current);
          lanzar({ desde, hasta: pozo, carta: ev.carta, voltear: false, retraso: 0, alAterrizar: () => setCimaRetenida(undefined) });
        }
      }
    };
    nuevos.forEach(procesar);
    if (aOcultar.size) setOcultas((s) => new Set([...s, ...aOcultar]));
    if (lanzados.length) setVuelos((v) => [...v, ...lanzados]);
  });

  useLayoutEffect(() => { cimaAnterior.current = e.cima; }, [e.cima]);

  useEffect(() => {
    if (!mesa.miTurno) { setAvisoTurno(false); return undefined; }
    setAvisoTurno(true);
    const t = setTimeout(() => setAvisoTurno(false), 2200);
    return () => clearTimeout(t);
  }, [mesa.miTurno, e.numeroTurno]);

  const alReordenar = (nuevos: ItemMano[]) => {
    const elegida = seleccion !== null ? items[seleccion]?.id : null;
    mesa.reordenar(nuevos.map((x) => x.codigo));
    if (elegida) mesa.seleccionar(nuevos.findIndex((x) => x.id === elegida));
  };
  const moverElegida = (delta: number) => {
    if (seleccion === null) return;
    const destino = seleccion + delta;
    if (destino < 0 || destino >= e.orden.length) return;
    const o = [...e.orden];
    [o[seleccion], o[destino]] = [o[destino], o[seleccion]];
    mesa.reordenar(o);
    mesa.seleccionar(destino);
  };
  const descartar = () => {
    rectDescarte.current = seleccion !== null && items[seleccion] ? rectDeItem(items[seleccion].id) : null;
    mesa.descartar();
  };

  return (
    <div className="a-raiz a-mesa">
      <header className="a-encabezado">
        <span className="a-marca">Mesa 101</span>
        <span className="a-info">{NOMBRE_MODALIDAD[e.modalidad] ?? 'Partida'} · Ronda {e.ronda} · Sala <b>{mesa.codigo}</b></span>
        <span className={['a-conexion', mesa.conectado ? 'ok' : 'caida'].join(' ')} role="status">
          <motion.i aria-hidden="true" animate={mesa.conectado ? { opacity: 1 } : { opacity: [1, 0.25, 1] }}
            transition={mesa.conectado ? { duration: 0.3 } : { duration: 1.1, repeat: Infinity }} />
          {mesa.conectado ? 'Conectado' : 'Reconectando…'}
        </span>
        <button type="button" className="a-boton fantasma" onClick={mesa.salir}>Salir</button>
      </header>

      <FranjaRed red={red} />

      <motion.div className="a-cuerpo" animate={{ opacity: red === 'caida' ? 0.45 : 1 }} transition={{ duration: 0.4 }}
        aria-busy={red === 'caida'}>
        <div className="a-juego">
          <section className="a-fieltro" aria-label="Mesa de juego">
            <span className="a-brillo-capa" aria-hidden="true"><span className="a-brillo" /></span>
            <div className="a-rivales">
              {rivales.map((s, k) => <Asiento key={s} mesa={mesa} sub={s} k={k} total={rivales.length} anclar={anclar} />)}
            </div>

            <div className="a-centro">
              <motion.button type="button" className={['a-monton a-mazo', mesa.debeRobar ? 'activo' : ''].join(' ')}
                ref={anclar('mazo')} disabled={!mesa.debeRobar} onClick={() => mesa.robar(false)}
                whileHover={mesa.debeRobar ? { y: -4 } : undefined} whileTap={mesa.debeRobar ? { scale: 0.96 } : undefined}>
                <span className="a-pila" aria-hidden="true">
                  {[0, 1, 2].map((i) => <span key={i} style={{ transform: `translate(${i * -2}px, ${i * -2}px)` }}><DorsoCarta /></span>)}
                </span>
                <span className="a-rotulo">{mesa.debeRobar ? 'Robar del mazo' : 'Mazo'}</span>
              </motion.button>

              <div className="a-reloj-hueco">
                <AnimatePresence>
                  {mesa.segundos !== null && total > 0 && !e.finalizada && (
                    <motion.div key="reloj" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      <RelojTurno segundos={Math.min(mesa.segundos, total)} total={total} mio={mesa.miTurno} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button type="button" className={['a-monton a-pozo', mesa.debeRobar && e.robarDelDescarte && cimaMostrada ? 'activo' : ''].join(' ')}
                ref={anclar('pozo')} disabled={!mesa.debeRobar || !e.robarDelDescarte || !cimaMostrada}
                onClick={() => mesa.robar(true)} aria-label={cimaMostrada ? `Pozo: ${nombreCarta(cimaMostrada)}` : 'Pozo vacío'}
                whileHover={mesa.debeRobar && e.robarDelDescarte ? { y: -4 } : undefined}>
                <span className="a-pila-pozo" aria-hidden="true">
                  <span className="a-borde-pozo b1" /><span className="a-borde-pozo b2" />
                  {cimaMostrada
                    ? <motion.span key={cimaMostrada} className="a-cima" initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}><Carta codigo={cimaMostrada} /></motion.span>
                    : <span className="a-vacio">Vacío</span>}
                </span>
                <span className="a-rotulo">{mesa.debeRobar && e.robarDelDescarte ? 'Robar del pozo' : 'Pozo'}</span>
              </motion.button>
            </div>

            <motion.p key={mesa.instruccion} className={['a-instruccion', mesa.miTurno ? 'mia' : ''].join(' ')}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{mesa.instruccion}</motion.p>

            <div className="a-yo">
              <Asiento mesa={mesa} sub={mesa.yo} k={0} total={1} anclar={anclar} propio />
            </div>

            <AnimatePresence>
              {avisoTurno && (
                <motion.div className="a-toast-turno" aria-hidden="true" initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>Es tu turno</motion.div>
              )}
            </AnimatePresence>
          </section>

          <AnimatePresence>
            {aviso && (
              <motion.div key={aviso.texto} role="alert" className={['a-aviso', aviso.tipo].join(' ')}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <strong>{aviso.texto}</strong>
                {aviso.cierre && e.modalidad && <span>{ayudaCierre(e.modalidad)}</span>}
              </motion.div>
            )}
          </AnimatePresence>

          <section className="a-zona-mano" aria-label="Tu mano">
            <div className="a-mano-cabecera">
              <h2>Tu mano <span className="a-contador">{e.orden.length}</span></h2>
              <div className="a-fila">
                <button type="button" className="a-boton suave" onClick={mesa.ordenarPorPinta}>Ordenar por pinta</button>
                <button type="button" className="a-boton suave" onClick={mesa.ordenarPorValor}>Ordenar por número</button>
              </div>
            </div>
            <div className="a-mano-marco" ref={marcoMano}>
              <Mano ref={manoRef} items={items} seleccion={seleccion} ocultas={ocultas} nueva={e.nueva}
                alSeleccionar={mesa.seleccionar} alReordenar={alReordenar} />
            </div>
            <div className="a-mover" aria-live="polite">
              {cartaSel ? (
                <>
                  <button type="button" className="a-boton suave" onClick={() => moverElegida(-1)} disabled={seleccion === 0}>← Mover</button>
                  <span>{nombreCarta(cartaSel)}</span>
                  <button type="button" className="a-boton suave" onClick={() => moverElegida(1)} disabled={seleccion === e.orden.length - 1}>Mover →</button>
                </>
              ) : <span className="a-tenue">Arrastra para agrupar ternas y cuartas; toca una carta para elegirla.</span>}
            </div>
            <div className="a-acciones">
              <motion.button type="button" className="a-boton principal" disabled={!mesa.debeDescartar || !cartaSel}
                onClick={descartar} whileTap={{ scale: 0.97 }}>Descartar carta</motion.button>
              <motion.button type="button" className="a-boton cerrar" disabled={!mesa.debeDescartar || !cartaSel}
                onClick={mesa.cerrar} whileTap={{ scale: 0.97 }}>Cerrar ronda con esta carta</motion.button>
            </div>
            {e.modalidad && <p className="a-tenue a-pequeno">{ayudaCierre(e.modalidad)}</p>}
          </section>
        </div>

        <aside className="a-lateral" aria-label="Lo último">
          <h2>Lo último</h2>
          <ul className="a-bitacora">
            <AnimatePresence initial={false}>
              {mesa.bitacora.map((t, i) => {
                const vez = mesa.bitacora.slice(i + 1).filter((x) => x === t).length;
                return (
                  <motion.li key={`${t}|${vez}`} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: i === 0 ? 1 : 0.72, x: 0 }}
                    exit={{ opacity: 0 }}>{t}</motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {mesa.historial.length > 0 && (
            <details className="a-historial">
              <summary>Historial de rondas</summary>
              <table>
                <thead><tr><th>Ronda</th>{mesa.jugadores.map((s) => <th key={s}>{mesa.nombre(s)}</th>)}</tr></thead>
                <tbody>{mesa.historial.map((h) => (
                  <tr key={h.ronda}><td>{h.ronda}</td>{mesa.jugadores.map((s) => (
                    <td key={s}>{s === h.cerrador ? `${h.puntosRonda[s] ?? 0} ✓` : h.puntosRonda[s] ?? '—'}</td>))}</tr>
                ))}</tbody>
              </table>
            </details>
          )}
        </aside>
      </motion.div>

      <CapaVuelos vuelos={vuelos} alTerminar={(id) => setVuelos((v) => v.filter((x) => x.id !== id))} />
      <AnimatePresence>
        {mesa.liquidacion && !mesa.fin && <PanelLiquidacion key={`liq-${mesa.liquidacion.ronda}`} mesa={mesa} l={mesa.liquidacion} />}
      </AnimatePresence>
      <AnimatePresence>{mesa.fin && <PanelFin key="fin" mesa={mesa} fin={mesa.fin} />}</AnimatePresence>
      <div className="a-sr" aria-live="polite">{mesa.miTurno ? `Es tu turno. ${mesa.instruccion}` : ''}</div>
    </div>
  );
}
