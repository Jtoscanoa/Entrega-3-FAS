// Traduccion de motivos del servidor a mensajes claros (RF16).
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
};

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

export const MOTIVO_FIN: Record<string, string> = {
  MAXIMO_RONDAS: 'se jugó la única ronda de la modalidad',
  TODOS_SUPERARON_UMBRAL: 'todos superaron el umbral; gana el menor marcador',
  ULTIMO_ACTIVO: 'solo quedó un jugador sin llegar al umbral',
  META_VICTORIA: 'un jugador alcanzó la meta de victoria',
};

export function ayudaCierre(modalidad: string): string {
  return modalidad === 'CLASICA_433'
    ? 'Clásica: al cerrar, las 10 cartas que te quedan deben formar 1 cuarta y 2 ternas, sin cartas sueltas.'
    : 'Apuntado: al cerrar, las 10 cartas que te quedan deben formar 3 ternas y las sueltas deben sumar menos de 5 puntos.';
}
