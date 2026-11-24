// Efectos de desconexion y reconexion propios: una franja discreta "Reconectando…" mientras la conexion esta caida
// (la mesa se atenua) y un aviso breve "Conexion recuperada" al volver. Solo transform y opacity.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Red = 'estable' | 'caida' | 'recuperada';

/** Devuelve el estado visible de la red; ignora la primera conexion (no hay nada que "recuperar"). */
export function useEstadoRed(conectado: boolean): Red {
  const [red, setRed] = useState<Red>('estable');
  const huboConexion = useRef(false);
  useEffect(() => {
    if (conectado && !huboConexion.current) { huboConexion.current = true; return undefined; }
    if (!huboConexion.current) return undefined;
    if (!conectado) { setRed('caida'); return undefined; }
    setRed('recuperada');
    const t = setTimeout(() => setRed('estable'), 2400);
    return () => clearTimeout(t);
  }, [conectado]);
  return red;
}

export function FranjaRed({ red }: { red: Red }) {
  return (
    <div className="a-red-ancla" role="status" aria-live="polite">
      <AnimatePresence>
        {red === 'caida' && (
          <motion.div key="caida" className="a-red caida" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <span className="a-red-puntos" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.i key={i} animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </span>
            Se perdió la conexión. Reconectando…
            <span className="a-red-barra" aria-hidden="true">
              <motion.span animate={{ x: ['-100%', '260%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
            </span>
          </motion.div>
        )}
        {red === 'recuperada' && (
          <motion.div key="ok" className="a-red ok" initial={{ opacity: 0, y: -14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <motion.path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                strokeLinejoin="round" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.25 }} />
            </svg>
            Conexión recuperada
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
