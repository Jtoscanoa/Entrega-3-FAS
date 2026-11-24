// FF-14/FF-15 (esqueleto): handshake STOMP autenticado y tiempo hasta CONNECTED; ampliar con jugadas reales en staging.
// Ejecutar: STAGING_URL=wss://host STAGING_TOKEN=<jwt> k6 run tests/fitness/k6/latencia.js
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const conexion = new Trend('conexion_ms', true);
export const options = { vus: 50, duration: '2m', thresholds: { conexion_ms: ['p(95)<300'] } };

export default function () {
  const inicio = Date.now();
  const res = ws.connect(`${__ENV.STAGING_URL}/ws`, {}, (socket) => {
    socket.on('open', () => socket.send(`CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nAuthorization:Bearer ${__ENV.STAGING_TOKEN}\n\n\0`));
    socket.on('message', (m) => { if (m.startsWith('CONNECTED')) { conexion.add(Date.now() - inicio); socket.close(); } });
    socket.setTimeout(() => socket.close(), 6000);
  });
  check(res, { 'handshake 101': (r) => r && r.status === 101 });
}
