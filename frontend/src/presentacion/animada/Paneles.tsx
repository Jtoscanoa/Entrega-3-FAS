// Liquidacion (puntos que cuentan hacia arriba y barras hacia el umbral) y fin de partida (confeti y podio).
import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { MOTIVO_FIN, TIPO_CIERRE, VERIFICACION_REPARTO } from '../../mensajes';
import type { FinPartida, Liquidacion, VistaMesa } from '../../estado/tipos';
import { Avatar } from './comun';

function Contador({ desde, hasta, retraso, signo = false }: { desde: number; hasta: number; retraso: number; signo?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducido = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const pintar = (v: number) => { const r = Math.round(v); el.textContent = signo && r > 0 ? `+${r}` : String(r); };
    if (reducido) { pintar(hasta); return undefined; }
    pintar(desde);
    const c = animate(desde, hasta, { duration: 0.9, delay: retraso, ease: [0.2, 0.7, 0.2, 1], onUpdate: pintar });
    return () => c.stop();
  }, [desde, hasta, retraso, signo, reducido]);
  return <span ref={ref} className="a-num" />;
}

function FilaLiquidacion({ mesa, sub, l, indice }: { mesa: VistaMesa; sub: string; l: Liquidacion; indice: number }) {
  const reducido = useReducedMotion();
  const puntos = l.puntosRonda[sub] ?? 0;
  const total = l.marcador[sub] ?? 0;
  const previo = total - puntos;
  const umbral = mesa.e.umbral || 101;
  const eliminado = l.eliminados.includes(sub);
  const conBarra = mesa.e.modalidad !== 'CLASICA_433';
  const retraso = 0.25 + indice * 0.16;
  return (
    <motion.li className={['a-fila-liq', sub === l.cerrador ? 'cerrador' : '', eliminado ? 'eliminado' : ''].join(' ')}
      initial={{ opacity: 0, y: 14 }}
      animate={eliminado ? { opacity: [0, 1, 1, 0.48], y: 0, x: reducido ? 0 : [0, -7, 7, -4, 4, 0] } : { opacity: 1, y: 0 }}
      transition={eliminado ? {
        opacity: { duration: 2.2, delay: retraso, times: [0, 0.15, 0.72, 1] },
        y: { duration: 0.4, delay: retraso },
        x: { duration: 0.34, delay: retraso + 1.25 },
      } : { duration: 0.4, delay: retraso }}>
      {eliminado && !reducido && (
        <motion.span className="a-fila-alerta" aria-hidden="true"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.45, 0.14] }}
          transition={{ duration: 0.7, delay: retraso + 1.22, times: [0, 0.28, 1] }} />
      )}
      <Avatar sub={sub} nombre={mesa.alias(sub)} avatar={mesa.avatar(sub)} enTurno={false} tam={36} />
      <span className="a-liq-nombre">{mesa.nombre(sub)}{sub === l.cerrador && <small>cerró</small>}</span>
      <span className="a-liq-ronda"><Contador desde={0} hasta={puntos} retraso={retraso} signo /></span>
      <span className="a-liq-total"><Contador desde={previo} hasta={total} retraso={retraso + 0.2} /></span>
      {conBarra && (
        <span className="a-barra" aria-hidden="true">
          <motion.span className={['a-barra-relleno', total >= umbral * 0.8 ? 'peligro' : ''].join(' ')}
            initial={{ scaleX: Math.max(0, Math.min(1, previo / umbral)) }}
            animate={{ scaleX: Math.max(0, Math.min(1, total / umbral)) }}
            transition={{ duration: 1, delay: retraso + 0.2, ease: [0.2, 0.7, 0.2, 1] }} />
        </span>
      )}
      {eliminado && (
        <>
          {!reducido && (
            <motion.span className="a-sello-onda" aria-hidden="true"
              initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
              animate={{ opacity: [0, 0.85, 0], scale: [0.9, 1.45] }}
              transition={{ delay: retraso + 1.3, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }} />
          )}
          <motion.span className="a-sello"
            initial={reducido ? { opacity: 1, scale: 1, rotate: -8 } : { opacity: 0, scale: 2.15, rotate: -16 }}
            animate={reducido ? { opacity: 1, scale: 1, rotate: -8 } : { opacity: 1, scale: [2.15, 0.93, 1], rotate: [-16, -7, -8] }}
            transition={{ delay: reducido ? 0 : retraso + 1.25, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}>
            Eliminado
          </motion.span>
        </>
      )}
    </motion.li>
  );
}

function FileteOrnamental() {
  const reducido = useReducedMotion();
  return (
    <motion.svg className="a-filete" viewBox="0 0 220 14" width="220" height="14" aria-hidden="true"
      initial={reducido ? false : { opacity: 0, scaleX: 0.45 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}>
      <line x1="8" y1="7" x2="96" y2="7" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
      <polygon points="110,2 115,7 110,12 105,7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="110" cy="7" r="1.4" fill="currentColor" />
      <line x1="124" y1="7" x2="212" y2="7" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
    </motion.svg>
  );
}

export function PanelLiquidacion({ mesa, l }: { mesa: VistaMesa; l: Liquidacion }) {
  const subs = Object.keys(l.marcador);
  return (
    <motion.div className="a-velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="a-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-liq"
        initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
        <FileteOrnamental />
        <p className="a-sobretitulo">Ronda {l.ronda}</p>
        <h2 id="titulo-liq">{l.cerrador === mesa.yo ? 'Cerraste la ronda' : `${mesa.nombre(l.cerrador)} cerró la ronda`}</h2>
        <p className="a-tenue">{TIPO_CIERRE[l.tipoCierre] ?? l.tipoCierre}</p>
        <div className="a-liq-cabecera" aria-hidden="true"><span /><span /><span>Ronda</span><span>Total</span></div>
        <ul className="a-liq">{subs.map((s, i) => <FilaLiquidacion key={s} mesa={mesa} sub={s} l={l} indice={i} />)}</ul>
        {mesa.e.modalidad !== 'CLASICA_433' && <p className="a-tenue a-pequeno">La barra avanza hacia {mesa.e.umbral}: quien llega queda eliminado.</p>}
        <p className="a-tenue a-pequeno">Cada perdedor suma sus cartas sueltas con la agrupación que menos puntos le deja.</p>
        <VerificacionAnimada l={l} />
        <motion.button type="button" className="a-boton principal" autoFocus whileTap={{ scale: 0.97 }}
          onClick={mesa.cerrarLiquidacion}>Seguir jugando</motion.button>
      </motion.section>
    </motion.div>
  );
}

/** RF18: SHA-256(orden + sal) recalculado en este navegador frente a la huella anunciada al iniciar la ronda. */
function VerificacionAnimada({ l }: { l: Liquidacion }) {
  if (!l.reparto) return null;
  return (
    <div className={['a-verificacion', l.reparto.estado].join(' ')} role="status">
      <span>{VERIFICACION_REPARTO[l.reparto.estado]}</span>
      {l.reparto.huella && <code title="Huella anunciada al iniciar la ronda">{l.reparto.huella}</code>}
    </div>
  );
}

const COLORES_CONFETI = ['#c9a45c', '#e8d7a8', '#f3ede0', '#7fa88f', '#b8463f'];

function Confeti() {
  const piezas = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    id: i, x: Math.random() * 100, deriva: (Math.random() - 0.5) * 160, giro: (Math.random() - 0.5) * 720,
    retraso: Math.random() * 0.6, duracion: 2.6 + Math.random() * 1.6, color: COLORES_CONFETI[i % COLORES_CONFETI.length],
    ancho: 5 + Math.random() * 5,
  })), []);
  return (
    <div className="a-confeti" aria-hidden="true">
      {piezas.map((p) => (
        <motion.span key={p.id} style={{ left: `${p.x}%`, background: p.color, width: p.ancho, height: p.ancho * 1.8 }}
          initial={{ y: '-10vh', x: 0, rotate: 0, scaleX: 1, opacity: 1 }}
          animate={{ y: '105vh', x: p.deriva, rotate: p.giro, scaleX: [1, -0.8, 1], opacity: [1, 1, 0] }}
          transition={{ duration: p.duracion, delay: p.retraso, ease: [0.3, 0.1, 0.5, 1] }} />
      ))}
    </div>
  );
}

function CoronaGanador() {
  const reducido = useReducedMotion();
  return (
    <motion.svg className="a-corona" viewBox="0 0 36 22" width="32" height="20" aria-hidden="true"
      initial={reducido ? false : { opacity: 0, y: -6, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <path d="M4 18 L6 7 L13 13 L18 4 L23 13 L30 7 L32 18 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="18" cy="3.5" r="1.5" fill="currentColor" />
      <circle cx="6" cy="6.2" r="1.2" fill="currentColor" />
      <circle cx="30" cy="6.2" r="1.2" fill="currentColor" />
    </motion.svg>
  );
}

export function PanelFin({ mesa, fin }: { mesa: VistaMesa; fin: FinPartida }) {
  const reducido = useReducedMotion();
  const orden = [fin.ganador, ...Object.keys(mesa.e.marcador).filter((s) => s !== fin.ganador)
    .sort((a, b) => (mesa.e.marcador[a] ?? 0) - (mesa.e.marcador[b] ?? 0))];
  const podio = [orden[1], orden[0], orden[2]].map((s, i) => ({ s, puesto: [2, 1, 3][i] }))
    .filter((p): p is { s: string; puesto: number } => !!p.s);
  return (
    <motion.div className="a-velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {!reducido && <Confeti />}
      <motion.section className="a-panel a-panel-fin" role="dialog" aria-modal="true" aria-labelledby="titulo-fin"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <FileteOrnamental />
        <p className="a-sobretitulo">Fin de la partida</p>
        <h2 id="titulo-fin">{fin.ganador === mesa.yo ? '¡Ganaste!' : `Ganó ${mesa.nombre(fin.ganador)}`}</h2>
        <p className="a-tenue">La partida terminó porque {MOTIVO_FIN[fin.motivo] ?? fin.motivo}.</p>
        <div className="a-podio">
          {podio.map(({ s, puesto }, i) => (
            <div key={s} className={`a-escalon p${puesto}`}>
              <motion.div className="a-podio-jugador" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.18, duration: 0.4 }}>
                {puesto === 1 && <CoronaGanador />}
                <Avatar sub={s} nombre={mesa.alias(s)} avatar={mesa.avatar(s)} enTurno={puesto === 1} tam={puesto === 1 ? 56 : 44} />
                <span>{mesa.nombre(s)}</span>
                <small>{mesa.e.marcador[s] ?? 0} pts</small>
              </motion.div>
              <motion.div className="a-bloque" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
                <b>{puesto}</b>
              </motion.div>
            </div>
          ))}
        </div>
        {orden.length > 3 && (
          <ol className="a-resto" start={4}>
            {orden.slice(3).map((s) => <li key={s}>{mesa.nombre(s)} · {mesa.e.marcador[s] ?? 0} pts</li>)}
          </ol>
        )}
        {mesa.historial.length > 0 && <VerificacionAnimada l={mesa.historial[mesa.historial.length - 1]} />}
        <motion.button type="button" className="a-boton principal" autoFocus whileTap={{ scale: 0.97 }}
          onClick={mesa.salir}>Volver al inicio</motion.button>
      </motion.section>
    </motion.div>
  );
}
