// FF-14 (ADR-06): latencia de los comandos de juego bajo carga. SALAS mesas de JUGADORES jugadores (50 x 4 por
// defecto), un VU por jugador con su propia conexion STOMP. Cada jugador, en su turno, roba del mazo y descarta la
// carta robada, y igual que la SPA (useMesa.ts) pide la vista con "reanudar" ante cada TurnoAsignado y CartaRobada.
// Metrica: tiempo desde el SEND del comando hasta el evento que lo confirma en el canal publico
// (CartaRobada / CartaDescartada del propio jugador). Umbral: p(95) < 300 ms.
//
//   k6 run -e BASE_URL=http://localhost:8080 tests/fitness/k6/latencia.js
// Variables: BASE_URL, SALAS (50), JUGADORES (4), DURACION_S (120), PENSAR_MS (1000), SALIDA (resumen-latencia.json)
import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  abrirMesa, BASE_URL, crearSesiones, entero, leerFrames, OPCIONES_MESA, reanudar, stomp, suscribirPartida,
  umbralCumplido, valor, WS_URL,
} from './comun.js';

const SALAS = entero('SALAS', 50);
const JUGADORES = entero('JUGADORES', 4);
const DURACION_S = entero('DURACION_S', 120);
const PENSAR_MS = entero('PENSAR_MS', 1000);
const UMBRAL = 'p(95)<300';

const latencia = new Trend('latencia_ms', true);
const rechazados = new Counter('comandos_rechazados');
const turnos = new Counter('turnos_jugados');
const sinRespuesta = new Counter('comandos_sin_respuesta');
/** Un comando sin evento en este tiempo se da por perdido (se cuenta aparte) y el jugador sigue jugando. */
const ESPERA_MAXIMA_MS = 10000;

export const options = {
  setupTimeout: '180s',
  scenarios: {
    mesas: {
      executor: 'per-vu-iterations', vus: SALAS * JUGADORES, iterations: 1, maxDuration: `${DURACION_S + 60}s`,
    },
  },
  thresholds: { latencia_ms: [UMBRAL] },
};

/** Todo el trabajo REST va aqui: sesiones, salas y partidas iniciadas antes de abrir los sockets. */
export function setup() {
  const sesiones = crearSesiones(SALAS * JUGADORES, 'k6-lat-');
  const salas = [];
  for (let s = 0; s < SALAS; s++) {
    salas.push(abrirMesa(sesiones.slice(s * JUGADORES, (s + 1) * JUGADORES), OPCIONES_MESA));
  }
  return { salas };
}

/** Un jugador: sigue el turno por los eventos y mide cada comando propio del SEND al evento. */
export default function (data) {
  const i = __VU - 1;
  const { partidaId, jugadores } = data.salas[Math.floor(i / JUGADORES)];
  const yo = jugadores[i % JUGADORES];
  const destino = (accion) => `/app/partidas/${partidaId}/${accion}`;
  let ultimoTurno = -1;
  let pendiente = null; // { accion, desde }

  const res = ws.connect(WS_URL, {}, (socket) => {
    const mandar = (accion, cuerpo) => {
      pendiente = { accion, desde: Date.now() };
      socket.send(stomp.enviar(destino(accion), cuerpo));
    };
    const despues = (accion) => socket.setTimeout(accion, PENSAR_MS);
    const libre = () => {
      if (pendiente && Date.now() - pendiente.desde > ESPERA_MAXIMA_MS) {
        sinRespuesta.add(1, { accion: pendiente.accion });
        pendiente = null;
      }
      return pendiente === null;
    };
    const confirmar = (accion) => {
      if (pendiente && pendiente.accion === accion) {
        latencia.add(Date.now() - pendiente.desde, { accion });
        pendiente = null;
      }
    };

    const manejar = (tipo, d) => {
      switch (tipo) {
        case 'VistaPartida':
          if (d.turnoDe === yo.sub && d.numeroTurno > ultimoTurno && libre() && !d.finalizada) {
            ultimoTurno = d.numeroTurno;
            turnos.add(1);
            const turno = d.numeroTurno;
            const ultimaCarta = d.mano[d.mano.length - 1];
            despues(() => (d.fase === 'ESPERANDO_ROBO'
              ? mandar('robar', { delDescarte: false, numeroTurno: turno })
              : mandar('descartar', { carta: ultimaCarta, numeroTurno: turno })));
          }
          break;
        case 'TurnoAsignado':
        case 'RondaIniciada':
          socket.send(reanudar(partidaId));
          break;
        case 'CartaRobada':
          if (d.jugadorId === yo.sub) confirmar('robar');
          socket.send(reanudar(partidaId));
          break;
        case 'CartaRecibida': {
          const turno = ultimoTurno;
          despues(() => mandar('descartar', { carta: d.carta, numeroTurno: turno }));
          break;
        }
        case 'CartaDescartada':
          if (d.jugadorId === yo.sub) confirmar('descartar');
          break;
        default:
          break;
      }
    };

    socket.on('open', () => socket.send(stomp.conectar(yo.token)));
    socket.on('message', (datos) => leerFrames(datos).forEach((f) => {
      if (f.comando === 'CONNECTED') {
        suscribirPartida(socket, partidaId);
        socket.send(reanudar(partidaId));
      } else if (f.comando === 'ERROR') {
        rechazados.add(1, { motivo: f.cabeceras.message || 'ERROR' });
        socket.close();
      } else if (f.comando === 'MESSAGE' && f.cabeceras.destination === '/user/queue/errores') {
        rechazados.add(1, { motivo: JSON.parse(f.cuerpo).motivo });
        pendiente = null;
      } else if (f.comando === 'MESSAGE') {
        const m = JSON.parse(f.cuerpo);
        manejar(m.tipo, m.datos);
      }
    }));
    socket.setTimeout(() => socket.close(), DURACION_S * 1000);
  });
  check(res, { 'handshake 101': (r) => r && r.status === 101 });
}

export function handleSummary(data) {
  const resumen = {
    ff: 'FF-14',
    baseUrl: BASE_URL,
    salas: SALAS,
    jugadoresPorSala: JUGADORES,
    duracionS: DURACION_S,
    pensarMs: PENSAR_MS,
    umbral: `latencia_ms ${UMBRAL}`,
    muestras: valor(data, 'latencia_ms', 'count'),
    p95Ms: valor(data, 'latencia_ms', 'p(95)'),
    medianaMs: valor(data, 'latencia_ms', 'med'),
    maximoMs: valor(data, 'latencia_ms', 'max'),
    turnosJugados: valor(data, 'turnos_jugados', 'count'),
    comandosRechazados: valor(data, 'comandos_rechazados', 'count') || 0,
    comandosSinRespuesta: valor(data, 'comandos_sin_respuesta', 'count') || 0,
    cumple: umbralCumplido(data, 'latencia_ms', UMBRAL),
  };
  return {
    stdout: `${JSON.stringify(resumen, null, 2)}\n`,
    [__ENV.SALIDA || 'resumen-latencia.json']: JSON.stringify({ resumen, metricas: data.metrics }, null, 2),
  };
}
