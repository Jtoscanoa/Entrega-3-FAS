// Version animada de la mesa. Recibe solo lo que entrega useMesa() (FF-19); no decide si una jugada es valida (RD4):
// habilita botones segun el turno y la fase que comunica el servidor, igual que la ligera.
import { AnimatePresence, motion, MotionConfig, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ayudaCierre, NOMBRE_MODALIDAD } from '../../mensajes';
import type { EventoMesa, VistaMesa } from '../../estado/tipos';
import { Avatar, Carta, ContadorVivo, DorsoCarta, nombreCarta, useAnclas } from './comun';
import { ItemMano, itemsDe, Mano } from './Mano';
import { PanelFin, PanelLiquidacion } from './Paneles';
import { RelojTurno } from './RelojTurno';
import { CapaVuelos, Vuelo } from './Vuelos';
import { FranjaRed, useEstadoRed } from './EstadoRed';
import { useMotorParticulas } from './Particulas';
import './tema';

export default function MesaAnimada({ mesa }: { mesa: VistaMesa }) {
  return (
    <MotionConfig reducedMotion="user">
      <Mesa mesa={mesa} />
    </MotionConfig>
  );
}

type Anclar = (nombre: string) => (el: HTMLElement | null) => void;

interface PosturaCarta { rot: number; dx: number; dy: number }
interface CartaPozo extends PosturaCarta { id: string; codigo: string }

function posturaPozo(codigo: string, paso: number): PosturaCarta {
  let h = paso * 37 + 11;
  for (let i = 0; i < codigo.length; i++) h = (h * 31 + codigo.charCodeAt(i)) >>> 0;
  const rotRaw = (h % 22) - 11;
  const rot = rotRaw === 0 ? (paso % 2 === 0 ? 4 : -4) : rotRaw;
  const dx = ((h >> 4) % 9) - 4;
  const dy = ((h >> 8) % 8) - 3;
  return { rot, dx, dy };
}

function Asiento({ mesa, sub, k, total, anclar, propio = false, reducido = false }:
  { mesa: VistaMesa; sub: string; k: number; total: number; anclar: Anclar; propio?: boolean; reducido?: boolean }) {
  const { e } = mesa;
  const enTurno = e.turnoDe === sub && !e.finalizada;
  const eliminado = e.eliminados.includes(sub);
  const d = total > 1 ? (k - (total - 1) / 2) / ((total - 1) / 2) : 0;
  const puntos = e.marcador[sub] ?? 0;
  return (
    <motion.div ref={anclar(`asiento:${sub}`)} role="group" aria-label={`${mesa.nombre(sub)}, ${puntos} puntos${enTurno ? ', en turno' : ''}`}
      className={['a-asiento', propio ? 'propio' : '', enTurno ? 'en-turno' : '', eliminado ? 'eliminado' : ''].join(' ')}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: eliminado ? 0.42 : 1, y: propio ? 0 : d * d * 16 }}
      transition={{ duration: 0.4 }}>
      <span className="a-asiento-avatar">
        <Avatar sub={sub} nombre={mesa.alias(sub)} enTurno={enTurno} tam={propio ? 44 : 48} />
        {eliminado && (
          <motion.span className="a-marca-eliminado" aria-hidden="true"
            initial={reducido ? { opacity: 1 } : { opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.35 }} />
        )}
      </span>
      <span className="a-asiento-texto">
        <span className="a-asiento-nombre">{mesa.nombre(sub)}</span>
        <span className="a-asiento-puntos">
          <motion.b key={puntos} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>{puntos}</motion.b>
          {e.modalidad === 'APUNTADO_101' && <small> / {e.umbral}</small>}
        </span>
        {eliminado && <span className="a-etiqueta">eliminado</span>}
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
  const { motor, lienzo } = useMotorParticulas(reducido);
  const { anclar, rect } = useAnclas();
  const manoRef = useRef<HTMLUListElement>(null);
  const [marcoMano, animarMano] = useAnimate<HTMLDivElement>();
  const [vuelos, setVuelos] = useState<Vuelo[]>([]);
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(new Set());
  const [cimaRetenida, setCimaRetenida] = useState<string | null | undefined>(undefined);
  const [avisoTurno, setAvisoTurno] = useState(false);
  const [golpePozo, setGolpePozo] = useState(0);
  const [pilaPozo, setPilaPozo] = useState<CartaPozo[]>([]);
  const [posturaCima, setPosturaCima] = useState<PosturaCarta>({ rot: -2, dx: 0, dy: 0 });
  const [barajando, setBarajando] = useState(false);
  const [cartelRonda, setCartelRonda] = useState<number | null>(null);
  const [destelloCierre, setDestelloCierre] = useState(0);
  const siguienteVuelo = useRef(1);
  const visto = useRef(mesa.eventos.length ? mesa.eventos[mesa.eventos.length - 1].id : 0);
  const cimaAnterior = useRef(e.cima);
  const posturaCimaRef = useRef<PosturaCarta>({ rot: -2, dx: 0, dy: 0 });
  const pasoPozo = useRef(0);
  const rectDescarte = useRef<DOMRect | null>(null);
  const eliminadosPrevios = useRef<string[]>(e.eliminados);
  const barajadoTimer = useRef<number | null>(null);
  const rondaTimer = useRef<number | null>(null);

  const red = useEstadoRed(mesa.conectado);
  const items = useMemo(() => itemsDe(e.orden), [e.orden]);
  const rivales = mesa.jugadores.filter((s) => s !== mesa.yo);
  const total = e.venceEn && e.turnoDesde ? Math.max(1, Math.round((new Date(e.venceEn).getTime() - e.turnoDesde) / 1000)) : 0;
  const cimaMostrada = cimaRetenida !== undefined ? cimaRetenida : e.cima;

  const rectDeItem = (id: string) =>
    manoRef.current?.querySelector(`[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() ?? null;

  const centro = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

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
      if (ev.tipo === 'liquidacion') {
        const nuevosEliminados = e.eliminados.filter((s) => !eliminadosPrevios.current.includes(s));
        eliminadosPrevios.current = e.eliminados;
        if (reducido) return;
        setDestelloCierre((d) => d + 1);
        const zona = rect('fieltro') ?? rect('pozo') ?? rect('mazo');
        if (zona) {
          const cz = centro(zona);
          motor.emitir(cz.x, cz.y, 'cierre');
        }
        nuevosEliminados.forEach((s) => {
          const ra = rect(`asiento:${s}`);
          if (ra) {
            const ca = centro(ra);
            motor.emitir(ca.x, ca.y, 'eliminacion');
          }
        });
        return;
      }
      if (ev.tipo === 'reparto') {
        setPilaPozo([]);
        posturaCimaRef.current = { rot: -2, dx: 0, dy: 0 };
        setPosturaCima(posturaCimaRef.current);
        if (reducido) return;
        const mazo = rect('mazo');
        if (!mazo) return;
        const cm = centro(mazo);
        if (barajadoTimer.current) window.clearTimeout(barajadoTimer.current);
        if (rondaTimer.current) window.clearTimeout(rondaTimer.current);
        setBarajando(true);
        setCartelRonda(e.ronda || 1);
        motor.emitir(cm.x, cm.y, 'barajado');
        barajadoTimer.current = window.setTimeout(() => setBarajando(false), 460);
        rondaTimer.current = window.setTimeout(() => setCartelRonda(null), 1150);

        items.forEach((it, i) => {
          const r = rectDeItem(it.id);
          if (!r) return;
          aOcultar.add(it.id);
          const retraso = 0.40 + i * 0.065;
          lanzar({ desde: mazo, hasta: r, carta: it.codigo, voltear: true, retraso, modo: 'reparto', alAterrizar: () => mostrar(it.id) });
          if (i % 2 === 0) {
            const ch = centro(r);
            motor.seguirVuelo({ desdeX: cm.x, desdeY: cm.y, hastaX: ch.x, hastaY: ch.y, arcoY: -34, retrasoMs: retraso * 1000, duracionMs: 550 });
          }
        });
        rivales.forEach((s, k) => {
          const r = rect(`asiento:${s}`);
          for (let j = 0; r && j < 2; j++) {
            lanzar({ desde: mazo, hasta: r, carta: null, voltear: false, retraso: 0.36 + (k * 2 + j) * 0.075, modo: 'roboRival' });
          }
        });
        return;
      }
      if (ev.tipo === 'robo') {
        if (ev.origen === 'DESCARTE') setPilaPozo((p) => p.slice(0, -1));
        if (reducido || ev.jugadorId === mesa.yo) return;
        const mazo = rect('mazo');
        const pozo = rect('pozo');
        const desde = ev.origen === 'DESCARTE' ? pozo : mazo;
        const hasta = rect(`asiento:${ev.jugadorId}`);
        if (desde && hasta) {
          const cd = centro(desde);
          const ch = centro(hasta);
          motor.emitir(cd.x, cd.y, 'robo');
          motor.seguirVuelo({ desdeX: cd.x, desdeY: cd.y, hastaX: ch.x, hastaY: ch.y, arcoY: -34, retrasoMs: 0, duracionMs: 550 });
          lanzar({ desde, hasta, carta: ev.origen === 'DESCARTE' ? cimaAnterior.current : null, voltear: false, retraso: 0, modo: 'roboRival' });
        }
        return;
      }
      if (ev.tipo === 'descarte') {
        const previa = cimaAnterior.current;
        const posturaNueva = posturaPozo(ev.carta, ++pasoPozo.current);
        const pozo = rect('pozo');
        const desde = !reducido && pozo
          ? (ev.jugadorId === mesa.yo
            ? rectDescarte.current ?? manoRef.current?.getBoundingClientRect() ?? null
            : rect(`asiento:${ev.jugadorId}`))
          : null;
        rectDescarte.current = null;
        if (!reducido && pozo && desde) {
          const cd = centro(desde);
          const ch = centro(pozo);
          if (ev.jugadorId === mesa.yo) motor.emitir(cd.x, cd.y, 'seleccion');
          motor.seguirVuelo({ desdeX: cd.x, desdeY: cd.y, hastaX: ch.x, hastaY: ch.y, arcoY: -26, retrasoMs: 0, duracionMs: 480 });
          setCimaRetenida(previa);
          const idApilada = `pozo-${pasoPozo.current}-${previa ?? ''}`;
          lanzar({
            desde,
            hasta: pozo,
            carta: ev.carta,
            voltear: false,
            retraso: 0,
            modo: 'descarte',
            rotacionFinal: posturaNueva.rot,
            alAterrizar: () => {
              if (previa) {
                const pPrev = posturaCimaRef.current;
                setPilaPozo((p) => [...p, { id: idApilada, codigo: previa, ...pPrev }].slice(-3));
              }
              posturaCimaRef.current = posturaNueva;
              setPosturaCima(posturaNueva);
              setCimaRetenida(undefined);
              setGolpePozo((g) => g + 1);
              const cp = centro(rect('pozo') ?? pozo);
              motor.emitir(cp.x, cp.y, 'pozo');
            },
          });
        } else {
          if (previa) {
            const pPrev = posturaCimaRef.current;
            setPilaPozo((p) => [...p, { id: `pozo-${pasoPozo.current}-${previa}`, codigo: previa, ...pPrev }].slice(-3));
          }
          posturaCimaRef.current = posturaNueva;
          setPosturaCima(posturaNueva);
        }
        return;
      }
      if (reducido) return;
      const mazo = rect('mazo');
      const pozo = rect('pozo');
      if (ev.tipo === 'recibida') {
        const it = [...items].reverse().find((x) => x.codigo === ev.carta);
        const desde = ev.origen === 'DESCARTE' ? pozo : mazo;
        const hasta = it ? rectDeItem(it.id) : null;
        if (it && desde && hasta) {
          const cd = centro(desde);
          const ch = centro(hasta);
          const modo = ev.origen === 'DESCARTE' ? 'roboPozo' : 'roboMazo';
          motor.emitir(cd.x, cd.y, 'robo');
          motor.seguirVuelo({ desdeX: cd.x, desdeY: cd.y, hastaX: ch.x, hastaY: ch.y, arcoY: -34, retrasoMs: 0, duracionMs: 660 });
          aOcultar.add(it.id);
          lanzar({ desde, hasta, carta: ev.carta, voltear: ev.origen !== 'DESCARTE', retraso: 0, modo, alAterrizar: () => mostrar(it.id) });
        }
      }
    };
    nuevos.forEach(procesar);
    if (aOcultar.size) setOcultas((s) => new Set([...s, ...aOcultar]));
    if (lanzados.length) setVuelos((v) => [...v, ...lanzados]);
  });

  useLayoutEffect(() => { cimaAnterior.current = e.cima; }, [e.cima]);
  useEffect(() => { eliminadosPrevios.current = e.eliminados; }, [e.eliminados]);
  useEffect(() => () => {
    if (barajadoTimer.current) window.clearTimeout(barajadoTimer.current);
    if (rondaTimer.current) window.clearTimeout(rondaTimer.current);
  }, []);

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
          <section ref={anclar('fieltro')} className="a-fieltro" aria-label="Mesa de juego">
            <span className="a-brillo-capa" aria-hidden="true"><span className="a-brillo" /></span>
            {destelloCierre > 0 && !reducido && (
              <motion.span key={`cierre-${destelloCierre}`} className="a-destello-cierre" aria-hidden="true"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: [0, 0.65, 0], scale: [0.85, 1.15] }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
            )}
            <div className="a-rivales">
              {rivales.map((s, k) => <Asiento key={s} mesa={mesa} sub={s} k={k} total={rivales.length} anclar={anclar} reducido={reducido} />)}
            </div>

            <div className="a-centro">
              <motion.button type="button" className={['a-monton a-mazo', mesa.debeRobar ? 'activo' : ''].join(' ')}
                ref={anclar('mazo')} disabled={!mesa.debeRobar} onClick={() => mesa.robar(false)}
                whileHover={mesa.debeRobar ? { y: -4 } : undefined} whileTap={mesa.debeRobar ? { scale: 0.96 } : undefined}>
                <span className="a-pila" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => {
                    const dir = i % 2 === 0 ? -1 : 1;
                    const base = i * -1.6;
                    return (
                      <motion.span key={i} initial={false}
                        animate={barajando && !reducido
                          ? { x: [base, base + dir * 16, base, base - dir * 12, base], y: base, rotate: [0, dir * 6, 0, -dir * 4, 0] }
                          : { x: base, y: base, rotate: 0 }}
                        transition={barajando && !reducido ? { duration: 0.42, ease: 'easeInOut' } : { duration: 0.2 }}>
                        <DorsoCarta />
                      </motion.span>
                    );
                  })}
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
                  {pilaPozo.length > 0 ? (
                    pilaPozo.map((p) => (
                      <span key={p.id} className="a-carta-apilada"
                        style={{ transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)` }}>
                        <Carta codigo={p.codigo} />
                        <span className="a-veladura-pozo" />
                      </span>
                    ))
                  ) : (
                    cimaMostrada && <span className="a-borde-pozo b1" />
                  )}
                  {golpePozo > 0 && !reducido && (
                    <motion.span key={`onda-${golpePozo}`} className="a-onda-pozo"
                      initial={{ scale: 0.84, opacity: 0.78 }} animate={{ scale: 1.52, opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }} />
                  )}
                  {cimaMostrada
                    ? <motion.span key={`${cimaMostrada}-${posturaCima.rot}`} className="a-cima"
                        initial={{ opacity: 0.6, rotate: posturaCima.rot, x: posturaCima.dx, y: posturaCima.dy }}
                        animate={!reducido && golpePozo > 0
                          ? { opacity: 1, rotate: posturaCima.rot, x: posturaCima.dx, y: posturaCima.dy, scale: [1.07, 0.985, 1] }
                          : { opacity: 1, rotate: posturaCima.rot, x: posturaCima.dx, y: posturaCima.dy, scale: 1 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                        <Carta codigo={cimaMostrada} />
                      </motion.span>
                    : <span className="a-vacio">Vacío</span>}
                </span>
                <span className="a-rotulo">{mesa.debeRobar && e.robarDelDescarte ? 'Robar del pozo' : 'Pozo'}</span>
              </motion.button>
            </div>

            <motion.p key={mesa.instruccion} className={['a-instruccion', mesa.miTurno ? 'mia' : ''].join(' ')}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{mesa.instruccion}</motion.p>

            <div className="a-yo">
              <Asiento mesa={mesa} sub={mesa.yo} k={0} total={1} anclar={anclar} propio reducido={reducido} />
            </div>

            <AnimatePresence>
              {cartelRonda !== null && !reducido && (
                <motion.div key={`ronda-${cartelRonda}`} className="a-cartel-ronda" aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.88, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.04, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
                  <span>Ronda {cartelRonda}</span>
                </motion.div>
              )}
            </AnimatePresence>

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
              <h2>Tu mano <ContadorVivo valor={e.orden.length} /></h2>
              <div className="a-fila">
                <button type="button" className="a-boton suave" onClick={mesa.ordenarPorPinta}>Ordenar por pinta</button>
                <button type="button" className="a-boton suave" onClick={mesa.ordenarPorValor}>Ordenar por número</button>
              </div>
            </div>
            <div className="a-mano-marco" ref={marcoMano}>
              <Mano ref={manoRef} items={items} seleccion={seleccion} ocultas={ocultas} nueva={e.nueva}
                enTurno={mesa.miTurno} alSeleccionar={mesa.seleccionar} alReordenar={alReordenar}
                alChispearCarta={(x, y) => motor.emitir(x, y, 'seleccion')} />
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
      {lienzo}
      <AnimatePresence>
        {mesa.liquidacion && !mesa.fin && <PanelLiquidacion key={`liq-${mesa.liquidacion.ronda}`} mesa={mesa} l={mesa.liquidacion} />}
      </AnimatePresence>
      <AnimatePresence>{mesa.fin && <PanelFin key="fin" mesa={mesa} fin={mesa.fin} />}</AnimatePresence>
      <div className="a-sr" aria-live="polite">{mesa.miTurno ? `Es tu turno. ${mesa.instruccion}` : ''}</div>
    </div>
  );
}
