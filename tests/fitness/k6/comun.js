// Utilidades compartidas por las fitness functions dinamicas FF-14 (latencia.js) y FF-15 (reconexion.js).
// STOMP 1.2 escrito a mano sobre k6/ws: un frame es COMANDO\ncabecera:valor\n...\n\ncuerpo\0 (ADR-06).
// Los mensajes del servidor llegan en el sobre {tipo, datos}; los errores de comando por /user/queue/errores.
import http from 'k6/http';
import { check, fail } from 'k6';

const NULO = '\0';

/** URL base del servidor sin barra final (p. ej. https://mesa101.duckdns.org o http://localhost:8080). */
export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
export const WS_URL = `${BASE_URL.replace(/^http/, 'ws')}/ws`;

export function entero(nombre, porDefecto) {
  const v = parseInt(__ENV[nombre] || '', 10);
  return Number.isNaN(v) ? porDefecto : v;
}

function frame(comando, cabeceras, cuerpo = '') {
  const lineas = Object.entries(cabeceras).map(([k, v]) => `${k}:${v}`);
  return `${comando}\n${lineas.join('\n')}\n\n${cuerpo}${NULO}`;
}

/** Sin latidos (0,0): los VU no tienen un hilo libre para mandarlos y el servidor no los exige si no se pactan. */
export const stomp = {
  conectar: (token) => frame('CONNECT', { 'accept-version': '1.2', 'heart-beat': '0,0', Authorization: `Bearer ${token}` }),
  suscribir: (id, destino) => frame('SUBSCRIBE', { id, destination: destino }),
  enviar: (destino, cuerpo) => frame('SEND', { destination: destino, 'content-type': 'application/json' },
    JSON.stringify(cuerpo)),
};

/** Un mensaje de WebSocket puede traer uno o varios frames, o solo un salto de linea (latido). */
export function leerFrames(datos) {
  return String(datos).split(NULO).map((t) => t.replace(/^[\r\n]+/, '')).filter((t) => t.length > 0).map((t) => {
    const fin = t.indexOf('\n\n');
    const [comando, ...lineas] = (fin < 0 ? t : t.slice(0, fin)).split('\n');
    const cabeceras = {};
    lineas.forEach((l) => {
      const i = l.indexOf(':');
      if (i > 0) cabeceras[l.slice(0, i)] = l.slice(i + 1);
    });
    return { comando, cabeceras, cuerpo: fin < 0 ? '' : t.slice(fin + 2) };
  });
}

/** Suscripciones de la SPA a una partida (api.ts): canal publico, privado y de errores. */
export function suscribirPartida(socket, partidaId) {
  socket.send(stomp.suscribir('publico', `/topic/partidas/${partidaId}`));
  socket.send(stomp.suscribir('privado', '/user/queue/partida'));
  socket.send(stomp.suscribir('errores', '/user/queue/errores'));
}

export const reanudar = (partidaId) => stomp.enviar(`/app/partidas/${partidaId}/reanudar`, {});

// ------------------------------------------------------------------ REST (ADR-07b y lobby)

const JSON_CT = { 'Content-Type': 'application/json' };
const conToken = (token) => ({ headers: Object.assign({ Authorization: `Bearer ${token}` }, JSON_CT) });

function exigir(res, que) {
  if (!check(res, { [`${que} 2xx`]: (r) => r.status >= 200 && r.status < 300 })) {
    fail(`${que}: HTTP ${res.status} ${res.body}`);
  }
  return res.json();
}

/** n sesiones de invitado (POST /api/sesion) en un lote: [{token, sub}]. */
export function crearSesiones(n, prefijo) {
  const pedidos = Array.from({ length: n }, (_, i) => ['POST', `${BASE_URL}/api/sesion`,
    JSON.stringify({ apodo: `${prefijo}${i}`.slice(0, 20) }), { headers: JSON_CT }]);
  return http.batch(pedidos).map((r) => {
    const s = exigir(r, 'sesion');
    return { token: s.token, sub: s.sub };
  });
}

/** Crea la sala con el primero, une a los demas e inicia la partida; devuelve {partidaId, jugadores}. */
export function abrirMesa(jugadores, opciones) {
  const [anfitrion, ...invitados] = jugadores;
  const { codigo } = exigir(http.post(`${BASE_URL}/api/salas`, null, conToken(anfitrion.token)), 'crear sala');
  http.batch(invitados.map((j) => ['POST', `${BASE_URL}/api/salas/${codigo}/unirse`, null, conToken(j.token)]))
    .forEach((r) => exigir(r, 'unirse'));
  const { partidaId } = exigir(http.post(`${BASE_URL}/api/salas/${codigo}/iniciar`, JSON.stringify(opciones),
    conToken(anfitrion.token)), 'iniciar');
  return { partidaId, jugadores };
}

/** La SPA juega Apuntado con robo del pozo; el plazo largo evita vencimientos mientras los VU se conectan. */
export const OPCIONES_MESA = { modalidad: 'APUNTADO_101', robarDelDescarte: true, segundosPorTurno: 120 };

/** Valor de una metrica del resumen, o null si no hubo muestras. */
export function valor(data, metrica, estadistico) {
  const m = data.metrics[metrica];
  return m && m.values[estadistico] !== undefined ? m.values[estadistico] : null;
}

/** true/false si el umbral se evaluo; null si la metrica no existe. */
export function umbralCumplido(data, metrica, umbral) {
  const m = data.metrics[metrica];
  return m && m.thresholds && m.thresholds[umbral] ? m.thresholds[umbral].ok : null;
}
