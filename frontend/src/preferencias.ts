// Eleccion de la version de la interfaz. Lo que el jugador elige se guarda y manda sobre la deteccion.

export type Version = 'animada' | 'ligera';

const CLAVE = 'mesa101.version';

interface NavegadorExtendido extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

/** Ligera si el equipo pide menos movimiento, ahorra datos o tiene poca memoria o pocos nucleos. */
export function versionDetectada(): Version {
  const n = navigator as NavegadorExtendido;
  let menosMovimiento = false;
  try { menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* sin matchMedia */ }
  const ahorroDatos = n.connection?.saveData === true;
  const pocaMemoria = typeof n.deviceMemory === 'number' && n.deviceMemory <= 2;
  const pocosNucleos = typeof n.hardwareConcurrency === 'number' && n.hardwareConcurrency <= 4;
  return menosMovimiento || ahorroDatos || pocaMemoria || pocosNucleos ? 'ligera' : 'animada';
}

export function versionGuardada(): Version | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'animada' || v === 'ligera' ? v : null;
  } catch {
    return null;
  }
}

export function versionInicial(): Version {
  return versionGuardada() ?? versionDetectada();
}

export function guardarVersion(v: Version): void {
  try { localStorage.setItem(CLAVE, v); } catch { /* almacenamiento no disponible: la eleccion dura la sesion */ }
}

const CLAVE_SILENCIO = 'mesa101.silencio';

export function silencioGuardado(): boolean | null {
  try {
    const v = localStorage.getItem(CLAVE_SILENCIO);
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
}

/** En la version ligera los efectos de sonido vienen apagados por defecto (recursos limitados). */
export function silencioInicial(version: Version): boolean {
  return silencioGuardado() ?? (version === 'ligera');
}

export function guardarSilencio(silenciado: boolean): void {
  try { localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0'); } catch { /* almacenamiento no disponible */ }
}

export const AVATAR_IDS = ['hincha', 'perro', 'mototaxi', 'panadero', 'metro', 'papa'] as const;
export type AvatarId = typeof AVATAR_IDS[number];

const CLAVE_AVATAR = 'mesa101.avatar';

export function esAvatarValido(v: unknown): v is AvatarId {
  return typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v);
}

export function avatarInicial(): AvatarId {
  try {
    const v = localStorage.getItem(CLAVE_AVATAR);
    // Un id viejo guardado (p. ej. 'galan' o 'tendero') ya no es valido: se migra a 'hincha' sin AVATAR_INVALIDO.
    return esAvatarValido(v) ? v : 'hincha';
  } catch {
    return 'hincha';
  }
}

export function guardarAvatar(a: AvatarId): void {
  try { localStorage.setItem(CLAVE_AVATAR, a); } catch { /* almacenamiento no disponible */ }
}
