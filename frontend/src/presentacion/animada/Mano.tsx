// Mano en abanico: se reordena arrastrando (Reorder, animacion de layout) y la carta elegida se eleva.
// El orden es solo presentacion: el servidor nunca lo usa para validar (RD4).
import { motion, Reorder, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { forwardRef, MutableRefObject, useCallback, useEffect, useRef } from 'react';
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
  alChispearCarta?: (x: number, y: number) => void;
}

const RESORTE_TILT = { stiffness: 340, damping: 26, mass: 0.5 } as const;

function abanico(i: number, n: number) {
  const centro = (n - 1) / 2;
  const d = n > 1 ? (i - centro) / centro : 0;
  return { rotate: d * Math.min(14, 2 + n), y: d * d * Math.min(22, 4 + n * 1.6) };
}

interface CartaManoProps {
  it: ItemMano;
  i: number;
  elegida: boolean;
  nueva: boolean;
  reducido: boolean;
  rotate: number;
  y: number;
  oculta: boolean;
  arrastrando: MutableRefObject<boolean>;
  alSeleccionar: () => void;
  alChispear?: (x: number, y: number) => void;
}

function CartaMano({
  it, i, elegida, nueva, reducido, rotate, y, oculta, arrastrando, alSeleccionar, alChispear,
}: CartaManoProps) {
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const lustreOpacidad = useMotionValue(0);
  const lustreX = useMotionValue(0);

  const rotXSpring = useSpring(rotX, RESORTE_TILT);
  const rotYSpring = useSpring(rotY, RESORTE_TILT);
  const lustreOpacidadSpring = useSpring(lustreOpacidad, RESORTE_TILT);
  const lustreXSpring = useSpring(lustreX, RESORTE_TILT);

  const soltarTilt = useCallback(() => {
    rotX.set(0);
    rotY.set(0);
    lustreOpacidad.set(0);
    lustreX.set(0);
  }, [rotX, rotY, lustreOpacidad, lustreX]);

  useEffect(() => {
    if (reducido) soltarTilt();
  }, [reducido, soltarTilt]);

  return (
    <Reorder.Item value={it} as="li" className="a-mano-item" data-id={it.id}
      style={{ zIndex: elegida ? 30 : i + 1 }}
      animate={{ rotate: elegida ? 0 : rotate, y: elegida ? y - 26 : y, opacity: oculta ? 0 : 1 }}
      transition={{ ...RESORTE, opacity: { duration: 0.12 } }}
      whileDrag={reducido ? undefined : { scale: 1.08, rotate: 0 }}
      onDragStart={(ev) => {
        arrastrando.current = true;
        soltarTilt();
        const el = (ev.target as HTMLElement | null)?.closest('.a-mano-item');
        const r = el?.getBoundingClientRect();
        if (r) alChispear?.(r.left + r.width / 2, r.top + r.height * 0.28);
      }}
      onDragEnd={() => { setTimeout(() => { arrastrando.current = false; }, 0); }}>
      <button type="button" className={['a-boton-carta', elegida ? 'elegida' : '', nueva ? 'nueva' : ''].join(' ')}
        aria-pressed={elegida} aria-label={nombreCarta(it.codigo)}
        onPointerMove={(ev) => {
          // En pantallas táctiles no aplicamos inclinación 3D: solo queda la elevación limpia.
          if (reducido || arrastrando.current || ev.pointerType === 'touch') return;
          const r = ev.currentTarget.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const nx = Math.max(-0.5, Math.min(0.5, (ev.clientX - r.left) / r.width - 0.5));
          const ny = Math.max(-0.5, Math.min(0.5, (ev.clientY - r.top) / r.height - 0.5));
          rotX.set(-ny * (elegida ? 18 : 12));
          rotY.set(nx * (elegida ? 20 : 14));
          lustreOpacidad.set(elegida ? 0.24 : 0.14);
          lustreX.set(nx * 44);
        }}
        onPointerLeave={soltarTilt}
        onPointerCancel={soltarTilt}
        onClick={(ev) => {
          if (arrastrando.current) return;
          if (!elegida) {
            const r = ev.currentTarget.getBoundingClientRect();
            alChispear?.(r.left + r.width / 2, r.top + r.height * 0.25);
          }
          alSeleccionar();
        }}>
        <motion.span className="a-carta-tilt"
          style={reducido ? undefined : { rotateX: rotXSpring, rotateY: rotYSpring, transformPerspective: 650 }}>
          <Carta codigo={it.codigo} />
          {!reducido && (
            <span className="a-lustre-marco" aria-hidden="true">
              <motion.span className="a-lustre-puntero" style={{ opacity: lustreOpacidadSpring, x: lustreXSpring }} />
            </span>
          )}
        </motion.span>
        <motion.span className="a-halo" aria-hidden="true" animate={{ opacity: elegida ? 1 : 0 }} />
      </button>
    </Reorder.Item>
  );
}

export const Mano = forwardRef<HTMLUListElement, Props>(function Mano(
  { items, seleccion, ocultas, nueva, alSeleccionar, alReordenar, alChispearCarta }, ref) {
  const reducido = !!useReducedMotion();
  const arrastrando = useRef(false);
  const n = items.length;
  return (
    <Reorder.Group as="ul" axis="x" values={items} onReorder={alReordenar} className="a-mano" ref={ref}
      style={{ ['--n' as string]: n }} aria-label={`Tu mano, ${n} cartas`}>
      {items.map((it, i) => {
        const elegida = seleccion === i;
        const { rotate, y } = abanico(i, n);
        return (
          <CartaMano key={it.id} it={it} i={i} elegida={elegida} nueva={it.codigo === nueva}
            reducido={reducido} rotate={rotate} y={y} oculta={ocultas.has(it.id)}
            arrastrando={arrastrando} alSeleccionar={() => alSeleccionar(elegida ? null : i)}
            alChispear={alChispearCarta} />
        );
      })}
    </Reorder.Group>
  );
});
