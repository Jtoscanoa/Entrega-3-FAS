// Traduccion de motivos del servidor a mensajes claros (RF16).
import type { AvanceMano } from './estado/tipos';

const MOTIVOS: Record<string, string> = {
  PARTIDA_INEXISTENTE: 'La partida ya no existe en el servidor (puede haberse reiniciado).',
  PARTIDA_FINALIZADA: 'La partida ya terminó.',
  FUERA_DE_TURNO: 'No es tu turno.',
  TURNO_OBSOLETO: 'Ese turno ya pasó; la mesa se actualizó.',
  FASE_INCORRECTA: 'Esa acción no corresponde ahora: primero se roba una carta y luego se descarta o se cierra.',
  CARTA_NO_EN_MANO: 'Esa carta no está en tu mano.',
  DESCARTE_NO_PERMITIDO: 'En esta mesa no se puede robar del pozo.',
  PILA_VACIA: 'El pozo está vacío.',
  COMANDO_INVALIDO: 'El servidor no entendió la jugada.',
  SALA_INEXISTENTE: 'No existe una sala con ese código.',
  SALA_LLENA: 'La sala está llena.',
  SALA_EN_JUEGO: 'Esa sala ya empezó a jugar.',
  NO_ES_ANFITRION: 'Solo el anfitrión puede iniciar la partida.',
  JUGADORES_INSUFICIENTES: 'Se necesitan al menos 2 jugadores para iniciar.',
  APODO_INVALIDO: 'Escribe un apodo de 1 a 20 caracteres.',
  HTTP_401: 'Tu sesión venció. Vuelve a entrar con tu apodo.',
  CHAT_VACIO: 'Escribe algo antes de enviar.',
  CHAT_LARGO: 'El mensaje es muy largo (máximo 200 caracteres).',
  CHAT_MUY_RAPIDO: 'Vas muy rápido: espera unos segundos para volver a escribir.',
  CHAT_SIN_ASIENTO: 'Solo los jugadores de la mesa pueden escribir en el chat.',
};

/**
 * Opciones del tiempo de turno en la sala: 60 s por defecto y 45 s como minimo. En la sesion S1 la mediana de un turno
 * completo fue 22,6 s y el maximo 46,7 s; con 35 s vencieron 10 turnos con el jugador conectado.
 */
export const SEGUNDOS_POR_TURNO = [45, 60, 90, 120] as const;

/** RF09: residuos permitidos (el servidor valida 0 a 4; 4 = "sobrante menor a 5", la regla del caso). */
export const RESIDUOS = [4, 3, 2, 1, 0] as const;
export function textoResiduo(r: number): string {
  return r === 4 ? 'Menos de 5 puntos (regla del caso)' : `Hasta ${r} ${r === 1 ? 'punto' : 'puntos'}`;
}
export const AYUDA_AVANZADAS = 'Vienen como dice el caso de estudio: las reglas extra están apagadas. '
  + 'El servidor valida cada opción al iniciar.';
export const AVISO_SEGUNDO_MAZO = 'Con 5 o 6 jugadores hace falta el segundo mazo; el servidor no iniciará sin él.';

/** Largo maximo de un mensaje de chat; el servidor lo vuelve a comprobar. */
export const LARGO_CHAT = 200;

/** Retro E2 2.3: tras un reinicio el servidor anula la ronda en curso; la SPA vuelve al vestibulo con este aviso. */
export const PARTIDA_INTERRUMPIDA = 'La partida se interrumpió por un reinicio del servidor. La ronda en curso se anuló; '
  + 'los puntos de las rondas ya liquidadas quedaron guardados.';

/** D9: la ronda anterior quedo liquidada, pero la siguiente no se pudo abrir todavia. */
export function rondaPendiente(numeroRonda: number): string {
  return `No se pudo abrir la ronda ${numeroRonda}. Los puntos ya quedaron guardados; se reintentará en unos segundos.`;
}

export function mensajeDe(motivo: string): string {
  return MOTIVOS[motivo] ?? motivo;
}

export const NOMBRE_MODALIDAD: Record<string, string> = {
  APUNTADO_101: 'Apuntado a 101',
  CLASICA_433: 'Clásica 4-3-3',
};

export const TIPO_CIERRE: Record<string, string> = {
  CLASICO_433: 'Clásico (1 cuarta + 2 ternas)',
  APUNTADO: 'Apuntado (3 ternas + sobrante < 5)',
  COMPLETO: 'Completo',
  A_PINTAS: 'A pintas',
};

/** RF18: resultado de verificar el reparto en el navegador. */
export const VERIFICACION_REPARTO: Record<string, string> = {
  verificando: 'Verificando el reparto…',
  verificado: '✓ Reparto verificado: SHA-256(orden + sal) coincide con la huella del inicio.',
  'no-coincide': '✗ La huella no coincide: el orden revelado no es el que se anunció al iniciar.',
  'sin-huella': 'No se pudo verificar: no se vio la huella al iniciar esta ronda.',
  'no-disponible': 'Este navegador no permite verificar (Web Crypto requiere https).',
};

/** Nombre corto del tipo de cierre para la tabla del historial (RF13). */
export const CIERRE_CORTO: Record<string, string> = {
  CLASICO_433: 'Clásico', APUNTADO: 'Apuntado', COMPLETO: 'Completo', A_PINTAS: 'A pintas',
};

export const MOTIVO_FIN: Record<string, string> = {
  MAXIMO_RONDAS: 'se jugó la única ronda de la modalidad',
  TODOS_SUPERARON_UMBRAL: 'todos superaron el umbral; gana el menor marcador',
  ULTIMO_ACTIVO: 'solo quedó un jugador sin llegar al umbral',
  META_VICTORIA: 'un jugador alcanzó la meta de victoria',
};

/** "2/3 ternas · sobrante 12 pts" (Clasica: "Cuarta 0/1 · 1/2 ternas · sobrante 9 pts"); '' sin datos. */
export function textoAvance(a: AvanceMano): string {
  if (!a.ternasRequeridas) return '';
  const partes = [`${a.ternasFormadas}/${a.ternasRequeridas} ternas`, `sobrante ${a.puntosSobrantes} pts`];
  if (a.cuartasRequeridas) partes.unshift(`Cuarta ${a.cuartasFormadas}/${a.cuartasRequeridas}`);
  return partes.join(' · ');
}

/**
 * Barra de proyeccion (E3-18f): "Si cierran ahora: +17 pts → 64 / 101 (te faltan 37)". Todos los numeros vienen del
 * servidor; el umbral es el de la mesa. Sin umbral (Clasica): "Si cierran ahora: +17 pts → 17". Al llegar al umbral:
 * "Si cierran ahora: +37 pts → 101: quedarías eliminado" (sin "/ 101" para que quepa en una linea a 360 px).
 */
export function textoProyeccion(a: AvanceMano, umbral: number): string {
  const base = `Si cierran ahora: +${a.penalizacion} pts → ${a.marcadorProyectado}`;
  if (a.faltaParaUmbral === null) return base;
  if (a.quedariaEliminado) return `${base}: quedarías eliminado`;
  return `${base} / ${umbral} (te ${a.faltaParaUmbral === 1 ? 'falta 1' : `faltan ${a.faltaParaUmbral}`})`;
}

/** Relleno de la barra: marcador proyectado frente al umbral (solo presentacion). */
export function llenadoProyeccion(a: AvanceMano, umbral: number): string {
  if (a.marcadorProyectado === null || a.faltaParaUmbral === null || umbral <= 0) return '0%';
  return `${Math.max(0, Math.min(100, (a.marcadorProyectado / umbral) * 100))}%`;
}

/** Pista cuando el servidor dice que la mano ya cierra. */
export function pistaCierre(carta: string): string {
  return `¡Puedes cerrar! Elige ${carta} y pulsa Cerrar.`;
}

export function ayudaCierre(modalidad: string): string {
  return modalidad === 'CLASICA_433'
    ? 'Clásica: al cerrar, las 10 cartas que te quedan deben formar 1 cuarta y 2 ternas, sin cartas sueltas.'
    : 'Apuntado: al cerrar, las 10 cartas que te quedan deben formar 3 ternas y las sueltas deben sumar menos de 5 puntos.';
}
