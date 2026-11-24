// Version animada de la mesa (minima, fase 2): confirma la carga diferida y que comparte el estado con la ligera.
import { motion } from 'motion/react';
import { infoCarta } from '../../cartas';
import type { VistaMesa } from '../../estado/tipos';
import './animada.css';

export default function MesaAnimada({ mesa }: { mesa: VistaMesa }) {
  const { e } = mesa;
  return (
    <main className="anim-mesa">
      <motion.section className="anim-fieltro" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <p>Versión animada · Ronda {e.ronda} · {mesa.instruccion}</p>
        <div className="anim-mano">
          {e.orden.map((c, i) => {
            const info = infoCarta(c);
            return (
              <motion.button key={`${c}-${i}`} type="button" className={info.roja ? 'anim-carta roja' : 'anim-carta'}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: mesa.seleccion === i ? -14 : 0 }}
                onClick={() => mesa.seleccionar(mesa.seleccion === i ? null : i)}>
                {info.valor}{info.simbolo}
              </motion.button>
            );
          })}
        </div>
        <div className="anim-acciones">
          <button type="button" disabled={!mesa.debeRobar} onClick={() => mesa.robar(false)}>Robar del mazo</button>
          <button type="button" disabled={!mesa.debeDescartar || !mesa.cartaSel} onClick={mesa.descartar}>Descartar</button>
        </div>
      </motion.section>
    </main>
  );
}
