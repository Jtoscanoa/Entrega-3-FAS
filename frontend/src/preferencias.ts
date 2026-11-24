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
