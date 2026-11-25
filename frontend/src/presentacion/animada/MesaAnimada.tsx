// Version animada de la mesa. Recibe solo lo que entrega useMesa() (FF-19); no decide si una jugada es valida (RD4):
// habilita botones segun el turno y la fase que comunica el servidor, igual que la ligera.
import { AnimatePresence, motion, MotionConfig, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gruposEnOrden, infoCarta, ordenarPorGrupos } from '../../cartas';
import {
  ayudaCierre, CIERRE_CORTO, emojiReaccion, llenadoProyeccion, NOMBRE_MODALIDAD, pistaCierre, REACCIONES, textoAvance,
  textoProyeccion,
} from '../../mensajes';
import type { EventoMesa, TipoReaccion, VistaMesa } from '../../estado/tipos';
import { huellaCorta } from '../../estado/verificarReparto';
import { Avatar, Carta, ContadorVivo, DorsoCarta, nombreCarta, PanoMesa, useAnclas, usePanoMesa } from './comun';
import { ItemMano, itemsDe, Mano } from './Mano';
import { PanelFin, PanelLiquidacion } from './Paneles';
import { RelojTurno } from './RelojTurno';
import { CapaVuelos, Vuelo } from './Vuelos';
import { FranjaRed, useEstadoRed } from './EstadoRed';
import { useMotorParticulas } from './Particulas';
import { GuiaTutorial, usePartidaTutorial } from './Tutorial';
import { reproducirSonido } from '../../sonidos';
import { ChatAnimado } from './ChatAnimado';
import './tema';

export default function MesaAnimada({ mesa }: { mesa: VistaMesa }) {
  return (
    <MotionConfig reducedMotion="user">
      <Mesa mesa={mesa} />
    </MotionConfig>
  );
}

export function PartidaTutorial({ alCerrar, silenciado, alternarSilencio }:
  { alCerrar: () => void; silenciado: boolean; alternarSilencio: () => void }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const tut = usePartidaTutorial(alCerrar, silenciado, alternarSilencio);
  return (
    <MotionConfig reducedMotion="user">
      <div className="a-tutorial-pantalla" ref={contenedorRef} role="dialog" aria-modal="true" aria-label="Tutorial interactivo de Mesa 101">
        <Mesa key={tut.revision} mesa={tut.vista} esTutorial alAgrupar={tut.notificarAgrupado} />
        <GuiaTutorial tut={tut} contenedorRef={contenedorRef} />
      </div>
    </MotionConfig>
  );
}

type Anclar = (nombre: string) => (el: HTMLElement | null) => void;

interface PosturaCarta { rot: number; dx: number; dy: number }
interface CartaPozo extends PosturaCarta { id: string; codigo: string }
interface VueloReaccion {
  id: number; para: string; tipo: TipoReaccion;
  desde: { x: number; y: number }; hasta: { x: number; y: number };
}

function IconoSonido({ silenciado }: { silenciado: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path d="M2.5 6.2H5l3.5-3v9.6L5 9.8H2.5z" fill="currentColor" />
      {silenciado ? (
        <path d="M10.5 5.5l3.5 5M14 5.5l-3.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M10.5 5.4a3.6 3.6 0 0 1 0 5.2M12.4 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function posturaPozo(codigo: string, paso: number): PosturaCarta {
  let h = paso * 37 + 11;
  for (let i = 0; i < codigo.length; i++) h = (h * 31 + codigo.charCodeAt(i)) >>> 0;
  const rotRaw = (h % 22) - 11;
  const rot = rotRaw === 0 ? (paso % 2 === 0 ? 4 : -4) : rotRaw;
  const dx = ((h >> 4) % 9) - 4;
  const dy = ((h >> 8) % 8) - 3;
  return { rot, dx, dy };
}

function Asiento({
  mesa, sub, k, total, anclar, propio = false, reducido = false, esTutorial = false,
  menuAbierto = false, alAlternarMenu,
}: {
  mesa: VistaMesa; sub: string; k: number; total: number; anclar: Anclar; propio?: boolean; reducido?: boolean;
  esTutorial?: boolean; menuAbierto?: boolean; alAlternarMenu?: () => void;
}) {
  const { e } = mesa;
  const enTurno = e.turnoDe === sub && !e.finalizada;
  const eliminado = e.eliminados.includes(sub);
  const ausente = e.ausentes.includes(sub);
  const d = total > 1 ? (k - (total - 1) / 2) / ((total - 1) / 2) : 0;
  const puntos = e.marcador[sub] ?? 0;
  const puedeReaccionar = !propio && !esTutorial && !e.finalizada;
  return (
    <motion.div ref={anclar(`asiento:${sub}`)} role="group" aria-label={`${mesa.nombre(sub)}, ${puntos} puntos${enTurno ? ', en turno' : ''}${ausente ? ', sin conexión' : ''}`}
      className={['a-asiento', propio ? 'propio' : '', enTurno ? 'en-turno' : '', eliminado ? 'eliminado' : '', ausente ? 'ausente' : ''].join(' ')}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: eliminado ? 0.42 : ausente ? 0.55 : 1, y: propio ? 0 : d * d * 16 }}
      transition={{ duration: 0.4 }}>
      <span className="a-asiento-avatar">
        <Avatar sub={sub} nombre={mesa.alias(sub)} avatar={mesa.avatar(sub)} enTurno={enTurno} tam={propio ? 44 : 48} />
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
      {puedeReaccionar && (
        <button type="button" className={['a-reaccion-disparador', menuAbierto ? 'activo' : ''].join(' ')}
          aria-expanded={menuAbierto} aria-label={`Enviar reacción a ${mesa.nombre(sub)}`}
          title={`Reaccionar a ${mesa.nombre(sub)}`} onClick={(ev) => { ev.stopPropagation(); alAlternarMenu?.(); }}>
          😊
        </button>
      )}
    </motion.div>
  );
}

function Mesa({ mesa, esTutorial = false, alAgrupar }: { mesa: VistaMesa; esTutorial?: boolean; alAgrupar?: () => void }) {
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
  const [dosFilas, setDosFilas] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 560);
  const [pano, setPano] = usePanoMesa();
  const [tutorialAbierto, setTutorialAbierto] = useState(false);
  const [menuReaccion, setMenuReaccion] = useState<string | null>(null);
  const [vuelosReaccion, setVuelosReaccion] = useState<VueloReaccion[]>([]);
  const [impactosReaccion, setImpactosReaccion] = useState<Record<string, TipoReaccion>>({});
  const siguienteVuelo = useRef(1);
  const visto = useRef(mesa.eventos.length ? mesa.eventos[mesa.eventos.length - 1].id : 0);
  const cimaAnterior = useRef(e.cima);
  const posturaCimaRef = useRef<PosturaCarta>({ rot: -2, dx: 0, dy: 0 });
  const pasoPozo = useRef(0);
  const rectDescarte = useRef<DOMRect | null>(null);
  const eliminadosPrevios = useRef<string[]>(e.eliminados);
  const barajadoTimer = useRef<number | null>(null);
  const rondaTimer = useRef<number | null>(null);
  const impactoTimers = useRef<Map<string, number>>(new Map());

  const red = useEstadoRed(mesa.conectado);
  const items = useMemo(() => itemsDe(e.orden), [e.orden]);
  // Grupos que calculo el servidor (RF16, RD4): la SPA solo los ubica en el orden local.
  const gruposMano = useMemo(() => gruposEnOrden(e.orden, mesa.avance?.grupos ?? []), [e.orden, mesa.avance]);
  const avance = mesa.avance;
  const puedeCerrar = mesa.debeDescartar && !!avance?.puedeCerrar;
  const rivales = mesa.jugadores.filter((s) => s !== mesa.yo);
  // Tras recargar, turnoDesde es el momento de la vista y no el inicio del turno: el total no puede ser menor que
  // el plazo de la mesa (10 s si quien juega esta sin conexion, ADR-08b).
  const plazoMesa = e.turnoDe && e.ausentes.includes(e.turnoDe) ? 10 : e.segundosPorTurno;
  const totalVisto = e.venceEn && e.turnoDesde
    ? Math.max(1, Math.round((new Date(e.venceEn).getTime() - e.turnoDesde) / 1000)) : 0;
  const total = e.venceEn ? Math.max(totalVisto, plazoMesa) : 0;
  const cimaMostrada = cimaRetenida !== undefined ? cimaRetenida : e.cima;
  const urgenteHud = mesa.miTurno && mesa.segundos !== null && mesa.segundos > 0 && mesa.segundos <= 5 && !e.finalizada;

  const rectDeItem = (id: string) =>
    manoRef.current?.querySelector(`[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() ?? null;

  const centro = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  const mostrarImpacto = (para: string, tipo: TipoReaccion, ms: number) => {
    const previo = impactoTimers.current.get(para);
    if (previo) window.clearTimeout(previo);
    setImpactosReaccion((m) => ({ ...m, [para]: tipo }));
    const tid = window.setTimeout(() => {
      impactoTimers.current.delete(para);
      setImpactosReaccion((m) => {
        if (m[para] !== tipo) return m;
        const copia = { ...m };
        delete copia[para];
        return copia;
      });
    }, ms);
    impactoTimers.current.set(para, tid);
  };

  // Los eventos nuevos se animan antes de pintar (useLayoutEffect): asi la carta que llega no parpadea en la mano.
  useLayoutEffect(() => {
    const nuevos = mesa.eventos.filter((ev) => ev.id > visto.current);
    if (!nuevos.length) return;
    visto.current = nuevos[nuevos.length - 1].id;
    const lanzados: Vuelo[] = [];
    const reaccionesNuevas: VueloReaccion[] = [];
    const aOcultar = new Set<string>();
    const lanzar = (v: Omit<Vuelo, 'id'>) => lanzados.push({ ...v, id: siguienteVuelo.current++ });
    const mostrar = (id: string) => setOcultas((s) => { const n = new Set(s); n.delete(id); return n; });

    const procesar = (ev: EventoMesa) => {
      if (ev.tipo === 'reaccion') {
        const desde = !reducido ? rect(`asiento:${ev.de}`) : null;
        const hasta = !reducido ? rect(`asiento:${ev.para}`) : null;
        if (desde && hasta) {
          reaccionesNuevas.push({
            id: siguienteVuelo.current++, para: ev.para, tipo: ev.reaccion,
            desde: centro(desde), hasta: centro(hasta),
          });
        } else {
          mostrarImpacto(ev.para, ev.reaccion, reducido ? 1600 : 1400);
        }
        return;
      }
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
    if (aOcultar.size) {
      setOcultas((s) => new Set([...s, ...aOcultar]));
      // Respaldo: si un vuelo no aterriza (pestana en segundo plano, recarga), la carta reaparece igual.
      window.setTimeout(() => setOcultas((s) => {
        const n = new Set(s);
        aOcultar.forEach((id) => n.delete(id));
        return n;
      }), 1300);
    }
    if (lanzados.length) setVuelos((v) => [...v, ...lanzados]);
    if (reaccionesNuevas.length) setVuelosReaccion((v) => [...v, ...reaccionesNuevas]);
  });

  useLayoutEffect(() => { cimaAnterior.current = e.cima; }, [e.cima]);
  // Ronda nueva: ninguna carta de la mano queda con opacity 0 por un vuelo de la ronda anterior.
  useEffect(() => { setOcultas(new Set()); }, [e.ronda]);
  useEffect(() => { eliminadosPrevios.current = e.eliminados; }, [e.eliminados]);
  useEffect(() => () => {
    if (barajadoTimer.current) window.clearTimeout(barajadoTimer.current);
    if (rondaTimer.current) window.clearTimeout(rondaTimer.current);
    impactoTimers.current.forEach((tid) => window.clearTimeout(tid));
    impactoTimers.current.clear();
  }, []);

  useEffect(() => {
    if (!mesa.miTurno) { setAvisoTurno(false); return undefined; }
    setAvisoTurno(true);
    const t = setTimeout(() => setAvisoTurno(false), 2200);
    return () => clearTimeout(t);
  }, [mesa.miTurno, e.numeroTurno]);

  // Partículas continuas alrededor del contorno mientras una carta está seleccionada.
  useEffect(() => {
    if (seleccion === null || reducido) return undefined;
    const it = items[seleccion];
    if (!it) return undefined;
    const t = window.setInterval(() => {
      const r = rectDeItem(it.id);
      if (r) motor.emitirBordeCarta(r);
    }, 125);
    return () => window.clearInterval(t);
  }, [seleccion, items, reducido, motor]);

  // Polvitos rojizos en los bordes de la mesa y la mano cuando quedan 5 s o menos de turno.
  useEffect(() => {
    if (!urgenteHud || reducido) return undefined;
    const emitir = () => motor.emitirUrgenciaHud([rect('fieltro'), rect('mano')]);
    emitir();
    const t = window.setInterval(emitir, 115);
    return () => window.clearInterval(t);
  }, [urgenteHud, reducido, motor, rect]);

  const alReordenar = (nuevos: ItemMano[]) => {
    const elegida = seleccion !== null ? items[seleccion]?.id : null;
    mesa.reordenar(nuevos.map((x) => x.codigo));
    if (elegida) mesa.seleccionar(nuevos.findIndex((x) => x.id === elegida));
  };
  const agruparJuegos = () => {
    const elegida = seleccion !== null ? items[seleccion]?.id : null;
    const orden = ordenarPorGrupos(e.orden, avance?.grupos ?? []);
    mesa.reordenar(orden);
    if (elegida) {
      const nuevosItems = itemsDe(orden);
      mesa.seleccionar(nuevosItems.findIndex((x) => x.id === elegida));
    }
    const r = manoRef.current?.getBoundingClientRect();
    if (r) motor.emitir(r.left + r.width / 2, r.top + r.height / 2, 'seleccion');
    reproducirSonido('seleccionar', mesa.silenciado);
    alAgrupar?.();
  };
  const elegirSugerida = () => {
    const i = avance?.descarteSugerido ? e.orden.indexOf(avance.descarteSugerido) : -1;
    if (i >= 0) mesa.seleccionar(i);
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

  const PANOS: Array<{ id: PanoMesa; nombre: string }> = [
    { id: 'esmeralda', nombre: 'Esmeralda' },
    { id: 'burdeos', nombre: 'Burdeos' },
    { id: 'medianoche', nombre: 'Medianoche' },
  ];

  return (
    <div className="a-raiz a-mesa" data-pano={pano}>
      <header className="a-encabezado">
        <span className="a-marca">Mesa 101</span>
        <span className="a-info">{NOMBRE_MODALIDAD[e.modalidad] ?? 'Partida'} · Ronda {e.ronda} · Sala <b>{mesa.codigo}</b></span>
        <div className="a-panos" role="group" aria-label="Ambiente de la mesa">
          {PANOS.map((p) => (
            <button key={p.id} type="button" className={['a-pano-btn', p.id, pano === p.id ? 'activo' : ''].join(' ')}
              aria-label={`Paño ${p.nombre}`} aria-pressed={pano === p.id} title={`Paño ${p.nombre}`}
              onClick={() => {
                if (pano !== p.id) reproducirSonido('tema', mesa.silenciado);
                setPano(p.id);
              }} />
          ))}
        </div>
        {(
          <button type="button" className={['a-boton suave a-sonido-btn', mesa.silenciado ? 'silencio' : ''].join(' ')}
            aria-pressed={!mesa.silenciado}
            aria-label={mesa.silenciado ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
            title={mesa.silenciado ? 'Sonido silenciado (clic para activar)' : 'Sonido activado (clic para silenciar)'}
            onClick={mesa.alternarSilencio}>
            <IconoSonido silenciado={mesa.silenciado} />
            <span>{mesa.silenciado ? 'Silencio' : 'Sonido'}</span>
          </button>
        )}
        {!esTutorial && <ChatAnimado mesa={mesa} />}
        {!esTutorial && <button type="button" className="a-boton suave" onClick={() => setTutorialAbierto(true)}>Tutorial</button>}
        <span className={['a-conexion', mesa.conectado ? 'ok' : 'caida'].join(' ')} role="status">
          <motion.i aria-hidden="true" animate={mesa.conectado ? { opacity: 1 } : { opacity: [1, 0.25, 1] }}
            transition={mesa.conectado ? { duration: 0.3 } : { duration: 1.1, repeat: Infinity }} />
          {mesa.conectado ? 'Conectado' : 'Reconectando…'}
        </span>
        <button type="button" className="a-boton fantasma" onClick={mesa.salir}>{esTutorial ? 'Salir del tutorial' : 'Salir'}</button>
      </header>

      <FranjaRed red={red} />

      <motion.div className="a-cuerpo" animate={{ opacity: red === 'caida' ? 0.45 : 1 }} transition={{ duration: 0.4 }}
        aria-busy={red === 'caida'}>
        <div className="a-juego">
          <section ref={anclar('fieltro')} className="a-fieltro" aria-label="Mesa de juego">
            <span className="a-brillo-capa" aria-hidden="true"><span className="a-brillo" /></span>
            <AnimatePresence>
              {urgenteHud && (
                <motion.span key="fieltro-urgente" className="a-borde-urgente a-borde-urgente-mesa" aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={reducido ? { opacity: 0.45 } : { opacity: [0.22, 0.95, 0.22] }}
                  exit={{ opacity: 0 }}
                  transition={reducido ? { duration: 0.2 } : { duration: 0.58, repeat: Infinity, ease: 'easeInOut' }} />
              )}
            </AnimatePresence>
            <svg className="a-filigrana" viewBox="0 0 320 180" aria-hidden="true">
              <rect x="16" y="14" width="288" height="152" rx="76" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="24" y="22" width="272" height="136" rx="68" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="4 4" />
              <polygon points="160,32 167,40 160,48 153,40" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="160,132 167,140 160,148 153,140" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            {destelloCierre > 0 && !reducido && (
              <motion.span key={`cierre-${destelloCierre}`} className="a-destello-cierre" aria-hidden="true"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: [0, 0.65, 0], scale: [0.85, 1.15] }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
            )}
            <div className="a-rivales" ref={anclar('rivales')}>
              {rivales.map((s, k) => (
                <Asiento key={s} mesa={mesa} sub={s} k={k} total={rivales.length} anclar={anclar} reducido={reducido}
                  esTutorial={esTutorial} menuAbierto={menuReaccion === s}
                  alAlternarMenu={() => setMenuReaccion((m) => (m === s ? null : s))} />
              ))}
            </div>

            <div className="a-centro" ref={anclar('centro')}>
              <motion.button type="button" data-tut="mazo" className={['a-monton a-mazo', mesa.debeRobar ? 'activo' : ''].join(' ')}
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
                        {i === 3 && (
                        <span className="a-halo-monton" aria-hidden="true">
                          {!reducido && <span className="a-halo-anillo"><span className="a-halo-giro" /></span>}
                        </span>
                        )}
                      </motion.span>
                    );
                  })}
                </span>
                <span className="a-rotulo">{mesa.debeRobar ? 'Robar del mazo' : 'Mazo'}</span>
              </motion.button>

              <div className="a-reloj-hueco" ref={anclar('reloj')}>
                <AnimatePresence>
                  {mesa.segundos !== null && total > 0 && !e.finalizada && (
                    <motion.div key="reloj" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      <RelojTurno segundos={Math.min(mesa.segundos, total)} total={total} mio={mesa.miTurno} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button type="button" data-tut="pozo" className={['a-monton a-pozo', mesa.debeRobar && e.robarDelDescarte && cimaMostrada ? 'activo' : ''].join(' ')}
                ref={anclar('pozo')} disabled={!mesa.debeRobar || !e.robarDelDescarte || !cimaMostrada}
                onClick={() => mesa.robar(true)} aria-label={cimaMostrada ? `Pozo: ${nombreCarta(cimaMostrada)}` : 'Pozo vacío'}
                whileHover={mesa.debeRobar && e.robarDelDescarte ? { y: -4 } : undefined}>
                <span className="a-pila-pozo" aria-hidden="true">
                  {cimaMostrada && (pilaPozo.length > 0 ? (
                    pilaPozo.map((p) => (
                      <span key={p.id} className="a-carta-apilada"
                        style={{ transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)` }}>
                        <Carta codigo={p.codigo} />
                        <span className="a-veladura-pozo" />
                      </span>
                    ))
                  ) : (
                    <span className="a-borde-pozo b1" />
                  ))}
                  {golpePozo > 0 && !reducido && (
                    <motion.span key={`onda-${golpePozo}`} className="a-onda-pozo"
                      style={{ x: posturaCima.dx, y: posturaCima.dy, rotate: posturaCima.rot }}
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
                        <span className="a-halo-monton" aria-hidden="true">
                          {!reducido && <span className="a-halo-anillo"><span className="a-halo-giro" /></span>}
                        </span>
                      </motion.span>
                    : <span className="a-vacio">Vacío</span>}
                </span>
                <span className="a-rotulo">{mesa.debeRobar && e.robarDelDescarte ? 'Robar del pozo' : 'Pozo'}</span>
              </motion.button>
            </div>

            {mesa.miTurno && !e.finalizada && (
              <div className="a-pasos-turno" aria-hidden="true">
                <span className={mesa.debeRobar ? 'activo' : 'listo'}>1. Robar</span>
                <i>›</i>
                <span className={mesa.debeDescartar && !cartaSel ? 'activo' : ''}>2. Ordenar</span>
                <i>›</i>
                <span className={mesa.debeDescartar && !!cartaSel ? 'activo' : ''}>3. Descartar / Cerrar</span>
              </div>
            )}
            <motion.p key={mesa.instruccion} className={['a-instruccion', mesa.miTurno ? 'mia' : ''].join(' ')}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{mesa.instruccion}</motion.p>

            <div className="a-yo">
              <Asiento mesa={mesa} sub={mesa.yo} k={0} total={1} anclar={anclar} propio reducido={reducido}
                esTutorial={esTutorial} />
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

          <section className="a-zona-mano" ref={anclar('mano')} aria-label="Tu mano">
            <AnimatePresence>
              {urgenteHud && (
                <motion.span key="zona-urgente" className="a-borde-urgente a-borde-urgente-mano" aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={reducido ? { opacity: 0.45 } : { opacity: [0.22, 0.95, 0.22] }}
                  exit={{ opacity: 0 }}
                  transition={reducido ? { duration: 0.2 } : { duration: 0.58, repeat: Infinity, ease: 'easeInOut' }} />
              )}
            </AnimatePresence>
            <div className="a-mano-cabecera">
              <h2>Tu mano <ContadorVivo valor={e.orden.length} /></h2>
              <div className="a-fila">
                <button type="button" data-tut="agrupar" className="a-boton suave" onClick={agruparJuegos}>Agrupar juegos</button>
                <button type="button" className="a-boton suave" onClick={mesa.ordenarPorPinta}>Por pinta</button>
                <button type="button" className="a-boton suave" onClick={mesa.ordenarPorValor}>Por número</button>
                <button type="button" className={['a-boton suave a-conmutador', dosFilas ? 'activo' : ''].join(' ')}
                  aria-pressed={dosFilas} onClick={() => setDosFilas((v) => !v)}>
                  Vista 2 filas
                </button>
              </div>
            </div>
            <div className="a-mano-marco" ref={marcoMano}>
              <Mano ref={manoRef} items={items} seleccion={seleccion} ocultas={ocultas} nueva={e.nueva}
                enTurno={mesa.miTurno} dosFilas={dosFilas} grupos={gruposMano}
                alSeleccionar={mesa.seleccionar} alReordenar={alReordenar}
                alChispearCarta={(x, y) => motor.emitir(x, y, 'seleccion')}
                alArrastrar={() => reproducirSonido('seleccionar', mesa.silenciado)} />
            </div>
            {avance && !e.eliminados.includes(mesa.yo) && (
              <div className="a-barra-proyeccion" role="status" data-tut="avance">
                {avance.marcadorProyectado !== null && (
                  <p className={['a-proyeccion', avance.quedariaEliminado ? 'peligro' : ''].join(' ')}
                    title={textoProyeccion(avance, e.umbral)}>
                    <motion.span className="a-proyeccion-llenado" aria-hidden="true" initial={false}
                      animate={{ width: llenadoProyeccion(avance, e.umbral) }} transition={{ duration: 0.4 }} />
                    <span className="a-proyeccion-texto">{textoProyeccion(avance, e.umbral)}</span>
                  </p>
                )}
                {textoAvance(avance) && (
                  <span className={['a-avance', puedeCerrar ? 'listo' : ''].join(' ')}>{textoAvance(avance)}</span>
                )}
              </div>
            )}
            <div className="a-mover" aria-live="polite">
              {cartaSel ? (
                <>
                  <button type="button" className="a-boton suave" onClick={() => moverElegida(-1)} disabled={seleccion === 0}>← Mover</button>
                  <span>{nombreCarta(cartaSel)}</span>
                  <button type="button" className="a-boton suave" onClick={() => moverElegida(1)} disabled={seleccion === e.orden.length - 1}>Mover →</button>
                </>
              ) : (
                <span className="a-tenue">
                  {dosFilas
                    ? 'En 2 filas ves todas tus cartas; usa Agrupar juegos o ← Mover para ordenarlas.'
                    : 'Arrastra o pulsa Agrupar juegos para separar ternas y cuartas; toca una carta para elegirla.'}
                </span>
              )}
            </div>
            {puedeCerrar && avance?.descarteSugerido && (
              <p className="a-pista-cierre" role="status">
                {pistaCierre(`${infoCarta(avance.descarteSugerido).valor}${infoCarta(avance.descarteSugerido).simbolo}`)}
                {cartaSel !== avance.descarteSugerido && (
                  <button type="button" className="a-boton suave" onClick={elegirSugerida}>Elegirla</button>
                )}
              </p>
            )}
            <div className="a-acciones" ref={anclar('acciones')}>
              <motion.button type="button" data-tut="descartar" className="a-boton principal" disabled={!mesa.debeDescartar || !cartaSel}
                onClick={descartar} whileTap={{ scale: 0.97 }}>Descartar carta</motion.button>
              <motion.button type="button" data-tut="cerrar" className={['a-boton cerrar', puedeCerrar ? 'listo' : ''].join(' ')} disabled={!mesa.debeDescartar || !cartaSel}
                onClick={mesa.cerrar} whileTap={{ scale: 0.97 }}>Cerrar ronda con esta carta</motion.button>
            </div>
            {e.modalidad && <p className="a-tenue a-pequeno">{ayudaCierre(e.modalidad)}</p>}
          </section>
        </div>

        <aside className="a-lateral" aria-label="Registro">
          <h2>Registro</h2>
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
                <thead><tr><th>Ronda</th><th>Cierre</th>{mesa.jugadores.map((s) => <th key={s}>{mesa.nombre(s)}</th>)}</tr></thead>
                <tbody>{mesa.historial.map((h, i) => (
                  <tr key={`${h.ronda}-${i}`}><td>{h.ronda}</td><td>{CIERRE_CORTO[h.tipoCierre] ?? h.tipoCierre}</td>
                    {mesa.jugadores.map((s) => (
                      <td key={s}>{h.puntosRonda[s] === undefined ? '—' : (
                        <>{h.puntosRonda[s]}{s === h.cerrador && ' ✓'} <small className="a-tenue">({h.marcador[s] ?? '—'})</small></>
                      )}</td>))}</tr>
                ))}</tbody>
              </table>
              <p className="a-tenue a-pequeno">Puntos de la ronda y, entre paréntesis, el total. ✓ = cerró.</p>
            </details>
          )}
          {e.huella && (
            <details className="a-huella">
              <summary>Verificación del reparto (SHA-256)</summary>
              <p title={e.huella}>
                Huella de la ronda {e.ronda}: <code>{huellaCorta(e.huella)}</code>
                <small>Al liquidar, tu navegador recalcula SHA-256(orden + sal) y la compara con esta huella.</small>
              </p>
            </details>
          )}
        </aside>
      </motion.div>

      <CapaVuelos vuelos={vuelos} alTerminar={(id) => setVuelos((v) => v.filter((x) => x.id !== id))} />
      <AnimatePresence>
        {menuReaccion && !esTutorial && (
          <MenuReacciones key={menuReaccion} nombre={mesa.nombre(menuReaccion)} ancla={rect(`asiento:${menuReaccion}`)}
            alCerrar={() => setMenuReaccion(null)}
            alReaccionar={(tipo) => { mesa.reaccionar(menuReaccion, tipo); setMenuReaccion(null); }} />
        )}
      </AnimatePresence>
      <CapaReacciones vuelos={vuelosReaccion} impactos={impactosReaccion} rect={rect} reducido={reducido}
        nombre={mesa.nombre} alAterrizar={(v) => {
          setVuelosReaccion((l) => l.filter((x) => x.id !== v.id));
          motor.emitir(v.hasta.x, v.hasta.y, 'seleccion');
          mostrarImpacto(v.para, v.tipo, 1100);
        }} />
      {lienzo}
      <AnimatePresence>
        {mesa.liquidacion && !mesa.fin && <PanelLiquidacion key={`liq-${mesa.liquidacion.ronda}`} mesa={mesa} l={mesa.liquidacion} />}
      </AnimatePresence>
      <AnimatePresence>{mesa.fin && <PanelFin key="fin" mesa={mesa} fin={mesa.fin} />}</AnimatePresence>
      {!esTutorial && tutorialAbierto && (
        <PartidaTutorial alCerrar={() => setTutorialAbierto(false)} silenciado={mesa.silenciado}
          alternarSilencio={mesa.alternarSilencio} />
      )}
      <div className="a-sr" aria-live="polite">{mesa.miTurno ? `Es tu turno. ${mesa.instruccion}` : ''}</div>
    </div>
  );
}

/**
 * Menu flotante de reacciones (position: fixed, fuera de .a-fieltro): ninguna carta de la mesa lo tapa ni le roba los
 * clics. Se ancla bajo el asiento elegido y se cierra con un clic afuera, Escape o al desplazar la pagina.
 */
function MenuReacciones({ nombre, ancla, alCerrar, alReaccionar }: {
  nombre: string; ancla: DOMRect | null; alCerrar: () => void; alReaccionar: (tipo: TipoReaccion) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fuera = (ev: PointerEvent) => {
      const t = ev.target as Node | null;
      if (ref.current && t && !ref.current.contains(t)
        && !(t instanceof Element && t.closest('.a-reaccion-disparador'))) alCerrar();
    };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') alCerrar(); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', alCerrar, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', alCerrar);
    };
  }, [alCerrar]);
  if (!ancla) return null;
  return (
    <motion.div ref={ref} className="a-menu-reacciones" role="group" aria-label={`Reacciones para ${nombre}`}
      style={{ left: ancla.left + ancla.width / 2, top: ancla.bottom + 6 }}
      initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.16 }}>
      {REACCIONES.map((r) => (
        <button key={r.tipo} type="button" title={r.etiqueta} aria-label={`${r.etiqueta} para ${nombre}`}
          onClick={(ev) => { ev.stopPropagation(); alReaccionar(r.tipo); }}>
          {r.emoji}
        </button>
      ))}
    </motion.div>
  );
}

/**
 * Capa fija por encima de cartas, mano (30), vuelos (40), particulas (41) y avisos (42): reacciones en vuelo e
 * insignias de impacto sobre el asiento de quien la recibe.
 */
function CapaReacciones({ vuelos, impactos, rect, reducido, nombre, alAterrizar }: {
  vuelos: VueloReaccion[]; impactos: Record<string, TipoReaccion>; rect: (n: string) => DOMRect | null;
  reducido: boolean; nombre: (sub: string | null) => string; alAterrizar: (v: VueloReaccion) => void;
}) {
  const activos = Object.entries(impactos);
  if (!vuelos.length && !activos.length) return null;
  return (
    <div className="a-capa-reacciones">
      <AnimatePresence>
        {activos.map(([sub, tipo]) => {
          const r = rect(`asiento:${sub}`);
          if (!r) return null;
          return (
            <motion.span key={`${sub}-${tipo}`} className="a-reaccion-impacto" role="status"
              aria-label={`Reacción para ${nombre(sub)}: ${tipo}`}
              style={{ left: r.left + Math.min(r.width, 60) - 10, top: r.top - 10 }}
              initial={reducido ? { opacity: 1 } : { opacity: 0, scale: 0.4, y: 6 }}
              animate={reducido ? { opacity: 1 } : { opacity: 1, scale: [1.35, 1], y: -2 }}
              exit={{ opacity: 0, scale: 0.7, y: -8 }}
              transition={{ duration: 0.28 }}>
              {emojiReaccion(tipo)}
            </motion.span>
          );
        })}
      </AnimatePresence>
      <div aria-hidden="true">
      {vuelos.map((v) => {
        const dx0 = v.desde.x - 20;
        const dy0 = v.desde.y - 20;
        const dx1 = v.hasta.x - 20;
        const dy1 = v.hasta.y - 20;
        const dyPico = Math.min(dy0, dy1) - 54;
        return (
          <motion.span key={v.id} className="a-reaccion-voladora"
            initial={{ x: dx0, y: dy0, scale: 0.65, rotate: -18, opacity: 0 }}
            animate={{ x: dx1, y: [dy0, dyPico, dy1], scale: [0.7, 1.4, 1.05], rotate: [-18, 14, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => alAterrizar(v)}>
            {emojiReaccion(v.tipo)}
          </motion.span>
        );
      })}
      </div>
    </div>
  );
}
