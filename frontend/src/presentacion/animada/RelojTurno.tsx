// Reloj de turno: un anillo de segmentos que se apagan (solo opacity). En los ultimos 10 s cambia de color
// (fundido entre dos capas) y late (transform: scale).
import { motion, useReducedMotion } from 'motion/react';

const SEGMENTOS = 40;

function Anillo({ activos, clase }: { activos: number; clase: string }) {
  return (
    <span className={`a-reloj-anillo ${clase}`} aria-hidden="true">
      {Array.from({ length: SEGMENTOS }, (_, i) => (
        <span key={i} style={{ transform: `rotate(${(i * 360) / SEGMENTOS}deg)`, opacity: i < activos ? 1 : 0.12 }} />
      ))}
    </span>
  );
}

export function RelojTurno({ segundos, total, mio }: { segundos: number; total: number; mio: boolean }) {
  const reducido = useReducedMotion();
  const fraccion = total > 0 ? Math.min(1, segundos / total) : 0;
  const activos = Math.ceil(fraccion * SEGMENTOS);
  // Rojo en los ultimos 10 s, pero el latido se detiene en 0: un turno vencido no titila para siempre.
  const rojo = segundos <= 10;
  const urgente = segundos > 0 && segundos <= 10;
  return (
    <motion.div className={['a-reloj', mio ? 'mio' : ''].join(' ')} role="timer"
      aria-label={`Quedan ${segundos} segundos del turno`}
      animate={urgente && !reducido ? { scale: [1, 1.09, 1] } : { scale: 1 }}
      transition={urgente && !reducido ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}>
      <Anillo activos={activos} clase="normal" />
      <motion.span className="a-reloj-capa" animate={{ opacity: rojo ? 1 : 0 }} transition={{ duration: 0.4 }}>
        <Anillo activos={activos} clase="urgente" />
      </motion.span>
      <span className="a-reloj-num">{segundos}</span>
    </motion.div>
  );
}
