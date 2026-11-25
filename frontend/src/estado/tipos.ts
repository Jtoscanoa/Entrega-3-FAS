// Tipos compartidos entre el estado (src/estado) y las dos pieles (src/presentacion).
// Las pieles importan tipos desde aqui y nunca desde api.ts (FF-19).
import type { VerificacionReparto } from './verificarReparto';

export type { EstadoVerificacion, VerificacionReparto } from './verificarReparto';

export interface Sesion { token: string; sub: string; apodo: string; venceEn: string }
export interface Participante { sub: string; alias: string }
export interface EstadoSala { codigo: string; anfitrion: string; jugadores: Participante[]; partidaId: number | null }
export interface OpcionesPartida {
  modalidad: 'APUNTADO_101' | 'CLASICA_433';
  robarDelDescarte: boolean;
  umbral: number | null;
  segundosPorTurno: number;
  comodines: boolean;
  cierreAPintas: boolean;
  segundoMazo: boolean;
  /** Apuntado: el sobrante debe ser menor o igual a este valor (0 a 4; 4 = "menor a 5"). */
  residuoMaximo: number | null;
}
/** Sobre de los mensajes STOMP salientes del servidor: {tipo, datos}. */
export interface Mensaje { tipo: string; datos: any }

/** Mensaje del chat de la mesa tal como lo difunde el servidor (ya limpio y acotado). */
export interface MensajeChat { id: number; jugadorId: string; texto: string; hora: string }

/**
 * Avance de la mano propia hacia el cierre (RF16), calculado por el servidor con el evaluador de reglas: la SPA solo
 * lo muestra (RD4). Las cartas van por codigo; {@code cartas} es el tamano de la mano evaluada, para no mostrar un
 * avance viejo mientras llega la vista nueva.
 */
export interface AvanceMano {
  grupos: string[][]; cuartasFormadas: number; cuartasRequeridas: number; ternasFormadas: number;
  ternasRequeridas: number; puntosSobrantes: number; puedeCerrar: boolean; descarteSugerido: string | null;
  cartas: number;
}

/** Estado de la mesa tal como lo comunica el servidor (RD4: la SPA no decide nada sobre las reglas). */
export interface EstadoMesa {
  ronda: number; orden: string[]; cima: string | null; marcador: Record<string, number>;
  turnoDe: string | null; numeroTurno: number; fase: string; modalidad: string; umbral: number;
  robarDelDescarte: boolean; eliminados: string[]; finalizada: boolean; venceEn: string | null; nueva: string | null;
  /** Momento local (ms) en que llego el TurnoAsignado vigente: base del reloj de turno. */
  turnoDesde: number | null;
  /** Jugadores sin ninguna sesion abierta segun la presencia del servidor (RF17, ADR-08b). */
  ausentes: string[];
  /** Huella SHA-256 del reparto de la ronda en curso, anunciada al iniciarla (RF18, ADR-03). */
  huella: string | null;
  /** Avance de la mano propia segun el servidor; null si aun no llega (RF16). */
  avance: AvanceMano | null;
}

export interface Liquidacion {
  ronda: number; cerrador: string; tipoCierre: string; puntosRonda: Record<string, number>;
  marcador: Record<string, number>; eliminados: string[];
  /** RF18: resultado de recalcular en el navegador la huella del reparto de esta ronda (solo si se vio liquidar). */
  reparto?: VerificacionReparto;
}

export interface FinPartida { ganador: string; motivo: string }
export interface Aviso { texto: string; tipo: 'error' | 'info'; cierre: boolean }
export type OrigenRobo = 'MAZO' | 'DESCARTE';

/**
 * Hechos de la mesa en el orden en que llegaron, para que una piel pueda animarlos.
 * La piel ligera los ignora; la animada procesa los de id mayor al ultimo que vio.
 */
export type EventoMesa =
  | { id: number; tipo: 'reparto'; cartas: number }
  | { id: number; tipo: 'robo'; jugadorId: string; origen: OrigenRobo }
  | { id: number; tipo: 'recibida'; carta: string; origen: OrigenRobo | null }
  | { id: number; tipo: 'descarte'; jugadorId: string; carta: string }
  | { id: number; tipo: 'rechazo'; motivo: string }
  | { id: number; tipo: 'liquidacion'; ronda: number }
  | { id: number; tipo: 'fin' };

/** Lo que useMesa() entrega a cualquiera de las dos pieles. */
export interface VistaMesa {
  yo: string;
  codigo: string;
  e: EstadoMesa;
  conectado: boolean;
  nombre: (sub: string | null) => string;
  /** Apodo tal cual (tambien el propio), para avatares e iniciales. */
  alias: (sub: string) => string;
  jugadores: string[];
  seleccion: number | null;
  cartaSel: string | null;
  miTurno: boolean;
  debeRobar: boolean;
  debeDescartar: boolean;
  segundos: number | null;
  instruccion: string;
  /** Avance vigente de la mano propia (el del servidor, si corresponde a la mano que se ve); null si no hay. */
  avance: AvanceMano | null;
  aviso: Aviso | null;
  bitacora: string[];
  liquidacion: Liquidacion | null;
  historial: Liquidacion[];
  fin: FinPartida | null;
  eventos: EventoMesa[];
  /** Chat en vivo de la mesa, del mas viejo al mas nuevo. */
  chat: MensajeChat[];
  enviarChat: (texto: string) => void;
  seleccionar: (indice: number | null) => void;
  robar: (delDescarte: boolean) => void;
  descartar: () => void;
  cerrar: () => void;
  mover: (desde: number, hasta: number) => void;
  reordenar: (orden: string[]) => void;
  ordenarPorPinta: () => void;
  ordenarPorValor: () => void;
  cerrarLiquidacion: () => void;
  salir: () => void;
}

/** Pantalla de entrada: el jugador escribe su apodo. */
export interface VistaInicio {
  apodo: string; setApodo: (v: string) => void; puedeEntrar: boolean; entrar: () => void; error: string;
}

/** Vestibulo: crear una sala o unirse con un codigo. */
export interface VistaVestibulo {
  apodo: string; codigo: string; setCodigo: (v: string) => void; puedeUnirse: boolean;
  crear: () => void; unirse: () => void; cambiarApodo: () => void; error: string;
  /** Aviso informativo al llegar (p. ej. la partida se interrumpio por un reinicio); '' si no hay. */
  aviso: string;
}

/** Sala de espera: quien llego y, para el anfitrion, la eleccion de modalidad. */
export interface VistaSala {
  codigo: string; yo: string; estado: EstadoSala | null; soyAnfitrion: boolean; opciones: OpcionesPartida;
  cambiar: (o: Partial<OpcionesPartida>) => void; puedeIniciar: boolean; iniciar: () => void; salir: () => void;
  error: string;
}

export type VistaPrevia =
  | { pantalla: 'inicio'; inicio: VistaInicio }
  | { pantalla: 'vestibulo'; vestibulo: VistaVestibulo }
  | { pantalla: 'sala'; sala: VistaSala };
