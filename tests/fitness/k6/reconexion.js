// FF-15 (ADR-06, RF17): reconexion tras un corte. Cada VU es un jugador de una mesa en curso: se conecta, recibe su
// VistaPartida, corta la conexion CORTE_S segundos (30 por defecto) y vuelve a entrar como la SPA: CONNECT, las tres
// suscripciones y "reanudar". Metrica: tiempo desde que abre el socket nuevo hasta que recibe su VistaPartida.
// Umbral: ninguna reconexion tarda mas de 5 s (max <= 5000 ms) y todas terminan con la vista.
//
//   k6 run -e BASE_URL=http://localhost:8080 tests/fitness/k6/reconexion.js
// Variables: BASE_URL, SALAS (10), JUGADORES (2), CORTE_S (30), SALIDA (resumen-reconexion.json)
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  abrirMesa, BASE_URL, crearSesiones, entero, leerFrames, OPCIONES_MESA, reanudar, stomp, suscribirPartida,
  umbralCumplido, valor, WS_URL,
} from './comun.js';

const SALAS = entero('SALAS', 10);
const JUGADORES = entero('JUGADORES', 2);
const CORTE_S = entero('CORTE_S', 30);
const LIMITE_MS = 5000;
const UMBRAL = `max<=${LIMITE_MS}`;
/** Si en este tiempo no llega la vista, la reconexion cuenta como fallida. */
const ESPERA_MAXIMA_MS = 15000;

const reconexion = new Trend('reconexion_ms', true);
const exitosa = new Rate('reconexion_exitosa');

export const options = {
  setupTimeout: '120s',
  scenarios: {
    cortes: {
      executor: 'per-vu-iterations', vus: SALAS * JUGADORES, iterations: 1,
      maxDuration: `${CORTE_S + 2 * (ESPERA_MAXIMA_MS / 1000) + 30}s`,
    },
  },
  thresholds: { reconexion_ms: [UMBRAL], reconexion_exitosa: ['rate==1'] },
};

export function setup() {
  const sesiones = crearSesiones(SALAS * JUGADORES, 'k6-rec-');
  const salas = [];
  for (let s = 0; s < SALAS; s++) {
    salas.push(abrirMesa(sesiones.slice(s * JUGADORES, (s + 1) * JUGADORES), OPCIONES_MESA));
  }
  return { salas };
}

/** Abre un socket, entra a la partida como la SPA y lo cierra al recibir la VistaPartida; devuelve ms o null. */
function entrarHastaLaVista(token, partidaId) {
  const desde = Date.now();
  let ms = null;
  const res = ws.connect(WS_URL, {}, (socket) => {
    socket.on('open', () => socket.send(stomp.conectar(token)));
    socket.on('message', (datos) => leerFrames(datos).forEach((f) => {
      if (f.comando === 'CONNECTED') {
        suscribirPartida(socket, partidaId);
        socket.send(reanudar(partidaId));
      } else if (f.comando === 'MESSAGE' && JSON.parse(f.cuerpo).tipo === 'VistaPartida') {
        ms = Date.now() - desde;
        socket.close();
      } else if (f.comando === 'ERROR') {
        socket.close();
      }
    }));
    socket.setTimeout(() => socket.close(), ESPERA_MAXIMA_MS);
  });
  check(res, { 'handshake 101': (r) => r && r.status === 101 });
  return ms;
}

export default function (data) {
  const i = __VU - 1;
  const { partidaId, jugadores } = data.salas[Math.floor(i / JUGADORES)];
  const yo = jugadores[i % JUGADORES];

  const primera = entrarHastaLaVista(yo.token, partidaId);
  check(primera, { 'vista al entrar': (ms) => ms !== null });
  sleep(CORTE_S);

  const ms = entrarHastaLaVista(yo.token, partidaId);
  exitosa.add(ms !== null);
  if (ms !== null) reconexion.add(ms);
}

export function handleSummary(data) {
  const resumen = {
    ff: 'FF-15',
    baseUrl: BASE_URL,
    salas: SALAS,
    jugadoresPorSala: JUGADORES,
    corteS: CORTE_S,
    umbral: `reconexion_ms ${UMBRAL}`,
    muestras: valor(data, 'reconexion_ms', 'count'),
    maximoMs: valor(data, 'reconexion_ms', 'max'),
    p95Ms: valor(data, 'reconexion_ms', 'p(95)'),
    medianaMs: valor(data, 'reconexion_ms', 'med'),
    tasaExito: valor(data, 'reconexion_exitosa', 'rate'),
    cumple: umbralCumplido(data, 'reconexion_ms', UMBRAL) && umbralCumplido(data, 'reconexion_exitosa', 'rate==1'),
  };
  return {
    stdout: `${JSON.stringify(resumen, null, 2)}\n`,
    [__ENV.SALIDA || 'resumen-reconexion.json']: JSON.stringify({ resumen, metricas: data.metrics }, null, 2),
  };
}
