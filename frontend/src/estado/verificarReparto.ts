// RF18 (ADR-03, commit-reveal): al liquidar, el servidor revela el orden del mazo y la sal; el navegador recalcula
// SHA-256(orden + "|" + sal), igual que DealAuditComponent, y lo compara con la huella que mostro al iniciar la ronda.
// Es verificacion del reparto, no de reglas (RD4): no decide nada sobre la partida.

/** Lo que el servidor publica en RondaLiquidada.revelacion. */
export interface Revelacion { clave: string; huella: string; sal: string; orden: string }

export type EstadoVerificacion = 'verificando' | 'verificado' | 'no-coincide' | 'sin-huella' | 'no-disponible';

export interface VerificacionReparto { huella: string | null; estado: EstadoVerificacion }

async function sha256Hex(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compara SHA-256(orden | sal) con la huella anunciada al iniciar la ronda (no con la que viene en la revelacion:
 * esa la podria cambiar quien revela). Web Crypto solo existe en contextos seguros (https o localhost).
 */
export async function verificarReparto(huellaInicio: string | null, r: Revelacion | null | undefined): Promise<EstadoVerificacion> {
  if (!huellaInicio || !r) return 'sin-huella';
  if (typeof crypto === 'undefined' || !crypto.subtle) return 'no-disponible';
  const calculada = await sha256Hex(`${r.orden}|${r.sal}`);
  return calculada === huellaInicio.toLowerCase() ? 'verificado' : 'no-coincide';
}

/** Primeros caracteres de la huella para mostrarla sin ocupar la pantalla. */
export function huellaCorta(huella: string): string {
  return `${huella.slice(0, 12)}…`;
}
