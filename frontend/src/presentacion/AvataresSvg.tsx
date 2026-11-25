// Cinco avatares vectoriales propios inspirados en personajes cotidianos (sin derechos ni personas reales, ADR-11).
// React puro sin Motion para que tanto la piel ligera como la animada puedan mostrarlos con peso minimo.
import type { AvatarId } from '../preferencias';

export const CATALOGO_AVATARES: ReadonlyArray<{ id: AvatarId; nombre: string; detalle: string }> = [
  { id: 'tendero', nombre: 'El tendero', detalle: 'Lápiz en la oreja y tienda lista' },
  { id: 'tia', nombre: 'La tía', detalle: 'Peineta dorada y ojo clínico' },
  { id: 'taxista', nombre: 'El taxista', detalle: 'Gorra amarilla y mil atajos' },
  { id: 'abuela', nombre: 'La abuela', detalle: 'Lentes listos y sonrisa pícara' },
  { id: 'galan', nombre: 'El galán', detalle: 'Mechón al viento y pura pose' },
];

export function RetratoAvatar({ id, tam = 40, className }: { id: AvatarId; tam?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width={tam} height={tam} aria-hidden="true">
      {id === 'tendero' && <Tendero />}
      {id === 'tia' && <Tia />}
      {id === 'taxista' && <Taxista />}
      {id === 'abuela' && <Abuela />}
      {id === 'galan' && <Galan />}
    </svg>
  );
}

function Tendero() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#234f3c" />
      <path d="M12 62 C14 48 22 44 32 44 C42 44 50 48 52 62 Z" fill="#f3efe6" />
      <path d="M20 46 L44 46 L46 62 L18 62 Z" fill="#2e7d53" />
      <path d="M26 46 L38 46 L36 53 L28 53 Z" fill="#e0a526" opacity="0.9" />
      <ellipse cx="18" cy="31" rx="3.2" ry="4.5" fill="#d99d73" />
      <ellipse cx="46" cy="31" rx="3.2" ry="4.5" fill="#d99d73" />
      {/* Lapiz detras de la oreja */}
      <g transform="translate(44 19) rotate(24)">
        <rect x="0" y="0" width="3.4" height="14" rx="1" fill="#f2c14e" />
        <rect x="0" y="0" width="3.4" height="3" rx="0.8" fill="#d96b6b" />
        <polygon points="0,14 3.4,14 1.7,17" fill="#2c241d" />
      </g>
      <circle cx="32" cy="30" r="14" fill="#e6ae84" />
      <path d="M18 28 C18 16 25 13 33 13 C41 13 46 18 46 28 C42 22 36 21 29 22 C24 23 20 24 18 28 Z" fill="#3a2920" />
      <circle cx="27" cy="29" r="1.9" fill="#231a15" />
      <circle cx="37" cy="29" r="1.9" fill="#231a15" />
      <path d="M24 24 Q27 22.5 30 24 M34 24 Q37 22.5 40 24" stroke="#3a2920" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Bigote poblado */}
      <path d="M22 36 Q27 32 32 35 Q37 32 42 36 Q37 39.5 32 37.5 Q27 39.5 22 36 Z" fill="#3a2920" />
      <path d="M28 40 Q32 42.5 36 40" stroke="#7d3b2b" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  );
}

function Tia() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#5b2234" />
      {/* Mono alto con peineta */}
      <circle cx="32" cy="12" r="9.5" fill="#4f2d27" />
      <path d="M25 8 Q32 3 39 8" stroke="#eab959" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="6" r="1.8" fill="#f7dca0" />
      <path d="M12 62 C14 48 22 44 32 44 C42 44 50 48 52 62 Z" fill="#8f2d4b" />
      {/* Collar de perlas */}
      <circle cx="26" cy="48" r="1.8" fill="#fbf7ee" />
      <circle cx="30" cy="49.5" r="1.8" fill="#fbf7ee" />
      <circle cx="34" cy="49.5" r="1.8" fill="#fbf7ee" />
      <circle cx="38" cy="48" r="1.8" fill="#fbf7ee" />
      {/* Aretes */}
      <circle cx="17" cy="35" r="2.8" fill="#eab959" />
      <circle cx="47" cy="35" r="2.8" fill="#eab959" />
      <circle cx="32" cy="31" r="13.5" fill="#ecc09b" />
      <path d="M18.5 30 C18.5 18 26 16 32 16 C38 16 45.5 18 45.5 30 C41 23 36 22 32 24 C28 22 23 23 18.5 30 Z" fill="#4f2d27" />
      {/* Gafas redondas */}
      <circle cx="26.5" cy="30" r="4.6" fill="rgba(255,255,255,0.22)" stroke="#e4b357" strokeWidth="1.6" />
      <circle cx="37.5" cy="30" r="4.6" fill="rgba(255,255,255,0.22)" stroke="#e4b357" strokeWidth="1.6" />
      <line x1="31.1" y1="30" x2="32.9" y2="30" stroke="#e4b357" strokeWidth="1.6" />
      <circle cx="26.5" cy="30" r="1.6" fill="#231a15" />
      <circle cx="37.5" cy="30" r="1.6" fill="#231a15" />
      <path d="M27.5 38 Q32 41.5 36.5 38" stroke="#b3394e" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Taxista() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#1d354d" />
      <path d="M12 62 C14 48 22 44 32 44 C42 44 50 48 52 62 Z" fill="#2d4c6b" />
      <path d="M27 44 L32 51 L37 44" fill="#e6b235" />
      <circle cx="32" cy="31" r="13.5" fill="#d89b70" />
      {/* Gorra amarilla con visera */}
      <path d="M17 25 C17 15 24 11 32 11 C40 11 47 15 47 25 Z" fill="#f0b92b" />
      <path d="M15 24 Q32 21 49 25 L47 27.5 Q32 24.5 17 27.5 Z" fill="#b88412" />
      <rect x="27" y="16.5" width="3.2" height="3.2" fill="#1d2321" />
      <rect x="30.2" y="16.5" width="3.2" height="3.2" fill="#fff" />
      <rect x="33.4" y="16.5" width="3.2" height="3.2" fill="#1d2321" />
      {/* Gafas de aviador */}
      <path d="M21 29.5 L30.5 29.5 L29.5 35.5 Q25 37 21.5 34 Z" fill="#1b262c" stroke="#d4af5a" strokeWidth="1.2" />
      <path d="M33.5 29.5 L43 29.5 L42.5 34 Q39 37 34.5 35.5 Z" fill="#1b262c" stroke="#d4af5a" strokeWidth="1.2" />
      <line x1="30.5" y1="30" x2="33.5" y2="30" stroke="#d4af5a" strokeWidth="1.4" />
      <path d="M27 39.5 Q33 43 38 38.5" stroke="#5e2f22" strokeWidth="1.9" fill="none" strokeLinecap="round" />
    </>
  );
}

function Abuela() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#6b3b2e" />
      <path d="M12 62 C14 48 22 44 32 44 C42 44 50 48 52 62 Z" fill="#3b7068" />
      {/* Rizos blancos */}
      <circle cx="20" cy="21" r="6.5" fill="#eef1f0" />
      <circle cx="27" cy="16" r="7" fill="#eef1f0" />
      <circle cx="37" cy="16" r="7" fill="#eef1f0" />
      <circle cx="44" cy="21" r="6.5" fill="#eef1f0" />
      <circle cx="18" cy="28" r="5" fill="#e1e6e4" />
      <circle cx="46" cy="28" r="5" fill="#e1e6e4" />
      <circle cx="32" cy="31" r="13.2" fill="#efd0b4" />
      <path d="M20 26 Q26 20 32 23 Q38 20 44 26" fill="#eef1f0" />
      {/* Ojos picaros */}
      <circle cx="27" cy="29.5" r="1.8" fill="#231a15" />
      <circle cx="37" cy="29.5" r="1.8" fill="#231a15" />
      <path d="M24 25.5 Q27 24 30 25.5 M34 25.5 Q37 24 40 25.5" stroke="#c8cfcd" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Lentes a media nariz + cadenita */}
      <rect x="22" y="31.5" width="8.5" height="4.8" rx="2" fill="rgba(255,255,255,0.3)" stroke="#5b6d82" strokeWidth="1.3" />
      <rect x="33.5" y="31.5" width="8.5" height="4.8" rx="2" fill="rgba(255,255,255,0.3)" stroke="#5b6d82" strokeWidth="1.3" />
      <line x1="30.5" y1="33.5" x2="33.5" y2="33.5" stroke="#5b6d82" strokeWidth="1.3" />
      <path d="M21.5 34 Q18 44 23 51" stroke="#e4b357" strokeWidth="1.1" strokeDasharray="1.5 1.8" fill="none" />
      <path d="M42.5 34 Q46 44 41 51" stroke="#e4b357" strokeWidth="1.1" strokeDasharray="1.5 1.8" fill="none" />
      <path d="M27.5 39 Q32 42 37.5 38.5" stroke="#8f4a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  );
}

function Galan() {
  return (
    <>
      <circle cx="32" cy="32" r="32" fill="#3e2b1d" />
      <path d="M12 62 C14 48 22 44 32 44 C42 44 50 48 52 62 Z" fill="#f7f4ec" />
      {/* Panuelo al cuello */}
      <path d="M24 44 L32 54 L40 44 Z" fill="#b8322b" />
      <path d="M30 50 L34 50 L36 60 L29 60 Z" fill="#99231d" />
      <circle cx="32" cy="31" r="13.5" fill="#e5af87" />
      {/* Melena con mechon al viento */}
      <path d="M17 28 C16 14 27 9 39 11 C48 12.5 55 18 52 26 C49 21 44 20 40 22 C35 19 25 21 19 29 Z" fill="#2c1d16" />
      <path d="M39 11 Q54 11 58 17 Q50 18 44 21 Z" fill="#2c1d16" />
      {/* Ceja arqueada */}
      <path d="M23.5 26.5 Q27 24.5 30 26.5" stroke="#2c1d16" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M34 25.5 Q37.5 22.5 41 25" stroke="#2c1d16" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="27" cy="29.5" r="1.8" fill="#231a15" />
      <circle cx="37" cy="29.5" r="1.8" fill="#231a15" />
      {/* Sonrisa ladeada */}
      <path d="M27.5 38.5 Q34 41.5 39 36.5" stroke="#7d3b2b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}
