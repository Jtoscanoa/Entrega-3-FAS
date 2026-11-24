// Mano en abanico (arrastrable con Reorder) o en 2 filas limpias para que en móvil no se oculten cartas.
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
  enTurno?: boolean;
  dosFilas?: boolean;
  grupos?: number[];
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
  enTurno: boolean;
  enGrupo: boolean;
  sepGrupo: boolean;
  dosFilas: boolean;
  reducido: boolean;
  rotate: number;
  y: number;
  oculta: boolean;
  arrastrando: MutableRefObject<boolean>;
  alSeleccionar: () => void;
  alChispear?: (x: number, y: number) => void;
}

function ContenidoCarta({
  it, i, elegida, nueva, enTurno, enGrupo, reducido, arrastrando, soltarTilt, rotXSpring, rotYSpring,
  lustreOpacidadSpring, lustreXSpring, rotX, rotY, lustreOpacidad, lustreX, alSeleccionar, alChispear,
}: {
  it: ItemMano;
  i: number;
  elegida: boolean;
  nueva: boolean;
  enTurno: boolean;
  enGrupo: boolean;
  reducido: boolean;
  arrastrando: MutableRefObject<boolean>;
  soltarTilt: () => void;
  rotXSpring: ReturnType<typeof useSpring>;
  rotYSpring: ReturnType<typeof useSpring>;
  lustreOpacidadSpring: ReturnType<typeof useSpring>;
  lustreXSpring: ReturnType<typeof useSpring>;
  rotX: ReturnType<typeof useMotionValue<number>>;
  rotY: ReturnType<typeof useMotionValue<number>>;
  lustreOpacidad: ReturnType<typeof useMotionValue<number>>;
  lustreX: ReturnType<typeof useMotionValue<number>>;
  alSeleccionar: () => void;
  alChispear?: (x: number, y: number) => void;
}) {
  return (
    <button type="button"
      className={['a-boton-carta', elegida ? 'elegida' : '', nueva ? 'nueva' : '', enGrupo ? 'en-grupo' : ''].join(' ')}
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
            {enTurno && <span className="a-barrido-turno" style={{ ['--i' as string]: i }} />}
            <motion.span className="a-lustre-puntero" style={{ opacity: lustreOpacidadSpring, x: lustreXSpring }} />
          </span>
        )}
      </motion.span>
      <motion.span className="a-halo" aria-hidden="true" animate={{ opacity: elegida ? 1 : 0 }} transition={{ duration: 0.16 }}>
        {!reducido && (
          <span className="a-halo-anillo">
            <span className="a-halo-giro" />
          </span>
        )}
      </motion.span>
    </button>
  );
}

function CartaMano(props: CartaManoProps) {
  const { it, i, elegida, sepGrupo, dosFilas, reducido, rotate, y, oculta, arrastrando, alChispear } = props;
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

  const claseItem = ['a-mano-item', sepGrupo ? 'sep-grupo' : ''].join(' ');
  const contenido = (
    <ContenidoCarta
      {...props}
      soltarTilt={soltarTilt}
      rotXSpring={rotXSpring}
      rotYSpring={rotYSpring}
      lustreOpacidadSpring={lustreOpacidadSpring}
      lustreXSpring={lustreXSpring}
      rotX={rotX}
      rotY={rotY}
      lustreOpacidad={lustreOpacidad}
      lustreX={lustreX}
    />
  );

  if (dosFilas) {
    return (
      <motion.li layout className={claseItem} data-id={it.id}
        style={{ zIndex: elegida ? 30 : i + 1 }}
        animate={{ rotate: 0, y: elegida ? -14 : 0, opacity: oculta ? 0 : 1 }}
        transition={{ ...RESORTE, opacity: { duration: 0.12 } }}>
        {contenido}
      </motion.li>
    );
  }

  return (
    <Reorder.Item value={it} as="li" className={claseItem} data-id={it.id}
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
      {contenido}
    </Reorder.Item>
  );
}

export const Mano = forwardRef<HTMLUListElement, Props>(function Mano(
  { items, seleccion, ocultas, nueva, enTurno = false, dosFilas = false, grupos, alSeleccionar, alReordenar, alChispearCarta }, ref) {
  const reducido = !!useReducedMotion();
  const arrastrando = useRef(false);
  const n = items.length;

  const tarjetas = items.map((it, i) => {
    const elegida = seleccion === i;
    const { rotate, y } = abanico(i, n);
    const idG = grupos ? (grupos[i] ?? -1) : -1;
    const prevG = grupos && i > 0 ? (grupos[i - 1] ?? -1) : -1;
    const sepGrupo = i > 0 && ((idG >= 0 && idG !== prevG) || (idG === -1 && prevG >= 0));
    return (
      <CartaMano key={it.id} it={it} i={i} elegida={elegida} nueva={it.codigo === nueva}
        enTurno={enTurno} enGrupo={idG >= 0} sepGrupo={sepGrupo} dosFilas={dosFilas}
        reducido={reducido} rotate={rotate} y={y} oculta={ocultas.has(it.id)}
        arrastrando={arrastrando} alSeleccionar={() => alSeleccionar(elegida ? null : i)}
        alChispear={alChispearCarta} />
    );
  });

  if (dosFilas) {
    return (
      <ul className="a-mano dos-filas" ref={ref} style={{ ['--n' as string]: n }} aria-label={`Tu mano, ${n} cartas`}>
        {tarjetas}
      </ul>
    );
  }

  return (
    <Reorder.Group as="ul" axis="x" values={items} onReorder={alReordenar} className="a-mano" ref={ref}
      style={{ ['--n' as string]: n }} aria-label={`Tu mano, ${n} cartas`}>
      {tarjetas}
    </Reorder.Group>
  );
});
