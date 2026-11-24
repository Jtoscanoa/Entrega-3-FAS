// Cliente REST y STOMP. La SPA no valida reglas: el servidor es la fuente de verdad (RD4).
import { Client, IMessage } from '@stomp/stompjs';
import type { EstadoSala, Mensaje, OpcionesPartida, Sesion } from './estado/tipos';

export type { EstadoSala, Mensaje, OpcionesPartida, Participante, Sesion } from './estado/tipos';

export class ErrorApi extends Error {
  constructor(public motivo: string) { super(motivo); }
}

async function llamar<T>(metodo: string, ruta: string, token: string | null, cuerpo?: unknown): Promise<T> {
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  const r = await fetch(ruta, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  if (!r.ok) {
    let motivo = `HTTP_${r.status}`;
    try { motivo = (await r.json()).motivo ?? motivo; } catch { /* respuesta sin cuerpo JSON */ }
    throw new ErrorApi(motivo);
  }
  return r.json() as Promise<T>;
}

export const api = {
  abrirSesion: (apodo: string) => llamar<Sesion>('POST', '/api/sesion', null, { apodo }),
  crearSala: (t: string) => llamar<{ codigo: string }>('POST', '/api/salas', t),
  unirse: (t: string, codigo: string) => llamar<{ jugadores: string[] }>('POST', `/api/salas/${codigo}/unirse`, t),
  estadoSala: (t: string, codigo: string) => llamar<EstadoSala>('GET', `/api/salas/${codigo}`, t),
  iniciar: (t: string, codigo: string, o: OpcionesPartida) =>
    llamar<{ partidaId: number }>('POST', `/api/salas/${codigo}/iniciar`, t, o),
};

export interface ManejadoresMesa {
  alMensaje: (m: Mensaje) => void;
  alError: (motivo: string) => void;
  alConectar: () => void;
  alDesconectar: () => void;
}

/** Conexion STOMP a una partida: se suscribe a los canales publico, privado y de errores; reintenta sola. */
export function conectarMesa(token: string, partidaId: number, h: ManejadoresMesa) {
  const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
  const cliente = new Client({
    brokerURL: `${protocolo}://${location.host}/ws`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: 2000,
  });
  const json = (f: IMessage) => JSON.parse(f.body);
  cliente.onConnect = () => {
    cliente.subscribe(`/topic/partidas/${partidaId}`, (f) => h.alMensaje(json(f)));
    cliente.subscribe('/user/queue/partida', (f) => h.alMensaje(json(f)));
    cliente.subscribe('/user/queue/errores', (f) => h.alError(json(f).motivo));
    h.alConectar();
  };
  cliente.onWebSocketClose = () => h.alDesconectar();
  cliente.onStompError = () => h.alDesconectar();
  cliente.activate();
  const enviar = (accion: string, cuerpo: unknown = {}) => {
    if (cliente.connected) cliente.publish({ destination: `/app/partidas/${partidaId}/${accion}`, body: JSON.stringify(cuerpo) });
  };
  return {
    reanudar: () => enviar('reanudar'),
    robar: (delDescarte: boolean, numeroTurno: number) => enviar('robar', { delDescarte, numeroTurno }),
    descartar: (carta: string, numeroTurno: number) => enviar('descartar', { carta, numeroTurno }),
    cerrar: (carta: string, numeroTurno: number) => enviar('cerrar', { carta, numeroTurno }),
    cerrarConexion: () => { void cliente.deactivate(); },
  };
}

export type ConexionMesa = ReturnType<typeof conectarMesa>;

/** Guardado por pestana (sessionStorage): recargar conserva la partida y cada pestana es un jugador distinto. */
export const guardado = {
  leer<T>(clave: string): T | null {
    try { const v = sessionStorage.getItem(clave); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  escribir(clave: string, valor: unknown) {
    try { sessionStorage.setItem(clave, JSON.stringify(valor)); } catch { /* almacenamiento no disponible */ }
  },
  borrar(clave: string) {
    try { sessionStorage.removeItem(clave); } catch { /* almacenamiento no disponible */ }
  },
};
