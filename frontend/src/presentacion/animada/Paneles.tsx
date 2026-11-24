// Liquidacion (puntos que cuentan hacia arriba y barras hacia el umbral) y fin de partida (confeti y podio).
import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { MOTIVO_FIN, TIPO_CIERRE } from '../../mensajes';
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
  const puntos = l.puntosRonda[sub] ?? 0;
  const total = l.marcador[sub] ?? 0;
  const previo = total - puntos;
  const umbral = mesa.e.umbral || 101;
  const eliminado = l.eliminados.includes(sub);
  const conBarra = mesa.e.modalidad !== 'CLASICA_433';
  const retraso = 0.25 + indice * 0.16;
  return (
    <motion.li className={['a-fila-liq', sub === l.cerrador ? 'cerrador' : ''].join(' ')}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: eliminado ? [0, 1, 1, 0.42] : 1, y: 0 }}
      transition={{ duration: eliminado ? 2.2 : 0.4, delay: retraso, times: eliminado ? [0, 0.15, 0.7, 1] : undefined }}>
      <Avatar sub={sub} nombre={mesa.alias(sub)} enTurno={false} tam={36} />
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
        <motion.span className="a-sello" initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }} transition={{ delay: retraso + 1.3, duration: 0.35 }}>
          Eliminado
        </motion.span>
      )}
    </motion.li>
  );
}

export function PanelLiquidacion({ mesa, l }: { mesa: VistaMesa; l: Liquidacion }) {
  const subs = Object.keys(l.marcador);
  return (
    <motion.div className="a-velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="a-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-liq"
        initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
        <p className="a-sobretitulo">Ronda {l.ronda}</p>
        <h2 id="titulo-liq">{l.cerrador === mesa.yo ? 'Cerraste la ronda' : `${mesa.nombre(l.cerrador)} cerró la ronda`}</h2>
        <p className="a-tenue">{TIPO_CIERRE[l.tipoCierre] ?? l.tipoCierre}</p>
        <div className="a-liq-cabecera" aria-hidden="true"><span /><span /><span>Ronda</span><span>Total</span></div>
        <ul className="a-liq">{subs.map((s, i) => <FilaLiquidacion key={s} mesa={mesa} sub={s} l={l} indice={i} />)}</ul>
        {mesa.e.modalidad !== 'CLASICA_433' && <p className="a-tenue a-pequeno">La barra avanza hacia {mesa.e.umbral}: quien llega queda eliminado.</p>}
        <p className="a-tenue a-pequeno">Cada perdedor suma sus cartas sueltas con la agrupación que menos puntos le deja.</p>
        <motion.button type="button" className="a-boton principal" autoFocus whileTap={{ scale: 0.97 }}
          onClick={mesa.cerrarLiquidacion}>Seguir jugando</motion.button>
      </motion.section>
    </motion.div>
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
          initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: p.deriva, rotate: p.giro, opacity: [1, 1, 0] }}
          transition={{ duration: p.duracion, delay: p.retraso, ease: [0.3, 0.1, 0.5, 1] }} />
      ))}
    </div>
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
        <p className="a-sobretitulo">Fin de la partida</p>
        <h2 id="titulo-fin">{fin.ganador === mesa.yo ? '¡Ganaste!' : `Ganó ${mesa.nombre(fin.ganador)}`}</h2>
        <p className="a-tenue">La partida terminó porque {MOTIVO_FIN[fin.motivo] ?? fin.motivo}.</p>
        <div className="a-podio">
          {podio.map(({ s, puesto }, i) => (
            <div key={s} className={`a-escalon p${puesto}`}>
              <motion.div className="a-podio-jugador" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.18, duration: 0.4 }}>
                <Avatar sub={s} nombre={mesa.alias(s)} enTurno={puesto === 1} tam={puesto === 1 ? 56 : 44} />
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
        <motion.button type="button" className="a-boton principal" autoFocus whileTap={{ scale: 0.97 }}
          onClick={mesa.salir}>Volver al inicio</motion.button>
      </motion.section>
    </motion.div>
  );
}
