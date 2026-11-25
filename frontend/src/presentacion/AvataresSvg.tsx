// Seis avatares vectoriales propios con sabor paisa (sin escudos registrados ni personas reales, ADR-11).
// React puro sin Motion ni api.ts: los usan la piel ligera y la animada (FF-19, ADR-10). useId() da recortes unicos
// aunque el mismo avatar aparezca varias veces en la pantalla.
import { useId } from 'react';
import type { AvatarId } from '../preferencias';

export const CATALOGO_AVATARES: ReadonlyArray<{ id: AvatarId; nombre: string; detalle: string }> = [
  { id: 'hincha', nombre: 'El hincha', detalle: 'Verdolaga y poderoso en una sola' },
  { id: 'perro', nombre: 'El perro', detalle: 'Criollo caramelo y leal' },
  { id: 'mototaxi', nombre: 'Mototaxi', detalle: 'Carpa amarilla y farola prendida' },
  { id: 'panadero', nombre: 'El panadero', detalle: 'Pan calientico de la mañana' },
  { id: 'metro', nombre: 'El Metro', detalle: 'Orgullo blanco y verde del valle' },
  { id: 'papa', nombre: 'La papa', detalle: 'Criolla, pícara y con brote' },
];

export function RetratoAvatar({ id, tam = 40, className }: { id: AvatarId; tam?: number; className?: string }) {
  const base = useId().replace(/:/g, '');
  const circulo = `${base}-circulo`;
  return (
    <svg className={className} viewBox="0 0 64 64" width={tam} height={tam} aria-hidden="true">
      <defs>
        <clipPath id={circulo}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#${circulo})`}>
        {id === 'hincha' && <Hincha base={base} />}
        {id === 'perro' && <Perro />}
        {id === 'mototaxi' && <Mototaxi />}
        {id === 'panadero' && <Panadero />}
        {id === 'metro' && <Metro />}
        {id === 'papa' && <Papa />}
      </g>
    </svg>
  );
}

/** Mitad izquierda verdiblanca y mitad derecha rojiazul, partidas en x = 32, con un balon de broche al centro. */
function Hincha({ base }: { base: string }) {
  const izq = `${base}-izq`;
  const der = `${base}-der`;
  return (
    <>
      <defs>
        <clipPath id={izq}><rect x="0" y="0" width="32" height="64" /></clipPath>
        <clipPath id={der}><rect x="32" y="0" width="32" height="64" /></clipPath>
      </defs>
      {/* Mitad verdiblanca */}
      <g clipPath={`url(#${izq})`}>
        <rect width="64" height="64" fill="#0f5c3a" />
        <path d="M8 64 C10 49 20 45 32 45 C44 45 54 49 56 64 Z" fill="#f4f6f2" />
        {[12, 20, 28].map((x) => <rect key={x} x={x} y="46" width="4" height="18" fill="#0b8a4e" />)}
        <path d="M14 45 C22 49 42 49 50 45 L50 51 C42 55 22 55 14 51 Z" fill="#0b8a4e" />
        <circle cx="32" cy="30" r="14" fill="#e2a77b" />
        <path d="M17 25 C18 13 46 13 47 25 L47 22 C44 15 20 15 17 22 Z" fill="#0b8a4e" />
        <path d="M15 24 L49 24 L49 21 C44 14 20 14 15 21 Z" fill="#0b8a4e" />
        <rect x="17" y="21.5" width="30" height="3" fill="#f4f6f2" />
        <path d="M19.5 33 L25 33" stroke="#0b8a4e" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M19.5 36 L25 36" stroke="#f4f6f2" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {/* Mitad rojiazul */}
      <g clipPath={`url(#${der})`}>
        <rect width="64" height="64" fill="#1b2f78" />
        <path d="M8 64 C10 49 20 45 32 45 C44 45 54 49 56 64 Z" fill="#c62032" />
        {[36, 44].map((x) => <rect key={x} x={x} y="46" width="5" height="18" fill="#2346b3" />)}
        <path d="M14 45 C22 49 42 49 50 45 L50 51 C42 55 22 55 14 51 Z" fill="#c62032" />
        <path d="M14 48 C22 52 42 52 50 48 L50 50 C42 54 22 54 14 50 Z" fill="#2346b3" />
        <circle cx="32" cy="30" r="14" fill="#d9a079" />
        <path d="M15 24 L49 24 L49 21 C44 14 20 14 15 21 Z" fill="#c62032" />
        <rect x="17" y="21.5" width="30" height="3" fill="#2346b3" />
        <path d="M39 33 L44.5 33" stroke="#c62032" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M39 36 L44.5 36" stroke="#2346b3" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {/* Visera comun, cara compartida y linea central */}
      <path d="M17 24.5 Q32 21 47 24.5 Q40 28.5 32 28 Q24 28.5 17 24.5 Z" fill="#14181a" opacity="0.85" />
      <line x1="32" y1="0" x2="32" y2="64" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.8" />
      <circle cx="26.5" cy="30.5" r="1.9" fill="#1f1712" />
      <circle cx="37.5" cy="30.5" r="1.9" fill="#1f1712" />
      <circle cx="27.1" cy="29.9" r="0.6" fill="#ffffff" />
      <circle cx="38.1" cy="29.9" r="0.6" fill="#ffffff" />
      <path d="M25 37 Q32 43.5 39 37 Q32 40 25 37 Z" fill="#7a2a23" />
      <path d="M27 38.2 Q32 40.6 37 38.2" stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Balon de broche */}
      <g transform="translate(32 49)">
        <circle r="5" fill="#ffffff" stroke="#1d1d1d" strokeWidth="0.8" />
        <polygon points="0,-2.2 2.1,-0.7 1.3,1.8 -1.3,1.8 -2.1,-0.7" fill="#1d1d1d" />
        <path d="M0 -2.2 L0 -5 M2.1 -0.7 L4.7 -1.6 M1.3 1.8 L2.9 4.1 M-1.3 1.8 L-2.9 4.1 M-2.1 -0.7 L-4.7 -1.6"
          stroke="#1d1d1d" strokeWidth="0.7" />
      </g>
    </>
  );
}

/** Criollo caramelo: una oreja parada y otra doblada, lengua afuera y collar rojo con plaquita. */
function Perro() {
  return (
    <>
      <rect width="64" height="64" fill="#5d8fb0" />
      <circle cx="50" cy="12" r="10" fill="#7fb0cf" opacity="0.6" />
      <path d="M10 64 C12 50 21 45 32 45 C43 45 52 50 54 64 Z" fill="#c98a3e" />
      {/* Oreja parada (izquierda) y doblada (derecha) */}
      <path d="M15 27 L18 8 L28 18 Z" fill="#b0702c" />
      <path d="M17.5 23 L19.5 12 L25 18 Z" fill="#e8b98a" />
      <path d="M40 16 C48 12 54 15 52 24 C50 30 45 30 44 24 Z" fill="#8f5520" />
      {/* Cabeza */}
      <ellipse cx="32" cy="30" rx="16" ry="15" fill="#d69a4d" />
      <ellipse cx="32" cy="38.5" rx="10.5" ry="8" fill="#f2dcb8" />
      <path d="M32 18 C29 22 29 27 32 31 C35 27 35 22 32 18 Z" fill="#f2dcb8" opacity="0.7" />
      {/* Ojos */}
      <ellipse cx="25" cy="28" rx="2.6" ry="3" fill="#2a1a10" />
      <ellipse cx="39" cy="28" rx="2.6" ry="3" fill="#2a1a10" />
      <circle cx="25.8" cy="27" r="0.9" fill="#ffffff" />
      <circle cx="39.8" cy="27" r="0.9" fill="#ffffff" />
      <path d="M22 23.5 Q25 22 28 23.5" stroke="#8f5520" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* Nariz brillante, boca y lengua */}
      <ellipse cx="32" cy="34.5" rx="3.6" ry="2.6" fill="#1c1410" />
      <ellipse cx="31" cy="33.6" rx="1.1" ry="0.7" fill="#ffffff" opacity="0.8" />
      <path d="M32 37 L32 39.5 M27.5 39.5 Q32 42.5 36.5 39.5" stroke="#5a3a26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M30 40.5 Q30 46.5 33 46.5 Q36 46.5 36 40.5 Z" fill="#ef7f95" />
      <line x1="33" y1="41" x2="33" y2="45" stroke="#d3607a" strokeWidth="0.8" />
      {/* Collar rojo con plaquita */}
      <path d="M17 48 Q32 54 47 48 L47 52 Q32 58 17 52 Z" fill="#c62f2f" />
      <circle cx="32" cy="56" r="3.2" fill="#f2c14e" stroke="#b8860b" strokeWidth="0.7" />
      <circle cx="32" cy="56" r="1" fill="#b8860b" />
    </>
  );
}

/** Motocarro de frente: carpa amarilla con franja roja, parabrisas, manubrio, farola encendida y llanta. */
function Mototaxi() {
  return (
    <>
      <rect width="64" height="64" fill="#2b3a4a" />
      <rect y="50" width="64" height="14" fill="#3e3e3e" />
      <path d="M0 55 L64 55" stroke="#f2c14e" strokeWidth="1.2" strokeDasharray="5 4" />
      {/* Carpa */}
      <path d="M10 26 C10 10 54 10 54 26 L54 30 L10 30 Z" fill="#f2c230" />
      <path d="M10 25 L54 25 L54 29 L10 29 Z" fill="#d63131" />
      <path d="M14 14 Q32 7 50 14" stroke="#fff3b0" strokeWidth="1.4" fill="none" opacity="0.8" />
      {/* Postes y cabina */}
      <rect x="12" y="29" width="3" height="20" fill="#2a2a2a" />
      <rect x="49" y="29" width="3" height="20" fill="#2a2a2a" />
      <path d="M18 30 L46 30 L44 44 L20 44 Z" fill="#9fd3ec" opacity="0.85" />
      <path d="M21 32 L28 32 L23 42 L20 42 Z" fill="#ffffff" opacity="0.55" />
      {/* Espejos */}
      <line x1="18" y1="33" x2="9" y2="29" stroke="#2a2a2a" strokeWidth="1.2" />
      <ellipse cx="8" cy="28.5" rx="2.6" ry="1.8" fill="#cfd8dc" stroke="#2a2a2a" strokeWidth="0.8" />
      <line x1="46" y1="33" x2="55" y2="29" stroke="#2a2a2a" strokeWidth="1.2" />
      <ellipse cx="56" cy="28.5" rx="2.6" ry="1.8" fill="#cfd8dc" stroke="#2a2a2a" strokeWidth="0.8" />
      {/* Manubrio y frente */}
      <path d="M20 45 L44 45" stroke="#1d1d1d" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26 45 L38 45 L36 52 L28 52 Z" fill="#d63131" />
      {/* Farola encendida */}
      <circle cx="32" cy="48" r="7" fill="#fff6c7" opacity="0.35" />
      <circle cx="32" cy="48" r="3.6" fill="#fffbe0" stroke="#bfa23a" strokeWidth="1" />
      {/* Guardabarros y llanta */}
      <path d="M25 55 Q32 50 39 55 L39 57 L25 57 Z" fill="#2a2a2a" />
      <ellipse cx="32" cy="60" rx="5.5" ry="4" fill="#151515" />
      <ellipse cx="32" cy="60" rx="2" ry="1.5" fill="#8a8a8a" />
    </>
  );
}

/** Panadero sonriente: gorro alto plisado, bigote, delantal y pan dorado con vapor. */
function Panadero() {
  return (
    <>
      <rect width="64" height="64" fill="#7a4a2a" />
      <circle cx="12" cy="12" r="9" fill="#9a6440" opacity="0.6" />
      <path d="M10 64 C12 49 21 44 32 44 C43 44 52 49 54 64 Z" fill="#f7f4ec" />
      <path d="M24 46 L40 46 L42 64 L22 64 Z" fill="#ffffff" stroke="#e1ddd2" strokeWidth="0.8" />
      {/* Gorro alto plisado */}
      <path d="M18 22 C14 10 22 4 27 8 C29 2 37 2 38 8 C44 4 51 11 46 22 Z" fill="#ffffff" stroke="#dedbd2" strokeWidth="0.8" />
      <path d="M26 9 L27 21 M32 6 L32 21 M38 9 L37 21" stroke="#e3dfd4" strokeWidth="1" />
      <rect x="18" y="20" width="28" height="5" rx="1.5" fill="#f2efe7" stroke="#dedbd2" strokeWidth="0.8" />
      {/* Cara */}
      <circle cx="32" cy="34" r="12.5" fill="#efc095" />
      <circle cx="24.5" cy="37" r="2.4" fill="#f09a86" opacity="0.6" />
      <circle cx="39.5" cy="37" r="2.4" fill="#f09a86" opacity="0.6" />
      <path d="M25 31 Q27 29 29 31" stroke="#3b2a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M35 31 Q37 29 39 31" stroke="#3b2a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Bigote amable y sonrisa */}
      <path d="M32 37.5 C29 35.5 25 36.5 24.5 39 C27 38 29.5 39 32 38.6 C34.5 39 37 38 39.5 39 C39 36.5 35 35.5 32 37.5 Z" fill="#5a3a24" />
      <path d="M28.5 41.2 Q32 44 35.5 41.2" stroke="#8a3e2c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Pan dorado con vapor */}
      <ellipse cx="32" cy="56" rx="11" ry="5.5" fill="#d98e32" />
      <ellipse cx="32" cy="55" rx="10" ry="4.2" fill="#eaa94a" />
      <path d="M25 54 L28 57 M30.5 53.5 L33.5 56.5 M36 54 L39 57" stroke="#b8701f" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M26 49 C24 47 28 46 26 44 M32 49 C30 47 34 46 32 44 M38 49 C36 47 40 46 38 44"
        stroke="#ffffff" strokeWidth="1.1" fill="none" opacity="0.75" strokeLinecap="round" />
    </>
  );
}

/** Tren del Metro de Medellin de frente: blanco y verde Metro, parabrisas con letrero 101, faros, viaducto y montanas. */
function Metro() {
  return (
    <>
      <rect width="64" height="64" fill="#9fd1ea" />
      {/* Montanas */}
      <path d="M0 40 L12 26 L20 32 L32 18 L44 30 L52 24 L64 36 L64 64 L0 64 Z" fill="#2f7d4f" />
      <path d="M0 44 L10 36 L22 42 L34 30 L48 40 L64 34 L64 64 L0 64 Z" fill="#3f9a62" />
      {/* Viaducto y rieles */}
      <rect x="0" y="54" width="64" height="4" fill="#bfc4c7" />
      <rect x="12" y="58" width="5" height="6" fill="#a7adb1" />
      <rect x="47" y="58" width="5" height="6" fill="#a7adb1" />
      <path d="M18 54 L4 64 M46 54 L60 64" stroke="#6f767a" strokeWidth="1.2" />
      {/* Carroceria */}
      <path d="M16 54 L16 20 Q16 12 24 12 L40 12 Q48 12 48 20 L48 54 Z" fill="#f7f8f6" stroke="#cfd4d2" strokeWidth="0.8" />
      <rect x="16" y="42" width="32" height="5" fill="#00855a" />
      <rect x="16" y="47" width="32" height="1.6" fill="#f2c230" />
      {/* Parabrisas panoramico con letrero */}
      <path d="M19 31 L19 21 Q19 16 24 16 L40 16 Q45 16 45 21 L45 31 Z" fill="#1d2b33" />
      <path d="M21 29 L27 18 L31 18 L24 29 Z" fill="#ffffff" opacity="0.18" />
      <rect x="25" y="17.5" width="14" height="5" rx="1" fill="#0b1418" />
      <text x="32" y="21.7" textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#ffb02e"
        fontFamily="system-ui, sans-serif">101</text>
      {/* Faros dobles encendidos */}
      <circle cx="22" cy="37" r="2.4" fill="#fff6c7" />
      <circle cx="27" cy="37" r="2.4" fill="#fff6c7" />
      <circle cx="37" cy="37" r="2.4" fill="#fff6c7" />
      <circle cx="42" cy="37" r="2.4" fill="#fff6c7" />
      <rect x="29.5" y="34" width="5" height="6" rx="1" fill="#00855a" />
      <rect x="22" y="50" width="20" height="3" rx="1" fill="#4a5257" />
    </>
  );
}

/** Papa criolla: silueta organica, hoyuelos en la cascara, ojos con brillo, sonrisa picara y brotecito verde. */
function Papa() {
  return (
    <>
      <rect width="64" height="64" fill="#6b4f8a" />
      <circle cx="52" cy="50" r="12" fill="#7d61a0" opacity="0.6" />
      {/* Brote */}
      <path d="M33 13 C33 9 31 7 29 6" stroke="#3f8f3a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M31 8 C27 3 21 5 22 9 C25 10 29 10 31 8 Z" fill="#5fb455" />
      <path d="M32 9 C35 3 41 4 41 8 C38 10 34 10 32 9 Z" fill="#4aa043" />
      {/* Cuerpo de tuberculo */}
      <path d="M14 34 C12 22 22 12 33 13 C45 13 53 21 52 33 C51 46 44 56 31 56 C19 56 15 46 14 34 Z" fill="#d8b46a" />
      <path d="M18 40 C22 50 30 53 38 51 C30 55 20 52 17 44 Z" fill="#c29a4f" opacity="0.7" />
      <path d="M22 18 C28 15 36 15 42 18 C36 17 28 17 22 21 Z" fill="#ecd08f" opacity="0.8" />
      {/* Ojitos/hoyuelos de la cascara */}
      <circle cx="19" cy="29" r="1.1" fill="#a8823e" />
      <circle cx="46" cy="40" r="1.2" fill="#a8823e" />
      <circle cx="40" cy="20" r="0.9" fill="#a8823e" />
      <circle cx="23" cy="47" r="1" fill="#a8823e" />
      {/* Ojos expresivos con brillo */}
      <ellipse cx="26" cy="31" rx="3.6" ry="4.2" fill="#ffffff" />
      <ellipse cx="39" cy="31" rx="3.6" ry="4.2" fill="#ffffff" />
      <circle cx="27" cy="32" r="2.2" fill="#2a1d14" />
      <circle cx="40" cy="32" r="2.2" fill="#2a1d14" />
      <circle cx="27.8" cy="31" r="0.8" fill="#ffffff" />
      <circle cx="40.8" cy="31" r="0.8" fill="#ffffff" />
      <path d="M22.5 25.5 Q26 23.5 29 25.5" stroke="#6e4f24" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M35.5 24.5 Q39 23.5 42.5 26" stroke="#6e4f24" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Sonrisa picara */}
      <circle cx="22" cy="38.5" r="2.3" fill="#e89a7a" opacity="0.55" />
      <circle cx="44" cy="38.5" r="2.3" fill="#e89a7a" opacity="0.55" />
      <path d="M27 40 Q33 46 40 39.5" stroke="#6e3a24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M38.5 39 L41 38" stroke="#6e3a24" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}
