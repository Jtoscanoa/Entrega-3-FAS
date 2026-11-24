// Mano en abanico: se reordena arrastrando (Reorder, animacion de layout) y la carta elegida se eleva.
// El orden es solo presentacion: el servidor nunca lo usa para validar (RD4).
import { motion, Reorder, useReducedMotion } from 'motion/react';
import { forwardRef, useRef } from 'react';
import { Carta, nombreCarta, RESORTE } from './comun';

export interface ItemMano { id: string; codigo: string }

/** Ids estables aun con cartas repetidas (segundo mazo): codigo + numero de aparicion. */
export function itemsDe(orden: string[]): ItemMano[] {
  const vistas: Record<string, number> = {};
  return orden.map((codigo) => {
    const n = vistas[codigo] ?? 0;
    vistas[codigo] = n + 1;
    return { id: `${codigo}#${n}`, codigo };
  });
}

interface Props {
  items: ItemMano[];
  seleccion: number | null;
  ocultas: ReadonlySet<string>;
  nueva: string | null;
  alSeleccionar: (indice: number | null) => void;
  alReordenar: (items: ItemMano[]) => void;
}

function abanico(i: number, n: number) {
  const centro = (n - 1) / 2;
  const d = n > 1 ? (i - centro) / centro : 0;
  return { rotate: d * Math.min(14, 2 + n), y: d * d * Math.min(22, 4 + n * 1.6) };
}

export const Mano = forwardRef<HTMLUListElement, Props>(function Mano(
  { items, seleccion, ocultas, nueva, alSeleccionar, alReordenar }, ref) {
  const reducido = useReducedMotion();
  const arrastrando = useRef(false);
  const n = items.length;
  return (
    <Reorder.Group as="ul" axis="x" values={items} onReorder={alReordenar} className="a-mano" ref={ref}
      style={{ ['--n' as string]: n }} aria-label={`Tu mano, ${n} cartas`}>
      {items.map((it, i) => {
        const elegida = seleccion === i;
        const { rotate, y } = abanico(i, n);
        return (
          <Reorder.Item key={it.id} value={it} as="li" className="a-mano-item" data-id={it.id}
            style={{ zIndex: elegida ? 30 : i + 1 }}
            animate={{ rotate: elegida ? 0 : rotate, y: elegida ? y - 26 : y, opacity: ocultas.has(it.id) ? 0 : 1 }}
            transition={{ ...RESORTE, opacity: { duration: 0.12 } }}
            whileDrag={reducido ? undefined : { scale: 1.08, rotate: 0 }}
            onDragStart={() => { arrastrando.current = true; }}
            onDragEnd={() => { setTimeout(() => { arrastrando.current = false; }, 0); }}>
            <button type="button" className={['a-boton-carta', elegida ? 'elegida' : '', it.codigo === nueva ? 'nueva' : ''].join(' ')}
              aria-pressed={elegida} aria-label={nombreCarta(it.codigo)}
              onClick={() => { if (!arrastrando.current) alSeleccionar(elegida ? null : i); }}>
              <Carta codigo={it.codigo} />
              <motion.span className="a-halo" aria-hidden="true" animate={{ opacity: elegida ? 1 : 0 }} />
            </button>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
});
