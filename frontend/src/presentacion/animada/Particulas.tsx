// Capa canvas de partículas físicas sobrias (polvo dorado y chispas de club).
// Usa un pool reutilizable sin asignaciones en el bucle, topes en móvil y pausa cuando la pestaña se oculta.
import { useLayoutEffect, useMemo, useRef } from 'react';

export type ClaseParticula = 'robo' | 'pozo' | 'seleccion' | 'barajado' | 'cierre' | 'eliminacion';

export interface TramoEstela {
  desdeX: number;
  desdeY: number;
  hastaX: number;
  hastaY: number;
  arcoY: number;
  retrasoMs: number;
  duracionMs: number;
}

export interface RectArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MotorParticulas {
  emitir: (x: number, y: number, clase: ClaseParticula) => void;
  emitirBordeCarta: (rect: RectArea) => void;
  emitirUrgenciaHud: (bordes: ReadonlyArray<RectArea | null | undefined>) => void;
  seguirVuelo: (tramo: TramoEstela) => void;
}

type Forma = 'polvo' | 'chispa';
type ColorRGB = readonly [number, number, number];

interface Particula {
  viva: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravedad: number;
  friccion: number;
  edad: number;
  vida: number;
  radio: number;
  rot: number;
  vrot: number;
  forma: Forma;
  r: number;
  g: number;
  b: number;
  alphaMax: number;
}

interface TramoActivo {
  activo: boolean;
  desdeX: number;
  desdeY: number;
  hastaX: number;
  hastaY: number;
  arcoY: number;
  inicioMs: number;
  finMs: number;
  ultimoEmitidoMs: number;
}

const MAX_POOL = 150;
const MAX_MOVIL = 75;
const MAX_TRAMOS = 24;

// Paleta sobria de fieltro, latón y marfil (y carmesí contenido para eliminación).
const LATON_CLARO: ColorRGB = [227, 192, 122];
const ORO_VIEJO: ColorRGB = [201, 164, 92];
const MARFIL: ColorRGB = [248, 241, 224];
const AMBAR: ColorRGB = [184, 137, 61];
const CARMESI: ColorRGB = [208, 86, 78];
const ROJO_HUD: ColorRGB = [224, 88, 78];
const CORAL_HUD: ColorRGB = [244, 146, 120];
const AMBAR_HUD: ColorRGB = [214, 140, 72];

const PALETA_DORADA: readonly ColorRGB[] = [LATON_CLARO, ORO_VIEJO, MARFIL, AMBAR];
const PALETA_ELIMINACION: readonly ColorRGB[] = [CARMESI, CARMESI, ORO_VIEJO, LATON_CLARO];
const PALETA_URGENCIA: readonly ColorRGB[] = [ROJO_HUD, ROJO_HUD, CORAL_HUD, AMBAR_HUD];

function azar(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function colorDe(paleta: readonly ColorRGB[]): ColorRGB {
  return paleta[(Math.random() * paleta.length) | 0];
}

function esCompacto(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 560 || window.matchMedia?.('(pointer: coarse)').matches === true;
}

function crearParticulaVacia(): Particula {
  return {
    viva: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    gravedad: 0,
    friccion: 0.96,
    edad: 0,
    vida: 0.5,
    radio: 1.5,
    rot: 0,
    vrot: 0,
    forma: 'polvo',
    r: 227,
    g: 192,
    b: 122,
    alphaMax: 0.8,
  };
}

function crearTramoVacio(): TramoActivo {
  return {
    activo: false,
    desdeX: 0,
    desdeY: 0,
    hastaX: 0,
    hastaY: 0,
    arcoY: 0,
    inicioMs: 0,
    finMs: 0,
    ultimoEmitidoMs: 0,
  };
}

function dibujarParticula(ctx: CanvasRenderingContext2D, p: Particula, alpha: number) {
  const { x, y, radio, r, g, b } = p;
  if (p.forma === 'polvo') {
    ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.22).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radio * 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Chispa fina de 4 puntas con rotación leve.
  const largo = radio * 2.2;
  const ancho = radio * 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.rot);
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(0, -largo);
  ctx.lineTo(ancho, -ancho);
  ctx.lineTo(largo, 0);
  ctx.lineTo(ancho, ancho);
  ctx.lineTo(0, largo);
  ctx.lineTo(-ancho, ancho);
  ctx.lineTo(-largo, 0);
  ctx.lineTo(-ancho, -ancho);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function tomarRanuraDelPool(st: { pool: Particula[]; cursor: number; compacto: boolean }, forzar = false): Particula | null {
  const tope = st.compacto ? MAX_MOVIL : MAX_POOL;
  let vivas = 0;
  for (let i = 0; i < MAX_POOL; i++) {
    if (st.pool[i].viva) vivas++;
  }
  if (vivas < tope) {
    for (let k = 0; k < MAX_POOL; k++) {
      const idx = (st.cursor + k) % MAX_POOL;
      if (!st.pool[idx].viva) {
        st.cursor = (idx + 1) % MAX_POOL;
        return st.pool[idx];
      }
    }
  }
  if (vivas >= tope || forzar) {
    for (let k = 0; k < MAX_POOL; k++) {
      const idx = (st.cursor + k) % MAX_POOL;
      if (st.pool[idx].viva) {
        st.cursor = (idx + 1) % MAX_POOL;
        return st.pool[idx];
      }
    }
  }
  return null;
}

export function useMotorParticulas(reducido: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;

  const estado = useRef({
    pool: Array.from({ length: MAX_POOL }, crearParticulaVacia),
    tramos: Array.from({ length: MAX_TRAMOS }, crearTramoVacio),
    cursor: 0,
    raf: 0,
    ultimoMs: 0,
    ancho: 0,
    alto: 0,
    dpr: 1,
    compacto: false,
  });

  useLayoutEffect(() => {
    const st = estado.current;

    const limpiar = () => {
      for (let i = 0; i < MAX_POOL; i++) st.pool[i].viva = false;
      for (let i = 0; i < MAX_TRAMOS; i++) st.tramos[i].activo = false;
      if (st.raf) {
        cancelAnimationFrame(st.raf);
        st.raf = 0;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && st.ancho > 0 && st.alto > 0) {
        ctx.clearRect(0, 0, st.ancho, st.alto);
      }
    };

    if (reducido) {
      limpiar();
      return undefined;
    }

    const ajustarTamano = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ancho = window.innerWidth;
      const alto = window.innerHeight;
      st.dpr = dpr;
      st.ancho = ancho;
      st.alto = alto;
      st.compacto = esCompacto();
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    ajustarTamano();

    const hayTrabajo = () => {
      for (let i = 0; i < MAX_POOL; i++) if (st.pool[i].viva) return true;
      for (let i = 0; i < MAX_TRAMOS; i++) if (st.tramos[i].activo) return true;
      return false;
    };

    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        if (st.raf) {
          cancelAnimationFrame(st.raf);
          st.raf = 0;
        }
      } else if (!st.raf && !reducidoRef.current && hayTrabajo()) {
        st.ultimoMs = performance.now();
        st.raf = requestAnimationFrame(bucle);
      }
    };

    window.addEventListener('resize', ajustarTamano, { passive: true });
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    const tomarRanura = () => tomarRanuraDelPool(st);

    function generarEstela(x: number, y: number, vxBase: number, vyBase: number) {
      const p = tomarRanura();
      if (!p) return;
      const [r, g, b] = colorDe(PALETA_DORADA);
      p.viva = true;
      p.x = x + azar(-4, 4);
      p.y = y + azar(-4, 4);
      p.vx = vxBase + azar(-16, 16);
      p.vy = vyBase + azar(-16, 16);
      p.gravedad = 36;
      p.friccion = 0.94;
      p.edad = 0;
      p.vida = azar(0.28, 0.44);
      p.radio = azar(1.2, 2.2);
      p.rot = azar(0, Math.PI);
      p.vrot = azar(-1.5, 1.5);
      p.forma = Math.random() < 0.22 ? 'chispa' : 'polvo';
      p.r = r;
      p.g = g;
      p.b = b;
      p.alphaMax = azar(0.45, 0.72);
    }

    function bucle(ahora: number) {
      st.raf = 0;
      if (reducidoRef.current || document.hidden) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      if (!st.ultimoMs) st.ultimoMs = ahora;
      const dt = Math.min(0.034, Math.max(0.001, (ahora - st.ultimoMs) / 1000));
      st.ultimoMs = ahora;

      // Avanza estelas de vuelos activos y emite motas suaves a lo largo de la parábola.
      let tramosActivos = 0;
      for (let i = 0; i < MAX_TRAMOS; i++) {
        const tr = st.tramos[i];
        if (!tr.activo) continue;
        if (ahora >= tr.finMs) {
          tr.activo = false;
          continue;
        }
        tramosActivos++;
        if (ahora < tr.inicioMs) continue;
        if (ahora - tr.ultimoEmitidoMs >= 26) {
          tr.ultimoEmitidoMs = ahora;
          const u = Math.max(0, Math.min(1, (ahora - tr.inicioMs) / (tr.finMs - tr.inicioMs)));
          const progreso = 1 - Math.pow(1 - u, 3);
          const x = tr.desdeX + (tr.hastaX - tr.desdeX) * progreso;
          const y = tr.desdeY + (tr.hastaY - tr.desdeY) * progreso + tr.arcoY * 4 * progreso * (1 - progreso);
          const dx = tr.hastaX - tr.desdeX;
          const dy = tr.hastaY - tr.desdeY;
          const dist = Math.hypot(dx, dy) || 1;
          generarEstela(x, y, (-dx / dist) * 24, (-dy / dist) * 24);
        }
      }

      ctx.clearRect(0, 0, st.ancho, st.alto);

      let vivas = 0;
      for (let i = 0; i < MAX_POOL; i++) {
        const p = st.pool[i];
        if (!p.viva) continue;
        p.edad += dt;
        if (p.edad >= p.vida) {
          p.viva = false;
          continue;
        }
        vivas++;
        const factor = Math.pow(p.friccion, dt * 60);
        p.vx *= factor;
        p.vy = p.vy * factor + p.gravedad * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;

        const t = p.edad / p.vida;
        const entrada = t < 0.15 ? t / 0.15 : 1;
        const salida = (1 - t) * (1 - t);
        const alpha = p.alphaMax * entrada * salida;
        if (alpha > 0.01) dibujarParticula(ctx, p, alpha);
      }

      if (vivas > 0 || tramosActivos > 0) {
        st.raf = requestAnimationFrame(bucle);
      } else {
        st.ultimoMs = 0;
      }
    }

    // Expone el disparador interno mediante referencias compartidas en el ref de estado.
    arrancarRef.current = () => {
      if (reducidoRef.current || document.hidden || st.raf) return;
      st.ultimoMs = performance.now();
      st.raf = requestAnimationFrame(bucle);
    };

    return () => {
      arrancarRef.current = null;
      window.removeEventListener('resize', ajustarTamano);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      limpiar();
    };
  }, [reducido]);

  const arrancarRef = useRef<(() => void) | null>(null);

  const motor = useMemo<MotorParticulas>(() => ({
    emitir(x, y, clase) {
      if (reducidoRef.current || document.hidden) return;
      const st = estado.current;
      const factorMovil = st.compacto ? 0.55 : 1;

      const baseCantidad: Record<ClaseParticula, number> = {
        robo: 16,
        pozo: 20,
        seleccion: 18,
        barajado: 14,
        cierre: 34,
        eliminacion: 24,
      };
      const cantidad = Math.max(4, Math.round(baseCantidad[clase] * factorMovil));
      const paleta = clase === 'eliminacion' ? PALETA_ELIMINACION : PALETA_DORADA;

      for (let k = 0; k < cantidad; k++) {
        const ranura = tomarRanuraDelPool(st, true);
        if (!ranura) break;

        const [r, g, b] = colorDe(paleta);
        ranura.viva = true;
        ranura.edad = 0;
        ranura.r = r;
        ranura.g = g;
        ranura.b = b;
        ranura.rot = azar(0, Math.PI * 2);

        if (clase === 'robo') {
          ranura.x = x + azar(-14, 14);
          ranura.y = y + azar(-16, 12);
          ranura.vx = azar(-75, 75);
          ranura.vy = azar(-125, -45);
          ranura.gravedad = 150;
          ranura.friccion = 0.96;
          ranura.vida = azar(0.45, 0.75);
          ranura.radio = azar(1.4, 2.7);
          ranura.vrot = azar(-2.5, 2.5);
          ranura.forma = Math.random() < 0.38 ? 'chispa' : 'polvo';
          ranura.alphaMax = azar(0.65, 0.92);
        } else if (clase === 'pozo') {
          ranura.x = x + azar(-18, 18);
          ranura.y = y + azar(-10, 14);
          ranura.vx = azar(-130, 130);
          ranura.vy = azar(-65, 25);
          ranura.gravedad = 190;
          ranura.friccion = 0.95;
          ranura.vida = azar(0.4, 0.7);
          ranura.radio = azar(1.3, 2.6);
          ranura.vrot = azar(-3, 3);
          ranura.forma = Math.random() < 0.42 ? 'chispa' : 'polvo';
          ranura.alphaMax = azar(0.68, 0.94);
        } else if (clase === 'seleccion') {
          ranura.x = x + azar(-20, 20);
          ranura.y = y + azar(-10, 10);
          ranura.vx = azar(-32, 32);
          ranura.vy = azar(-55, -18);
          ranura.gravedad = -14;
          ranura.friccion = 0.97;
          ranura.vida = azar(0.4, 0.65);
          ranura.radio = azar(1.1, 2.1);
          ranura.vrot = azar(-1.8, 1.8);
          ranura.forma = Math.random() < 0.35 ? 'chispa' : 'polvo';
          ranura.alphaMax = azar(0.55, 0.85);
        } else if (clase === 'barajado') {
          ranura.x = x + azar(-22, 22);
          ranura.y = y + azar(-24, 24);
          ranura.vx = azar(-55, 55);
          ranura.vy = azar(-48, 22);
          ranura.gravedad = 80;
          ranura.friccion = 0.96;
          ranura.vida = azar(0.45, 0.7);
          ranura.radio = azar(1.2, 2.3);
          ranura.vrot = azar(-2, 2);
          ranura.forma = Math.random() < 0.3 ? 'chispa' : 'polvo';
          ranura.alphaMax = azar(0.5, 0.82);
        } else if (clase === 'cierre') {
          const ang = azar(0, Math.PI * 2);
          const vel = azar(40, 170);
          ranura.x = x + azar(-24, 24);
          ranura.y = y + azar(-18, 18);
          ranura.vx = Math.cos(ang) * vel;
          ranura.vy = Math.sin(ang) * vel - 35;
          ranura.gravedad = 95;
          ranura.friccion = 0.965;
          ranura.vida = azar(0.65, 1.1);
          ranura.radio = azar(1.6, 3.1);
          ranura.vrot = azar(-3, 3);
          ranura.forma = Math.random() < 0.55 ? 'chispa' : 'polvo';
          ranura.alphaMax = azar(0.7, 0.95);
        } else {
          const ang = azar(0, Math.PI * 2);
          const vel = azar(35, 125);
          ranura.x = x + azar(-12, 12);
          ranura.y = y + azar(-12, 12);
          ranura.vx = Math.cos(ang) * vel;
          ranura.vy = Math.sin(ang) * vel - 30;
          ranura.gravedad = 160;
          ranura.friccion = 0.955;
          ranura.vida = azar(0.55, 0.9);
          ranura.radio = azar(1.5, 2.8);
          ranura.vrot = azar(-3.2, 3.2);
          ranura.forma = Math.random() < 0.5 ? 'chispa' : 'polvo';
          ranura.alphaMax = azar(0.7, 0.95);
        }
      }
      arrancarRef.current?.();
    },

    emitirBordeCarta(rect) {
      if (reducidoRef.current || document.hidden) return;
      const st = estado.current;
      const cantidad = st.compacto ? 2 : 4;
      for (let k = 0; k < cantidad; k++) {
        const ranura = tomarRanuraDelPool(st, true);
        if (!ranura) break;
        const [r, g, b] = colorDe(PALETA_DORADA);
        const lado = Math.random();
        let px = rect.left + Math.random() * rect.width;
        let py = rect.top + azar(-2, 4);
        if (lado < 0.25) {
          px = rect.left + azar(-2, 4);
          py = rect.top + Math.random() * rect.height * 0.65;
        } else if (lado > 0.75) {
          px = rect.left + rect.width + azar(-4, 2);
          py = rect.top + Math.random() * rect.height * 0.65;
        }
        ranura.viva = true;
        ranura.edad = 0;
        ranura.x = px;
        ranura.y = py;
        ranura.vx = azar(-18, 18);
        ranura.vy = azar(-55, -20);
        ranura.gravedad = -12;
        ranura.friccion = 0.97;
        ranura.vida = azar(0.45, 0.75);
        ranura.radio = azar(1.0, 2.0);
        ranura.rot = azar(0, Math.PI * 2);
        ranura.vrot = azar(-1.8, 1.8);
        ranura.forma = Math.random() < 0.35 ? 'chispa' : 'polvo';
        ranura.r = r;
        ranura.g = g;
        ranura.b = b;
        ranura.alphaMax = azar(0.55, 0.85);
      }
      arrancarRef.current?.();
    },

    emitirUrgenciaHud(bordes) {
      if (reducidoRef.current || document.hidden) return;
      const st = estado.current;
      if (!st.ancho || !st.alto) return;
      const porBorde = st.compacto ? 2 : 4;
      for (const rect of bordes) {
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        for (let k = 0; k < porBorde; k++) {
          const lado = (Math.random() * 4) | 0;
          let x = 0;
          let y = 0;
          if (lado === 0) {
            x = rect.left + Math.random() * rect.width;
            y = rect.top + azar(-2, 3);
          } else if (lado === 1) {
            x = rect.left + Math.random() * rect.width;
            y = rect.top + rect.height + azar(-3, 2);
          } else if (lado === 2) {
            x = rect.left + azar(-2, 3);
            y = rect.top + Math.random() * rect.height;
          } else {
            x = rect.left + rect.width + azar(-3, 2);
            y = rect.top + Math.random() * rect.height;
          }
          if (x < -8 || x > st.ancho + 8 || y < -8 || y > st.alto + 8) continue;
          const ranura = tomarRanuraDelPool(st, true);
          if (!ranura) break;
          const [r, g, b] = colorDe(PALETA_URGENCIA);
          ranura.viva = true;
          ranura.edad = 0;
          ranura.x = x;
          ranura.y = y;
          ranura.vx = azar(-18, 18);
          ranura.vy = azar(-28, 10);
          ranura.gravedad = -8;
          ranura.friccion = 0.965;
          ranura.vida = azar(0.45, 0.8);
          ranura.radio = azar(1.1, 2.2);
          ranura.rot = azar(0, Math.PI * 2);
          ranura.vrot = azar(-2.2, 2.2);
          ranura.forma = Math.random() < 0.3 ? 'chispa' : 'polvo';
          ranura.r = r;
          ranura.g = g;
          ranura.b = b;
          ranura.alphaMax = azar(0.55, 0.85);
        }
      }
      arrancarRef.current?.();
    },

    seguirVuelo(tramo) {
      if (reducidoRef.current || document.hidden) return;
      const st = estado.current;
      const ahora = performance.now();
      for (let i = 0; i < MAX_TRAMOS; i++) {
        if (!st.tramos[i].activo) {
          const tr = st.tramos[i];
          tr.activo = true;
          tr.desdeX = tramo.desdeX;
          tr.desdeY = tramo.desdeY;
          tr.hastaX = tramo.hastaX;
          tr.hastaY = tramo.hastaY;
          tr.arcoY = tramo.arcoY;
          tr.inicioMs = ahora + tramo.retrasoMs;
          tr.finMs = tr.inicioMs + tramo.duracionMs;
          tr.ultimoEmitidoMs = 0;
          arrancarRef.current?.();
          return;
        }
      }
    },
  }), []);

  const lienzo = reducido ? null : <canvas ref={canvasRef} className="a-particulas" aria-hidden="true" />;
  return { motor, lienzo };
}
