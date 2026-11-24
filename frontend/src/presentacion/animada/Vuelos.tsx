// Cartas que vuelan entre el mazo, el pozo, la mano y los asientos. Capa fija sobre la mesa; solo transform/opacity.
import { motion } from 'motion/react';
import { Carta } from './comun';

export interface Vuelo {
  id: number;
  desde: DOMRect;
  hasta: DOMRect;
  /** null = carta boca abajo durante todo el vuelo (robo de un rival). */
  carta: string | null;
  /** Sale boca abajo y aterriza boca arriba (giro 3D). */
  voltear: boolean;
  retraso: number;
  alAterrizar?: () => void;
}

/** Tamano base de la carta voladora; se escala para encajar en el origen y en el destino. */
const ANCHO = 64;
const ALTO = 91;

function posicion(r: DOMRect) {
  const escala = Math.min(r.width / ANCHO, r.height / ALTO);
  return { x: r.left + r.width / 2 - ANCHO / 2, y: r.top + r.height / 2 - ALTO / 2, scale: Math.min(1.25, Math.max(0.35, escala)) };
}

export function CapaVuelos({ vuelos, alTerminar }: { vuelos: Vuelo[]; alTerminar: (id: number) => void }) {
  return (
    <div className="a-vuelos" aria-hidden="true">
      {vuelos.map((v) => {
        const a = posicion(v.desde);
        const b = posicion(v.hasta);
        const giro = (b.x - a.x) > 0 ? 8 : -8;
        return (
          <motion.div key={v.id} className="a-vuelo" style={{ width: ANCHO, height: ALTO }}
            initial={{ x: a.x, y: a.y, scale: a.scale, rotate: 0, opacity: 0 }}
            animate={{ x: b.x, y: b.y, scale: b.scale, rotate: [0, giro, 0], opacity: 1 }}
            transition={{
              default: { duration: 0.55, delay: v.retraso, ease: [0.25, 0.8, 0.25, 1] },
              opacity: { duration: 0.08, delay: v.retraso },
            }}
            onAnimationComplete={() => { v.alAterrizar?.(); alTerminar(v.id); }}>
            <Carta codigo={v.carta} bocaAbajo={!v.carta} girar={v.voltear && !!v.carta} retraso={v.retraso + 0.05} />
          </motion.div>
        );
      })}
    </div>
  );
}
