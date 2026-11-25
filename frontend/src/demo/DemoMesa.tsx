// Modo demostracion, SOLO en desarrollo (npm run dev, ?demo): un servidor simulado alimenta a useMesa() para ver
// las dos pieles en cada situacion (reparto, robos, rechazo, liquidacion, fin) sin jugar una ronda completa.
// No valida reglas: decide a mano que pasa, como un guion. Vite lo elimina del build de produccion.
import { useMemo, useRef } from 'react';
import type { ManejadoresMesa } from '../api';
import type { Mensaje, Sesion } from '../estado/tipos';
import { ConectorMesa, useMesa } from '../estado/useMesa';
import type { Version } from '../preferencias';
import { PielMesa } from '../presentacion/Pieles';

const YO = 'demo-ana';
const RIVALES = ['demo-beto', 'demo-caro', 'demo-dani'];
const NOMBRES: Record<string, string> = { [YO]: 'Ana Toro', 'demo-beto': 'Beto', 'demo-caro': 'Carolina', 'demo-dani': 'Dani Ruiz' };
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const PINTAS = ['C', 'D', 'T', 'P'];

function barajar(): string[] {
  const m = PINTAS.flatMap((p) => VALORES.map((v) => v + p));
  for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; }
  return m;
}

class Simulador {
  h: ManejadoresMesa | null = null;
  mazo = barajar();
  mano: string[] = [];
  cima: string | null = null;
  turno = 0;
  turnoDe = YO;
  fase = 'ESPERANDO_DESCARTE';
  ronda = 0;
  marcador: Record<string, number> = { [YO]: 0, 'demo-beto': 0, 'demo-caro': 0, 'demo-dani': 0 };
  eliminados: string[] = [];
  segundos = 45;
  betoAusente = false;
  /** Guion: avance que mandaria el servidor (RF16); null = sin dato. */
  evaluacion: unknown = null;
  /** Rondas liquidadas como las manda el servidor en VistaPartida.historial (RF13). */
  historial: unknown[] = [];
  /** Commit-reveal de la ronda (RF18): orden y sal reales; "Revelar mal" cambia la sal para ver el ✗. */
  orden = '';
  sal = '';
  revelarMal = false;

  emitir(tipo: string, datos: unknown) { this.h?.alMensaje({ tipo, datos } as Mensaje); }
  vista() {
    this.emitir('VistaPartida', {
      numeroRonda: this.ronda, mano: this.mano, cimaDescarte: this.cima, marcador: this.marcador, turnoDe: this.turnoDe,
      numeroTurno: this.turno, fase: this.fase, modalidad: 'APUNTADO_101', umbral: 101, robarDelDescarte: true,
      eliminados: this.eliminados, finalizada: false, evaluacion: this.evaluacion,
      historial: this.historial,
    });
  }
  asignar(jugador: string, fase: string) {
    this.turnoDe = jugador; this.fase = fase; this.turno++;
    this.emitir('TurnoAsignado', { jugadorId: jugador, numeroTurno: this.turno, venceEn: new Date(Date.now() + this.segundos * 1000).toISOString() });
  }
  async repartir() {
    this.mazo = barajar(); this.ronda++;
    this.orden = this.mazo.join(',');
    this.sal = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${this.orden}|${this.sal}`));
    const huella = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
    this.mano = this.mazo.splice(0, 11); this.cima = this.mazo.pop() ?? null;
    this.emitir('RondaIniciada', { numeroRonda: this.ronda, cimaDescarte: this.cima, abridor: YO, huella });
    this.emitir('ManoEntregada', { jugadorId: YO, cartas: this.mano });
    this.asignar(YO, 'ESPERANDO_DESCARTE');
  }
  robar(delDescarte: boolean) {
    const carta = delDescarte && this.cima ? this.cima : this.mazo.pop() ?? '2C';
    if (delDescarte) this.cima = null;
    this.mano.push(carta); this.fase = 'ESPERANDO_DESCARTE';
    this.emitir('CartaRobada', { jugadorId: YO, origen: delDescarte ? 'DESCARTE' : 'MAZO' });
    this.emitir('CartaRecibida', { jugadorId: YO, carta });
  }
  descartar(carta: string) {
    this.mano.splice(this.mano.indexOf(carta), 1); this.cima = carta;
    this.emitir('CartaDescartada', { jugadorId: YO, carta });
    this.turnoRival(0);
  }
  turnoRival(k: number) {
    const r = RIVALES[k % RIVALES.length];
    this.asignar(r, 'ESPERANDO_ROBO');
    setTimeout(() => { this.emitir('CartaRobada', { jugadorId: r, origen: k % 2 ? 'DESCARTE' : 'MAZO' }); }, 900);
    setTimeout(() => {
      const c = this.mazo.pop() ?? '9T'; this.cima = c;
      this.emitir('CartaDescartada', { jugadorId: r, carta: c });
      if (k + 1 < RIVALES.length) this.turnoRival(k + 1); else this.asignar(YO, 'ESPERANDO_ROBO');
    }, 2100);
  }
  rechazar() { this.emitir('CierreRechazado', { jugadorId: YO, motivo: 'Tienes 2 de 3 ternas.' }); }
  /** Mano de 11 cartas que el servidor declararia cerrable descartando el As (3 ternas + sobrante 4). */
  manoCerrable() {
    this.mano = ['5C', '6C', '7C', '8D', '8T', '8P', 'JC', 'QC', 'KC', '4T', 'AD'];
    this.evaluacion = { grupos: [[0, 1, 2], [3, 4, 5], [6, 7, 8]], cuartasFormadas: 0, cuartasRequeridas: 0,
      ternasFormadas: 3, ternasRequeridas: 3, puntosSobrantes: 4, puedeCerrar: true, descarteSugerido: 10 };
    this.emitir('ManoEntregada', { jugadorId: YO, cartas: this.mano });
    this.asignar(YO, 'ESPERANDO_DESCARTE');
  }
  liquidar() {
    const puntos: Record<string, number> = { [YO]: -10, 'demo-beto': 23, 'demo-caro': 47, 'demo-dani': 8 };
    const previo = { ...this.marcador };
    if (previo['demo-caro'] < 60) previo['demo-caro'] = 64;
    Object.keys(puntos).forEach((s) => { this.marcador[s] = (previo[s] ?? 0) + puntos[s]; });
    this.eliminados = Object.keys(this.marcador).filter((s) => this.marcador[s] >= 101);
    this.historial = [...this.historial, { numeroRonda: this.ronda, cerradorId: YO, tipoCierre: 'COMPLETO',
      puntosRonda: puntos, marcador: { ...this.marcador } }];
    this.emitir('RondaLiquidada', { numeroRonda: this.ronda, cerradorId: YO, tipoCierre: 'COMPLETO', puntosRonda: puntos,
      marcador: this.marcador, eliminados: this.eliminados,
      revelacion: { clave: `demo-${this.ronda}`, huella: '', orden: this.orden, sal: this.revelarMal ? '0'.repeat(32) : this.sal } });
  }
  terminar() { this.emitir('PartidaFinalizada', { ganadorId: YO, motivo: 'TODOS_SUPERARON_UMBRAL' }); }
}

export default function DemoMesa({ version }: { version: Version }) {
  const sim = useRef(new Simulador()).current;
  const conector = useMemo<ConectorMesa>(() => ({
    nombres: async () => NOMBRES,
    conectar: (_t: string, _p: number, h: ManejadoresMesa) => {
      sim.h = h;
      setTimeout(() => { h.alConectar(); }, 50);
      return {
        reanudar: () => { setTimeout(() => sim.vista(), 40); },
        chatear: (texto: string) => sim.emitir('Chat', { jugadorId: YO, texto, hora: new Date().toISOString() }),
        robar: (d: boolean) => sim.robar(d),
        descartar: (c: string) => sim.descartar(c),
        cerrar: () => sim.rechazar(),
        cerrarConexion: () => { sim.h = null; },
      };
    },
  }), [sim]);
  const sesion: Sesion = { token: 'demo', sub: YO, apodo: 'Ana Toro', venceEn: '2999-01-01T00:00:00Z' };
  const mesa = useMesa({ sesion, codigo: 'DEMO01', partidaId: 1, alSalir: () => { location.search = ''; } }, conector);
  const boton = (texto: string, accion: () => void) => (
    <button type="button" onClick={accion} style={{ padding: '4px 8px', fontSize: 12 }}>{texto}</button>
  );
  return (
    <>
      <PielMesa version={version} mesa={mesa} />
      <div style={{ position: 'fixed', top: 6, right: 6, zIndex: 60, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 360,
        background: 'rgba(0,0,0,.7)', padding: 6, borderRadius: 8 }} aria-label="Controles de la demostración">
        {boton('Repartir', () => { void sim.repartir(); })}
        {boton('Turno rival', () => sim.turnoRival(0))}
        {boton('Rechazo', () => sim.rechazar())}
        {boton('Mano cerrable', () => sim.manoCerrable())}
        {boton('Revelar mal', () => { sim.revelarMal = !sim.revelarMal; })}
        {boton('Chat de Beto', () => sim.emitir('Chat', { jugadorId: 'demo-beto', texto: '¿Quién va ganando?', hora: new Date().toISOString() }))}
        {boton('Liquidar', () => sim.liquidar())}
        {boton('Fin', () => sim.terminar())}
        {boton('Cortar red 3 s', () => { sim.h?.alDesconectar(); setTimeout(() => sim.h?.alConectar(), 3000); })}
        {boton('Beto se va / vuelve', () => {
          sim.betoAusente = !sim.betoAusente;
          sim.emitir('Presencia', { partidaId: 1, jugadorId: 'demo-beto', conectado: !sim.betoAusente });
        })}
        {boton('Reloj 12 s', () => { sim.segundos = 12; sim.asignar(YO, 'ESPERANDO_ROBO'); sim.segundos = 45; })}
      </div>
    </>
  );
}
